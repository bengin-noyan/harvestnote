// Sayfanın üstündeki çubuk. Solda hangi sayfada olduğun, sağda düğmeler.
// Bütün sayfalar aynısını kullanıyor, sayfa değişince çubuk zıplamasın diye.
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { Icon, type IconName } from '../components/ui/Icon';
import { IconButton } from '../components/ui/IconButton';
import { useHover } from '../hooks/useHover';
import { radii, spacing, typography } from '../theme';
import { makeStyles, useTheme } from '../theme/ThemeProvider';

export interface Crumb {
  label: string;
  // sayfanın simgesi emojiyse
  emoji?: string;
  // Ana sayfa, Ayarlar gibi sayfalarda çizgi simge
  icon?: IconName;
  onPress?: () => void;
}

interface Props {
  crumbs: Crumb[];
  // kenar çubuğu kapalıyken ☰ düğmesi
  onOpenSidebar?: () => void;
  // ör. "Düzenlendi 3 dk önce"
  meta?: string;
  children?: React.ReactNode;
}

export const TOP_BAR_HEIGHT = 44;

export function TopBar({ crumbs, onOpenSidebar, meta, children }: Props) {
  const styles = useStyles();
  return (
    <View style={styles.bar}>
      {onOpenSidebar ? (
        <IconButton icon="menu" label="Kenar çubuğunu aç" onPress={onOpenSidebar} />
      ) : null}

      <View style={styles.crumbs}>
        {crumbs.map((crumb, index) => (
          <React.Fragment key={`${index}-${crumb.label}`}>
            {index > 0 ? <Text style={styles.slash}>/</Text> : null}
            <CrumbButton crumb={crumb} last={index === crumbs.length - 1} />
          </React.Fragment>
        ))}
      </View>

      <View style={styles.right}>
        {meta ? (
          <Text style={styles.meta} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
        {children}
      </View>
    </View>
  );
}

function CrumbButton({ crumb, last }: { crumb: Crumb; last: boolean }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { hovered, bind } = useHover();
  return (
    <Pressable
      onPress={crumb.onPress}
      disabled={!crumb.onPress}
      {...bind}
      style={({ pressed }) => [
        styles.crumb,
        last ? styles.crumbLast : null,
        (hovered || pressed) && crumb.onPress ? styles.hovered : null,
      ]}
      accessibilityRole={crumb.onPress ? 'button' : 'text'}
    >
      {crumb.emoji ? <Text style={styles.crumbEmoji}>{crumb.emoji}</Text> : null}
      {crumb.icon ? (
        <Icon name={crumb.icon} size={14} color={colors.textSecondary} />
      ) : null}
      <Text style={styles.crumbText} numberOfLines={1}>
        {crumb.label}
      </Text>
    </Pressable>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  bar: {
    height: TOP_BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
  },
  crumbs: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  crumb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radii.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexShrink: 0,
    maxWidth: 200,
  },
  // Uzun not adı gelirse sadece son parça kısalsın.
  crumbLast: { flexShrink: 1 },
  hovered: { backgroundColor: colors.hover },
  crumbEmoji: { fontSize: 14, lineHeight: 20 },
  crumbText: { ...typography.body, color: colors.textPrimary, flexShrink: 1 },
  slash: { ...typography.body, color: colors.ruleStrong, paddingHorizontal: 2 },
  right: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  meta: { ...typography.body, color: colors.textMuted, marginRight: spacing.xs },
}));
