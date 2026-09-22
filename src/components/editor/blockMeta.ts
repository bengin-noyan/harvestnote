/**
 * Blok türlerinin görünen tarafı: etiket, simge, placeholder ve `/` menüsünde
 * aranacak kelimeler.
 *
 * types/index.ts'e koymadım, orası domain tipi. theme'e de koymadım, renk
 * değil metin taşıyor. Burası React import etmeyen düz veri.
 */
import type { BlockType } from '../../types';

export interface BlockMeta {
  type: BlockType;
  label: string;
  icon: string;
  /** `/` menüsünde etiketin altındaki tek satır açıklama. */
  hint: string;
  /** Blok boşken gösterilecek metin. */
  placeholder: string;
  /** Etiket dışında bu kelimelerle de bulunabilir. */
  keywords: string[];
  /** Ayracın metin kutusu yok; yalnızca çizgi çiziyor. */
  hasText: boolean;
  /**
   * Enter'a basınca yeni blok aynı türde devam etsin mi? Listelerde evet,
   * yoksa her madde için türü tekrar seçmek gerekiyor.
   */
  continues: boolean;
}

export const BLOCK_META: Record<BlockType, BlockMeta> = {
  paragraph: {
    type: 'paragraph',
    label: 'Metin',
    icon: '📝',
    hint: 'Düz paragraf',
    placeholder: 'Yazmaya başla, blok için / yaz',
    keywords: ['metin', 'paragraf', 'text', 'yazi'],
    hasText: true,
    continues: false,
  },
  heading: {
    type: 'heading',
    label: 'Başlık',
    icon: '🔠',
    hint: 'Bölüm başlığı',
    placeholder: 'Başlık',
    keywords: ['baslik', 'heading', 'bolum'],
    hasText: true,
    continues: false,
  },
  todo: {
    type: 'todo',
    label: 'Yapılacak',
    icon: '☑️',
    hint: 'İşaretlenebilir madde',
    placeholder: 'Yapılacak iş',
    keywords: ['yapilacak', 'todo', 'gorev', 'kutu', 'check'],
    hasText: true,
    continues: true,
  },
  bullet: {
    type: 'bullet',
    label: 'Madde',
    icon: '•',
    hint: 'Madde imli liste',
    placeholder: 'Madde',
    keywords: ['madde', 'liste', 'bullet'],
    hasText: true,
    continues: true,
  },
  numbered: {
    type: 'numbered',
    label: 'Sıralı madde',
    icon: '1.',
    hint: 'Numaralı liste',
    placeholder: 'Sıralı madde',
    keywords: ['sirali', 'numara', 'liste', 'numbered'],
    hasText: true,
    continues: true,
  },
  quote: {
    type: 'quote',
    label: 'Alıntı',
    icon: '❝',
    hint: 'Girintili alıntı',
    placeholder: 'Alıntı',
    keywords: ['alinti', 'quote'],
    hasText: true,
    continues: false,
  },
  divider: {
    type: 'divider',
    label: 'Ayraç',
    icon: '—',
    hint: 'Yatay çizgi',
    placeholder: '',
    keywords: ['ayrac', 'cizgi', 'divider', 'ayirici'],
    hasText: false,
    continues: false,
  },
  code: {
    type: 'code',
    label: 'Kod',
    icon: '💻',
    hint: 'Tek aralıklı blok',
    placeholder: 'kod',
    keywords: ['kod', 'code', 'monospace'],
    hasText: true,
    continues: false,
  },
};

/** `/` menüsünün sırası: en çok kullanılan üstte. */
export const BLOCK_MENU_ORDER: BlockType[] = [
  'paragraph',
  'todo',
  'heading',
  'bullet',
  'numbered',
  'quote',
  'code',
  'divider',
];

/**
 * Aramada Türkçe karakterleri sadeleştiriyor. "Sıralı" yazan da "sirali"
 * yazan da aynı bloğu bulsun, menüde hızlı yazarken klavye değiştirmek
 * zorunda kalmayalım.
 */
export function foldTurkish(value: string): string {
  return value
    .toLocaleLowerCase('tr')
    .replace(/[ıİ]/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/â/g, 'a');
}

/** `/` sonrası yazılana göre blok türlerini süzer. Boş sorgu hepsini verir. */
export function matchBlockTypes(query: string): BlockMeta[] {
  const all = BLOCK_MENU_ORDER.map((type) => BLOCK_META[type]);
  const term = foldTurkish(query.trim());
  if (!term) return all;

  return all.filter((meta) => {
    if (foldTurkish(meta.label).includes(term)) return true;
    return meta.keywords.some((word) => foldTurkish(word).includes(term));
  });
}
