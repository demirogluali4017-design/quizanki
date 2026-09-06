# Flashcard / Anki Klonu

Next.js 14 (App Router) + Tailwind CSS + Supabase + Gemini 2.5 Flash OCR ile geliştirilmiş,
fotoğraftan Fransızca kelime çıkaran ve SM-2 aralıklı tekrar algoritmasıyla çalışan flashcard uygulaması.

## Kurulum

```bash
npm install
cp .env.local.example .env.local
# .env.local dosyasını kendi Supabase ve Gemini anahtarlarınızla doldurun
```

## Supabase Kurulumu

1. [supabase.com](https://supabase.com) üzerinde yeni bir proje oluşturun.
2. SQL Editor'e girip `supabase/schema.sql` dosyasının içeriğini çalıştırın.
   Bu, `flashcards` tablosunu, indeksleri ve RLS politikalarını oluşturur.
3. Project Settings > API sekmesinden:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ sadece sunucuda kullanılır, asla client'a sızdırmayın)

## Gemini API Anahtarı

[Google AI Studio](https://aistudio.google.com/apikey) üzerinden bir API anahtarı oluşturup
`GEMINI_API_KEY` değişkenine ekleyin.

## Geliştirme Sunucusunu Başlatma

```bash
npm run dev
```

Uygulama `http://localhost:3000` adresinde açılır.

## Sayfalar

| Route | Açıklama |
|---|---|
| `/` | Ana sayfa — özet istatistikler ve navigasyon |
| `/upload` | Sayfa fotoğrafı yükleme, Gemini OCR işleme ve sonuç tablosu |
| `/study` | SM-2 algoritmasıyla günlük tekrar (3D flip kart + Zor/Orta/Kolay butonları) |
| `/words` | Tüm kelimelerin arananabilir listesi (ortak havuz) |

## Vercel'e Deploy

1. Repo'yu GitHub'a push edin.
2. Vercel'de "Import Project" ile repoyu bağlayın.
3. Environment Variables kısmına `.env.local` içindeki 4 değişkeni ekleyin.
4. Deploy edin — `app/api/process-image/route.ts` bir serverless function olarak çalışır.

## Notlar

- `lib/supabase.ts` iki farklı client sağlar: tarayıcı tarafı için `anon key` kullanan `supabase`,
  ve sadece sunucu tarafında (API route) kullanılması gereken `service_role key` tabanlı
  `createServiceRoleClient()`.
- `lib/sm2.ts` içindeki `calculateSM2` fonksiyonu, prompt'ta belirtilen 3 kademeli
  (Zor / Orta / Kolay) SM-2 varyasyonunu uygular ve birim testleri yazmaya uygun,
  yan etkisiz (pure) bir fonksiyondur.
- `/study` ve `/words` sayfaları şu an anon key ile doğrudan Supabase'e update/delete
  çağrısı yapıyor (basitlik için); üretim ortamında bunları da Server Action'lara
  taşımak ve RLS politikalarını buna göre sıkılaştırmak isteyebilirsiniz.
