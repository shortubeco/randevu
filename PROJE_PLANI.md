# Kuaför Randevu SaaS – Proje Planı

## Amaç
Birden fazla kuaför işletmesinin (abonelik planlı) dükkanlarını, kuaförlerini ve hizmetlerini web panelinden yönettiği; müşterilerin mobil uygulamadan şehir ve ilçe seçerek randevu aldığı bir SaaS.

## Durum (son güncelleme: 2026-11-07)
- **Web paneli** (`panel.sozcutvcanli.com`): landing, işletme kaydı, işletme paneli, platform admin paneli yayında. Redux Toolkit (RTK Query) ile çalışıyor; sayfalar arası gezintide veri önbellekten gelir, sekme yenilenince sunucudan çekilir.
- **API** (`api.sozcutvcanli.com`): SaaS şemasına uyarlandı, yayında. Okuma, giriş ve kısıtlar canlıda doğrulandı; yazma akışları canlıda test edildi.
- **Veritabanı:** SaaS şeması kuruldu. Test verisi (İstanbul, İzmir, Ankara; yaklaşık 5000 randevu) yüklü. Tüm test hesapları `@test.local`.
- **Mobil uygulama** (`apps/mobile`): Yeni API'ye uyarlandı (dükkan seçimi, `shopId` ile kuaförler, yeni randevu akışı). Android APK ile telefonda kuruldu; müşteri girişi cihazda doğrulandı. Dükkan → randevu akışı cihazda henüz uçtan uca denenmedi.
- Landing'de ilk 10 kuaför ve İstanbul, İzmir, Ankara şehir listeleri gösteriliyor (en az 3 değerlendirmesi olan kuaförler).

## Alınan Kararlar

### Ürün ve iş modeli
- **Tek uygulama, çok işletme:** İşletmeler kendi hesabıyla kayıt olur. Müşteri tek mobil uygulamadan tüm işletmelere ulaşır.
- **Ödeme:** Manuel havale/EFT. Ödeme bilgileri platform admininin panelden girdiği havale ayarından gelir. Ödeme entegrasyonu yok.
- **Abonelik:** Aylık. Ödeme günü her işletme için admin tarafından belirlenir (ayın günü; 29–31 kısa aylarda ayın son gününe kayar). Ücret ve plan, admin dışında değişmez.
- **Pasife alma ve aktif etme:** Admin elle yapar. Otomatik pasife alma yok. Pasif işletmenin sahibi ve kuaförleri giriş yapamaz; müşteriye pasif dükkan listelenmez, mevcut randevular kalır, yeni randevu alınamaz.
- **Deneme süresi yok.** Ücretsiz plan doğrudan kullanılabilir (ama onay bekler).
- **Onay:** Her işletme (ücretsiz dahil) admin onayı bekler. Ücretli planda onay, havale kontrol edildikten sonra ve ilk ödeme tarihi girilerek yapılır.
- **Plan düşürme yok.** Plan limiti dolunca yeni ekleme engellenir; mevcut kayıtlara dokunulmaz.

### Planlar (sabit limitler, fiyat admin panelinden)

| Plan | Dükkan | Kuaför (dükkan başına) | Hizmet (kuaför başına) |
|---|---|---|---|
| Ücretsiz | 1 | 1 | 4 |
| Silver | 1 | sınırsız | sınırsız |
| Gold | sınırsız | sınırsız | sınırsız |

### Yapı
- Her kuaför tek dükkanda çalışır.
- Hizmetler kuaföre bağlıdır; aynı dükkandaki kuaförler farklı hizmet verebilir.
- Puanlama kuaför bazındadır; dükkan puanı yoktur.
- Kuaför hesabını işletme sahibi oluşturur: e-posta ve geçici şifre verir, kuaför ilk girişte şifresini değiştirir.

### Roller
- **PLATFORM_ADMIN:** İşletme onayı, ödeme takibi ve onayı, ödeme günü, aktif/pasif, plan fiyatları, havale ayarı, denetim kaydı.
- **ISLETME_SAHIBI:** Kendi dükkanları, kuaförleri, hizmetleri, çalışma saatleri ve izinleri; kendi randevuları ve panel verileri.
- **KUAFOR:** Kendi randevuları, çalışma saatleri, izinleri, profili.
- **MUSTERI:** Yalnızca mobil uygulama. Web panelinde giriş yapamaz.

### Müşteri akışı (mobil)
- Kayıt: ad, soyad, telefon, e-posta, şifre, şifre tekrarı.
- Giriş sonrası şehir ve ilçe seçimi (Türkiye il/ilçe verisi).
- İlçedeki aktif dükkanlar: önce Gold, sonra Silver, sonra Ücretsiz. İsteğe bağlı hizmet filtresi.
- Sıra: dükkan → kuaför → hizmet → saat.

### Puanlama ve landing
- Puan kuaför bazındadır. Landing listelerine girmek için en az 3 değerlendirme gerekir.
- Landing: istatistikler (aktif işletme, kuaför, değerlendirme), en yüksek puanlı ilk 10 kuaför, İstanbul/İzmir/Ankara'nın kendi en iyileri, renkli plan kartları.

## Veri modeli (özet)
- Güncel şema: `apps/api/db/saas-schema.sql`.
- Hiyerarşi: `Isletme` (abonelik, plan, durum, ödeme günü) → `Dukkan` (il/ilçe) → `Stylist` (tek dükkan) → `Service` (kuaföre bağlı).
- Ek tablolar: `Plan` (limitler, fiyat), `Il`/`Ilce` (Türkiye verisi), `Odeme` (onaylanan ödemeler; `isletmeId` + `odemeTarihi` tekil), `AdminIslem` (yönetici denetim kaydı), `Ayar` (havale bilgisi).
- Plan limitleri veritabanında zorlanmaz; ekleme sırasında uygulama işletme satırını kilitleyip kontrol eder.

## Test ve doğrulama
- Test verisi dosyaları ve kurulum sırası: `CLAUDE.md` içindeki "Veritabanı" bölümü.
- Canlıda doğrulananlar: okuma uç noktaları, giriş kısıtları (pasif, onay bekleyen, geçici şifre), yönetici listeleri, ödeme takibi, landing verisi, kayıt, onay, ödeme onayı, randevu onayı, dükkan ve kuaför düzenleme, panel önbelleği.
- Mobil: müşteri girişi cihazda doğrulandı. Dükkan → kuaför → hizmet → saat → randevu akışı ve randevu ekranı henüz uçtan uca denenmedi.
- Henüz test edilmedi: bildirim gönderimi, müşterinin iptal ve değişikliği (mobil), hatırlatma cron işi.
- Yük ve eşzamanlılık testi yapılmadı.

## Dış bağımlılıklar (kullanıcı tarafında)
- **E-posta:** cPanel'de bir e-posta hesabı ve SMTP bilgileri (kayıt, onay ve şifre sıfırlama bildirimleri için).
- **Push (cihaz banner'ı):** Firebase projesi, Android uygulaması (`com.sozcutvcanli.randevu`), FCM hizmet hesabı anahtarı; `eas-cli credentials` ile EAS'a yükleme.
- **Hatırlatma cron işi:** cPanel Cron Jobs, 15 dakikada bir `POST /api/v1/internal/reminders/run` (`x-cron-secret` başlığı). Kurulumu doğrulanmadı.
- **Gerçek IBAN ve banka bilgisi:** havale ayarına admin panelinden girilmeli (şu an test değeri).

## Yapılacaklar (öncelik sırasıyla)
1. **Mobil uygulamayı cihazda uçtan uca denemek:** dükkan seçimi (şehir/ilçe), kuaför, hizmet, saat ve randevu oluşturma. Kod uyarlaması tamamlandı; sorun çıkarsa yeni APK derlenir.
2. **Üretim admin hesabı:** gerçek platform admini oluşturulması.
3. **Test verisinin temizliği:** canlıdaki test ve QA kayıtlarının silinmesi (gerçek kullanıma geçmeden önce).
4. **Ödeme takibi rozeti:** dönem tarihini göstermek (şu an onay tarihi gösteriliyor).
5. **E-posta bildirimleri:** SMTP bilgisi gelince kayıt, onay, şifre sıfırlama.
6. **Android FCM** kimlik bilgisini EAS'a yükleyip cihaz banner'ını test etmek.
7. **Hatırlatma cron işini** kurup doğrulamak.
8. **Müşteri iptal/değişiklik** ve 2 saat kuralının uçtan uca testi (mobil).
9. **Güvenlik:** `npm install` uyarıları (API 22, mobil 12) ve KVKK (aydınlatma metni, hesap silme).
10. **Kuaför hizmet düzenlemesi:** şu an yalnızca işletme sahibi yapabiliyor; karar verilmesi gerekiyor.

## Netleşen Kararlar (özet)
- **Şube:** Her dükkan ayrı bir işletme değil, işletmenin dükkanıdır; işletme (abonelik) altında birden fazla dükkan olabilir (Gold).
- **Onay:** Yönetici onaylar. Kuaför işletme sahibi tarafından eklenir.
- **Dil:** Türkçe + İngilizce (web ve mobil).
- **Hosting:** Namecheap paylaşımlı hosting, cPanel. Railway/Render/VPS kullanılmıyor.
- **Veritabanı:** PostgreSQL 10.23 (cPanel). Şema dosyaları elle uygulanır; phpPgAdmin'de `DO $$` blokları kullanılmaz.
- **Bildirim kanalı:** Uygulama içi bildirim, sekme rozeti ve Expo push. SMS yok.
- **Mobil dağıtım:** Android için EAS ile APK. Mağaza yayını henüz yok.
- **Web panel önbellek:** Gezintide veri store'dan; sekme yenilenince sunucudan. Yazma işlemleri yalnızca etkilenen veriyi yeniler.
