/**
 * Domain tipleri.
 *
 * Zaman kuralı: bütün zaman damgaları SQLite'ta INTEGER (epoch ms, UTC).
 * ISO string yerine epoch kullanıyoruz çünkü time-skip hesabı, sıralama ve
 * WHERE karşılaştırmaları saat dilimi derdi olmadan yapılabiliyor.
 */

/* ------------------------------------------------------------------ */
/* Enum benzeri birlikler                                              */
/* ------------------------------------------------------------------ */

/** Bir tohumun tarladaki yaşam döngüsü. */
export type NoteStatus =
  | 'planted' // yeni ekildi, henüz filizlenmedi
  | 'growing' // büyüyor, hasada hazırlanıyor
  | 'weedy'; // uzun süre ilgilenilmedi, yabani ot bastı

export const NOTE_STATUSES = ['planted', 'growing', 'weedy'] as const;

/** Notun türünü temsil eden ürün. İkonlar buradan geliyor. */
export type SeedType =
  | 'wheat' // hızlı, gündelik görev
  | 'carrot' // kısa not
  | 'tomato' // orta vadeli görev
  | 'pumpkin' // büyük / uzun soluklu iş
  | 'sunflower'; // fikir, serbest not

export const SEED_TYPES = [
  'wheat',
  'carrot',
  'tomato',
  'pumpkin',
  'sunflower',
] as const;

/**
 * Blok türü. Notun içeriği artık tek bir metin değil, sıralı blokların
 * listesi. Tür hem görünümü hem davranışı belirliyor.
 */
export type BlockType =
  | 'paragraph' // düz metin
  | 'heading' // not içi başlık
  | 'todo' // işaretlenebilir madde
  | 'bullet' // madde imi
  | 'numbered' // sıralı madde
  | 'quote' // alıntı
  | 'divider' // yatay ayraç (metni yok)
  | 'code'; // tek aralıklı blok

export const BLOCK_TYPES = [
  'paragraph',
  'heading',
  'todo',
  'bullet',
  'numbered',
  'quote',
  'divider',
  'code',
] as const;

/** Hasat kalitesi. Not hangi durumdayken toplandıysa ona göre. */
export type HarvestQuality =
  | 'golden' // tam olgunlaşmışken (growing) hasat edildi
  | 'normal' // erken hasat (planted)
  | 'withered'; // ot basmışken (weedy) hasat edildi

export const HARVEST_QUALITIES = ['golden', 'normal', 'withered'] as const;

/* ------------------------------------------------------------------ */
/* Domain modelleri                                                    */
/* ------------------------------------------------------------------ */

/** Notes tablosu, yani tohumlar. */
export interface Note {
  id: number;
  title: string;
  content: string | null;
  /** Ekilme anı (epoch ms). */
  created_at: number;
  status: NoteStatus;
  seed_type: SeedType;
  /**
   * Son bakım anı (epoch ms): ekim, düzenleme ya da ot temizleme.
   * Ot hesabı created_at'e değil buna bakıyor, yoksa temizlediğin not bir
   * sonraki açılışta anında tekrar 'weedy' oluyor.
   */
  last_tended_at: number;
  /**
   * Hasat edildiyse epoch ms, edilmediyse null. Notu silmiyoruz, hasat edilen
   * tarladan çıkıyor ama satırı duruyor (kilerin kaynağı bu).
   */
  harvested_at: number | null;
  // favoriye eklenme zamanı, favori değilse null (migration 3)
  favorited_at: number | null;
}

/**
 * note_blocks tablosu, notun içeriği.
 *
 * `position` 1000'er artıyor. Araya blok eklemek iki komşunun ortasına tek
 * satır yazmak demek, bütün listeyi yeniden numaralamak değil. Aradaki boşluk
 * biterse repository notu baştan numaralıyor.
 */
export interface NoteBlock {
  id: number;
  note_id: number;
  position: number;
  type: BlockType;
  /** divider dışında hep dolu. Boş blokta "" var, null değil. */
  text: string | null;
  /** Sadece todo bloklarında kullanılıyor. */
  checked: boolean;
  created_at: number;
  updated_at: number;
}

/** Inventory tablosu, yani kiler. */
export interface InventoryItem {
  id: number;
  /** Kaynak not. Not gerçekten silinirse null oluyor (ON DELETE SET NULL). */
  original_note_id: number | null;
  /** Hasat anındaki başlığın kopyası. Kiler nottan bağımsız okunabilsin diye. */
  title: string;
  seed_type: SeedType;
  quality: HarvestQuality;
  harvested_at: number;
}

/** Settings tablosu. Tek satır, id = 1. */
export interface Settings {
  id: number;
  /** Uygulamanın en son açıldığı an (epoch ms). Time-skip'in referans noktası. */
  last_opened_at: number;
}

/* ------------------------------------------------------------------ */
/* Ham SQLite satırları                                                */
/* ------------------------------------------------------------------ */
// SQLite union tip bilmiyor, status/seed_type/quality string olarak geliyor.
// Row tiplerini ayrı tutup mapper'da kontrol ediyoruz.

export interface NoteRow {
  id: number;
  title: string;
  content: string | null;
  created_at: number;
  status: string;
  seed_type: string;
  last_tended_at: number;
  harvested_at: number | null;
  favorited_at: number | null;
}

export interface NoteBlockRow {
  id: number;
  note_id: number;
  position: number;
  type: string;
  text: string | null;
  /** SQLite'ta boolean yok: 0/1 INTEGER. */
  checked: number;
  created_at: number;
  updated_at: number;
}

export interface InventoryRow {
  id: number;
  original_note_id: number | null;
  title: string;
  seed_type: string;
  quality: string;
  harvested_at: number;
}

export interface SettingsRow {
  id: number;
  last_opened_at: number;
}

/* ------------------------------------------------------------------ */
/* Girdi (DTO) tipleri                                                 */
/* ------------------------------------------------------------------ */

export interface CreateNoteInput {
  title: string;
  content?: string | null;
  seed_type?: SeedType;
  /** Test için zamanı dışarıdan verebilmek. Boşsa Date.now(). */
  created_at?: number;
}

export interface UpdateNoteInput {
  title?: string;
  content?: string | null;
  seed_type?: SeedType;
}

export interface CreateBlockInput {
  note_id: number;
  /** Verilmezse 'paragraph'. */
  type?: BlockType;
  text?: string | null;
  checked?: boolean;
  /**
   * Yeni blok bu bloğun hemen ardına girer. Verilmezse (veya null) notun
   * sonuna eklenir.
   */
  after_block_id?: number | null;
}

export interface UpdateBlockInput {
  type?: BlockType;
  text?: string | null;
  checked?: boolean;
}

export interface NoteQuery {
  /** Sadece tarladakiler (hasat edilmemiş). Varsayılan true. */
  onlyActive?: boolean;
  status?: NoteStatus | NoteStatus[];
  seed_type?: SeedType;
  /** Başlık/içerikte LIKE araması. */
  search?: string;
  limit?: number;
  offset?: number;
}

export interface InventoryQuery {
  seed_type?: SeedType;
  quality?: HarvestQuality;
  limit?: number;
  offset?: number;
}

/* ------------------------------------------------------------------ */
/* Time-skip sonucu                                                    */
/* ------------------------------------------------------------------ */

/** Açılışta simüle edilen geçen zamanın özeti. UI bunu gösteriyor. */
export interface TimeSkipResult {
  /** Simülasyon fiilen çalıştı mı (ilk açılış veya eşik altındaysa false). */
  didRun: boolean;
  /** last_opened_at ile şimdi arasındaki fark (ms). */
  elapsedMs: number;
  /** Kullanıcıya gösterilecek tam gün sayısı. */
  elapsedDays: number;
  /** İlk kez açılıyorsa true (Settings satırı yeni oluşturuldu). */
  isFirstLaunch: boolean;
  /** Cihaz saati geriye alınmış olabilir (elapsedMs < 0). */
  clockWentBackwards: boolean;
  /** 'planted' -> 'growing' geçen not id'leri. */
  grownNoteIds: number[];
  /** -> 'weedy' geçen not id'leri. */
  weededNoteIds: number[];
  /** Simülasyonun referans aldığı "şimdi". */
  now: number;
}
