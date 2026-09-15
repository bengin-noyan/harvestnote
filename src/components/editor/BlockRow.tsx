/**
 * Tek bir bloğun satırı: tutamak + önek (kutu / madde imi / numara) + metin.
 *
 * Satır *aptal*: kendi metnini bilir, kendi kaydını bilmez. Enter, Backspace
 * ve `/` yorumlaması BlockEditor'da — o kararlar komşu bloklara bakmayı
 * gerektiriyor, satırın komşusu yok.
 *
 * Tür menüsü neden uzun basışla değil tutamakla açılıyor: RN'de `TextInput`
 * `onLongPress` almıyor, dokunuşu metin seçimi için kendi yutuyor. Sarmalayan
 * bir `Pressable` de aynı nedenle güvenilmez. Tutamak ayrıca "bloğu sil"in
 * garantili yolu — Android'de boş kutuda Backspace tetiklenmeyebiliyor.
 */
import React, { useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type TextInputContentSizeChangeEventData,
  type TextInputKeyPressEventData,
  type TextInputSelectionChangeEventData,
  type TextStyle,
} from 'react-native';

import { borders, colors, fonts, radii, spacing, typography } from '../../theme';
import type { BlockType, NoteBlock } from '../../types';
import { BLOCK_META } from './blockMeta';

interface Props {
  block: NoteBlock;
  /** `numbered` bloklarda gösterilecek sıra; diğerlerinde kullanılmaz. */
  ordinal: number;
  /** Bu blok yazılıyorsa tutamak koyulaşır. */
  active: boolean;
  registerRef: (id: number, ref: TextInput | null) => void;
  onChangeText: (text: string) => void;
  onKeyPress: (
    event: NativeSyntheticEvent<TextInputKeyPressEventData>,
  ) => void;
  onSelectionChange: (
    event: NativeSyntheticEvent<TextInputSelectionChangeEventData>,
  ) => void;
  onFocus: () => void;
  onToggleCheck: () => void;
  onOpenMenu: () => void;
}

export function BlockRow({
  block,
  ordinal,
  active,
  registerRef,
  onChangeText,
  onKeyPress,
  onSelectionChange,
  onFocus,
  onToggleCheck,
  onOpenMenu,
}: Props) {
  const meta = BLOCK_META[block.type];
  const done = block.type === 'todo' && block.checked;

  /**
   * Kutu içeriğine sarılsın.
   *
   * Çok satırlı `TextInput` web'de `<textarea>` oluyor ve textarea kendi
   * içeriğine göre büyümüyor — varsayılan iki satırlık yüksekliğinde
   * kalıyordu, yani her blok arasında bir satırlık ölü boşluk vardı.
   * `onContentSizeChange` iki platformda da ölçüyü veriyor; yüksekliği
   * oradan alıyoruz.
   */
  const [contentHeight, setContentHeight] = useState<number | null>(null);
  const handleContentSize = (
    event: NativeSyntheticEvent<TextInputContentSizeChangeEventData>,
  ) => {
    setContentHeight(event.nativeEvent.contentSize.height);
  };

  const handle = (
    <Pressable
      onPress={onOpenMenu}
      hitSlop={spacing.sm}
      style={styles.handle}
      accessibilityRole="button"
      accessibilityLabel={`${meta.label} bloğu — tür ve silme seçenekleri`}
    >
      <Text style={[styles.handleGlyph, active ? styles.handleActive : null]}>
        ⋮
      </Text>
    </Pressable>
  );

  if (!meta.hasText) {
    return (
      <View style={styles.dividerRow}>
        {handle}
        <View style={styles.dividerLine} />
      </View>
    );
  }

  return (
    <View style={[styles.row, block.type === 'quote' ? styles.quoteRow : null]}>
      {handle}

      <Prefix
        type={block.type}
        ordinal={ordinal}
        checked={block.checked}
        onToggleCheck={onToggleCheck}
      />

      <TextInput
        ref={(ref) => registerRef(block.id, ref)}
        value={block.text ?? ''}
        onChangeText={onChangeText}
        onKeyPress={onKeyPress}
        onSelectionChange={onSelectionChange}
        onFocus={onFocus}
        placeholder={meta.placeholder}
        placeholderTextColor={colors.textMuted}
        onContentSizeChange={handleContentSize}
        style={[
          styles.input,
          TEXT_STYLE[block.type],
          done ? styles.done : null,
          contentHeight !== null ? { height: contentHeight } : null,
          WEB_INPUT_RESET,
        ]}
        multiline
        /**
         * Çok satırlı TextInput kendi kaydırmasını açtığında Android'de
         * ebeveyn ScrollView ile çakışıyor ve blok sabit yükseklikte kalıyor.
         * Kapatınca kutu içeriği kadar uzuyor — istediğimiz de bu.
         */
        scrollEnabled={false}
        textAlignVertical="top"
        autoCapitalize={block.type === 'code' ? 'none' : 'sentences'}
        autoCorrect={block.type !== 'code'}
        /** Enter satır sonu üretsin: bölme kararını editör veriyor. */
        blurOnSubmit={false}
        accessibilityLabel={`${meta.label} bloğu`}
      />
    </View>
  );
}

function Prefix({
  type,
  ordinal,
  checked,
  onToggleCheck,
}: {
  type: BlockType;
  ordinal: number;
  checked: boolean;
  onToggleCheck: () => void;
}) {
  if (type === 'todo') {
    return (
      <Pressable
        onPress={onToggleCheck}
        /** Kutu 18px; dokunma hedefi parmak için genişletiliyor. */
        hitSlop={spacing.sm}
        style={styles.prefix}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel={checked ? 'İşareti kaldır' : 'Yapıldı işaretle'}
      >
        <View style={[styles.checkbox, checked ? styles.checkboxOn : null]}>
          {checked ? <Text style={styles.tick}>✓</Text> : null}
        </View>
      </Pressable>
    );
  }

  if (type === 'bullet') {
    return (
      <View style={styles.prefix}>
        <Text style={styles.marker}>•</Text>
      </View>
    );
  }

  if (type === 'numbered') {
    return (
      <View style={styles.prefix}>
        <Text style={styles.marker}>{ordinal}.</Text>
      </View>
    );
  }

  return null;
}

/**
 * Web'de tarayıcı odaklanan her textarea'ya kendi siyah çerçevesini çiziyor;
 * belge yüzeyinde bu, yazdığın satırın etrafında bir kutu demek. Odak zaten
 * imleçle ve tutamağın koyulaşmasıyla belli oluyor.
 *
 * `outlineStyle` RN'in tip tanımında yok ama react-native-web destekliyor.
 */
const WEB_INPUT_RESET = Platform.OS === 'web'
  ? ({ outlineStyle: 'none' } as unknown as TextStyle)
  : null;

/** Tür başına metin görünümü. Ölçekler theme'den gelir. */
const TEXT_STYLE: Record<BlockType, TextStyle> = {
  paragraph: { ...typography.bodyLarge, color: colors.textPrimary },
  heading: { ...typography.blockHeading, color: colors.textPrimary },
  todo: { ...typography.bodyLarge, color: colors.textPrimary },
  bullet: { ...typography.bodyLarge, color: colors.textPrimary },
  numbered: { ...typography.bodyLarge, color: colors.textPrimary },
  quote: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  divider: {},
  code: {
    ...typography.body,
    fontFamily: fonts.mono,
    color: colors.textPrimary,
  },
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  /** Alıntı solundaki çizgiyle anlatılıyor; önek simgesi yok. */
  quoteRow: {
    borderLeftWidth: borders.thick,
    borderLeftColor: colors.ruleStrong,
  },
  /**
   * Tutamak her satırda yer kaplar ama silik durur: yerini ayırmasaydık
   * odaklanınca bütün satır sağa kayardı.
   */
  handle: {
    width: 18,
    paddingTop: spacing.xs + 2,
    alignItems: 'center',
  },
  handleGlyph: { ...typography.body, color: colors.rule },
  handleActive: { color: colors.textMuted },
  input: {
    flex: 1,
    paddingVertical: spacing.xs,
    /**
     * Android TextInput'un gizli varsayılan yatay dolgusu var; sıfırlanmazsa
     * metin öneke göre kaymış duruyor.
     */
    paddingHorizontal: 0,
  },
  done: { color: colors.textMuted, textDecorationLine: 'line-through' },
  /**
   * Önek metnin ilk satırıyla hizalanmalı. `bodyLarge` satır yüksekliği 26;
   * üstteki 4px dolgu buna eklenince simge tam ortaya oturuyor.
   */
  prefix: {
    width: 26,
    paddingTop: spacing.xs + 3,
    alignItems: 'flex-start',
  },
  marker: { ...typography.bodyLarge, color: colors.textMuted },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: radii.sm - 2,
    borderWidth: borders.width,
    borderColor: colors.ruleStrong,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  checkboxOn: {
    backgroundColor: colors.leafDeep,
    borderColor: colors.leafDeep,
  },
  tick: { color: colors.surface, fontSize: 12, lineHeight: 14, fontWeight: '800' },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: borders.hairline,
    backgroundColor: colors.ruleStrong,
  },
});
