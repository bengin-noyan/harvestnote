/**
 * Soldaki kenar çubuğu.
 *
 * Üstte arama, Ana sayfa ve Yaklaşanlar var. Ortada favoriler ve Tarla
 * ağacı, en altta ayarlar ve tema düğmesi. Zemini sayfadan biraz koyu,
 * ayrı durduğu kenarlıktan değil renkten belli oluyor.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { FadeIn, staggerDelay } from '../components/ui/FadeIn';
import { Icon, type IconName } from '../components/ui/Icon';
import { IconButton } from '../components/ui/IconButton';
import { SEED_CATALOG } from '../game/config';
import { resolveStage } from '../game/stages';
import { useHover } from '../hooks/useHover';
import { radii, spacing, typography } from '../theme';
import { durations, easings } from '../theme/motion';
import { makeStyles, useTheme } from '../theme/ThemeProvider';
import type { TodoCount } from '../db/repositories/blocks';
import type { Note } from '../types';
import { isFieldTab, type WorkspaceView } from './views';

interface Props {
  notes: Note[];
  labor: Map<number, TodoCount>;
  now: number;
  view: WorkspaceView;
  openNoteId: number | null;
  search: string;
  onSearch: (value: string) => void;
  onSelectView: (view: WorkspaceView) => void;
  // Tarla'ya tıklanınca. Hangi sekmenin açılacağını AppShell seçiyor.
  onOpenField: () => void;
  onSelectNote: (id: number) => void;
  onAdd: () => void;
  // Yaklaşanlar'ın yanında çıkan sayı
  upcomingCount: number;
  inventoryCount: number;
  // bu sayı her arttığında arama kutusuna odaklanıyoruz (Ctrl+K için)
  searchFocusSignal: number;
  // sadece geniş ekranda var
  onCollapse?: () => void;
  // sadece dar ekranda var
  onClose?: () => void;
}

export function Sidebar({
  notes,
  labor,
  now,
  view,
  openNoteId,
  search,
  onSearch,
  onSelectView,
  onOpenField,
  onSelectNote,
  onAdd,
  upcomingCount,
  inventoryCount,
  searchFocusSignal,
  onCollapse,
  onClose,
}: Props) {
  const styles = useStyles();
  const { stages } = useTheme();
  const [expanded, setExpanded] = useState(true);
  const searching = search.trim().length > 0;
  const onPage = openNoteId === null;

  const isActive = (target: WorkspaceView) => onPage && view === target;

  const noteRow = (note: Note, index: number, depth: number) => {
    const stage = resolveStage(note, now, undefined, labor.get(note.id));
    return (
      <FadeIn key={note.id} delay={staggerDelay(index)} offset={3}>
        <SidebarRow
          emoji={SEED_CATALOG[note.seed_type]?.emoji ?? '🌾'}
          label={note.title}
          active={openNoteId === note.id}
          depth={depth}
          onPress={() => onSelectNote(note.id)}
          trailing={
            // Rozet yerine küçük bir nokta, liste sakin dursun.
            <View
              style={[styles.stageDot, { backgroundColor: stages[stage].accent }]}
            />
          }
        />
      </FadeIn>
    );
  };

  const favorites = notes
    .filter((note) => note.favorited_at !== null)
    .sort((a, b) => (a.favorited_at ?? 0) - (b.favorited_at ?? 0));

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={styles.workspace}>
          <View style={styles.workspaceIcon}>
            <Text style={styles.workspaceGlyph}>🌾</Text>
          </View>
          <Text style={styles.workspaceName} numberOfLines={1}>
            HarvestNote
          </Text>
        </View>
        <View style={styles.headerActions}>
          <IconButton icon="edit" label="Yeni tohum ek" onPress={onAdd} onSidebar />
          {onCollapse ? (
            <IconButton
              icon="chevrons-left"
              label="Kenar çubuğunu gizle"
              onPress={onCollapse}
              onSidebar
            />
          ) : null}
          {onClose ? (
            <IconButton icon="x" label="Kenar çubuğunu kapat" onPress={onClose} onSidebar />
          ) : null}
        </View>
      </View>

      <SearchRow value={search} onChange={onSearch} focusSignal={searchFocusSignal} />
      <SidebarRow
        icon="home"
        label="Ana sayfa"
        active={isActive('home')}
        onPress={() => onSelectView('home')}
      />
      <SidebarRow
        icon="bell"
        label="Yaklaşanlar"
        active={isActive('upcoming')}
        onPress={() => onSelectView('upcoming')}
        badge={upcomingCount > 0 ? upcomingCount : undefined}
        badgeStrong
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {searching ? (
          <>
            <Text style={styles.section}>Sonuçlar</Text>
            {notes.length === 0 ? (
              <Text style={styles.empty}>Eşleşen not yok</Text>
            ) : (
              notes.map((note, index) => noteRow(note, index, 0))
            )}
          </>
        ) : (
          <>
            {favorites.length > 0 ? (
              <>
                <Text style={styles.section}>Favoriler</Text>
                {favorites.map((note, index) => noteRow(note, index, 0))}
              </>
            ) : null}

            <Text style={styles.section}>Çalışma alanı</Text>
            <SidebarRow
              emoji="🌾"
              label="Tarla"
              active={onPage && isFieldTab(view)}
              onPress={onOpenField}
              expanded={expanded}
              onToggle={() => setExpanded((value) => !value)}
              badge={notes.length > 0 ? notes.length : undefined}
            />
            {expanded ? (
              notes.length === 0 ? (
                <Text style={[styles.empty, styles.emptyNested]}>
                  İçinde sayfa yok
                </Text>
              ) : (
                notes.map((note, index) => noteRow(note, index, 1))
              )
            ) : null}
            <SidebarRow
              emoji="🧺"
              label="Kiler"
              active={isActive('inventory')}
              onPress={() => onSelectView('inventory')}
              badge={inventoryCount > 0 ? inventoryCount : undefined}
            />
            <SidebarRow
              icon="bar-chart-2"
              label="İstatistikler"
              active={isActive('stats')}
              onPress={() => onSelectView('stats')}
            />
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <SidebarRow icon="plus-circle" label="Yeni tohum" onPress={onAdd} />
        <SidebarRow
          icon="settings"
          label="Ayarlar"
          active={isActive('settings')}
          onPress={() => onSelectView('settings')}
        />
        <View style={styles.footerLast}>
          <View style={styles.footerGrow}>
            <SidebarRow
              icon="book-open"
              label="Rehber"
              active={isActive('guide')}
              onPress={() => onSelectView('guide')}
            />
          </View>
          <ThemeToggle />
        </View>
      </View>
    </View>
  );
}

// Açık/koyu düğmesi. Sistem modundaysa şu an hangisi görünüyorsa tersine geçiyor.
function ThemeToggle() {
  const { scheme, setMode } = useTheme();
  const dark = scheme === 'dark';
  return (
    <IconButton
      icon={dark ? 'sun' : 'moon'}
      label={dark ? 'Açık temaya geç' : 'Koyu temaya geç'}
      onPress={() => setMode(dark ? 'light' : 'dark')}
      onSidebar
    />
  );
}

function SearchRow({
  value,
  onChange,
  focusSignal,
}: {
  value: string;
  onChange: (value: string) => void;
  focusSignal: number;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { hovered, bind } = useHover();
  const [focused, setFocused] = useState(false);
  const input = useRef<TextInput>(null);

  useEffect(() => {
    if (focusSignal > 0) input.current?.focus();
  }, [focusSignal]);

  return (
    <Pressable
      {...bind}
      onPress={() => input.current?.focus()}
      style={[styles.row, hovered || focused ? styles.rowHover : null]}
    >
      <View style={styles.chevronSlot} />
      <View style={styles.iconSlot}>
        <Icon name="search" size={15} color={colors.textSecondary} />
      </View>
      <TextInput
        ref={input}
        value={value}
        onChangeText={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Ara"
        placeholderTextColor={colors.textSecondary}
        style={styles.searchInput}
        accessibilityLabel="Notlarda ara"
      />
      {/* telefonda klavye kısayolu yok, sadece web'de gösteriyoruz */}
      {Platform.OS === 'web' && !focused && !value ? (
        <Text style={styles.shortcut} numberOfLines={1}>
          Ctrl K
        </Text>
      ) : null}
    </Pressable>
  );
}

interface RowProps {
  label: string;
  onPress: () => void;
  icon?: IconName;
  emoji?: string;
  active?: boolean;
  // alt sayfalar için 1
  depth?: number;
  trailing?: React.ReactNode;
  badge?: number;
  // kırmızı zeminli sayı
  badgeStrong?: boolean;
  // verilirse solda aç/kapa oku çıkıyor
  expanded?: boolean;
  onToggle?: () => void;
}

function SidebarRow({
  label,
  onPress,
  icon,
  emoji,
  active = false,
  depth = 0,
  trailing,
  badge,
  badgeStrong = false,
  expanded,
  onToggle,
}: RowProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const row = useHover();
  const chevron = useHover();
  const hovered = row.hovered || chevron.hovered;
  // Oku ve satırı yan yana koydum. İç içe olunca web'de button içinde
  // button oluyordu, React hata veriyordu.
  return (
    <View
      style={[
        styles.row,
        { paddingLeft: spacing.xs + depth * 14 },
        active ? styles.rowActive : null,
        hovered ? styles.rowHover : null,
      ]}
    >
      {onToggle ? (
        <Chevron open={expanded ?? false} onPress={onToggle} hover={chevron.bind} />
      ) : (
        <View style={styles.chevronSlot} />
      )}
      <Pressable
        onPress={onPress}
        {...row.bind}
        style={styles.rowMain}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
      >
        <View style={styles.iconSlot}>
          {emoji ? <Text style={styles.rowEmoji}>{emoji}</Text> : null}
          {icon ? (
            <Icon
              name={icon}
              size={15}
              color={active ? colors.textPrimary : colors.textSecondary}
            />
          ) : null}
        </View>
        <Text
          style={[styles.rowText, active ? styles.rowTextActive : null]}
          numberOfLines={1}
        >
          {label}
        </Text>
        {badge !== undefined ? (
          <Text style={[styles.badge, badgeStrong ? styles.badgeStrong : null]}>
            {badge}
          </Text>
        ) : null}
        {trailing}
      </Pressable>
    </View>
  );
}

// Aç/kapa oku, dönerek açılıyor.
function Chevron({
  open,
  onPress,
  hover,
}: {
  open: boolean;
  onPress: () => void;
  hover: ReturnType<typeof useHover>['bind'];
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const rotation = useSharedValue(open ? 90 : 0);
  useEffect(() => {
    rotation.value = withTiming(open ? 90 : 0, {
      duration: durations.fast,
      easing: easings.out,
    });
  }, [open, rotation]);
  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));
  return (
    <Pressable
      onPress={onPress}
      {...hover}
      hitSlop={4}
      style={styles.chevronSlot}
      accessibilityRole="button"
      accessibilityLabel={open ? 'Alt sayfaları gizle' : 'Alt sayfaları göster'}
    >
      <Animated.View style={style}>
        <Icon name="chevron-right" size={13} color={colors.textMuted} />
      </Animated.View>
    </Pressable>
  );
}

export const SIDEBAR_WIDTH = 248;

const useStyles = makeStyles(({ colors, tags }) => ({
  root: {
    width: SIDEBAR_WIDTH,
    flex: 1,
    backgroundColor: colors.sidebar,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.xs,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  workspace: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  workspaceIcon: {
    width: 22,
    height: 22,
    borderRadius: radii.xs,
    backgroundColor: tags.green.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workspaceGlyph: { fontSize: 13, lineHeight: 16 },
  workspaceName: { ...typography.ui, color: colors.textPrimary, flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: spacing.lg },
  section: {
    ...typography.label,
    color: colors.textMuted,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 30,
    borderRadius: radii.sm,
    paddingLeft: spacing.xs,
    paddingRight: spacing.sm,
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'stretch',
  },
  /** Seçili satır kenarlıkla değil zeminle işaretleniyor. */
  rowActive: { backgroundColor: colors.selected },
  rowHover: { backgroundColor: colors.selected },
  chevronSlot: {
    width: 16,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSlot: { width: 20, alignItems: 'center', justifyContent: 'center' },
  rowEmoji: { fontSize: 14, lineHeight: 20 },
  rowText: { ...typography.ui, color: colors.textSecondary, flex: 1 },
  rowTextActive: { color: colors.textPrimary },
  badge: { ...typography.caption, color: colors.textMuted },
  badgeStrong: {
    color: colors.onAccent,
    backgroundColor: colors.danger,
    borderRadius: radii.pill,
    paddingHorizontal: 6,
    overflow: 'hidden',
    fontWeight: '600',
  },
  searchInput: {
    ...typography.ui,
    flex: 1,
    minWidth: 0,
    color: colors.textPrimary,
    paddingVertical: 0,
    // web'deki mavi odak çerçevesini kapattım, satırın rengi zaten değişiyor
    outlineWidth: 0,
  },
  shortcut: { ...typography.caption, color: colors.textMuted, flexShrink: 0 },
  stageDot: { width: 6, height: 6, borderRadius: 3 },
  empty: {
    ...typography.caption,
    color: colors.textMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  emptyNested: { paddingLeft: spacing.xs + 14 + 16 + 20 + 8 },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.rule,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  footerLast: { flexDirection: 'row', alignItems: 'center' },
  footerGrow: { flex: 1 },
}));
