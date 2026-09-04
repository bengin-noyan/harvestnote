/**
 * Boş parsel — sürülmüş ama henüz ekilmemiş toprak.
 *
 * Tarlanın sonunda her zaman boş parsel bırakılır (bkz. FarmScreen'deki
 * hücre listesi). Ekmek başlıktaki bir butonun işi değil, toprağın kendisine
 * dokunmakla olur: böylece "ekle" eylemi de uygulama çerçevesinden çıkıp
 * tarlanın içine giriyor.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, elevation, radii, spacing, typography } from '../theme';
import { PlotGround, plotMetrics } from './PlotGround';

interface Props {
  size: number;
  /** Toprak lekesinin parselden parsele değişmesi için sıra numarası. */
  index: number;
  onPress: () => void;
}

export function EmptyPlot({ size, index, onPress }: Props) {
  const { ground, moundHeight } = plotMetrics(size);
  const holeWidth = Math.max(10, Math.round(size * 0.13));

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.plot,
        { width: size, height: size },
        pressed ? styles.plotPressed : null,
      ]}
      accessibilityRole="button"
      accessibilityLabel="Boş parsel"
      accessibilityHint="Buraya yeni bir tohum ek"
    >
      <PlotGround size={size} variant={index} />

      {/* Höyüğün tepesinde tohumu bekleyen çukur. */}
      <View
        style={[
          styles.holeZone,
          styles.noHit,
          { height: ground, paddingBottom: Math.round(moundHeight * 0.25) },
        ]}
      >
        <View
          style={[
            styles.hole,
            {
              width: holeWidth,
              height: Math.round(holeWidth * 0.5),
              borderRadius: holeWidth,
            },
          ]}
        />
      </View>

      <View
        style={[styles.base, styles.noHit, { top: ground, height: size - ground }]}
      >
        <Text style={styles.label}>+ ek</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  /**
   * Dolu parselle aynı kart ölçüleri, ama kesikli kenarlık: "burası henüz
   * ekilmedi" mesajını yazıya gerek kalmadan veriyor.
   */
  plot: {
    overflow: 'hidden',
    borderRadius: radii.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.soilLight,
    backgroundColor: colors.soilDeep,
    ...elevation.card,
  },
  /** Dokunma anında parsel canlanır — jest karşılıksız kalmasın. */
  plotPressed: { borderColor: colors.leaf, borderStyle: 'solid' },
  /** Dekoratif katmanlar dokunuşu yutmamalı. */
  noHit: { pointerEvents: 'none' },
  holeZone: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  hole: { backgroundColor: colors.bark, opacity: 0.5 },
  base: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingTop: spacing.xs,
  },
  /**
   * Etikete opaklık verilmiyor: 0.55 opaklık bu metni toprak üzerinde ~1.9
   * kontrasta düşürüyordu. Geri çekilme hissi rengin kendisinden geliyor.
   */
  label: {
    ...typography.caption,
    fontSize: 10,
    lineHeight: 14,
    color: colors.textOnDarkMuted,
  },
});
