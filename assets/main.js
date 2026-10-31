/* TILECHECK — dependency-free, fully client-side texture inspector. */
const $ = (id) => document.getElementById(id);
const ui = {
  canvas: $('previewCanvas'), viewer: $('viewer'), input: $('fileInput'),
  sidebar: document.querySelector('.sidebar'),
  chooseBtn: $('viewerChooseBtn'), dropOverlay: $('dropOverlay'),
  fileName: $('fileName'), fileDetails: $('fileDetails'), sampleBtn: $('sampleBtn'),
  repeat: $('repeatRange'), repeatValue: $('repeatValue'),
  zoom: $('zoomRange'), zoomValue: $('zoomValue'),
  repeatControl: $('repeatControl'), sourceCanvas: $('sourceCanvas'), sourceFrame: $('sourceFrame'),
  guide: $('guideToggle'), previewTitle: $('previewTitle'),
  exportPreview: $('exportPreview'),
  toast: $('toast'),
};
const modes = {
  tile: { title: 'Repeat pattern' },
  mirror: { title: 'Mirrored repeat' },
  seams: { title: 'Edge difference map' },
};
const state = {
  mode: 'tile', repeat: 3, zoom: 1, guides: false,
  source: null, name: 'texture',
  analysis: { vertical: 0, horizontal: 0, vHeat: [], hHeat: [] },
};
let raf = 0;
let toastTimer = 0;
const ctx = ui.canvas.getContext('2d', { alpha: false });
if (!ctx) throw new Error('Canvas 2D is unavailable');
const sourceCtx = ui.sourceCanvas.getContext('2d', { alpha: false });
if (!sourceCtx) throw new Error('Source Canvas 2D is unavailable');

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
function setInspectorEnabled(enabled) {
  const disabled = !enabled;
  ui.sidebar.classList.toggle('is-empty', disabled);
  for (const tab of document.querySelectorAll('[data-mode]')) {
    tab.disabled = disabled;
  }
  ui.repeat.disabled = disabled;
  ui.zoom.disabled = disabled;
  ui.guide.disabled = disabled;
  ui.sampleBtn.disabled = disabled;
  ui.exportPreview.disabled = disabled;
}
function installSource(canvas, name, sizeText = '') {
  state.source = canvas; state.name = name; state.analysis = analyze(canvas);
  ui.fileName.textContent = name;
  ui.fileName.title = name;
  ui.fileDetails.textContent = `${canvas.width} × ${canvas.height}${sizeText ? `, ${sizeText}` : ''}`;
  ui.viewer.classList.remove('is-empty');
  ui.sourceFrame.classList.remove('is-empty');
  setInspectorEnabled(true);
  schedule();
}
function clearSource() {
  state.source = null;
  state.name = 'texture';
  state.analysis = { vertical: 0, horizontal: 0, vHeat: [], hHeat: [] };
  state.repeat = 3;
  state.zoom = 1;
  state.guides = false;
  ui.repeat.value = '3';
  ui.repeatValue.textContent = '3 × 3';
  ui.zoom.value = '100';
  ui.zoomValue.textContent = '100%';
  ui.guide.checked = false;
  ui.fileName.textContent = 'No image selected';
  ui.fileName.title = '';
  ui.fileDetails.textContent = '';
  ui.input.value = '';
  ui.viewer.classList.add('is-empty');
  ui.sourceFrame.classList.add('is-empty');
  setMode('tile');
  setInspectorEnabled(false);
}

async function loadFile(file) {
  if (!file) return;
  const accepted = ['image/png', 'image/jpeg', 'image/webp', 'image/avif'];
  if (!accepted.includes(file.type)) return notify('Use a PNG, JPG, WebP or AVIF image', true);
  if (file.size > 25 * 1024 * 1024) return notify('Image exceeds 25 MB. Choose a smaller file', true);
  try {
    const bitmap = await createImageBitmap(file);
    if (bitmap.width * bitmap.height > 24_000_000 || !bitmap.width || !bitmap.height) {
      bitmap.close(); return notify('Image is too large. Limit: 24 megapixels', true);
    }
    const cv = document.createElement('canvas'); cv.width = bitmap.width; cv.height = bitmap.height;
    cv.getContext('2d').drawImage(bitmap, 0, 0); bitmap.close();
    const name = file.name?.trim() || 'Pasted image';
    installSource(cv, name, byteSize(file.size));
    notify(`Loaded ${name}`);
  } catch (error) {
    console.error(error); notify('Unable to decode that image', true);
  }
}

// Use an even number of full cells in each direction, avoiding clipped edge tiles.
function checker(c, w, h, targetCell = 21) {
  c.fillStyle = '#292638';
  c.fillRect(0, 0, w, h);
  const columns = Math.max(2, Math.round(w / (targetCell * 2)) * 2);
  const rows = Math.max(2, Math.round(h / (targetCell * 2)) * 2);
  const tileW = w / columns, tileH = h / rows;
  c.fillStyle = '#363149';
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      if ((row + col) % 2 === 0) {
        c.fillRect(col * tileW, row * tileH, tileW + 0.5, tileH + 0.5);
      }
    }
  }
}

// The CSS checkerboards also need whole cells at every viewport size.
// A conic-gradient period contains two columns and two rows.
function fitCheckerboard(element, targetCell) {
  const width = element.clientWidth, height = element.clientHeight;
  if (width <= 0 || height <= 0) return;
  const pairsX = Math.max(1, Math.round(width / (2 * targetCell)));
  const pairsY = Math.max(1, Math.round(height / (2 * targetCell)));
  element.style.setProperty('--checker-period-x', `${100 / pairsX}%`);
  element.style.setProperty('--checker-period-y', `${100 / pairsY}%`);
}
function syncCheckerboards() {
  fitCheckerboard(ui.viewer, 21);
  fitCheckerboard(ui.sourceFrame, 14);
}
function drawSource() {
  const source = state.source; if (!source) return;
  const bounds = ui.sourceCanvas.getBoundingClientRect();
  if (bounds.width <= 0 || bounds.height <= 0) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const width = Math.max(1, Math.round(bounds.width * dpr));
  const height = Math.max(1, Math.round(bounds.height * dpr));
  ui.sourceCanvas.width = width;
  ui.sourceCanvas.height = height;
  // Work in device pixels to avoid a thin checkerboard seam from fractional CSS sizing.
  sourceCtx.setTransform(1, 0, 0, 1, 0, 0);
  sourceCtx.imageSmoothingEnabled = true;
  checker(sourceCtx, width, height, 14 * dpr);
  if (source.width === source.height) {
    sourceCtx.drawImage(source, 0, 0, width, height);
  } else {
    const scale = Math.min(width / source.width, height / source.height);
    const imageWidth = source.width * scale, imageHeight = source.height * scale;
    sourceCtx.drawImage(source, (width - imageWidth) / 2, (height - imageHeight) / 2, imageWidth, imageHeight);
  }
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
      c.fillStyle = `rgba(255, ${Math.round(110 - Math.min(1, v / 120) * 55)}, 185, ${(.15 + Math.min(.78, v / 140)).toFixed(2)})`;
      c.fillRect(x - line / 2, startY + (row + j / vHeat.length) * tileH, line, Math.ceil(tileH / vHeat.length) + 1);
    }
  }
  for (let row = 1; row < n; row++) for (let col = 0; col < n; col++) {
    const y = startY + row * tileH;
    for (let j = 0; j < hHeat.length; j++) {
      const v = hHeat[j]; if (v < 4) continue;
      c.fillStyle = `rgba(255, ${Math.round(110 - Math.min(1, v / 120) * 55)}, 185, ${(.15 + Math.min(.78, v / 140)).toFixed(2)})`;
      c.fillRect(startX + (col + j / hHeat.length) * tileW, y - line / 2, Math.ceil(tileW / hHeat.length) + 1, line);
    }
  }
}
function drawGuides(c, x, y, w, h, n) {
  c.save(); c.strokeStyle = '#a596ff'; c.globalAlpha = .65; c.setLineDash([5, 5]); c.lineWidth = 1;
  c.beginPath();
  for (let i = 1; i < n; i++) { c.moveTo(x + i * w, y); c.lineTo(x + i * w, y + n * h); c.moveTo(x, y + i * h); c.lineTo(x + n * w, y + i * h); }
  c.stroke(); c.restore();
}
function draw() {
  const source = state.source; if (!source) return;
  drawSource();
  const b = ui.viewer.getBoundingClientRect(); const w = Math.max(1, b.width), h = Math.max(1, b.height);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  ui.canvas.width = Math.round(w * dpr); ui.canvas.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.imageSmoothingEnabled = true;
  checker(ctx, w, h);
  const n = state.repeat;
  const pad = Math.min(56, w * .09, h * .09);
  const factor = Math.min((w - pad * 2) / (n * source.width), (h - pad * 2) / (n * source.height));
  const tileW = source.width * factor * state.zoom, tileH = source.height * factor * state.zoom;
  const startX = (w - n * tileW) / 2, startY = (h - n * tileH) / 2;
  for (let row = 0; row < n; row++) for (let col = 0; col < n; col++) {
    const x = startX + col * tileW, y = startY + row * tileH;
    drawMirrored(ctx, source, x, y, tileW + .35, tileH + .35,
      state.mode === 'mirror' && col % 2 === 1, state.mode === 'mirror' && row % 2 === 1);
  }
  if (state.mode === 'seams') addHeat(ctx, startX, startY, tileW, tileH, n);
  if (state.guides) drawGuides(ctx, startX, startY, tileW, tileH, n);
}
// Export a real image rather than the checkerboard-backed viewport canvas.
function createExportCanvas() {
  const source = state.source;
  if (!source) return null;
  const n = state.repeat;
  const nativeW = source.width * n, nativeH = source.height * n;
  // Keep the original pixel resolution unless the repeat grid is too large.
  const maxPixels = 24_000_000, maxSide = 8192;
  const scale = Math.min(1, maxSide / nativeW, maxSide / nativeH,
    Math.sqrt(maxPixels / (nativeW * nativeH)));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(n, Math.round(nativeW * scale));
  canvas.height = Math.max(n, Math.round(nativeH * scale));
  const c = canvas.getContext('2d', { alpha: true });
  if (!c) return null;
  c.imageSmoothingEnabled = true;
  const tileW = canvas.width / n, tileH = canvas.height / n;
  for (let row = 0; row < n; row++) for (let col = 0; col < n; col++) {
    drawMirrored(c, source, col * tileW, row * tileH, tileW, tileH,
      state.mode === 'mirror' && col % 2 === 1, state.mode === 'mirror' && row % 2 === 1);
  }
  if (state.mode === 'seams') addHeat(c, 0, 0, tileW, tileH, n);
  return canvas;
}

function setMode(mode) {
  if (!modes[mode]) return;
  state.mode = mode;
  for (const tab of document.querySelectorAll('[data-mode]')) {
    const active = tab.dataset.mode === mode;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
  }
  ui.previewTitle.textContent = modes[mode].title;
  schedule();
}
async function savePng(canvas, filename) {
  if (!canvas) return notify('No texture loaded', true);
  canvas.toBlob((blob) => {
    if (!blob) return notify('Could not generate PNG', true);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    notify(`Saved ${filename}`);
  }, 'image/png');
}
ui.chooseBtn.addEventListener('click', (event) => { event.stopPropagation(); ui.input.click(); });
ui.viewer.addEventListener('click', () => ui.input.click());
ui.input.addEventListener('change', async () => { await loadFile(ui.input.files?.[0]); ui.input.value = ''; });
document.addEventListener('paste', (event) => {
  if (event.defaultPrevented) return;
  const target = event.target;
  if (target instanceof Element && target.closest('textarea, input[type="text"], input[type="search"], [contenteditable="true"]')) return;
  const items = Array.from(event.clipboardData?.items ?? []);
  const imageItem = items.find((item) => item.kind === 'file' && item.type.startsWith('image/'));
  const file = imageItem?.getAsFile() ?? Array.from(event.clipboardData?.files ?? []).find((candidate) => candidate.type.startsWith('image/'));
  if (!file) return;
  event.preventDefault();
  void loadFile(file);
});
ui.sampleBtn.addEventListener('click', () => { clearSource(); notify('Image cleared'); });
ui.repeat.addEventListener('input', () => { state.repeat = Number(ui.repeat.value); ui.repeatValue.textContent = `${state.repeat} × ${state.repeat}`; setMode(state.mode); });
ui.zoom.addEventListener('input', () => { state.zoom = Number(ui.zoom.value) / 100; ui.zoomValue.textContent = `${ui.zoom.value}%`; schedule(); });
ui.guide.addEventListener('change', () => { state.guides = ui.guide.checked; schedule(); });
for (const tab of document.querySelectorAll('[data-mode]')) {
  tab.addEventListener('click', () => {
    if (state.source) setMode(tab.dataset.mode);
  });
}
ui.exportPreview.addEventListener('click', () => savePng(createExportCanvas(), `${sanitized(state.name)}-${state.mode}-preview.png`));
let dragDepth = 0;
document.addEventListener('dragenter', (event) => { if (!event.dataTransfer?.types.includes('Files')) return; event.preventDefault(); dragDepth++; ui.dropOverlay.hidden = false; ui.viewer.classList.add('is-dragging'); });
document.addEventListener('dragover', (event) => { if (event.dataTransfer?.types.includes('Files')) event.preventDefault(); });
document.addEventListener('dragleave', () => { dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) { ui.dropOverlay.hidden = true; ui.viewer.classList.remove('is-dragging'); } });
document.addEventListener('drop', async (event) => {
  event.preventDefault(); dragDepth = 0; ui.dropOverlay.hidden = true; ui.viewer.classList.remove('is-dragging');
  await loadFile(event.dataTransfer?.files?.[0]);
});
window.addEventListener('resize', () => { syncCheckerboards(); schedule(); });
const checkerResizeObserver = new ResizeObserver(() => {
  syncCheckerboards();
  schedule();
});
checkerResizeObserver.observe(ui.viewer);
checkerResizeObserver.observe(ui.sourceFrame);
new ResizeObserver(schedule).observe(ui.sourceCanvas);
$('year').textContent = String(new Date().getFullYear());
syncCheckerboards();
clearSource();
