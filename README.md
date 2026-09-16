# NewTab

Firefox yeni sekme eklentisi: komut paleti, saat, iki site kısayol grubu, Pomodoro, çalışma ısı haritası ve günün kelimesi.

## Özellikler

- **Komut paleti** — `Ctrl+K` veya `/`. Link (`gh`), arama (`yt lofi`) ve hazır eylem (`pomo`, `skip`, `tag React`, `word`, `settings`) komutları. Komutlar Ayarlar → Komutlar'dan düzenlenir.
- **Site kısayolları** — sol ve sağ grup, grup başına 10 site. İkonlar otomatik gelir; sağ tık ile düzenle / sil / ikon değiştir.
- **Pomodoro** — arka planda çalışır, sekme kapansa da devam eder. Süre bitince bildirim ve ses. Oturumlara etiket verilebilir.
- **Çalışma istatistiği** — son 18 haftanın ısı haritası, günlük etiket dağılımı ve seri sayacı.
- **Günün kelimesi** — A1–C1 seviyelerinde 3000 kelime, Türkçe anlamlarıyla. İngilizce tanım ve örnek cümle Wiktionary'den, telaffuz tarayıcının kendi sesinden. "Öğrendiklerim" sekmesinde bildiğin kelimeler tarihiyle birlikte listelenir.
- **Ayarlar** — sağ alt köşeye fareyle gelince çıkan butondan: arka plan, fontlar, saat, widget sırası, yedekleme.

## Geliştirme

```bash
npm install
npm test          # Vitest
npm run build     # tip kontrolü + dist/
npx vite          # sayfayı normal tarayıcıda açar (WebExtension API'leri dev shim ile taklit edilir)
npm start         # dist/'i geçici eklenti olarak Firefox'ta açar (web-ext run)
npm run pack      # artifacts/ altına .zip üretir
```

## Firefox / Zen'e yükleme

1. `npm run build`
2. `about:debugging#/runtime/this-firefox` → **Geçici Eklenti Yükle…**
3. `dist/manifest.json` dosyasını seç.
4. Yeni bir sekme aç. Firefox eklentinin yeni sekmeyi değiştirmesini onaylamanı isteyebilir.

Geçici eklentiler tarayıcı kapanınca kaldırılır. Kalıcı kullanım için imzasız eklentiye izin veren bir sürüm (Developer Edition / Nightly / Zen'de `xpinstall.signatures.required = false`) ile `npm run pack` çıktısını `.xpi` olarak yükleyebilirsin.

## İzinler

| İzin | Neden |
|---|---|
| `storage`, `unlimitedStorage` | Ayarlar, kısayollar, geçmiş ve yüklenen görseller |
| `alarms` | Pomodoro sürelerinin sekme kapalıyken bitmesi |
| `notifications` | Süre bitti bildirimi |
| `icons.duckduckgo.com`, `www.google.com` | Site ikonları. Servisler eksik ikon için 404 ile yer tutucu görsel döndürdüğünden durum kodu okunabilsin diye ikonlar `fetch` ile alınır |
| `en.wiktionary.org` | Kelimenin İngilizce tanımı ve örnek cümlesi |

## Lisans

GPL-3.0. Arayüz ikonları ve site ikonu kutusunun ölçüleri [Bonjourr](https://github.com/victorazevedo-me/Bonjourr)'dan (GPL-3.0) alınmıştır.

Kelime listeleri `tools/build-words.mjs` ile üretilir:

- Türkçe anlamlar: [FreeDict eng-tur](https://freedict.org/) sözlüğü (GPL-2.0+)
- Seviye sıralaması: [FrequencyWords](https://github.com/hermitdave/FrequencyWords) OpenSubtitles sıklık listesi (MIT)
- Çevrimiçi tanım ve örnek cümle: [Wiktionary](https://en.wiktionary.org/) (CC BY-SA 4.0), istek anında çekilir, pakete girmez
