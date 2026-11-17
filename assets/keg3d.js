// Трёхмерная кега Хартии: пропорции, цвета и этикетка сняты с фотографий кеги №5.
// Крутится мышью или пальцем, кнопки «Спереди / Сбоку / Сзади» поворачивают к нужной стороне.
// Без WebGL остаются обычные картинки (рендеры этой же модели).
import * as THREE from './vendor/three.module.min.js';

const stage = document.querySelector('[data-3d]');
const TAU = Math.PI * 2;
const VIEWS = [0.15, 0.30, 0.43].map((u) => -u * TAU);   // спереди (логотип), сбоку (логотип и надпись), сзади (надпись)

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) { return false; }
}

function rng(seed) {
  let s = seed >>> 0;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
}

// ---------- этикетка ----------

function ellipsePath(g, rx, ry) { g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); }

function arcText(g, text, r, centerAngle, font, color) {
  g.font = font; g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
  const widths = Array.from(text).map((ch) => g.measureText(ch).width + 3);
  const total = widths.reduce((a, b) => a + b, 0) / r;
  let a = centerAngle - total / 2;
  Array.from(text).forEach((ch, i) => {
    const w = widths[i] / r; a += w / 2;
    g.save(); g.rotate(a + Math.PI / 2); g.translate(0, -r); g.fillText(ch, 0, 0); g.restore();
    a += w / 2;
  });
}

function drawLogo(g, cx, cy, rx, ry) {
  g.save(); g.translate(cx, cy);
  ellipsePath(g, rx, ry); g.fillStyle = '#efe5c4'; g.fill();
  const shade = g.createRadialGradient(-rx * 0.2, -ry * 0.3, ry * 0.2, 0, 0, rx);
  shade.addColorStop(0, 'rgba(255,250,230,.0)'); shade.addColorStop(1, 'rgba(120,90,50,.28)');
  ellipsePath(g, rx, ry); g.fillStyle = shade; g.fill();
  g.lineWidth = 8; g.strokeStyle = '#4a3326'; ellipsePath(g, rx - 4, ry - 4); g.stroke();
  g.lineWidth = 2.5; ellipsePath(g, rx - 20, ry - 20); g.stroke();

  g.save(); ellipsePath(g, rx - 22, ry - 22); g.clip();
  // надпись по дуге
  g.save(); g.translate(0, ry * 0.38);
  arcText(g, 'ЧАСТНАЯ ПИВОВАРНЯ', ry * 1.0, -Math.PI / 2, '700 21px "Old Standard TT", serif', '#2b1b14');
  g.restore();
  // «ХАРТИЯ»: первая буква — крылья мельницы
  g.font = '700 68px "Old Standard TT", serif'; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  g.fillStyle = '#b41018'; g.fillText('АРТИЯ', -rx * 0.30, ry * 0.14);
  const bx = -rx * 0.52, by = -ry * 0.04;
  g.save(); g.translate(bx, by);
  g.fillStyle = '#b8a07a'; g.strokeStyle = '#3a2a20'; g.lineWidth = 2.5;           // башня мельницы
  g.beginPath(); g.moveTo(-8, 4); g.lineTo(8, 4); g.lineTo(14, 56); g.lineTo(-14, 56); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#b41018';
  [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4].forEach((a) => {   // крылья
    g.save(); g.rotate(a);
    g.beginPath(); g.moveTo(4, -3); g.lineTo(44, -9); g.lineTo(44, 8); g.lineTo(4, 3); g.closePath(); g.fill();
    g.restore();
  });
  g.beginPath(); g.arc(0, 0, 8, 0, TAU); g.fillStyle = '#7a0c14'; g.fill();
  g.restore();
  // пейзаж под словом
  g.strokeStyle = '#3a2a20'; g.lineWidth = 2.4;
  const gy = ry * 0.46;
  g.beginPath(); g.moveTo(-rx, gy + 10); g.quadraticCurveTo(-rx * 0.2, gy - 6, rx, gy + 8); g.stroke();
  [[-0.30, 30, 20], [-0.08, 40, 24], [0.15, 32, 20], [0.36, 26, 18]].forEach(([k, w, h]) => {
    const x = rx * k, y = gy + 6;
    g.beginPath(); g.rect(x, y - h, w, h); g.moveTo(x - 5, y - h); g.lineTo(x + w / 2, y - h - 16); g.lineTo(x + w + 5, y - h); g.stroke();
  });
  for (let x = -rx * 0.9; x < rx * 0.9; x += 10) { g.beginPath(); g.moveTo(x, gy + 20); g.lineTo(x + 3, gy + 34); g.stroke(); }
  g.restore();
  // «ТЮМЕНЬ»
  g.font = '700 36px "Old Standard TT", serif'; g.fillStyle = '#2b1b14'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('ТЮМЕНЬ', 0, ry * 0.70);
  g.restore();
}

function drawTextBlock(g, cx) {
  g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  g.fillStyle = '#f3e8c9'; g.font = '700 98px Literata, "Old Standard TT", serif';
  g.fillText('Настоящее', cx, 150); g.fillText('живое пиво', cx, 256);
  g.fillStyle = '#f6f0e2'; g.font = '600 44px Literata, serif';
  g.fillText('для душевных компаний,', cx, 340);
  g.fillText('корпоративных', cx, 392);
  g.fillText('и семейных мероприятий', cx, 444);
  g.font = '700 66px Literata, serif'; g.fillStyle = '#ffffff';
  g.fillText('+79044916305', cx, 522);
}

function labelTexture(maxAniso) {
  const W = 3072, H = 552;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#4c1c2d'); bg.addColorStop(1, '#391423');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);

  // пейзаж тонкими линиями, как на этикетке
  const R = rng(11); g.lineCap = 'round';
  const base = H * 0.70;
  g.strokeStyle = 'rgba(196,128,156,.5)'; g.lineWidth = 3;
  for (let k = 0; k < 3; k++) {
    g.beginPath();
    for (let x = 0; x <= W; x += 24) { const y = base + k * 34 + Math.sin(x / 190 + k * 2) * 14 + Math.sin(x / 61 + k) * 5; if (x) g.lineTo(x, y); else g.moveTo(x, y); }
    g.stroke();
  }
  g.lineWidth = 2; g.globalAlpha = 0.45;
  for (let x = 0; x < W; x += 14) { const y0 = base + 70 + Math.sin(x / 190) * 14; g.beginPath(); g.moveTo(x, y0); g.lineTo(x + R() * 8 - 4, y0 + 30 + R() * 40); g.stroke(); }
  g.globalAlpha = 1; g.lineWidth = 3;
  for (let x = 60; x < W; x += 120 + R() * 90) {
    const w = 40 + R() * 40, h = 26 + R() * 18, y = base + 10 + R() * 40;
    g.beginPath(); g.rect(x, y - h, w, h); g.moveTo(x - 6, y - h); g.lineTo(x + w / 2, y - h - 24); g.lineTo(x + w + 6, y - h); g.stroke();
  }
  for (let x = 30; x < W; x += 70 + R() * 60) {
    const y = base + 30 + R() * 40, r = 10 + R() * 14;
    g.beginPath(); g.arc(x, y - r, r, 0, TAU); g.moveTo(x, y); g.lineTo(x, y - r); g.stroke();
  }
  // тонкая жёлтая линия у верхнего края
  g.fillStyle = '#d4aa2c'; g.fillRect(0, 7, W, 6);

  // два овальных логотипа и текстовый блок между ними (по кругу: логотип, текст, логотип, пейзаж)
  const rx = 235, ry = 162, cy = H * 0.5;
  drawLogo(g, W * 0.15, cy, rx, ry);
  drawLogo(g, W * 0.706, cy, rx, ry);
  drawTextBlock(g, W * 0.43);

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso; t.wrapS = THREE.RepeatWrapping;
  return t;
}

function bottomTexture(maxAniso) {
  const W = 1024, H = 512;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#0b7a42'; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(230,246,236,.92)'; g.font = '700 190px "Old Standard TT", serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('5', W * 0.17, H * 0.40);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso;
  return t;
}

// ---------- сцена ----------

async function init() {
  if (!stage || !hasWebGL()) return;
  try { await document.fonts.ready; } catch (e) { /* шрифты не обязательны */ }

  const capture = /[?&]capture/.test(location.search);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: capture });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.setClearColor(0x000000, 0);
  const aniso = renderer.capabilities.getMaxAnisotropy();

  const scene = new THREE.Scene();
  // мягкий студийный свет для отражений на пластике
  const pm = new THREE.PMREMGenerator(renderer);
  const env = new THREE.Scene();
  env.background = new THREE.Color(0x9aa0a4);
  const soft = (w, h, x, y, z, v) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(v, v, v), side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m);
  };
  soft(5, 3.2, -4, 3.5, 3, 7); soft(3, 4, 4.5, 1.5, 2, 3.2); soft(8, 1.2, 0, 5, -2, 4.5); soft(6, 2, 0, -1, 5, 1.2);
  scene.environment = pm.fromScene(env, 0.035).texture;

  const key = new THREE.DirectionalLight(0xfff4e6, 1.25); key.position.set(-3, 5, 4); scene.add(key);
  const fill = new THREE.DirectionalLight(0xe8f0ff, 0.35); fill.position.set(4, 2, 3); scene.add(fill);

  const camera = new THREE.PerspectiveCamera(24, 7 / 9, 0.1, 50);
  camera.position.set(0, 1.35, 4.25); camera.lookAt(0, 0.70, 0);

  const green = new THREE.MeshPhysicalMaterial({ color: 0x0b7a42, roughness: 0.42, metalness: 0, clearcoat: 0.25, clearcoatRoughness: 0.45, envMapIntensity: 0.55 });
  const greenDark = new THREE.MeshPhysicalMaterial({ color: 0x075c30, roughness: 0.55, envMapIntensity: 0.5 });
  const black = new THREE.MeshStandardMaterial({ color: 0x131313, roughness: 0.5, metalness: 0, envMapIntensity: 0.7 });
  const yellow = new THREE.MeshStandardMaterial({ color: 0xe6c01a, roughness: 0.45, envMapIntensity: 0.7 });
  const labelMat = new THREE.MeshStandardMaterial({ map: labelTexture(aniso), roughness: 0.45, metalness: 0, envMapIntensity: 0.4 });
  const bottomMat = new THREE.MeshPhysicalMaterial({ map: bottomTexture(aniso), roughness: 0.42, clearcoat: 0.25, envMapIntensity: 0.55 });

  const keg = new THREE.Group();
  const lathe = (pts, mat) => {
    const m = new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 192), mat);
    keg.add(m); return m;
  };
  lathe([[0, 0.012], [0.30, 0.0], [0.35, 0.012], [0.40, 0.04], [0.435, 0.12], [0.455, 0.25], [0.468, 0.34], [0.474, 0.372]], bottomMat);   // низ
  lathe([[0.474, 0.37], [0.492, 0.385], [0.494, 0.40], [0.492, 0.415], [0.476, 0.426]], yellow);                                            // жёлтое кольцо
  lathe([[0.478, 0.425], [0.478, 0.968]], labelMat);                                                                                         // этикетка
  lathe([[0.478, 0.964], [0.503, 0.975], [0.507, 1.05], [0.503, 1.10], [0.484, 1.116]], black);                                              // чёрный ремень
  lathe([[0.484, 1.112], [0.488, 1.15], [0.487, 1.30], [0.482, 1.37], [0.470, 1.405], [0.446, 1.428], [0.40, 1.438], [0.34, 1.436],
         [0.26, 1.424], [0.12, 1.418], [0, 1.418]], green);                                                                                // верх
  const bung = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.03, 40), greenDark);
  bung.position.y = 1.425; keg.add(bung);
  const rounded = (w, h, r) => {
    const sh = new THREE.Shape();
    sh.moveTo(-w / 2 + r, -h / 2); sh.lineTo(w / 2 - r, -h / 2); sh.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    sh.lineTo(w / 2, h / 2 - r); sh.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
    sh.lineTo(-w / 2 + r, h / 2); sh.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    sh.lineTo(-w / 2, -h / 2 + r); sh.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
    return new THREE.ShapeGeometry(sh, 8);
  };
  const lip = new THREE.MeshStandardMaterial({ color: 0x075c30, roughness: 0.6, side: THREE.DoubleSide });
  const cavity = new THREE.MeshStandardMaterial({ color: 0x06160d, roughness: 0.9, side: THREE.DoubleSide });
  const plug = new THREE.MeshStandardMaterial({ color: 0xe8e6dc, roughness: 0.55, side: THREE.DoubleSide });
  [0.43, 0.93].forEach((u) => {   // ручки против середины текстового блока и с другой стороны
    const a = u * TAU, grip = new THREE.Group();
    const rim = new THREE.Mesh(rounded(0.36, 0.145, 0.05), lip);
    const hole = new THREE.Mesh(rounded(0.30, 0.095, 0.035), cavity); hole.position.z = 0.002;
    const lock = new THREE.Mesh(rounded(0.20, 0.032, 0.012), plug); lock.position.set(0, -0.018, 0.004);
    grip.add(rim, hole, lock);
    const rr = 0.4875;
    grip.position.set(Math.sin(a) * rr, 1.285, Math.cos(a) * rr);
    grip.rotation.set(-0.05, a, 0, 'YXZ');
    keg.add(grip);
  });
  scene.add(keg);

  // мягкая тень под кегой
  const sc = document.createElement('canvas'); sc.width = sc.height = 256;
  const sg = sc.getContext('2d'); const grad = sg.createRadialGradient(128, 128, 20, 128, 128, 126);
  grad.addColorStop(0, 'rgba(0,0,0,.36)'); grad.addColorStop(0.6, 'rgba(0,0,0,.12)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
  sg.fillStyle = grad; sg.fillRect(0, 0, 256, 256);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 1.25), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = -0.002; scene.add(shadow);

  // вращение
  let yaw = VIEWS[0], target = VIEWS[0], dragging = false, lastX = 0, raf = 0;
  const calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const draw = () => { keg.rotation.y = yaw; renderer.render(scene, camera); };
  const tick = () => {
    raf = 0;
    if (!dragging) yaw += (target - yaw) * (calm ? 1 : 0.14);
    draw();
    if (dragging || Math.abs(target - yaw) > 0.0008) raf = requestAnimationFrame(tick);
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };

  const resize = () => {
    const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); draw();
  };
  renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;touch-action:pan-y';
  renderer.domElement.setAttribute('role', 'img');
  renderer.domElement.setAttribute('aria-label', 'Трёхмерная кега Хартии, её можно повернуть');
  stage.querySelectorAll('img').forEach((i) => { i.hidden = true; });
  stage.appendChild(renderer.domElement);
  stage.dataset.live = '1';
  new ResizeObserver(resize).observe(stage); resize();

  renderer.domElement.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; renderer.domElement.setPointerCapture(e.pointerId); kick(); });
  renderer.domElement.addEventListener('pointermove', (e) => { if (!dragging) return; yaw += (e.clientX - lastX) * 0.012; target = yaw; lastX = e.clientX; });
  const stop = () => { dragging = false; };
  renderer.domElement.addEventListener('pointerup', stop); renderer.domElement.addEventListener('pointercancel', stop);
  stage.addEventListener('keg:view', (e) => {
    const goal = VIEWS[e.detail] ?? VIEWS[0];
    let d = (goal - yaw) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU;
    target = yaw + d; kick();
  });

  // для съёмки готовых картинок
  window.hartiaKeg = {
    views: VIEWS,
    shot(viewIndex, w, h) {
      yaw = target = VIEWS[viewIndex]; renderer.setPixelRatio(1); renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix(); draw();
      const url = renderer.domElement.toDataURL('image/png');
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); resize();
      return url;
    },
  };
  window.dispatchEvent(new Event('keg-ready'));
}

init();
