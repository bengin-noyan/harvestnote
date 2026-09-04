/**
 * Bir parselin toprağı.
 *
 * Parseller artık bitişik değil: her biri kendi kenarlığı ve köşe
 * yuvarlamasıyla duran bir kart. Karıklar da parselin iki yanında pay
 * bırakır — komşununkiyle birleşip ızgarayı tek bir çizgi yığınına
 * çevirmesinler diye.
 *
 * Zemin çizgisi (`GROUND_RATIO`) parseli ikiye böler: üstü boşluk, altı yazı.
 * Bitki bu çizgideki höyüğe kök salar — kutunun ortasında yüzmez.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { colors } from '../theme';

/** Zemin çizgisinin parsel yüksekliğine oranı. */
export const GROUND_RATIO = 0.52;

export interface PlotMetrics {
  /** Zemin çizgisinin parselin üstünden uzaklığı (px). */
  ground: number;
  moundWidth: number;
  moundHeight: number;
}

export function plotMetrics(size: number): PlotMetrics {
  return {
    ground: Math.round(size * GROUND_RATIO),
    moundWidth: Math.round(size * 0.6),
    moundHeight: Math.max(6, Math.round(size * 0.07)),
  };
}

interface Props {
  size: number;
  /**
   * Toprağın tonu bütün parsellerde aynıdır; aşama bitkiyle anlatılır.
   * Yalnızca ot basmış parsel toprağın rengini de değiştirir.
   */
  soil?: string;
  /**
   * Toprağın tek renk bir dikdörtgen gibi durmaması için parsele göre
   * değişen ama sabit kalan küçük leke farkı (not id'si ya da sıra no).
   */
  variant?: number;
}

export function PlotGround({ size, soil = colors.soil, variant = 0 }: Props) {
  const { ground, moundWidth, moundHeight } = plotMetrics(size);

  return (
    <View
      style={[StyleSheet.absoluteFill, styles.root, { backgroundColor: soil }]}
    >
      <View style={[styles.patch, { opacity: 0.02 + (variant % 4) * 0.015 }]} />

      {/* Karıklar — kenarlarda pay var, komşu parselle birleşmesinler diye. */}
      <View style={[styles.furrow, { top: Math.round(size * 0.2) }]} />
      <View style={[styles.furrow, { top: Math.round(size * 0.41) }]} />

      {/* Zemin çizgisi ve üstüne yığılmış höyük. */}
      <View style={[styles.groundLine, { top: ground }]} />
      <View
        style={[
          styles.mound,
          {
            top: ground - moundHeight + 1,
            left: Math.round((size - moundWidth) / 2),
            width: moundWidth,
            height: moundHeight,
            borderTopLeftRadius: moundHeight,
            borderTopRightRadius: moundHeight,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  /** Tamamen dekoratif: jestler alttaki parsele ulaşmalı. */
  root: { pointerEvents: 'none' },
  patch: { ...StyleSheet.absoluteFill, backgroundColor: colors.bark },
  furrow: {
    position: 'absolute',
    left: 10,
    right: 10,
    height: 1,
    backgroundColor: colors.bark,
    opacity: 0.22,
  },
  groundLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.bark,
    opacity: 0.3,
  },
  mound: {
    position: 'absolute',
    backgroundColor: colors.soilLight,
    opacity: 0.45,
  },
});
