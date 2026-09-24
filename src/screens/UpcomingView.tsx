/**
 * Yaklaşanlar sayfası. Hangi notta ne zaman ot basacağını gruplara ayırıp
 * gösteriyor (ot bastı, hasada hazır, bugün, bu hafta, daha sonra).
 *
 * Bildirimler de aynı saate göre kuruluyor, bu sayfa onların listesi gibi.
 */
import React from 'react';
import { Text } from 'react-native';

import { NoteRow } from '../components/NoteRow';
import { FadeIn } from '../components/ui/FadeIn';
import { Callout, Page, Section } from '../components/ui/Page';
import type { TodoCount } from '../db/repositories/blocks';
import { DAY, WEED_REMINDER_LEAD_MS } from '../game/config';
import { msUntilWeedy, resolveStage } from '../game/stages';
import { typography } from '../theme';
import { makeStyles } from '../theme/ThemeProvider';
import type { Note } from '../types';
import { formatDuration } from '../utils/format';

interface Props {
  notes: Note[];
  labor: Map<number, TodoCount>;
  now: number;
  onOpen: (id: number) => void;
  onTend: (id: number) => void;
  onHarvest: (id: number) => void;
}

export function UpcomingView({ notes, labor, now, onOpen, onTend, onHarvest }: Props) {
  const styles = useStyles();

  const entries = notes
    .map((note) => ({
      note,
      stage: resolveStage(note, now, undefined, labor.get(note.id)),
      left: msUntilWeedy(note, now),
    }))
    .sort((a, b) => a.left - b.left);

  const weedy = entries.filter((e) => e.stage === 'weedy');
  const ripe = entries.filter((e) => e.stage === 'harvestable');
  const rest = entries.filter((e) => e.stage !== 'weedy' && e.stage !== 'harvestable');
  const today = rest.filter((e) => e.left < DAY);
  const week = rest.filter((e) => e.left >= DAY && e.left < 7 * DAY);
  const later = rest.filter((e) => e.left >= 7 * DAY);

  const row = (entry: (typeof entries)[number], action?: 'tend' | 'harvest') => (
    <NoteRow
      key={entry.note.id}
      note={entry.note}
      labor={labor.get(entry.note.id)}
      now={now}
      onOpen={onOpen}
      onTend={onTend}
      meta={entry.stage === 'weedy' ? undefined : `${formatDuration(entry.left)} sonra ot basar`}
      action={
        action === 'tend'
          ? { label: 'Temizle', onPress: () => onTend(entry.note.id) }
          : action === 'harvest'
            ? { label: 'Hasat et', onPress: () => onHarvest(entry.note.id) }
            : undefined
      }
    />
  );

  return (
    <Page
      icon="bell"
      title="Yaklaşanlar"
      description={`Notlarının ne zaman ilgi isteyeceği. Ot basmadan ${formatDuration(WEED_REMINDER_LEAD_MS)} önce bildirim gelir.`}
      maxWidth={760}
    >
      {notes.length === 0 ? (
        <Callout icon="🌾">
          <Text style={styles.text}>Tarlada not yok, beklenen bir şey de yok.</Text>
        </Callout>
      ) : (
        <FadeIn>
          {weedy.length > 0 ? (
            <Section title={`Ot bastı · ${weedy.length}`} icon="alert-triangle">
              {weedy.map((e) => row(e, 'tend'))}
            </Section>
          ) : null}
          {ripe.length > 0 ? (
            <Section title={`Hasada hazır · ${ripe.length}`} icon="sun">
              {ripe.map((e) => row(e, 'harvest'))}
            </Section>
          ) : null}
          {today.length > 0 ? (
            <Section title={`Bugün · ${today.length}`} icon="clock">
              {today.map((e) => row(e))}
            </Section>
          ) : null}
          {week.length > 0 ? (
            <Section title={`Bu hafta · ${week.length}`} icon="calendar">
              {week.map((e) => row(e))}
            </Section>
          ) : null}
          {later.length > 0 ? (
            <Section title={`Daha sonra · ${later.length}`} icon="more-horizontal">
              {later.map((e) => row(e))}
            </Section>
          ) : null}
        </FadeIn>
      )}
    </Page>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  text: { ...typography.body, color: colors.textSecondary },
}));
