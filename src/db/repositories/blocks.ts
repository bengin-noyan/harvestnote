/**
 * Not blokları repository'si. Notun içeriği buradan geçiyor.
 *
 * İki kural dosyanın tamamını belirliyor:
 *
 * 1. Pozisyonlar seyrek. Bloklar 1000'er artan `position` ile duruyor. Araya
 *    blok eklemek iki komşunun ortasına tek satır yazmak demek, listeyi baştan
 *    numaralamak gerekmiyor. Boşluk biterse (aynı yere üst üste ~10 ekleme)
 *    `renumber` devreye girip notu 1000'erliğe geri çekiyor.
 *
 * 2. notes.content duruyor, silmedik. Blokların düz metin hali olarak kalıyor
 *    ve her yazmada güncelleniyor. Böylece buildNoteQuery'deki LIKE araması ve
 *    kart önizlemesi hiç değişmeden çalışıyor. Ölü sütun sanıp silmeyin.
 *
 * Her yazma ayrıca notes.last_tended_at'i tazeliyor, yazmak da bakım sayılıyor.
 */
import type {
  CreateBlockInput,
  NoteBlock,
  NoteBlockRow,
  UpdateBlockInput,
} from '../../types';
import { getDatabase, withWriteTransaction, type Database } from '../database';
import { mapNoteBlock } from '../mappers';

/** Komşu pozisyonlar arasındaki varsayılan boşluk. */
const POSITION_STEP = 1000;

/* ------------------------------------------------------------------ */
/* Okuma                                                               */
/* ------------------------------------------------------------------ */

export async function listBlocks(noteId: number): Promise<NoteBlock[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<NoteBlockRow>(
    'SELECT * FROM note_blocks WHERE note_id = ? ORDER BY position, id',
    [noteId],
  );
  return rows.map(mapNoteBlock);
}

export async function getBlockById(id: number): Promise<NoteBlock | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<NoteBlockRow>(
    'SELECT * FROM note_blocks WHERE id = ?',
    [id],
  );
  return row ? mapNoteBlock(row) : null;
}

/**
 * Editörün açılışta kullandığı hali. Bloğu olmayan not tek bir paragrafla
 * açılsın ki imleç koyacak yer olsun.
 *
 * İlk blok boş değil, notes.content'ten geliyor. Migration 2'nin geri
 * doldurması tek seferlikti ama tohum ekleme paneli hâlâ nota doğrudan content
 * yazıyor, yani migration'dan sonra açılan notların metni var, bloğu yok.
 * Burada doldurmasak editör boş paragraf açıyor, ilk yazmada izdüşüm o metnin
 * üstüne yazıyor ve kullanıcının yazdığı detay sessizce uçuyor.
 */
export async function listBlocksForEditing(
  noteId: number,
  now: number = Date.now(),
): Promise<NoteBlock[]> {
  const existing = await listBlocks(noteId);
  if (existing.length > 0) return existing;

  const db = await getDatabase();
  const note = await db.getFirstAsync<{ content: string | null }>(
    'SELECT content FROM notes WHERE id = ?',
    [noteId],
  );
  const content = note?.content ?? '';
  const seed = content.trim() ? content : '';

  await createBlock({ note_id: noteId, type: 'paragraph', text: seed }, now);
  return listBlocks(noteId);
}

/** Not başına işaretli/toplam yapılacak sayısı. */
export interface TodoCount {
  done: number;
  total: number;
}

/**
 * Bütün notların yapılacak sayımı, tek sorguda.
 *
 * Olgunluk hesabının emek kısmı bunu kullanıyor (bkz. maturityProgress). Not
 * başına ayrı sorgu atmak tarlada not sayısı kadar sorgu demekti, burası tek
 * GROUP BY ile dönüyor ve idx_blocks_note'u kullanıyor.
 *
 * Oyun katmanına satırları değil sadece sayıyı veriyoruz, game/stages.ts
 * DB'den bağımsız kalmalı.
 */
export async function getTodoCounts(): Promise<Map<number, TodoCount>> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    note_id: number;
    total: number;
    done: number | null;
  }>(
    `SELECT note_id,
            COUNT(*)      AS total,
            SUM(checked)  AS done
       FROM note_blocks
      WHERE type = 'todo'
      GROUP BY note_id`,
  );

  const counts = new Map<number, TodoCount>();
  for (const row of rows) {
    // SUM boş kümede NULL dönüyor, o yüzden ?? 0 koydum.
    counts.set(row.note_id, { done: row.done ?? 0, total: row.total });
  }
  return counts;
}

/* ------------------------------------------------------------------ */
/* Yazma                                                               */
/* ------------------------------------------------------------------ */

export async function createBlock(
  input: CreateBlockInput,
  now: number = Date.now(),
): Promise<NoteBlock> {
  const db = await getDatabase();
  let created = -1;

  await withWriteTransaction(db, async (txn) => {
    const position = await positionFor(txn, input.note_id, input.after_block_id);
    const result = await txn.runAsync(
      `INSERT INTO note_blocks
         (note_id, position, type, text, checked, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        input.note_id,
        position,
        input.type ?? 'paragraph',
        input.text ?? '',
        input.checked ? 1 : 0,
        now,
        now,
      ],
    );
    created = result.lastInsertRowId;
    await refreshNoteProjection(txn, input.note_id, now);
  });

  const block = await getBlockById(created);
  if (!block) throw new Error('createBlock: blok eklendi ancak okunamadi');
  return block;
}

/**
 * Bloğun metnini/türünü günceller. Verilmeyen alanlar olduğu gibi kalıyor,
 * editörün otomatik kaydı sadece text gönderiyor.
 */
export async function updateBlock(
  id: number,
  input: UpdateBlockInput,
  now: number = Date.now(),
): Promise<NoteBlock | null> {
  const sets: string[] = [];
  const params: (string | number | null)[] = [];

  if (input.type !== undefined) {
    sets.push('type = ?');
    params.push(input.type);
    // Ayraçta metin olmuyor. Tür çevrilirken eski metin kalırsa izdüşümde
    // görünmeyen bir satır olarak yaşamaya devam ediyor.
    if (input.type === 'divider' && input.text === undefined) {
      sets.push('text = ?');
      params.push('');
    }
  }
  if (input.text !== undefined) {
    sets.push('text = ?');
    params.push(input.text);
  }
  if (input.checked !== undefined) {
    sets.push('checked = ?');
    params.push(input.checked ? 1 : 0);
  }

  if (!sets.length) return getBlockById(id);

  sets.push('updated_at = ?');
  params.push(now);
  params.push(id);

  const db = await getDatabase();
  let found = false;

  await withWriteTransaction(db, async (txn) => {
    const owner = await txn.getFirstAsync<{ note_id: number }>(
      'SELECT note_id FROM note_blocks WHERE id = ?',
      [id],
    );
    if (!owner) return;
    found = true;

    await txn.runAsync(
      `UPDATE note_blocks SET ${sets.join(', ')} WHERE id = ?`,
      params,
    );
    await refreshNoteProjection(txn, owner.note_id, now);
  });

  return found ? getBlockById(id) : null;
}

/**
 * Bloğu siler. Notun son bloğu silinirse yerine boş paragraf koyuyoruz,
 * bloksuz notta imleç koyacak yer kalmıyor.
 */
export async function deleteBlock(
  id: number,
  now: number = Date.now(),
): Promise<boolean> {
  const db = await getDatabase();
  let removed = false;

  await withWriteTransaction(db, async (txn) => {
    const owner = await txn.getFirstAsync<{ note_id: number }>(
      'SELECT note_id FROM note_blocks WHERE id = ?',
      [id],
    );
    if (!owner) return;

    await txn.runAsync('DELETE FROM note_blocks WHERE id = ?', [id]);
    removed = true;

    const remaining = await txn.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) AS count FROM note_blocks WHERE note_id = ?',
      [owner.note_id],
    );
    if ((remaining?.count ?? 0) === 0) {
      await txn.runAsync(
        `INSERT INTO note_blocks
           (note_id, position, type, text, checked, created_at, updated_at)
         VALUES (?, ?, 'paragraph', '', 0, ?, ?)`,
        [owner.note_id, POSITION_STEP, now, now],
      );
    }

    await refreshNoteProjection(txn, owner.note_id, now);
  });

  return removed;
}

/* ------------------------------------------------------------------ */
/* İç yardımcılar                                                      */
/* ------------------------------------------------------------------ */

/**
 * Yeni bloğun pozisyonu.
 *
 * after verilmezse sona ekliyor. Verilirse iki komşunun ortasını hesaplıyor,
 * ortada tam sayı kalmadıysa notu baştan numaralayıp tekrar deniyor.
 */
async function positionFor(
  txn: Database,
  noteId: number,
  afterBlockId: number | null | undefined,
): Promise<number> {
  if (afterBlockId == null) return appendPosition(txn, noteId);

  const prev = await txn.getFirstAsync<{ position: number }>(
    'SELECT position FROM note_blocks WHERE id = ? AND note_id = ?',
    [afterBlockId, noteId],
  );
  // Blok başka bir nota aitse ya da silinmişse sona ekle.
  if (!prev) return appendPosition(txn, noteId);

  const gap = await nextGap(txn, noteId, prev.position);
  if (gap !== null) return gap;

  // Boşluk bitti. Notu 1000'erliğe geri çekip tekrar deniyoruz. Numaralama
  // pozisyonları değiştirdiği için komşuyu baştan okumak gerekiyor.
  await renumber(txn, noteId);
  const moved = await txn.getFirstAsync<{ position: number }>(
    'SELECT position FROM note_blocks WHERE id = ? AND note_id = ?',
    [afterBlockId, noteId],
  );
  if (!moved) return appendPosition(txn, noteId);

  const retry = await nextGap(txn, noteId, moved.position);
  // Buraya düşmek için notun 1000'den fazla bloğu olması lazım. Sona eklemek
  // bloğu tamamen kaybetmekten iyi.
  return retry ?? appendPosition(txn, noteId);
}

async function appendPosition(txn: Database, noteId: number): Promise<number> {
  const last = await txn.getFirstAsync<{ position: number | null }>(
    'SELECT MAX(position) AS position FROM note_blocks WHERE note_id = ?',
    [noteId],
  );
  return (last?.position ?? 0) + POSITION_STEP;
}

/** after ile sonraki blok arasındaki tam sayı. Yer yoksa null. */
async function nextGap(
  txn: Database,
  noteId: number,
  after: number,
): Promise<number | null> {
  const next = await txn.getFirstAsync<{ position: number }>(
    `SELECT position FROM note_blocks
      WHERE note_id = ? AND position > ?
      ORDER BY position LIMIT 1`,
    [noteId, after],
  );
  if (!next) return after + POSITION_STEP;

  const middle = Math.floor((after + next.position) / 2);
  return middle > after && middle < next.position ? middle : null;
}

/** Notun bloklarını mevcut sırayı koruyarak 1000'erliğe geri çeker. */
async function renumber(txn: Database, noteId: number): Promise<void> {
  const rows = await txn.getAllAsync<{ id: number }>(
    'SELECT id FROM note_blocks WHERE note_id = ? ORDER BY position, id',
    [noteId],
  );
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    if (!row) continue; // noUncheckedIndexedAccess
    await txn.runAsync('UPDATE note_blocks SET position = ? WHERE id = ?', [
      (i + 1) * POSITION_STEP,
      row.id,
    ]);
  }
}

/**
 * notes.content'i blokların düz metin halinden yeniden yazıyor ve bakım
 * saatini ileri alıyor.
 *
 * Bunu SQL'de yapmadım: sıralı group_concat SQLite sürümüne bağlı, blokları
 * zaten okumak gerekiyor ve boş/ayraç satırlarını elemek JS'te daha okunur.
 */
async function refreshNoteProjection(
  txn: Database,
  noteId: number,
  now: number,
): Promise<void> {
  const rows = await txn.getAllAsync<{ type: string; text: string | null }>(
    'SELECT type, text FROM note_blocks WHERE note_id = ? ORDER BY position, id',
    [noteId],
  );

  const content = rows
    .filter((row) => row.type !== 'divider')
    .map((row) => (row.text ?? '').trim())
    .filter((text) => text.length > 0)
    .join('\n');

  await txn.runAsync(
    `UPDATE notes SET content = ?, last_tended_at = ?
      WHERE id = ? AND harvested_at IS NULL`,
    [content.length > 0 ? content : null, now, noteId],
  );
}
