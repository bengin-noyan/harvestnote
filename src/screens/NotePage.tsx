/**
 * Not sayfası.
 *
 * En üstte bitki, altında başlık, notun bilgileri ve blok editörü var. Emoji
 * yerine bitkiyi koydum çünkü uygulamanın farkı o. Aşama, olgunluk gibi oyun
 * bilgileri de ayrı bir panelde değil, başlığın altında satır satır duruyor.
 *
 * Sütun en fazla 720px. Daha geniş olunca satırları okumak zorlaşıyordu.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import type { TodoCount } from '../db/repositories/blocks';
import { BlockEditor } from '../components/editor/BlockEditor';
import { LivingPlant } from '../components/LivingPlant';
import { DuePicker } from '../components/properties/DuePicker';
import { PRIORITY_META, PRIORITY_ORDER } from '../components/properties/priority';
import { TagEditor } from '../components/properties/TagEditor';
import { NewButton } from '../components/ui/DatabaseHeader';
import { FadeIn } from '../components/ui/FadeIn';
import { Icon, type IconName } from '../components/ui/Icon';
import { IconButton } from '../components/ui/IconButton';
import { Tag } from '../components/ui/Tag';
import { SEED_CATALOG } from '../game/config';
import {
  maturityProgress,
  msUntilWeedy,
  resolveStage,
  STAGE_VISUALS,
} from '../game/stages';
import { useBlocks } from '../hooks/useBlocks';
import { useHover } from '../hooks/useHover';
import { TopBar } from '../navigation/TopBar';
import { reminderTimeFor } from '../notifications/weedReminders';
import { borders, radii, spacing, typography } from '../theme';
import { durations, easings } from '../theme/motion';
import type { Note, NoteTag, UpdateNoteInput } from '../types';
import {
  formatDate,
  formatDue,
  formatDuration,
  formatRelative,
} from '../utils/format';
import { makeStyles, useTheme } from '../theme/ThemeProvider';

/** Başlık da bloklarla aynı ritimde kaydedilsin. */
const TITLE_AUTOSAVE_MS = 600;

/** Okunabilir satır uzunluğu sınırı. */
export const PAGE_MAX_WIDTH = 720;

/** Sayfadaki bitkinin çizim yüksekliği. */
const PLANT_HEIGHT = 84;

// bundan dar ekranda başlık küçülüyor
const NARROW = 600;

// özellik adlarının sütun genişliği
const labelWidthFor = (narrow: boolean) => (narrow ? 118 : 160);

interface Props {
  note: Note;
  /** Notun yapılacak sayımı. Olgunluğun emek kısmı buradan geliyor. */
  labor?: TodoCount;
  onBack: () => void;
  onSave: (id: number, input: UpdateNoteInput) => Promise<void>;
  onHarvest: (id: number) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onHint: (message: string) => void;
  // kenar çubuğu kapalıysa ☰ düğmesi için
  onOpenSidebar?: () => void;
  favorite: boolean;
  onToggleFavorite: () => void;
  // notun etiketleri ve önerilecek bütün etiketler
  tags: NoteTag[];
  allTags: NoteTag[];
  onAddTag: (name: string) => void;
  onRemoveTag: (tagId: number) => void;
}

// Not sayfasında aynı anda tek açılır panel oluyor
type OpenPanel = 'due' | 'priority' | null;

export function NotePage({
  note,
  labor,
  onBack,
  onSave,
  onHarvest,
  onDelete,
  onHint,
  onOpenSidebar,
  favorite,
  onToggleFavorite,
  tags,
  allTags,
  onAddTag,
  onRemoveTag,
}: Props) {
  const { colors, stages } = useTheme();
  const styles = useStyles();
  const [title, setTitle] = useState(note.title);
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [panel, setPanel] = useState<OpenPanel>(null);
  // Web'de multiline input 2 satır yüksekliğinde açılıyordu. Web'de 1 satır
  // veriyoruz, boyu da içeriğe göre ayarlanıyor. Android'de numberOfLines
  // satırı sabitlediği için orada vermiyoruz.
  const [titleHeight, setTitleHeight] = useState<number | undefined>(undefined);
  const { width } = useWindowDimensions();
  const narrow = width < NARROW;
  const labelWidth = labelWidthFor(narrow);

  const editor = useBlocks(note.id);

  const pendingTitle = useRef<string | null>(null);
  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noteId = useRef(note.id);
  noteId.current = note.id;

  /**
   * Başlığı sadece başka nota geçince sıfırlıyoruz. `note` nesnesi otomatik
   * kayıttan sonra her tazelemede yeniden üretiliyor, efekt nesnenin kendisine
   * bakarsa kullanıcının yazdığını eski değerle eziyor.
   */
  useEffect(() => {
    setTitle(note.title);
    setBusy(false);
    setMenuOpen(false);
    setPanel(null);
  }, [note.id]);

  const togglePanel = (next: OpenPanel) =>
    setPanel((current) => (current === next ? null : next));

  // Son tarih ve öncelik updateNote'tan geçiyor, yani bakım sayılıyor.
  const saveProperty = (input: UpdateNoteInput) => {
    setPanel(null);
    onSave(note.id, input).catch((error: unknown) => {
      if (__DEV__) console.warn('[not] ozellik kaydedilemedi', error);
    });
  };

  const flushTitle = useCallback(async () => {
    if (titleTimer.current) {
      clearTimeout(titleTimer.current);
      titleTimer.current = null;
    }
    const next = pendingTitle.current;
    pendingTitle.current = null;
    // Boş başlık yazmıyoruz. updateNote zaten reddediyor, kullanıcı da
    // silerken adı kaybetmeyi beklemiyor, eski ad yerinde kalıyor.
    if (next === null || !next.trim()) return;
    try {
      await onSave(noteId.current, { title: next });
    } catch (error) {
      if (__DEV__) console.warn('[not] baslik kaydedilemedi', error);
    }
  }, [onSave]);

  const flushTitleRef = useRef(flushTitle);
  flushTitleRef.current = flushTitle;

  // Sayfadan çıkılırken bekleyen başlık yine de insin.
  useEffect(() => () => void flushTitleRef.current(), []);

  const handleTitleChange = useCallback((text: string) => {
    setTitle(text);
    pendingTitle.current = text;
    if (titleTimer.current) clearTimeout(titleTimer.current);
    titleTimer.current = setTimeout(() => {
      titleTimer.current = null;
      void flushTitleRef.current();
    }, TITLE_AUTOSAVE_MS);
  }, []);

  /**
   * Hasat ve sökme geri alınamıyor, bekleyen kayıtlar önce inmeli. Hasat
   * harvested_at'i damgaladıktan sonra blok izdüşümü nota yazılamıyor
   * (WHERE harvested_at IS NULL), yani sıra önemli.
   */
  const run = async (action: () => Promise<void>, hint: string) => {
    setBusy(true);
    setMenuOpen(false);
    try {
      await flushTitle();
      await editor.flush();
      await action();
      onHint(hint);
      onBack();
    } finally {
      setBusy(false);
    }
  };

  const now = Date.now();
  const stage = resolveStage(note, now, undefined, labor);
  const visual = STAGE_VISUALS[stage];
  const seed = SEED_CATALOG[note.seed_type];
  const progress = maturityProgress(note, now, undefined, labor);
  const untilWeedy = msUntilWeedy(note);
  const untilReminder = reminderTimeFor(note) - now;
  const ripe = stage === 'harvestable';
  const due = note.due_at !== null ? formatDue(note.due_at, now) : null;
  const priority = PRIORITY_META[note.priority];

  return (
    <View style={styles.root}>
      <TopBar
        onOpenSidebar={onOpenSidebar}
        crumbs={[
          { emoji: '🌾', label: 'Tarla', onPress: onBack },
          { emoji: seed?.emoji ?? '🌾', label: title.trim() || 'Adsız' },
        ]}
        meta={
          narrow ? undefined : `Düzenlendi ${formatRelative(note.last_tended_at)}`
        }
      >
        <IconButton
          icon="star"
          label={favorite ? 'Favorilerden çıkar' : 'Favorilere ekle'}
          color={favorite ? colors.gold : undefined}
          onPress={onToggleFavorite}
        />
        <NewButton
          label={ripe ? 'Hasat et' : 'Erken hasat'}
          onPress={() =>
            busy
              ? undefined
              : void run(() => onHarvest(note.id), 'Hasat kilere düştü. 🧺')
          }
        />
        <IconButton
          icon="more-horizontal"
          label="Sayfa menüsü"
          onPress={() => setMenuOpen((value) => !value)}
        />
      </TopBar>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          narrow ? styles.scrollContentNarrow : null,
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.column}>
          <FadeIn style={styles.icon} offset={10}>
            <LivingPlant
              stage={stage}
              progress={progress}
              height={PLANT_HEIGHT}
              seed={note.seed_type}
            />
            <View style={styles.soil} />
          </FadeIn>

          <TextInput
            value={title}
            onChangeText={handleTitleChange}
            onContentSizeChange={(event) =>
              setTitleHeight(event.nativeEvent.contentSize.height)
            }
            style={[
              styles.title,
              narrow ? styles.titleNarrow : null,
              titleHeight ? { height: titleHeight } : null,
            ]}
            placeholder="Adsız"
            placeholderTextColor={colors.rule}
            maxLength={80}
            multiline
            numberOfLines={Platform.OS === 'web' ? 1 : undefined}
            accessibilityLabel="Not başlığı"
          />

          <FadeIn delay={60} style={styles.properties}>
            <Property icon="disc" label="Aşama" narrow={narrow}>
              <Tag label={visual.label} color={stages[stage].tag} />
            </Property>
            <Property
              icon="calendar"
              label="Son tarih"
              narrow={narrow}
              onPress={() => togglePanel('due')}
            >
              {due && note.due_at !== null ? (
                <Text style={[styles.value, due.tone === 'overdue' ? styles.overdue : null]}>
                  {formatDate(note.due_at)}{' '}
                  <Text style={due.tone === 'overdue' ? styles.overdue : styles.valueMuted}>
                    ({due.label})
                  </Text>
                </Text>
              ) : (
                <Text style={styles.valueMuted}>Boş</Text>
              )}
            </Property>
            {panel === 'due' ? (
              <View style={[styles.panelSlot, { paddingLeft: labelWidth }]}>
                <DuePicker
                  value={note.due_at}
                  onChange={(dueAt) => saveProperty({ due_at: dueAt })}
                />
              </View>
            ) : null}
            <Property
              icon="flag"
              label="Öncelik"
              narrow={narrow}
              onPress={() => togglePanel('priority')}
            >
              {note.priority > 0 ? (
                <Tag label={priority.label} color={priority.color} />
              ) : (
                <Text style={styles.valueMuted}>Boş</Text>
              )}
            </Property>
            {panel === 'priority' ? (
              <View style={[styles.panelSlot, { paddingLeft: labelWidth }]}>
                <View style={styles.optionPanel}>
                  {PRIORITY_ORDER.map((level) => (
                    <MenuItem
                      key={level}
                      icon={level === note.priority ? 'check' : 'flag'}
                      label={PRIORITY_META[level].label}
                      onPress={() => saveProperty({ priority: level })}
                    />
                  ))}
                </View>
              </View>
            ) : null}
            <Property icon="hash" label="Etiketler" narrow={narrow}>
              <TagEditor
                tags={tags}
                allTags={allTags}
                onAdd={onAddTag}
                onRemove={onRemoveTag}
              />
            </Property>
            <Property icon="tag" label="Tohum" narrow={narrow}>
              <Text style={styles.value}>
                {seed?.emoji} {seed?.label}
              </Text>
            </Property>
            <Property icon="trending-up" label="Olgunluk" narrow={narrow}>
              <ProgressBar
                progress={progress}
                color={stages[stage].accent}
              />
              <Text style={styles.valueMuted}>%{Math.round(progress * 100)}</Text>
            </Property>
            {labor && labor.total > 0 ? (
              <Property icon="check-square" label="Görevler" narrow={narrow}>
                <Text style={styles.value}>
                  {labor.done}/{labor.total} tamamlandı
                </Text>
              </Property>
            ) : null}
            <Property icon="calendar" label="Ekildi" narrow={narrow}>
              <Text style={styles.value}>
                {formatDate(note.created_at)}{' '}
                <Text style={styles.valueMuted}>
                  ({formatRelative(note.created_at)})
                </Text>
              </Text>
            </Property>
            <Property icon="clock" label="Ot" narrow={narrow}>
              <Text style={styles.value}>
                {untilWeedy > 0
                  ? `${formatDuration(untilWeedy)} sonra basar`
                  : 'Ot bastı'}
              </Text>
            </Property>
            {untilReminder > 0 ? (
              <Property icon="bell" label="Hatırlatma" narrow={narrow}>
                <Text style={styles.value}>
                  {formatDuration(untilReminder)} sonra
                </Text>
              </Property>
            ) : null}
            <Property icon="award" label="Hasat kalitesi" narrow={narrow}>
              {ripe ? (
                <Tag label="Altın" color="yellow" />
              ) : (
                <Tag label="Normal" color="gray" />
              )}
            </Property>
          </FadeIn>

          <View style={styles.divider} />

          <FadeIn delay={120}>
            <BlockEditor editor={editor} />
          </FadeIn>
        </View>
      </ScrollView>

      {menuOpen ? (
        <>
          {/* Menü dışına dokununca kapansın. */}
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setMenuOpen(false)}
            accessibilityLabel="Menüyü kapat"
          />
          <FadeIn style={styles.menu} offset={-4}>
            <Text style={styles.menuMeta}>
              Düzenlendi {formatRelative(note.last_tended_at)}
            </Text>
            <MenuItem
              icon="star"
              label={favorite ? 'Favorilerden çıkar' : 'Favorilere ekle'}
              onPress={() => {
                setMenuOpen(false);
                onToggleFavorite();
              }}
            />
            <MenuItem
              icon="trash-2"
              label="Tohumu sök"
              hint="Kilere düşmez, tamamen silinir"
              danger
              onPress={() =>
                busy
                  ? undefined
                  : void run(() => onDelete(note.id), 'Tohum söküldü.')
              }
            />
          </FadeIn>
        </>
      ) : null}
    </View>
  );
}

// Solda özelliğin adı, sağda değeri.
// onPress yoksa satır düz View. Etiket satırının içinde kendi düğmeleri var,
// Pressable içinde Pressable web'de button içinde button oluyordu.
function Property({
  icon,
  label,
  narrow,
  onPress,
  children,
}: {
  icon: IconName;
  label: string;
  narrow: boolean;
  onPress?: () => void;
  children: React.ReactNode;
}) {
  const styles = useStyles();
  const { hovered, bind } = useHover();
  const name = (
    <View style={[styles.propertyLabel, { width: labelWidthFor(narrow) }]}>
      <Icon name={icon} size={14} />
      <Text style={styles.propertyText} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
  if (!onPress) {
    return (
      <View style={styles.property}>
        {name}
        <View style={styles.propertyValue}>{children}</View>
      </View>
    );
  }
  return (
    <Pressable
      {...bind}
      onPress={onPress}
      style={styles.property}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {name}
      <View style={[styles.propertyValue, hovered ? styles.hovered : null]}>
        {children}
      </View>
    </Pressable>
  );
}

// Olgunluk çubuğu, değer değişince kayarak doluyor.
// Yüzde genişlik TS'de hata verdiği için iki flex değeriyle yaptım.
function ProgressBar({ progress, color }: { progress: number; color: string }) {
  const styles = useStyles();
  const value = useSharedValue(0);
  useEffect(() => {
    value.value = withTiming(progress, {
      duration: durations.slow * 2,
      easing: easings.out,
    });
  }, [progress, value]);
  const fill = useAnimatedStyle(() => ({ flex: value.value }));
  const rest = useAnimatedStyle(() => ({ flex: 1 - value.value }));
  return (
    <View style={styles.bar}>
      <Animated.View style={[styles.barFill, { backgroundColor: color }, fill]} />
      <Animated.View style={rest} />
    </View>
  );
}

function MenuItem({
  icon,
  label,
  hint,
  danger = false,
  onPress,
}: {
  icon: IconName;
  label: string;
  hint?: string;
  danger?: boolean;
  onPress: () => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { hovered, bind } = useHover();
  return (
    <Pressable
      onPress={onPress}
      {...bind}
      style={({ pressed }) => [
        styles.menuItem,
        hovered || pressed ? styles.hovered : null,
      ]}
      accessibilityRole="button"
      accessibilityLabel={hint ? `${label} — ${hint}` : label}
    >
      <View style={styles.menuIcon}>
        <Icon name={icon} size={15} color={danger ? colors.danger : colors.textSecondary} />
      </View>
      <View style={styles.menuBody}>
        <Text style={[styles.menuLabel, danger ? styles.menuDanger : null]}>
          {label}
        </Text>
        {hint ? <Text style={styles.menuHint}>{hint}</Text> : null}
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles(({ colors, elevation }) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.xxl * 2,
    paddingBottom: spacing.xxl * 4,
  },
  scrollContentNarrow: { paddingHorizontal: spacing.lg },
  column: { width: '100%', maxWidth: PAGE_MAX_WIDTH, alignSelf: 'center' },
  // bitki sayfanın biraz aşağısından başlıyor
  icon: {
    alignSelf: 'flex-start',
    alignItems: 'center',
    marginTop: spacing.xxl + spacing.lg,
    marginBottom: spacing.sm,
  },
  /** Bitkinin bastığı toprak şeridi, sayfadaki küçük bir parsel. */
  soil: {
    width: PLANT_HEIGHT * 0.7,
    height: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.soilLight,
    opacity: 0.45,
  },
  title: {
    ...typography.pageTitle,
    color: colors.textPrimary,
    paddingHorizontal: 0,
    paddingVertical: spacing.xs,
    outlineWidth: 0,
  },
  titleNarrow: { fontSize: 32, lineHeight: 40 },
  properties: { marginTop: spacing.sm },
  property: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 34,
  },
  propertyLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 6,
  },
  propertyText: { ...typography.body, color: colors.textSecondary, flex: 1 },
  propertyValue: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  hovered: { backgroundColor: colors.hover },
  value: { ...typography.body, color: colors.textPrimary },
  valueMuted: { ...typography.body, color: colors.textMuted },
  overdue: { color: colors.danger },
  // açılır paneller özellik değerinin hizasından başlıyor
  panelSlot: { paddingTop: spacing.xs, paddingBottom: spacing.sm },
  optionPanel: {
    width: 200,
    backgroundColor: colors.popover,
    borderRadius: radii.sm,
    borderWidth: borders.hairline,
    borderColor: colors.rule,
    padding: spacing.xs,
    ...elevation.popover,
  },
  bar: {
    flexDirection: 'row',
    width: 120,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.rule,
    overflow: 'hidden',
  },
  barFill: { height: 4, borderRadius: 2 },
  divider: {
    height: borders.hairline,
    backgroundColor: colors.rule,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  menu: {
    position: 'absolute',
    top: 40,
    right: spacing.md,
    width: 250,
    backgroundColor: colors.popover,
    borderRadius: radii.sm,
    borderWidth: borders.hairline,
    borderColor: colors.rule,
    padding: spacing.xs,
    ...elevation.popover,
  },
  menuMeta: {
    ...typography.caption,
    color: colors.textMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderRadius: radii.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  menuIcon: { paddingTop: 2 },
  menuBody: { flex: 1 },
  menuLabel: { ...typography.body, color: colors.textPrimary },
  menuDanger: { color: colors.danger },
  menuHint: { ...typography.caption, color: colors.textMuted },
}));
