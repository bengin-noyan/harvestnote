/**
 * Tarla görünümü. Toprak parsellerinden oluşan ızgara.
 *
 * Artık ayrı bir ekran değil, kabuğun içindeki görünümlerden biri. Veriyi,
 * panelleri ve ipucu balonunu AppShell yönetiyor, burada sadece düzen ve
 * jestler var. Kendi useNotes() çağrısı yok, yoksa aynı sorgu kenar çubuğuyla
 * birlikte iki kere koşuyor.
 *
 * Notların ardına hep boş parsel ekleniyor. Ekim başlıktaki bir butonla değil,
 * boş toprağa dokunarak yapılıyor.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyPlot } from '../components/EmptyPlot';
import { NoteCard } from '../components/NoteCard';
import { devAgeNotes } from '../db/repositories/notes';
import { DAY } from '../game/config';
import { resolveStage, STAGE_VISUALS, type VisualStage } from '../game/stages';
import { runTimeSkip } from '../game/timeSkip';
import { useFarm } from '../providers/FarmProvider';
import { borders, colors, radii, spacing, typography } from '../theme';
import { STAGE_COLORS } from '../theme/stageColors';
import type { TodoCount } from '../db/repositories/blocks';
import type { Note } from '../types';

const GRID_PADDING = spacing.md;
/**
 * Tarlayı telefon ölçüsüne göre tasarladım, parselin hedef ve en büyük kenarı
 * sabit. Sütun sayısını genişlikten hesaplıyoruz, artan yer parselleri şişirmek
 * yerine ızgaranın iki yanında boşluk olarak kalıyor. Yoksa geniş tarayıcıda
 * tek parsel yarım ekranı kaplıyordu.
 */
const TARGET_TILE = 150;
const MAX_TILE = 200;
const MIN_COLUMNS = 2;
const MAX_COLUMNS = 5;
/** Tarlanın sonunda kaç sıra boş toprak kalsın. Ekim buradan yapılıyor. */
const SPARE_ROWS = 1;

/**
 * Izgaranın bir hücresi. Boş parseller veriden değil düzenden geldiği için
 * nota değil hücreye bakan bir tip kullanıyoruz.
 */
type Cell =
  | { key: string; kind: 'note'; note: Note }
  | { key: string; kind: 'empty' };

interface Props {
  notes: Note[];
  labor: Map<number, TodoCount>;
  now: number;
  onOpen: (id: number) => void;
  onTend: (id: number) => void;
  onHarvest: (id: number) => void;
  onBlocked: () => void;
  onAdd: () => void;
}

export function FarmView({
  notes,
  labor,
  now,
  onOpen,
  onTend,
  onHarvest,
  onBlocked,
  onAdd,
}: Props) {
  const { timeSkip, dismissTimeSkip, notifyScheduleChanged } = useFarm();
  /**
   * Izgara pencereyi değil kendi kabının genişliğini ölçüyor. Kenar çubuğu
   * açıkken tarlaya pencereden ~270px dar bir alan kalıyor ve
   * useWindowDimensions ile hesaplanan sütun sayısı son parseli ekran dışına
   * taşırıyordu.
   */
  const [width, setWidth] = useState(0);

  const { columns, tileSize, fieldWidth } = useMemo(() => {
    const usable = Math.max(TARGET_TILE, width - GRID_PADDING * 2);
    const cols = Math.min(
      MAX_COLUMNS,
      Math.max(MIN_COLUMNS, Math.floor(usable / TARGET_TILE)),
    );
    // Parseller arasındaki boşluğu da düşmek lazım, yoksa son sütun taşıyor.
    // Kesirli kenar kalmasın diye aşağı yuvarlıyoruz.
    const totalGapSpace = (cols - 1) * spacing.sm;
    const tile = Math.floor(Math.min((usable - totalGapSpace) / cols, MAX_TILE));
    return { columns: cols, tileSize: tile, fieldWidth: usable };
  }, [width]);

  /** Sayaçlar DB'deki status'tan değil, hesaplanan aşamadan geliyor. */
  const counts = useMemo(() => {
    const base: Record<VisualStage, number> = {
      planted: 0,
      growing: 0,
      harvestable: 0,
      weedy: 0,
    };
    for (const note of notes) {
      base[resolveStage(note, now, undefined, labor.get(note.id))] += 1;
    }
    return base;
  }, [notes, now, labor]);

  /**
   * Notlar + boş parseller. Son sırayı tamamlayıp üstüne bir sıra daha
   * ekliyoruz ki ekilecek boş toprak hiç bitmesin.
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

  /** Dev aracı: tarlayı bir gün yaşlandırıp simülasyonu zorla çalıştırıyor. */
  const handleAgeField = useCallback(async () => {
    await devAgeNotes(DAY);
    await runTimeSkip({ force: true });
    notifyScheduleChanged();
  }, [notifyScheduleChanged]);

  const renderItem = useCallback(
    ({ item, index }: { item: Cell; index: number }) =>
      item.kind === 'note' ? (
        <NoteCard
          note={item.note}
          labor={labor.get(item.note.id)}
          now={now}
          size={tileSize}
          onOpen={onOpen}
          onTend={onTend}
          onHarvest={onHarvest}
          onBlocked={onBlocked}
        />
      ) : (
        <EmptyPlot size={tileSize} index={index} onPress={onAdd} />
      ),
    [now, labor, tileSize, onOpen, onTend, onHarvest, onBlocked, onAdd],
  );

  // Ölçüm gelmeden çizersek bir kare yanlış sütun sayısıyla çiziyoruz.
  if (width === 0) {
    return (
      <View
        style={styles.root}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      />
    );
  }

  return (
    <View
      style={styles.root}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    >
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
    </View>
  );
}

/**
 * Aşama sayacı. Kenarlık yerine solundaki renk noktası aşamayı söylüyor.
 * Dört çip yan yana gelince dört ayrı kutu yerine tek satır gibi duruyor.
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
  // Başlık şeridini altındaki ince çizgi ayırıyor, dolgu farkı değil.
  // Kalın kenarlık artık sadece parsellerde.
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: borders.hairline,
    borderBottomColor: colors.rule,
  },
  /** Zemin tam genişlikte kalıyor, içerik ızgarayla aynı hizaya oturuyor. */
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
  /** Basılabilir her yüzeyde aynı geri bildirim: zemin koyulaşıyor. */
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
  list: { flex: 1, width: '100%', alignSelf: 'center' },
  /** Parseller ayrı kartlar, aradaki boşluk ızgarayı ferahlatıyor. */
  grid: { paddingBottom: spacing.xxl, gap: spacing.sm },
  column: { justifyContent: 'flex-start', gap: spacing.sm },
});
