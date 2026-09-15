/**
 * Çalışma alanı kabuğu — uygulamanın iskeleti.
 *
 * Alt sekmeli navigasyonun yerini aldı. Sebep düzen: kenar çubuğu + içerik
 * sütunu, React Navigation'ın ekran/sekme kaplarıyla sürekli çatışıyordu ve
 * burada en fazla iki seviyelik bir yığın var (görünüm → not sayfası). O
 * kadarı düz state ile daha az kodla ve tam düzen denetimiyle kuruluyor;
 * karşılığında Android geri tuşunu elle bağlamak gerekiyor (aşağıda).
 *
 * Tüm not verisi burada tek `useNotes()` çağrısından geliyor ve aşağı prop
 * olarak iniyor. Kenar çubuğu, liste ve tarla ayrı ayrı çağırsaydı her
 * `revision` artışında aynı sorgu üç kez koşardı.
 *
 * Geniş ekranda kenar çubuğu kalıcı, dar ekranda üstten gelen bir çekmece —
 * aynı bileşen, iki yerleşim.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Pressable,
  StyleSheet,
  Text,
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
import { resolveStage } from '../game/stages';
import { useNotes } from '../hooks/useNotes';
import { useNow } from '../hooks/useNow';
import { useReminderTap } from '../hooks/useReminderTap';
import { FarmView } from '../screens/FarmView';
import { InventoryView } from '../screens/InventoryView';
import { ListView } from '../screens/ListView';
import { NotePage } from '../screens/NotePage';
import { borders, colors, radii, spacing, typography } from '../theme';
import { durations, easings } from '../theme/motion';
import { Sidebar, SIDEBAR_WIDTH, type WorkspaceView } from './Sidebar';

/**
 * Kenar çubuğunun kalıcı durabilmesi için gereken en az genişlik. 900px
 * altında çubuk içerik sütununu okunamayacak kadar daraltıyor, o yüzden
 * çekmeceye dönüyor.
 */
const WIDE_BREAKPOINT = 900;

const VIEW_TITLES: Record<WorkspaceView, string> = {
  farm: 'Tarla',
  list: 'Liste',
  inventory: 'Kiler',
};

export function AppShell() {
  const { notes, labor, loading, plant, tend, harvest, save, remove } = useNotes();
  const now = useNow();
  const { width } = useWindowDimensions();
  const wide = width >= WIDE_BREAKPOINT;

  const [view, setView] = useState<WorkspaceView>('farm');
  const [openNoteId, setOpenNoteId] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [hint, setHint] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  /** Bildirimden gelen not; liste henüz yüklenmemiş olabilir. */
  const [pendingNoteId, setPendingNoteId] = useState<number | null>(null);

  useReminderTap(setPendingNoteId);

  const openNote = useCallback(
    (id: number) => {
      const target = notes.find((note) => note.id === id);
      // Ot basmış not açılmaz — kartın ürün kuralı burada da geçerli.
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
    setOpenNoteId(null);
    setDrawerOpen(false);
  }, []);

  /**
   * Android donanım geri tuşu. React Navigation gittiği için yığın burada
   * elle çözülüyor: önce açık not, sonra çekmece, sonra uygulamadan çıkış.
   */
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (openNoteId !== null) {
          setOpenNoteId(null);
          return true;
        }
        if (drawerOpen) {
          setDrawerOpen(false);
          return true;
        }
        return false;
      },
    );
    return () => subscription.remove();
  }, [openNoteId, drawerOpen]);

  // Bildirime dokunuldu: not yüklendiğinde aç.
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
      onSelectNote={openNote}
      onAdd={() => {
        setAdding(true);
        setDrawerOpen(false);
      }}
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
        />
      );
    }

    if (loading) {
      return (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.leafDeep} />
        </View>
      );
    }

    if (view === 'inventory') return <InventoryView />;

    if (view === 'list') {
      return (
        <ListView
          notes={filtered}
          labor={labor}
          now={now}
          searching={search.trim().length > 0}
          onOpen={openNote}
          onTend={handleTend}
          onAdd={() => setAdding(true)}
        />
      );
    }

    return (
      <FarmView
        notes={filtered}
        labor={labor}
        now={now}
        onOpen={openNote}
        onTend={handleTend}
        onHarvest={handleHarvest}
        onBlocked={handleBlocked}
        onAdd={() => setAdding(true)}
      />
    );
  })();

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.layout}>
        {wide ? <View style={styles.sidebarSlot}>{sidebar}</View> : null}

        <View style={styles.content}>
          {/*
            Dar ekranda çekmeceyi açan şerit. Not sayfası açıkken gizli:
            NotePage kendi geri çubuğunu taşıyor, iki üst üste şerit olmasın.
          */}
          {!wide && !openNoteRecord ? (
            <View style={styles.topBar}>
              <Pressable
                onPress={() => setDrawerOpen(true)}
                hitSlop={spacing.sm}
                style={({ pressed }) => [
                  styles.menuButton,
                  pressed ? styles.pressed : null,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Kenar çubuğunu aç"
              >
                <Text style={styles.menuGlyph}>☰</Text>
              </Pressable>
              <Text style={styles.topTitle}>{VIEW_TITLES[view]}</Text>
            </View>
          ) : null}

          {body}
        </View>
      </View>

      {!wide ? (
        <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
          {sidebar}
        </Drawer>
      ) : null}

      <AddSeedSheet
        visible={adding}
        onClose={() => setAdding(false)}
        onPlant={plant}
      />

      <HintToast message={hint} onHide={() => setHint(null)} />
    </SafeAreaView>
  );
}

/**
 * Dar ekranın kenar çubuğu: soldan kayan örtü.
 *
 * RN `Modal` kullanılmıyor — kabuk zaten tam ekran, örtüyü aynı ağaçta
 * tutmak hem jestleri hem klavyeyi basitleştiriyor (BottomSheet'teki iç içe
 * modal sorunlarının hiçbiri burada yok).
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
  // Kapanış animasyonu oynayabilsin diye kısa süre monte kalır.
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
      <Animated.View style={[styles.drawerPanel, panelStyle]}>
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  layout: { flex: 1, flexDirection: 'row' },
  sidebarSlot: { width: SIDEBAR_WIDTH },
  content: { flex: 1, backgroundColor: colors.surface },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: borders.hairline,
    borderBottomColor: colors.rule,
  },
  menuButton: {
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  pressed: { backgroundColor: colors.surfaceSunken },
  menuGlyph: { ...typography.heading, color: colors.textSecondary },
  topTitle: { ...typography.heading, color: colors.textPrimary },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  drawerRoot: { ...StyleSheet.absoluteFill, flexDirection: 'row' },
  drawerBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: colors.bark },
  drawerPanel: { width: SIDEBAR_WIDTH },
});
