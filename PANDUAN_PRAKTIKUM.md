# Struktur Tugas 2 mengikuti pola praktikum

Objek tugas tetap Danau InfinITS. Materi dipakai sebagai acuan susunan kode,
pipeline WebGL, kamera dan pewarisan transformasi.

## Acuan yang berhasil dibaca

| Materi | Bagian yang diterapkan |
| --- | --- |
| `praktikum-4.md` | ES module, `main.js`, `style.css`, `math3d.js`, Vec3/Mat4, Model–View–Projection, `init()` dan `requestAnimationFrame()` |
| `Contoh 8.1 robo arm.zip` | Susunan transformasi lokal dari base ke bagian anak; geometri objek dibuat melalui fungsi masing-masing |
| `Contoh 8.2 robo full.zip` | `createNode()`, traversal hierarki, matrix stack dengan push/pop, pemulihan parent sebelum sibling |

Tiga tautan Classroom untuk pertemuan 2, 3 dan 5 belum dapat dibaca. Pada
pemeriksaan sumber pertama, situs meminta login dan course menolak akses
tamu. Kesesuaian rinci dengan isi ketiga berkas tersebut belum diverifikasi.
Fungsi WebGL dasar, transformasi, Phong dan texture mapping yang sudah ada
pada tugas tetap digunakan dan diuji.

## Struktur berkas

```text
tugas2/
├── index.html                halaman, canvas dan kontrol
├── style.css                 tampilan halaman
├── main.js                   state, init(), update(), render(), input
├── math3d.js                 Vec3, Mat4, degToRad()
├── hierarchy.js              createNode(), Node3D, traverse(), matrix stack
├── initShaders.js            createShader(), createProgram(), initShaders()
├── shaders.js                vertex/fragment shader, lighting, tekstur, air
├── renderer.js               context, buffers, attributes, uniforms, draw
├── js/
│   ├── scene.js              susun objek, preset kamera, update animasi
│   ├── geometry.js           vertex, normal, UV, indeks mesh primitif
│   ├── textures.js           pembuatan tekstur prosedural
│   ├── vegetation.js         pohon → cabang → ranting → daun
│   ├── park-objects.js        playground, alat olahraga, lampu dan pivot
│   ├── entrance.js           tulisan, plaza dan kedua ramp
│   ├── site-plan.js          rute biru dan penempatan objek
│   └── ...                   modul objek taman lainnya
├── assets/                   dokumentasi dan aset foto
├── tests/                    tes CPU dan smoke test GPU
├── README.md                 cara menjalankan dan pembagian tugas
└── PANDUAN_PRAKTIKUM.md       urutan membaca kode ini
```

`js/engine.js`, `js/math.js`, `js/shaders.js`, `js/main.js` dan `styles.css`
menjadi penghubung kompatibilitas untuk alamat lama. Implementasi utamanya
ada pada berkas di root di atas. Modul objek mengimpor hierarchy dan math
secara langsung, sehingga kode model terpisah dari pengelolaan GPU.

## Urutan membaca kode

1. Buka `index.html`: lihat canvas, kontrol, stylesheet dan entry module.
2. Buka `main.js`: pelajari state dan fungsi `init()`.
3. Buka `initShaders.js` dan `renderer.js`: context → compile shader → link
   program → buffer → attribute → uniform → draw.
4. Buka `math3d.js`: matriks Model, View dan Projection memakai konvensi yang sama.
5. Buka `hierarchy.js`: transformasi parent diwariskan ke child dengan matrix stack.
6. Buka `js/scene.js`, lalu pilih satu modul objek untuk melihat pemakaiannya.
7. Kembali ke `main.js`: `render(now)` menghitung delta time, memanggil
   `update(delta)`, menggambar scene, lalu menjadwalkan frame berikutnya.

## Model–View–Projection

Semua matriks memakai column-major dan vector kolom. Rotasi pada `Mat4`
memakai radian; `degToRad()` mengubah sudut derajat.

```javascript
let model = Mat4.translation(tx, ty, tz);
model = Mat4.multiply(model, Mat4.rotationZ(rz));
model = Mat4.multiply(model, Mat4.rotationY(ry));
model = Mat4.multiply(model, Mat4.rotationX(rx));
model = Mat4.multiply(model, Mat4.scaling(sx, sy, sz));
```

`Mat4.compose(position, rotation, scale)` pada scene menghasilkan susunan
yang sama: `T × Rz × Ry × Rx × S`. Implementasi compose dihitung langsung
untuk mengurangi alokasi saat ribuan node diperbarui setiap frame.

View dibuat dengan `Mat4.lookAt()`; Projection memakai `Mat4.perspective()`
atau `Mat4.orthographic()`. Di `renderer.js`, dua matriks dikirim terpisah:

```javascript
gl.uniformMatrix4fv(uniforms.u_view, false, viewMatrix);
gl.uniformMatrix4fv(uniforms.u_projection, false, projectionMatrix);
```

Di vertex shader `shaders.js`:

```glsl
mat4 model = mat4(a_model0, a_model1, a_model2, a_model3);
vec4 world = model * vec4(a_position, 1.0);
gl_Position = u_projection * u_view * world;
```

Matriks Model dikirim sebagai empat kolom attribute per instance. Perannya
sama dengan `u_model` pada contoh satu cube; instancing digunakan agar mesh
pohon/daun yang dipakai berulang tetap efisien. Peta bayangan dan pantulan
mempunyai matriks kamera terpisah, dengan proyeksi utama tetap memakai P × V × M.

## Hierarki seperti contoh robot

Contoh robot menyimpan `child` dan `sibling` berupa ID. Pada taman, satu node
mempunyai array `children`; setiap elemen sesudah anak pertama berperan sebagai
sibling. Ini memudahkan satu cabang mempunyai banyak ranting dan daun.

`createNode(name, options)` membuat node dan `parent.add(child)` memasangkannya.
Fungsi `traverse()` benar-benar dipakai renderer dan pemeriksaan world matrix:

```text
push matriks parent
  world = parent × local
  kunjungi node
  kunjungi semua child
pop matriks parent sebelum sibling berikutnya
```

Contoh yang dapat diperiksa pada model:

- `js/vegetation.js`: gerak cabang membawa ranting dan daun, sedangkan trunk tetap.
- `js/park-objects.js`: gerak poros alat olahraga membawa pijakan anaknya.
- `js/scene.js`: fungsi `update(time, state)` memperbarui bagian yang dianimasikan.

Seperti contoh robot, transformasi untuk membuat ukuran mesh ditempatkan
pada node geometri yang sesuai. Pertahankan pivot dan hubungan parent–child
ketika menambah bagian yang bergerak.

## Shader, buffer dan tekstur

| Konsep | Kode tugas |
| --- | --- |
| Compile/link dan laporan error | `initShaders.js` |
| Position buffer, normal dan UV | `renderer.js` → `getMesh()` |
| `vertexAttribPointer()` | `renderer.js` → `bindGroupGeometry()` |
| Model matrix per objek | `hierarchy.js` → `traverse()` |
| Uniform kamera | `renderer.js` → `renderColorPass()` |
| Lighting ambient/diffuse/specular | `shaders.js` → fragment shader |
| Tekstur dan sampler | `js/textures.js`, `renderer.js` → `uploadTexture()` |
| Draw segitiga | `renderer.js` → `issueDraw()` |

Mesh taman menggunakan index buffer dan `drawElements()`; mesh berulang
menggunakan instanced draw. Vertex tetap berasal dari array posisi, normal
serta UV. Tidak diperlukan Three.js atau model unduhan.

## Menjalankan dan memeriksa

```bash
python3 serve.py
npm test
```

`npm test` memerlukan Node.js. Halaman GPU ada pada
`http://127.0.0.1:8000/tests/render-smoke.html`; gunakan `?webgl=1` untuk
fallback WebGL 1 dan `?projection=orthographic` untuk ortografis.

Lihat `VALIDATION.md` untuk hasil pengujian dan kesamaan scene sebelum–sesudah.
