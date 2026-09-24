/**
 * Ayarlar sayfası. Şimdilik tema seçimi ve birkaç bilgi var.
 *
 * Her tema kartında küçük bir önizleme çiziyorum, seçmeden nasıl duracağını
 * görmek için.
 */
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { FadeIn } from '../components/ui/FadeIn';
import { WEED_REMINDER_LEAD_MS } from '../game/config';
import { formatDuration } from '../utils/format';
import { Icon, type IconName } from '../components/ui/Icon';
import { Page, Section } from '../components/ui/Page';
import { useHover } from '../hooks/useHover';
import { radii, spacing, themes, typography, type Scheme } from '../theme';
import { makeStyles, useTheme, type ThemeMode } from '../theme/ThemeProvider';

const OPTIONS: { mode: ThemeMode; label: string; icon: IconName; hint: string }[] = [
  { mode: 'system', label: 'Sistem', icon: 'monitor', hint: 'Cihazın ayarını izler' },
  { mode: 'light', label: 'Açık', icon: 'sun', hint: 'Her zaman açık' },
  { mode: 'dark', label: 'Koyu', icon: 'moon', hint: 'Her zaman koyu' },
];

interface Props {
  noteCount: number;
  inventoryCount: number;
}

export function SettingsView({ noteCount, inventoryCount }: Props) {
  const styles = useStyles();
  const { mode, setMode, scheme } = useTheme();

  return (
    <Page icon="settings" title="Ayarlar" maxWidth={760}>
      <FadeIn>
        <Section title="Görünüm" icon="eye">
          <Text style={styles.label}>Tema</Text>
          <View style={styles.options}>
            {OPTIONS.map((option) => (
              <ThemeOption
                key={option.mode}
                {...option}
                selected={mode === option.mode}
                // sistem kartında şu anki sistem teması görünüyor
                preview={option.mode === 'system' ? scheme : option.mode}
                onPress={() => setMode(option.mode)}
              />
            ))}
          </View>
        </Section>

        <Section title="Veri" icon="database">
          <Row label="Tarladaki notlar" value={String(noteCount)} />
          <Row label="Kilerdeki ürünler" value={String(inventoryCount)} />
          <Row label="Depolama" value="Sadece bu cihaz (çevrimdışı)" />
        </Section>

        <Section title="Hakkında" icon="info">
          <Row label="Uygulama" value="HarvestNote 0.1.0" />
          <Row
            label="Bildirimler"
            value={`Ot basmadan ${formatDuration(WEED_REMINDER_LEAD_MS)} önce`}
          />
        </Section>
      </FadeIn>
    </Page>
  );
}

function ThemeOption({
  label,
  icon,
  hint,
  selected,
  preview,
  onPress,
}: {
  label: string;
  icon: IconName;
  hint: string;
  selected: boolean;
  preview: Scheme;
  onPress: () => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { hovered, bind } = useHover();
  const p = themes[preview].colors;
  return (
    <Pressable
      onPress={onPress}
      {...bind}
      style={[
        styles.option,
        selected ? styles.optionSelected : null,
        hovered && !selected ? styles.optionHover : null,
      ]}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${label} tema`}
    >
      {/* mini önizleme, solda kenar çubuğu sağda sayfa */}
      <View style={[styles.preview, { backgroundColor: p.surface, borderColor: p.rule }]}>
        <View style={[styles.previewSide, { backgroundColor: p.sidebar }]}>
          <View style={[styles.previewLine, { backgroundColor: p.ruleStrong, width: 22 }]} />
          <View style={[styles.previewLine, { backgroundColor: p.ruleStrong, width: 16 }]} />
          <View style={[styles.previewLine, { backgroundColor: p.ruleStrong, width: 19 }]} />
        </View>
        <View style={styles.previewPage}>
          <View style={[styles.previewTitle, { backgroundColor: p.textPrimary }]} />
          <View style={[styles.previewLine, { backgroundColor: p.textMuted, width: 60 }]} />
          <View style={[styles.previewLine, { backgroundColor: p.textMuted, width: 44 }]} />
          <View style={[styles.previewAccent, { backgroundColor: p.accent }]} />
        </View>
      </View>
      <View style={styles.optionFoot}>
        <Icon name={icon} size={14} color={selected ? colors.accent : colors.textSecondary} />
        <Text style={[styles.optionLabel, selected ? { color: colors.accent } : null]}>
          {label}
        </Text>
      </View>
      <Text style={styles.optionHint}>{hint}</Text>
    </Pressable>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const styles = useStyles();
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  label: { ...typography.ui, color: colors.textPrimary, marginBottom: spacing.sm },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  option: {
    width: 170,
    borderWidth: 1,
    borderColor: colors.rule,
    borderRadius: radii.sm,
    padding: spacing.sm,
    gap: 6,
  },
  optionHover: { backgroundColor: colors.hover },
  optionSelected: { borderColor: colors.accent, borderWidth: 2, padding: spacing.sm - 1 },
  preview: {
    height: 80,
    borderRadius: radii.xs,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  previewSide: { width: 40, padding: 6, gap: 5 },
  previewPage: { flex: 1, padding: 8, gap: 5 },
  previewTitle: { width: 50, height: 7, borderRadius: 2 },
  previewLine: { height: 4, borderRadius: 2, opacity: 0.8 },
  previewAccent: { width: 24, height: 8, borderRadius: 2, marginTop: 'auto' },
  optionFoot: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  optionLabel: { ...typography.ui, color: colors.textPrimary },
  optionHint: { ...typography.caption, color: colors.textMuted },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.rule,
  },
  rowLabel: { ...typography.body, color: colors.textSecondary },
  rowValue: { ...typography.body, color: colors.textPrimary, textAlign: 'right', flexShrink: 1 },
}));
