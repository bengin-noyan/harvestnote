/**
 * Blok türü seçicisi.
 *
 * İki yerden açılıyor: bloğa `/` yazınca (süzülmüş liste) ve bloğa uzun
 * basınca (tüm liste + "Sil"). Aynı bileşen, çünkü ikisi de aynı soruyu
 * soruyor — bu blok ne olsun?
 *
 * Bilerek `Modal` değil, satır içi panel: editör zaten bir `Modal` içindeki
 * `BottomSheet`'in içinde. RN'de iç içe modal Android'de jest ve odak
 * davranışını bozuyor; satır içi panel klavyeyi de kapatmıyor.
 */
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { borders, colors, elevation, radii, spacing, typography } from '../../theme';
import type { BlockType } from '../../types';
import type { BlockMeta } from './blockMeta';

interface Props {
  items: BlockMeta[];
  onSelect: (type: BlockType) => void;
  /** Verilirse listenin altına ayrı bir "Sil" satırı eklenir. */
  onDelete?: () => void;
  /** Uzun basış menüsünde hangi türün seçili olduğunu göstermek için. */
  activeType?: BlockType;
}

/**
 * Panel yüksekliği sınırlı: klavye açıkken sekiz satırlık liste ekranı
 * doldurup yazdığın bloğu görünmez yapıyordu.
 */
const MAX_HEIGHT = 224;

export function BlockMenu({ items, onSelect, onDelete, activeType }: Props) {
  if (items.length === 0 && !onDelete) {
    return (
      <View style={styles.panel}>
        <Text style={styles.empty}>Eşleşen blok yok</Text>
      </View>
    );
  }

  return (
    <View style={styles.panel}>
      <ScrollView
        style={styles.scroll}
        keyboardShouldPersistTaps="always"
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        {items.map((meta) => (
          <Pressable
            key={meta.type}
            onPress={() => onSelect(meta.type)}
            style={({ pressed }) => [
              styles.row,
              pressed ? styles.rowPressed : null,
              meta.type === activeType ? styles.rowActive : null,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`${meta.label} bloğuna çevir`}
          >
            <Text style={styles.icon}>{meta.icon}</Text>
            <View style={styles.rowText}>
              <Text style={styles.label}>{meta.label}</Text>
              <Text style={styles.hint}>{meta.hint}</Text>
            </View>
            {meta.type === activeType ? (
              <Text style={styles.tick}>✓</Text>
            ) : null}
          </Pressable>
        ))}

        {onDelete ? (
          <Pressable
            onPress={onDelete}
            style={({ pressed }) => [
              styles.row,
              styles.deleteRow,
              pressed ? styles.rowPressed : null,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Bloğu sil"
          >
            <Text style={styles.icon}>🗑</Text>
            <View style={styles.rowText}>
              <Text style={[styles.label, styles.deleteLabel]}>Bloğu sil</Text>
              <Text style={styles.hint}>Bu satırı kaldır</Text>
            </View>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: borders.hairline,
    borderColor: colors.rule,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    ...elevation.card,
  },
  scroll: { maxHeight: MAX_HEIGHT },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowPressed: { backgroundColor: colors.surfaceSunken },
  rowActive: { backgroundColor: colors.surfaceSunken },
  /** Silme, tür listesinden bir çizgiyle ayrılıyor: farklı cinsten bir iş. */
  deleteRow: {
    borderTopWidth: borders.hairline,
    borderTopColor: colors.rule,
  },
  icon: {
    width: 22,
    textAlign: 'center',
    fontSize: 15,
    color: colors.textSecondary,
  },
  rowText: { flex: 1 },
  label: { ...typography.body, color: colors.textPrimary },
  deleteLabel: { color: colors.danger },
  hint: { ...typography.caption, color: colors.textMuted },
  tick: { ...typography.body, color: colors.leafDeep },
  empty: {
    ...typography.caption,
    color: colors.textMuted,
    padding: spacing.md,
  },
});
