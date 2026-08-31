/**
 * Notlar (tohumlar) repository'si — tarladaki her şey buradan geçer.
 */
import { DEFAULT_SEED_TYPE } from '../../game/config';
import type {
  CreateNoteInput,
  HarvestQuality,
  Note,
  NoteQuery,
  NoteRow,
  NoteStatus,
  UpdateNoteInput,
} from '../../types';
import { getDatabase, type Database } from '../database';
import { mapNote } from '../mappers';
import { insertHarvestRecord } from './inventory';

/* ------------------------------------------------------------------ */
/* Yazma                                                               */
/* ------------------------------------------------------------------ */

/** Yeni tohum ek. Not her zaman 'planted' olarak başlar. */
export async function plantSeed(input: CreateNoteInput): Promise<Note> {
  const db = await getDatabase();
  const now = input.created_at ?? Date.now();
  const title = input.title.trim();

  if (!title) throw new Error('plantSeed: baslik bos olamaz');

  const result = await db.runAsync(
    `INSERT INTO notes
       (title, content, created_at, status, seed_type, last_tended_at, harvested_at)
     VALUES (?, ?, ?, 'planted', ?, ?, NULL)`,
    [title, input.content ?? null, now, input.seed_type ?? DEFAULT_SEED_TYPE, now],
  );

  const note = await getNoteById(result.lastInsertRowId);
  if (!note) throw new Error('plantSeed: not eklendi ancak okunamadi');
  return note;
}

/**
 * Not içeriğini günceller ve `last_tended_at`'i tazeler — düzenlemek de bir
 * bakımdır, aksi halde yeni düzenlenen bir not bir sonraki açılışta hemen
 * 'weedy' olurdu. Statüye dokunmaz: otu temizlemek ayrı bir jest (`tendNote`).
 */
export async function updateNote(
  id: number,
  input: UpdateNoteInput,
  now: number = Date.now(),
): Promise<Note | null> {
  const sets: string[] = [];
  const params: (string | number | null)[] = [];

  if (input.title !== undefined) {
    const title = input.title.trim();
    if (!title) throw new Error('updateNote: baslik bos olamaz');
    sets.push('title = ?');
    params.push(title);
  }
  if (input.content !== undefined) {
    sets.push('content = ?');
    params.push(input.content);
  }
  if (input.seed_type !== undefined) {
    sets.push('seed_type = ?');
    params.push(input.seed_type);
  }

  if (!sets.length) return getNoteById(id);

  sets.push('last_tended_at = ?');
  params.push(now);
  params.push(id);

  const db = await getDatabase();
  await db.runAsync(
    `UPDATE notes SET ${sets.join(', ')} WHERE id = ? AND harvested_at IS NULL`,
    params,
  );
  return getNoteById(id);
}

/**
 * Ot temizleme (swipe jesti). 'weedy' notu tekrar 'growing' yapar ve bakım
 * sayacını sıfırlar.
 */
export async function tendNote(
  id: number,
  now: number = Date.now(),
): Promise<Note | null> {
  const note = await getNoteById(id);
  if (!note || note.harvested_at !== null) return note;

  const db = await getDatabase();
  await db.runAsync(
    'UPDATE notes SET status = ?, last_tended_at = ? WHERE id = ?',
    ['growing', now, id],
  );
  return getNoteById(id);
}

/**
 * Time-skip'in kullandığı toplu statü güncellemesi.
 * `executor` için bkz. settings.setLastOpenedAt — exclusive transaction
 * içinden çağrılırken transaction nesnesi geçilmeli.
 */
export async function setNoteStatuses(
  ids: number[],
  status: NoteStatus,
  executor?: Database,
): Promise<void> {
  if (!ids.length) return;
  const db = executor ?? (await getDatabase());
  const placeholders = ids.map(() => '?').join(', ');
  await db.runAsync(
    `UPDATE notes SET status = ? WHERE id IN (${placeholders})`,
    [status, ...ids],
  );
}

/** Notun durumuna göre hasat kalitesi. */
export function qualityForStatus(status: NoteStatus): HarvestQuality {
  if (status === 'weedy') return 'withered';
  if (status === 'growing') return 'golden';
  return 'normal';
}

export interface HarvestResult {
  note: Note;
  inventoryId: number;
  quality: HarvestQuality;
}

/**
 * Hasat: not SİLİNMEZ. `harvested_at` damgalanır (tarladan çıkar) ve kilere
 * bir kayıt düşer. İki yazma tek transaction'da: uygulama arada kapanırsa
 * "hasat edilmiş ama kilerde yok" durumu oluşamaz.
 */
export async function harvestNote(
  id: number,
  now: number = Date.now(),
): Promise<HarvestResult | null> {
  const db = await getDatabase();
  let inventoryId = -1;
  let quality: HarvestQuality = 'normal';
  let harvested = false;

  // Exclusive: iki hızlı swipe aynı notu aynı anda hasat etmeye çalışamasın.
  // Blok içindeki her sorgu `txn` üzerinden gitmeli (bkz. setNoteStatuses).
  await db.withExclusiveTransactionAsync(async (txn) => {
    const row = await txn.getFirstAsync<NoteRow>(
      'SELECT * FROM notes WHERE id = ? AND harvested_at IS NULL',
      [id],
    );
    if (!row) return; // yok ya da zaten hasat edilmiş

    const note = mapNote(row);
    quality = qualityForStatus(note.status);

    await txn.runAsync('UPDATE notes SET harvested_at = ? WHERE id = ?', [
      now,
      id,
    ]);
    inventoryId = await insertHarvestRecord(txn, {
      original_note_id: id,
      title: note.title,
      seed_type: note.seed_type,
      quality,
      harvested_at: now,
    });
    harvested = true;
  });

  if (!harvested) return null;

  const note = await getNoteById(id);
  if (!note) throw new Error('harvestNote: hasat sonrasi not okunamadi');
  return { note, inventoryId, quality };
}

/**
 * Kalıcı silme. Kilerdeki kayıt korunur, sadece `original_note_id` NULL'a
 * düşer (ON DELETE SET NULL) — geçmiş hasat sayısı bozulmaz.
 */
export async function deleteNote(id: number): Promise<boolean> {
  const db = await getDatabase();
  const result = await db.runAsync('DELETE FROM notes WHERE id = ?', [id]);
  return result.changes > 0;
}

/**
 * SADECE GELİŞTİRME. Aktif notların yaşını `ms` kadar ileri alır (zaman
 * damgalarını geriye çeker).
 *
 * Gerekçesi: en hızlı tohum bile 4 saatte filizleniyor, ot 48 saatte basıyor.
 * Bu eşikler ürün için doğru ama geliştirirken 'growing' / 'harvestable' /
 * 'weedy' aşamalarını ve jestleri elle denemenin başka yolu yok.
 */
export async function devAgeNotes(ms: number): Promise<void> {
  if (!__DEV__) throw new Error('devAgeNotes yalnizca gelistirme derlemesinde');
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE notes
        SET created_at = created_at - ?, last_tended_at = last_tended_at - ?
      WHERE harvested_at IS NULL`,
    [ms, ms],
  );
}

/* ------------------------------------------------------------------ */
/* Okuma                                                               */
/* ------------------------------------------------------------------ */

export async function getNoteById(id: number): Promise<Note | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<NoteRow>(
    'SELECT * FROM notes WHERE id = ?',
    [id],
  );
  return row ? mapNote(row) : null;
}

export async function listNotes(query: NoteQuery = {}): Promise<Note[]> {
  const db = await getDatabase();
  const { sql, params } = buildNoteQuery(query);
  const paging = limitClause(query, params);
  const rows = await db.getAllAsync<NoteRow>(
    `SELECT * FROM notes ${sql} ORDER BY created_at DESC, id DESC${paging}`,
    params,
  );
  return rows.map(mapNote);
}

export async function countNotes(query: NoteQuery = {}): Promise<number> {
  const db = await getDatabase();
  const { sql, params } = buildNoteQuery(query);
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) AS count FROM notes ${sql}`,
    params,
  );
  return row?.count ?? 0;
}

/** Tarla ekranı: hasat edilmemiş tüm notlar. */
export const listFieldNotes = (): Promise<Note[]> =>
  listNotes({ onlyActive: true });

export interface FieldStats {
  planted: number;
  growing: number;
  weedy: number;
  total: number;
}

/** Tek sorguda statü dağılımı — açılış özeti / rozetler için. */
export async function getFieldStats(): Promise<FieldStats> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ status: string; count: number }>(
    `SELECT status, COUNT(*) AS count
       FROM notes
      WHERE harvested_at IS NULL
      GROUP BY status`,
  );

  const stats: FieldStats = { planted: 0, growing: 0, weedy: 0, total: 0 };
  for (const row of rows) {
    if (
      row.status === 'planted' ||
      row.status === 'growing' ||
      row.status === 'weedy'
    ) {
      stats[row.status] = row.count;
    }
    stats.total += row.count;
  }
  return stats;
}

/* ------------------------------------------------------------------ */
/* Sorgu kurucu                                                        */
/* ------------------------------------------------------------------ */

function buildNoteQuery(query: NoteQuery): {
  sql: string;
  params: (string | number)[];
} {
  const where: string[] = [];
  const params: (string | number)[] = [];

  if (query.onlyActive !== false) where.push('harvested_at IS NULL');

  if (query.status) {
    const statuses = Array.isArray(query.status) ? query.status : [query.status];
    if (statuses.length) {
      where.push(`status IN (${statuses.map(() => '?').join(', ')})`);
      params.push(...statuses);
    }
  }

  if (query.seed_type) {
    where.push('seed_type = ?');
    params.push(query.seed_type);
  }

  if (query.search?.trim()) {
    // LIKE jokerlerini kaçır ki kullanıcının yazdığı % ve _ literal kalsın.
    const term = query.search.trim().replace(/[%_\\]/g, '\\$&');
    const like = `%${term}%`;
    where.push(
      "(title LIKE ? ESCAPE '\\' OR IFNULL(content, '') LIKE ? ESCAPE '\\')",
    );
    params.push(like, like);
  }

  return {
    sql: where.length ? `WHERE ${where.join(' AND ')}` : '',
    params,
  };
}

/** LIMIT/OFFSET ekler ve parametreleri aynı diziye yazar (sıra önemli). */
function limitClause(query: NoteQuery, params: (string | number)[]): string {
  if (query.limit == null) return '';
  params.push(query.limit);
  if (query.offset == null) return ' LIMIT ?';
  params.push(query.offset);
  return ' LIMIT ? OFFSET ?';
}
