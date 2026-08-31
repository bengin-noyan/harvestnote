/**
 * Kiler (Inventory) repository'si.
 * Hasat edilen ürünlerin kalıcı kaydı — buradan silme yalnızca kullanıcı
 * "tüketme/temizleme" derse yapılır, hasat akışı asla silmez.
 */
import { getDatabase, type Database } from '../database';
import { mapInventoryItem, toSeedType } from '../mappers';
import type {
  HarvestQuality,
  InventoryItem,
  InventoryQuery,
  InventoryRow,
  SeedType,
} from '../../types';
import { SEED_CATALOG } from '../../game/config';

export interface HarvestRecordInput {
  original_note_id: number;
  title: string;
  seed_type: SeedType;
  quality: HarvestQuality;
  harvested_at: number;
}

/**
 * Düşük seviyeli insert: hasat akışı bunu kendi transaction'ı içinde
 * çağırdığı için bağlantıyı dışarıdan alır. Doğrudan çağırma — hasat için
 * notes repository'sindeki `harvestNote` kullanılmalı.
 */
export async function insertHarvestRecord(
  db: Database,
  input: HarvestRecordInput,
): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO inventory
       (original_note_id, title, seed_type, quality, harvested_at)
     VALUES (?, ?, ?, ?, ?)`,
    [
      input.original_note_id,
      input.title,
      input.seed_type,
      input.quality,
      input.harvested_at,
    ],
  );
  return result.lastInsertRowId;
}

export async function listInventory(
  query: InventoryQuery = {},
): Promise<InventoryItem[]> {
  const db = await getDatabase();
  const where: string[] = [];
  const params: (string | number)[] = [];

  if (query.seed_type) {
    where.push('seed_type = ?');
    params.push(query.seed_type);
  }
  if (query.quality) {
    where.push('quality = ?');
    params.push(query.quality);
  }

  let sql = 'SELECT * FROM inventory';
  if (where.length) sql += ` WHERE ${where.join(' AND ')}`;
  sql += ' ORDER BY harvested_at DESC, id DESC';

  if (query.limit != null) {
    sql += ' LIMIT ?';
    params.push(query.limit);
    if (query.offset != null) {
      sql += ' OFFSET ?';
      params.push(query.offset);
    }
  }

  const rows = await db.getAllAsync<InventoryRow>(sql, params);
  return rows.map(mapInventoryItem);
}

export async function getInventoryItem(
  id: number,
): Promise<InventoryItem | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<InventoryRow>(
    'SELECT * FROM inventory WHERE id = ?',
    [id],
  );
  return row ? mapInventoryItem(row) : null;
}

export async function countInventory(): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM inventory',
  );
  return row?.count ?? 0;
}

export interface InventorySummaryEntry {
  seed_type: SeedType;
  count: number;
  /** SEED_CATALOG değerine göre toplam puan. */
  value: number;
}

/** Kiler ekranındaki "ürün rafları" için türe göre gruplama. */
export async function getInventorySummary(): Promise<InventorySummaryEntry[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ seed_type: string; count: number }>(
    'SELECT seed_type, COUNT(*) AS count FROM inventory GROUP BY seed_type',
  );

  return rows.map((row) => {
    const seed = toSeedType(row.seed_type);
    const definition = SEED_CATALOG[seed];
    return {
      seed_type: seed,
      count: row.count,
      value: row.count * (definition?.value ?? 0),
    };
  });
}

/** Kilerden kalıcı olarak çıkarır (tüketme). */
export async function removeInventoryItem(id: number): Promise<boolean> {
  const db = await getDatabase();
  const result = await db.runAsync('DELETE FROM inventory WHERE id = ?', [id]);
  return result.changes > 0;
}
