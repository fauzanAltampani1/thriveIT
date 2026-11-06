# ThrivIT

Situs portofolio ThrivIT, studio digital kecil untuk UMKM. Statis: TypeScript (strict) + Vite, tanpa framework.

## Menjalankan

Butuh Node.js 20.19+ atau 22.12+.

```
npm install
npm run dev        # http://localhost:5173
npm run build      # cek tipe, hasilnya ke dist/
npm run preview    # lihat hasil build
```

## Deploy (Cloudflare Pages)

Build command `npm run build`, output directory `dist`. Root directory dikosongkan.

## Struktur `src`

```
main.ts        titik rakit: memuat CSS, membuat tiap bagian halaman, satu handler scroll untuk semuanya
config.ts      nomor WhatsApp, email, setelan asap glyph dan tepi transisi
content/       teks: layanan (hero), file dossier, langkah alur kerja
core/          utilitas murni: DOM, noise, huruf logo, ikon pixel
features/      satu modul per bagian: scenes, background, hero, dossier, workflow, currentWork, connect, cursor
styles/        CSS per bagian; urutannya diatur di main.ts
```

## Mengganti kata-kata

| Yang diganti | File |
|---|---|
| Layanan di hero, caption awal | `src/content/services.ts` |
| Isi lima file dossier | `src/content/dossier.ts` |
| Langkah alur kerja | `src/content/workflow.ts` |
| Judul section, kartu proyek, form | `index.html` |
| Nomor WhatsApp, email | `src/config.ts` |
