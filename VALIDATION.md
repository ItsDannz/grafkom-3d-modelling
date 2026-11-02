# Validasi — struktur mengikuti praktikum

Tanggal: 2 November 2026.

## Struktur dan acuan

Entry aplikasi dipindahkan ke `main.js`, stylesheet ke `style.css`, dan
helper matematika ke `math3d.js`. `hierarchy.js` menangani createNode serta
matrix stack; `initShaders.js` compile/link; `shaders.js` GLSL;
`renderer.js` context, buffer, attribute, uniform dan draw.

Acuan yang berhasil dibaca adalah `praktikum-4.md` dan dua arsip contoh robot.
Isi rinci tiga tautan Classroom pertemuan 2, 3 dan 5 belum dapat diverifikasi
karena akses sumber tidak tersedia; course menolak akses tamu.

## Tes CPU

**66 kasus tes lulus pada 13 berkas.**

```bash
node --test --test-isolation=none tests/*.test.js
```

63 tes model/rute/matriks sebelumnya tetap lulus. Tiga tes tambahan pada
`practicum-structure.test.js` memeriksa:

- Kesamaan hasil helper translasi/rotasi/skala dengan compose scene pada
  konvensi vector kolom yang sama; helper Vec3 dan konversi sudut.
- Matrix stack memulihkan parent sebelum sibling, termasuk setelah perubahan
  rotasi cabang. Trunk/root dan sibling tidak ikut bergeser.
- Hidden subtree dilewati saat menggambar tetapi tetap dapat dihitung saat
  inspeksi seluruh world matrix.

Shim impor lama tetap dipakai oleh beberapa tes CPU, sementara modul model
aktual memakai `createNode()` dan math helper baru secara langsung.

## Kesamaan model sebelum–sesudah

Scene sebelum dan sesudah dibuat memakai input Canvas/font yang sama, lalu
animasi diperbarui pada waktu 3,25 detik dan windStrength=1. Pemeriksaan hash
mencakup nama, posisi, rotasi, skala, world matrix, mesh, material, visibility
dan jumlah child pada setiap node, sesuai urutan traversal.

- Jumlah node: **1.922 → 1.922**.
- Hash scene sebelum dan sesudah identik:
  `2da675248c28e9bfde7b5d32bada7cfa139246d92b16ea2d8b564f1ff3c5aa0a`.
- Hasil tersimpan pada `docs/validation/practicum-scene-parity.json`.

Bentuk kolam memanjang, rute biru, kedua ramp, fasilitas, tanaman dan material
mempertahankan data model yang sama. Tes geometri memeriksa lebar jalan 2,22,
sambungan langsung ramp, tidak ada jalan belakang tulisan dan tidak ada akses
penghubung ke fasilitas.

| Fasilitas | Jarak minimum ke paving/kerb (satuan model) |
| --- | ---: |
| Playground kiri | 5,00 |
| Alat olahraga kanan | 1,54 |
| Dudukan rendah | 1,80 |
| Tribun dan bukit | 1,19 |
| Pos satpam | 2,95 |

## Browser dan GPU

- Scene utuh **WebGL 2**: perspektif, tampak atas ortografis, jeda/lanjut
  animasi, dan tampak bawah dengan tanah/air otomatis disembunyikan bekerja.
- Console tanpa error/warning pada penggunaan yang diperiksa.
- View dan Projection dikirim ke shader melalui uniform terpisah; Model
  memakai empat kolom attribute per instance.
- `tests/render-smoke.html`: **PASS WebGL 2**, perspektif, lima frame,
  shadows/reflections aktif, `glError: 0`.
- `tests/render-smoke.html?webgl=1&projection=orthographic`:
  **PASS WebGL 1 + ANGLE**, ortografis, lima frame,
  shadows/reflections aktif, `glError: 0`.

Kesamaan hash memeriksa model CPU pada satu kondisi animasi. Perubahan cara
perkalian matriks pada GPU dapat menimbulkan perbedaan pembulatan pixel kecil;
tampilan dan efek diperiksa melalui browser.

## Pratinjau

- `preview-practicum-top.jpg`: denah setelah perubahan struktur.
- `preview-practicum-scenic.jpg`: perspektif setelah perubahan struktur.
- `preview.jpg`, `preview-layout.jpg`, dan `previews/top.jpg` diperbarui.

Panduan membaca kode dan pemetaan materi tersedia pada `PANDUAN_PRAKTIKUM.md`.
