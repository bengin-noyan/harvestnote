/**
 * Tarla — ana ekran.
 *
 * Notlar alt alta bir liste değil, aralarında boşluk olan toprak
 * parsellerinden oluşan bir tarla ızgarası olarak gösterilir; sütun sayısı
 * ekran genişliğine göre 2-4 arasında değişir. Notların ardına her zaman boş parsel eklenir: ekim
 * başlıktaki bir butonla değil, boş toprağa dokunarak yapılır.
 *
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
import { EmptyPlot } from '../components/EmptyPlot';
import { HintToast } from '../components/HintToast';
import { NoteCard } from '../components/NoteCard';
import { NoteDetailSheet } from '../components/NoteDetailSheet';
import { devAgeNotes } from '../db/repositories/notes';
import { DAY } from '../game/config';
import { resolveStage, STAGE_VISUALS, type VisualStage } from '../game/stages';
import { runTimeSkip } from '../game/timeSkip';
import { useNotes } from '../hooks/useNotes';
import { useNow } from '../hooks/useNow';
import { useReminderTap } from '../hooks/useReminderTap';
import { useFarm } from '../providers/FarmProvider';
import { borders, colors, radii, spacing, typography } from '../theme';
import { STAGE_COLORS } from '../theme/stageColors';
import type { Note } from '../types';

const GRID_PADDING = spacing.md;
/**
 * Tarla telefon ölçeğinde tasarlandı: parselin hedef ve azami kenarı sabittir.
 * Sütun sayısı genişlikten türetilir, artan yer parselleri şişirmek yerine
 * ızgaranın iki yanında boşluk olarak kalır. Aksi halde geniş bir tarayıcıda
 * tek bir parsel yarım ekranı kaplıyordu.
 */
const TARGET_TILE = 150;
const MAX_TILE = 200;
const MIN_COLUMNS = 2;
const MAX_COLUMNS = 4;
/** Tarlanın sonunda kaç sıra boş toprak dursun — ekim buradan yapılıyor. */
const SPARE_ROWS = 1;

/**
 * Izgaranın bir hücresi. Boş parseller veriden değil düzenden gelir, o yüzden
 * nota değil hücreye bakan bir tip kullanıyoruz.
 */
type Cell =
  | { key: string; kind: 'note'; note: Note }
  | { key: string; kind: 'empty' };

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

  const { columns, tileSize, fieldWidth } = useMemo(() => {
    const usable = Math.max(TARGET_TILE, width - GRID_PADDING * 2);
    const cols = Math.min(
      MAX_COLUMNS,
      Math.max(MIN_COLUMNS, Math.floor(usable / TARGET_TILE)),
    );
    // Parseller arasındaki boşluk da genişlikten düşülmeli; yoksa son sütun
    // taşıyor. Kesirli kenar bırakmamak için aşağı yuvarlanıyor.
    const totalGapSpace = (cols - 1) * spacing.sm;
    const tile = Math.floor(Math.min((usable - totalGapSpace) / cols, MAX_TILE));
    return { columns: cols, tileSize: tile, fieldWidth: usable };
  }, [width]);

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

  /**
   * Notlar + boş parseller. Son sıra tamamlanır ve üstüne bir sıra daha
   * eklenir; böylece ekilecek boş toprak hiç bitmez.
   */
  const cells = useMemo(() => {
    const list: Cell[] = notes.map((note) => ({
      key: `note-${note.id}`,
      kind: 'note',
      note,
    }));
    const remainder = list.length % columns;
    const spare =
      (remainder === 0 ? 0 : columns - remainder) + SPARE_ROWS * columns;
    for (let i = 0; i < spare; i += 1) {
      list.push({ key: `empty-${i}`, kind: 'empty' });
    }
    return list;
  }, [notes, columns]);

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

  const handleAdd = useCallback(() => setAdding(true), []);

  const renderItem = useCallback(
    ({ item, index }: { item: Cell; index: number }) =>
      item.kind === 'note' ? (
        <NoteCard
          note={item.note}
          now={now}
          size={tileSize}
          onOpen={setDetailId}
          onTend={handleTend}
          onHarvest={handleHarvest}
          onBlocked={handleBlocked}
        />
      ) : (
        <EmptyPlot size={tileSize} index={index} onPress={handleAdd} />
      ),
    [now, tileSize, handleTend, handleHarvest, handleBlocked, handleAdd],
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <View style={[styles.headerInner, { maxWidth: fieldWidth }]}>
          <View style={styles.headerTitleBlock}>
            <Text style={styles.title}>Tarla</Text>
            <Text style={styles.subtitle}>
              {notes.length > 0
                ? `${notes.length} tohum toprakta`
                : 'Boş bir parsele dokun, ilk tohumu ek'}
            </Text>
          </View>

          <View style={styles.statRow}>
            <StatChip stage="planted" count={counts.planted} />
            <StatChip stage="growing" count={counts.growing} />
            <StatChip stage="harvestable" count={counts.harvestable} />
            <StatChip stage="weedy" count={counts.weedy} />
          </View>

          {timeSkip?.didRun ? (
            <Pressable
              onPress={dismissTimeSkip}
              style={({ pressed }) => [
                styles.banner,
                pressed ? styles.pressedSurface : null,
              ]}
            >
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
            <Pressable
              onPress={handleAgeField}
              style={({ pressed }) => [
                styles.devButton,
                pressed ? styles.pressedSurface : null,
              ]}
            >
              <Text style={styles.devText}>⏩ Zaman makinesi (+1 gün)</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.leafDeep} />
        </View>
      ) : (
        <FlatList
          key={columns}
          data={cells}
          keyExtractor={(item) => item.key}
          renderItem={renderItem}
          numColumns={columns}
          style={[styles.list, { maxWidth: fieldWidth }]}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.column}
          showsVerticalScrollIndicator={false}
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

/**
 * Aşama sayacı. Kağıt zeminde kenarlık değil, solundaki renk noktası
 * aşamayı söylüyor — dört çip yan yana dizildiğinde dört ayrı kutu yerine
 * tek bir satır gibi okunuyor.
 */
function StatChip({ stage, count }: { stage: VisualStage; count: number }) {
  const visual = STAGE_VISUALS[stage];
  return (
    <View style={styles.chip}>
      <View style={[styles.chipDot, { backgroundColor: STAGE_COLORS[stage].accent }]} />
      <Text style={styles.chipText}>
        {visual.emoji} {count}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ground },
  /**
   * Başlık şeridi kağıttan bir tık yukarıda: dolgu farkı değil, altındaki
   * saç teli çizgi ayırıyor. Kalın kenarlık artık yalnızca parsellerde.
   */
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: borders.hairline,
    borderBottomColor: colors.rule,
  },
  /** Zemin tam genişlikte kalır, içerik ızgarayla aynı hizaya oturur. */
  headerInner: { width: '100%', alignSelf: 'center', gap: spacing.md },
  headerTitleBlock: { flex: 1, gap: 2 },
  title: { ...typography.display, color: colors.textPrimary },
  subtitle: { ...typography.caption, color: colors.textMuted },
  statRow: { flexDirection: 'row', gap: spacing.lg, flexWrap: 'wrap' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipText: { ...typography.caption, color: colors.textSecondary },
  banner: {
    backgroundColor: colors.surfaceSunken,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: 2,
  },
  /** Dokunulabilir her yüzeyin basış karşılığı aynı: zemin koyulaşır. */
  pressedSurface: { backgroundColor: colors.rule },
  bannerTitle: { ...typography.heading, color: colors.textPrimary },
  bannerBody: { ...typography.caption, color: colors.textMuted },
  devButton: {
    alignSelf: 'flex-start',
    borderWidth: borders.width,
    borderStyle: 'dashed',
    borderColor: colors.ruleStrong,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  devText: {
    ...typography.caption,
    fontSize: 10,
    lineHeight: 14,
    color: colors.textMuted,
  },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { flex: 1, width: '100%', alignSelf: 'center' },
  /** Parseller ayrı kartlar: aralarındaki boşluk ızgarayı nefes aldırır. */
  grid: { paddingBottom: spacing.xxl, gap: spacing.sm },
  column: { justifyContent: 'flex-start', gap: spacing.sm },
});
