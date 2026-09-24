// Kilerdeki tek bir ürün kartı.
// Altın kalitedeki ürünlerin kenarı hafif parlıyor, ödül gibi hissettirsin diye.
import React, { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { SEED_CATALOG } from '../game/config';
import { useHover } from '../hooks/useHover';
import { borders, radii, spacing, typography, type TagColor } from '../theme';
import { makeStyles, useTheme } from '../theme/ThemeProvider';
import type { HarvestQuality, InventoryItem } from '../types';
import { formatDate, formatRelative } from '../utils/format';
import { Icon } from './ui/Icon';
import { Tag } from './ui/Tag';

export const QUALITY_META: Record<
  HarvestQuality,
  { label: string; tag: TagColor; glows: boolean }
> = {
  golden: { label: 'Altın', tag: 'yellow', glows: true },
  normal: { label: 'Normal', tag: 'gray', glows: false },
  withered: { label: 'Solmuş', tag: 'brown', glows: false },
};

interface Props {
  item: InventoryItem;
  onDiscard: (id: number) => void;
}

export function InventoryCard({ item, onDiscard }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { hovered, bind } = useHover();
  const quality = QUALITY_META[item.quality];
  const seed = SEED_CATALOG[item.seed_type];
  const shimmer = useSharedValue(0);

  // Altın ürünler hafif parlıyor, diğerleri sabit.
  useEffect(() => {
    if (!quality.glows) return;
    shimmer.value = withRepeat(withTiming(1, { duration: 1600 }), -1, true);
    return () => cancelAnimation(shimmer);
  }, [quality.glows, shimmer]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.2 + shimmer.value * 0.5,
  }));

  return (
    <Pressable {...bind} style={[styles.card, hovered ? styles.cardHover : null]}>
      {quality.glows ? (
        <Animated.View style={[styles.glow, styles.noHit, glowStyle]} />
      ) : null}

      <View style={styles.emojiBox}>
        <Text style={styles.emoji}>{seed?.emoji ?? '🌾'}</Text>
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {seed?.label ?? item.seed_type} · {formatDate(item.harvested_at)} ·{' '}
          {formatRelative(item.harvested_at)}
        </Text>
      </View>

      <Tag
        label={`${quality.label}${seed ? ` · ${seed.value} puan` : ''}`}
        color={quality.tag}
      />

      <Pressable
        onPress={() => onDiscard(item.id)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`${item.title} ürününü kilerden çıkar`}
        style={({ pressed }) => [
          styles.discard,
          pressed ? styles.discardPressed : null,
          // Web'de üstüne gelince belirginleşiyor. Telefonda hover yok, orada hep açık.
          { opacity: hovered || Platform.OS !== 'web' ? 1 : 0.45 },
        ]}
      >
        <Icon name="trash-2" size={15} color={colors.textMuted} />
      </Pressable>
    </Pressable>
  );
}

const useStyles = makeStyles(({ colors, elevation }) => ({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderWidth: borders.hairline,
    borderColor: colors.rule,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    overflow: 'hidden',
    ...elevation.card,
  },
  cardHover: { backgroundColor: colors.hover },
  noHit: { pointerEvents: 'none' },
  glow: {
    ...StyleSheet.absoluteFill,
    borderWidth: 1.5,
    borderColor: colors.gold,
    borderRadius: radii.sm,
  },
  emojiBox: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSunken,
    borderRadius: radii.sm,
  },
  emoji: { fontSize: 22 },
  body: { flex: 1, gap: 2 },
  title: { ...typography.ui, color: colors.textPrimary },
  meta: { ...typography.caption, color: colors.textMuted },
  discard: { padding: spacing.xs, borderRadius: radii.xs },
  discardPressed: { backgroundColor: colors.hover },
}));
