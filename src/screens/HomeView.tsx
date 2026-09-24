/**
 * Ana sayfa. Selam, dört sayaç, son düzenlenen notlar ve ilgi bekleyen notlar.
 *
 * Yeni bir sorgu yok, hepsi elimizdeki notlardan hesaplanıyor. "İlgi bekleyen"
 * otlu olan ya da 1 gün içinde otlanacak not demek.
 */
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { LivingPlant } from '../components/LivingPlant';
import { NoteRow } from '../components/NoteRow';
import { PixelButton } from '../components/PixelButton';
import { FadeIn, staggerDelay } from '../components/ui/FadeIn';
import { Icon, type IconName } from '../components/ui/Icon';
import { Callout, Page, Section } from '../components/ui/Page';
import type { TodoCount } from '../db/repositories/blocks';
import { DAY, SEED_CATALOG } from '../game/config';
import { maturityProgress, msUntilWeedy, resolveStage } from '../game/stages';
import { useHover } from '../hooks/useHover';
import type { WorkspaceView } from '../navigation/views';
import { radii, spacing, typography } from '../theme';
import { makeStyles, useTheme } from '../theme/ThemeProvider';
import type { Note } from '../types';
import { formatDuration, formatRelative } from '../utils/format';

interface Props {
  notes: Note[];
  labor: Map<number, TodoCount>;
  now: number;
  inventoryCount: number;
  onOpen: (id: number) => void;
  onTend: (id: number) => void;
  onHarvest: (id: number) => void;
  onAdd: () => void;
  onSelectView: (view: WorkspaceView) => void;
}

function greeting(now: number): string {
  const hour = new Date(now).getHours();
  if (hour >= 5 && hour < 12) return 'Günaydın';
  if (hour >= 12 && hour < 18) return 'İyi günler';
  if (hour >= 18 && hour < 23) return 'İyi akşamlar';
  return 'İyi geceler';
}

export function HomeView({
  notes,
  labor,
  now,
  inventoryCount,
  onOpen,
  onTend,
  onHarvest,
  onAdd,
  onSelectView,
}: Props) {
  const styles = useStyles();

  const withStage = notes.map((note) => ({
    note,
    stage: resolveStage(note, now, undefined, labor.get(note.id)),
  }));
  const ripe = withStage.filter((entry) => entry.stage === 'harvestable');
  const weedy = withStage.filter((entry) => entry.stage === 'weedy');
  const soon = withStage
    .filter((entry) => entry.stage !== 'weedy' && msUntilWeedy(entry.note, now) < DAY)
    .sort((a, b) => msUntilWeedy(a.note, now) - msUntilWeedy(b.note, now));
  const recent = [...notes]
    .sort((a, b) => b.last_tended_at - a.last_tended_at)
    .slice(0, 8);

  const date = new Date(now).toLocaleDateString('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <Page title={greeting(now)} description={date}>
      <FadeIn delay={40}>
        <View style={styles.stats}>
          <StatTile
            icon="layers"
            label="Toprakta"
            value={notes.length}
            onPress={() => onSelectView('farm')}
          />
          <StatTile
            icon="sun"
            label="Hasada hazır"
            value={ripe.length}
            onPress={() => onSelectView('board')}
          />
          <StatTile
            icon="alert-triangle"
            label="İlgi bekleyen"
            value={weedy.length + soon.length}
            onPress={() => onSelectView('upcoming')}
            warn={weedy.length > 0}
          />
          <StatTile
            icon="archive"
            label="Kilerde"
            value={inventoryCount}
            onPress={() => onSelectView('inventory')}
          />
        </View>
      </FadeIn>

      {notes.length === 0 ? (
        <FadeIn delay={80} style={styles.welcome}>
          <Callout icon="🌱">
            <Text style={styles.welcomeTitle}>Tarlan boş</Text>
            <Text style={styles.welcomeText}>
              Her not toprağa atılmış bir tohum. Yazdıkça ve içindeki işleri
              bitirdikçe büyüyor, ilgilenmezsen ot basıyor. Olgunlaşınca hasat
              edip kilere koyuyorsun.
            </Text>
            <View style={styles.welcomeActions}>
              <PixelButton label="İlk tohumu ek" onPress={onAdd} />
              <PixelButton
                label="Rehberi oku"
                tone="ghost"
                onPress={() => onSelectView('guide')}
              />
            </View>
          </Callout>
        </FadeIn>
      ) : (
        <>
          <Section title="Son düzenlenenler" icon="clock">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recentRow}
            >
              {recent.map((note, index) => (
                <FadeIn key={note.id} delay={staggerDelay(index)}>
                  <RecentCard
                    note={note}
                    labor={labor.get(note.id)}
                    now={now}
                    onOpen={onOpen}
                    onTend={onTend}
                  />
                </FadeIn>
              ))}
            </ScrollView>
          </Section>

          {ripe.length > 0 ? (
            <Section
              title="Hasada hazır"
              icon="sun"
              action="Panoda gör"
              onAction={() => onSelectView('board')}
            >
              {ripe.map(({ note }) => (
                <NoteRow
                  key={note.id}
                  note={note}
                  labor={labor.get(note.id)}
                  now={now}
                  onOpen={onOpen}
                  onTend={onTend}
                  showStage={false}
                  meta={`${formatRelative(note.created_at, now)} ekildi`}
                  action={{ label: 'Hasat et', onPress: () => onHarvest(note.id) }}
                />
              ))}
            </Section>
          ) : null}

          {weedy.length + soon.length > 0 ? (
            <Section
              title="İlgi bekleyenler"
              icon="alert-triangle"
              action="Tümü"
              onAction={() => onSelectView('upcoming')}
            >
              {weedy.map(({ note }) => (
                <NoteRow
                  key={note.id}
                  note={note}
                  labor={labor.get(note.id)}
                  now={now}
                  onOpen={onOpen}
                  onTend={onTend}
                  action={{ label: 'Temizle', onPress: () => onTend(note.id) }}
                />
              ))}
              {soon.map(({ note }) => (
                <NoteRow
                  key={note.id}
                  note={note}
                  labor={labor.get(note.id)}
                  now={now}
                  onOpen={onOpen}
                  onTend={onTend}
                  meta={`${formatDuration(msUntilWeedy(note, now))} sonra ot basar`}
                />
              ))}
            </Section>
          ) : (
            <Section title="İlgi bekleyenler" icon="check-circle">
              <Text style={styles.allGood}>
                Her şey yolunda. Bir gün içinde ot basacak not yok.
              </Text>
            </Section>
          )}
        </>
      )}
    </Page>
  );
}

function StatTile({
  icon,
  label,
  value,
  onPress,
  warn = false,
}: {
  icon: IconName;
  label: string;
  value: number;
  onPress: () => void;
  warn?: boolean;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { hovered, bind } = useHover();
  return (
    <Pressable
      onPress={onPress}
      {...bind}
      style={[styles.tile, hovered ? styles.tileHover : null]}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
    >
      <View style={styles.tileHead}>
        <Icon name={icon} size={14} color={warn ? colors.danger : colors.textMuted} />
        <Text style={styles.tileLabel}>{label}</Text>
      </View>
      <Text style={[styles.tileValue, warn ? { color: colors.danger } : null]}>
        {value}
      </Text>
    </Pressable>
  );
}

function RecentCard({
  note,
  labor,
  now,
  onOpen,
  onTend,
}: {
  note: Note;
  labor?: TodoCount;
  now: number;
  onOpen: (id: number) => void;
  onTend: (id: number) => void;
}) {
  const styles = useStyles();
  const { stages } = useTheme();
  const { hovered, bind } = useHover();
  const stage = resolveStage(note, now, undefined, labor);
  const progress = maturityProgress(note, now, undefined, labor);
  return (
    <Pressable
      onPress={() => (stage === 'weedy' ? onTend(note.id) : onOpen(note.id))}
      {...bind}
      style={[styles.recent, hovered ? styles.recentHover : null]}
      accessibilityRole="button"
      accessibilityLabel={note.title}
    >
      <View style={[styles.recentCover, { backgroundColor: stages[stage].cover }]}>
        <LivingPlant stage={stage} progress={progress} height={52} seed={note.seed_type} />
        <Text style={styles.recentEmoji}>{SEED_CATALOG[note.seed_type]?.emoji}</Text>
      </View>
      <View style={styles.recentBody}>
        <Text style={styles.recentTitle} numberOfLines={2}>
          {note.title}
        </Text>
        <Text style={styles.recentMeta}>{formatRelative(note.last_tended_at, now)}</Text>
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles(({ colors, elevation }) => ({
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
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
  tileHover: { backgroundColor: colors.hover },
  tileHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tileLabel: { ...typography.caption, color: colors.textMuted },
  tileValue: { ...typography.display, color: colors.textPrimary },
  welcome: { marginTop: spacing.xl },
  welcomeTitle: { ...typography.heading, color: colors.textPrimary },
  welcomeText: { ...typography.body, color: colors.textSecondary },
  welcomeActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  recentRow: { gap: spacing.md, paddingBottom: spacing.xs, paddingRight: spacing.md },
  recent: {
    width: 150,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.rule,
    backgroundColor: colors.card,
    overflow: 'hidden',
    ...elevation.card,
  },
  recentHover: { borderColor: colors.ruleStrong },
  recentCover: {
    height: 72,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  recentEmoji: { position: 'absolute', top: 6, left: 8, fontSize: 13 },
  recentBody: { padding: spacing.sm + 2, gap: 2, minHeight: 64 },
  recentTitle: { ...typography.ui, fontSize: 13, lineHeight: 18, color: colors.textPrimary },
  recentMeta: { ...typography.caption, color: colors.textMuted },
  allGood: { ...typography.body, color: colors.textMuted, paddingHorizontal: spacing.sm },
}));
