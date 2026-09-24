// Uygulamadaki sayfaların listesi. Kenar çubuğu, üst çubuk ve AppShell
// hepsi buradan okuyor.
import type { IconName } from '../components/ui/Icon';

export type WorkspaceView =
  | 'home'
  | 'upcoming'
  | 'farm'
  | 'list'
  | 'board'
  | 'inventory'
  | 'stats'
  | 'settings'
  | 'guide';

// Tarla sayfasındaki sekmeler
export type FieldTab = 'farm' | 'list' | 'board';

export function isFieldTab(view: WorkspaceView): view is FieldTab {
  return view === 'farm' || view === 'list' || view === 'board';
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
  inventory: { label: 'Kiler', emoji: '🧺' },
  stats: { label: 'İstatistikler', icon: 'bar-chart-2' },
  settings: { label: 'Ayarlar', icon: 'settings' },
  guide: { label: 'Rehber', icon: 'book-open' },
};
