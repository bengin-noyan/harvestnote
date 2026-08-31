/**
 * Ot basmadan önce hatırlatma bildirimleri.
 *
 * Mimari, uygulamanın geri kalanıyla aynı ilkeye dayanıyor: arka planda
 * çalışan hiçbir şey yok. Her notun ot bağlayacağı an `last_tended_at`'ten
 * deterministik olarak hesaplanabildiği için bildirimi bugünden işletim
 * sistemine kuruyoruz; uygulama kapalıyken bile OS onu tetikler.
 *
 * Kimliklendirme: her not için sabit bir tanımlayıcı (`weed-<id>`) kullanılıyor.
 * Böylece bildirimi nota bağlamak için veritabanına yeni bir sütun (ve yeni bir
 * migration) eklemek gerekmedi; aynı tanımlayıcıyla tekrar kurmak mevcut
 * bildirimin yerine geçtiği için işlem idempotent.
 *
 * Not: Expo Go'da bildirim desteği sınırlıdır (özellikle Android). Gerçek
 * davranış için development build gerekir — bkz. README.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { listFieldNotes } from '../db/repositories/notes';
import {
  DEFAULT_GROWTH_RULES,
  WEED_REMINDER_LEAD_MS,
  type GrowthRules,
} from '../game/config';
import { resolveStage } from '../game/stages';
import type { Note } from '../types';
import { formatDuration } from '../utils/format';

const CHANNEL_ID = 'weed-reminders';
const ID_PREFIX = 'weed-';

/** Bu kadar yakındaki bir hatırlatmayı kurmanın anlamı yok. */
const MIN_SCHEDULE_AHEAD_MS = 60_000;

export const reminderIdFor = (noteId: number): string =>
  `${ID_PREFIX}${noteId}`;

/** Bize ait bir tanımlayıcıysa not id'sini döndürür, değilse null. */
export function noteIdFromReminderId(identifier: string): number | null {
  if (!identifier.startsWith(ID_PREFIX)) return null;
  const id = Number(identifier.slice(ID_PREFIX.length));
  return Number.isInteger(id) ? id : null;
}

/** Notun hatırlatma anı: ot basmasına `lead` kadar kala. */
export function reminderTimeFor(
  note: Pick<Note, 'last_tended_at'>,
  rules: GrowthRules = DEFAULT_GROWTH_RULES,
  lead: number = WEED_REMINDER_LEAD_MS,
): number {
  return note.last_tended_at + rules.weedThresholdMs - lead;
}

/* ------------------------------------------------------------------ */
/* Kurulum                                                             */
/* ------------------------------------------------------------------ */

let configured = false;

/**
 * Bildirim davranışını ve Android kanalını kurar. Açılışta bir kez çağrılır;
 * tekrar çağrılması zararsızdır.
 */
export async function configureNotifications(): Promise<void> {
  if (configured) return;
  configured = true;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === 'android') {
    // Android'de kanal olmadan kurulan bildirimler sessizce düşer.
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Yabani ot uyarıları',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 200, 120, 200],
      lightColor: '#6aa84f',
    });
  }
}

/* ------------------------------------------------------------------ */
/* İzin                                                                */
/* ------------------------------------------------------------------ */

let permissionGranted: boolean | null = null;

/**
 * İzni gerektiği ANDA ister — açılışta değil.
 *
 * Tarla boşken sorulacak bir şey yok; ilk tohum ekildiğinde sorulması hem
 * daha az rahatsız edici hem de kullanıcının izni bağlamıyla birlikte
 * görmesini sağlıyor.
 */
export async function ensureReminderPermission(): Promise<boolean> {
  if (permissionGranted !== null) return permissionGranted;

  const current = await Notifications.getPermissionsAsync();
  if (current.granted) {
    permissionGranted = true;
    return true;
  }
  if (!current.canAskAgain) {
    permissionGranted = false;
    return false;
  }

  const requested = await Notifications.requestPermissionsAsync();
  permissionGranted = requested.granted;
  return permissionGranted;
}

/** Ayarlardan izin sonradan değiştirilmiş olabilir; önbelleği sıfırlar. */
export function resetPermissionCache(): void {
  permissionGranted = null;
}

/* ------------------------------------------------------------------ */
/* Planlama (saf)                                                      */
/* ------------------------------------------------------------------ */

export interface PlannedReminder {
  noteId: number;
  title: string;
  /** Bildirimin tetikleneceği an (epoch ms). */
  fireAt: number;
}

/**
 * Hangi notlara hatırlatma kurulacağını hesaplar. Yan etkisi yok — bildirim
 * katmanından ve veritabanından bağımsız test edilebilsin diye ayrıldı.
 *
 * Elenenler: ot basmış notlar (uyarmak için geç kalındı) ve hatırlatma anı
 * geçmişte ya da çok yakın olanlar.
 */
export function planReminders(
  notes: Note[],
  now: number = Date.now(),
  rules: GrowthRules = DEFAULT_GROWTH_RULES,
  lead: number = WEED_REMINDER_LEAD_MS,
): PlannedReminder[] {
  const planned: PlannedReminder[] = [];

  for (const note of notes) {
    if (note.harvested_at !== null) continue;
    if (resolveStage(note, now, rules) === 'weedy') continue;

    const fireAt = reminderTimeFor(note, rules, lead);
    if (fireAt - now < MIN_SCHEDULE_AHEAD_MS) continue;

    planned.push({ noteId: note.id, title: note.title, fireAt });
  }

  return planned;
}

/* ------------------------------------------------------------------ */
/* Eşitleme                                                            */
/* ------------------------------------------------------------------ */

export interface ReminderSyncResult {
  scheduled: number;
  cancelled: number;
  /** İzin reddedildiyse veya bildirim katmanı hata verdiyse true. */
  skipped: boolean;
}

const EMPTY_RESULT: ReminderSyncResult = {
  scheduled: 0,
  cancelled: 0,
  skipped: true,
};

/**
 * Kurulu bildirimleri veritabanının şu anki haliyle eşitler.
 *
 * Tek bir eşitleme fonksiyonu var çünkü hatırlatmayı etkileyen olay çok:
 * ekim, düzenleme, ot temizleme, hasat, silme, zaman atlaması. Her birine
 * ayrı zamanlama/iptal çağrısı serpiştirmek yerine, her değişiklikten sonra
 * (FarmProvider'daki `revision`) tüm durum yeniden türetiliyor — kaçırılan
 * bir yol kalmıyor.
 */
export async function syncWeedReminders(
  now: number = Date.now(),
  rules: GrowthRules = DEFAULT_GROWTH_RULES,
  lead: number = WEED_REMINDER_LEAD_MS,
): Promise<ReminderSyncResult> {
  try {
    const notes = await listFieldNotes();
    const desired = new Map<number, PlannedReminder>(
      planReminders(notes, now, rules, lead).map((item) => [item.noteId, item]),
    );

    // Artık geçerli olmayanları (hasat edilmiş, silinmiş, ot basmış) kaldır.
    const existing = await Notifications.getAllScheduledNotificationsAsync();
    let cancelled = 0;
    for (const request of existing) {
      const noteId = noteIdFromReminderId(request.identifier);
      if (noteId === null || desired.has(noteId)) continue;
      await Notifications.cancelScheduledNotificationAsync(request.identifier);
      cancelled += 1;
    }

    if (desired.size === 0) {
      return { scheduled: 0, cancelled, skipped: false };
    }

    if (!(await ensureReminderPermission())) {
      return { scheduled: 0, cancelled, skipped: true };
    }

    // Hedeftekileri baştan kurar. Aynı tanımlayıcı mevcut kaydın yerine
    // geçtiği için `last_tended_at` değişmiş notların zamanı da düzelir.
    let scheduled = 0;
    for (const { noteId, title, fireAt } of desired.values()) {
      await Notifications.scheduleNotificationAsync({
        identifier: reminderIdFor(noteId),
        content: {
          title: '🌿 Tarlanı otlar sarmak üzere',
          body: `"${title}" ${formatDuration(lead)} içinde ot bağlayacak. Uğrayıp bakmak ister misin?`,
          data: { noteId },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: fireAt,
          channelId: CHANNEL_ID,
        },
      });
      scheduled += 1;
    }

    return { scheduled, cancelled, skipped: false };
  } catch (error) {
    // Bildirimler ikincil: Expo Go kısıtı ya da izin hatası uygulamayı
    // durdurmamalı.
    if (__DEV__) console.warn('[reminders] esitlenemedi', error);
    return EMPTY_RESULT;
  }
}

/** Tüm ot hatırlatmalarını kaldırır (çıkış/sıfırlama senaryoları). */
export async function cancelAllWeedReminders(): Promise<void> {
  try {
    const existing = await Notifications.getAllScheduledNotificationsAsync();
    for (const request of existing) {
      if (noteIdFromReminderId(request.identifier) === null) continue;
      await Notifications.cancelScheduledNotificationAsync(request.identifier);
    }
  } catch (error) {
    if (__DEV__) console.warn('[reminders] iptal edilemedi', error);
  }
}
