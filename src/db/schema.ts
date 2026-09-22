/**
 * Şema ve migration'lar.
 *
 * Uygulama offline olduğu için kullanıcının verisinin tek kopyası var,
 * drop & recreate yapamıyoruz. Onun yerine PRAGMA user_version'a bakan
 * basit bir migration listesi tutuyoruz.
 * Yeni değişiklik = listeye yeni kayıt. Eskilere dokunmuyoruz.
 */

export const DATABASE_NAME = 'harvestnote.db';

/** Settings tek satır. Her yerde bu id ile okuyup yazıyoruz. */
export const SETTINGS_ROW_ID = 1;

export interface Migration {
  version: number;
  label: string;
  /** Tek execAsync ile çalışacak SQL. */
  statements: string;
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    label: 'initial-schema',
    statements: `
      CREATE TABLE IF NOT EXISTS notes (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        title          TEXT    NOT NULL,
        content        TEXT,
        created_at     INTEGER NOT NULL,
        status         TEXT    NOT NULL DEFAULT 'planted'
                         CHECK (status IN ('planted', 'growing', 'weedy')),
        seed_type      TEXT    NOT NULL DEFAULT 'wheat'
                         CHECK (seed_type IN ('wheat','carrot','tomato','pumpkin','sunflower')),
        last_tended_at INTEGER NOT NULL,
        harvested_at   INTEGER
      );

      -- Tarla görünümü: hasat edilmemişler, en yeni önce.
      CREATE INDEX IF NOT EXISTS idx_notes_field
        ON notes (harvested_at, created_at DESC);

      -- Time-skip taraması aktif notları last_tended_at'e göre süzüyor.
      CREATE INDEX IF NOT EXISTS idx_notes_tended
        ON notes (harvested_at, last_tended_at);

      CREATE TABLE IF NOT EXISTS inventory (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        original_note_id INTEGER REFERENCES notes(id) ON DELETE SET NULL,
        title            TEXT    NOT NULL,
        seed_type        TEXT    NOT NULL
                           CHECK (seed_type IN ('wheat','carrot','tomato','pumpkin','sunflower')),
        quality          TEXT    NOT NULL DEFAULT 'normal'
                           CHECK (quality IN ('golden','normal','withered')),
        harvested_at     INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_inventory_harvested_at
        ON inventory (harvested_at DESC);

      -- Aynı not iki kez kilere düşemesin (çift hasat koruması).
      CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_note
        ON inventory (original_note_id)
        WHERE original_note_id IS NOT NULL;

      CREATE TABLE IF NOT EXISTS settings (
        id             INTEGER PRIMARY KEY CHECK (id = ${SETTINGS_ROW_ID}),
        last_opened_at INTEGER NOT NULL
      );
    `,
  },
  {
    version: 2,
    label: 'note-blocks',
    statements: `
      CREATE TABLE IF NOT EXISTS note_blocks (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        note_id    INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
        -- Pozisyonlar seyrek (1000, 2000...). Araya ekleyince tek satır yazıyoruz.
        position   INTEGER NOT NULL,
        type       TEXT    NOT NULL DEFAULT 'paragraph'
                     CHECK (type IN ('paragraph','heading','todo','bullet',
                                     'numbered','quote','divider','code')),
        text       TEXT,
        checked    INTEGER NOT NULL DEFAULT 0 CHECK (checked IN (0, 1)),
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      -- Editörün sorgusu: bir notun blokları, sırayla.
      CREATE INDEX IF NOT EXISTS idx_blocks_note
        ON note_blocks (note_id, position);

      -- Eski notların content'ini tek bir paragraf bloğuna taşıyoruz.
      -- TRIM olmazsa boş notlar için bomboş blok satırları oluşuyor.
      INSERT INTO note_blocks
        (note_id, position, type, text, checked, created_at, updated_at)
      SELECT id, 1000, 'paragraph', content, 0, created_at, last_tended_at
        FROM notes
       WHERE content IS NOT NULL AND TRIM(content) <> '';
    `,
  },
  // Yeni sürümler buraya. Yayınlanmış kayıtlara dokunmuyoruz.
];

/** Listedeki en yüksek sürüm hedef sürüm oluyor. */
export const TARGET_SCHEMA_VERSION = MIGRATIONS.reduce(
  (max, m) => Math.max(max, m.version),
  0,
);
