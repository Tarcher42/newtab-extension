# İlerleme

Son güncelleme: 2026-09-16 · Sürüm 0.1.0

## Durum

İlk sürüm tamamlandı ve paketlendi (`../NewTab.xpi`). Sayfa, dev shim ile Chrome'da (agent-browser) ekran görüntüsüyle kontrol edildi; **gerçek Firefox/Zen'de henüz denenmedi.**

- Testler: 150 geçiyor (`npm test`)
- Tip kontrolü temiz (`npm run build`)
- `web-ext lint`: 0 hata, 1 uyarı (Preact çekirdeğindeki `innerHTML`, zararsız)

Tasarım: `docs/superpowers/specs/2026-09-16-newtab-design.md`
Plan: `docs/superpowers/plans/2026-09-16-newtab.md`

## Yapılanlar

- [x] Proje iskeleti: Preact + TypeScript + Vite + Vitest, Firefox MV3 manifest
- [x] Depolama katmanı: tipli `storage.local`, şema geçişleri (v2), JSON yedekleme, IndexedDB görsel deposu
- [x] Komut paleti: `Ctrl+K` / `/`, gruplu liste, sıralama, link / arama (`{q}`) / eylem komutları, titreme
- [x] Site kısayolları: sol/sağ grup, grup başına 10, sütun sütun doluş, sağ tık menüsü, favicon zinciri (DuckDuckGo → Google → baş harf), önbellek
- [x] Pomodoro: arka plan zamanlayıcı (`alarms`), bildirim, üretilmiş ses, etiketler, yarım oturum kaydı
- [x] Çalışma istatistiği: 18 haftalık ısı haritası, etiket tooltip'i, seri
- [x] Günün kelimesi: A1–C1 3000 kelime (Türkçe anlam), Biliyorum / Sonraki, özel kelimeler, sözlük önbelleği ve 8 sn zaman aşımı
- [x] Kelime verisi `tools/build-words.mjs` ile üretiliyor: anlamlar FreeDict eng-tur (GPL-2.0+), seviyeler OpenSubtitles sıklık listesinden (MIT). AnkiWeb desteleri lisanssız olduğu için kullanılmadı
- [x] Sözlük kaynağı Wiktionary REST API oldu (dictionaryapi.dev çöktü); telaffuz tarayıcının `speechSynthesis`'inden, ek izin yok
- [x] Kelime widget'ında "Bugün" / "Öğrendiklerim" sekmeleri; bilinen kelimeler tarihiyle listeleniyor ve geri alınabiliyor
- [x] Ayarlarda kelime tarayıcısı: Tümü / Bilinenler / Kendi kelimelerim filtresi, arama, 50'şerli sayfalama
- [x] Isı haritasına renk skalası ve tıklayınca sabitlenen gün bilgisi
- [x] İkonlar Lucide setine geçti (ISC), emoji kullanılan yerler (🔊, 🔥) ikon oldu. Catppuccin'in kendi depolarında arayüz ikonu yok, yalnızca editör dosya ikonları var
- [x] Renkler Catppuccin Mocha paletine bağlandı (`--ctp-*` değişkenleri)
- [x] Öğrendiklerim listesinde kelimeye tıklayınca detay açılıyor; her satırda ve detayda çöp kutusu var
- [x] Ayarlar paneli: Görünüm, Kısayollar, Komutlar, Widget'lar, Veri
- [x] Arka plan: varsayılan SVG / yüklenen görsel / düz renk
- [x] Fontlar gömülü (sadece latin + latin-ext)
- [x] Dev shim: `npx vite` ile sayfa normal tarayıcıda açılabiliyor
- [x] Görsel düzeltmeler: büyük kısayollar, widget'lar aşağıda, kalın JetBrains Mono saat

## Açık kalanlar

### Önce bunlar
- [x] **Firefox/Zen'de gerçek test (2026-09-16):** favicon'lar, komut paleti, veri yedeği ve sekme kapalıyken Pomodoro çalışıyor; bildirim sesi geliyor.
- [x] **Sözlük:** dictionaryapi.dev çöktü, Wiktionary'ye geçildi.
- [ ] **Wiktionary'yi gerçek eklentide doğrula:** tanım ve örnek cümle geliyor mu, 🔊 sesi çalışıyor mu (Zen'de İngilizce ses paketi kurulu olmayabilir).
- [ ] **Kalıcı kurulum:** imzasız kurulum (`xpinstall.signatures.required = false`) ya da AMO'da unlisted imzalama (`web-ext sign`).

### Bilinen kısıt
- `Ctrl+K` yeni sekme ilk açıldığında çalışmaz (odak adres çubuğunda); sayfaya bir kez tıklamak gerekir.

### Sonraya bırakılanlar
- [ ] Chrome / Chromium desteği
- [ ] Kısayollarda sürükle-bırak sıralama
- [ ] Unsplash arka planları
- [ ] `storage.sync` ile cihazlar arası senkron

## Tasarımdan sapmalar

- Favicon servisleri ve sözlük için **host izinleri** eklendi: servisler eksik ikon için 404 + yer tutucu görsel döndürüyor, `<img onerror>` bunu yakalayamıyor.
- `TimerState`'e `durationMs` ve `startedAt`, `Settings.background`'a `imageVersion` eklendi.
- Kelime listesi tek `words.json` yerine `public/words/{A1..C1}.json`.
- Lisans GPL-3.0 (Bonjourr SVG ikonları kullanıldığı için).
