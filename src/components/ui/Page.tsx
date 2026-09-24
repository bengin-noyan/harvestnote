// Ana sayfa, Yaklaşanlar, İstatistikler, Ayarlar ve Rehber'in ortak iskeleti.
// Her sayfada aynı padding'i tekrar yazmamak için yaptım.
import React from 'react';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';

import { useHover } from '../../hooks/useHover';
import { radii, spacing, typography } from '../../theme';
import { makeStyles, useTheme } from '../../theme/ThemeProvider';
import { Icon, type IconName } from './Icon';

interface PageProps {
  // başlığın üstündeki büyük simge
  icon?: IconName;
  emoji?: string;
  title: string;
  description?: string;
  // sayfanın en fazla genişliği
  maxWidth?: number;
  children: React.ReactNode;
}

export function Page({
  icon,
  emoji,
  title,
  description,
  maxWidth = 900,
  children,
}: PageProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const narrow = width < 600;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, narrow ? styles.contentNarrow : null]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.column, { maxWidth }]}>
        <View style={styles.header}>
          {emoji ? <Text style={styles.emoji}>{emoji}</Text> : null}
          {icon ? (
            <View style={styles.iconBox}>
              <Icon name={icon} size={30} color={colors.textSecondary} />
            </View>
          ) : null}
          <Text style={[styles.title, narrow ? styles.titleNarrow : null]}>
            {title}
          </Text>
          {description ? <Text style={styles.description}>{description}</Text> : null}
        </View>
        {children}
      </View>
    </ScrollView>
  );
}

// Sayfa içindeki bölüm başlığı, sağına bir link konabiliyor.
export function Section({
  title,
  icon,
  action,
  onAction,
  children,
}: {
  title: string;
  icon?: IconName;
  action?: string;
  onAction?: () => void;
  children: React.ReactNode;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        {icon ? <Icon name={icon} size={14} color={colors.textMuted} /> : null}
        <Text style={styles.sectionTitle}>{title}</Text>
        {action && onAction ? (
          <LinkButton label={action} onPress={onAction} />
        ) : null}
      </View>
      {children}
    </View>
  );
}

export function LinkButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  const styles = useStyles();
  const { hovered, bind } = useHover();
  return (
    <Pressable
      onPress={onPress}
      {...bind}
      style={[styles.link, hovered ? styles.linkHover : null]}
      accessibilityRole="button"
    >
      <Text style={styles.linkText}>{label}</Text>
    </Pressable>
  );
}

// Gri kutu içinde bilgi notu, solda emoji.
export function Callout({
  icon,
  children,
}: {
  icon: string;
  children: React.ReactNode;
}) {
  const styles = useStyles();
  return (
    <View style={styles.callout}>
      <Text style={styles.calloutIcon}>{icon}</Text>
      <View style={styles.calloutBody}>{children}</View>
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  content: {
    paddingHorizontal: spacing.xxl * 2,
    paddingBottom: spacing.xxl * 3,
  },
  contentNarrow: { paddingHorizontal: spacing.lg },
  column: { width: '100%', alignSelf: 'center' },
  header: { paddingTop: spacing.xxl, paddingBottom: spacing.lg },
  emoji: { fontSize: 44, lineHeight: 56, marginBottom: spacing.xs },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: { ...typography.pageTitle, color: colors.textPrimary },
  titleNarrow: { fontSize: 32, lineHeight: 40 },
  description: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  section: { marginTop: spacing.xl },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: spacing.sm,
    marginBottom: spacing.xs,
  },
  sectionTitle: { ...typography.label, color: colors.textMuted, flex: 1 },
  link: { borderRadius: radii.xs, paddingHorizontal: 6, paddingVertical: 2 },
  linkHover: { backgroundColor: colors.hover },
  linkText: { ...typography.caption, color: colors.textMuted },
  callout: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.surfaceSunken,
    borderRadius: radii.xs,
    padding: spacing.md,
  },
  calloutIcon: { fontSize: 18, lineHeight: 22 },
  calloutBody: { flex: 1, gap: 4 },
}));
