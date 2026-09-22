// DB tarafına hep buradan giriyoruz. UI, database.ts ya da schema.ts'i
// doğrudan import etmesin.
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
