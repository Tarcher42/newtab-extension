# NewTab — Tasarım Dokümanı

- **Tarih:** 2026-09-16
- **Durum:** Onaylandı, yapım planı bekliyor
- **Hedef:** Developer / öğrenciler için Firefox yeni sekme eklentisi

## 1. Kapsam

### İlk sürümde var
- Komut paleti (arama çubuğu yok, sadece komutlar)
- Saat + tarih
- Sol ve sağ site kısayol grupları
- 3 widget: Günün kelimesi, Pomodoro, Çalışma istatistiği
- Gizli settings butonu + ayarlar paneli
- Arka plan: varsayılan görsel / kullanıcı görseli / düz renk
- Font seçimi (genel + saat için ayrı)

### İlk sürümde yok (sonraya)
- Chrome / Chromium desteği (kod buna engel olmayacak şekilde yazılır)
- Unsplash arka planları
- Kısayollarda sürükle-bırak sıralama
- `storage.sync` ile cihazlar arası senkron

## 2. Teknoloji

| Konu | Seçim |
|---|---|
| Hedef tarayıcı | Firefox (Zen dahil), Manifest V3 |
| Arayüz | Preact + TypeScript |
| Build | Vite |
| Test | Vitest (+ Preact Testing Library) |
| Elle test | `web-ext run` |
| Klasör | `mozilla-addons-clone/NewTab/` |

Yeni sekme `chrome_url_overrides.newtab` ile değiştirilir.

## 3. Sayfa Düzeni

Yukarıdan aşağıya:

1. **Komut paleti** — üst orta. Normalde ince, yarı saydam. Hover, tıklama, `Ctrl+K` veya `/` ile büyüyüp öne çıkar, altında komut listesi açılır, sayfa hafifçe kararır.
2. **Orta sıra** — `[Sol grup] [Saat + tarih] [Sağ grup]`.
3. **Alt sıra** — 3 widget kutusu. Varsayılan sıra: **Kelime · Pomodoro · İstatistik**.
4. **Settings butonu** — sağ alt köşe. Normalde görünmez; fare köşedeki ~80×80 px alana girince fade ile belirir. Tıklayınca sağdan ayarlar paneli kayar.

### Görsel kurallar
- Saat, tarih, site başlıkları ve ikonların **arkasında kutu yok**; okunabilirlik için `text-shadow` / `drop-shadow` kullanılır. Gölge yoğunluğu ayarlanabilir.
- Site ikonları yuvarlak köşeli bir kutunun içinde durur (Bonjourr ikon stili referans alınır).
- Widget kutuları: yuvarlatılmış köşeli dikdörtgen, yarı saydam arka plan + `backdrop-filter: blur`.
- Ayarlar paneli: widget kutularıyla aynı yarı saydam + blur stil.
- **Dar ekran:** site grupları saatin altına iner, widget'lar alt alta dizilir.

### Saat ve tarih
- Varsayılan: 24 saat, saniyesiz. Ayarlardan 12 saat ve saniye açılabilir.
- Tarih tarayıcı dilinde: `16 Eylül Çarşamba`.

### Font
- Genel font ve saat fontu ayrı ayrı seçilir.
- Varsayılan: **JetBrains Mono** (OFL lisanslı, `woff2` olarak eklentiye gömülü; ağ isteği yok).
- Gömülü seçenekler: JetBrains Mono, Inter, saat için ince bir display font.
- Serbest metin kutusu: sistemde kurulu herhangi bir font adı (ör. `JetBrainsMono Nerd Font`).

### Dil
- Arayüz Türkçe. `_locales` ile İngilizce altyapısı baştan kurulur.

## 4. Kod Yapısı

```
NewTab/
  public/            → manifest.json, _locales/, fonts/, varsayılan arka plan, words.json
  src/
    newtab/          → sayfa giriş noktası, düzen, saat
    palette/         → komut paleti bileşeni, eşleştirme ve çalıştırma mantığı
    shortcuts/       → site grupları, ekleme/düzenleme popup'ı, favicon zinciri
    widgets/
      pomodoro/      → geri sayım arayüzü
      stats/         → ısı haritası, seri
      word/          → günün kelimesi
    settings/        → ayarlar paneli ve sekmeleri
    background/      → pomodoro zamanlayıcısı, alarm, bildirim, ses
    storage/         → tipli depolama katmanı, şema geçişleri, içe/dışa aktarma
    shared/          → ortak tipler, yardımcılar
```

Modüller birbirleriyle yalnızca `storage` katmanı ve arka plan mesajları üzerinden konuşur. Saf mantık (eşleştirme, durum makinesi, istatistik hesabı, kelime seçimi) arayüzden ayrı dosyalarda tutulur ve bağımsız test edilir.

## 5. Veri ve Depolama

- Tüm yapılandırılmış veri `storage.local`'da.
- Kullanıcının yüklediği arka plan görseli IndexedDB'de.
- Her kayıtta `schemaVersion`; açılışta gerekirse migration çalışır.
- Sekmeler arası güncelleme `storage.onChanged` ile.
- Ayarlar panelinden JSON dışa/içe aktarma (içe aktarmada doğrulama yapılır; geçersiz dosya reddedilir, mevcut veri bozulmaz).

### Modeller

```ts
type Settings = {
  schemaVersion: number
  clock: { h24: boolean; seconds: boolean }
  background: { type: 'default' | 'upload' | 'color'; color: string }
  fonts: { ui: string; clock: string }
  shadowStrength: number            // 0–1
  widgetOrder: WidgetId[]           // ['word', 'pomodoro', 'stats']
  widgetsEnabled: Record<WidgetId, boolean>
  pomodoro: {
    workMin: number                 // 25
    shortMin: number                // 5
    longMin: number                 // 15
    roundsUntilLong: number         // 4
    sound: boolean
    autoStart: boolean              // false
  }
  wordLevel: 'A1' | 'A2' | 'B1' | 'B2' | 'C1'
}

type Shortcut = {
  id: string
  title: string
  url: string
  icon: { type: 'auto' | 'url' | 'upload' | 'letter'; value?: string }
}

type Groups = { left: Shortcut[]; right: Shortcut[] }   // her biri en fazla 10

type Command = {
  id: string
  trigger: string                   // 'gh', 'yt', 'pomo'
  kind: 'link' | 'search' | 'action'
  url?: string                      // link
  template?: string                 // search, '{q}' içerir
  actionId?: ActionId               // action
  uses: number
}

type TimerState = {
  phase: 'idle' | 'work' | 'short' | 'long'
  endsAt: number | null             // epoch ms, çalışıyorsa
  pausedRemaining: number | null    // ms, duraklatılmışsa
  round: number
  tag: string                       // boşsa 'Genel'
}

type Session = { start: number; minutes: number; tag: string }

type WordState = {
  known: string[]
  custom: Word[]
  today: { date: string; word: string }
  cache: Record<string, DictionaryData>
}
```

## 6. Komut Paleti

### Açma / kapama
- `Ctrl+K`, `/` veya tıklama ile açılır; `Esc` veya dışarı tıklama ile kapanır.
- **Firefox kısıtı:** yeni sekme açıldığında odak adres çubuğundadır, bu yüzden `Ctrl+K` sayfaya ulaşmaz. Sayfaya bir kez tıklandıktan sonra çalışır. Yapım sırasında iyileştirme yolları denenir; bulunamazsa bu kısıt kabul edilir.

### Liste
- Palet boşken: **Eylemler / Linkler / Aramalar** başlıklı gruplar, grup içinde alfabetik.
- Yazınca: gruplar kalkar, tek liste. Sıralama: tam eşleşme > önek eşleşme > içerir; eşitlikte `uses` yüksek olan üstte.
- `↑ ↓` seçim, `Enter` çalıştır, `Ctrl+Enter` linki yeni sekmede aç.
- Çalıştırılan komutun `uses` değeri artar.

### Komut türleri
- **Link:** `trigger` → `url`. Kullanıcı ekler/düzenler/siler.
- **Arama (parametreli):** ilk kelime `trigger`, kalan metin `encodeURIComponent` ile `{q}` yerine konur. Kullanıcı ekler/düzenler/siler. Parametre boşsa şablonun kök sitesi açılır.
- **Eylem:** sabit `actionId`. Kullanıcı sadece `trigger`'ı değiştirebilir, silemez.

### Tetikleyici çakışması
- Aynı `trigger` iki komuta atanamaz; ayarlarda kaydederken uyarı gösterilir.

### Eşleşme yok
- `Enter` → kutu kısa bir titreme animasyonu yapar, hiçbir şey çalışmaz.

### Varsayılan komutlar
| Tür | Tetikleyici | İş |
|---|---|---|
| Eylem | `pomo` | Pomodoro başlat / duraklat |
| Eylem | `stop` | Pomodoro sıfırla |
| Eylem | `skip` | Sonraki faza geç |
| Eylem | `tag <ad>` | Etiket ata |
| Eylem | `word` | Sonraki kelime |
| Eylem | `settings` | Ayarları aç |
| Link | `gh` | https://github.com |
| Link | `3000` | http://localhost:3000 |
| Arama | `g` | https://www.google.com/search?q={q} |
| Arama | `yt` | https://www.youtube.com/results?search_query={q} |

## 7. Site Kısayolları

- Sol ve sağ bağımsız gruplar, **grup başına en fazla 10 site**.
- Her grupta 2 sütun, sütun başına 5 satır. **1. sütun yukarıdan aşağı dolmadan 2. sütuna geçilmez.**
- `+ Add New Tab` butonu her zaman son sitenin hemen ardındaki hücrededir; grupta 10 site varsa gizlenir.
- `+` tıklanınca popup: URL (zorunlu), başlık (boşsa alan adından türetilir), ikon seçimi.
- URL şeması yoksa `https://` eklenir; geçersiz URL kaydedilmez.
- Sağ tık menüsü: Düzenle / Sil / İkonu değiştir.
- Tıklama siteyi aynı sekmede açar, orta tık / `Ctrl+tık` yeni sekmede.

### İkon zinciri
1. `icon.type === 'url' | 'upload'` → kullanıcı ikonu
2. `letter` → baş harf + alan adından türetilen sabit renk
3. `auto` → DuckDuckGo favicon servisi → başarısızsa Google favicon servisi → başarısızsa baş harf kutusu

İkonlar Bonjourr'daki gibi yuvarlak köşeli kutunun içine padding ile oturtulur. Kırık ikon hiçbir zaman görünmez.

## 8. Widget'lar

### 8.1 Pomodoro
**Arayüz:** büyük geri sayım (`18:42`) + faz adı (Çalışma / Kısa mola / Uzun mola). Altında etiket seçimi (son kullanılanlar + yeni ekle), altında **Başlat/Duraklat · Atla · Sıfırla**. Halka veya başka görsel süs yok.

**Mantık:**
- Zamanlayıcı arka plan betiğinde yaşar. `TimerState` `storage.local`'da.
- Kalan süre değil `endsAt` saklanır; sayfa her saniye `endsAt - now` gösterir. Uyku / sekme kapatma sonrası doğru kalır.
- Faz sonu için `alarms.create({ when: endsAt })`.
- Faz bitince: bildirim + (açıksa) ses. Sonraki faz `autoStart` kapalıysa kendiliğinden başlamaz; bildirimden veya butondan başlatılır.
- Her `roundsUntilLong` çalışma fazından sonra uzun mola.

**Kayıt kuralları:**
- Tamamlanan çalışma fazı → `Session` (tam süre).
- Sıfırlanan / atlanan çalışma fazı, geçen süre ≥ 1 dk ise → geçen süre kadar `Session`.
- Molalar kaydedilmez.

### 8.2 Çalışma İstatistiği
- **Isı haritası:** son 18 hafta, 7 satır × 18 sütun, en sağ sütun bu hafta.
- **Renk kademeleri:** 0 · <30 dk · <1 sa · <2 sa · ≥2 sa.
- **Tooltip:** tarih, günlük toplam, etiket dağılımı (`14 Eylül — 1 sa 40 dk · Matematik 1 sa, React 40 dk`).
- **Alt satır:** `🔥 12 gün seri · Bugün 1 sa 25 dk`.
- **Seri:** en az bir oturum olan ardışık günler; bugün henüz oturum yoksa seri dünden sayılır, bozulmaz.
- Günler yerel saat dilimine göre hesaplanır.

### 8.3 Günün Kelimesi
**Arayüz:** kelime, fonetik, 🔊 telaffuz, seviye rozeti, Türkçe anlam, İngilizce tanım, örnek cümle, **Biliyorum** ve **Sonraki** butonları.

**Veri:**
- `public/words.json`: İngilizce kelime + Türkçe anlam + seviye (A1–C1), seviye başına ~300 kelime. Liste proje içinde hazırlanır.
- Kullanıcı ayarlardan kendi kelimelerini ekleyebilir (kelime, anlam, seviye).
- `dictionaryapi.dev` ile tanım, fonetik, ses URL'si, örnek cümle çekilir ve `WordState.cache`'e yazılır; aynı kelime için tekrar istek atılmaz.
- API başarısız / kelime bulunamadı → sadece kelime + anlam + seviye gösterilir, hata mesajı yok.

**Seçim:**
- Havuz = seçili seviyedeki liste kelimeleri + kullanıcı kelimeleri − bilinenler.
- Günün kelimesi tarihe göre deterministik seçilir; gün içinde aynı kalır.
- **Sonraki** → havuzdaki bir sonraki kelime, `today` güncellenir.
- **Biliyorum** → kelime `known`'a eklenir, sonraki kelimeye geçilir.
- Havuz boşsa: "Bu seviyedeki tüm kelimeleri biliyorsun" mesajı + seviye değiştir / bilinenleri sıfırla önerisi.

## 9. Ayarlar Paneli

Sağdan kayar, yarı saydam + blur. `Esc` / dışarı tıklama ile kapanır. Değişiklikler anında uygulanır.

| Sekme | İçerik |
|---|---|
| Görünüm | Arka plan türü + görsel yükleme + renk, genel font, saat fontu, 24/12 saat, saniye, gölge yoğunluğu |
| Kısayollar | Sol/sağ grup siteleri: listele, düzenle, sil |
| Komutlar | Link ve arama komutları: ekle, düzenle, sil. Eylemler: sadece tetikleyici düzenle |
| Widget'lar | Sıra, aç/kapat; Pomodoro süreleri, uzun mola sıklığı, ses, otomatik başlat; kelime seviyesi, kullanıcı kelimeleri, bilinenleri sıfırla |
| Veri | JSON dışa/içe aktar, çalışma geçmişini sil, her şeyi sıfırla (onay ister) |

## 10. İzinler

- `storage`
- `alarms`
- `notifications`
- `https://api.dictionaryapi.dev/*`

Favicon'lar `<img>` ile yüklendiği için ek izin gerekmez.

## 11. Hata Durumları

| Durum | Davranış |
|---|---|
| Favicon yüklenemedi | Zincirdeki sonraki kaynağa geç, en son baş harf kutusu |
| Sözlük API hatası | Sadece yerel kelime verisi gösterilir |
| Yüklenen görsel okunamadı / çok büyük | Uyarı, önceki arka plan kalır |
| İçe aktarılan JSON geçersiz | Reddedilir, mevcut veri değişmez |
| Eşleşmeyen komut | Titreme animasyonu |
| Bozuk / eski şema verisi | Migration; kurtarılamazsa varsayılanlar yüklenir |

## 12. Test

**Vitest birim testleri:**
- Komut eşleştirme: sıralama, parametre ayrıştırma, URL kodlama, tetikleyici çakışması
- Kısayol grupları: 10 sınırı, sütun dolumu, `+` butonu konumu/gizlenmesi, URL normalleştirme
- Pomodoro durum makinesi: faz geçişleri, `endsAt`, duraklat/devam, uzun mola sırası, kayıt kuralları
- İstatistik: günlük toplam, renk kademesi, seri (gün sınırı, saat dilimi)
- Kelime seçimi: deterministik seçim, bilinenleri atlama, boş havuz, API hatasında yedek
- Depolama: migration, içe aktarma doğrulaması

**Bileşen testleri:** palet klavye gezinmesi, ayar değişikliğinin arayüze yansıması.

**Elle test:** Firefox'ta `web-ext run`.
