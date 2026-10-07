// Etiketler (migration 4). Bir notun birden çok etiketi olabiliyor.
//
// Etiket eklemek ot saatine dokunmuyor, favori gibi. Bu yüzden useNotes
// bunlardan sonra notifyContentChanged kullanıyor.
import type { NoteTag, NoteTagRow, TagColor } from '../../types';
import { getDatabase, withWriteTransaction } from '../database';
import { mapNoteTag } from '../mappers';

// Yeni etiketler bu sırayla renk alıyor. Gri en sonda, aşama etiketlerine
// benzemesin diye kahverengi de geride.
const COLOR_CYCLE: TagColor[] = ['blue', 'green', 'orange', 'yellow', 'red', 'brown', 'gray'];

export const TAG_NAME_MAX = 32;

/** Bütün etiketler, ada göre. */
export async function listTags(): Promise<NoteTag[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<NoteTagRow>(
    'SELECT * FROM tags ORDER BY name COLLATE NOCASE',
  );
  return rows.map(mapNoteTag);
}

/** Tarladaki notların etiket id'leri, not id'sine göre. Tek sorgu. */
export async function getNoteTagIds(): Promise<Map<number, number[]>> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ note_id: number; tag_id: number }>(
    `SELECT nt.note_id, nt.tag_id
       FROM note_tags nt
       JOIN notes n ON n.id = nt.note_id
       JOIN tags t ON t.id = nt.tag_id
      WHERE n.harvested_at IS NULL
      ORDER BY t.name COLLATE NOCASE`,
  );
  const map = new Map<number, number[]>();
  for (const row of rows) {
    const list = map.get(row.note_id);
    if (list) list.push(row.tag_id);
    else map.set(row.note_id, [row.tag_id]);
  }
  return map;
}

/**
 * Nota etiket ekliyor. Aynı adda etiket varsa (büyük/küçük harf fark etmez)
 * onu kullanıyor, yoksa oluşturuyor. Not zaten o etiketi taşıyorsa bir şey
 * olmuyor.
 */
export async function addTagToNote(noteId: number, rawName: string): Promise<NoteTag> {
  const name = rawName.trim().slice(0, TAG_NAME_MAX);
  if (!name) throw new Error('addTagToNote: etiket adi bos olamaz');

  const db = await getDatabase();
  let tag: NoteTag | null = null;

  await withWriteTransaction(db, async (txn) => {
    // NOCASE sadece ASCII harfleri tanıyor, "İş" ile "iş"i farklı sayıyordu.
    // Etiket sayısı az, karşılaştırmayı burada Türkçe kurala göre yapıyoruz.
    const all = await txn.getAllAsync<NoteTagRow>('SELECT * FROM tags');
    const key = name.toLocaleLowerCase('tr');
    let row: NoteTagRow | null =
      all.find((t) => t.name.toLocaleLowerCase('tr') === key) ?? null;
    if (!row) {
      const color = COLOR_CYCLE[all.length % COLOR_CYCLE.length] ?? 'gray';
      const result = await txn.runAsync(
        'INSERT INTO tags (name, color, created_at) VALUES (?, ?, ?)',
        [name, color, Date.now()],
      );
      row = await txn.getFirstAsync<NoteTagRow>('SELECT * FROM tags WHERE id = ?', [
        result.lastInsertRowId,
      ]);
    }
    if (!row) throw new Error('addTagToNote: etiket okunamadi');

    await txn.runAsync(
      'INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?, ?)',
      [noteId, row.id],
    );
    tag = mapNoteTag(row);
  });

  if (!tag) throw new Error('addTagToNote: etiket eklenemedi');
  return tag;
}

/**
 * Etiketi nottan çıkarıyor. Etiketi kullanan başka not kalmadıysa etiketi de
 * siliyoruz. Ayrı bir etiket yönetim ekranı yok, silmesek öneri listesinde
 * kullanılmayan adlar birikiyordu.
 */
export async function removeTagFromNote(noteId: number, tagId: number): Promise<void> {
  const db = await getDatabase();
  await withWriteTransaction(db, async (txn) => {
    await txn.runAsync('DELETE FROM note_tags WHERE note_id = ? AND tag_id = ?', [
      noteId,
      tagId,
    ]);
    // Hasat edilmiş notlar da sayılıyor, onların etiketi de kaybolmasın.
    await txn.runAsync(
      'DELETE FROM tags WHERE id = ? AND NOT EXISTS (SELECT 1 FROM note_tags WHERE tag_id = ?)',
      [tagId, tagId],
    );
  });
}
