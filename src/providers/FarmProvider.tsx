/**
 * Uygulamanın kök provider'ı. Yaptıkları:
 *
 *  1. Açılışta DB'yi hazırlayıp time-skip'i çalıştırmak (bootstrapApp).
 *  2. Uygulama arka plandan dönünce simülasyonu tekrar çalıştırmak. Mobilde
 *     uygulama günlerce açık kalabiliyor, sadece cold start'a güvenirsek
 *     otlar hiç basmıyor.
 *  3. Karşılama ekranının okuyacağı son time-skip özetini tutmak.
 *  4. Ekranlar listelerini tazelesin diye `revision` sayacını yürütmek.
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
   * Tarla verisi değiştikçe artan sayaç. Ekranlar bunu dinleyip listelerini
   * tazeliyor. Store kurmadan tek yönlü akış.
   */
  revision: number;
  /**
   * Yazmadan sonra çağrılıyor: sayaçları tazeliyor, ekranları tetikliyor ve
   * ot hatırlatmalarını DB ile eşitliyor.
   *
   * Notun zamanlamasına dokunan her şey bunu kullanmalı: ekim, ot temizleme,
   * hasat, silme, düzenleme (düzenleme last_tended_at'i tazeliyor) ve zaman
   * atlaması. Emin değilsen bunu seç. Fazladan eşitleme ucuz (debounce'lu),
   * eksik eşitleme "hasat edildi ama bildirimi hâlâ kurulu" demek.
   */
  notifyScheduleChanged: () => void;
  /**
   * Hiçbir notun ot saatini kaydırmayan yazmalar için. Sadece sayaçları ve
   * listeleri tazeliyor, bildirim tarafına hiç dokunmuyor.
   *
   * Şu an tek kullanan yer kilerden ürün atmak. Asıl sebebi editör: otomatik
   * kaydetme sürekli içerik yazıyor ve bunların bildirim yolunu tetiklememesi
   * lazım.
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
  // Ayrı sayaç tutuyoruz. Hangi yazmanın bildirimi ilgilendirdiğini ekranlar
  // değil, çağrılan kanal belirliyor. `revision` ikisinde de arttığı için
  // listeler her değişiklikte tazelenmeye devam ediyor.
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

  // Zamanlamaya dokunan bir değişiklik olmuş, kurulu bildirimleri DB'den
  // yeniden çıkarıyoruz. Tek yerden türetince "hasat edildi ama bildirimi hâlâ
  // kurulu" durumu oluşmuyor. İstek debounce'lu, arka arkaya yazmalar tek
  // eşitlemede birleşiyor (bkz. requestReminderSync).
  useEffect(() => {
    if (status !== 'ready' || scheduleRevision === 0) return;
    requestReminderSync();
  }, [scheduleRevision, status]);

  // --- Açılış -----------------------------------------------------------
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

        // Arka plana geçiyoruz, bekleyen eşitlemeyi burada bitirelim. Arka
        // planda JS timer'ları askıya alınabiliyor, yani debounce hiç
        // çalışmayabilir. Üstelik bildirimlerin doğru olması en çok bu an
        // önemli.
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
            // Statüler değişti, hatırlatmaları da yeniden kuralım.
            notifyScheduleChanged();
          })
          .catch((err: unknown) => {
            // Buradaki simülasyon best-effort, hata uygulamayı bozmasın.
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
