// Son tarih seçici. Üstte hızlı seçenekler, altında küçük bir ay takvimi.
//
// Tarih seçici kütüphanesi eklemedim, web ve Android'de aynı görünsün diye
// takvimi View'larla çizdim. Modal değil, satır içi panel (BlockMenu ile aynı
// sebep: not sayfasında iç içe modal Android'de odağı bozuyor).
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useHover } from '../../hooks/useHover';
import { borders, radii, spacing, typography } from '../../theme';
import { makeStyles, useTheme } from '../../theme/ThemeProvider';
import { addDays, startOfDay } from '../../utils/format';
import { Icon } from '../ui/Icon';

const WEEKDAYS = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'];
const CELL = 34;

interface Props {
  value: number | null;
  onChange: (dueAt: number | null) => void;
}

export function DuePicker({ value, onChange }: Props) {
  const styles = useStyles();
  const today = startOfDay(Date.now());
  // takvimde gösterilen ayın ilk günü
  const [month, setMonth] = useState(() => firstOfMonth(value ?? today));

  const quick = [
    { label: 'Bugün', at: today },
    { label: 'Yarın', at: addDays(today, 1) },
    { label: 'Gelecek hafta', at: addDays(today, 7) },
  ];

  return (
    <View style={styles.panel}>
      <View style={styles.quickRow}>
        {quick.map((option) => (
          <Chip
            key={option.label}
            label={option.label}
            active={value === option.at}
            onPress={() => onChange(option.at)}
          />
        ))}
        {value !== null ? <Chip label="Kaldır" danger onPress={() => onChange(null)} /> : null}
      </View>

      <View style={styles.monthRow}>
        <Pressable
          onPress={() => setMonth(shiftMonth(month, -1))}
          style={styles.navButton}
          accessibilityRole="button"
          accessibilityLabel="Önceki ay"
        >
          <Icon name="chevron-left" size={16} />
        </Pressable>
        <Text style={styles.monthLabel}>
          {new Date(month).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
        </Text>
        <Pressable
          onPress={() => setMonth(shiftMonth(month, 1))}
          style={styles.navButton}
          accessibilityRole="button"
          accessibilityLabel="Sonraki ay"
        >
          <Icon name="chevron-right" size={16} />
        </Pressable>
      </View>

      <View style={styles.grid}>
        {WEEKDAYS.map((day) => (
          <Text key={day} style={[styles.cell, styles.weekday]}>
            {day}
          </Text>
        ))}
        {monthCells(month).map((day, index) =>
          day === null ? (
            <View key={`bos-${index}`} style={styles.cell} />
          ) : (
            <DayCell
              key={day}
              day={day}
              selected={value === day}
              today={day === today}
              onPress={() => onChange(day)}
            />
          ),
        )}
      </View>
    </View>
  );
}

function Chip({
  label,
  active = false,
  danger = false,
  onPress,
}: {
  label: string;
  active?: boolean;
  danger?: boolean;
  onPress: () => void;
}) {
  const styles = useStyles();
  const { hovered, bind } = useHover();
  return (
    <Pressable
      onPress={onPress}
      {...bind}
      style={[styles.chip, active ? styles.chipActive : null, hovered ? styles.hover : null]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={[styles.chipText, danger ? styles.danger : null]}>{label}</Text>
    </Pressable>
  );
}

function DayCell({
  day,
  selected,
  today,
  onPress,
}: {
  day: number;
  selected: boolean;
  today: boolean;
  onPress: () => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { hovered, bind } = useHover();
  const date = new Date(day);
  return (
    <Pressable
      onPress={onPress}
      {...bind}
      style={[
        styles.cell,
        styles.day,
        hovered ? styles.hover : null,
        selected ? { backgroundColor: colors.accent } : null,
      ]}
      accessibilityRole="button"
      accessibilityLabel={date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
      accessibilityState={{ selected }}
    >
      <Text
        style={[
          styles.dayText,
          today ? styles.todayText : null,
          selected ? { color: colors.onAccent } : null,
        ]}
      >
        {date.getDate()}
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

// Ayın günleri, haftanın pazartesiden başlaması için başa boşluk koyuyoruz.
function monthCells(first: number): (number | null)[] {
  const date = new Date(first);
  const offset = (date.getDay() + 6) % 7; // getDay pazar=0 veriyor
  const length = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const cells: (number | null)[] = Array.from({ length: offset }, () => null);
  for (let d = 1; d <= length; d++) {
    cells.push(new Date(date.getFullYear(), date.getMonth(), d).getTime());
  }
  return cells;
}

const useStyles = makeStyles(({ colors, elevation }) => ({
  panel: {
    alignSelf: 'flex-start',
    backgroundColor: colors.popover,
    borderRadius: radii.sm,
    borderWidth: borders.hairline,
    borderColor: colors.rule,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    ...elevation.popover,
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    maxWidth: CELL * 7,
    marginBottom: spacing.sm,
  },
  chip: {
    borderRadius: radii.xs,
    borderWidth: borders.hairline,
    borderColor: colors.rule,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  chipActive: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  chipText: { ...typography.caption, color: colors.textPrimary, lineHeight: 20 },
  danger: { color: colors.danger },
  hover: { backgroundColor: colors.hover },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: CELL * 7,
    marginBottom: spacing.xs,
  },
  monthLabel: { ...typography.ui, color: colors.textPrimary },
  navButton: { padding: spacing.xs, borderRadius: radii.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', width: CELL * 7 },
  cell: {
    width: CELL,
    height: CELL - 4,
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
  },
  weekday: { ...typography.caption, color: colors.textMuted, lineHeight: CELL - 4 },
  day: { borderRadius: radii.xs },
  dayText: { ...typography.body, color: colors.textPrimary },
  todayText: { color: colors.danger, fontWeight: '600' },
}));
