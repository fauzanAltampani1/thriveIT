# ThrivIT

Situs portofolio ThrivIT dan reel peluncuran Instagram.

```
web/      situs portofolio: TypeScript + Vite. Hasil build statis ada di web/dist
reel/     reel IG 9:16, dirender dari reel.html. Video jadinya ada di reel/output
deploy/   contoh konfigurasi server (nginx atau Caddy)
```

## Kenapa stack ini

- **Situsnya statis.** Semua animasi jalan di browser pengunjung, dan form hanya menyusun pesan untuk WhatsApp atau email. Server tidak menjalankan kode apa pun, cuma mengirim file. Ini pilihan paling ringan untuk server lemah: VPS 1 vCPU/512 MB, shared hosting, atau hosting statis gratis.
- **TypeScript (strict) + Vite, tanpa framework.** Tipe yang ketat menangkap salah ketik sebelum situs dibuka. Kode dipecah per fitur, dan tidak ada runtime React atau Next yang ikut terkirim. Total satu halaman sekitar 72 KB (JS 15 KB dan CSS 8 KB setelah gzip, ditambah font).
- **Kalau nanti butuh backend** (menyimpan inquiry, panel admin, API untuk POS klien), pakai **Go**. Hasilnya satu file binary, RAM-nya sekitar 10–20 MB, dan tetap cepat di 1 vCPU. Strukturnya cukup `cmd/` ditambah `internal/{domain,service,repository,http}`.

## Arsitektur `web/src`

```
main.ts        titik rakit: memuat CSS, membuat tiap bagian halaman, satu handler scroll untuk semuanya
config.ts      nomor WhatsApp, email, setelan asap glyph dan tepi transisi
content/       teks yang sering diganti: layanan (hero), file dossier, langkah workflow
core/          utilitas murni: DOM, noise, huruf logo, ikon pixel. Tidak tahu apa-apa soal fitur
features/      satu modul per bagian: scenes, background, hero, dossier, workflow, currentWork, connect, cursor
styles/        CSS per bagian; urutannya diatur di main.ts
```

Aturannya: `core/` tidak boleh meng-import dari `features/`. Fitur tidak saling meng-import; yang dibagi hanya interface (`Scenes`, `Cursor`) yang dirakit di `main.ts`.

## Menjalankan web

Butuh Node.js 20.19+ atau 22.12+.

```
cd web
npm install
npm run dev        # buka http://localhost:5173
npm run build      # cek tipe, lalu hasilnya ke web/dist
npm run preview    # lihat hasil build
```

`web/dist` yang ada sekarang sudah di-build, jadi bisa langsung di-upload. File `index.html` di dalamnya tidak bisa dibuka dengan klik ganda; pakai `npm run preview` atau hosting.

## Mengganti kata-kata

| Yang diganti | File |
|---|---|
| Layanan di hero, caption awal | `web/src/content/services.ts` |
| Isi lima file dossier | `web/src/content/dossier.ts` |
| Langkah workflow | `web/src/content/workflow.ts` |
| Judul section, kartu Current work, form | `web/index.html` |
| Nomor WhatsApp, email | `web/src/config.ts` |

## Deploy

- **Shared hosting (cPanel):** upload *isi* folder `web/dist` ke `public_html`.
- **VPS:** salin isi `web/dist` ke `/var/www/thrivit`, lalu pakai `deploy/nginx.conf` atau `deploy/Caddyfile` (Caddy mengurus HTTPS sendiri).
- **Gratis:** Cloudflare Pages atau Netlify. Root directory `web`, build command `npm run build`, output `dist`.

## Reel

`reel/output/thrivit-reel.mp4` (31 detik, 1080×1920, 30 fps) dan `thrivit-reel-cover.jpg` sudah jadi. Untuk mengubah naskah atau timing, edit `reel/reel.html` (bagian `TL` untuk timing, teks ada di markup), lalu render ulang:

```
cd reel
npm install
npx playwright install chromium
npm run make       # butuh ffmpeg di PATH dan Python 3 dengan numpy + scipy
```

`npm run stills` merender beberapa frame kunci ke `reel/out/stills` untuk dicek sebelum render penuh.
