/**
 * Parselin toprağı.
 *
 * Parseller bitişik değil, her biri kendi kenarlığı olan bir kart. Karıkların
 * iki yanında pay bırakıyorum, yoksa komşu parselinkiyle birleşip ızgara tek
 * bir çizgi yığınına dönüyor.
 *
 * Zemin çizgisi (GROUND_RATIO) parseli ikiye bölüyor: üstü boşluk, altı yazı.
 * Bitki bu çizgideki höyüğe oturuyor, kutunun ortasında durmuyor.
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

/**
 * Toprağın tonu.
 *
 * soil  - ekili parsel, koyu toprak kartı.
 * paper - boş parsel. Henüz bir şey yok, o yüzden sayfayla aynı renk; sadece
 *   sürülmüş toprağın izleri (karık, zemin çizgisi, höyük) soluk görünüyor.
 *   İlk denemede boş parseller de koyuydu ve tarlada en çok onlar göze
 *   batıyordu.
 */
export type PlotTone = 'soil' | 'paper';

interface Props {
  size: number;
  /**
   * Toprak rengi bütün parsellerde aynı, aşamayı bitki anlatıyor.
   * Sadece otlu parselde toprak da değişiyor.
   */
  soil?: string;
  /**
   * Toprak düz bir dikdörtgen gibi durmasın diye küçük leke farkı. Parsele
   * göre değişiyor ama sabit kalıyor (not id'si ya da sıra no).
   */
  variant?: number;
  tone?: PlotTone;
}

export function PlotGround({
  size,
  soil,
  variant = 0,
  tone = 'soil',
}: Props) {
  const { ground, moundWidth, moundHeight } = plotMetrics(size);
  const paper = tone === 'paper';
  const background = soil ?? (paper ? colors.surfaceSunken : colors.soil);

  // Kağıt zeminde çizgiler iyice soluk duruyor, koyu toprakta biraz daha
  // belirgin. Renk aynı, sadece opaklık değişiyor.
  const lineOpacity = paper
    ? { furrow: 0.1, ground: 0.16, mound: 0.14 }
    : { furrow: 0.22, ground: 0.3, mound: 0.45 };

  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        styles.root,
        { backgroundColor: background },
      ]}
    >
      {paper ? null : (
        <View style={[styles.patch, { opacity: 0.02 + (variant % 4) * 0.015 }]} />
      )}

      {/* Karıklar. Kenarlarda pay var ki komşu parselle birleşmesinler. */}
      <View
        style={[
          styles.furrow,
          { top: Math.round(size * 0.2), opacity: lineOpacity.furrow },
        ]}
      />
      <View
        style={[
          styles.furrow,
          { top: Math.round(size * 0.41), opacity: lineOpacity.furrow },
        ]}
      />

      {/* Zemin çizgisi ve üstüne yığılmış höyük. */}
      <View
        style={[styles.groundLine, { top: ground, opacity: lineOpacity.ground }]}
      />
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
            opacity: lineOpacity.mound,
            backgroundColor: paper ? colors.soil : colors.soilLight,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  /** Tamamen süs. Jestler alttaki parsele gitsin. */
  root: { pointerEvents: 'none' },
  patch: { ...StyleSheet.absoluteFill, backgroundColor: colors.bark },
  /** Opaklık tona göre satır içinde veriliyor (bkz. lineOpacity). */
  furrow: {
    position: 'absolute',
    left: 10,
    right: 10,
    height: 1,
    backgroundColor: colors.bark,
  },
  groundLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.bark,
  },
  mound: { position: 'absolute' },
});
