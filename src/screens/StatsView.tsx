/**
 * İstatistikler sayfası. Tarla ve kiler verisinden birkaç sayı ve grafik.
 *
 * Grafiklerin hepsi tek renk. Aşama renklerini kullanmayı denedim ama renk
 * körlüğü testinde kahverengi ile yeşil birbirine çok yakın çıktı. O yüzden
 * her çubuğun yanına yazıyla etiket koydum.
 */
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { QUALITY_META } from '../components/InventoryCard';
import { FadeIn } from '../components/ui/FadeIn';
import { Icon, type IconName } from '../components/ui/Icon';
import { Page, Section } from '../components/ui/Page';
import { Tag } from '../components/ui/Tag';
import type { TodoCount } from '../db/repositories/blocks';
import { DAY, SEED_CATALOG } from '../game/config';
import { resolveStage, STAGE_VISUALS, type VisualStage } from '../game/stages';
import type { UseInventoryResult } from '../hooks/useInventory';
import { radii, spacing, typography } from '../theme';
import { makeStyles, useTheme } from '../theme/ThemeProvider';
import { HARVEST_QUALITIES, SEED_TYPES, type Note } from '../types';

const DAYS = 14;
const CHART_HEIGHT = 120;
const STAGES: VisualStage[] = ['planted', 'growing', 'harvestable', 'weedy'];

interface Props {
  notes: Note[];
  labor: Map<number, TodoCount>;
  now: number;
  inventory: UseInventoryResult;
}

export function StatsView({ notes, labor, now, inventory }: Props) {
  const styles = useStyles();
  const { stages } = useTheme();
  const { items, totalValue } = inventory;

  const golden = items.filter((item) => item.quality === 'golden').length;
  const goldenRate = items.length > 0 ? Math.round((golden / items.length) * 100) : 0;

  // Son 14 günün hasat sayısı, en eski gün solda.
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const days = Array.from({ length: DAYS }, (_, i) => {
    const start = startOfToday.getTime() - (DAYS - 1 - i) * DAY;
    return {
      start,
      count: items.filter((item) => item.harvested_at >= start && item.harvested_at < start + DAY)
        .length,
    };
  });

  const stageCounts = STAGES.map((stage) => ({
    stage,
    count: notes.filter((note) => resolveStage(note, now, undefined, labor.get(note.id)) === stage)
      .length,
  }));

  const seedCounts = SEED_TYPES.map((seed) => ({
    seed,
    count:
      notes.filter((note) => note.seed_type === seed).length +
      items.filter((item) => item.seed_type === seed).length,
  })).filter((entry) => entry.count > 0);

  const qualityCounts = HARVEST_QUALITIES.map((quality) => ({
    quality,
    count: items.filter((item) => item.quality === quality).length,
  }));

  return (
    <Page icon="bar-chart-2" title="İstatistikler" description="Tarlanın ve kilerin özeti.">
      <FadeIn>
        <View style={styles.tiles}>
          <Tile icon="layers" label="Toprakta" value={String(notes.length)} />
          <Tile icon="archive" label="Toplam hasat" value={String(items.length)} />
          <Tile icon="award" label="Toplam puan" value={String(totalValue)} />
          <Tile icon="star" label="Altın oranı" value={`%${goldenRate}`} />
        </View>
      </FadeIn>

      <Section title={`Son ${DAYS} gün hasat`} icon="calendar">
        <DailyChart days={days} />
      </Section>

      <Section title="Aşamalara göre" icon="layers">
        <BarList
          rows={stageCounts.map(({ stage, count }) => ({
            key: stage,
            label: <Tag label={STAGE_VISUALS[stage].label} color={stages[stage].tag} />,
            count,
          }))}
        />
      </Section>

      <Section title="Tohum türüne göre (toprakta + hasat)" icon="grid">
        {seedCounts.length === 0 ? (
          <Text style={styles.empty}>Henüz veri yok.</Text>
        ) : (
          <BarList
            rows={seedCounts.map(({ seed, count }) => ({
              key: seed,
              label: (
                <Text style={styles.rowLabel}>
                  {SEED_CATALOG[seed].emoji} {SEED_CATALOG[seed].label}
                </Text>
              ),
              count,
            }))}
          />
        )}
      </Section>

      <Section title="Hasat kalitesi" icon="award">
        <BarList
          rows={qualityCounts.map(({ quality, count }) => ({
            key: quality,
            label: <Tag label={QUALITY_META[quality].label} color={QUALITY_META[quality].tag} />,
            count,
          }))}
        />
      </Section>
    </Page>
  );
}

function Tile({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  const styles = useStyles();
  return (
    <View style={styles.tile}>
      <View style={styles.tileHead}>
        <Icon name={icon} size={14} />
        <Text style={styles.tileLabel}>{label}</Text>
      </View>
      <Text style={styles.tileValue}>{value}</Text>
    </View>
  );
}

// Yatay çubuk listesi. Solda etiket, ortada çubuk, sağda sayı.
function BarList({
  rows,
}: {
  rows: { key: string; label: React.ReactNode; count: number }[];
}) {
  const styles = useStyles();
  const max = Math.max(1, ...rows.map((row) => row.count));
  return (
    <View style={styles.barList}>
      {rows.map((row) => (
        <View key={row.key} style={styles.barRow}>
          <View style={styles.barLabel}>{row.label}</View>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { flex: row.count / max }]} />
            <View style={{ flex: 1 - row.count / max }} />
          </View>
          <Text style={styles.barCount}>{row.count}</Text>
        </View>
      ))}
    </View>
  );
}

// Günlük hasat grafiği. Sayı sadece en yüksek günün üstünde yazıyor,
// diğer günler üstüne gelince ya da dokununca yukarıda görünüyor.
function DailyChart({ days }: { days: { start: number; count: number }[] }) {
  const styles = useStyles();
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...days.map((day) => day.count));
  const peak = days.reduce((best, day, i) => (day.count > (days[best]?.count ?? 0) ? i : best), 0);
  const total = days.reduce((sum, day) => sum + day.count, 0);
  const shown = active !== null ? days[active] : undefined;

  const label = (ms: number) =>
    new Date(ms).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });

  return (
    <View>
      <Text style={styles.chartReadout}>
        {shown
          ? `${label(shown.start)}: ${shown.count} hasat`
          : `Toplam ${total} hasat`}
      </Text>
      <View style={styles.chart}>
        {days.map((day, i) => {
          const height = day.count === 0 ? 2 : Math.max(6, (day.count / max) * CHART_HEIGHT);
          return (
            <Pressable
              key={day.start}
              style={styles.chartSlot}
              onHoverIn={() => setActive(i)}
              onHoverOut={() => setActive(null)}
              onPress={() => setActive(active === i ? null : i)}
              accessibilityLabel={`${label(day.start)}: ${day.count} hasat`}
            >
              {i === peak && day.count > 0 ? (
                <Text style={styles.peakLabel}>{day.count}</Text>
              ) : null}
              <View
                style={[
                  styles.chartBar,
                  { height },
                  day.count === 0 ? styles.chartBarEmpty : null,
                  active === i ? styles.chartBarActive : null,
                ]}
              />
            </Pressable>
          );
        })}
      </View>
      <View style={styles.axis}>
        <Text style={styles.axisLabel}>{label(days[0]?.start ?? 0)}</Text>
        <Text style={styles.axisLabel}>Bugün</Text>
      </View>
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: {
    flexGrow: 1,
    flexBasis: 150,
    borderWidth: 1,
    borderColor: colors.rule,
    borderRadius: radii.sm,
    padding: spacing.md,
    gap: spacing.xs,
    backgroundColor: colors.card,
  },
  tileHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tileLabel: { ...typography.caption, color: colors.textMuted },
  tileValue: { ...typography.display, color: colors.textPrimary },
  empty: { ...typography.body, color: colors.textMuted },
  barList: { gap: spacing.sm },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  barLabel: { width: 130 },
  rowLabel: { ...typography.body, color: colors.textPrimary },
  barTrack: {
    flex: 1,
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceSunken,
    overflow: 'hidden',
  },
  barFill: { backgroundColor: colors.accent, borderRadius: 4 },
  barCount: {
    ...typography.body,
    color: colors.textSecondary,
    width: 28,
    textAlign: 'right',
  },
  chartReadout: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.sm },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: CHART_HEIGHT + 20,
    gap: 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.rule,
  },
  chartSlot: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
  chartBar: {
    width: '70%',
    maxWidth: 28,
    backgroundColor: colors.accent,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  chartBarEmpty: { backgroundColor: colors.rule },
  chartBarActive: { backgroundColor: colors.accentPressed },
  peakLabel: { ...typography.caption, color: colors.textSecondary, marginBottom: 2 },
  axis: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: spacing.xs },
  axisLabel: { ...typography.caption, color: colors.textMuted },
}));
