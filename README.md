# HarvestNote

Fikirlerini ektiğin, büyüttüğün ve zamanla olgunlaşan oyunlaştırılmış not defteri.

Tamamen çevrimdışı çalışır. Her not toprağa ekilen bir tohumdur; ilgilenilmezse
yabani ot basar, olgunlaşınca hasat edilip kilere düşer.

## Kurulum

```bash
npm install
npx expo start
```

Kurulu sürümler: Expo SDK 57 · React Native 0.86 · Reanimated 4 ·
React Navigation 7.

## Yapı

```
App.tsx                          GestureHandlerRootView + FarmProvider + açılış kapısı
src/bootstrap.ts                 Açılış sırası: DB -> time-skip -> tarla özeti

src/types/index.ts               Domain tipleri, ham satır tipleri, DTO'lar
src/db/schema.ts                 Tablolar + user_version tabanlı migration listesi
src/db/database.ts               Tek bağlantı (singleton), pragmalar, migration runner
src/db/mappers.ts                Ham satır -> domain modeli (union doğrulamalı)
src/db/repositories/notes.ts     Ekme, düzenleme, ot temizleme, hasat, sorgular
src/db/repositories/inventory.ts Kiler kayıtları ve özet
src/db/repositories/settings.ts  last_opened_at singleton'ı

src/game/config.ts               Zaman eşikleri ve tohum kataloğu (tek ayar noktası)
src/game/growth.ts               Büyüme/ot kurallarının saf hesabı (DB'siz test edilebilir)
src/game/stages.ts               Görsel aşama türetimi (planted/growing/harvestable/weedy)
src/game/timeSkip.ts             Zaman atlaması: ölç, uygula, damgayı tazele

src/providers/FarmProvider.tsx   Kök sağlayıcı, foreground simülasyonu, revision sayacı
src/hooks/useNotes.ts            Tarla verisi + mutasyonlar (iyimser güncelleme)
src/hooks/useInventory.ts        Kiler verisi + özet
src/hooks/useNow.ts              Ekran başına tek "şimdi" saati

src/notifications/weedReminders.ts  Ot uyarilari: planlama, izin, esitleme
src/hooks/useReminderTap.ts      Bildirime dokununca ilgili notu acar

src/navigation/RootNavigator.tsx Alt sekmeler: Tarla · Kiler
src/screens/FarmScreen.tsx       Toprak ızgarası (2-3 sütun), paneller, ipuçları
src/screens/InventoryScreen.tsx  Hasat edilen ürünlerin rafları
src/components/NoteCard.tsx      Jestler ve animasyonlar (temizleme / hasat / açma)
src/components/BottomSheet.tsx   Modal + Reanimated panel altyapısı
src/components/AddSeedSheet.tsx  Tohum ekme paneli
src/components/NoteDetailSheet.tsx  Detay / düzenleme paneli
src/components/SeedPicker.tsx    Yatay tohum seçici
src/components/InventoryCard.tsx Kalite renkli kiler kartı
src/components/PixelButton.tsx   Temel buton
src/components/HintToast.tsx     Kısa ipucu balonu
src/theme/index.ts               Toprak paleti, aralıklar, tipografi
src/utils/format.ts              Tarih/süre biçimlendirme
```

## Etkileşimler

| Aşama         | Jest                       | Sonuç                                            |
| ------------- | -------------------------- | ------------------------------------------------ |
| `planted`     | dokunma                    | detay paneli                                      |
| `growing`     | dokunma                    | detay paneli                                      |
| `harvestable` | yukarı kaydır / uzun bas   | ürün küçülüp kaybolur, kilere düşer               |
| `harvestable` | dokunma                    | detay paneli                                      |
| `weedy`       | yana kaydır                | otlar süzülür, `tendNote` çalışır                 |
| `weedy`       | dokunma                    | **açılmaz** — kart sallanır, ipucu gösterilir     |

## Ot hatırlatmaları

Bir not ot bağlamasına **6 saat kala** yerel bildirim gönderilir
(`WEED_REMINDER_LEAD_MS`, `src/game/config.ts`).

Arka plan servisi yine yok: ot basma anı `last_tended_at`'ten deterministik
hesaplandığı için bildirim baştan işletim sistemine kurulur ve uygulama kapalıyken
de tetiklenir.

- **Eşitleme tek noktadan.** Ekim, düzenleme, ot temizleme, hasat, silme ve zaman
  atlaması — hepsi `FarmProvider`'daki `revision` sayacını artırır, o da
  `syncWeedReminders()` çağırır. Kurulu bildirimler her seferinde veritabanından
  yeniden türetilir; "hasat edildi ama bildirimi hâlâ kurulu" gibi kaçak kalmaz.
- **Şema değişmedi.** Bildirim ↔ not bağı, sabit tanımlayıcıyla (`weed-<id>`)
  kuruluyor; yeni sütun ve migration gerekmedi. Aynı tanımlayıcıyla tekrar kurmak
  mevcut kaydın yerine geçtiği için işlem idempotent.
- **İzin, ilk tohum ekildiğinde isteniyor** — açılışta değil. Tarla boşken
  sorulacak bir şey yok.
- **Bildirim ikincil.** İzin reddedilirse veya bildirim katmanı hata verirse
  uygulama normal çalışır, yalnızca hatırlatma gelmez.
- Bildirime dokunulduğunda ilgili not açılır; o arada ot basmışsa detay yerine
  "yana kaydırıp temizle" ipucu gösterilir (kartın kuralıyla tutarlı).

> **Expo Go uyarısı:** SDK 53'ten beri `expo-notifications` Expo Go'da sınırlı
> çalışır (Android'de özellikle). Hatırlatmaları gerçekten görmek için
> development build gerekir: `npx expo run:android` / `npx expo run:ios`.

## Kararlar

- **Zaman damgaları epoch ms (INTEGER).** Karşılaştırma ve zaman farkı hesabı
  saat dilimi/format belirsizliği olmadan yapılabiliyor.
- **Notlar silinmez.** Hasat, `notes.harvested_at`'i damgalar ve `inventory`'ye
  bir satır ekler; ikisi tek transaction'da.
- **`harvestable` veritabanında yok.** Zamanın fonksiyonu olduğu için
  kalıcılaştırılmaz, `resolveStage` ile türetilir. Şema (ve CHECK kısıtı)
  bozulmadan kalır.
- **Ot hesabı `created_at`'e değil `last_tended_at`'e bakar.** Aksi halde
  temizlenen bir not sonraki açılışta anında tekrar ot bağlardı.
- **Arka plan servisi yok.** Geçen süre yalnızca uygulama açıldığında ve
  arka plandan öne döndüğünde simüle edilir.
- **Hatırlatmalar da türetilir, saklanmaz.** Zamanlanmış bildirim listesi
  veritabanının bir fonksiyonu; kaynak doğruluk her zaman SQLite'ta.
- **Ekstra UI kütüphanesi yok.** Bottom sheet, butonlar ve ikonlar RN'in temel
  bileşenleri, StyleSheet ve emoji ile kuruldu.

## Geliştirme notu

Tarla ekranındaki "⏩ Zaman makinesi" düğmesi yalnızca `__DEV__` derlemesinde
görünür; aktif notları bir gün yaşlandırıp simülasyonu zorla çalıştırır.
Eşikler ürün için doğru (en hızlı tohum 4 saatte filizlenir, ot 48 saatte
basar) ama aşamaları elle denemenin başka yolu yok.
