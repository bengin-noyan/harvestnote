/**
 * Notun bitkisi.
 *
 * Önce emoji ile denedim, olmadı: emoji ya 🌱 ya 🌻, arası yok. Buradaki bitki
 * sürekli bir ilerleme gösteriyor. Sap uzuyor, yapraklar sırayla açılıyor,
 * ürün en sonda çıkıyor. Yani olgunluk ayrı bir çubuk değil, bitkinin kendisi.
 *
 * Bitki bir de hafifçe salınıyor. Duran çizim resim gibi duruyordu, salınınca
 * canlı gibi oluyor.
 *
 * react-native-svg kullanmadım, bu şekiller View + borderRadius + transform
 * ile çizilebiliyor. Yaprak iki köşesi yuvarlatılmış bir dikdörtgen, sap da
 * bir çizgi.
 *
 * Bileşen tamamen süs: jest yakalamıyor, erişilebilirlik ağacına da girmiyor.
 * Durumu yazıyla anlatan yer kartın alt yarısı.
 */
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { SEED_CATALOG } from '../game/config';
import type { VisualStage } from '../game/stages';
import { colors } from '../theme';
import { durations, easings } from '../theme/motion';
import type { SeedType } from '../types';

/** Bir salınımın tam turu. Nefes gibi, acelesi yok. */
const SWAY_PERIOD_MS = 2800;

/**
 * Yaprakların açılma eşikleri (olgunluk oranı). Çiftleri kaydırdım, iki yaprak
 * aynı anda açılınca bitki simetrik ve cansız duruyor.
 *
 * İlk çiftin eşiği negatif, yani ekildiği anda yarı açık (çenek yaprakları).
 * Sıfırdan başlatınca yeni not çıplak bir çubuk gibi görünüyordu.
 */
const LEAF_OPEN_SPAN = 0.18;

const LEAVES = [
  { side: -1 as const, at: -0.1, height: 0.3 },
  { side: 1 as const, at: -0.06, height: 0.34 },
  { side: -1 as const, at: 0.3, height: 0.52 },
  { side: 1 as const, at: 0.46, height: 0.64 },
  { side: -1 as const, at: 0.6, height: 0.76 },
];

/** Ürünün belirmeye başladığı olgunluk. */
const FRUIT_AT = 0.7;

interface Props {
  stage: VisualStage;
  /** 0 = yeni ekildi, 1 = hasada hazır. */
  progress: number;
  /** Çizim alanının yüksekliği (px). Genişliği bundan hesaplıyoruz. */
  height: number;
  seed: SeedType;
}

/**
 * Bitkinin rengi. Aşamalar arasında sadece ot farklı, sağlıklı bitki ekimden
 * hasada kadar aynı yeşil. Büyümeyi zaten boy ve yapraklar anlatıyor, renk de
 * değişince fazla oluyordu.
 */
function palette(stage: VisualStage) {
  if (stage === 'weedy') {
    return { stem: colors.weed, leaf: colors.weed, leafLight: colors.withered };
  }
  return { stem: colors.grass, leaf: colors.leaf, leafLight: colors.leafLight };
}

export function LivingPlant({ stage, progress, height, seed }: Props) {
  const reduced = useReducedMotion();
  const isWeedy = stage === 'weedy';
  const tone = palette(stage);

  /** Olgunluk. Dışarıdan zıplayarak gelse de bitki yumuşak büyüsün. */
  const grow = useSharedValue(progress);
  /** -1..1 arası salınım. */
  const sway = useSharedValue(0);

  useEffect(() => {
    grow.value = withTiming(progress, {
      duration: durations.slow,
      easing: easings.out,
    });
  }, [progress, grow]);

  useEffect(() => {
    // Hareket azaltma açıksa salınımı durduruyoruz. Büyüme yine animasyonlu,
    // o tek seferlik bir geçiş, sürekli dönen bir döngü değil.
    if (reduced) {
      cancelAnimation(sway);
      sway.value = 0;
      return;
    }
    sway.value = withRepeat(
      withTiming(1, {
        duration: SWAY_PERIOD_MS,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true,
    );
    return () => cancelAnimation(sway);
  }, [reduced, sway]);

  const stemWidth = Math.max(2, Math.round(height * 0.05));
  const leafW = Math.round(height * 0.3);
  const leafH = Math.round(height * 0.15);
  const fruitSize = Math.round(height * 0.42);

  /**
   * Bitki dipten salınıyor. transformOrigin vermezsek merkezden dönüyor ve
   * sapın kökü topraktan ayrılıyor.
   */
  const swayStyle = useAnimatedStyle(() => {
    // Otlu bitki salınmıyor, öne düşüyor.
    const droop = isWeedy ? 13 : 0;
    const amplitude = isWeedy ? 0.6 : 2.4;
    return {
      transform: [{ rotate: `${droop + (sway.value * 2 - 1) * amplitude}deg` }],
    };
  });

  const stemStyle = useAnimatedStyle(() => ({
    height: interpolate(grow.value, [0, 1], [height * 0.22, height * 0.82]),
  }));

  const fruitStyle = useAnimatedStyle(() => ({
    opacity: interpolate(grow.value, [FRUIT_AT, 0.92], [0, 1], Extrapolation.CLAMP),
    transform: [
      {
        scale: interpolate(
          grow.value,
          [FRUIT_AT, 1],
          [0.3, 1],
          Extrapolation.CLAMP,
        ),
      },
    ],
    bottom: interpolate(grow.value, [0, 1], [height * 0.2, height * 0.78]),
  }));

  return (
    <View
      style={[styles.root, { width: height, height }]}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Animated.View style={[styles.anchor, swayStyle]}>
        <Animated.View
          style={[
            styles.stem,
            stemStyle,
            { width: stemWidth, backgroundColor: tone.stem },
          ]}
        />

        {LEAVES.map((leaf) => (
          <Leaf
            key={`${leaf.side}-${leaf.at}`}
            grow={grow}
            side={leaf.side}
            at={leaf.at}
            heightRatio={leaf.height}
            plantHeight={height}
            width={leafW}
            thickness={leafH}
            color={leaf.side < 0 ? tone.leaf : tone.leafLight}
          />
        ))}

        <Animated.View style={[styles.fruit, fruitStyle]}>
          <Text style={{ fontSize: fruitSize }}>
            {SEED_CATALOG[seed]?.emoji ?? '🌾'}
          </Text>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

/**
 * Tek yaprak, eşiği geçince açılıyor.
 *
 * Ayrı bileşen olmasının sebebi: her yaprağın kendi useAnimatedStyle'ı var,
 * hook'ları da döngü içinde çağıramıyoruz.
 */
function Leaf({
  grow,
  side,
  at,
  heightRatio,
  plantHeight,
  width,
  thickness,
  color,
}: {
  grow: { value: number };
  side: -1 | 1;
  at: number;
  heightRatio: number;
  plantHeight: number;
  width: number;
  thickness: number;
  color: string;
}) {
  const style = useAnimatedStyle(() => {
    // Eşikten sonra dar bir aralıkta açılıyor, sonrası sabit.
    const open = interpolate(
      grow.value,
      [at, at + LEAF_OPEN_SPAN],
      [0, 1],
      Extrapolation.CLAMP,
    );
    return {
      opacity: open,
      // Yaprak sapın boyuyla beraber yukarı çıkıyor.
      bottom: interpolate(
        grow.value,
        [0, 1],
        [plantHeight * 0.12, plantHeight * heightRatio],
      ),
      transform: [
        { scaleX: side * open },
        { scaleY: open },
        // Açılırken hafifçe yukarı kalkıyor.
        { rotate: `${-18 * open}deg` },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.leaf,
        style,
        {
          width,
          height: thickness,
          backgroundColor: color,
          // Ucu sivri, dibi yuvarlak. Tam elips yapınca cansız duruyordu.
          borderTopLeftRadius: thickness,
          borderBottomLeftRadius: thickness,
          borderTopRightRadius: thickness * 1.6,
          left: '50%',
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'flex-end' },
  /**
   * Salınımın ekseni dipte. Çocuklar buna göre `bottom` ile konumlanıyor,
   * yani hepsi kökten ölçülüyor.
   */
  anchor: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    transformOrigin: 'bottom center',
  },
  stem: { borderRadius: 999 },
  leaf: { position: 'absolute', transformOrigin: 'left center' },
  fruit: { position: 'absolute', alignItems: 'center' },
});
