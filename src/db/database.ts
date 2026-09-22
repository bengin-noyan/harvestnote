/**
 * DB bağlantısı.
 *
 * - Tek bağlantı tutuyoruz (promise'i cache'liyoruz). expo-sqlite'ta aynı
 *   dosyayı birkaç kez açmak WAL'da kilit sorunu çıkarabiliyor.
 * - Açarken pragmaları set edip bekleyen migration'ları koşturuyoruz.
 * - Aynı anda iki getDatabase() çağrısı gelirse cache sayesinde tek açılış
 *   oluyor.
 */
import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

import { DATABASE_NAME, MIGRATIONS, TARGET_SCHEMA_VERSION } from './schema';

export type Database = SQLite.SQLiteDatabase;

let connection: Promise<Database> | null = null;

/** Migrate edilmiş bağlantıyı verir, ilk çağrıda açar. */
export function getDatabase(): Promise<Database> {
  if (!connection) {
    connection = open().catch((error) => {
      // Hatalı promise cache'te kalmasın, sonraki çağrı yeniden denesin.
      connection = null;
      throw error;
    });
  }
  return connection;
}

/**
 * Açılışta bir kez çağrılıyor. getDatabase() zaten lazy açıyor, bu sadece
 * niyeti belli etsin ve hatayı erken görelim diye duruyor.
 */
export async function initDatabase(): Promise<Database> {
  return getDatabase();
}

async function open(): Promise<Database> {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);

  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);

  await migrate(db);
  return db;
}

/** user_version'dan hedefe kadar bekleyen migration'ları sırayla koşar. */
async function migrate(db: Database): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version',
  );
  const current = row?.user_version ?? 0;

  if (current >= TARGET_SCHEMA_VERSION) return;

  const pending = MIGRATIONS.filter((m) => m.version > current).sort(
    (a, b) => a.version - b.version,
  );

  for (const migration of pending) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(migration.statements);
      // PRAGMA'ya parametre bağlanamıyor. Değer bizim sabitimiz, o yüzden
      // buradaki interpolasyon sorun değil.
      await db.execAsync(`PRAGMA user_version = ${migration.version}`);
    });
  }
}

/**
 * Yazma transaction'i.
 *
 * Native'de exclusive kullaniyoruz ki iki hizli jest ayni satiri ayni anda
 * degistirmesin. Web'de expo-sqlite bunu desteklemiyor
 * ("withExclusiveTransactionAsync is not supported on web"), orada duz
 * transaction'a dusuyoruz. Web tek thread oldugu icin yaris zaten yok,
 * atomikligi de BEGIN/COMMIT sagliyor.
 *
 * Iki durumda da icerideki sorgular `txn` uzerinden gitmeli. Exclusive
 * transaction sirasinda global `db` ile yazinca kilitleniyor.
 */
export async function withWriteTransaction(
  db: Database,
  task: (txn: Database) => Promise<void>,
): Promise<void> {
  if (Platform.OS === 'web') {
    return db.withTransactionAsync(() => task(db));
  }
  return db.withExclusiveTransactionAsync(task);
}

/** Bağlantıyı kapatır. Test sonu / çıkış senaryoları için. */
export async function closeDatabase(): Promise<void> {
  if (!connection) return;
  const db = await connection.catch(() => null);
  connection = null;
  await db?.closeAsync();
}

/** DİKKAT: bütün veriyi siliyor. Sadece geliştirme için, üretimde çağırmayın. */
export async function resetDatabase(): Promise<void> {
  const db = await getDatabase();
  // Yeni tablo eklerken buraya da eklemeyi unutmayın. Eksik kalan tablo
  // sıfırlamadan sonra yarım şema bırakıyor, hatayı çok geç fark ediyorsunuz.
  await db.execAsync(`
    DROP TABLE IF EXISTS note_blocks;
    DROP TABLE IF EXISTS inventory;
    DROP TABLE IF EXISTS notes;
    DROP TABLE IF EXISTS settings;
    PRAGMA user_version = 0;
  `);
  await migrate(db);
}
