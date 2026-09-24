/**
 * Rehber sayfası, oyunun kurallarını anlatıyor.
 *
 * Süreleri game/config'ten okuyorum, kurallar değişirse yazı da değişsin diye.
 */
import React from 'react';
import { Text, View } from 'react-native';

import { PixelButton } from '../components/PixelButton';
import { FadeIn } from '../components/ui/FadeIn';
import { Callout, Page } from '../components/ui/Page';
import { Tag } from '../components/ui/Tag';
import { DEFAULT_GROWTH_RULES, SEED_CATALOG, WEED_REMINDER_LEAD_MS } from '../game/config';
import { STAGE_VISUALS, type VisualStage } from '../game/stages';
import { spacing, typography } from '../theme';
import { makeStyles, useTheme } from '../theme/ThemeProvider';
import { SEED_TYPES } from '../types';
import { formatDuration } from '../utils/format';

const STAGE_TEXT: Record<VisualStage, string> = {
  planted: 'Yeni ekildi. Henüz filizlenmedi.',
  growing: 'Filizlendi, olgunlaşıyor. İçindeki işleri bitirdikçe hızlanır.',
  harvestable: 'Olgun. Tarlada yukarı kaydır ya da uzun bas, kilere altın kalitede düşsün.',
  weedy: 'Uzun süre ilgilenilmedi. Açılmaz, önce yana kaydırıp otları temizlemen gerekir.',
};

export function GuideView({ onAdd }: { onAdd: () => void }) {
  const styles = useStyles();
  const { stages } = useTheme();
  const weedAfter = formatDuration(DEFAULT_GROWTH_RULES.weedThresholdMs);

  return (
    <Page icon="book-open" title="Rehber" description="HarvestNote nasıl çalışır?" maxWidth={720}>
      <FadeIn>
        <Text style={styles.h2}>Her not bir tohum</Text>
        <Text style={styles.p}>
          Yeni bir not açtığında toprağa bir tohum ekmiş olursun. Not, sen yazdıkça ve
          içindeki yapılacakları bitirdikçe büyür. Sayfanın tepesindeki bitki bunu gösterir.
        </Text>

        <Text style={styles.h2}>Aşamalar</Text>
        {(Object.keys(STAGE_TEXT) as VisualStage[]).map((stage) => (
          <View key={stage} style={styles.stageRow}>
            <View style={styles.stageTag}>
              <Tag label={STAGE_VISUALS[stage].label} color={stages[stage].tag} />
            </View>
            <Text style={[styles.p, styles.flex]}>{STAGE_TEXT[stage]}</Text>
          </View>
        ))}

        <Text style={styles.h2}>Emek olgunluğu hızlandırır</Text>
        <Text style={styles.p}>
          Nota yapılacak (☑) bloğu eklersen olgunluğun yarısı zamandan, yarısı işaretli
          kutulardan gelir. Hepsini işaretlediğinde not, yaşına bakılmadan hasada hazır olur.
        </Text>
        <Callout icon="💡">
          <Text style={styles.p}>
            Yarısı biten bir not sadece zamanla olgunlaşmaz. Ürünü olgunlaştıran şey işi
            bitirmek.
          </Text>
        </Callout>

        <Text style={styles.h2}>Ot basması</Text>
        <Text style={styles.p}>
          Bir nota {weedAfter} boyunca dokunmazsan ot basar. Düzenlemek ya da otları
          temizlemek sayacı sıfırlar. Ot basmadan {formatDuration(WEED_REMINDER_LEAD_MS)} önce bildirim gelir, Yaklaşanlar
          sayfası da hangi notun ne zaman ilgi isteyeceğini gösterir.
        </Text>

        <Text style={styles.h2}>Tohum türleri</Text>
        {SEED_TYPES.map((type) => {
          const seed = SEED_CATALOG[type];
          return (
            <View key={type} style={styles.seedRow}>
              <Text style={styles.seedEmoji}>{seed.emoji}</Text>
              <Text style={[styles.p, styles.flex]}>
                <Text style={styles.strong}>{seed.label}</Text> · {seed.hint} ·{' '}
                {formatDuration(seed.maturityDurationMs)} sürede olgunlaşır · {seed.value} puan
              </Text>
            </View>
          );
        })}

        <Text style={styles.h2}>Hasat ve kiler</Text>
        <Text style={styles.p}>
          Hasat notu silmez, tarladan kaldırıp kilere koyar. Olgunken toplanan ürün altın,
          erken toplanan normal, otluyken toplanan solmuş kalitede olur. Puanın kilerde
          birikir.
        </Text>

        <View style={styles.cta}>
          <PixelButton label="Bir tohum ek" onPress={onAdd} />
        </View>
      </FadeIn>
    </Page>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  h2: {
    ...typography.section,
    color: colors.textPrimary,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  p: { ...typography.bodyLarge, color: colors.textPrimary },
  strong: { fontWeight: '600' },
  flex: { flex: 1 },
  stageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  stageTag: { width: 120, paddingTop: 2 },
  seedRow: { flexDirection: 'row', gap: spacing.sm, paddingVertical: 2 },
  seedEmoji: { fontSize: 18, lineHeight: 24 },
  cta: { marginTop: spacing.xl, alignItems: 'flex-start' },
}));
