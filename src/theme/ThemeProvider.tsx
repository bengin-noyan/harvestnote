/**
 * Açık / koyu tema burada seçiliyor.
 *
 * Seçenekler sistem, açık ve koyu. Seçimi preferences tablosuna kaydediyorum.
 * Web'de localStorage'a da yazıyorum, yoksa sayfa yenilenince DB açılana
 * kadar bir an açık tema görünüp sonra koyuya geçiyordu.
 *
 * makeStyles her tema için StyleSheet'i bir kere oluşturup saklıyor. Web'de
 * StyleSheet stilleri CSS class'ına çevirdiği için renkleri sonradan
 * değiştiremiyoruz, o yüzden iki ayrı stil seti var.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Platform, StyleSheet, useColorScheme } from 'react-native';

import { getPreference, setPreference } from '../db/repositories/preferences';
import { themes, type Scheme, type Theme } from './index';

export type ThemeMode = 'system' | 'light' | 'dark';

const PREF_KEY = 'theme';
const MODES: ThemeMode[] = ['system', 'light', 'dark'];

interface ThemeContextValue {
  theme: Theme;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: themes.light,
  mode: 'system',
  setMode: () => {},
});

function isMode(value: string | null): value is ThemeMode {
  return value !== null && (MODES as string[]).includes(value);
}

// localStorage gizli sekmede hata atabiliyor, o yüzden try içinde.
// Okuyamazsak sorun yok, DB'deki değer geliyor zaten.
function readCachedMode(): ThemeMode {
  if (Platform.OS !== 'web') return 'system';
  try {
    const value = globalThis.localStorage?.getItem(PREF_KEY) ?? null;
    return isMode(value) ? value : 'system';
  } catch {
    return 'system';
  }
}

function writeCachedMode(mode: ThemeMode) {
  if (Platform.OS !== 'web') return;
  try {
    globalThis.localStorage?.setItem(PREF_KEY, mode);
  } catch {
    // önemli değil
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>(readCachedMode);

  // Kayıtlı temayı DB'den okuyoruz, yoksa sistem kalıyor.
  useEffect(() => {
    let cancelled = false;
    getPreference(PREF_KEY)
      .then((value) => {
        if (!cancelled && isMode(value)) setModeState(value);
      })
      .catch((error) => {
        if (__DEV__) console.warn('[tema] tercih okunamadi', error);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    writeCachedMode(next);
    setPreference(PREF_KEY, next).catch((error) => {
      if (__DEV__) console.warn('[tema] tercih yazilamadi', error);
    });
  }, []);

  const scheme: Scheme =
    mode === 'system' ? (system === 'dark' ? 'dark' : 'light') : mode;
  const theme = themes[scheme];

  // web'de body rengi ve scrollbar'lar da temaya uysun
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    document.documentElement.style.colorScheme = scheme;
    document.body.style.backgroundColor = theme.colors.ground;
  }, [scheme, theme]);

  const value = useMemo(() => ({ theme, mode, setMode }), [theme, mode, setMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// Şu anki tema, seçili mod ve modu değiştiren fonksiyon.
export function useTheme() {
  const { theme, mode, setMode } = useContext(ThemeContext);
  return { ...theme, mode, setMode };
}

// Temaya göre stil hook'u oluşturuyor. Kullanımı:
//   const useStyles = makeStyles(({ colors }) => ({ root: { ... } }));
//   const styles = useStyles();
export function makeStyles<
  T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>,
>(factory: (theme: Theme) => T & StyleSheet.NamedStyles<any>) {
  const cache: Partial<Record<Scheme, T>> = {};
  return function useStyles(): T {
    const { theme } = useContext(ThemeContext);
    let styles = cache[theme.scheme];
    if (!styles) {
      styles = StyleSheet.create(factory(theme));
      cache[theme.scheme] = styles;
    }
    return styles;
  };
}
