/**
 * Tarla görünümü. Toprak parsellerinden oluşan ızgara.
 *
 * Artık ayrı bir ekran değil, kabuğun içindeki görünümlerden biri. Veriyi,
 * panelleri ve ipucu balonunu AppShell yönetiyor, burada sadece düzen ve
 * jestler var. Kendi useNotes() çağrısı yok, yoksa aynı sorgu kenar çubuğuyla
 * birlikte iki kere koşuyor.
 *
 * En sonda hep bir "Yeni tohum" kartı var.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyPlot } from '../components/EmptyPlot';
import { NoteCard } from '../components/NoteCard';
import { DatabaseHeader, type ViewTab } from '../components/ui/DatabaseHeader';
import { Tag } from '../components/ui/Tag';
import { devAgeNotes } from '../db/repositories/notes';
import { DAY } from '../game/config';
import { resolveStage, STAGE_VISUALS, type VisualStage } from '../game/stages';
import { runTimeSkip } from '../game/timeSkip';
import { useFarm } from '../providers/FarmProvider';
import { borders, radii, spacing, typography } from '../theme';
import type { TodoCount } from '../db/repositories/blocks';
import type { FieldTab } from '../navigation/views';
import type { Note } from '../types';
import { makeStyles, useTheme } from '../theme/ThemeProvider';

// Tarla sayfasındaki sekmeler
export const FIELD_TABS: ViewTab<FieldTab>[] = [
  { key: 'farm', icon: 'grid', label: 'Galeri' },
  { key: 'list', icon: 'list', label: 'Tablo' },
  { key: 'board', icon: 'columns', label: 'Pano' },
];

const GRID_PADDING = spacing.xl;
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

// Izgaradaki bir hücre. Ya bir not ya da sondaki yeni tohum kartı.
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
  onSelectTab: (tab: FieldTab) => void;
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
  onSelectTab,
}: Props) {
  const styles = useStyles();
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

  const cells = useMemo(() => {
    const list: Cell[] = notes.map((note) => ({
      key: `note-${note.id}`,
      kind: 'note',
      note,
    }));
    list.push({ key: 'new', kind: 'empty' });
    return list;
  }, [notes]);

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
        <EmptyPlot size={tileSize} onPress={onAdd} />
      ),
    [now, labor, tileSize, onOpen, onTend, onHarvest, onBlocked, onAdd],
  );

  // Başlığı da listenin içine koydum ki kartlarla birlikte kaysın.
  const header = (
    <View style={styles.header}>
      <DatabaseHeader
        icon="🌾"
        title="Tarla"
        description={
          notes.length > 0
            ? `${notes.length} tohum toprakta`
            : 'Boş bir parsele dokun, ilk tohumu ek'
        }
        tabs={FIELD_TABS}
        activeTab="farm"
        onSelectTab={onSelectTab}
        onNew={onAdd}
      >
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
            <Text style={styles.bannerIcon}>⏳</Text>
            <View style={styles.bannerBody}>
              <Text style={styles.bannerTitle}>
                {timeSkip.elapsedDays > 0
                  ? `${timeSkip.elapsedDays} gün yoktun`
                  : 'Bir süredir uğramamıştın'}
              </Text>
              <Text style={styles.bannerText}>
                {timeSkip.grownNoteIds.length} ürün büyüdü ·{' '}
                {timeSkip.weededNoteIds.length} parseli ot bastı. Kapatmak için dokun.
              </Text>
            </View>
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
      </DatabaseHeader>
    </View>
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
        ListHeaderComponent={header}
      />
    </View>
  );
}

/**
 * Aşama sayacı. Kenarlık yerine solundaki renk noktası aşamayı söylüyor.
 * Dört çip yan yana gelince dört ayrı kutu yerine tek satır gibi duruyor.
 */
function StatChip({ stage, count }: { stage: VisualStage; count: number }) {
  const { stages } = useTheme();
  const visual = STAGE_VISUALS[stage];
  return (
    <Tag
      label={`${visual.label} ${count}`}
      color={stages[stage].tag}
    />
  );
}

const useStyles = makeStyles(({ colors }) => ({
  root: { flex: 1, backgroundColor: colors.ground },
  header: { paddingBottom: spacing.lg },
  statRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
    marginTop: spacing.md,
  },
  // gri kutu, solda simge
  banner: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.surfaceSunken,
    borderRadius: radii.xs,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  bannerIcon: { fontSize: 18, lineHeight: 22 },
  bannerBody: { flex: 1, gap: 2 },
  /** Basılabilir her yüzeyde aynı geri bildirim: zemin koyulaşıyor. */
  pressedSurface: { backgroundColor: colors.hover },
  bannerTitle: { ...typography.ui, color: colors.textPrimary },
  bannerText: { ...typography.body, color: colors.textSecondary },
  devButton: {
    alignSelf: 'flex-start',
    borderWidth: borders.width,
    borderStyle: 'dashed',
    borderColor: colors.ruleStrong,
    borderRadius: radii.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginTop: spacing.md,
  },
  devText: { ...typography.caption, color: colors.textMuted },
  list: { flex: 1, width: '100%', alignSelf: 'center' },
  /** Parseller ayrı kartlar, aradaki boşluk ızgarayı ferahlatıyor. */
  grid: { paddingBottom: spacing.xxl, gap: spacing.sm },
  column: { justifyContent: 'flex-start', gap: spacing.sm },
}));
