// Hero copy: the five services behind the pixel tiles, and the caption shown before one is picked.
// Edit the words here; the hero picks them up on the next build.

export interface Service {
  /** the big pixel word, drawn with the logo's own lettering (lowercase letters from core/glyphs.ts only) */
  word: string;
  name: string;
  text: string;
  /** 10×10 tile icon, '#' = filled */
  bmp: readonly string[];
}

export const SERVICES: readonly Service[] = [
{ word: '_kasir', name: 'Aplikasi Kasir (POS)', text: 'Kasir berbasis web untuk toko dan kedai. Penjualan dan stok tercatat tanpa buku manual.',
  bmp: ['.########.', '.#......#.', '.#.####.#.', '.#......#.', '.########.', '..........', '##########', '#.#.#.#..#', '#........#', '##########'] },
{ word: '_website', name: 'Website Usaha', text: 'Website profil atau landing page yang ringan, rapi, dan cepat dibuka dari HP.',
  bmp: ['##########', '#.#.#....#', '##########', '#........#', '#.######.#', '#.######.#', '#........#', '#.####...#', '#........#', '##########'] },
{ word: '_aplikasi', name: 'Aplikasi Web Custom', text: 'Aplikasi yang mengikuti cara kerja usaha Anda, misalnya portal anggota atau sistem pemesanan.',
  bmp: ['##########', '#.#.#....#', '##########', '##.......#', '##.##.##.#', '##.##.##.#', '##.......#', '##.#####.#', '##.......#', '##########'] },
{ word: '_database', name: 'Database & Pendataan', text: 'Data yang tadinya tersebar di spreadsheet dipindah ke database yang tertata dan mudah dicari.',
  bmp: ['.########.', '#........#', '.########.', '#........#', '#........#', '.########.', '#........#', '#........#', '.########.', '..........'] },
{ word: '_otomasi', name: 'Otomasi Pekerjaan', text: 'Pekerjaan berulang seperti rekap pesanan atau kirim notifikasi berjalan sendiri. Tidak perlu input dua kali.',
  bmp: ['.....###..', '....###...', '...###....', '..#######.', '......##..', '.....##...', '....##....', '...##.....', '..##......', '..........'] }
];

/** [kicker, title, paragraph] shown while no service is selected */
export const DEFAULT_CAPTION: readonly [string, string, string] = ['00 // _thrivit', 'Bantu usaha Anda tumbuh digital.', 'Studio kecil yang membuat kasir, website, dan sistem sederhana untuk UMKM.'];
