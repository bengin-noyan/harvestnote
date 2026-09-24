/**
 * Kiler: hasat edilen görevlerin durduğu raf.
 *
 * Kayıtlar inventory tablosundan geliyor. Not silinse bile hasat kaydı
 * kalıyor (ON DELETE SET NULL), yani geçmiş bozulmuyor.
 *
 * Safe area ile uğraşmıyor, kabuğun içinde duruyor. Başlık kısmı tarla
 * sayfasıyla aynı.
 */
import React from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '../components/EmptyState';
import { InventoryCard } from '../components/InventoryCard';
import { DatabaseHeader } from '../components/ui/DatabaseHeader';
import { FadeIn, staggerDelay } from '../components/ui/FadeIn';
import { Tag } from '../components/ui/Tag';
import { SEED_CATALOG } from '../game/config';
import type { UseInventoryResult } from '../hooks/useInventory';
import { borders, spacing } from '../theme';
import type { InventoryItem } from '../types';
import { PAGE_MAX_WIDTH } from './NotePage';
import { makeStyles, useTheme } from '../theme/ThemeProvider';

export function InventoryView({ inventory }: { inventory: UseInventoryResult }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const { items, summary, totalValue, loading, discard } = inventory;

  // Başlık da listeyle birlikte kaysın.
  const header = (
    <View style={styles.header}>
      <DatabaseHeader
        icon="🧺"
        title="Kiler"
        description={
          items.length > 0
            ? `${items.length} ürün · ${totalValue} puan`
            : 'Raflar henüz boş'
        }
      >
        {summary.length > 0 ? (
          <View style={styles.shelf}>
            {summary.map((entry) => {
              const seed = SEED_CATALOG[entry.seed_type];
              return (
                <Tag
                  key={entry.seed_type}
                  label={`${seed?.emoji ?? '🌾'} ${seed?.label ?? ''} ×${entry.count}`}
                  color="gray"
                />
              );
            })}
          </View>
        ) : null}
      </DatabaseHeader>
      <View style={styles.rule} />
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.textMuted} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.root}
      data={items}
      keyExtractor={(item: InventoryItem) => String(item.id)}
      renderItem={({ item, index }) => (
        <FadeIn delay={staggerDelay(index)}>
          <InventoryCard item={item} onDiscard={discard} />
        </FadeIn>
      )}
      ListHeaderComponent={header}
      contentContainerStyle={styles.list}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={
        <EmptyState
          emoji="🧺"
          title="Kiler boş"
          message="Tarlada olgunlaşan bir ürünü yukarı kaydırarak hasat et; buraya düşecek."
        />
      }
    />
  );
}

const useStyles = makeStyles(({ colors }) => ({
  root: { flex: 1, backgroundColor: colors.ground },
  header: { paddingBottom: spacing.lg },
  shelf: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  rule: {
    height: borders.hairline,
    backgroundColor: colors.rule,
    marginTop: spacing.lg,
  },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl * 2,
    width: '100%',
    maxWidth: PAGE_MAX_WIDTH,
    alignSelf: 'center',
  },
  separator: { height: spacing.md },
}));
