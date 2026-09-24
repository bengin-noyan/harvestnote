/**
 * Uygulamanın kabuğu. Solda kenar çubuğu, sağda açık olan sayfa.
 *
 * React Navigation'ı kaldırdım çünkü kenar çubuğuyla sürekli çakışıyordu. En
 * fazla iki seviye var (sayfa ve not), düz state yetiyor. Android geri tuşunu
 * aşağıda elle bağladım.
 *
 * useNotes() ve useInventory() sadece burada çağrılıyor, sayfalara prop olarak
 * iniyor. Her sayfa kendisi çağırınca aynı sorgu birkaç kere çalışıyordu.
 *
 * Geniş ekranda kenar çubuğu sabit ve gizlenebiliyor, dar ekranda çekmece.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { AddSeedSheet } from '../components/AddSeedSheet';
import { HintToast } from '../components/HintToast';
import { FadeIn } from '../components/ui/FadeIn';
import { DAY } from '../game/config';
import { msUntilWeedy, resolveStage } from '../game/stages';
import { useInventory } from '../hooks/useInventory';
import { useNotes } from '../hooks/useNotes';
import { useNow } from '../hooks/useNow';
import { useReminderTap } from '../hooks/useReminderTap';
import { BoardView } from '../screens/BoardView';
import { FarmView } from '../screens/FarmView';
import { GuideView } from '../screens/GuideView';
import { HomeView } from '../screens/HomeView';
import { InventoryView } from '../screens/InventoryView';
import { ListView } from '../screens/ListView';
import { NotePage } from '../screens/NotePage';
import { SettingsView } from '../screens/SettingsView';
import { StatsView } from '../screens/StatsView';
import { UpcomingView } from '../screens/UpcomingView';
import { durations, easings } from '../theme/motion';
import { makeStyles, useTheme } from '../theme/ThemeProvider';
import { Sidebar, SIDEBAR_WIDTH } from './Sidebar';
import { TopBar } from './TopBar';
import { isFieldTab, VIEW_META, type FieldTab, type WorkspaceView } from './views';

/**
 * Kenar çubuğunun sabit durabilmesi için gereken en az genişlik. 900px altında
 * içerik sütunu okunamayacak kadar daralıyor, o yüzden çekmeceye dönüyor.
 */
const WIDE_BREAKPOINT = 900;

export function AppShell() {
  const { colors } = useTheme();
  const styles = useStyles();
  const { notes, labor, loading, plant, tend, harvest, save, remove, toggleFavorite } =
    useNotes();
  const inventory = useInventory();
  const now = useNow();
  const { width } = useWindowDimensions();
  const wide = width >= WIDE_BREAKPOINT;

  const [view, setView] = useState<WorkspaceView>('home');
  // Tarla'da en son hangi sekme açıktı, geri dönünce o açılsın
  const [fieldTab, setFieldTab] = useState<FieldTab>('farm');
  // geniş ekranda kenar çubuğu gizlendi mi
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const [openNoteId, setOpenNoteId] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [searchFocus, setSearchFocus] = useState(0);
  const [hint, setHint] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  /** Bildirimden gelen not. Liste henüz yüklenmemiş olabilir. */
  const [pendingNoteId, setPendingNoteId] = useState<number | null>(null);

  useReminderTap(setPendingNoteId);

  const openNote = useCallback(
    (id: number) => {
      const target = notes.find((note) => note.id === id);
      // Otlu not açılmıyor, karttaki kural burada da geçerli.
      const stage =
        target && resolveStage(target, Date.now(), undefined, labor.get(id));
      if (stage === 'weedy') {
        setHint('Bu tohumu otlar sarmış. Açmadan önce otları temizle.');
        return;
      }
      setOpenNoteId(id);
      setDrawerOpen(false);
    },
    [notes, labor],
  );

  const closeNote = useCallback(() => setOpenNoteId(null), []);

  const selectView = useCallback((next: WorkspaceView) => {
    setView(next);
    if (isFieldTab(next)) setFieldTab(next);
    setOpenNoteId(null);
    setDrawerOpen(false);
  }, []);

  const openField = useCallback(() => selectView(fieldTab), [selectView, fieldTab]);

  const startAdding = useCallback(() => {
    setAdding(true);
    setDrawerOpen(false);
  }, []);

  // Kenar çubuğu görünmüyorsa üst çubuğa ☰ koyuyoruz.
  const openSidebar = wide
    ? sidebarHidden
      ? () => setSidebarHidden(false)
      : undefined
    : () => setDrawerOpen(true);

  // Android geri tuşu. Sırayla notu kapatıyor, çekmeceyi kapatıyor, ana
  // sayfaya dönüyor, en son uygulamadan çıkıyor.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (openNoteId !== null) {
        setOpenNoteId(null);
        return true;
      }
      if (drawerOpen) {
        setDrawerOpen(false);
        return true;
      }
      if (view !== 'home') {
        setView('home');
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [openNoteId, drawerOpen, view]);

  // Web'de Ctrl+K (Mac'te Cmd+K) arama kutusuna odaklanıyor.
  // Kenar çubuğu kapalıysa önce açıyoruz.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (wide) setSidebarHidden(false);
        else setDrawerOpen(true);
        setSearchFocus((n) => n + 1);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [wide]);

  // Bildirime dokunulmuş, not yüklenince açıyoruz.
  useEffect(() => {
    if (pendingNoteId === null || loading) return;
    const target = notes.find((note) => note.id === pendingNoteId);
    setPendingNoteId(null);
    if (!target) return;
    openNote(target.id);
  }, [pendingNoteId, loading, notes, openNote]);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('tr');
    if (!term) return notes;
    return notes.filter(
      (note) =>
        note.title.toLocaleLowerCase('tr').includes(term) ||
        (note.content ?? '').toLocaleLowerCase('tr').includes(term),
    );
  }, [notes, search]);

  // Yaklaşanlar'daki sayı. Otlu olanlar ve 1 gün içinde otlanacaklar.
  const upcomingCount = useMemo(
    () =>
      notes.filter(
        (note) =>
          resolveStage(note, now, undefined, labor.get(note.id)) === 'weedy' ||
          msUntilWeedy(note, now) < DAY,
      ).length,
    [notes, labor, now],
  );

  const openNoteRecord = notes.find((note) => note.id === openNoteId) ?? null;

  const handleBlocked = useCallback(() => {
    setHint('Bu tohumu otlar sarmış. Açmadan önce otları temizle.');
  }, []);

  const handleTend = useCallback(
    (id: number) => {
      void tend(id);
      setHint('Otlar temizlendi, ürün yeniden büyüyor. 🌿');
    },
    [tend],
  );

  const handleHarvest = useCallback(
    (id: number) => {
      void harvest(id);
      setHint('Hasat kilere düştü. 🧺');
    },
    [harvest],
  );

  const sidebar = (
    <Sidebar
      notes={filtered}
      labor={labor}
      now={now}
      view={view}
      openNoteId={openNoteId}
      search={search}
      onSearch={setSearch}
      onSelectView={selectView}
      onOpenField={openField}
      onSelectNote={openNote}
      onAdd={startAdding}
      upcomingCount={upcomingCount}
      inventoryCount={inventory.items.length}
      searchFocusSignal={searchFocus}
      onCollapse={wide ? () => setSidebarHidden(true) : undefined}
      onClose={wide ? undefined : () => setDrawerOpen(false)}
    />
  );

  const body = (() => {
    if (openNoteRecord) {
      return (
        <NotePage
          note={openNoteRecord}
          labor={labor.get(openNoteRecord.id)}
          onBack={closeNote}
          onSave={save}
          onHarvest={harvest}
          onDelete={remove}
          onHint={setHint}
          onOpenSidebar={openSidebar}
          favorite={openNoteRecord.favorited_at !== null}
          onToggleFavorite={() => void toggleFavorite(openNoteRecord.id)}
        />
      );
    }

    if (loading) {
      return (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.textMuted} />
        </View>
      );
    }

    const searching = search.trim().length > 0;

    switch (view) {
      case 'home':
        return (
          <HomeView
            notes={notes}
            labor={labor}
            now={now}
            inventoryCount={inventory.items.length}
            onOpen={openNote}
            onTend={handleTend}
            onHarvest={handleHarvest}
            onAdd={startAdding}
            onSelectView={selectView}
          />
        );
      case 'upcoming':
        return (
          <UpcomingView
            notes={notes}
            labor={labor}
            now={now}
            onOpen={openNote}
            onTend={handleTend}
            onHarvest={handleHarvest}
          />
        );
      case 'inventory':
        return <InventoryView inventory={inventory} />;
      case 'stats':
        return (
          <StatsView notes={notes} labor={labor} now={now} inventory={inventory} />
        );
      case 'settings':
        return (
          <SettingsView noteCount={notes.length} inventoryCount={inventory.items.length} />
        );
      case 'guide':
        return <GuideView onAdd={startAdding} />;
      case 'list':
        return (
          <ListView
            notes={filtered}
            labor={labor}
            now={now}
            searching={searching}
            onOpen={openNote}
            onTend={handleTend}
            onAdd={startAdding}
            onSelectTab={selectView}
          />
        );
      case 'board':
        return (
          <BoardView
            notes={filtered}
            labor={labor}
            now={now}
            onOpen={openNote}
            onTend={handleTend}
            onAdd={startAdding}
            onSelectTab={selectView}
          />
        );
      case 'farm':
        return (
          <FarmView
            notes={filtered}
            labor={labor}
            now={now}
            onOpen={openNote}
            onTend={handleTend}
            onHarvest={handleHarvest}
            onBlocked={handleBlocked}
            onAdd={startAdding}
            onSelectTab={selectView}
          />
        );
    }
  })();

  // Not sayfasının kendi üst çubuğu var, orada bunu çizmiyoruz.
  const pageKey = openNoteRecord ? `note-${openNoteRecord.id}` : `view-${view}`;
  const meta = VIEW_META[view];

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.layout}>
        {wide ? (
          <CollapsibleSidebar hidden={sidebarHidden}>{sidebar}</CollapsibleSidebar>
        ) : null}

        <View style={styles.content}>
          {openNoteRecord ? null : (
            <TopBar
              crumbs={[{ label: meta.label, emoji: meta.emoji, icon: meta.icon }]}
              onOpenSidebar={openSidebar}
            />
          )}
          <FadeIn key={pageKey} style={styles.page} offset={8}>
            {body}
          </FadeIn>
        </View>
      </View>

      {!wide ? (
        <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
          {sidebar}
        </Drawer>
      ) : null}

      <AddSeedSheet visible={adding} onClose={() => setAdding(false)} onPlant={plant} />

      <HintToast message={hint} onHide={() => setHint(null)} />
    </SafeAreaView>
  );
}

// Geniş ekrandaki kenar çubuğu. Gizlerken genişliği 0'a iniyor.
// İçerisi sabit genişlikte kalıyor, yoksa kapanırken yazılar alt satıra kayıyordu.
function CollapsibleSidebar({
  hidden,
  children,
}: {
  hidden: boolean;
  children: React.ReactNode;
}) {
  const styles = useStyles();
  const width = useSharedValue(hidden ? 0 : SIDEBAR_WIDTH);
  useEffect(() => {
    width.value = withTiming(hidden ? 0 : SIDEBAR_WIDTH, {
      duration: durations.slow,
      easing: easings.out,
    });
  }, [hidden, width]);
  const style = useAnimatedStyle(() => ({ width: width.value }));
  return (
    <Animated.View style={[styles.sidebarSlot, style]}>
      <View style={styles.sidebarInner}>{children}</View>
    </Animated.View>
  );
}

/**
 * Dar ekrandaki kenar çubuğu, soldan kayan örtü.
 *
 * RN Modal kullanmadım. Kabuk zaten tam ekran, örtüyü aynı ağaçta tutunca hem
 * jestler hem klavye daha kolay oluyor. BottomSheet'teki iç içe modal
 * sorunlarının hiçbiri burada yok.
 */
function Drawer({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const styles = useStyles();
  // Kapanış animasyonu oynasın diye kısa süre ekranda kalıyor.
  const [mounted, setMounted] = useState(open);
  const progress = useSharedValue(0);

  useEffect(() => {
    if (open) {
      setMounted(true);
      progress.value = withTiming(1, {
        duration: durations.base,
        easing: easings.out,
      });
      return;
    }
    progress.value = withTiming(
      0,
      { duration: durations.fast, easing: easings.in },
      (finished) => {
        if (finished) runOnJS(setMounted)(false);
      },
    );
  }, [open, progress]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value * 0.45,
  }));

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (progress.value - 1) * SIDEBAR_WIDTH }],
  }));

  if (!mounted) return null;

  return (
    <View style={styles.drawerRoot}>
      <Animated.View style={[styles.drawerBackdrop, backdropStyle]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Kenar çubuğunu kapat"
        />
      </Animated.View>
      <Animated.View style={[styles.drawerPanel, panelStyle]}>{children}</Animated.View>
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  layout: { flex: 1, flexDirection: 'row' },
  sidebarSlot: { overflow: 'hidden' },
  sidebarInner: { width: SIDEBAR_WIDTH, flex: 1 },
  content: { flex: 1, backgroundColor: colors.surface },
  page: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  drawerRoot: { ...StyleSheet.absoluteFill, flexDirection: 'row' },
  drawerBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: colors.backdrop },
  drawerPanel: { width: SIDEBAR_WIDTH },
}));
