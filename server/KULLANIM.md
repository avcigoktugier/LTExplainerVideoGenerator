# Video stüdyosu — kullanım

Her şey Keti'nin bilgisayarında çalışıyor. Sen bağlanıp Claude'a ne istediğini yazıyorsun, sonucu kendi tarayıcında görüyorsun.

## 0. Bir kerelik hazırlık

1. **Tailscale'i kur:** https://tailscale.com/download → ücretsiz hesapla giriş yap.
2. **Keti'nin davetini kabul et:** e-postana "shared a machine with you" diye bir davet gelir; aç ve kabul et.
3. **Kısayolu ekle:** bilgisayarındaki ssh ayar dosyasını aç (yoksa oluştur):
   - Windows: `C:\Users\ADIN\.ssh\config` (uzantısız dosya)
   - Mac: `~/.ssh/config`

   İçine şunu yapıştır (`ADRES` yerine Keti'nin verdiği adresi yaz, örn. `keti-pc.tail1234.ts.net`):
   ```
   Host kettek
     HostName ADRES
     User video
     LocalForward 3000 localhost:3000
     LocalForward 3001 localhost:3001
   ```

## 1. Bağlan (her seferinde)

Terminal aç (Windows: PowerShell, Mac: Terminal) ve yaz:

```
ssh kettek
```

- İlk seferde "Are you sure you want to continue connecting?" sorar → `yes` yaz.
- Şifre sorar → Keti'nin verdiği şifreyi yaz (yazarken ekranda görünmez, normal).
- İlk girişte Claude Code kendiliğinden kurulur (1-2 dakika).

Bağlanınca kısa bir karşılama mesajı görürsün. **Bu terminal açık kaldığı sürece** aşağıdaki adresler çalışır.

## 2. İki sekme aç

- **Önizleme:** http://localhost:3000 — videonun canlı hali. Soldan **Explainer**'ı seç, oynat, kare kare ilerle.
- **Videolar:** http://localhost:3001 — dışa aktarılan videoları izle ve **İndir**'e bas.

## 3. Claude ile çalış

Terminalde:

```
claude
```

İlk seferde bir bağlantı verir: tarayıcıda aç, **kendi** Claude hesabınla giriş yap, kodu terminale yapıştır. Bir kere yapılır.

Sonra ne istediğini normal cümlelerle yaz, örnek:

- "kiraci-tahliye videosunda 3. sahnedeki mührü biraz büyüt"
- "başlıktaki vurgulu kelime 'mahkeme' değil 'dava' olsun"
- "yeni video: miras reddi, 45 saniye"
- "final render al"

Claude değişikliği yapınca **Önizleme sekmesini yenile** (F5). Seslendirme metni değiştiyse Claude yeni ses üretir, bu birkaç saniye sürer.

Bazı sahneler (dosya, kanun maddesi, adım adım süreç animasyonları) arka planda ayrıca hazırlanır: değişiklikten sonra yaklaşık **30 saniye** bekleyip yenile. Bu sırada sahnede "render ediliyor…" ya da "güncelleniyor…" yazısı görürsen normaldir.

**Dışa aktarma:** Claude'a "final render al" de ya da Önizleme'de sağ üstteki **Render** düğmesine bas. Bitince video **Videolar** sekmesinde görünür, oradan indir.

Çıkmak için: Claude'dan `/exit`, sonra terminali kapat.

## Bir şey ters giderse

- **Bağlanamıyorum ("timed out"):** Keti'nin bilgisayarı kapalı ya da uykuda olabilir — Keti'ye yaz. Tailscale'in senin bilgisayarında açık olduğunu da kontrol et.
- **Önizleme açılmıyor:** ssh penceresi kapalı olabilir — terminali açık tut. Hâlâ açılmıyorsa Claude'a "önizleme açılmıyor, yeniden başlat" de.
- **"Address already in use" uyarısı:** başka bir ssh penceresi zaten açık; onu kullan ya da kapat.
- **Render yavaş:** 1 dakikalık video birkaç dakika sürebilir. Hızlı kontrol için "taslak render al" de.
- **Keti de aynı anda çalışıyorsa:** aynı videoyu ikiniz birden değiştirmeyin; son kaydeden kazanır.
