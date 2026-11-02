# Danau InfinITS — Tugas 2 Grafika Komputer

Scene WebGL murni berdasarkan foto dan video kelompok di InfinITS Park, ITS, 1 November 2026. Tidak memakai Three.js, model unduhan, CDN, atau paket JavaScript tambahan. Catatan pembacaan foto dan batas rekonstruksi ada di [REFERENCE_NOTES.md](REFERENCE_NOTES.md).

## Menjalankan

```bash
cd /home/zdann/Documents/grafkom/tugas2
python3 serve.py
```

Buka **http://127.0.0.1:8000** pada browser yang mendukung WebGL. Hentikan server dengan `Ctrl+C`; jika port terpakai, gunakan `python3 serve.py --port 8001`. Jalankan melalui server lokal karena `file://` dapat memblokir ES modules. Tidak perlu `npm install`.

## Isi scene

Denah terkini mengikuti **garis biru** pada `assets/originals/blue-route-reference.png`.
Coretan hitam diabaikan. Lengkung belakang melebar, jalur kanan masuk ke lekukan
dekat dudukan, dan dua akses depan melengkung ke luar. Plaza dan ukuran kolam
serta luas tapak tetap. Fasilitas tetap terpisah dari jalan.

- Danau berbentuk angka 8 memanjang: panjang kontur 58 satuan dan lebar maksimum sekitar 31,6 satuan model (rasio sekitar 1,8:1). Panjangnya dua kali versi sebelumnya, dengan ujung depan tetap; dua lobus depan–belakang dan lekukan di sisi kiri–kanan. `+Z` adalah sisi depan tulisan, dan `-X` berarti kiri saat melihat tulisan dari depan. Tanah pada kedua pinggang menjorok sekitar 6 satuan model ke kolam, termasuk area dudukan rendah di kanan. Kontur terhubung halus dengan dua lobus yang tetap memanjang. Permukaan air berada sekitar 0,97 satuan model di bawah jalan; lereng rumput dan tanah membentuk penurunan nyata menuju air.
- Promenade berbentuk jalur terbuka: tidak ada jalan melintang tepat di belakang InfinITS. Kedua ujungnya langsung bertemu landing akses kiri dan kanan.
- Kedua ramp diperlebar lengkungannya untuk bertemu rute biru. Ramp kiri merupakan cerminan persis ramp kanan: lebar, elevasi, lengkungan, fondasi dan railing sama. Mulut atas melebar hingga 3,20 satuan dan menyatu dengan plaza, lalu turun melengkung ke lebar jalan 2,22. Pagar biru tiga pipa mengikuti tepi plaza, sudut depan, tangga dan kedua sisi ramp sesuai dua foto akses terbaru. Plaza tetap setinggi perkiraan 0,68 m, paving depan 0,32 m, dengan dua riser depan 0,18 m. Podium foto kecil tetap terpisah.
- Playground dipindahkan dari pojok kanan depan ke tepi kiri kolam. Urutan dari air ke luar adalah **kolam → playground → jalan taman → tribun**. Jalur kiri mengikuti lekukan pada sketsa biru dengan lebar tegak lurus tetap 2,22 satuan model, termasuk saat berbelok. Tidak ada cabang jalan, landing akses pad, atau jalur samping menuju playground maupun tribun. Playground kiri dimajukan 2,5 satuan model ke arah kolam, sehingga tersisa ruang rumput sekitar 5 satuan model dari tepi jalan. Seluruh alas tetap berada pada tanah datar. Seluncuran menghadap kolam, alasnya berupa segitiga dengan sudut membulat dan ujung depan tumpul. Tribun menghadap serong kanan belakang (sekitar 45° dari arah depan InfinITS), dengan bukit rumput yang menempel pada dinding belakangnya. Kedua sisi bukit diapit pembatas beton yang mengikuti profil lereng. Muka tanah dibenamkan sedikit di balik beton agar tidak berimpit dan menimbulkan bercak/kedipan. Tiga tingkat tribun, tangga tengah, dinding ujung miring, dan ukurannya tetap merupakan pendekatan visual. Pilih preset **Playground kiri • jalan & tribun** untuk melihat susunannya.
- **Dudukan pada foto `IMG_20261101_164440.jpg` adalah objek berbeda:** pelataran rendah merah muda di tepi air, dua portal biru, portal tengah kuning, dan papan duduk rendah. Foto asli yang diberikan pengguna ikut tersedia lokal untuk pembanding; pilih preset **Dudukan rendah • foto 164440**.
- Gedung besar latar dihapus; bangunan kecil dipertahankan sebagai pos ronda beratap pelana.
- **Aturan tata letak yang berlaku:** seluruh fasilitas taman berdiri terpisah dari jalan setapak, termasuk semua alas, tangga, tribun/bukit dan pos satpam. Jalur penghubung ke area olahraga, dudukan dan pos dihapus. Hanya jalan utama serta plaza dan dua akses InfinITS yang tetap terhubung. Aturan perubahan berikutnya disimpan di `AGENTS.md`.
- Area alat olahraga kanan dipindah ke arah belakang sesuai tanda merah; pos satpam dipindah lebih ke depan sesuai tanda biru. Dudukan berangka biru–kuning maju 3,3 satuan model ke arah danau. Semua fasilitas memiliki pemisah tanah/rumput yang diperiksa memakai jejak seluruh subobjek.
- Permainan dua menara beratap merah, peralatan kebugaran biru/perak, lampu dua lengan dan batu penanda. Sebanyak 18 tiang hitam bermotif daun mengikuti jalan setapak, berselang-seling kiri–kanan pada interval 9 satuan model sepanjang jalur. Alas tiang bebas dari paving dan akses fasilitas.
- 491 rumpun semak rapat mengikuti kedua sisi jalan sebenarnya, dengan variasi hijau, kuning dan aksen merah. Geometrinya dibatch menjadi 8 mesh agar jumlah simpul tetap ringan. Paving dan alas fasilitas tetap bebas.
- 18 pohon utama, 10 pohon lapisan tengah, palem, pakis, semak merah/limau, rumpun kuning dan daun pedang pucat. Beberapa tanaman dipindah agar tidak masuk air, jalur, ramp atau fasilitas.
- Animasi cabang → ranting → daun, pelepah palem, riak air shader dan pijakan gym; Phong, tekstur prosedural, shadow map PCF, dan refleksi planar.
- Canvas pembanding, 39 foto, 11 video, diagram hierarki, identitas dan pembagian kerja dua anggota.

## Kontrol dan pemeriksaan model

| Aksi | Kontrol |
| --- | --- |
| Putar kamera | Seret canvas dengan mouse / satu jari |
| Zoom | Gulir mouse / trackpad atau cubit dua jari |
| Geser titik pandang | Shift + seret atau tombol tengah mouse + seret |
| Jeda / lanjut animasi | Tombol animasi atau `Space` saat canvas aktif |
| Reset kamera | Tombol Reset atau `R` |
| Layar penuh | Tombol layar penuh atau `F` |
| Lihat landmark, ramp, bangunan, permainan atau tanaman | Pilih preset kamera |
| Bandingkan bentuk enam sisi | Preset depan, kiri, kanan, belakang, atas, bawah dengan proyeksi ortografis |
| Periksa sisi bawah objek | Preset **Bawah**, atau matikan **Tanah & permukaan air** |

Tersedia **21 preset** termasuk sudut setinggi mata, sisi kiri dan belakang landmark, dua sudut tribun kiri, dudukan dari foto 164440, tampak atas perspektif, dan enam sisi ortografis. Preset Bawah otomatis menyembunyikan tanah dan air; memilih preset lain menampilkannya kembali. Tampak ortografis membantu membandingkan bentuk tanpa pengecilan perspektif akibat jarak.

Slider mengatur matahari, angin, riak, dan kecepatan. Toggle tersedia untuk lighting, tekstur, bayangan, refleksi, serta tanah/air. Pilih **Detail tinggi** untuk resolusi lebih besar; **Seimbang** mengurangi beban pixel. Tombol simpan menghasilkan PNG canvas.

## Foto/video asli dan mode offline

Sumber: [folder dokumentasi kelompok di Google Drive](https://drive.google.com/drive/folders/1lSiam679BgvmxTc1E4QMBwAY0a_bOPE9).

`js/media.js` menyimpan nama dan ID berkas asli. Iframe menampilkan pratinjau Drive; tautan **Buka foto/video asli** membuka sumbernya. `assets/references/` berisi thumbnail navigasi, bukan foto resolusi penuh. Foto `164440` tersedia lengkap di `assets/originals/` dari berkas yang diberikan pengguna; preset dudukan menampilkannya otomatis. Pratinjau Drive memerlukan internet dan izin akses berkas yang sesuai.

Scene, UI, tekstur, dan thumbnail dapat berjalan offline. Untuk presentasi offline, simpan foto/video asli di laptop lalu pilih **Buka foto/video lokal**. Browser menampilkannya memakai object URL tanpa mengunggah berkas. Pilihan lokal perlu diulang setelah halaman ditutup; dukungan codec video mengikuti browser.

## Pemetaan ke materi tugas

| Kebutuhan | Implementasi |
| --- | --- |
| Objek ITS di luar Informatika | Bagian taman Danau InfinITS |
| Translasi, rotasi, skala | Transformasi lokal `Node3D`, `Mat4.compose()` |
| Kamera dan proyeksi | View `lookAt`, perspektif, ortografis, orbit dan preset |
| Animasi | Waktu dalam detik, fungsi periodik pada pivot, water shader |
| Lighting / shading | Phong pada fragment shader, normal world-space |
| Texture mapping | UV dan pengulangan tekstur material |
| Hierarchical modeling | `parentWorld × localMatrix`; cabang pohon dan poros alat olahraga |
| Halaman utama | Identitas, foto/video asli, canvas pembanding, tree, pembagian kerja |

Dimensi merupakan pendekatan visual dari foto perspektif, bukan hasil survei atau fotogrametri. Posisi, skala, jumlah elemen, sisi tersembunyi, dan detail mekanisme tetap perkiraan. Bagian belakang/bawah dilengkapi menjadi konstruksi tertutup yang konsisten; ketersediaan tampak enam sisi tidak membuktikan bentuk aslinya telah terukur. Tidak ditambahkan air mancur pada objek putih kolam yang belum teridentifikasi jelas.

Tekstur dibuat secara prosedural dengan Canvas 2D berdasarkan karakter material dan warna referensi. Bayangan berasal dari geometri melalui directional shadow map dan sembilan sampel PCF. Refleksi planar memakai kamera yang dicerminkan terhadap tinggi air; pass refleksi melewati mesh air untuk menghindari rekursi. Pembaruan pass dibagi antarframe untuk membatasi beban GPU.

## Struktur kode dan pembagian dua orang

Struktur mengikuti pola ES module pada `praktikum-4.md`, dengan traversal
matrix stack seperti contoh robot. Penjelasan urutan kode dan pemetaan ke
materi ada pada [PANDUAN_PRAKTIKUM.md](PANDUAN_PRAKTIKUM.md).

```text
index.html             Halaman, canvas dan form kelompok
style.css              Layout responsif dan aksesibilitas
main.js                State, init, update, render loop, kamera dan kontrol
math3d.js              Vec3, Mat4, translasi/rotasi/skala, view dan proyeksi
hierarchy.js           createNode, parent/children, traverse dan matrix stack
initShaders.js         Compile shader dan link program, dengan laporan error
shaders.js             Vertex/fragment GLSL, P × V × M, lighting dan tekstur
renderer.js            WebGL context, buffer, attribute, uniform dan draw calls
js/scene.js            Integrasi objek, preset dan update animasi
js/geometry.js         Mesh primitif, normal dan UV
js/textures.js         Generator tekstur prosedural
js/terrain.js          Solid tanah tertutup dan cekungan danau
js/site-plan.js        Kontur kolam, rute biru dan penempatan fasilitas
js/site-levels.js      Elevasi tanah, air dan bidang pantulan
js/entrance.js         Landmark, plaza, dua ramp dan railing
js/connections.js      Pendekatan utama InfinITS
js/park-objects.js     Playground, gym, lampu, penanda dan pivot
js/lakeside-seating.js Tribun dan bukit belakang
js/lakeside-platform.js Dudukan rendah berangka biru–kuning
js/vegetation.js       Geometri tanaman dan pivot animasi
js/site-details.js     Pos ronda dan batu tapak
js/media.js            Metadata foto/video asli
assets/               Foto dan thumbnail dokumentasi
styles.css, js/engine.js, js/math.js, js/main.js, js/shaders.js
                       Penghubung kompatibilitas alamat lama
PANDUAN_PRAKTIKUM.md   Pemetaan materi, pipeline dan urutan membaca kode
VALIDATION.md         Hasil tes dan pemeriksaan browser
serve.py              Server lokal tanpa dependency
```

Usulan pembagian berdasarkan modul:

| Anggota | Tanggung jawab |
| --- | --- |
| 1 — model lingkungan dan material | `terrain.js`, `entrance.js`, `site-plan.js`, `connections.js`, `lakeside-seating.js`, `lakeside-platform.js`, `site-details.js`, bentuk statis `park-objects.js`, geometri primitif dan tekstur |
| 2 — hierarki, animasi dan kamera | `vegetation.js`, pivot/update gym pada `park-objects.js`, `hierarchy.js`, `math3d.js`, `renderer.js`, `initShaders.js`, `shaders.js`, serta kamera/kontrol `main.js` |
| Bersama | Dokumentasi lapangan, integrasi `scene.js`, halaman, tree, pengujian, penyesuaian proporsi dan presentasi |

Sepakati kepemilikan fungsi di `park-objects.js` dan jadwal integrasi agar tidak mengedit bagian yang sama bersamaan. Pembagian di halaman adalah usulan; sesuaikan dengan kontribusi nyata.

Form identitas menyimpan nama di browser. Sebelum pengumpulan, masukkan nama/NRP sebenarnya pada nilai awal input `index.html` dan isian berikut agar ikut terbawa ke komputer dosen.

- Kelompok / kelas: **isi sendiri**
- Anggota 1 / NRP: **isi sendiri**
- Anggota 2 / NRP: **isi sendiri**

## Poin untuk presentasi

1. **Transformasi dan pivot:** lokal `T × Rz × Ry × Rx × S`; dunia anak = dunia parent × lokal anak. Poros di sambungan membawa semua descendant, sementara sibling tetap independen.
2. **Kamera:** yaw, pitch, jarak dan target menghasilkan posisi mata; `lookAt()` membentuk ruang kamera. Perspektif memperkecil objek jauh; ortografis mempertahankan skala proyeksi untuk inspeksi.
3. **Normal dan lighting:** inverse-transpose menjaga normal pada skala nonuniform. Diffuse bergantung arah menuju matahari; specular juga bergantung arah pandang.
4. **Tekstur:** UV menentukan koordinat pola dan `uvScale` mengulangnya. Toggle tekstur memudahkan melihat kontribusi material terhadap kemiripan.
5. **Animasi:** waktu berbasis detik, pembaruan absolut pada pivot, jeda jam animasi dan delta terbatas mencegah perbedaan kecepatan antarperangkat/lompatan setelah tab tidak aktif.
6. **Logika konstruksi:** treads mendatar bertemu riser berikutnya; ramp menghubungkan dua elevasi; kolom bertumpu lantai; volume atap, railing, perosotan dan tanah memiliki permukaan bawah serta tepi.
7. **Efisiensi:** mesh/tekstur dipakai ulang, bagian statis dibatch menurut material, dan instancing mengurangi draw call. Bayangan/refleksi dapat dimatikan pada perangkat lebih lambat.

Tantangan utama: membaca proporsi dari perspektif foto, memisahkan tangga plaza dan podium foto, membentuk jalur melengkung dengan akses yang tersambung, menjaga winding/normal semua sisi, serta menyeimbangkan banyak daun dengan kelancaran render.

Pratinjau setelah perubahan struktur: `preview-practicum-top.jpg` dan
`preview-practicum-scenic.jpg`. Rute dan model tetap sama dengan revisi biru.
Pratinjau berlabel `photo` atau `small-gap` berasal dari revisi sebelumnya.
Berkas `preview-25m*.jpg` berasal dari revisi luas yang dibatalkan.

## Pengujian

```bash
npm test
```

Tes CPU memeriksa matriks dan proyeksi, ownership scene graph, geometri/indeks/winding, determinisme animasi, hierarki vegetasi, atap dan sambungan tangga, struktur permainan/tribun/dudukan, orientasi danau, jalur terbuka tanpa lintasan belakang tulisan, solid tanah, serta penempatan tanaman dan kaki fixture terhadap permukaan paving aktual.

Untuk GPU buka `http://127.0.0.1:8000/tests/render-smoke.html`; tambahkan `?webgl=1` untuk fallback WebGL 1, `?projection=orthographic` untuk ortografis, atau `?webgl=1&projection=orthographic` untuk keduanya. Halaman tersebut memeriksa kompilasi shader, render frame dan status kesalahan GL. Hasil pemeriksaan pengiriman dicatat di [VALIDATION.md](VALIDATION.md). Pemeriksaan visual tetap mencakup semua preset, tampak bawah dengan tanah/air tersembunyi, sambungan jalur, jeda, slider, toggle, media, layar penuh dan ekspor PNG.
