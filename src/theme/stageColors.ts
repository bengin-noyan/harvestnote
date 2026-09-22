/**
 * Aşamaların renkleri.
 *
 * Bunlar neden stages.ts'te değil: test kurulu olmadığı için kuralları
 * `node stages.ts` diye çalıştırıp deniyorum. theme StyleSheet kullandığı
 * için oraya import edersem react-native de geliyor ve dosya çalışmıyor.
 * Yani stages aşamayı biliyor, rengini bilmiyor.
 *
 * Aşağıdaki import type'lı, derlemede siliniyor.
 */
import type { VisualStage } from '../game/stages';
import { colors } from './index';

export interface StagePalette {
  /** Parselin toprak rengi. Sadece otlu parselde değişiyor. */
  tile: string;
  /** Koyu parsel kartının kenarlığı. */
  border: string;
  /**
   * Açık zeminde kullanılan renk: başlıktaki sayaç, detaydaki rozet.
   * `border` ile karıştırmayın, o koyu toprağın üstünde duruyor.
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
