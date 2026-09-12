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

/**
 * Toprağın tonu.
 *
 * `soil`  — ekili parsel: koyu toprak kartı, sayfanın üstünde duran bir nesne.
 * `paper` — boş parsel: henüz bir şey yok, o yüzden sayfanın kendisi. Kağıt
 *   zeminde yalnızca sürülmüş toprağın izi (karık, zemin çizgisi, höyük)
 *   soluk çizgiler halinde görünür. Boş parselin de koyu olduğu ilk denemede
 *   tarla, ekili olanlardan çok boş olanlarla dikkat çekiyordu.
 */
export type PlotTone = 'soil' | 'paper';

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

  // Kağıt zeminde çizgiler koyu ve çok soluk; toprakta ise zaten koyu olan
  // zemine daha koyu bir iz olarak düşüyor. Renk aynı, opaklık farklı.
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

      {/* Karıklar — kenarlarda pay var, komşu parselle birleşmesinler diye. */}
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
  /** Tamamen dekoratif: jestler alttaki parsele ulaşmalı. */
  root: { pointerEvents: 'none' },
  patch: { ...StyleSheet.absoluteFill, backgroundColor: colors.bark },
  /** Opaklıklar tona göre satır içinde veriliyor (bkz. lineOpacity). */
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
