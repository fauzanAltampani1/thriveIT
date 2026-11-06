// Workflow copy: five steps. `lines` are the rows on the 3D drum; the first row of each step is its keyword.
import type { IconName } from '../core/pixel';

export interface Step {
  name: string;
  icon: IconName;
  desc: string;
  out: string;
  lines: readonly string[];
}

export const STEPS: readonly Step[] = [
  { name: 'Kenalan', icon: 'search', desc: 'Diskusi soal usaha Anda dan bagian yang paling merepotkan.', out: 'Daftar kebutuhan', lines: ['Kenalan.', 'Kami dengar', 'masalahnya.'] },
  { name: 'Rancang', icon: 'tree', desc: 'Menyusun alur, struktur data, dan sketsa tampilan.', out: 'Rancangan sistem', lines: ['Rancang.', 'Alur, data,', 'sketsa layar.'] },
  { name: 'Bangun', icon: 'code', desc: 'Dikerjakan bertahap di server uji, dengan demo tiap minggu.', out: 'Demo mingguan', lines: ['Bangun.', 'Bertahap,', 'demo mingguan.'] },
  { name: 'Rilis', icon: 'deploy', desc: 'Uji coba bersama, perbaiki, lalu sistem ditayangkan.', out: 'Sistem live', lines: ['Rilis.', 'Uji, perbaiki,', 'tayang.'] },
  { name: 'Dampingi', icon: 'wrench', desc: 'Panduan pemakaian, dokumentasi, dan bantuan setelah rilis.', out: 'Panduan & bantuan', lines: ['Dampingi.', 'Panduan, latihan,', 'bantuan.'] }
];
