/**
 * Bir bloğun satırı: tutamak + önek (kutu / madde imi / numara) + metin.
 *
 * Satır sadece kendi metnini biliyor, kaydetmeyi bilmiyor. Enter, Backspace ve
 * `/` kararları BlockEditor'da duruyor çünkü komşu bloklara bakmak gerekiyor,
 * satırın komşusundan haberi yok.
 *
 * Tür menüsü neden uzun basışta değil de tutamakta: RN'de TextInput
 * onLongPress almıyor, dokunuşu metin seçimi için kendi yutuyor. Etrafına
 * Pressable koymak da aynı sebeple çalışmıyor. Tutamak ayrıca "bloğu sil"in
 * garantili yolu, Android'de boş kutuda Backspace tetiklenmeyebiliyor.
 */
import React, { useEffect, useRef, useState } from 'react';
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

import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { borders, fonts, radii, spacing, typography } from '../../theme';
import { durations, easings, springs } from '../../theme/motion';
import type { BlockType, NoteBlock } from '../../types';
import { BLOCK_META } from './blockMeta';
import { makeStyles, useTheme } from '../../theme/ThemeProvider';

interface Props {
  block: NoteBlock;
  /** numbered bloklarda gösterilen sıra. Diğerlerinde kullanılmıyor. */
  ordinal: number;
  /** Bu blokta yazılıyorsa tutamak koyulaşıyor. */
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
  const textStyles = useTextStyles();
  const { colors } = useTheme();
  const styles = useStyles();
  const meta = BLOCK_META[block.type];
  const done = block.type === 'todo' && block.checked;

  /**
   * Kutu içeriği kadar olsun.
   *
   * Çok satırlı TextInput web'de <textarea> oluyor ve textarea içeriğine göre
   * büyümüyor, varsayılan iki satır yüksekliğinde kalıyordu. Yani her blok
   * arasında bir satır boşluk vardı. onContentSizeChange iki platformda da
   * ölçüyü veriyor, yüksekliği oradan alıyoruz.
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
          textStyles[block.type],
          done ? styles.done : null,
          contentHeight !== null ? { height: contentHeight } : null,
          WEB_INPUT_RESET,
        ]}
        multiline
        /**
         * Çok satırlı TextInput kendi scroll'unu açınca Android'de üstteki
         * ScrollView ile çakışıyor ve blok sabit yükseklikte kalıyor.
         * Kapatınca kutu içerik kadar uzuyor, istediğimiz de bu.
         */
        scrollEnabled={false}
        textAlignVertical="top"
        autoCapitalize={block.type === 'code' ? 'none' : 'sentences'}
        autoCorrect={block.type !== 'code'}
        /** Enter satır sonu bıraksın, bölme kararını editör veriyor. */
        blurOnSubmit={false}
        accessibilityLabel={`${meta.label} bloğu`}
      />
    </View>
  );
}

// İşaretleyince kutu bir an büyüyüp geri küçülüyor.
function Checkbox({ checked }: { checked: boolean }) {
  const styles = useStyles();
  const scale = useSharedValue(1);
  const first = useRef(true);
  useEffect(() => {
    // sayfa ilk açılırken oynamasın diye
    if (first.current) {
      first.current = false;
      return;
    }
    if (checked) {
      scale.value = withSequence(
        withTiming(1.25, { duration: durations.fast, easing: easings.out }),
        withSpring(1, springs.settle),
      );
    }
  }, [checked, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View
      style={[styles.checkbox, checked ? styles.checkboxOn : null, style]}
    >
      {checked ? <Text style={styles.tick}>✓</Text> : null}
    </Animated.View>
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
  const styles = useStyles();
  if (type === 'todo') {
    return (
      <Pressable
        onPress={onToggleCheck}
        /** Kutu 18px, parmak için dokunma alanını genişletiyoruz. */
        hitSlop={spacing.sm}
        style={styles.prefix}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel={checked ? 'İşareti kaldır' : 'Yapıldı işaretle'}
      >
        <Checkbox checked={checked} />
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
 * Web'de tarayıcı odaklanan textarea'ya kendi siyah çerçevesini çiziyor, yani
 * yazdığın satırın etrafında kutu çıkıyor. Odak zaten imleçten ve tutamağın
 * koyulaşmasından belli oluyor.
 *
 * outlineStyle RN'in tiplerinde yok ama react-native-web destekliyor.
 */
const WEB_INPUT_RESET = Platform.OS === 'web'
  ? ({ outlineStyle: 'none' } as unknown as TextStyle)
  : null;

/** Tür başına metin stili. Ölçekler theme'den geliyor. */
const useTextStyles = makeStyles(({ colors }): Record<BlockType, TextStyle> => ({
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
}));

const useStyles = makeStyles(({ colors }) => ({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  /** Alıntıyı soldaki çizgi anlatıyor, ayrı bir önek simgesi yok. */
  quoteRow: {
    borderLeftWidth: borders.thick,
    borderLeftColor: colors.ruleStrong,
  },
  /**
   * Tutamak her satırda yer kaplıyor ama soluk duruyor. Yerini ayırmasak
   * odaklanınca bütün satır sağa kayıyor.
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
     * Android TextInput'un gizli bir varsayılan yatay padding'i var,
     * sıfırlamazsak metin öneke göre kaymış duruyor.
     */
    paddingHorizontal: 0,
  },
  done: { color: colors.textMuted, textDecorationLine: 'line-through' },
  /**
   * Önek metnin ilk satırıyla hizalanmalı. bodyLarge'ın satır yüksekliği 26,
   * üstteki 4px padding'le birlikte simge tam ortaya oturuyor.
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
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  // işaretli kutu mavi
  checkboxOn: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
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
}));
