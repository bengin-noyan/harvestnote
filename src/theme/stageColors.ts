/**
 * Görsel aşamaların renkleri.
 *
 * Neden `game/stages.ts`'te değil: orası saf kurallar katmanı — DB'si, React'i
 * ve artık teması da yok. Test çerçevesi kurulu olmadığı için oyun kuralları
 * `node stages.ts` ile doğrudan çalıştırılarak doğrulanıyor; o dosyaya bir
 * `react-native` bağımlılığı sızarsa (theme `StyleSheet` kullanıyor) bu imkân
 * kaybolur. Aşama *ne olduğunu* bilir, *neye benzediğini* bilmez.
 *
 * Buradaki tip importu yalnızca tip — derlemede silinir, çalışma zamanında
 * theme ile game arasında bağ kurmaz.
 */
import type { VisualStage } from '../game/stages';
import { colors } from './index';

export interface StagePalette {
  /** Parselin toprağı. Yalnızca ot basmış parsel zeminini değiştirir. */
  tile: string;
  /** Koyu parsel kartının kenarlığı. */
  border: string;
  /**
   * Aşamayı **aydınlık zeminde** temsil eden renk: başlıktaki sayaç çipi,
   * detay panelindeki durum rozeti. `border` ile karıştırılmamalı — o toprak
   * üstünde, bu kağıt üstünde okunacak şekilde seçildi.
   */
  accent: string;
}

export const STAGE_COLORS: Record<VisualStage, StagePalette> = {
  planted: {
    tile: colors.soil,
    border: colors.soilLight,
    accent: colors.soilLight,
  },
  growing: {
    tile: colors.soil,
    border: colors.leaf,
    accent: colors.leafDeep,
  },
  harvestable: {
    tile: colors.soil,
    border: colors.gold,
    accent: colors.goldDeep,
  },
  weedy: {
    tile: colors.weedDeep,
    border: colors.weed,
    accent: colors.weed,
  },
};
