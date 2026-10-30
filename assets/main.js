/* TILECHECK — dependency-free, fully client-side texture inspector. */
const $ = (id) => document.getElementById(id);
const ui = {
  canvas: $('previewCanvas'), viewer: $('viewer'), input: $('fileInput'),
  chooseBtn: $('chooseBtn'), uploadZone: $('uploadZone'), dropOverlay: $('dropOverlay'),
  fileName: $('fileName'), fileDetails: $('fileDetails'), sampleBtn: $('sampleBtn'),
  repeat: $('repeatRange'), repeatValue: $('repeatValue'),
  zoom: $('zoomRange'), zoomValue: $('zoomValue'),
  offsetX: $('offsetX'), offsetY: $('offsetY'),
  offsetXValue: $('offsetXValue'), offsetYValue: $('offsetYValue'),
  offsetControls: $('offsetControls'), repeatControl: $('repeatControl'),
  guide: $('guideToggle'), modeCaption: $('modeCaption'), previewTitle: $('previewTitle'),
  viewerLabel: $('viewerLabel'), viewHint: $('viewHint'), dimensionLabel: $('dimensionLabel'),
  verticalScore: $('verticalScore'), horizontalScore: $('horizontalScore'),
  verticalBar: $('verticalBar'), horizontalBar: $('horizontalBar'),
  exportPreview: $('exportPreview'), exportOffset: $('exportOffset'),
  fitBtn: $('fitBtn'), toast: $('toast'),
};
const modes = {
  tile: { title: 'Repeat pattern', caption: 'TILED PREVIEW', hint: 'Check for obvious repetition and visible tile boundaries.' },
  offset: { title: 'Expose the seams', caption: 'WRAPPED OFFSET', hint: 'Moving opposite edges toward the center makes discontinuities easier to spot.' },
  mirror: { title: 'Mirrored repeat', caption: 'REFLECTED TILING', hint: 'Adjacent tiles are flipped. Compare the result with regular repetition.' },
  seams: { title: 'Edge difference map', caption: 'SEAM HEATMAP', hint: 'Warm highlights indicate stronger pixel differences where opposing edges meet.' },
  original: { title: 'Source image', caption: 'ORIGINAL TEXTURE', hint: 'View the unmodified source texture.' },
};
const state = {
  mode: 'tile', repeat: 3, zoom: 1, offsetX: .5, offsetY: .5, guides: false,
  source: null, name: 'Concrete / sample',
  analysis: { vertical: 0, horizontal: 0, vHeat: [], hHeat: [] },
};
let raf = 0;
let toastTimer = 0;
const ctx = ui.canvas.getContext('2d', { alpha: false });
if (!ctx) throw new Error('Canvas 2D is unavailable');

function notify(message, error = false) {
  clearTimeout(toastTimer);
  ui.toast.textContent = message;
  ui.toast.classList.toggle('error', error);
  ui.toast.hidden = false;
  toastTimer = setTimeout(() => { ui.toast.hidden = true; }, 3800);
}
const byteSize = (bytes) => bytes >= 1024 * 1024 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
const sanitized = (name) => name.replace(/\.[^.]+$/, '').replace(/[^\p{L}\p{N}._-]+/gu, '-').slice(0, 90) || 'texture';
function schedule() { if (!raf) raf = requestAnimationFrame(() => { raf = 0; draw(); }); }

function makeDemo() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 512;
  const c = cv.getContext('2d');
  const image = c.createImageData(512, 512);
  let seed = 431;
  const rand = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
  const speckles = Array.from({ length: 512 * 512 }, () => rand());
  for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
    const v = Math.sin(x / 70) * 8 + Math.cos(y / 59) * 9 + (speckles[y * 512 + x] - .5) * 29;
    const band = Math.sin((x * .9 + y * 1.1) / 30) * 7;
    const i = 4 * (y * 512 + x);
    image.data[i] = 112 + v + band;
    image.data[i + 1] = 117 + v + band;
    image.data[i + 2] = 112 + v + band;
    image.data[i + 3] = 255;
  }
  c.putImageData(image, 0, 0);
  c.strokeStyle = '#4a5667'; c.lineWidth = 10; c.lineCap = 'round';
  c.beginPath(); c.moveTo(45, 370); c.bezierCurveTo(185, 307, 301, 460, 475, 389); c.stroke();
  c.strokeStyle = '#dbe4f1'; c.lineWidth = 3;
  c.beginPath(); c.moveTo(37, 360); c.bezierCurveTo(185, 296, 303, 449, 472, 382); c.stroke();
  c.fillStyle = '#637c9d';
  for (const [x, y, r] of [[111, 92, 23], [347, 174, 32], [198, 239, 10], [404, 465, 17]]) {
    c.globalAlpha = .45; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  }
  c.globalAlpha = 1;
  return cv;
}

function sampleCanvas(source, maxDim = 320) {
  const scale = Math.min(1, maxDim / Math.max(source.width, source.height));
  const cv = document.createElement('canvas'); cv.width = Math.max(2, Math.round(source.width * scale)); cv.height = Math.max(2, Math.round(source.height * scale));
  cv.getContext('2d', { willReadFrequently: true }).drawImage(source, 0, 0, cv.width, cv.height);
  return cv;
}
function analyze(source) {
  const cv = sampleCanvas(source);
  const w = cv.width, h = cv.height;
  const data = cv.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data;
  function diff(x1, y1, x2, y2) {
    const a = (y1 * w + x1) * 4, b = (y2 * w + x2) * 4;
    // Compare premultiplied RGB against the same neutral background for transparent textures.
    let total = 0;
    for (let k = 0; k < 3; k++) {
      const ca = data[a + k] * data[a + 3] / 255 + 64 * (1 - data[a + 3] / 255);
      const cb = data[b + k] * data[b + 3] / 255 + 64 * (1 - data[b + 3] / 255);
      total += Math.abs(ca - cb);
    }
    return total / 3;
  }
  const vHeat = Array.from({ length: h }, (_, y) => diff(0, y, w - 1, y));
  const hHeat = Array.from({ length: w }, (_, x) => diff(x, 0, x, h - 1));
  const avg = (a) => a.reduce((sum, v) => sum + v, 0) / a.length;
  return { vertical: avg(vHeat), horizontal: avg(hHeat), vHeat, hHeat };
}
function updateMetrics() {
  const { vertical, horizontal } = state.analysis;
  ui.verticalScore.textContent = `${vertical.toFixed(1)} / 255`;
  ui.horizontalScore.textContent = `${horizontal.toFixed(1)} / 255`;
  ui.verticalBar.style.width = `${Math.min(100, vertical / 80 * 100)}%`;
  ui.horizontalBar.style.width = `${Math.min(100, horizontal / 80 * 100)}%`;
}
function installSource(canvas, name, sizeText) {
  state.source = canvas; state.name = name; state.analysis = analyze(canvas);
  ui.fileName.textContent = name;
  ui.fileDetails.textContent = `${canvas.width} × ${canvas.height} · ${sizeText}`;
  ui.dimensionLabel.textContent = `${canvas.width} × ${canvas.height} PX`;
  updateMetrics(); schedule();
}

async function loadFile(file) {
  if (!file) return;
  const accepted = ['image/png', 'image/jpeg', 'image/webp', 'image/avif'];
  if (!accepted.includes(file.type)) return notify('Use a PNG, JPG, WEBP or AVIF image.', true);
  if (file.size > 25 * 1024 * 1024) return notify('Image exceeds 25 MB. Choose a smaller file.', true);
  try {
    const bitmap = await createImageBitmap(file);
    if (bitmap.width * bitmap.height > 24_000_000 || !bitmap.width || !bitmap.height) {
      bitmap.close(); return notify('Image is too large. Limit: 24 megapixels.', true);
    }
    const cv = document.createElement('canvas'); cv.width = bitmap.width; cv.height = bitmap.height;
    cv.getContext('2d').drawImage(bitmap, 0, 0); bitmap.close();
    installSource(cv, file.name, byteSize(file.size));
    notify(`Loaded ${file.name}`);
  } catch (error) {
    console.error(error); notify('Unable to decode that image.', true);
  }
}

function makeWrapped(source, xOffset, yOffset) {
  const w = source.width, h = source.height;
  const ox = Math.round(w * xOffset) % w, oy = Math.round(h * yOffset) % h;
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const c = cv.getContext('2d');
  for (const x of [-ox, w - ox]) for (const y of [-oy, h - oy]) c.drawImage(source, x, y);
  return cv;
}
function checker(c, w, h) {
  c.fillStyle = '#161e2c'; c.fillRect(0, 0, w, h);
  const size = 21;
  c.fillStyle = '#202d40';
  for (let y = 0; y < h; y += size) for (let x = 0; x < w; x += size) if (((x / size + y / size) & 1) === 0) c.fillRect(x, y, size, size);
}
function drawMirrored(c, source, x, y, w, h, flipX, flipY) {
  c.save(); c.translate(x + (flipX ? w : 0), y + (flipY ? h : 0));
  c.scale(flipX ? -1 : 1, flipY ? -1 : 1); c.drawImage(source, 0, 0, w, h); c.restore();
}
function addHeat(c, startX, startY, tileW, tileH, n) {
  const vHeat = state.analysis.vHeat, hHeat = state.analysis.hHeat;
  const line = Math.max(2, Math.min(8, tileW / 28));
  for (let row = 0; row < n; row++) for (let col = 1; col < n; col++) {
    const x = startX + col * tileW;
    for (let j = 0; j < vHeat.length; j++) {
      const v = vHeat[j]; if (v < 4) continue;
      c.fillStyle = `rgba(255, ${Math.round(220 - Math.min(1, v / 120) * 145)}, 54, ${(.15 + Math.min(.78, v / 140)).toFixed(2)})`;
      c.fillRect(x - line / 2, startY + (row + j / vHeat.length) * tileH, line, Math.ceil(tileH / vHeat.length) + 1);
    }
  }
  for (let row = 1; row < n; row++) for (let col = 0; col < n; col++) {
    const y = startY + row * tileH;
    for (let j = 0; j < hHeat.length; j++) {
      const v = hHeat[j]; if (v < 4) continue;
      c.fillStyle = `rgba(255, ${Math.round(220 - Math.min(1, v / 120) * 145)}, 54, ${(.15 + Math.min(.78, v / 140)).toFixed(2)})`;
      c.fillRect(startX + (col + j / hHeat.length) * tileW, y - line / 2, Math.ceil(tileW / hHeat.length) + 1, line);
    }
  }
}
function drawGuides(c, x, y, w, h, n) {
  c.save(); c.strokeStyle = '#94bdf5'; c.globalAlpha = .65; c.setLineDash([5, 5]); c.lineWidth = 1;
  c.beginPath();
  for (let i = 1; i < n; i++) { c.moveTo(x + i * w, y); c.lineTo(x + i * w, y + n * h); c.moveTo(x, y + i * h); c.lineTo(x + n * w, y + i * h); }
  c.stroke(); c.restore();
}
function draw() {
  const source = state.source; if (!source) return;
  const b = ui.viewer.getBoundingClientRect(); const w = Math.max(1, b.width), h = Math.max(1, b.height);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  ui.canvas.width = Math.round(w * dpr); ui.canvas.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.imageSmoothingEnabled = true;
  checker(ctx, w, h);
  const isSingle = state.mode === 'original' || state.mode === 'offset';
  const n = isSingle ? 1 : state.repeat;
  const pad = Math.min(56, w * .09, h * .09);
  const factor = Math.min((w - pad * 2) / (n * source.width), (h - pad * 2) / (n * source.height));
  const tileW = source.width * factor * state.zoom, tileH = source.height * factor * state.zoom;
  const startX = (w - n * tileW) / 2, startY = (h - n * tileH) / 2;
  const src = state.mode === 'offset' ? makeWrapped(source, state.offsetX, state.offsetY) : source;
  for (let row = 0; row < n; row++) for (let col = 0; col < n; col++) {
    const x = startX + col * tileW, y = startY + row * tileH;
    drawMirrored(ctx, src, x, y, tileW + .35, tileH + .35,
      state.mode === 'mirror' && col % 2 === 1, state.mode === 'mirror' && row % 2 === 1);
  }
  if (state.mode === 'seams') addHeat(ctx, startX, startY, tileW, tileH, n);
  if (state.guides && !isSingle) drawGuides(ctx, startX, startY, tileW, tileH, n);
  if (state.mode === 'offset') {
    ctx.save(); ctx.strokeStyle = '#94bdf5'; ctx.lineWidth = 1; ctx.globalAlpha = .65; ctx.setLineDash([6, 6]);
    ctx.strokeRect(startX + .5, startY + .5, tileW - 1, tileH - 1); ctx.restore();
  }
}
function setMode(mode) {
  if (!modes[mode]) return;
  state.mode = mode;
  for (const tab of document.querySelectorAll('[data-mode]')) {
    const active = tab.dataset.mode === mode;
    tab.classList.toggle('active', active); tab.setAttribute('aria-selected', String(active)); tab.tabIndex = active ? 0 : -1;
  }
  ui.modeCaption.textContent = modes[mode].caption;
  ui.previewTitle.textContent = modes[mode].title;
  ui.viewHint.textContent = modes[mode].hint;
  ui.offsetControls.hidden = mode !== 'offset';
  ui.repeatControl.hidden = mode === 'original' || mode === 'offset';
  ui.viewerLabel.textContent = mode === 'original' ? 'SOURCE / UNMODIFIED' : mode === 'offset'
    ? `${Math.round(state.offsetX * 100)}% X / ${Math.round(state.offsetY * 100)}% Y OFFSET`
    : `${state.repeat} × ${state.repeat} / ${mode === 'mirror' ? 'MIRRORED' : mode === 'seams' ? 'SEAM MAP' : 'NORMAL REPEAT'}`;
  schedule();
}
async function savePng(canvas, filename) {
  if (!canvas) return notify('No texture loaded.', true);
  canvas.toBlob((blob) => {
    if (!blob) return notify('Could not generate PNG.', true);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    notify(`Saved ${filename}`);
  }, 'image/png');
}
ui.chooseBtn.addEventListener('click', () => ui.input.click());
ui.input.addEventListener('change', async () => { await loadFile(ui.input.files?.[0]); ui.input.value = ''; });
ui.sampleBtn.addEventListener('click', () => { installSource(makeDemo(), 'Concrete / sample', 'demo texture'); notify('Demo texture restored.'); });
ui.repeat.addEventListener('input', () => { state.repeat = Number(ui.repeat.value); ui.repeatValue.textContent = `${state.repeat} × ${state.repeat}`; setMode(state.mode); });
ui.zoom.addEventListener('input', () => { state.zoom = Number(ui.zoom.value) / 100; ui.zoomValue.textContent = `${ui.zoom.value}%`; schedule(); });
for (const axis of ['X', 'Y']) ui[`offset${axis}`].addEventListener('input', () => {
  state[`offset${axis}`] = Number(ui[`offset${axis}`].value) / 100;
  ui[`offset${axis}Value`].textContent = `${ui[`offset${axis}`].value}%`;
  setMode(state.mode);
});
ui.guide.addEventListener('change', () => { state.guides = ui.guide.checked; schedule(); });
ui.fitBtn.addEventListener('click', () => { state.zoom = 1; ui.zoom.value = '100'; ui.zoomValue.textContent = '100%'; schedule(); });
for (const tab of document.querySelectorAll('[data-mode]')) tab.addEventListener('click', () => setMode(tab.dataset.mode));
ui.exportPreview.addEventListener('click', () => savePng(ui.canvas, `${sanitized(state.name)}-${state.mode}-preview.png`));
ui.exportOffset.addEventListener('click', () => savePng(makeWrapped(state.source, state.offsetX, state.offsetY), `${sanitized(state.name)}-offset.png`));
let dragDepth = 0;
document.addEventListener('dragenter', (event) => { if (!event.dataTransfer?.types.includes('Files')) return; event.preventDefault(); dragDepth++; ui.dropOverlay.hidden = false; ui.uploadZone.classList.add('is-dragging'); });
document.addEventListener('dragover', (event) => { if (event.dataTransfer?.types.includes('Files')) event.preventDefault(); });
document.addEventListener('dragleave', () => { dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) { ui.dropOverlay.hidden = true; ui.uploadZone.classList.remove('is-dragging'); } });
document.addEventListener('drop', async (event) => {
  event.preventDefault(); dragDepth = 0; ui.dropOverlay.hidden = true; ui.uploadZone.classList.remove('is-dragging');
  await loadFile(event.dataTransfer?.files?.[0]);
});
window.addEventListener('resize', schedule);
new ResizeObserver(schedule).observe(ui.viewer);
$('year').textContent = String(new Date().getFullYear());
installSource(makeDemo(), 'Concrete / sample', 'demo texture');
setMode('tile');
