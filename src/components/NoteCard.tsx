/**
 * Tarladaki tek bir parsel.
 *
 * Parsel kendi kenarlığı, köşe yuvarlaması ve komşusuyla arasında boşluğu
 * olan bir karttır — tarlaya karışmaz, üstünde durur. Zemin çizgisi parseli
 * ikiye böler — üstünde bitki, altında yazı. Bitki höyüğe kök salar ve
 * olgunlaştıkça büyür: olgunluk ayrı bir ilerleme çubuğuyla değil,
 * doğrudan bitkinin boyuyla anlatılır (bkz. LivingPlant).
 *
 * Jest haritası (aşamaya göre değişir):
 *   weedy        yana kaydır  -> otlar süzülüp gider, `tendNote` çalışır
 *                dokunma      -> AÇILMAZ; parsel sallanır ve ipucu gösterilir
 *   harvestable  yukarı kaydır / uzun bas -> ürün küçülüp kaybolur, hasat
 *                dokunma      -> detay
 *   diğer        dokunma      -> detay
 *
 * Aşamaların tamamı `resolveStage` ile türetilir; parsel hiçbir zaman kendi
 * başına durum uydurmaz.
 */
import React, { useCallback, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import type { TodoCount } from '../db/repositories/blocks';
import { SEED_CATALOG } from '../game/config';
import {
  maturityProgress,
  resolveStage,
  STAGE_VISUALS,
} from '../game/stages';
import {
  colors,
  DENSE_FONT_SCALE_CAP,
  elevation,
  radii,
  spacing,
  typography,
} from '../theme';
import { durations, easings, springs } from '../theme/motion';
import type { Note } from '../types';
import { LivingPlant } from './LivingPlant';
import { PlotGround, plotMetrics } from './PlotGround';

/** Otların temizlenmiş sayılması için gereken yatay mesafe. */
const CLEAR_DISTANCE = 88;
/** Hasat için gereken yukarı kaydırma mesafesi. */
const HARVEST_DISTANCE = 64;

/**
 * Bitkinin çizim kutusunun zemin üstü yüksekliğe oranı. Kutu sabit; büyüyen
 * şey kutunun *içindeki* bitki (LivingPlant sapı olgunlukla uzatıyor).
 */
const PLANT_BOX_RATIO = 0.74;

interface Props {
  note: Note;
  /** Ekranın paylaşılan saati — bkz. hooks/useNow. */
  now: number;
  /** Notun yapılacak sayımı; yoksa olgunluk yalnızca zamandan gelir. */
  labor?: TodoCount;
  size: number;
  onOpen: (id: number) => void;
  onTend: (id: number) => void;
  onHarvest: (id: number) => void;
  /** Ot basmış parsele dokunulduğunda: ipucu göster. */
  onBlocked: () => void;
}

function NoteCardComponent({
  note,
  now,
  labor,
  size,
  onOpen,
  onTend,
  onHarvest,
  onBlocked,
}: Props) {
  const stage = resolveStage(note, now, undefined, labor);
  const visual = STAGE_VISUALS[stage];
  const isWeedy = stage === 'weedy';
  const isHarvestable = stage === 'harvestable';
  const progress = maturityProgress(note, now, undefined, labor);
  const seed = SEED_CATALOG[note.seed_type];

  const { ground, moundHeight } = plotMetrics(size);
  const plantBox = Math.round(ground * PLANT_BOX_RATIO);
  const glowSize = Math.round(size * 0.62);

  const weedX = useSharedValue(0);
  const weedOpacity = useSharedValue(isWeedy ? 1 : 0);
  const cardScale = useSharedValue(0.88);
  const cardOpacity = useSharedValue(1);
  const liftY = useSharedValue(0);
  const shakeX = useSharedValue(0);
  const glow = useSharedValue(0);

  // Ekildiğinde tek seferlik "filizlenme" sıçraması.
  useEffect(() => {
    cardScale.value = withSpring(1, springs.enter);
  }, [cardScale]);

  // Aşama dışarıdan değişebilir (time-skip, ot temizleme): katmanları eşitle.
  useEffect(() => {
    weedOpacity.value = withTiming(isWeedy ? 1 : 0, {
      duration: durations.base,
      easing: easings.out,
    });
    if (!isWeedy) weedX.value = 0;
  }, [isWeedy, weedOpacity, weedX]);

  // Olgun ürünün altındaki toprak nefes alır gibi parlar.
  useEffect(() => {
    if (isHarvestable) {
      glow.value = 0.35;
      glow.value = withRepeat(withTiming(1, { duration: 1100 }), -1, true);
    } else {
      cancelAnimation(glow);
      glow.value = withTiming(0, { duration: durations.base });
    }
    return () => cancelAnimation(glow);
  }, [isHarvestable, glow]);

  const handleTend = useCallback(() => onTend(note.id), [onTend, note.id]);
  const handleHarvest = useCallback(
    () => onHarvest(note.id),
    [onHarvest, note.id],
  );
  const handleOpen = useCallback(() => onOpen(note.id), [onOpen, note.id]);

  /**
   * Hasat animasyonu: küt bir "pop", ardından scale 0'a küçülme.
   * UI thread'inde çalışan bir worklet — jest geri çağrılarından doğrudan
   * çağrılabilsin diye useCallback'e sarılmadı.
   */
  const playHarvest = () => {
    'worklet';
    liftY.value = withTiming(-52, {
      duration: durations.slow,
      easing: easings.out,
    });
    cardScale.value = withSequence(
      withTiming(1.18, { duration: durations.fast, easing: easings.out }),
      withTiming(0, { duration: durations.base, easing: easings.in }),
    );
    cardOpacity.value = withTiming(0, { duration: durations.slow }, (finished) => {
      if (finished) runOnJS(handleHarvest)();
    });
  };

  /* --- Jestler -------------------------------------------------------- */

  const clearGesture = Gesture.Pan()
    .enabled(isWeedy)
    .activeOffsetX([-14, 14])
    .failOffsetY([-28, 28])
    .onUpdate((event) => {
      weedX.value = event.translationX;
      // Otlar kaydırma ilerledikçe soluklaşır: geri bildirim anlık.
      weedOpacity.value = Math.max(
        0,
        1 - Math.abs(event.translationX) / CLEAR_DISTANCE,
      );
    })
    .onEnd((event) => {
      if (Math.abs(event.translationX) < CLEAR_DISTANCE) {
        weedX.value = withSpring(0, springs.settle);
        weedOpacity.value = withTiming(1, { duration: durations.base });
        return;
      }
      const direction = event.translationX > 0 ? 1 : -1;
      weedX.value = withTiming(direction * 280, {
        duration: durations.slow,
        easing: easings.in,
      });
      weedOpacity.value = withTiming(0, { duration: durations.base }, (finished) => {
        if (finished) runOnJS(handleTend)();
      });
      cardScale.value = withSequence(
        withTiming(1.07, { duration: durations.fast, easing: easings.out }),
        withSpring(1, springs.enter),
      );
    });

  const harvestGesture = Gesture.Pan()
    .enabled(isHarvestable)
    .activeOffsetY([-14, 14])
    .failOffsetX([-28, 28])
    .onUpdate((event) => {
      const lift = Math.min(0, event.translationY);
      liftY.value = lift;
      cardScale.value = 1 + Math.min(60, -lift) / 500;
    })
    .onEnd((event) => {
      if (event.translationY <= -HARVEST_DISTANCE) {
        playHarvest();
        return;
      }
      liftY.value = withSpring(0, springs.settle);
      cardScale.value = withSpring(1, springs.settle);
    });

  const longPressGesture = Gesture.LongPress()
    .enabled(isHarvestable)
    .minDuration(420)
    .onStart(() => {
      playHarvest();
    });

  const tapGesture = Gesture.Tap()
    .maxDuration(300)
    .onEnd((_event, success) => {
      if (!success) return;
      if (isWeedy) {
        // Ot basmış not açılmaz: reddedişi animasyonla anlat.
        // Sallanma adımı `fast`in yarısı: reddediş tereddütsüz okunmalı.
        const step = durations.fast / 2;
        shakeX.value = withSequence(
          withTiming(-7, { duration: step }),
          withTiming(7, { duration: step }),
          withTiming(-4, { duration: step }),
          withTiming(0, { duration: step }),
        );
        runOnJS(onBlocked)();
        return;
      }
      runOnJS(handleOpen)();
    });

  const gesture = Gesture.Race(
    clearGesture,
    harvestGesture,
    Gesture.Exclusive(longPressGesture, tapGesture),
  );

  /* --- Animasyonlu stiller -------------------------------------------- */

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [
      { translateX: shakeX.value },
      { translateY: liftY.value },
      { scale: cardScale.value },
    ],
  }));

  const weedStyle = useAnimatedStyle(() => ({
    opacity: weedOpacity.value,
    transform: [
      { translateX: weedX.value },
      { rotate: `${weedX.value / 26}deg` },
    ],
  }));

  /**
   * Parıltı toprağa vuran bir hâle; dolu altın bir leke olmasın diye
   * opaklık dar bir aralıkta gezinir.
   */
  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.1 + glow.value * 0.22,
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[styles.plot, { width: size, height: size }, cardStyle]}
        accessibilityRole="button"
        accessibilityLabel={`${note.title}, ${visual.label}`}
        accessibilityHint={visual.hint}
      >
        <PlotGround size={size} variant={note.id} />

        {/* Zemin çizgisinin üstü: bitki höyüğe basar. */}
        <View
          style={[
            styles.plantZone,
            styles.noHit,
            { height: ground, paddingBottom: Math.round(moundHeight * 0.45) },
          ]}
        >
          <Animated.View
            style={[
              styles.glow,
              glowStyle,
              {
                width: glowSize,
                height: glowSize,
                borderRadius: glowSize / 2,
                bottom: -Math.round(glowSize * 0.3),
              },
            ]}
          />
          <View
            style={[
              styles.plantShadow,
              {
                width: Math.round(size * 0.22),
                height: Math.round(size * 0.045),
                borderRadius: size,
                bottom: Math.round(moundHeight * 0.35),
              },
            ]}
          />
          <LivingPlant
            stage={stage}
            progress={progress}
            height={plantBox}
            seed={note.seed_type}
          />
        </View>

        {/* Zemin çizgisinin altı: yazı. */}
        <View
          style={[
            styles.base,
            styles.noHit,
            { top: ground, height: size - ground },
          ]}
        >
          <Text
            style={styles.title}
            numberOfLines={2}
            maxFontSizeMultiplier={DENSE_FONT_SCALE_CAP}
          >
            {note.title}
          </Text>
          <Text
            style={[styles.caption, isHarvestable ? styles.captionReady : null]}
            numberOfLines={1}
            maxFontSizeMultiplier={DENSE_FONT_SCALE_CAP}
          >
            {isHarvestable
              ? '↑ hasat'
              : labor && labor.total > 0
                ? `☑ ${labor.done}/${labor.total}`
                : `${seed?.emoji ?? ''} ${visual.label}`}
          </Text>
        </View>

        {/*
          Ot katmanı: kaydırıldıkça kayar ve solar. Her zaman monte —
          görünürlüğü opaklıkla yönetiliyor — ama ot yokken erişilebilirlik
          ağacından çıkarılmalı: aksi halde ekran okuyucu sağlıklı bir
          parselde "ot bastı / temizle" diye okuyor.
        */}
        <Animated.View
          accessibilityElementsHidden={!isWeedy}
          importantForAccessibility={isWeedy ? 'auto' : 'no-hide-descendants'}
          style={[
            styles.weedLayer,
            weedStyle,
            { pointerEvents: isWeedy ? 'auto' : 'none' },
          ]}
        >
          <View
            style={[styles.weedRow, { top: ground - Math.round(size * 0.34) }]}
          >
            <Text style={{ fontSize: Math.round(size * 0.2) }}>🥀</Text>
            <Text style={{ fontSize: Math.round(size * 0.15), opacity: 0.8 }}>
              🌿
            </Text>
            <Text style={{ fontSize: Math.round(size * 0.2) }}>🥀</Text>
          </View>
          <View style={[styles.base, { top: ground, height: size - ground }]}>
            <Text
              style={styles.weedTitle}
              numberOfLines={2}
              maxFontSizeMultiplier={DENSE_FONT_SCALE_CAP}
            >
              {note.title}
            </Text>
            <Text
              style={styles.weedHint}
              numberOfLines={1}
              maxFontSizeMultiplier={DENSE_FONT_SCALE_CAP}
            >
              ↔ temizle
            </Text>
          </View>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

export const NoteCard = React.memo(NoteCardComponent);

const styles = StyleSheet.create({
  /** Parsel tarlaya karışmaz: kendi kenarlığı ve köşesiyle bir kart. */
  plot: {
    overflow: 'hidden',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.soil,
    backgroundColor: colors.soilDeep,
    ...elevation.card,
  },
  /** Dekoratif katmanlar jestleri yakalamamalı. */
  noHit: { pointerEvents: 'none' },
  plantZone: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  glow: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: colors.goldLight,
  },
  plantShadow: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: colors.bark,
    opacity: 0.35,
  },
  /**
   * Yazı bloğu zemin çizgisinin altındaki yarının ortasına oturur. Üstten
   * sabit padding verildiğinde kartın dibinde bir tutam ölü toprak kalıyordu;
   * koyu zeminde fark edilmiyordu, kağıt zeminde hata gibi duruyor.
   */
  base: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    gap: 1,
  },
  title: {
    ...typography.body,
    fontSize: 13,
    lineHeight: 17,
    color: colors.textOnDark,
    textAlign: 'center',
  },
  caption: {
    ...typography.caption,
    color: colors.textOnDarkMuted,
    textAlign: 'center',
  },
  captionReady: { color: colors.goldLight },
  weedLayer: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.weedDeep,
  },
  weedRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 2,
  },
  weedTitle: {
    ...typography.caption,
    color: colors.textOnDarkMuted,
    textAlign: 'center',
  },
  weedHint: {
    ...typography.caption,
    fontSize: 10,
    lineHeight: 14,
    color: colors.leafLight,
    textAlign: 'center',
  },
});
