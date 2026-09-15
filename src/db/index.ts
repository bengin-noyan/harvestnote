/**
 * Veri katmanının tek giriş noktası. UI ve hook'lar burayı import etsin;
 * `database.ts`/`schema.ts` gibi iç modüllere doğrudan bağlanmasın.
 */
export {
  closeDatabase,
  getDatabase,
  initDatabase,
  resetDatabase,
  type Database,
} from './database';
export { DATABASE_NAME, TARGET_SCHEMA_VERSION } from './schema';
export * as notesRepository from './repositories/notes';
export * as blocksRepository from './repositories/blocks';
export * as inventoryRepository from './repositories/inventory';
export * as settingsRepository from './repositories/settings';
