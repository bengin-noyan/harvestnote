/**
 * Kilerdeki tek bir ürün. Kalite (golden / normal / withered) kartın
 * kenarlığını, zeminini ve rozetini belirler — başarı hissi buradan geliyor.
 */
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { SEED_CATALOG } from '../game/config';
import { borders, colors, elevation, radii, spacing, typography } from '../theme';
import type { HarvestQuality, InventoryItem } from '../types';
import { formatDate, formatRelative } from '../utils/format';

interface QualityStyle {
  label: string;
  badge: string;
  bg: string;
  border: string;
  text: string;
  muted: string;
  glows: boolean;
}

export const QUALITY_STYLES: Record<HarvestQuality, QualityStyle> = {
  golden: {
    label: 'Altın',
    badge: '⭐',
    bg: '#fff4d6',
    border: colors.gold,
    text: colors.textPrimary,
    muted: '#8a6a1f',
    glows: true,
  },
  normal: {
    label: 'Normal',
    badge: '🧺',
    // `parchment` yeni sayfa zeminine çok yakındı; kart zeminden ayrılsın.
    bg: colors.surface,
    border: colors.ruleStrong,
    text: colors.textPrimary,
    muted: colors.textMuted,
    glows: false,
  },
  withered: {
    label: 'Solmuş',
    badge: '🥀',
    bg: '#e6e0d2',
    border: colors.withered,
    text: '#5f5647',
    muted: '#8a8171',
    glows: false,
  },
};

interface Props {
  item: InventoryItem;
  onDiscard: (id: number) => void;
}

export function InventoryCard({ item, onDiscard }: Props) {
  const quality = QUALITY_STYLES[item.quality];
  const seed = SEED_CATALOG[item.seed_type];
  const shimmer = useSharedValue(0);

  // Altın ürünler hafifçe parlar; diğerleri sabit durur.
  useEffect(() => {
    if (!quality.glows) return;
    shimmer.value = withRepeat(withTiming(1, { duration: 1600 }), -1, true);
    return () => cancelAnimation(shimmer);
  }, [quality.glows, shimmer]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.25 + shimmer.value * 0.55,
  }));

  return (
    <View style={[styles.card, { backgroundColor: quality.bg, borderColor: quality.border }]}>
      {quality.glows ? (
        <Animated.View style={[styles.glow, styles.noHit, glowStyle]} />
      ) : null}

      <View style={styles.emojiBox}>
        <Text style={styles.emoji}>{seed?.emoji ?? '🌾'}</Text>
      </View>

      <View style={styles.body}>
        <Text style={[styles.title, { color: quality.text }]} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={[styles.meta, { color: quality.muted }]}>
          {seed?.label ?? item.seed_type} · {formatDate(item.harvested_at)} ·{' '}
          {formatRelative(item.harvested_at)}
        </Text>
        <View style={[styles.badge, { borderColor: quality.border }]}>
          <Text style={[styles.badgeText, { color: quality.muted }]}>
            {quality.badge} {quality.label}
            {seed ? ` · ${seed.value} puan` : ''}
          </Text>
        </View>
      </View>

      <Pressable
        onPress={() => onDiscard(item.id)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`${item.title} ürününü kilerden çıkar`}
        style={styles.discard}
      >
        <Text style={[styles.discardText, { color: quality.muted }]}>✕</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: borders.thick,
    borderRadius: radii.md,
    padding: spacing.md,
    overflow: 'hidden',
    ...elevation.card,
  },
  noHit: { pointerEvents: 'none' },
  glow: {
    ...StyleSheet.absoluteFill,
    borderWidth: borders.thick,
    borderColor: colors.goldLight,
    borderRadius: radii.sm,
  },
  emojiBox: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: radii.sm,
  },
  emoji: { fontSize: 30 },
  body: { flex: 1, gap: spacing.xs },
  title: { ...typography.heading },
  meta: { ...typography.caption },
  badge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
    marginTop: 2,
  },
  badgeText: { ...typography.caption, fontSize: 10, lineHeight: 14 },
  discard: { padding: spacing.xs },
  discardText: { fontSize: 16, fontWeight: '700' },
});
