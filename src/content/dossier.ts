// Dossier copy: the five files on the retro PC. Each line types onto the screen in order.
import type { IconName } from '../core/pixel';

export interface DossierFile {
  /** file name on the tab and the screen bar */
  name: string;
  /** big word on the screen when the file is open */
  word: string;
  icon: IconName;
  lines: readonly string[];
}

export const FILES: readonly DossierFile[] = [
  { name: '01_TENTANG.TXT', word: 'TENTANG', icon: 'prompt', lines: ['Tim kecil yang baru mulai.', 'Kami membantu UMKM memulai langkah digital.', 'Dua proyek klien pertama sudah selesai.', 'Anda bicara langsung dengan developernya.'] },
  { name: '02_LAYANAN.TXT', word: 'LAYANAN', icon: 'target', lines: ['Yang bisa kami kerjakan:', 'Aplikasi kasir sederhana.', 'Website usaha dan landing page.', 'Aplikasi web sesuai kebutuhan.', 'Database pengganti spreadsheet.', 'Otomasi pekerjaan berulang.'] },
  { name: '03_CARA.TXT', word: 'CARA', icon: 'cycle', lines: ['Dikerjakan bertahap.', 'Ada demo setiap minggu.', 'Versi uji bisa Anda coba sejak awal.', 'Masukan Anda masuk ke tahap berikutnya.'] },
  { name: '04_PRINSIP.TXT', word: 'PRINSIP', icon: 'unlock', lines: ['Kode dan akun milik Anda.', 'Tidak terkunci ke kami.', 'Struktur kode rapi.', 'Ada dokumentasinya.', 'Semua file diserahkan di akhir.'] },
  { name: '05_JUJUR.TXT', word: 'JUJUR', icon: 'check', lines: ['Masih baru, dan kami terbuka soal itu.', 'Tidak ada klien atau angka yang dikarang.', 'Harga dibahas terbuka di awal.', 'Jadwal disepakati per tahap.'] }
];
