/**
 * Şema ve migration tanımları.
 *
 * Offline-first bir uygulamada kullanıcının verisi tek kopyadır; şema
 * değişikliği "drop & recreate" ile yapılamaz. Bu yüzden PRAGMA user_version
 * tabanlı, ileri doğru çalışan basit bir migration listesi tutuyoruz.
 * Yeni bir değişiklik = listeye yeni bir kayıt; eskiler ASLA düzenlenmez.
 */

export const DATABASE_NAME = 'harvestnote.db';

/** Settings tek satırlıdır; her yerde bu id ile okunur/yazılır. */
export const SETTINGS_ROW_ID = 1;

export interface Migration {
  version: number;
  label: string;
  /** Tek bir execAsync bloğu olarak çalıştırılacak SQL. */
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

      -- Time-skip taraması: aktif notları son bakım zamanına göre süzer.
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
        -- Seyrek numaralama (1000, 2000, ...): araya ekleme tek satır yazma.
        position   INTEGER NOT NULL,
        type       TEXT    NOT NULL DEFAULT 'paragraph'
                     CHECK (type IN ('paragraph','heading','todo','bullet',
                                     'numbered','quote','divider','code')),
        text       TEXT,
        checked    INTEGER NOT NULL DEFAULT 0 CHECK (checked IN (0, 1)),
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      -- Editörün tek sorgusu: bir notun blokları, sırasıyla.
      CREATE INDEX IF NOT EXISTS idx_blocks_note
        ON note_blocks (note_id, position);

      -- Geri doldurma: mevcut her content tek bir paragraf bloğuna dönüşür.
      -- TRIM şartı olmazsa boş/boşluklu her not için ölü bir blok satırı doğar.
      INSERT INTO note_blocks
        (note_id, position, type, text, checked, created_at, updated_at)
      SELECT id, 1000, 'paragraph', content, 0, created_at, last_tended_at
        FROM notes
       WHERE content IS NOT NULL AND TRIM(content) <> '';
    `,
  },
  // Sonraki sürümler buraya eklenecek; yayınlanmış kayıtlar ASLA düzenlenmez.
];

/** Migration listesindeki en yüksek sürüm = hedef şema sürümü. */
export const TARGET_SCHEMA_VERSION = MIGRATIONS.reduce(
  (max, m) => Math.max(max, m.version),
  0,
);
