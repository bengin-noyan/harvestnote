/**
 * Tarla — ana ekran.
 *
 * Notlar alt alta bir liste değil, toprak parsellerinden oluşan bir ızgara
 * olarak gösterilir; sütun sayısı ekran genişliğine göre 2 veya 3 olur.
 * Tüm jestler NoteCard'ın içinde; bu ekran yalnızca veri, düzen ve panelleri
 * yönetir.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AddSeedSheet } from '../components/AddSeedSheet';
import { EmptyState } from '../components/EmptyState';
import { HintToast } from '../components/HintToast';
import { NoteCard } from '../components/NoteCard';
import { NoteDetailSheet } from '../components/NoteDetailSheet';
import { PixelButton } from '../components/PixelButton';
import { devAgeNotes } from '../db/repositories/notes';
import { DAY } from '../game/config';
import { resolveStage, STAGE_VISUALS, type VisualStage } from '../game/stages';
import { runTimeSkip } from '../game/timeSkip';
import { useNotes } from '../hooks/useNotes';
import { useNow } from '../hooks/useNow';
import { useReminderTap } from '../hooks/useReminderTap';
import { useFarm } from '../providers/FarmProvider';
import { borders, colors, radii, spacing, typography } from '../theme';
import type { Note } from '../types';

const GRID_PADDING = spacing.md;
/** Bu genişliğin üstünde üçüncü bir parsel sığıyor. */
const THREE_COLUMN_WIDTH = 560;

export function FarmScreen() {
  const { timeSkip, dismissTimeSkip, notifyChange } = useFarm();
  const { notes, loading, plant, tend, harvest, save, remove } = useNotes();
  const now = useNow();
  const { width } = useWindowDimensions();

  const [adding, setAdding] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  /** Bildirimden gelen not, liste henüz yüklenmemiş olabileceği için beklemede. */
  const [pendingNoteId, setPendingNoteId] = useState<number | null>(null);

  useReminderTap(setPendingNoteId);

  const columns = width >= THREE_COLUMN_WIDTH ? 3 : 2;
  const tileSize = (width - GRID_PADDING * 2) / columns;

  /** Aşama sayaçları DB'deki `status`tan değil, türetilmiş aşamadan gelir. */
  const counts = useMemo(() => {
    const base: Record<VisualStage, number> = {
      planted: 0,
      growing: 0,
      harvestable: 0,
      weedy: 0,
    };
    for (const note of notes) base[resolveStage(note, now)] += 1;
    return base;
  }, [notes, now]);

  const detailNote: Note | null =
    notes.find((note) => note.id === detailId) ?? null;

  // Hatırlatmaya dokunuldu: not yüklendiğinde aç. Bu arada ot basmışsa
  // detay yerine ipucu gösterilir — kartın kuralıyla tutarlı kalır.
  useEffect(() => {
    if (pendingNoteId === null || loading) return;
    const target = notes.find((note) => note.id === pendingNoteId);
    setPendingNoteId(null);
    if (!target) return;
    if (resolveStage(target, Date.now()) === 'weedy') {
      setHint('Geç kaldın — bu tohumu otlar sardı. Yana kaydırıp temizle.');
      return;
    }
    setDetailId(target.id);
  }, [pendingNoteId, loading, notes]);

  const handleBlocked = useCallback(() => {
    setHint('Bu tohumu otlar sarmış. Açmadan önce yana kaydırıp temizle.');
  }, []);

  const handleTend = useCallback(
    (id: number) => {
      void tend(id);
      setHint('Otlar temizlendi, ürün yeniden büyüyor. 🌿');
    },
    [tend],
  );

  const handleHarvest = useCallback(
    (id: number) => {
      void harvest(id);
      setHint('Hasat kilere düştü. 🧺');
    },
    [harvest],
  );

  /** Geliştirme aracı: tarlayı bir gün yaşlandırıp simülasyonu zorla çalıştırır. */
  const handleAgeField = useCallback(async () => {
    await devAgeNotes(DAY);
    await runTimeSkip({ force: true });
    notifyChange();
    setHint('Zaman makinesi: tarla 1 gün yaşlandı. ⏩');
  }, [notifyChange]);

  const renderItem = useCallback(
    ({ item }: { item: Note }) => (
      <NoteCard
        note={item}
        now={now}
        size={tileSize}
        onOpen={setDetailId}
        onTend={handleTend}
        onHarvest={handleHarvest}
        onBlocked={handleBlocked}
      />
    ),
    [now, tileSize, handleTend, handleHarvest, handleBlocked],
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerTitleBlock}>
            <Text style={styles.title}>Tarla</Text>
            <Text style={styles.subtitle}>
              {notes.length > 0
                ? `${notes.length} tohum toprakta`
                : 'Toprak boş, ekime hazır'}
            </Text>
          </View>
          <PixelButton
            label="Tohum Ek"
            icon="🌱"
            onPress={() => setAdding(true)}
          />
        </View>

        <View style={styles.statRow}>
          <StatChip stage="planted" count={counts.planted} />
          <StatChip stage="growing" count={counts.growing} />
          <StatChip stage="harvestable" count={counts.harvestable} />
          <StatChip stage="weedy" count={counts.weedy} />
        </View>

        {timeSkip?.didRun ? (
          <Pressable style={styles.banner} onPress={dismissTimeSkip}>
            <Text style={styles.bannerTitle}>
              ⏳ {timeSkip.elapsedDays > 0
                ? `${timeSkip.elapsedDays} gün yoktun`
                : 'Bir süredir uğramamıştın'}
            </Text>
            <Text style={styles.bannerBody}>
              {timeSkip.grownNoteIds.length} ürün büyüdü ·{' '}
              {timeSkip.weededNoteIds.length} parseli ot bastı — dokun ve kapat
            </Text>
          </Pressable>
        ) : null}

        {__DEV__ ? (
          <Pressable onPress={handleAgeField} style={styles.devButton}>
            <Text style={styles.devText}>⏩ Zaman makinesi (+1 gün)</Text>
          </Pressable>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.leafLight} />
        </View>
      ) : (
        <FlatList
          key={columns}
          data={notes}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          numColumns={columns}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.column}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              emoji="🌱"
              title="Tarla bomboş"
              message="İlk görevini bir tohum olarak ek. Zamanla filizlenecek, ilgilenmezsen ot basacak."
            />
          }
        />
      )}

      <AddSeedSheet
        visible={adding}
        onClose={() => setAdding(false)}
        onPlant={plant}
      />

      <NoteDetailSheet
        note={detailNote}
        onClose={() => setDetailId(null)}
        onSave={save}
        onHarvest={harvest}
        onDelete={remove}
      />

      <HintToast message={hint} onHide={() => setHint(null)} />
    </SafeAreaView>
  );
}

function StatChip({ stage, count }: { stage: VisualStage; count: number }) {
  const visual = STAGE_VISUALS[stage];
  return (
    <View style={[styles.chip, { borderColor: visual.border }]}>
      <Text style={styles.chipText}>
        {visual.emoji} {count}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.soilDeep },
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
    gap: spacing.md,
  },
  headerTitleBlock: { flex: 1, gap: 2 },
  title: { ...typography.title, color: colors.textOnDark },
  subtitle: { ...typography.caption, color: colors.textOnDarkMuted },
  statRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  chip: {
    borderWidth: borders.width,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    backgroundColor: colors.soilDeep,
  },
  chipText: { ...typography.caption, color: colors.textOnDark },
  banner: {
    backgroundColor: colors.soil,
    borderWidth: borders.width,
    borderColor: colors.soilLight,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: 2,
  },
  bannerTitle: { ...typography.heading, color: colors.goldLight },
  bannerBody: { ...typography.caption, color: colors.textOnDarkMuted },
  devButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.soilLight,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  devText: { ...typography.caption, fontSize: 10, color: colors.textOnDarkMuted },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  grid: { padding: GRID_PADDING - spacing.xs, paddingBottom: spacing.xxl },
  column: { justifyContent: 'flex-start' },
});
