import {Vec3} from './math3d.js';
import { createRenderer } from './renderer.js';
import { createInfinitsScene } from './js/scene.js?v=practicum-structure-20261102';
import { photos, videos, previewURL, sourceURL } from './js/media.js?v=layout-20261101';

// 1. STATE DAN REFERENSI DOM
const $ = id => document.getElementById(id);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const canvas = $('scene');
const state = {
  time: 0, lighting: true, textures: true, shadows: true, reflections: true, sunElevation: 42,
  sunAzimuth: -35, windStrength: 1, waterStrength: 1, exposure: 1, quality: 'balanced',
};
let paused = false, speed = 1, touring = false, frameHandle = 0;
let renderer, scene, activeCamera, destination = null;

function setStatus(message, error = false) {
  $('appStatus').textContent = message;
  $('appStatus').dataset.state = error ? 'error' : 'ready';
}

function setPaused(value) {
  paused = value;
  $('playPause').textContent = paused ? 'Lanjutkan animasi' : 'Jeda animasi';
  $('playPause').setAttribute('aria-pressed', String(paused));
  canvas.dataset.paused = String(paused);
}

function setTour(value) {
  touring = value;
  $('tourToggle').setAttribute('aria-pressed', String(value));
  $('tourToggle').textContent = value ? 'Hentikan tur' : 'Tur otomatis';
}

function choosePreset(id, immediate = false) {
  const preset = scene.presets.find(item => item.id === id) || scene.presets[0];
  const next = { ...preset, target: [...preset.target] };
  if(activeCamera)activeCamera.projection=preset.projection;
  setGroundVisible(!preset.inspect);
  setTour(false);
  // Tampilan ukur harus langsung sejajar sumbu; perspektif tetap bertransisi
  if (immediate || preset.projection === 'orthographic') { activeCamera = next; destination = null; }
  else {
    // Ambil busur terpendek saat perpindahan kamera melewati ±π.
    next.yaw = activeCamera.yaw + Math.atan2(Math.sin(next.yaw - activeCamera.yaw), Math.cos(next.yaw - activeCamera.yaw));
    destination = next;
  }
  $('presetSelect').value = preset.id;
  if(preset.id==='platform'){
    const photo=photos.find(item=>item.name==='IMG_20261101_164440.jpg');
    if(photo){$('referenceSelect').value=photo.id;$('referenceSelect').dispatchEvent(new Event('change'));}
  }
}

function setGroundVisible(visible) {
  $('groundToggle').checked=visible;
  if(scene?.inspection)for(const node of Object.values(scene.inspection))if(node)node.visible=visible;
  setStatus(visible
    ? `Siap · ${renderer?.stats.webglVersion || 'WebGL'} · geser canvas untuk melihat taman.`
    : 'Inspeksi sisi bawah · tanah dan permukaan air disembunyikan.');
}

// 2. CAMERA: posisi mata, target, proyeksi, near/far.
function cameraView() {
  const { yaw, pitch, distance, target, fov } = activeCamera;
  const horizontal = Math.cos(pitch) * distance;
  return {
    eye: Vec3.add(target,[Math.sin(yaw)*horizontal, Math.sin(pitch)*distance, Math.cos(yaw)*horizontal]),
    target, fov: fov || 45, near: .15, far: 360,
    projection:activeCamera.projection,orthoSpan:distance*.66,
  };
}

function setupCameraControls() {
  const pointers = new Map();
  let pinch = null;
  const pinchDistance = () => {
    const points = [...pointers.values()];
    return points.length === 2 ? Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y) : null;
  };
  canvas.addEventListener('pointerdown', event => {
    if (event.button !== 0 && event.button !== 1) return;
    canvas.focus({ preventScroll: true });
    destination = null;
    setTour(false);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    pinch = pinchDistance();
    canvas.setPointerCapture(event.pointerId);
    canvas.classList.add('is-dragging');
  });
  canvas.addEventListener('pointermove', event => {
    const pointer = pointers.get(event.pointerId);
    if (!pointer) return;
    const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y;
    pointer.x = event.clientX; pointer.y = event.clientY;
    if (pointers.size === 2) {
      const next = pinchDistance();
      if (pinch > 1 && next > 1) activeCamera.distance = clamp(activeCamera.distance * pinch / next, 4, 175);
      pinch = next;
      canvas.dataset.camera = 'custom';
      return;
    }
    if (pointers.size > 2) return;
    if (event.shiftKey || event.buttons === 4) {
      const units = activeCamera.distance * .0014;
      const right = [Math.cos(activeCamera.yaw), 0, -Math.sin(activeCamera.yaw)];
      activeCamera.target[0] = clamp(activeCamera.target[0] - dx * right[0] * units, scene.structures.groundBounds.minX, scene.structures.groundBounds.maxX);
      activeCamera.target[2] = clamp(activeCamera.target[2] - dx * right[2] * units, scene.structures.groundBounds.minZ, scene.structures.groundBounds.maxZ);
      activeCamera.target[1] = clamp(activeCamera.target[1] + dy * units, -2, 15);
    } else {
      activeCamera.yaw -= dx * .006;
      activeCamera.pitch = clamp(activeCamera.pitch + dy * .005, -1.55, 1.55);
    }
    canvas.dataset.camera = 'custom';
  });
  const release = event => {
    if (!pointers.has(event.pointerId)) return;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    pointers.delete(event.pointerId);
    pinch = pinchDistance();
    if (!pointers.size) canvas.classList.remove('is-dragging');
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('wheel', event => {
    event.preventDefault();
    destination = null;
    activeCamera.distance = clamp(activeCamera.distance * Math.exp(event.deltaY * .001), 4, 175);
    canvas.dataset.camera = 'custom';
  }, { passive: false });
  $('presetSelect').addEventListener('change', event => choosePreset(event.target.value));
  $('resetView').addEventListener('click', () => choosePreset(scene.presets[0].id));
  $('tourToggle').addEventListener('click', () => { destination = null; setTour(!touring); });
  $('playPause').addEventListener('click', () => setPaused(!paused));
  $('fullscreen').addEventListener('click', toggleFullscreen);
  $('captureButton').addEventListener('click', capture);
  document.addEventListener('keydown', event => {
    if (/^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(event.target.tagName) || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.code === 'Space') { event.preventDefault(); setPaused(!paused); }
    if (event.key.toLowerCase() === 'r') choosePreset(scene.presets[0].id);
    if (event.key.toLowerCase() === 'f') toggleFullscreen();
  });
}

async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await canvas.parentElement.requestFullscreen();
  } catch { setStatus('Layar penuh tidak tersedia pada browser ini.'); }
}

function capture() {
  // Seluruh tekstur scene dibuat lokal, sehingga canvas tetap origin-clean.
  renderer.render(scene.root, cameraView(), state);
  canvas.toBlob(blob => {
    if (!blob) { setStatus('Gambar belum dapat disimpan. Coba sekali lagi.', true); return; }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'infinits-park-webgl.png'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus('Tangkapan scene tersimpan sebagai PNG.');
  }, 'image/png');
}

// 3. KONTROL: input event mengubah state yang dibaca tiap frame
function setupParameters() {
  for (const id of ['sunElevation', 'windStrength', 'waterStrength', 'animationSpeed']) {
    const input = $(id);
    const update = () => {
      const value = Number(input.value);
      if (id === 'animationSpeed') speed = value;
      else state[id] = value;
      const output = $(`${id}Value`);
      if (output) output.textContent = id === 'sunElevation' ? `${value}°` : `${value.toFixed(2).replace(/0$/, '')}×`;
    };
    input.addEventListener('input', update); update();
  }
  $('textureToggle').addEventListener('change', event => { state.textures = event.target.checked; });
  $('lightingToggle').addEventListener('change', event => { state.lighting = event.target.checked; });
  $('shadowToggle').addEventListener('change', event => { state.shadows = event.target.checked; });
  $('reflectionToggle').addEventListener('change', event => { state.reflections = event.target.checked; });
  $('qualitySelect').addEventListener('change', event => { state.quality = event.target.value; });
  $('groundToggle').addEventListener('change', event => setGroundVisible(event.target.checked));
}

function setupMedia() {
  const localURLs = [];
  $('referenceSelect').replaceChildren();
  $('videoSelect').replaceChildren();
  $('mediaThumbs').replaceChildren();
  function fillSelect(id, items) {
    const select = $(id);
    const start = select.options.length;
    items.forEach((item, index) => select.add(new Option(`${start + index + 1}. ${item.label} · ${item.name}`, item.id)));
  }
  
  function show(kind) {
    const isPhoto = kind === 'reference';
    const items = isPhoto ? photos : videos;
    const media = items.find(item => item.id === $(`${kind}Select`).value) || items[0];
    $(`${kind}Frame`).src = previewURL(media);
    $(`${kind}Frame`).title = `${isPhoto ? 'Foto' : 'Video'} asli: ${media.name}`;
    $(`${kind}Title`).textContent = media.label;
    $(`open${isPhoto ? 'Reference' : 'Video'}`).href = sourceURL(media);
    if (isPhoto) document.querySelectorAll('.media-thumb').forEach(button => {
      const active = button.dataset.id === media.id;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }
  
  fillSelect('referenceSelect', photos); fillSelect('videoSelect', videos);
  $('referenceSelect').addEventListener('change', () => show('reference'));
  $('videoSelect').addEventListener('change', () => show('video'));
  for (const media of [...photos.slice(0,8),...photos.filter(item=>item.name==='IMG_20261101_164440.jpg')]) {
    const button = document.createElement('button');
    button.className = 'media-thumb'; button.type = 'button'; button.dataset.id = media.id;
    button.setAttribute('aria-label', `Lihat foto: ${media.label}`);
    const image = document.createElement('img');
    image.src = media.thumbnail; image.alt = media.label; image.loading = 'lazy'; image.width = 200; image.height = 150;
    const label = document.createElement('span'); label.className = 'thumb-label'; label.textContent = media.label;
    button.append(image, label);
    button.addEventListener('click', () => { $('referenceSelect').value = media.id; show('reference'); });
    $('mediaThumbs').append(button);
  }
  
  show('reference'); show('video');
  $('localMediaInput')?.addEventListener('change', event => {
    let count = 0;
    for (const file of event.target.files) {
      const isPhoto = file.type.startsWith('image/'), isVideo = file.type.startsWith('video/');
      if (!isPhoto && !isVideo) continue;
      const url = URL.createObjectURL(file); localURLs.push(url);
      const item = { id: `local-${localURLs.length}`, name: file.name, label: `Lokal: ${file.name}`, localURL: url };
      const items = isPhoto ? photos : videos, kind = isPhoto ? 'reference' : 'video';
      fillSelect(`${kind}Select`, [item]); items.push(item);
      $(`${kind}Select`).value = item.id; show(kind); count++;
    }
    $('localMediaStatus').textContent = `${count} berkas lokal dibuka. Berkas tetap berada di perangkatmu; pilihan ini tidak disimpan setelah halaman ditutup.`;
  });
  window.addEventListener('pagehide', () => localURLs.forEach(url => URL.revokeObjectURL(url)));
}

function renderHierarchy(items, parent) {
  const list = document.createElement('ul');
  for (const item of items) {
    const li = document.createElement('li');
    const details = document.createElement('details'); details.open = true;
    const summary = document.createElement('summary'); summary.textContent = item.name;
    details.append(summary);
    if (item.description) { const p = document.createElement('p'); p.textContent = item.description; details.append(p); }
    if (item.children?.length) renderHierarchy(item.children, details);
    li.append(details); list.append(li);
  }
  parent.append(list);
}

function setupTeam() {
  const key = 'infinits-tugas2-team-v1';
  const ids = ['groupName', 'member1', 'member2'];
  function labels() {
    $('member1Label').textContent = $('member1').value.trim() || 'Anggota 1';
    $('member2Label').textContent = $('member2').value.trim() || 'Anggota 2';
  }
  try {
    const saved = JSON.parse(localStorage.getItem(key) || '{}');
    ids.forEach(id => { if (typeof saved[id] === 'string') $(id).value = saved[id]; });
  } catch { /* Browser privat atau penyimpanan dibatasi: formulir tetap bekerja. */ }
  ids.forEach(id => $(id).addEventListener('input', labels)); labels();
  $('saveTeam').addEventListener('click', event => {
    event.preventDefault(); labels();
    try {
      localStorage.setItem(key, JSON.stringify(Object.fromEntries(ids.map(id => [id, $(id).value.trim()]))));
      $('teamStatus').textContent = 'Identitas disimpan di browser ini. Untuk pengumpulan, isi juga identitas di README atau index.html.';
    } catch { $('teamStatus').textContent = 'Penyimpanan browser dibatasi. Salin identitas ke README atau index.html untuk pengumpulan.'; }
  });
}

// 4. UPDATE: state animasi dan transformasi lokal, tanpa panggilan GPU.
function update(delta) {
  if (!paused) state.time += delta * speed;
  if (destination) {
    const alpha = 1 - Math.exp(-delta * 6);
    for (const key of ['yaw', 'pitch', 'distance', 'fov']) activeCamera[key] += (destination[key] - activeCamera[key]) * alpha;
    activeCamera.target = activeCamera.target.map((value, i) => value + (destination.target[i] - value) * alpha);
    if (Math.abs(activeCamera.distance - destination.distance) < .005 && Math.abs(activeCamera.yaw - destination.yaw) < .0001) {
      activeCamera = destination; destination = null;
    }
  }
  if (touring && !paused) activeCamera.yaw += delta * speed * .10;
  scene.update(state.time, state);
}

// 5. INIT: siapkan scene, renderer, kontrol dan mulai requestAnimationFrame
function init() {
  setupMedia(); setupTeam(); setupParameters();
  try {
    renderer = createRenderer(canvas);
    scene = createInfinitsScene();
    for (const [feature, id] of [['shadows', 'shadowToggle'], ['reflections', 'reflectionToggle']]) {
      if (renderer.features?.[feature] === false) {
        state[feature] = false; $(id).checked = false; $(id).disabled = true;
        $(id).parentElement.title = 'Efek ini tidak didukung GPU/browser ini.';
      }
    }
    $('presetSelect').replaceChildren();
    scene.presets.forEach(preset => $('presetSelect').add(new Option(preset.label, preset.id)));
    choosePreset(scene.presets[0].id, true);
    $('treeDiagram').replaceChildren();
    renderHierarchy(scene.hierarchy, $('treeDiagram'));
    setupCameraControls();
    setPaused(false);
    setStatus(`Siap · ${renderer.stats.webglVersion || 'WebGL'} · geser canvas untuk melihat taman.`);
  } catch (error) {
    console.error(error);
    setStatus(`Scene tidak dapat dimuat: ${error.message}. Aktifkan akselerasi grafis dan gunakan browser yang mendukung WebGL.`, true);
    $('presetSelect').replaceChildren(new Option('Scene tidak tersedia', ''));
    $('treeDiagram').textContent = 'Diagram belum tersedia karena scene gagal dimuat. Struktur kode dijelaskan dalam README.';
    for (const id of ['playPause', 'resetView', 'tourToggle', 'presetSelect', 'fullscreen', 'captureButton',
      'sunElevation', 'windStrength', 'waterStrength', 'animationSpeed', 'textureToggle', 'lightingToggle', 'shadowToggle', 'reflectionToggle', 'qualitySelect', 'groundToggle']) $(id).disabled = true;
    return;
  }
  let previous = performance.now(), fpsStarted = previous, frames = 0;
  
  // 6. RENDER: delta time → update → draw → frame berikutnya
  function render(now) {
    const delta = Math.min((now - previous) / 1000, .05); previous = now;
    update(delta);
    renderer.render(scene.root, cameraView(), state);
    frames++;
    if (now - fpsStarted >= 600) {
      const fps = Math.round(frames * 1000 / (now - fpsStarted));
      $('fpsValue').textContent = String(fps);
      $('fpsValue').title = `${renderer.stats.instances} objek · ${renderer.stats.drawCalls} draw call · ${renderer.stats.triangles.toLocaleString('id-ID')} segitiga`;
      canvas.dataset.time = state.time.toFixed(3);
      canvas.dataset.objects = renderer.stats.instances;
      canvas.dataset.shadows = String(state.shadows);
      canvas.dataset.reflections = String(state.reflections);
      fpsStarted = now; frames = 0;
    }
    frameHandle = requestAnimationFrame(render);
  }
  frameHandle = requestAnimationFrame(render);
  document.addEventListener('visibilitychange', () => { previous = performance.now(); });
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault(); cancelAnimationFrame(frameHandle);
    setStatus('Koneksi grafis terputus. Tunggu pemulihan browser atau muat ulang halaman.', true);
  });
  canvas.addEventListener('webglcontextrestored', () => window.location.reload());
  window.addEventListener('pagehide', () => { cancelAnimationFrame(frameHandle); renderer.dispose(); });
}

init();
