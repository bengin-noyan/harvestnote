/**
 * Uygulamanın kök veri sağlayıcısı.
 *
 * Sorumlulukları:
 *  1. Açılışta DB'yi hazırlamak ve time-skip'i çalıştırmak (bootstrapApp).
 *  2. Uygulama arka plandan öne döndüğünde simülasyonu tekrar çalıştırmak —
 *     mobilde uygulama günlerce "açık" kalabilir; sadece cold start'a
 *     güvenmek yabani otların hiç basmaması demek olurdu.
 *  3. Karşılama ekranının okuyacağı son time-skip özetini tutmak.
 *  4. Yazma sonrası ekranların listelerini tazelemesi için `revision`
 *     sayacını yürütmek.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { bootstrapApp } from '../bootstrap';
import { getFieldStats, type FieldStats } from '../db/repositories/notes';
import { runTimeSkip } from '../game/timeSkip';
import {
  flushReminderSync,
  requestReminderSync,
} from '../notifications/weedReminders';
import type { TimeSkipResult } from '../types';

export type FarmStatus = 'loading' | 'ready' | 'error';

export interface FarmContextValue {
  status: FarmStatus;
  error: Error | null;
  /** Son çalışan simülasyonun özeti (henüz çalışmadıysa null). */
  timeSkip: TimeSkipResult | null;
  stats: FieldStats;
  /**
   * Tarla verisi her değiştiğinde artan sayaç. Ekranlar buna abone olarak
   * listelerini tazeler — global bir store kurmadan tek yönlü akış.
   */
  revision: number;
  /**
   * Bir yazma sonrası çağrılır: sayaçları tazeler, ekranları tetikler ve ot
   * hatırlatmalarını DB ile eşitler.
   *
   * Notun *zamanlamasına* dokunan her şey bunu kullanmalı: ekim, ot temizleme,
   * hasat, silme, düzenleme (düzenleme `last_tended_at`'i tazeliyor) ve zaman
   * atlaması. Şüphedeysen bunu seç — fazladan eşitleme ucuz (debounce'lu),
   * eksik eşitleme "hasat edildi ama bildirimi hâlâ kurulu" demek.
   */
  notifyScheduleChanged: () => void;
  /**
   * Hiçbir notun ot saatini kaydırmayan yazmalar için: yalnızca sayaçları ve
   * listeleri tazeler, bildirim katmanına hiç dokunmaz.
   *
   * Bugünkü tek kullanıcısı kilerden ürün atmak. Asıl gerekçesi Faz 1: blok
   * editörü otomatik kaydetmeye başladığında içerik yazmalarının bildirim
   * yolunu tetiklememesi gerekiyor.
   */
  notifyContentChanged: () => void;
  /** Tarla sayaçlarını tazeler (ekim/hasat sonrası çağrılır). */
  refreshStats: () => Promise<void>;
  /** Açılış başarısız olduysa yeniden dener. */
  retry: () => void;
  /** Karşılama ekranı kapatıldığında özeti temizler. */
  dismissTimeSkip: () => void;
}

const EMPTY_STATS: FieldStats = { planted: 0, growing: 0, weedy: 0, total: 0 };

const FarmContext = createContext<FarmContextValue | null>(null);

export function FarmProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<FarmStatus>('loading');
  const [error, setError] = useState<Error | null>(null);
  const [timeSkip, setTimeSkip] = useState<TimeSkipResult | null>(null);
  const [stats, setStats] = useState<FieldStats>(EMPTY_STATS);
  const [attempt, setAttempt] = useState(0);
  const [revision, setRevision] = useState(0);
  // Ayrı sayaç: hangi yazmaların bildirim katmanını ilgilendirdiğini ekranlar
  // değil, çağrılan kanal söylüyor. `revision` her ikisinde de artar, böylece
  // listeler her değişiklikte tazelenmeye devam eder.
  const [scheduleRevision, setScheduleRevision] = useState(0);

  const refreshStats = useCallback(async () => {
    setStats(await getFieldStats());
  }, []);

  const notifyContentChanged = useCallback(() => {
    setRevision((n) => n + 1);
  }, []);

  const notifyScheduleChanged = useCallback(() => {
    setRevision((n) => n + 1);
    setScheduleRevision((n) => n + 1);
  }, []);

  // Her değişiklikte sayaçlar tazelensin.
  useEffect(() => {
    if (status !== 'ready' || revision === 0) return;
    refreshStats().catch((err: unknown) => {
      if (__DEV__) console.warn('[farm] sayaclar tazelenemedi', err);
    });
  }, [revision, status, refreshStats]);

  // Zamanlamaya dokunan bir değişiklik oldu: kurulu bildirimleri DB'den
  // yeniden türet. Tek noktadan türetmek, "hasat edildi ama bildirimi hâlâ
  // kurulu" gibi kaçakları imkânsız kılıyor. İstek debounce'lu — arka arkaya
  // yazmalar tek eşitlemede birleşir (bkz. requestReminderSync).
  useEffect(() => {
    if (status !== 'ready' || scheduleRevision === 0) return;
    requestReminderSync();
  }, [scheduleRevision, status]);

  // --- Cold start -------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    setStatus('loading');
    setError(null);

    bootstrapApp()
      .then((result) => {
        if (cancelled) return;
        setTimeSkip(result.timeSkip);
        setStats(result.stats);
        setStatus('ready');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  // --- Uygulama durumu geçişleri ----------------------------------------
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    if (status !== 'ready') return;

    const subscription = AppState.addEventListener(
      'change',
      (next: AppStateStatus) => {
        const previous = appState.current;
        appState.current = next;

        // Arka plana geçiş: bekleyen eşitleme burada bitmeli. Uygulama arka
        // plandayken JS zamanlayıcıları askıya alınabiliyor, yani debounce hiç
        // çalışmayabilir — üstelik bildirimlerin doğru olmasının asıl önemli
        // olduğu an tam da bu.
        if (previous === 'active' && next.match(/inactive|background/)) {
          void flushReminderSync();
          return;
        }

        const cameToForeground =
          previous.match(/inactive|background/) && next === 'active';
        if (!cameToForeground) return;

        runTimeSkip()
          .then(async (result) => {
            // Hiçbir şey değişmediyse karşılama ekranını tetikleme.
            if (!result.didRun) return;
            setTimeSkip(result);
            await refreshStats();
            // Statüler değişti: hatırlatmalar da yeniden türetilmeli.
            notifyScheduleChanged();
          })
          .catch((err: unknown) => {
            // Foreground simülasyonu en iyi çaba: hata açılışı bozmasın.
            if (__DEV__) console.warn('[farm] time-skip basarisiz', err);
          });
      },
    );

    return () => subscription.remove();
  }, [status, refreshStats, notifyScheduleChanged]);

  const value = useMemo<FarmContextValue>(
    () => ({
      status,
      error,
      timeSkip,
      stats,
      revision,
      notifyScheduleChanged,
      notifyContentChanged,
      refreshStats,
      retry: () => setAttempt((n) => n + 1),
      dismissTimeSkip: () => setTimeSkip(null),
    }),
    [
      status,
      error,
      timeSkip,
      stats,
      revision,
      notifyScheduleChanged,
      notifyContentChanged,
      refreshStats,
    ],
  );

  return <FarmContext.Provider value={value}>{children}</FarmContext.Provider>;
}

export function useFarm(): FarmContextValue {
  const context = useContext(FarmContext);
  if (!context) {
    throw new Error('useFarm, <FarmProvider> icinde kullanilmali');
  }
  return context;
}
