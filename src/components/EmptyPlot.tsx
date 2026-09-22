// Boş parsel: sürülmüş ama daha ekilmemiş toprak.
// Tarlanın sonunda hep bir boş parsel duruyor (bkz. FarmView'deki hücre
// listesi). Ekleme işi başlıktaki bir butonda değil, doğrudan toprağa
// dokununca oluyor.
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  borders,
  colors,
  DENSE_FONT_SCALE_CAP,
  radii,
  spacing,
  typography,
} from '../theme';
import { PlotGround, plotMetrics } from './PlotGround';

interface Props {
  size: number;
  /** Toprak deseni her parselde farklı olsun diye sıra numarası. */
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
      <PlotGround size={size} variant={index} tone="paper" />

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
        <Text style={styles.label} maxFontSizeMultiplier={DENSE_FONT_SCALE_CAP}>
          + ek
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Boş parselin gölgesi yok, zemini de sayfayla aynı. Kesikli kenarlık
  // "burası henüz ekilmedi" demeye yetiyor.
  plot: {
    overflow: 'hidden',
    borderRadius: radii.md,
    borderWidth: borders.width,
    borderStyle: 'dashed',
    borderColor: colors.ruleStrong,
    backgroundColor: colors.surfaceSunken,
  },
  /** Dokununca renk değişsin ki basıldığı belli olsun. */
  plotPressed: { borderColor: colors.leafDeep, borderStyle: 'solid' },
  /** Süs katmanları dokunuşu yutmasın. */
  noHit: { pointerEvents: 'none' },
  holeZone: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  hole: { backgroundColor: colors.soil, opacity: 0.28 },
  /** Yazı alt yarının ortasına otursun, altta boşluk kalmasın. */
  base: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Etikete opacity vermiyorum, 0.55 ile kontrast 1.9'a düşüyordu.
  // Soluk dursun diye rengin kendisi yeterli.
  label: {
    ...typography.caption,
    fontSize: 10,
    lineHeight: 14,
    color: colors.textMuted,
  },
});
