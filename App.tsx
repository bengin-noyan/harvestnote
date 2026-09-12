// gesture-handler importu her şeyden önce gelmeli (native tarafı kurar).
import 'react-native-gesture-handler';

import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { PixelButton } from './src/components/PixelButton';
import { RootNavigator } from './src/navigation/RootNavigator';
import { FarmProvider, useFarm } from './src/providers/FarmProvider';
import { colors, spacing, typography } from './src/theme';

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <FarmProvider>
          {/*
            Durum çubuğu yazıları koyu: kabuk aydınlık bir kağıt yüzey.
            "light" bırakılırsa telefonda saat/pil beyaz kalır ve beyaz
            başlığın üstünde görünmez olur — web'de durum çubuğu olmadığı
            için tarayıcıda fark edilmez.
          */}
          <StatusBar style="dark" />
          <FarmGate />
        </FarmProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/**
 * Açılış kapısı: migration'lar ve time-skip bitene kadar navigasyonu monte
 * etmez. Ekranlar böylece "veri hazır" varsayımıyla yazılabiliyor.
 */
function FarmGate() {
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
        <PixelButton label="Tekrar dene" icon="🔁" onPress={retry} />
      </View>
    );
  }

  return <RootNavigator />;
}

const styles = StyleSheet.create({
  /**
   * Kök zemin uygulamanın her yerinde görünen renktir: açılış karesi, aşırı
   * kaydırmada kalan boşluk, ekran geçişlerinin arkası. Kabukla aynı kağıt
   * olmalı — koyu kalırsa uygulama koyu açılıp aydınlığa atlıyor.
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
});
