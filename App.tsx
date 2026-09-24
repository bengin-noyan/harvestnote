// gesture-handler importu her şeyden önce gelmeli (native tarafı kurar).
import 'react-native-gesture-handler';

import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { PixelButton } from './src/components/PixelButton';
import { AppShell } from './src/navigation/AppShell';
import { FarmProvider, useFarm } from './src/providers/FarmProvider';
import { spacing, typography } from './src/theme';
import { makeStyles, ThemeProvider, useTheme } from './src/theme/ThemeProvider';

export default function App() {
  return (
    <ThemeProvider>
      <Root />
    </ThemeProvider>
  );
}

function Root() {
  const { scheme } = useTheme();
  const styles = useStyles();
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <FarmProvider>
          {/* durum çubuğu yazısı temanın tersi renkte, yoksa görünmüyordu */}
          <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
          <FarmGate />
        </FarmProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/**
 * Açılış kapısı. Migration'lar ve time-skip bitene kadar kabuğu göstermiyor.
 * Böylece görünümler verinin hazır olduğunu varsayarak yazılabiliyor.
 */
function FarmGate() {
  const { colors } = useTheme();
  const styles = useStyles();
  const { status, error, retry } = useFarm();

  if (status === 'loading') {
    return (
      <View style={styles.center}>
        <Text style={styles.emoji}>🌾</Text>
        <ActivityIndicator color={colors.leafDeep} />
        <Text style={styles.muted}>Tarla hazırlanıyor…</Text>
      </View>
    );
  }

  if (status === 'error') {
    return (
      <View style={styles.center}>
        <Text style={styles.emoji}>🥀</Text>
        <Text style={styles.title}>Tarlaya girilemedi</Text>
        <Text style={styles.muted}>{error?.message}</Text>
        <PixelButton label="Tekrar dene" onPress={retry} />
      </View>
    );
  }

  return <AppShell />;
}

const useStyles = makeStyles(({ colors }) => ({
  /**
   * Kök zemin uygulamanın her yerinde görünüyor: açılış karesi, aşırı
   * kaydırmadaki boşluk, ekran geçişlerinin arkası. Kabukla aynı renk olmalı,
   * koyu kalırsa uygulama koyu açılıp sonra aydınlığa atlıyor.
   */
  root: { flex: 1, backgroundColor: colors.ground },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
    backgroundColor: colors.ground,
  },
  emoji: { fontSize: 48 },
  title: { ...typography.title, color: colors.textPrimary },
  muted: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
}));
