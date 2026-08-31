/**
 * Veritabanı bağlantı katmanı.
 *
 * - Tek bir bağlantı (singleton promise) paylaşılır: expo-sqlite'ta aynı
 *   dosyayı birden çok kez açmak WAL altında kilit/tutarlılık sorunları
 *   çıkarabilir.
 * - Açılış sırasında pragmalar ayarlanır ve bekleyen migration'lar koşar.
 * - `getDatabase()` çağıran her yer aynı hazır bağlantıyı alır; init yarışı
 *   (aynı anda iki çağrı) promise cache'i sayesinde tek sefere iner.
 */
import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

import { DATABASE_NAME, MIGRATIONS, TARGET_SCHEMA_VERSION } from './schema';

export type Database = SQLite.SQLiteDatabase;

let connection: Promise<Database> | null = null;

/** Hazır (migrate edilmiş) bağlantıyı döndürür. İlk çağrıda açar. */
export function getDatabase(): Promise<Database> {
  if (!connection) {
    connection = open().catch((error) => {
      // Başarısız promise'i cache'te bırakma: sonraki çağrı tekrar denesin.
      connection = null;
      throw error;
    });
  }
  return connection;
}

/**
 * Uygulama açılışında bir kez çağrılır. getDatabase() zaten tembel açılış
 * yapıyor; bu fonksiyon niyeti okunur kılmak ve açılış hatasını erken
 * yakalamak için var.
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

/** user_version'dan hedefe kadar bekleyen migration'ları sırayla uygular. */
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
      // PRAGMA parametre bağlamayı desteklemez; değer bizim sabitimiz olduğu
      // için interpolasyon burada güvenli.
      await db.execAsync(`PRAGMA user_version = ${migration.version}`);
    });
  }
}

/**
 * Yazma transaction'i.
 *
 * Native'de exclusive transaction kullanilir: iki hizli jest ayni satiri
 * ayni anda degistiremesin. expo-sqlite'in web uygulamasi bunu desteklemiyor
 * (`withExclusiveTransactionAsync is not supported on web`), orada duz
 * transaction'a duseriz — web tek is parcacikli oldugu icin korunacak bir
 * yaris zaten yok, atomiklik ise BEGIN/COMMIT ile korunur.
 *
 * Her iki yolda da blok icindeki sorgular verilen `txn` uzerinden gitmeli;
 * exclusive transaction sirasinda global `db` ile yazmak kilitlenme demek.
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

/** Bağlantıyı kapatır (test teardown / logout senaryoları). */
export async function closeDatabase(): Promise<void> {
  if (!connection) return;
  const db = await connection.catch(() => null);
  connection = null;
  await db?.closeAsync();
}

/**
 * DİKKAT: tüm veriyi siler. Sadece geliştirme/test içindir; üretim
 * akışlarından çağrılmamalı.
 */
export async function resetDatabase(): Promise<void> {
  const db = await getDatabase();
  await db.execAsync(`
    DROP TABLE IF EXISTS inventory;
    DROP TABLE IF EXISTS notes;
    DROP TABLE IF EXISTS settings;
    PRAGMA user_version = 0;
  `);
  await migrate(db);
}
