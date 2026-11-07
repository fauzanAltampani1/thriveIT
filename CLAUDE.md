# ThrivIT · thriveit.id

Catatan serah terima untuk siapa pun (termasuk Claude Code) yang melanjutkan pekerjaan di situs ini.
Folder ini (`H:\TRHIEVE\web`) adalah repo git yang ter-deploy otomatis ke https://thriveit.id.

## Tentang ThrivIT

- Studio digital kecil untuk UMKM. Baru mulai, belum ada pendanaan. Layanan: aplikasi kasir (POS), website usaha, aplikasi web custom, database dan pendataan, otomasi pekerjaan.
- Klien (dua-duanya sudah selesai):
  - **HIPMI Kabupaten Bandung**: website profil organisasi (profil, berita, Konser Wirausaha, direktori bisnis, info keanggotaan). Fitur anggota belum dikerjakan; fokusnya profil. Selesai, menunggu hosting, jadi belum ada link.
  - **Kasih Izin** (PT. Kasih Izin Indonesia, bagian dari PT. Juragan Dua Enam): website profil perusahaan jasa legalitas usaha. Online di https://kasih-izin.ai.studio/
- Instagram: `@thrivit_`. Email sementara: `itthrived@gmail.com`.
- Tujuan situs: portofolio yang jujur. Kesannya studio kecil yang serius dan rapi, bukan perusahaan enterprise besar.

## Yang sudah live

| Apa | Nilai |
|---|---|
| Domain utama | https://thriveit.id (juga https://www.thriveit.id) |
| Alamat bawaan Pages | https://thriveit.pages.dev |
| Repo GitHub | https://github.com/fauzanAltampani1/thriveIT, branch `main` |
| Hosting | Cloudflare Pages, project `thriveit` (alur Pages "legacy" + Git, bukan Workers) |
| Domain dibeli di | Hostinger (perpanjangan tahunan bayar di Hostinger) |
| DNS | Cloudflare, nameserver `evangeline.ns.cloudflare.com` dan `jarred.ns.cloudflare.com` |
| Custom domain di Pages | `thriveit.id` dan `www.thriveit.id`, dua-duanya Active, SSL aktif |

Setelan build Cloudflare Pages:

- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: kosong (isi repo = isi folder web)
- Production branch: `main`
- Disarankan ada env var `NODE_VERSION=22`. Cek di project → Settings → Variables; kalau belum ada, tambahkan.

## Cara deploy

Cloudflare build ulang otomatis setiap ada push ke `main`. GitHub yang memberi tahu Cloudflare, jadi tidak perlu git pull manual dan tidak perlu upload apa pun.

```
cd /d H:\TRHIEVE\web        # di CMD Windows wajib pakai /d supaya pindah drive
npm run build               # opsional: cek tipe + build di lokal dulu
git add .
git commit -m "pesan singkat"
git push
```

Lalu cek Cloudflare → Workers & Pages → `thriveit` → **Deployments**. Status Success berarti thriveit.id sudah ter-update (1–2 menit).
Push ke branch selain `main` hanya membuat preview deployment dan tidak mengubah thriveit.id.

**Perlu dicek:** dashboard Pages sempat menampilkan "This project is disconnected from your Git account". Kalau push tidak memunculkan deployment baru, buka https://github.com/settings/installations → Cloudflare Workers and Pages → Configure → pastikan repo `thriveIT` punya akses. Setelah itu reconnect dari project → Settings → Build jika perlu.

## Menjalankan di lokal

Butuh Node.js 20.19+ atau 22.12+ (Vite 8). Mesin owner memakai Node 26.

```
npm install
npm run dev        # http://localhost:5173
npm run build      # tsc (strict) lalu vite build ke dist/
npm run preview    # menyajikan dist/
```

`dist/` dan `node_modules/` di-ignore. `index.html` di `dist/` tidak bisa dibuka dengan klik ganda; pakai `npm run preview`.
Kalau muncul error "Cannot find native binding ... @rolldown/binding-win32-x64-msvc": hapus `node_modules` dan `package-lock.json`, lalu `npm install --include=optional`.

## Stack dan arsitektur

- Situs statis satu halaman. TypeScript strict (TS 7) + Vite 8, **tanpa framework** dan tanpa backend. Total sekitar 72 KB (JS ±15 KB + CSS ±8 KB gzip, ditambah font).
- Font self-hosted lewat `@fontsource`: DotGothic16 (judul, pixel) dan Space Mono 400/700 (teks).
- `vite.config.ts` memakai `base: './'` sehingga semua link relatif.

```
index.html     markup semua section + teks judul, kartu proyek, form kontak
src/
  main.ts      titik rakit: import CSS berurutan, membuat tiap section, SATU handler scroll (rAF) untuk semuanya
  config.ts    CONTACT (WA, email), SCENE_IDS, WAVE (asap glyph), FIELD (tepi sobek)
  content/     teks yang sering diganti: services.ts (hero), dossier.ts, workflow.ts
  core/        utilitas murni: dom, motion, math, noise (Bayer dither), pixel (ikon), glyphs (huruf logo)
  features/    satu modul per section: scenes, background, cursor, hero/, dossier, workflow, currentWork, connect
  styles/      CSS per section; urutan import diatur di main.ts
public/        favicon.svg
```

Aturan yang harus dijaga:

- `core/` tidak boleh meng-import dari `features/`.
- Fitur tidak saling meng-import. Yang dibagi hanya interface (`Scenes`, `Cursor`) yang dirakit di `main.ts`.
- Jangan menambah framework, library animasi, atau dependency runtime. Situs ini sengaja ringan.
- Hormati `prefers-reduced-motion` (lihat `core/motion.ts`); setiap animasi punya jalur reduced-motion.
- Responsif: tiap file CSS section punya blok `@media (orientation:landscape) and (max-height:520px)` untuk HP miring (layout dua kolom, tanpa `min-height:560px`) dan beberapa juga `@media (max-width:760px) and (max-height:700px)` untuk HP pendek (iPhone SE). Saat lebar layar berubah (HP diputar), `main.ts` menjaga posisi baca di persentase halaman yang sama. Setelah mengubah layout, cek minimal di 320×568, 390×844, 844×390, 667×375, 768×1024, 1280×720 dan 1920×1080.

## Section dan perilakunya

Urutan section (`SCENE_IDS`): `top` (hero) → `dossier` → `workflow` → `work` (proyek) → `connect` (kontak + footer).

- **Transisi scene:** tiap section menutupi satu layar. Saat scroll, section berikutnya terasa diam (fixed) dan yang bergerak hanya tepi sobek ber-dither hitam/putih. Section `dossier` dan `work` berlatar putih, sisanya hitam (`FIELD.light`).
- **Hero:** lima tile layanan. Kata pixel besar memakai huruf logo dari `core/glyphs.ts`. Hanya huruf ini yang tersedia: spasi, `_ a b c d e g i k l m n o p r s t u w`. Kata yang memakai huruf lain (mis. "y", "f", "h") tidak bisa ditampilkan tanpa menggambar glyph baru.
- **Dossier:** komputer retro, lima file teks yang diketik ke layar saat scroll; tab bisa diklik.
- **Workflow:** drum 3D berisi baris pendek; baris pertama tiap langkah adalah kata kuncinya. Baris maksimal sekitar 17 karakter supaya muat di HP.
- **Proyek (`work`):** kata besar "_current work" berputar di belakang, kartu-kartu menumpuk saat scroll. Kartu 1 = HIPMI, kartu 2 = Kasih Izin, kartu 3 = slot terbuka. Teks dan screenshot ada langsung di `index.html`; gambarnya di `public/work/*.webp` (lebar 760 px). Di desktop screenshot tampil abu-abu dan berwarna saat kartu di-hover; di HP tampil sebagai strip di atas kartu, dan baris fakta ke-3 serta tombol "Lihat situsnya" disembunyikan supaya muat. Kalau menambah kartu, ubah juga penomoran `01 / 03` di tiap kartu dan cek tinggi kartu di lebar 390 px.
- **Kontak:** amplop dengan segel lilin. Klik segel untuk membuka surat yang berubah jadi form. Saat dikirim, form mem-POST JSON ke `/api/inquiry` (Cloudflare Pages Function di `functions/api/inquiry.ts`), yang meneruskannya sebagai email lewat Resend ke `MAIL_TO`. Function itu menolak origin lain, membatasi panjang field, dan diam-diam membuang kiriman bot (field tersembunyi `website` terisi, atau form dikirim < 1,5 detik setelah mulai diketik). Kalau gagal atau belum dikonfigurasi (balasan 503), pengunjung melihat "BELUM TERKIRIM // KIRIM SENDIRI" dengan tombol WhatsApp, email (`mailto:`) dan salin. Email yang dikirim berbentuk "surat" HTML (kop hitam dengan logo, pita airmail, kertas biru muda seperti di web, tabel data, ringkasan, tombol balas lewat email/WhatsApp) plus versi teks biasa; gambarnya diambil dari `public/mail/logo.png` dan `public/mail/stripe.png` di domain yang sama. Setelah terkirim, surat otomatis terlipat kembali ke amplop, amplop diberi cap pos "TERKIRIM" + tanggal, dan teks di bawahnya jadi "TERKIRIM · KAMI BALAS KE <kontak>"; membuka segel lagi memberi form kosong. Selama mengirim, semua field dikunci supaya tidak terkirim dua kali. Footer menyatu di section ini.

## Pedoman teks (copy)

- Bahasa Indonesia, menyapa pengunjung dengan **"Anda"**. Label teknis kecil boleh tetap Inggris (LOADING, STEP 01, SCROLL).
- Nada: jujur level pemula, tetap profesional dan menarik.
- Jangan pakai klaim yang tidak benar atau terlalu besar: "enterprise", SLA, janji waktu balas ("di bawah 4 jam"), angka/klien/testimoni karangan, tanggal slot yang belum pasti.
- Hindari em dash (—) dan gaya kalimat khas AI. Kalimat pendek dan langsung.
- Usahakan panjang teks mirip yang sekarang supaya layout kartu, layar dossier, dan drum tetap muat. Setelah mengubah teks, cek di lebar HP (±390 px) dan desktop.

Tempat mengganti kata:

| Yang diganti | File |
|---|---|
| Layanan di hero, caption awal | `src/content/services.ts` |
| Isi lima file dossier | `src/content/dossier.ts` |
| Langkah alur kerja | `src/content/workflow.ts` |
| Judul section, kartu proyek, form, footer, `<title>`, meta description | `index.html` |
| String UI kecil (tombol Salin, pesan error form, isi pesan WA/email) | `src/features/connect.ts`, `dossier.ts`, `workflow.ts` |
| Nomor WhatsApp, email | `src/config.ts` |

**Desain jangan diubah tanpa persetujuan owner.** Permintaan soal teks berarti hanya teks.

## Daftar pekerjaan berikutnya

1. **Nomor WhatsApp.** `CONTACT.waNumber` di `src/config.ts` masih kosong, sehingga situs menampilkan `[NOMOR WA]` dan tombol WhatsApp tersembunyi. Isi dengan format `628xxxxxxxxxx` (tanpa `+`). Komentar di `config.ts` masih menyebut `[WA NUMBER]`; teks yang tampil sekarang `[NOMOR WA]`.
2. **Sambungan Git di Cloudflare.** Pastikan push memicu deployment (lihat bagian Cara deploy).
3. **Kirim otomatis form kontak.** Kode sudah ada, tinggal dikonfigurasi oleh owner: daftar di resend.com memakai `itthrived@gmail.com`, buat API key, lalu di Cloudflare Pages → thriveit → Settings → Variables and Secrets tambahkan `RESEND_API_KEY` (tipe Secret) dan `MAIL_TO=itthrived@gmail.com` untuk Production, lalu deploy ulang. Selama pengirimnya `onboarding@resend.dev`, Resend hanya bisa mengirim ke email pemilik akun Resend. Untuk pengirim seperti `form@thriveit.id`, verifikasi domain thriveit.id di Resend (record DNS ditambahkan di Cloudflare) lalu isi `MAIL_FROM`. Batas paket gratis Resend: 100 email/hari, 3.000/bulan.
4. **Email domain (opsional, belum dibuat).** Cloudflare → thriveit.id → Email → Email Routing: `hello@thriveit.id` diteruskan ke `itthrived@gmail.com`. Setelah jalan, ganti `CONTACT.email` dan teks email di `index.html`.
5. **Link HIPMI.** Setelah situs HIPMI di-hosting, jadikan judul kartunya link (seperti kartu Kasih Izin), tambahkan tombol "Lihat situsnya", dan ganti baris STATUS. Kartu klien sengaja tanpa label status (chip) di pojok kanan atas; owner tidak mau.
6. **Opsional:** redirect `www.thriveit.id` → `thriveit.id` (Cloudflare Redirect Rules), tag Open Graph untuk pratinjau link di WhatsApp/IG, dan link bio IG ke `https://thriveit.id`.

## Catatan lain

- Riwayat repo: commit pertama (`cc88344`) sempat berisi folder `reel/` (video IG + voiceover ElevenLabs paket gratis) dan `deploy/`. Commit kedua (`5fd494a`) membuat repo hanya berisi situs. File lama itu masih ada di riwayat git; kalau repo public dan ingin bersih, riwayat perlu ditulis ulang (force push) dengan persetujuan owner.
- Folder induk `H:\TRHIEVE` berisi juga `reel/` (sumber reel IG 9:16, render Playwright + ffmpeg, musik sintetis, voiceover) dan `deploy/` (contoh nginx/Caddy). Keduanya bukan bagian repo ini.
- `H:\TRHIEVE\_to_delete\` berisi dua file JS build lama yang boleh dihapus.
- Pernah ada repo git nyasar di `C:\Users\pc\.git` (dari `git init` yang salah folder). Jangan pernah `git add` di `C:\Users\pc`.
- Rahasia hanya ada di Cloudflare (Pages → thriveit → Settings → Variables and Secrets), tidak pernah di repo: `RESEND_API_KEY` (secret), `MAIL_TO`, dan opsional `MAIL_FROM`.
