// Tohum ekleme paneli: başlık, detay, tohum türü.
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { DEFAULT_SEED_TYPE, SEED_CATALOG } from '../game/config';
import { borders, radii, spacing, typography } from '../theme';
import type { CreateNoteInput, SeedType } from '../types';
import { BottomSheet } from './BottomSheet';
import { PixelButton } from './PixelButton';
import { SeedPicker } from './SeedPicker';
import { makeStyles, useTheme } from '../theme/ThemeProvider';

interface Props {
  visible: boolean;
  onClose: () => void;
  onPlant: (input: CreateNoteInput) => Promise<void>;
}

export function AddSeedSheet({ visible, onClose, onPlant }: Props) {
  const { colors } = useTheme();
  const styles = useStyles();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [seedType, setSeedType] = useState<SeedType>(DEFAULT_SEED_TYPE);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Panel her açılışta temiz gelsin.
  useEffect(() => {
    if (!visible) return;
    setTitle('');
    setContent('');
    setSeedType(DEFAULT_SEED_TYPE);
    setError(null);
    setSaving(false);
  }, [visible]);

  const handlePlant = async () => {
    if (!title.trim()) {
      setError('Tohumun bir adı olmalı.');
      return;
    }
    setSaving(true);
    try {
      await onPlant({
        title,
        content: content.trim() ? content : null,
        seed_type: seedType,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Tohum ekilemedi.');
      setSaving(false);
    }
  };

  const seed = SEED_CATALOG[seedType];

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Tohum Ek"
      subtitle="Her görev toprağa düşen bir tohumdur"
    >
      <ScrollView keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Görev adı</Text>
        <TextInput
          value={title}
          onChangeText={(text) => {
            setTitle(text);
            if (error) setError(null);
          }}
          placeholder="Örn. Sulama sistemini onar"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          maxLength={80}
          returnKeyType="next"
        />

        <Text style={styles.label}>Detay</Text>
        <TextInput
          value={content}
          onChangeText={setContent}
          placeholder="İstersen birkaç not düş…"
          placeholderTextColor={colors.textMuted}
          style={[styles.input, styles.multiline]}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <Text style={styles.label}>Tohum türü</Text>
        <SeedPicker value={seedType} onChange={setSeedType} />
        <Text style={styles.seedNote}>
          {seed.emoji} {seed.label} — {seed.hint}. Olgunlaşınca yukarı kaydırıp
          hasat edeceksin.
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.actions}>
          <PixelButton
            label={saving ? 'Ekiliyor…' : 'Toprağa Ek'}
            icon="🌱"
            onPress={handlePlant}
            disabled={saving}
          />
        </View>
      </ScrollView>
    </BottomSheet>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  label: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  input: {
    ...typography.bodyLarge,
    color: colors.textPrimary,
    backgroundColor: colors.surfaceSunken,
    borderWidth: borders.hairline,
    borderColor: colors.rule,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  multiline: { minHeight: 92 },
  seedNote: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.sm,
    lineHeight: 16,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
    marginTop: spacing.md,
  },
  actions: { marginTop: spacing.xl, marginBottom: spacing.md },
}));
