# 🚀 Panduan Deploy NihongoPro v22 — Nihongo Pro Academy

## Cara Deploy Tercepat (Netlify Drag & Drop)

1. **Buka** [app.netlify.com](https://app.netlify.com)
2. **Drag & drop** seluruh folder project ini ke area deploy
3. **Isi environment variables** (langkah di bawah)
4. ✅ Website langsung live!

---

## Environment Variables (WAJIB)

Buka: **Site settings → Environment variables → Add variable**

### 1. AI Chat (minimal isi satu)
| Variabel | Nilai | Cara dapat |
|----------|-------|-----------|
| `ANTHROPIC_API_KEY` | `sk-ant-...` | [console.anthropic.com](https://console.anthropic.com) |
| `OPENAI_API_KEY` | `sk-...` | [platform.openai.com](https://platform.openai.com) |
| `GEMINI_API_KEY` | `AI...` | [aistudio.google.com](https://aistudio.google.com) |

### 2. Supabase (login, progress, sertifikat)
| Variabel | Nilai | Cara dapat |
|----------|-------|-----------|
| `EDUMA_SUPABASE_URL` | `https://xxx.supabase.co` | [supabase.com](https://supabase.com) → Project Settings → API |
| `EDUMA_SUPABASE_ANON_KEY` | `eyJ...` | Supabase → Project Settings → API → anon key |

### 3. Google Analytics (opsional tapi disarankan)
| Variabel | Nilai | Cara dapat |
|----------|-------|-----------|
| `EDUMA_GA_MEASUREMENT_ID` | `G-XXXXXXXXXX` | [analytics.google.com](https://analytics.google.com) |
| `EDUMA_GSC_VERIFICATION` | `kode verifikasi` | Google Search Console |

### 4. Email form kontak (opsional)
| Variabel | Nilai | Cara dapat |
|----------|-------|-----------|
| `EDUMA_EMAILJS_PUBLIC_KEY` | `...` | [emailjs.com](https://emailjs.com) |
| `EDUMA_EMAILJS_SERVICE_ID` | `service_...` | EmailJS → Email Services |
| `EDUMA_EMAILJS_TEMPLATE_ID` | `template_...` | EmailJS → Email Templates |

### 5. Admin Panel (WAJIB untuk akses /Admin-Dashboard)
| Variabel | Nilai | Keterangan |
|----------|-------|-----------|
| `NIHONGO_ADMIN_LOGIN_ENDPOINT` | `/api/admin-login` | Endpoint backend untuk auth admin |

> ⚠️ Tanpa `NIHONGO_ADMIN_LOGIN_ENDPOINT`, halaman admin tidak bisa diakses di production.
> Demo login (`window.NIHONGO_ADMIN_DEMO_PASS`) hanya berfungsi di localhost.

---

## Setup Database Supabase (satu kali)

1. Buka project Supabase kamu
2. Klik **SQL Editor**
3. Copy isi file `supabase-schema.sql` dan jalankan
4. Database siap ✅

---

## Deploy Ulang Setelah Update

**Netlify (drag & drop):** Drag ulang folder → deploy otomatis  
**Netlify (git):** Push ke main branch → deploy otomatis  
**Vercel:** `vercel deploy --prod`

---

## Fitur yang Butuh Konfigurasi

| Fitur | Perlu env var | Tanpa env var |
|-------|--------------|---------------|
| AI Kaiwa / Sensei / Grammar | `ANTHROPIC_API_KEY` (atau OpenAI/Gemini) | ❌ Tidak berfungsi |
| Login & Akun | `EDUMA_SUPABASE_*` | ❌ Tidak bisa login |
| Progress & Sertifikat | `EDUMA_SUPABASE_*` | ❌ Tidak tersimpan |
| Admin Dashboard | `NIHONGO_ADMIN_LOGIN_ENDPOINT` | ❌ Tidak bisa akses |
| Google Analytics | `EDUMA_GA_MEASUREMENT_ID` | ⚠️ Tidak ada tracking |
| Form Kontak | `EDUMA_EMAILJS_*` | ⚠️ Email tidak terkirim |
| Semua halaman statis | — | ✅ Berfungsi penuh |
| Kamus (11.843 kata) | — | ✅ Berfungsi penuh |
| Flashcard & SRS | — | ✅ Berfungsi penuh |
| JLPT CBT Simulator | — | ✅ Berfungsi penuh |
| Kaigo Simulator | — | ✅ Berfungsi penuh |

---

## Model AI yang Digunakan

| Provider | Model | Keterangan |
|----------|-------|-----------|
| Anthropic | `claude-haiku-4-5-20251001` | Default, cepat & hemat |
| OpenAI | `gpt-4o-mini` | Fallback |
| Gemini | `gemini-1.5-flash` | Fallback |

Auto-fallback: jika Anthropic error → coba OpenAI → coba Gemini.

---

## Troubleshooting

**AI tidak merespons?**  
→ Cek `ANTHROPIC_API_KEY` sudah diisi di env vars  
→ Cek `/api/ai-chat` endpoint aktif (ada di `netlify/functions/ai-chat.js`)

**Login gagal?**  
→ Cek `EDUMA_SUPABASE_URL` dan `EDUMA_SUPABASE_ANON_KEY`  
→ Jalankan `supabase-schema.sql` di SQL editor Supabase

**Admin tidak bisa login di production?**  
→ Set `NIHONGO_ADMIN_LOGIN_ENDPOINT` ke endpoint backend auth kamu  
→ Demo mode (`admin123`) hanya aktif di localhost — ini by design untuk keamanan

**Service Worker tidak update?**  
→ Buka DevTools → Application → Service Workers → klik "Update"  
→ Atau hard refresh: Ctrl+Shift+R

**Analytics tidak muncul?**  
→ Cek `EDUMA_GA_MEASUREMENT_ID` sudah diisi  
→ Tunggu 24-48 jam untuk data pertama muncul di GA4

---

*NihongoPro v22 — Platform Belajar Bahasa Jepang N5–N1 + Kaigo 介護福祉士*
