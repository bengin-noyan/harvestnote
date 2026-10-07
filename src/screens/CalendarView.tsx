/**
 * Takvim görünümü. Son tarihi olan notlar ay takviminde kendi günlerinde.
 *
 * Geniş ekranda gün kutularında notların adı yazıyor. Dar ekranda kutuya ad
 * sığmıyordu, orada sadece nokta var. Güne basınca o günün notları takvimin
 * altında liste olarak çıkıyor, iki ekranda da aynı.
 *
 * Son tarihi olmayan notlar takvimde görünmüyor, altta kaç tane olduğunu
 * yazıyoruz.
 */
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';

import { NoteRow } from '../components/NoteRow';
import { DatabaseHeader } from '../components/ui/DatabaseHeader';
import { Icon } from '../components/ui/Icon';
import type { TodoCount } from '../db/repositories/blocks';
import { SEED_CATALOG } from '../game/config';
import { resolveStage } from '../game/stages';
import { useHover } from '../hooks/useHover';
import type { FieldTab } from '../navigation/views';
import { borders, radii, spacing, typography } from '../theme';
import { makeStyles, useTheme } from '../theme/ThemeProvider';
import type { Note } from '../types';
import { formatDate, startOfDay } from '../utils/format';
import { FIELD_TABS } from './FarmView';

const WEEKDAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
// bundan dar ekranda kutulara ad yazmıyoruz
const NARROW = 700;
// bir günde en fazla bu kadar ad, fazlası "+2" oluyor
const MAX_PILLS = 3;

interface Props {
  notes: Note[];
  labor: Map<number, TodoCount>;
  now: number;
  onOpen: (id: number) => void;
  onTend: (id: number) => void;
  onAdd: () => void;
  onSelectTab: (tab: FieldTab) => void;
}

export function CalendarView({ notes, labor, now, onOpen, onTend, onAdd, onSelectTab }: Props) {
  const styles = useStyles();
  const { width } = useWindowDimensions();
  const narrow = width < NARROW;
  const today = startOfDay(now);
  const [month, setMonth] = useState(() => firstOfMonth(today));
  const [selected, setSelected] = useState(today);

  // gün başı -> o günün notları
  const byDay = useMemo(() => {
    const map = new Map<number, Note[]>();
    for (const note of notes) {
      if (note.due_at === null) continue;
      const day = startOfDay(note.due_at);
      const list = map.get(day);
      if (list) list.push(note);
      else map.set(day, [note]);
    }
    return map;
  }, [notes]);

  const undated = notes.filter((note) => note.due_at === null).length;
  const selectedNotes = byDay.get(selected) ?? [];

  const goToday = () => {
    setMonth(firstOfMonth(today));
    setSelected(today);
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.column}>
        <DatabaseHeader
          icon="🌾"
          title="Tarla"
          description="Son tarihi olan notlar takvimde. Tarihi not sayfasındaki Son tarih satırından verebilirsin."
          tabs={FIELD_TABS}
          activeTab="calendar"
          onSelectTab={onSelectTab}
          onNew={onAdd}
        />

        <View style={styles.toolbar}>
          <Text style={styles.monthLabel}>
            {new Date(month).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
          </Text>
          <View style={styles.toolbarButtons}>
            <ToolButton icon="chevron-left" label="Önceki ay" onPress={() => setMonth(shiftMonth(month, -1))} />
            <ToolButton label="Bugün" onPress={goToday} />
            <ToolButton icon="chevron-right" label="Sonraki ay" onPress={() => setMonth(shiftMonth(month, 1))} />
          </View>
        </View>

        <View style={styles.grid}>
          <View style={styles.week}>
            {WEEKDAYS.map((day) => (
              <Text key={day} style={styles.weekday}>
                {narrow ? day.slice(0, 1) : day}
              </Text>
            ))}
          </View>
          {monthWeeks(month).map((week) => (
            <View key={week[0]} style={styles.week}>
              {week.map((day) => (
                <DayCell
                  key={day}
                  day={day}
                  inMonth={new Date(day).getMonth() === new Date(month).getMonth()}
                  today={day === today}
                  selected={day === selected}
                  notes={byDay.get(day) ?? []}
                  narrow={narrow}
                  labor={labor}
                  now={now}
                  onSelect={() => setSelected(day)}
                  onOpen={onOpen}
                />
              ))}
            </View>
          ))}
        </View>

        <View style={styles.dayList}>
          <Text style={styles.dayTitle}>{formatDate(selected)}</Text>
          {selectedNotes.length === 0 ? (
            <Text style={styles.muted}>Bu güne son tarihi olan not yok.</Text>
          ) : (
            selectedNotes.map((note) => (
              <NoteRow
                key={note.id}
                note={note}
                labor={labor.get(note.id)}
                now={now}
                onOpen={onOpen}
                onTend={onTend}
              />
            ))
          )}
          {undated > 0 ? (
            <Text style={[styles.muted, styles.undated]}>
              {undated} notun son tarihi yok, takvimde görünmüyor.
            </Text>
          ) : null}
        </View>
      </View>
    </ScrollView>
  );
}

function ToolButton({
  icon,
  label,
  onPress,
}: {
  icon?: 'chevron-left' | 'chevron-right';
  label: string;
  onPress: () => void;
}) {
  const styles = useStyles();
  const { hovered, bind } = useHover();
  return (
    <Pressable
      onPress={onPress}
      {...bind}
      style={[styles.toolButton, hovered ? styles.hover : null]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {icon ? <Icon name={icon} size={16} /> : <Text style={styles.toolText}>{label}</Text>}
    </Pressable>
  );
}

/**
 * Bir gün kutusu. Kutunun kendisi düğme değil. Geniş ekranda içinde not
 * düğmeleri var, Pressable içinde Pressable web'de button içinde button
 * oluyordu. Günü seçmek için gün numarasına basılıyor. Dar ekranda içinde not
 * düğmesi olmadığı için bütün kutu basılabiliyor.
 */
function DayCell({
  day,
  inMonth,
  today,
  selected,
  notes,
  narrow,
  labor,
  now,
  onSelect,
  onOpen,
}: {
  day: number;
  inMonth: boolean;
  today: boolean;
  selected: boolean;
  notes: Note[];
  narrow: boolean;
  labor: Map<number, TodoCount>;
  now: number;
  onSelect: () => void;
  onOpen: (id: number) => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { hovered, bind } = useHover();
  const date = new Date(day);
  const label = date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });

  const number = (
    <View style={[styles.dayNumber, today ? { backgroundColor: colors.danger } : null]}>
      <Text
        style={[
          styles.dayText,
          inMonth ? null : styles.outside,
          today ? { color: colors.onAccent } : null,
        ]}
      >
        {date.getDate()}
      </Text>
    </View>
  );

  const cellStyle = [
    styles.cell,
    narrow ? styles.cellNarrow : null,
    selected ? styles.cellSelected : null,
    hovered ? styles.hover : null,
  ];

  if (narrow) {
    return (
      <Pressable
        onPress={onSelect}
        {...bind}
        style={cellStyle}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${notes.length} not`}
        accessibilityState={{ selected }}
      >
        {number}
        <View style={styles.dots}>
          {notes.slice(0, MAX_PILLS).map((note) => (
            <View key={note.id} style={[styles.dot, { backgroundColor: colors.accent }]} />
          ))}
        </View>
      </Pressable>
    );
  }

  const extra = notes.length - MAX_PILLS;
  return (
    <View style={cellStyle}>
      <Pressable
        onPress={onSelect}
        {...bind}
        style={styles.numberButton}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${notes.length} not`}
        accessibilityState={{ selected }}
      >
        {number}
      </Pressable>
      {notes.slice(0, MAX_PILLS).map((note) => (
        <Pill key={note.id} note={note} labor={labor.get(note.id)} now={now} onOpen={onOpen} />
      ))}
      {extra > 0 ? (
        <Pressable onPress={onSelect} accessibilityRole="button" accessibilityLabel={`${extra} not daha`}>
          <Text style={styles.more}>+{extra} daha</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// Gün kutusundaki not. Basınca not açılıyor, otluysa AppShell uyarı veriyor.
function Pill({
  note,
  labor,
  now,
  onOpen,
}: {
  note: Note;
  labor?: TodoCount;
  now: number;
  onOpen: (id: number) => void;
}) {
  const styles = useStyles();
  const { stages } = useTheme();
  const { hovered, bind } = useHover();
  const stage = resolveStage(note, now, undefined, labor);
  return (
    <Pressable
      onPress={() => onOpen(note.id)}
      {...bind}
      style={[styles.pill, hovered ? styles.pillHover : null]}
      accessibilityRole="button"
      accessibilityLabel={note.title}
    >
      <View style={[styles.pillMark, { backgroundColor: stages[stage].accent }]} />
      <Text style={styles.pillText} numberOfLines={1}>
        {SEED_CATALOG[note.seed_type]?.emoji} {note.title}
      </Text>
    </Pressable>
  );
}

function firstOfMonth(ms: number): number {
  const date = new Date(ms);
  return new Date(date.getFullYear(), date.getMonth(), 1).getTime();
}

function shiftMonth(first: number, by: number): number {
  const date = new Date(first);
  return new Date(date.getFullYear(), date.getMonth() + by, 1).getTime();
}

// Ayı haftalara bölüyor. Haftalar pazartesi başlıyor, ilk ve son haftada
// komşu ayların günleri de var (soluk gösteriliyor).
function monthWeeks(first: number): number[][] {
  const start = new Date(first);
  const offset = (start.getDay() + 6) % 7; // getDay pazar=0 veriyor
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1 - offset);
  const weeks: number[][] = [];
  do {
    const week: number[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(cursor.getTime());
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  } while (cursor.getMonth() === start.getMonth());
  return weeks;
}

const useStyles = makeStyles(({ colors }) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl * 3 },
  column: { width: '100%', maxWidth: 1100, alignSelf: 'center' },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  monthLabel: { ...typography.section, color: colors.textPrimary, textTransform: 'capitalize' },
  toolbarButtons: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  toolButton: {
    borderRadius: radii.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  toolText: { ...typography.body, color: colors.textSecondary },
  hover: { backgroundColor: colors.hover },
  grid: {
    borderTopWidth: borders.hairline,
    borderLeftWidth: borders.hairline,
    borderColor: colors.rule,
  },
  week: { flexDirection: 'row' },
  weekday: {
    flex: 1,
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.xs,
    borderRightWidth: borders.hairline,
    borderBottomWidth: borders.hairline,
    borderColor: colors.rule,
  },
  cell: {
    flex: 1,
    minHeight: 104,
    padding: 4,
    gap: 2,
    borderRightWidth: borders.hairline,
    borderBottomWidth: borders.hairline,
    borderColor: colors.rule,
  },
  cellNarrow: { minHeight: 52, alignItems: 'center' },
  cellSelected: { backgroundColor: colors.accentSoft },
  numberButton: { alignSelf: 'flex-end' },
  dayNumber: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  dayText: { ...typography.caption, color: colors.textPrimary },
  outside: { color: colors.textMuted, opacity: 0.6 },
  dots: { flexDirection: 'row', gap: 3, marginTop: 2 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.card,
    borderWidth: borders.hairline,
    borderColor: colors.rule,
    borderRadius: radii.xs,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  pillHover: { backgroundColor: colors.hover },
  pillMark: { width: 3, alignSelf: 'stretch', borderRadius: 2 },
  pillText: { ...typography.caption, color: colors.textPrimary, flex: 1 },
  more: { ...typography.caption, color: colors.textMuted, paddingHorizontal: 4 },
  dayList: { paddingTop: spacing.lg, gap: 2 },
  dayTitle: { ...typography.heading, color: colors.textPrimary, marginBottom: spacing.xs },
  muted: { ...typography.body, color: colors.textMuted },
  undated: { marginTop: spacing.md },
}));
