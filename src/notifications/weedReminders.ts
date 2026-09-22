/**
 * Ot basmadan önce gönderilen hatırlatmalar.
 *
 * Burada da arka planda çalışan bir şey yok. Bir notun ne zaman ot bağlayacağı
 * last_tended_at'ten hesaplanabildiği için bildirimi şimdiden işletim
 * sistemine kuruyoruz, uygulama kapalıyken bile OS tetikliyor.
 *
 * Her not için sabit bir identifier kullanıyoruz (`weed-<id>`). Böylece
 * bildirimi nota bağlamak için yeni bir sütun ve migration gerekmedi. Aynı
 * identifier ile tekrar kurmak eskisinin yerine geçiyor, yani kaç kere
 * çağırsak da sonuç aynı.
 *
 * Not: Expo Go'da bildirim desteği kısıtlı (özellikle Android). Gerçek davranış
 * için development build lazım, bkz. README.
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

/** Bizim identifier'ımızsa not id'sini döndürüyor, değilse null. */
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
 * Bildirim davranışını ve Android kanalını kuruyor. Açılışta bir kez
 * çağrılıyor, tekrar çağırmak zarar vermiyor.
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
    // Android'de kanal açmadan kurduğun bildirim sessizce düşüyor.
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
 * İzni açılışta değil, gerektiği anda istiyoruz.
 *
 * Tarla boşken sorulacak bir şey yok. İlk tohum ekilince sormak hem daha az
 * rahatsız edici, hem de kullanıcı izni neden istediğimizi görüyor.
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

/** İzin ayarlardan sonradan değişmiş olabilir, cache'i sıfırlıyor. */
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
 * Hangi notlara hatırlatma kurulacağını hesaplıyor. Yan etkisi yok, bildirim
 * katmanından ve DB'den bağımsız denenebilsin diye ayırdım.
 *
 * Elenenler: otu basmış notlar (uyarmak için geç kalınmış) ve hatırlatma anı
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
 * Kurulu bildirimleri DB'nin şu anki haliyle eşitliyor.
 *
 * Tek bir eşitleme fonksiyonu var çünkü hatırlatmayı etkileyen olay çok fazla:
 * ekim, düzenleme, ot temizleme, hasat, silme, zaman atlaması. Her birine ayrı
 * kur/iptal çağrısı dağıtmak yerine her değişiklikten sonra (FarmProvider'daki
 * `revision`) durumu baştan hesaplıyoruz. Böylece atlanan bir yol kalmıyor.
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

    // Geçerliliği kalmayanları temizliyoruz (hasat edilmiş, silinmiş, otlu).
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

    // Kalanları baştan kuruyoruz. Aynı identifier eskisinin yerine geçtiği
    // için last_tended_at'i değişen notların saati de düzeliyor.
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
    // Bildirimler olmasa da olur. Expo Go kısıtı ya da izin hatası uygulamayı
    // durdurmasın.
    if (__DEV__) console.warn('[reminders] esitlenemedi', error);
    return EMPTY_RESULT;
  }
}

/* ------------------------------------------------------------------ */
/* Eşitleme kuyruğu                                                    */
/* ------------------------------------------------------------------ */

/**
 * Her yazmada eşitleme yapmak pahalı, syncWeedReminders kurulu bütün
 * bildirimleri okuyup baştan kuruyor. Şu an yazmalar seyrek olduğu için
 * hissedilmiyor ama editör otomatik kaydetmeye başlayınca her tuş bir
 * eşitleme demek olurdu.
 *
 * Hatırlatma zaten ~42 saat ötede, birkaç saniye gecikmesi önemli değil.
 * Önemli olan kullanıcı uygulamadan çıkmadan önce doğru olması, onun için de
 * flushReminderSync var.
 */
const SYNC_DEBOUNCE_MS = 1_500;

let pendingSync: ReturnType<typeof setTimeout> | null = null;

/**
 * Eşitlemeleri uç uca sıraya diziyoruz. İkisi aynı anda çalışırsa biri
 * diğerinin yeni kurduğu bildirimi "artık gerekmiyor" sanıp iptal edebiliyor,
 * çünkü ikisi de getAllScheduledNotificationsAsync ile başlayıp o anki listeye
 * bakıyor.
 */
let syncTail: Promise<void> = Promise.resolve();

function runSyncNow(): Promise<void> {
  syncTail = syncTail.then(async () => {
    // syncWeedReminders hatayı içeride yutuyor, zincir kopmuyor.
    await syncWeedReminders();
  });
  return syncTail;
}

/**
 * Eşitleme isteği bırakıyor. Arka arkaya gelen çağrılar tek çalışmada
 * birleşiyor, yazan tarafın maliyeti düşünmesi gerekmiyor.
 */
export function requestReminderSync(): void {
  if (pendingSync) clearTimeout(pendingSync);
  pendingSync = setTimeout(() => {
    pendingSync = null;
    void runSyncNow();
  }, SYNC_DEBOUNCE_MS);
}

/**
 * Bekleyen eşitlemeyi hemen çalıştırıp bitmesini bekliyor.
 *
 * Uygulama arka plana geçerken şart. JS timer'ları orada askıya alınabiliyor,
 * yani bekleyen debounce hiç çalışmayabilir. Üstelik bildirimlerin doğru
 * olması tam da o an gerekiyor.
 */
export function flushReminderSync(): Promise<void> {
  if (pendingSync) {
    clearTimeout(pendingSync);
    pendingSync = null;
  }
  return runSyncNow();
}

/** Bütün ot hatırlatmalarını siler. Çıkış/sıfırlama senaryoları için. */
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
