/**
 * Ham SQLite satırlarını domain modellerine çevirir.
 *
 * SQLite union tipi bilmez: CHECK kısıtı olsa bile TS tarafına `string`
 * gelir. Elle düzenlenmiş bir .db dosyası veya gelecekte eklenip geri
 * alınan bir migration bilinmeyen değer bırakabilir; o durumda çökmek
 * yerine güvenli varsayılana düşüp uyarıyoruz.
 */
import { DEFAULT_SEED_TYPE } from '../game/config';
import {
  HARVEST_QUALITIES,
  NOTE_STATUSES,
  SEED_TYPES,
  type HarvestQuality,
  type InventoryItem,
  type InventoryRow,
  type Note,
  type NoteRow,
  type NoteStatus,
  type SeedType,
  type Settings,
  type SettingsRow,
} from '../types';

function oneOf<T extends string>(
  allowed: readonly T[],
  value: string,
  fallback: T,
  field: string,
): T {
  if ((allowed as readonly string[]).includes(value)) return value as T;
  if (__DEV__) {
    console.warn(`[db] beklenmeyen ${field} degeri: "${value}" -> "${fallback}"`);
  }
  return fallback;
}

export const toNoteStatus = (value: string): NoteStatus =>
  oneOf(NOTE_STATUSES, value, 'planted', 'status');

export const toSeedType = (value: string): SeedType =>
  oneOf(SEED_TYPES, value, DEFAULT_SEED_TYPE, 'seed_type');

export const toHarvestQuality = (value: string): HarvestQuality =>
  oneOf(HARVEST_QUALITIES, value, 'normal', 'quality');

export function mapNote(row: NoteRow): Note {
  return {
    id: row.id,
    title: row.title,
    content: row.content ?? null,
    created_at: row.created_at,
    status: toNoteStatus(row.status),
    seed_type: toSeedType(row.seed_type),
    last_tended_at: row.last_tended_at,
    harvested_at: row.harvested_at ?? null,
  };
}

export function mapInventoryItem(row: InventoryRow): InventoryItem {
  return {
    id: row.id,
    original_note_id: row.original_note_id ?? null,
    title: row.title,
    seed_type: toSeedType(row.seed_type),
    quality: toHarvestQuality(row.quality),
    harvested_at: row.harvested_at,
  };
}

export function mapSettings(row: SettingsRow): Settings {
  return { id: row.id, last_opened_at: row.last_opened_at };
}
