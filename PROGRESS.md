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
- [x] Günün kelimesi: A1–C1 ~1450 kelime (Türkçe anlam), Biliyorum / Sonraki, özel kelimeler, sözlük önbelleği ve 8 sn zaman aşımı
- [x] Ayarlar paneli: Görünüm, Kısayollar, Komutlar, Widget'lar, Veri
- [x] Arka plan: varsayılan SVG / yüklenen görsel / düz renk
- [x] Fontlar gömülü (sadece latin + latin-ext)
- [x] Dev shim: `npx vite` ile sayfa normal tarayıcıda açılabiliyor
- [x] Görsel düzeltmeler: büyük kısayollar, widget'lar aşağıda, kalın JetBrains Mono saat

## Açık kalanlar

### Önce bunlar
- [ ] **Firefox/Zen'de gerçek test:** sekme kapalıyken Pomodoro sürüyor mu, bildirim + ses geliyor mu, favicon'lar geliyor mu, host izinleri açık mı.
- [ ] **Sözlük API'si:** dictionaryapi.dev tarayıcı kaynaklı isteklere 522 döndürüyordu (curl'de `Origin` başlığıyla da 522). Eklentide de çalışmazsa kaynağı değiştir (aday: Wiktionary REST API). Şu an widget yerel veriye düşüyor.
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
