// Uygulamadaki sayfaların listesi. Kenar çubuğu, üst çubuk ve AppShell
// hepsi buradan okuyor.
import type { IconName } from '../components/ui/Icon';

export type WorkspaceView =
  | 'home'
  | 'upcoming'
  | 'farm'
  | 'list'
  | 'board'
  | 'calendar'
  | 'inventory'
  | 'stats'
  | 'settings'
  | 'guide';

// Tarla sayfasındaki sekmeler
export type FieldTab = 'farm' | 'list' | 'board' | 'calendar';

export const FIELD_TAB_KEYS: FieldTab[] = ['farm', 'list', 'board', 'calendar'];

export function isFieldTab(view: string): view is FieldTab {
  return (FIELD_TAB_KEYS as string[]).includes(view);
}

// Pano neye göre sütunlara ayrılıyor
export type BoardGroup = 'stage' | 'priority' | 'tag';

export const BOARD_GROUPS: BoardGroup[] = ['stage', 'priority', 'tag'];

export function isBoardGroup(value: string): value is BoardGroup {
  return (BOARD_GROUPS as string[]).includes(value);
}

interface ViewMeta {
  label: string;
  // Tarla ve Kiler emoji kullanıyor, diğerleri çizgi simge
  emoji?: string;
  icon?: IconName;
}

export const VIEW_META: Record<WorkspaceView, ViewMeta> = {
  home: { label: 'Ana sayfa', icon: 'home' },
  upcoming: { label: 'Yaklaşanlar', icon: 'bell' },
  farm: { label: 'Tarla', emoji: '🌾' },
  list: { label: 'Tarla', emoji: '🌾' },
  board: { label: 'Tarla', emoji: '🌾' },
  calendar: { label: 'Tarla', emoji: '🌾' },
  inventory: { label: 'Kiler', emoji: '🧺' },
  stats: { label: 'İstatistikler', icon: 'bar-chart-2' },
  settings: { label: 'Ayarlar', icon: 'settings' },
  guide: { label: 'Rehber', icon: 'book-open' },
};
