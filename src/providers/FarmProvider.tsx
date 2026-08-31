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
import { syncWeedReminders } from '../notifications/weedReminders';
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
  /** Bir yazma sonrası çağrılır: sayaçları tazeler, ekranları tetikler. */
  notifyChange: () => void;
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

  const refreshStats = useCallback(async () => {
    setStats(await getFieldStats());
  }, []);

  const notifyChange = useCallback(() => setRevision((n) => n + 1), []);

  // Her değişiklikte sayaçlar tazelensin ve ot hatırlatmaları DB ile
  // eşitlensin. Tek noktadan türetmek, "hasat edildi ama bildirimi hâlâ
  // kurulu" gibi kaçakları imkânsız kılıyor.
  useEffect(() => {
    if (status !== 'ready' || revision === 0) return;
    refreshStats().catch((err: unknown) => {
      if (__DEV__) console.warn('[farm] sayaclar tazelenemedi', err);
    });
    void syncWeedReminders();
  }, [revision, status, refreshStats]);

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

  // --- Warm start (arka plandan dönüş) ----------------------------------
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    if (status !== 'ready') return;

    const subscription = AppState.addEventListener(
      'change',
      (next: AppStateStatus) => {
        const cameToForeground =
          appState.current.match(/inactive|background/) && next === 'active';
        appState.current = next;
        if (!cameToForeground) return;

        runTimeSkip()
          .then(async (result) => {
            // Hiçbir şey değişmediyse karşılama ekranını tetikleme.
            if (!result.didRun) return;
            setTimeSkip(result);
            await refreshStats();
            notifyChange(); // hatırlatmalar da bu sayede eşitlenir
          })
          .catch((err: unknown) => {
            // Foreground simülasyonu en iyi çaba: hata açılışı bozmasın.
            if (__DEV__) console.warn('[farm] time-skip basarisiz', err);
          });
      },
    );

    return () => subscription.remove();
  }, [status, refreshStats, notifyChange]);

  const value = useMemo<FarmContextValue>(
    () => ({
      status,
      error,
      timeSkip,
      stats,
      revision,
      notifyChange,
      refreshStats,
      retry: () => setAttempt((n) => n + 1),
      dismissTimeSkip: () => setTimeSkip(null),
    }),
    [status, error, timeSkip, stats, revision, notifyChange, refreshStats],
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
