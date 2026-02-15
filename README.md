# YMH SAHA - Malzeme Giriş Uygulaması

Zero-UI prensibiyle geliştirilmiş, inşaat sahası malzeme giriş uygulaması.

## Proje Yapısı

### Mobile (React Native + Expo)
Klasör: `mobile/`

**Kurulum:**
1. `cd mobile`
2. `npx create-expo-app . --template blank` (Eğer boş klasörse) veya `npm install`
3. Gerekli kütüphaneleri ekleyin:
   ```bash
   npx expo install expo-camera expo-location expo-file-system expo-sqlite expo-crypto expo-background-fetch expo-task-manager expo-status-bar @react-navigation/native @react-navigation/stack
   ```

**Önemli Dosyalar:**
- `src/screens/CameraScreen.tsx`: Giriş ekranı. Fotoğraf çeker ve OCR başlatır.
- `src/screens/ConfirmationScreen.tsx`: Giriş onay ekranı.
- `src/services/Database.ts`: Yerel SQLite veritabanı yönetimi.
- `src/services/SyncService.ts`: Arkaplan veri senkronizasyonu.
- `src/services/OCRService.ts`: Google Vision API entegrasyonu.

### Backend (NestJS + PostgreSQL)
Klasör: `backend/`

**Kurulum:**
1. `cd backend`
2. `npm install @nestjs/typeorm typeorm pg class-validator class-transformer`

**Veritabanı:**
`backend/db/schema.sql` dosyasındaki SQL komutlarını PostgreSQL veritabanınızda çalıştırın.

**API:**
- `POST /material-delivery`: Malzeme girişi kaydeder.
- Detaylar için `API_DOCS.md` dosyasına bakınız.

## Kullanım Akışı
1. Uygulama açılır açılmaz Kamera başlar.
2. Fotoğraf çekilir -> OCR Analizi yapılır.
3. Onay ekranında veriler düzenlenir/onaylanır.
4. Kayıt yerel veritabanına eklenir (Offline-first).
5. İnternet varsa anında, yoksa arkaplanda sunucuya gönderilir.
