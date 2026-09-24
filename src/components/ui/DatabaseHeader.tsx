// Tarla ve Kiler sayfalarının başlık kısmı. Simge, başlık, açıklama ve
// altında sekmeler var. Sekme değişince alttaki çizgi kayarak gidiyor.
import React, { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  Text,
  View,
  type LayoutRectangle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useHover } from '../../hooks/useHover';
import { borders, radii, spacing, typography } from '../../theme';
import { durations, easings } from '../../theme/motion';
import { makeStyles, useTheme } from '../../theme/ThemeProvider';
import { FadeIn } from './FadeIn';
import { Icon, type IconName } from './Icon';

export interface ViewTab<K extends string> {
  key: K;
  icon: IconName;
  label: string;
}

interface Props<K extends string> {
  icon: string;
  title: string;
  description?: string;
  tabs?: ViewTab<K>[];
  activeTab?: K;
  onSelectTab?: (key: K) => void;
  onNew?: () => void;
  // başlıkla sekmelerin arasına eklenecek şeyler (sayaçlar vs.)
  children?: React.ReactNode;
}

export function DatabaseHeader<K extends string>({
  icon,
  title,
  description,
  tabs,
  activeTab,
  onSelectTab,
  onNew,
  children,
}: Props<K>) {
  const styles = useStyles();
  const [layouts, setLayouts] = useState<Partial<Record<K, LayoutRectangle>>>(
    {},
  );
  const x = useSharedValue(0);
  const w = useSharedValue(0);

  // İlk açılışta çizgi kaymasın, direkt yerinde başlasın.
  const first = useRef(true);
  useEffect(() => {
    if (!activeTab) return;
    const layout = layouts[activeTab];
    if (!layout) return;
    if (first.current) {
      x.value = layout.x;
      w.value = layout.width;
      first.current = false;
      return;
    }
    const config = { duration: durations.base, easing: easings.out };
    x.value = withTiming(layout.x, config);
    w.value = withTiming(layout.width, config);
  }, [activeTab, layouts, x, w]);

  const underline = useAnimatedStyle(() => ({
    width: w.value,
    transform: [{ translateX: x.value }],
  }));

  return (
    <View style={styles.root}>
      <FadeIn>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={styles.title}>{title}</Text>
        {description ? (
          <Text style={styles.description}>{description}</Text>
        ) : null}
      </FadeIn>

      {children}

      {tabs ? (
        <View style={styles.tabsRow}>
          <View style={styles.tabs}>
            {tabs.map((tab) => (
              <TabButton
                key={tab.key}
                tab={tab}
                active={tab.key === activeTab}
                onPress={() => onSelectTab?.(tab.key)}
                onLayout={(layout) =>
                  setLayouts((prev) => ({ ...prev, [tab.key]: layout }))
                }
              />
            ))}
            <Animated.View style={[styles.underline, underline]} />
          </View>
          {onNew ? <NewButton onPress={onNew} /> : null}
        </View>
      ) : null}
    </View>
  );
}

function TabButton<K extends string>({
  tab,
  active,
  onPress,
  onLayout,
}: {
  tab: ViewTab<K>;
  active: boolean;
  onPress: () => void;
  onLayout: (layout: LayoutRectangle) => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { hovered, bind } = useHover();
  return (
    <View
      onLayout={(event) => onLayout(event.nativeEvent.layout)}
      style={styles.tabSlot}
    >
      <Pressable
        onPress={onPress}
        {...bind}
        style={({ pressed }) => [
          styles.tab,
          hovered || pressed ? styles.hovered : null,
        ]}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
      >
        <Icon
          name={tab.icon}
          size={14}
          color={active ? colors.textPrimary : colors.textMuted}
        />
        <Text style={[styles.tabText, active ? styles.tabTextActive : null]}>
          {tab.label}
        </Text>
      </Pressable>
    </View>
  );
}

export function NewButton({
  onPress,
  label = 'Yeni',
}: {
  onPress: () => void;
  label?: string;
}) {
  const styles = useStyles();
  const { hovered, bind } = useHover();
  return (
    <Pressable
      onPress={onPress}
      {...bind}
      style={({ pressed }) => [
        styles.newButton,
        hovered || pressed ? styles.newButtonHover : null,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={styles.newText}>{label}</Text>
    </Pressable>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  root: { paddingTop: spacing.xxl },
  icon: { fontSize: 44, lineHeight: 56, marginBottom: spacing.xs },
  title: { ...typography.pageTitle, color: colors.textPrimary },
  description: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    borderBottomWidth: borders.hairline,
    borderBottomColor: colors.rule,
  },
  tabs: { flexDirection: 'row', alignItems: 'center' },
  tabSlot: { paddingVertical: 6 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radii.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  hovered: { backgroundColor: colors.hover },
  tabText: { ...typography.ui, color: colors.textMuted },
  tabTextActive: { color: colors.textPrimary },
  underline: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    height: 2,
    backgroundColor: colors.textPrimary,
  },
  newButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.xs,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
  },
  newButtonHover: { backgroundColor: colors.accentPressed },
  newText: { ...typography.ui, color: colors.onAccent },
}));
