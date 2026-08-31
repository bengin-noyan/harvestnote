/**
 * Kiler — hasat edilmiş görevlerin sergilendiği ekran.
 *
 * Buradaki kayıtlar `inventory` tablosundan gelir; notun kendisi silinse bile
 * hasat geçmişi durur (ON DELETE SET NULL), yani "yaptıklarım" listesi
 * hiçbir zaman geriye doğru bozulmaz.
 */
import React from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '../components/EmptyState';
import { InventoryCard } from '../components/InventoryCard';
import { SEED_CATALOG } from '../game/config';
import { useInventory } from '../hooks/useInventory';
import { borders, colors, radii, spacing, typography } from '../theme';
import type { InventoryItem } from '../types';

export function InventoryScreen() {
  const { items, summary, totalValue, loading, discard } = useInventory();

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerTitleBlock}>
            <Text style={styles.title}>Kiler</Text>
            <Text style={styles.subtitle}>
              {items.length > 0
                ? `${items.length} ürün · ${totalValue} puan`
                : 'Raflar henüz boş'}
            </Text>
          </View>
          <Text style={styles.headerEmoji}>🧺</Text>
        </View>

        {summary.length > 0 ? (
          <View style={styles.shelf}>
            {summary.map((entry) => {
              const seed = SEED_CATALOG[entry.seed_type];
              return (
                <View key={entry.seed_type} style={styles.shelfItem}>
                  <Text style={styles.shelfEmoji}>{seed?.emoji ?? '🌾'}</Text>
                  <Text style={styles.shelfCount}>×{entry.count}</Text>
                </View>
              );
            })}
          </View>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.gold} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item: InventoryItem) => String(item.id)}
          renderItem={({ item }) => (
            <InventoryCard item={item} onDiscard={discard} />
          )}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              emoji="🧺"
              title="Kiler boş"
              message="Tarlada olgunlaşan bir ürünü yukarı kaydırarak hasat et; buraya düşecek."
              onDark={false}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.parchmentDark },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.bark,
    borderBottomWidth: borders.thick,
    borderBottomColor: colors.soil,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleBlock: { flex: 1, gap: 2 },
  headerEmoji: { fontSize: 30 },
  title: { ...typography.title, color: colors.goldLight },
  subtitle: { ...typography.caption, color: colors.textOnDarkMuted },
  shelf: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  shelfItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.soilDeep,
    borderWidth: borders.width,
    borderColor: colors.soil,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  shelfEmoji: { fontSize: 16 },
  shelfCount: { ...typography.caption, color: colors.textOnDark },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: spacing.lg, paddingBottom: spacing.xxl },
  separator: { height: spacing.md },
});
