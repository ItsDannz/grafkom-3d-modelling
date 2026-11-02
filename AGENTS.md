# Arahan pengguna yang berlaku

Arahan 2 November 2026, berlaku untuk semua perubahan berikutnya kecuali
diubah secara eksplisit oleh pengguna:

- Playground kiri, area alat olahraga kanan, dudukan rendah, tribun/bukit dan
  pos satpam harus berdiri terpisah dari jalan setapak.
- Jangan membuat jalur penghubung, ramp akses, landing, ambang atau undakan
  yang menghubungkan fasilitas tersebut ke jalan. Sisakan tanah/rumput yang
  jelas di antara jejak fasilitas dan jalan.
- Sebelum mengubah posisi fasilitas, periksa aturan keterpisahan tersebut.
  Setelah perubahan, periksa seluruh jejak objek dan subobjeknya secara nyata,
  termasuk alas, tangga, dinding dan bukit; jangan hanya memeriksa titik pusat.
- Jalan utama, plaza InfinITS dan dua akses utama kiri/kanannya dipertahankan.
- Tanaman rapat mengikuti jalan, dengan paving dan alas fasilitas tetap bebas.
- Saat memperbaiki dinding beton dan bukit rumput, hindari muka luar yang
  berimpit sehingga menimbulkan kedipan atau bercak pada permukaan.

Koreksi terbaru jarak jalan — 2 November 2026:

- Pengguna membatalkan penerapan jarak literal 25 meter karena terlalu luas.
- Gunakan proporsi perkiraan foto: jalan dekat tepian, jaraknya bervariasi
  alami, dengan tanah lebih lebar pada lekukan tempat fasilitas.
- Jangan memperluas seluruh tapak atau memundurkan kolam untuk mengejar
  angka jarak. Pertahankan danau memanjang serta plaza/ramp utama.
- Seluruh aturan keterpisahan fasilitas di atas tetap berlaku.

Arahan rute terbaru — sketsa biru:

- Ikuti garis biru pada `assets/originals/blue-route-reference.png`; abaikan
  coretan hitam. Arahan ini menggantikan penambahan offset jarak sebelumnya.
- Pertahankan lengkung belakang yang lebih luar, lekukan kanan menuju area
  dudukan dan kedua lengkung akses depan yang lebih lebar.
- Plaza dan bentuk kolam tetap; kedua akses utama tetap bercermin, dengan
  lengkung dan titik pertemuan menyesuaikan rute biru.
- Seluruh fasilitas beserta anak objek tetap terpisah dari jalan. Tanaman
  mengikuti rute final dan tidak boleh menutup paving, termasuk kedua ramp.


Struktur kode mengikuti praktikum:

- Entry aplikasi ada pada `main.js`; matematika pada `math3d.js`; hierarki dan
  matrix stack pada `hierarchy.js`; WebGL pada `renderer.js`; compile/link pada
  `initShaders.js`; GLSL pada `shaders.js`; stylesheet utama `style.css`.
- Modul objek pada `js/` mengimpor hierarchy dan math, tanpa mengimpor renderer.
- Berkas lama engine/math/main/shaders di `js/` menjadi re-export atau entry
  kompatibilitas. Ubah implementasi utama, bukan membuat salinan logika di shim.
- Pertahankan satu konvensi column-major, vector kolom, rotasi radian dan urutan
  P × V × M; seluruh aturan tata letak di atas tetap berlaku.
