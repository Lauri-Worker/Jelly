import { db as localDb } from './db.js';
import { cloud, auth, cloudConfigured } from './cloud.js';

/** Aktiver Speicher: lokal (IndexedDB) oder Cloud (Supabase, nach Anmeldung). */
let db = localDb;

/* =====================================================================
   Konstanten
   ===================================================================== */
const PAGE_W = 794, PAGE_H = 1123; // A4 bei 96 dpi
const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
const PAPERS = [['blank', 'Blanko'], ['lined', 'Liniert'], ['grid', 'Kariert'], ['dots', 'Gepunktet'], ['cornell', 'Cornell']];
const PAPER_COLORS = { white: ['#ffffff', 'Weiß'], cream: ['#fbf5e6', 'Creme'], dark: ['#26272b', 'Dunkel'] };
const COVERS = ['#d9534f', '#ef8a3c', '#e9c046', '#4fae6a', '#3a9bd1', '#5b62c9', '#9b59c9', '#3b3d45'];
const PEN_COLORS = ['#1d1d1f', '#1f5fbf', '#d0312d', '#1e9e5a', '#ef7d22', '#8e44ad'];
const HL_COLORS = ['#ffe34d', '#8be38f', '#80cbff', '#ff9ecf', '#ffb352'];
const WIDTHS = { pen: [1.2, 2.2, 4], highlighter: [8, 14, 24], eraser: [8, 18, 36], shape: [1.2, 2.2, 4] };
const TEXT_SIZES = [14, 20, 30];
const SHAPES = [['line', 'Linie'], ['arrow', 'Pfeil'], ['rect', 'Rechteck'], ['ellipse', 'Ellipse']];
const JSPDF_URL = 'vendor/jspdf.umd.min.js';
const PDFJS_URL = 'vendor/pdf.min.js';
const PDFJS_WORKER = 'vendor/pdf.worker.min.js';

const ICONS = {
  back: '<path d="M15 18l-6-6 6-6"/>',
  pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  highlighter: '<path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/>',
  eraser: '<path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/>',
  lasso: '<path d="M7 22a5 5 0 0 1-2-4"/><path d="M3.3 14A6.8 6.8 0 0 1 2 10c0-4.4 4.5-8 10-8s10 3.6 10 8-4.5 8-10 8a12 12 0 0 1-5-1"/><path d="M5 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/>',
  text: '<path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/>',
  shapes: '<rect x="3" y="3" width="10" height="10" rx="1"/><circle cx="16" cy="16" r="5"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
  undo: '<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>',
  redo: '<path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/>',
  sidebar: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  share: '<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="m16 6-4-4-4 4"/><path d="M12 2v13"/>',
  page: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 15h6"/>',
  more: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  upload: '<path d="M4 14v6h16v-6"/><path d="M12 3v12"/><path d="m7 8 5-5 5 5"/>',
  download: '<path d="M4 14v6h16v-6"/><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  up: '<path d="m18 15-6-6-6 6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  grid: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>',
  hand: '<path d="M18 11V6a2 2 0 0 0-4 0v5"/><path d="M14 10V4a2 2 0 0 0-4 0v6"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-6-2.4l-3.6-3.6a2 2 0 0 1 2.8-2.8L7 15"/>',
  line: '<path d="M5 19 19 5"/>',
  arrow: '<path d="M5 19 19 5"/><path d="M10 5h9v9"/>',
  rect: '<rect x="4" y="6" width="16" height="12" rx="1"/>',
  ellipse: '<ellipse cx="12" cy="12" rx="9" ry="6.5"/>',
};
const icon = (n) => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[n] || ''}</svg>`;

/* =====================================================================
   Hilfsfunktionen
   ===================================================================== */
const $ = (s, r = document) => r.querySelector(s);
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const r1 = (v) => Math.round(v * 10) / 10;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clone = (o) => JSON.parse(JSON.stringify(o));
const dateFmt = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' });

function toast(msg, ms = 2200) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  if (ms) toast._t = setTimeout(() => t.classList.remove('show'), ms);
}

/** Eigener Dialog statt confirm/prompt/alert (funktioniert auch in eingebetteten Ansichten). */
function ask({ title, message = '', input = null, ok = 'OK', cancel = 'Abbrechen', danger = false }) {
  return new Promise((resolve) => {
    const dlg = document.createElement('dialog');
    dlg.innerHTML = `<form method="dialog" class="dlg">
      <h2>${esc(title)}</h2>
      ${message ? `<p class="dlg-msg">${esc(message)}</p>` : ''}
      ${input !== null ? '<input id="ask-input" class="dlg-input" maxlength="80">' : ''}
      <div class="dlg-actions">
        ${cancel ? `<button class="btn ghost" value="cancel" formnovalidate>${esc(cancel)}</button>` : ''}
        <button class="btn ${danger ? 'danger' : 'primary'}" value="ok">${esc(ok)}</button>
      </div></form>`;
    document.body.appendChild(dlg);
    const inp = dlg.querySelector('input');
    if (inp) inp.value = input;
    dlg.addEventListener('close', () => {
      const v = dlg.returnValue === 'ok' ? (inp ? inp.value : true) : (inp ? null : false);
      dlg.remove();
      resolve(v);
    });
    dlg.showModal();
    if (inp) { inp.focus(); inp.select(); }
  });
}

const scripts = {};
function loadScript(src) {
  if (!scripts[src]) {
    scripts[src] = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src; s.onload = res;
      s.onerror = () => { delete scripts[src]; rej(new Error('Konnte ' + src + ' nicht laden')); };
      document.head.appendChild(s);
    });
  }
  return scripts[src];
}

function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
const safeName = (s) => (s || 'Notizbuch').replace(/[\\/:*?"<>|]+/g, '_').trim() || 'Notizbuch';

function loadImg(src) {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
}
function readAsDataURL(file) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
}
async function fileToScaledDataURL(file, max = 1800) {
  const src = await readAsDataURL(file);
  const img = await loadImg(src);
  const f = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  if (f === 1 && file.size < 1.5e6) return { src, w: img.naturalWidth, h: img.naturalHeight };
  const c = document.createElement('canvas');
  c.width = Math.round(img.naturalWidth * f); c.height = Math.round(img.naturalHeight * f);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  const png = /png|gif|webp|svg/.test(file.type);
  return { src: c.toDataURL(png ? 'image/png' : 'image/jpeg', 0.9), w: c.width, h: c.height };
}

/* =====================================================================
   Einstellungen (lokal)
   ===================================================================== */
const PREFS_KEY = 'jelly.prefs.v1';
const DEFAULT_PREFS = {
  tool: 'pen',
  penOnly: false,
  sidebar: true,
  tools: {
    pen: { color: PEN_COLORS[0], width: 2.2 },
    highlighter: { color: HL_COLORS[0], width: 14 },
    eraser: { width: 18 },
    shape: { color: PEN_COLORS[0], width: 2.2, kind: 'rect' },
    text: { color: PEN_COLORS[0], size: 20 },
  },
};
function loadPrefs() {
  const p = clone(DEFAULT_PREFS);
  try {
    const s = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
    Object.assign(p, { ...s, tools: p.tools });
    for (const k in p.tools) Object.assign(p.tools[k], s.tools?.[k] || {});
  } catch { /* ignorieren */ }
  return p;
}
function savePrefs() {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({
      tool: state.tool, penOnly: state.penOnly, sidebar: state.sidebar, tools: state.tools,
    }));
  } catch { /* ignorieren */ }
}

/* =====================================================================
   Zustand
   ===================================================================== */
const prefs = loadPrefs();
const state = {
  nb: null,
  tool: ['pen', 'highlighter', 'eraser', 'lasso', 'shape', 'text'].includes(prefs.tool) ? prefs.tool : 'pen',
  tools: prefs.tools,
  penOnly: prefs.penOnly,
  sidebar: prefs.sidebar,
  zoom: 1,
  fit: true,
  cur: 0,
  history: [],
  future: [],
  selection: null,
  savedAssets: new Set(),
};
let clipboard = null;

/* =====================================================================
   Datenmodell
   ===================================================================== */
function newPage(tpl = {}) {
  const landscape = tpl.landscape ?? (tpl.w > tpl.h);
  return {
    id: uid(),
    w: landscape ? PAGE_H : PAGE_W,
    h: landscape ? PAGE_W : PAGE_H,
    paper: tpl.paper || 'blank',
    color: tpl.color || 'white',
    strokes: [],
    items: [],
  };
}
function newNotebook({ title, cover = COVERS[4], paper = 'lined', color = 'white', landscape = false } = {}) {
  const now = Date.now();
  return {
    id: uid(), title: title || 'Unbenanntes Notizbuch', cover, createdAt: now, updatedAt: now,
    assets: {}, pages: [newPage({ paper, color, landscape })],
  };
}
const findPage = (id) => state.nb?.pages.find((p) => p.id === id);
const pageIndex = (id) => state.nb.pages.findIndex((p) => p.id === id);
const isNarrow = () => window.innerWidth < 720;
const currentPage = () => state.nb.pages[clamp(state.cur, 0, state.nb.pages.length - 1)];

/* =====================================================================
   Bilder-Cache (Assets)
   ===================================================================== */
const imgCache = new Map(); // "nbId:assetKey" -> { img, ready }
function imgEntry(key, nb = state.nb) {
  if (!nb?.assets[key]) return null;
  const ck = nb.id + ':' + key;
  let e = imgCache.get(ck);
  if (!e) {
    const img = new Image();
    e = { img, ready: false };
    imgCache.set(ck, e);
    img.onload = () => {
      e.ready = true;
      if (nb === state.nb) { renderAllVisible(); queueAllThumbs(); }
    };
    img.src = nb.assets[key];
  }
  return e;
}
function getImg(key, nb = state.nb) {
  const e = imgEntry(key, nb);
  return e && e.ready ? e.img : null;
}
function pageAssetKeys(page) {
  const keys = [];
  if (page.bg) keys.push(page.bg);
  for (const it of page.items) if (it.type === 'image') keys.push(it.asset);
  return keys;
}
function preloadPage(page, nb = state.nb) {
  return Promise.all(pageAssetKeys(page).map((k) => new Promise((res) => {
    const e = imgEntry(k, nb);
    if (!e || e.ready) return res();
    e.img.addEventListener('load', res, { once: true });
    e.img.addEventListener('error', res, { once: true });
  })));
}

/* =====================================================================
   Zeichnen
   ===================================================================== */
function drawPaper(ctx, page, nb = state.nb) {
  const { w, h } = page;
  const dark = page.color === 'dark';
  ctx.fillStyle = (PAPER_COLORS[page.color] || PAPER_COLORS.white)[0];
  ctx.fillRect(0, 0, w, h);
  if (page.bg) {
    const img = getImg(page.bg, nb);
    if (img) ctx.drawImage(img, 0, 0, w, h);
  }
  const line = dark ? 'rgba(255,255,255,.16)' : 'rgba(70,120,190,.28)';
  const margin = dark ? 'rgba(255,120,120,.35)' : 'rgba(220,70,70,.38)';
  ctx.save();
  ctx.lineWidth = 1;
  const hl = (y, x0 = 0, x1 = w) => { ctx.beginPath(); ctx.moveTo(x0, y + .5); ctx.lineTo(x1, y + .5); ctx.stroke(); };
  const vl = (x, y0 = 0, y1 = h) => { ctx.beginPath(); ctx.moveTo(x + .5, y0); ctx.lineTo(x + .5, y1); ctx.stroke(); };
  switch (page.paper) {
    case 'lined':
      ctx.strokeStyle = line;
      for (let y = 100; y < h - 30; y += 32) hl(y);
      ctx.strokeStyle = margin;
      vl(76);
      break;
    case 'grid': {
      ctx.strokeStyle = line;
      ctx.lineWidth = .8;
      const s = 24, ox = (w % s) / 2, oy = (h % s) / 2;
      for (let x = ox; x <= w; x += s) vl(x);
      for (let y = oy; y <= h; y += s) hl(y);
      break;
    }
    case 'dots': {
      ctx.fillStyle = dark ? 'rgba(255,255,255,.3)' : 'rgba(60,70,90,.35)';
      const s = 24, ox = (w % s) / 2, oy = (h % s) / 2;
      for (let x = ox + s; x < w; x += s) for (let y = oy + s; y < h; y += s) {
        ctx.beginPath(); ctx.arc(x, y, 1.3, 0, Math.PI * 2); ctx.fill();
      }
      break;
    }
    case 'cornell': {
      const top = 110, bottom = h - 220, cue = Math.round(w * 0.27);
      ctx.strokeStyle = line;
      for (let y = top + 32; y < bottom; y += 32) hl(y, cue);
      for (let y = bottom + 40; y < h - 20; y += 32) hl(y);
      ctx.strokeStyle = margin;
      ctx.lineWidth = 1.5;
      hl(top); hl(bottom); vl(cue, top, bottom);
      break;
    }
  }
  ctx.restore();
}

const pf = (p) => 0.35 + p * 1.3; // Druck -> Breitenfaktor (0.5 => 1.0)

function tracePath(ctx, P) {
  ctx.beginPath();
  ctx.moveTo(P[0][0], P[0][1]);
  if (P.length < 3) { for (let i = 1; i < P.length; i++) ctx.lineTo(P[i][0], P[i][1]); return; }
  for (let i = 1; i < P.length - 1; i++) {
    ctx.quadraticCurveTo(P[i][0], P[i][1], (P[i][0] + P[i + 1][0]) / 2, (P[i][1] + P[i + 1][1]) / 2);
  }
  const L = P[P.length - 1];
  ctx.lineTo(L[0], L[1]);
}

function drawStroke(ctx, s, dark = false) {
  const P = s.points, n = P.length;
  if (!n) return;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = s.color;
  ctx.fillStyle = s.color;
  if (s.tool === 'highlighter') {
    ctx.globalAlpha = dark ? 0.5 : 0.42;
    if (!dark) ctx.globalCompositeOperation = 'multiply';
    ctx.lineWidth = s.width;
    if (n === 1) { ctx.beginPath(); ctx.arc(P[0][0], P[0][1], s.width / 2, 0, Math.PI * 2); ctx.fill(); }
    else { tracePath(ctx, P); ctx.stroke(); }
  } else if (s.straight) {
    ctx.lineWidth = s.width;
    ctx.beginPath();
    ctx.moveTo(P[0][0], P[0][1]);
    for (let i = 1; i < n; i++) ctx.lineTo(P[i][0], P[i][1]);
    ctx.stroke();
  } else if (n === 1) {
    ctx.beginPath(); ctx.arc(P[0][0], P[0][1], (s.width * pf(P[0][2])) / 2, 0, Math.PI * 2); ctx.fill();
  } else if (n < 3 || P.every((p) => p[2] === P[0][2])) {
    ctx.lineWidth = s.width * pf(P[0][2]);
    tracePath(ctx, P);
    ctx.stroke();
  } else {
    // Variable Strichstärke (Drucksensitivität)
    let px = P[0][0], py = P[0][1];
    for (let i = 1; i < n - 1; i++) {
      const mx = (P[i][0] + P[i + 1][0]) / 2, my = (P[i][1] + P[i + 1][1]) / 2;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.quadraticCurveTo(P[i][0], P[i][1], mx, my);
      ctx.lineWidth = s.width * pf(P[i][2]);
      ctx.stroke();
      px = mx; py = my;
    }
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(P[n - 1][0], P[n - 1][1]);
    ctx.lineWidth = s.width * pf(P[n - 1][2]);
    ctx.stroke();
  }
  ctx.restore();
}

function drawItem(ctx, it, nb, dark) {
  if (it.type === 'image') {
    const img = getImg(it.asset, nb);
    if (img) ctx.drawImage(img, it.x, it.y, it.w, it.h);
    else {
      ctx.save(); ctx.fillStyle = 'rgba(127,127,127,.15)'; ctx.fillRect(it.x, it.y, it.w, it.h); ctx.restore();
    }
  } else if (it.type === 'text') {
    ctx.save();
    ctx.fillStyle = dark && it.color === PEN_COLORS[0] ? '#f2f2f2' : it.color;
    ctx.font = `${it.size}px ${FONT}`;
    ctx.textBaseline = 'top';
    const lh = it.size * 1.25;
    // Kleiner Offset gleicht die Baseline-Unterschiede zur Textarea aus
    const off = (lh - it.size) / 2;
    it.text.split('\n').forEach((line, i) => ctx.fillText(line, it.x, it.y + off + i * lh));
    ctx.restore();
  }
}

function renderPage(ctx, page, opt = {}) {
  const nb = opt.nb || state.nb;
  const dark = page.color === 'dark';
  drawPaper(ctx, page, nb);
  for (const it of page.items) if (it.type === 'image' && it.id !== opt.skip) drawItem(ctx, it, nb, dark);
  for (const s of page.strokes) drawStroke(ctx, s, dark);
  for (const it of page.items) if (it.type === 'text' && it.id !== opt.skip) drawItem(ctx, it, nb, dark);
}

/* =====================================================================
   Geometrie / Treffertests
   ===================================================================== */
const bboxCache = new WeakMap();
function strokeBBox(s) {
  let b = bboxCache.get(s);
  if (!b) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of s.points) {
      if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0];
      if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1];
    }
    const pad = s.width;
    b = { x: x0 - pad / 2, y: y0 - pad / 2, w: x1 - x0 + pad, h: y1 - y0 + pad };
    bboxCache.set(s, b);
  }
  return b;
}
function distSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const l = dx * dx + dy * dy;
  let t = l ? ((px - ax) * dx + (py - ay) * dy) / l : 0;
  t = clamp(t, 0, 1);
  const x = ax + t * dx - px, y = ay + t * dy - py;
  return Math.sqrt(x * x + y * y);
}
function strokeHit(s, x, y, r) {
  const b = strokeBBox(s);
  if (x < b.x - r || x > b.x + b.w + r || y < b.y - r || y > b.y + b.h + r) return false;
  const P = s.points, lim = r + s.width / 2;
  if (P.length === 1) return Math.hypot(P[0][0] - x, P[0][1] - y) <= lim;
  for (let i = 1; i < P.length; i++) {
    if (distSeg(x, y, P[i - 1][0], P[i - 1][1], P[i][0], P[i][1]) <= lim) return true;
  }
  return false;
}
function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function itemAt(page, x, y, type) {
  for (let i = page.items.length - 1; i >= 0; i--) {
    const it = page.items[i];
    if (type && it.type !== type) continue;
    if (x >= it.x - 4 && x <= it.x + it.w + 4 && y >= it.y - 4 && y <= it.y + it.h + 4) return it;
  }
  return null;
}
const measureCtx = document.createElement('canvas').getContext('2d');
function measureText(it) {
  measureCtx.font = `${it.size}px ${FONT}`;
  const lines = it.text.split('\n');
  it.w = Math.max(10, ...lines.map((l) => measureCtx.measureText(l).width));
  it.h = lines.length * it.size * 1.25;
}
function shapePoints(kind, a, b) {
  const [x0, y0] = a, [x1, y1] = b;
  const p = (x, y) => [r1(x), r1(y), 0.5];
  switch (kind) {
    case 'line': return [p(x0, y0), p(x1, y1)];
    case 'arrow': {
      const ang = Math.atan2(y1 - y0, x1 - x0);
      const len = Math.min(26, Math.hypot(x1 - x0, y1 - y0) * 0.4);
      const h1 = p(x1 - len * Math.cos(ang - 0.45), y1 - len * Math.sin(ang - 0.45));
      const h2 = p(x1 - len * Math.cos(ang + 0.45), y1 - len * Math.sin(ang + 0.45));
      return [p(x0, y0), p(x1, y1), h1, p(x1, y1), h2];
    }
    case 'rect': return [p(x0, y0), p(x1, y0), p(x1, y1), p(x0, y1), p(x0, y0)];
    case 'ellipse': {
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rx = Math.abs(x1 - x0) / 2, ry = Math.abs(y1 - y0) / 2;
      const pts = [];
      for (let i = 0; i <= 64; i++) { const t = (i / 64) * Math.PI * 2; pts.push(p(cx + rx * Math.cos(t), cy + ry * Math.sin(t))); }
      return pts;
    }
  }
  return [p(x0, y0)];
}

/* =====================================================================
   Verlauf (Rückgängig / Wiederholen)
   ===================================================================== */
const snap = (page) => JSON.stringify({ s: page.strokes, i: page.items });
function restore(page, str) {
  const o = JSON.parse(str);
  page.strokes = o.s;
  page.items = o.i;
}
function commit(page, before) {
  if (snap(page) === before) return false;
  state.history.push({ pageId: page.id, before, after: snap(page) });
  if (state.history.length > 200) state.history.shift();
  state.future.length = 0;
  updateUndoButtons();
  markChanged(page);
  return true;
}
function undoRedo(from, to, key) {
  closeTextEditor();
  clearSelection();
  let h;
  while ((h = from.pop())) {
    const page = findPage(h.pageId);
    if (!page) continue;
    restore(page, h[key]);
    to.push(h);
    markChanged(page);
    const v = views.get(page.id);
    if (v) { scheduleRender(v); if (!v.visible) scrollToPage(pageIndex(page.id)); }
    break;
  }
  updateUndoButtons();
}
const undo = () => undoRedo(state.history, state.future, 'before');
const redo = () => undoRedo(state.future, state.history, 'after');
function updateUndoButtons() {
  $('#btn-undo').disabled = !state.history.length;
  $('#btn-redo').disabled = !state.future.length;
}

/* =====================================================================
   Speichern
   ===================================================================== */
let saveTimer = 0;
let savePromise = Promise.resolve();
function setSaveStatus(t) { $('#save-status').textContent = t; }
function scheduleSave() {
  setSaveStatus('Nicht gespeichert');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, db === cloud ? 1500 : 700);
}
async function makeThumb(nb, width = 260) {
  const page = nb.pages[0];
  await preloadPage(page, nb);
  const c = document.createElement('canvas');
  const f = width / page.w;
  c.width = width; c.height = Math.round(page.h * f);
  const ctx = c.getContext('2d');
  ctx.scale(f, f);
  renderPage(ctx, page, { nb });
  return c.toDataURL('image/jpeg', 0.8);
}
function metaOf(nb, thumb) {
  return { id: nb.id, title: nb.title, cover: nb.cover, createdAt: nb.createdAt, updatedAt: nb.updatedAt, pageCount: nb.pages.length, thumb };
}
function saveNow() {
  clearTimeout(saveTimer);
  saveTimer = 0;
  const nb = state.nb;
  if (!nb) return savePromise;
  savePromise = savePromise.then(async () => {
    nb.updatedAt = Date.now();
    const newKeys = Object.keys(nb.assets).filter((k) => !state.savedAssets.has(k));
    const thumb = await makeThumb(nb);
    await db.saveNotebook(nb, metaOf(nb, thumb), newKeys);
    if (state.nb === nb) newKeys.forEach((k) => state.savedAssets.add(k));
    if (state.nb === nb && !saveTimer) setSaveStatus('Gespeichert');
  }).catch((err) => {
    console.error(err);
    setSaveStatus('Fehler beim Speichern');
    toast('Speichern fehlgeschlagen: ' + (err?.message || err) + ' – neuer Versuch in 5 s', 5000);
    // Erneut versuchen; noch nicht hochgeladene Bilder bleiben vorgemerkt
    setTimeout(() => { if (state.nb === nb && !saveTimer) scheduleSave(); }, 5000);
  });
  return savePromise;
}
async function saveFresh(nb) {
  const thumb = await makeThumb(nb);
  await db.saveNotebook(nb, metaOf(nb, thumb), Object.keys(nb.assets));
}
async function pruneAssets() {
  const nb = state.nb;
  if (!nb) return;
  const used = new Set();
  for (const p of nb.pages) pageAssetKeys(p).forEach((k) => used.add(k));
  const unused = Object.keys(nb.assets).filter((k) => !used.has(k));
  if (!unused.length) return;
  unused.forEach((k) => { delete nb.assets[k]; imgCache.delete(nb.id + ':' + k); });
  await db.deleteAssets(nb.id, unused.filter((k) => state.savedAssets.has(k)));
}

/* =====================================================================
   Bibliothek
   ===================================================================== */
async function showLibrary() {
  if (state.nb) {
    closeTextEditor();
    clearSelection();
    await pruneAssets().catch(console.error);
    await saveNow();
    state.nb = null;
    imgCache.clear();
  }
  $('#editor').classList.add('hidden');
  $('#auth').classList.add('hidden');
  $('#library').classList.remove('hidden');
  document.title = 'Jelly Notes';
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  renderLibrary();
}

async function renderLibrary() {
  const q = $('#search').value.trim().toLowerCase();
  let metas = await db.listMeta();
  metas.sort((a, b) => b.updatedAt - a.updatedAt);
  if (q) metas = metas.filter((m) => m.title.toLowerCase().includes(q));
  const grid = $('#nb-grid');
  grid.innerHTML = '';
  if (!q) {
    const n = document.createElement('div');
    n.className = 'nb-card nb-new';
    n.innerHTML = `<div class="nb-cover">${icon('plus')}</div><div class="nb-info"><div class="txt"><div class="nb-title">Neues Notizbuch</div></div></div>`;
    n.onclick = openNewDialog;
    grid.appendChild(n);
  }
  for (const m of metas) {
    const card = document.createElement('div');
    card.className = 'nb-card';
    const colored = m.cover && m.cover !== 'none';
    card.innerHTML = `
      <div class="nb-cover ${colored ? 'colored' : 'paper'}" style="--cover:${colored ? m.cover : '#fff'}">
        ${colored ? `<div class="label">${esc(m.title)}</div>` : (m.thumb ? `<img src="${m.thumb}" alt="">` : '')}
      </div>
      <button class="nb-more" title="Optionen">${icon('more')}</button>
      <div class="nb-info"><div class="txt">
        <div class="nb-title">${esc(m.title)}</div>
        <div class="nb-meta">${dateFmt.format(m.updatedAt)} · ${m.pageCount} ${m.pageCount === 1 ? 'Seite' : 'Seiten'}</div>
      </div></div>`;
    card.onclick = (e) => {
      if (e.target.closest('.nb-more')) return;
      openNotebook(m.id);
    };
    card.querySelector('.nb-more').onclick = (e) => { e.stopPropagation(); notebookMenu(e.currentTarget, m); };
    grid.appendChild(card);
  }
  if (q && !metas.length) grid.innerHTML = '<p class="lib-empty">Keine Treffer.</p>';
}

function notebookMenu(anchor, m) {
  openMenu(anchor, [
    { label: 'Öffnen', icon: 'page', action: () => openNotebook(m.id) },
    { label: 'Umbenennen', icon: 'edit', action: async () => {
      const t = await ask({ title: 'Umbenennen', input: m.title, ok: 'Speichern' });
      if (!t?.trim()) return;
      await db.patchNotebook(m.id, { title: t.trim() });
      renderLibrary();
    } },
    { label: 'Cover ändern', icon: 'grid', action: () => coverMenu(anchor, m) },
    { label: 'Duplizieren', icon: 'copy', action: async () => {
      const nb = await db.loadNotebook(m.id);
      const copy = reId(nb);
      copy.title = nb.title + ' (Kopie)';
      await saveFresh(copy);
      renderLibrary();
    } },
    '-',
    { label: 'Als PDF exportieren', icon: 'download', action: async () => {
      const nb = await db.loadNotebook(m.id);
      await withNotebook(nb, () => exportPDF());
    } },
    { label: 'Backup exportieren (.json)', icon: 'download', action: async () => exportBackup(await db.loadNotebook(m.id)) },
    '-',
    { label: 'Löschen', icon: 'trash', danger: true, action: async () => {
      if (!(await ask({ title: 'Notizbuch löschen?', message: `„${m.title}“ wird endgültig gelöscht.`, ok: 'Löschen', danger: true }))) return;
      await db.deleteNotebook(m.id);
      renderLibrary();
      toast('Notizbuch gelöscht');
    } },
  ]);
}

function coverMenu(anchor, m) {
  const el = document.createElement('div');
  el.innerHTML = '<div class="menu-title">Cover</div>';
  const sw = document.createElement('div');
  sw.className = 'swatches';
  sw.style.padding = '6px 10px 10px';
  for (const c of [...COVERS, 'none']) {
    const b = document.createElement('button');
    b.className = 'swatch' + (c === 'none' ? ' none' : '') + (c === m.cover ? ' active' : '');
    b.style.setProperty('--c', c);
    b.title = c === 'none' ? 'Erste Seite anzeigen' : c;
    b.onclick = async () => {
      closeMenu();
      await db.patchNotebook(m.id, { cover: c });
      renderLibrary();
    };
    sw.appendChild(b);
  }
  el.appendChild(sw);
  openMenu(anchor, el);
}

/** Vergibt neue IDs für ein Notizbuch (Duplikat / Backup-Import). */
function reId(nb) {
  const copy = clone(nb);
  copy.id = uid();
  copy.createdAt = copy.updatedAt = Date.now();
  for (const p of copy.pages) {
    p.id = uid();
    for (const s of p.strokes) s.id = uid();
    for (const it of p.items) it.id = uid();
  }
  copy.assets = copy.assets || {};
  return copy;
}

/** Führt fn mit einem temporär geladenen Notizbuch aus (für Export aus der Bibliothek). */
async function withNotebook(nb, fn) {
  const prev = state.nb;
  state.nb = nb;
  try { await fn(); } finally { state.nb = prev; }
}

/* ---------- Neues Notizbuch ---------- */
function paperPreview(paper, color, landscape = false) {
  const page = { w: landscape ? PAGE_H : PAGE_W, h: landscape ? PAGE_W : PAGE_H, paper, color, items: [], strokes: [] };
  const c = document.createElement('canvas');
  const f = 140 / page.w;
  c.width = 140; c.height = Math.round(page.h * f);
  const ctx = c.getContext('2d');
  ctx.scale(f, f);
  drawPaper(ctx, page);
  return c;
}
function buildSeg(el, options, value, onChange) {
  el.innerHTML = '';
  for (const [v, label] of options) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.className = v === value ? 'active' : '';
    b.onclick = () => { onChange(v); buildSeg(el, options, v, onChange); };
    el.appendChild(b);
  }
}
function buildPaperGrid(el, sel, onChange) {
  el.innerHTML = '';
  for (const [id, name] of PAPERS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'paper-opt' + (id === sel.paper ? ' active' : '');
    b.appendChild(paperPreview(id, sel.color, sel.landscape));
    b.insertAdjacentHTML('beforeend', `<span>${name}</span>`);
    b.onclick = () => { onChange(id); buildPaperGrid(el, { ...sel, paper: id }, onChange); };
    el.appendChild(b);
  }
}
function openNewDialog() {
  const dlg = $('#dlg-new');
  const sel = { cover: COVERS[Math.floor(Math.random() * COVERS.length)], paper: 'lined', color: 'white', landscape: false };
  $('#new-title').value = '';
  const covers = $('#new-covers');
  const drawCovers = () => {
    covers.innerHTML = '';
    for (const c of [...COVERS, 'none']) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'swatch' + (c === 'none' ? ' none' : '') + (c === sel.cover ? ' active' : '');
      b.style.setProperty('--c', c);
      b.title = c === 'none' ? 'Kein Cover' : c;
      b.onclick = () => { sel.cover = c; drawCovers(); };
      covers.appendChild(b);
    }
  };
  const drawPapers = () => buildPaperGrid($('#new-papers'), sel, (p) => { sel.paper = p; });
  drawCovers();
  drawPapers();
  buildSeg($('#new-pcolor'), Object.entries(PAPER_COLORS).map(([k, v]) => [k, v[1]]), sel.color, (v) => { sel.color = v; drawPapers(); });
  buildSeg($('#new-orient'), [[false, 'Hoch'], [true, 'Quer']], sel.landscape, (v) => { sel.landscape = v; drawPapers(); });
  dlg.onclose = async () => {
    if (dlg.returnValue !== 'ok') return;
    const nb = newNotebook({ title: $('#new-title').value.trim(), ...sel });
    await saveFresh(nb);
    openNotebook(nb.id);
  };
  dlg.returnValue = '';
  dlg.showModal();
  $('#new-title').focus();
}

/* =====================================================================
   Editor öffnen
   ===================================================================== */
async function openNotebook(id) {
  const nb = await db.loadNotebook(id);
  if (!nb) { toast('Notizbuch nicht gefunden'); return showLibrary(); }
  state.nb = nb;
  state.history = [];
  state.future = [];
  state.selection = null;
  state.savedAssets = new Set(Object.keys(nb.assets));
  state.cur = 0;
  imgCache.clear();
  $('#library').classList.add('hidden');
  $('#editor').classList.remove('hidden');
  $('#nb-title').value = nb.title;
  document.title = nb.title + ' – Jelly Notes';
  if (location.hash !== '#nb=' + id) history.replaceState(null, '', '#nb=' + id);
  setSaveStatus('');
  updateUndoButtons();
  if (isNarrow()) state.sidebar = false;
  applySidebar();
  setTool(state.tool);
  buildPages();
  fitWidth();
  $('#viewer').scrollTop = 0;
  buildThumbs();
  updateCurrent();
}

/* =====================================================================
   Seitenansichten
   ===================================================================== */
const viewer = $('#viewer');
const pagesEl = $('#pages');
const views = new Map(); // pageId -> { page, wrap, canvas, visible }
const live = document.createElement('canvas');
live.className = 'live';

const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    const v = views.get(e.target.dataset.id);
    if (!v) continue;
    v.visible = e.isIntersecting;
    if (v.visible) scheduleRender(v);
    else { v.canvas.width = 0; v.canvas.height = 0; }
  }
}, { root: viewer, rootMargin: '800px 200px' });

function buildPages() {
  io.disconnect();
  views.clear();
  pagesEl.innerHTML = '';
  for (const page of state.nb.pages) {
    const wrap = document.createElement('div');
    wrap.className = 'page t-' + state.tool;
    wrap.dataset.id = page.id;
    const canvas = document.createElement('canvas');
    wrap.appendChild(canvas);
    pagesEl.appendChild(wrap);
    const v = { page, wrap, canvas, visible: false };
    views.set(page.id, v);
    io.observe(wrap);
  }
  layout();
  renderSelection();
}

function viewScale(page) {
  const max = Math.sqrt(16e6 / (page.w * page.h)); // Grenze für Canvas-Größe (iOS)
  return Math.min(state.zoom * (window.devicePixelRatio || 1), max);
}

function layout() {
  const z = state.zoom;
  for (const v of views.values()) {
    v.wrap.style.width = v.page.w * z + 'px';
    v.wrap.style.height = v.page.h * z + 'px';
    if (v.visible) scheduleRender(v);
  }
  $('#btn-zoom-fit').textContent = Math.round(z * 100) + '%';
  if (editing) positionTextEditor();
  if (state.selection) renderSelection();
}

function renderView(v) {
  const sc = viewScale(v.page);
  const W = Math.round(v.page.w * sc), H = Math.round(v.page.h * sc);
  const c = v.canvas;
  if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
  const ctx = c.getContext('2d');
  ctx.setTransform(W / v.page.w, 0, 0, H / v.page.h, 0, 0);
  renderPage(ctx, v.page, { skip: editing?.item.id });
}

const dirty = new Set();
let rafId = 0;
let liveDirty = false;
function scheduleRender(v) {
  if (v) dirty.add(v);
  if (!rafId) rafId = requestAnimationFrame(flushRender);
}
function scheduleLive() { liveDirty = true; scheduleRender(); }
function flushRender() {
  rafId = 0;
  for (const v of dirty) if (v.visible && views.get(v.page.id) === v) renderView(v);
  dirty.clear();
  if (liveDirty) drawLive();
}
function renderAllVisible() { for (const v of views.values()) if (v.visible) scheduleRender(v); }

function attachLive(v) {
  live.width = v.canvas.width || Math.round(v.page.w * viewScale(v.page));
  live.height = v.canvas.height || Math.round(v.page.h * viewScale(v.page));
  v.wrap.appendChild(live);
}
function detachLive() {
  live.remove();
  live.getContext('2d').clearRect(0, 0, live.width, live.height);
}
function drawLive() {
  liveDirty = false;
  if (!act || !live.parentNode) return;
  const ctx = live.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, live.width, live.height);
  const page = act.v.page;
  ctx.setTransform(live.width / page.w, 0, 0, live.height / page.h, 0, 0);
  const dark = page.color === 'dark';
  if (act.type === 'stroke' || act.type === 'shape') {
    if (act.s.points.length) drawStroke(ctx, act.s, dark);
  } else if (act.type === 'lasso') {
    const P = act.poly;
    if (P.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(P[0][0], P[0][1]);
    for (const p of P) ctx.lineTo(p[0], p[1]);
    ctx.fillStyle = 'rgba(47,111,222,.06)';
    ctx.fill();
    ctx.setLineDash([6 / state.zoom, 5 / state.zoom]);
    ctx.lineWidth = 1.5 / state.zoom;
    ctx.strokeStyle = '#2f6fde';
    ctx.stroke();
  } else if (act.type === 'erase' && act.pos) {
    ctx.beginPath();
    ctx.arc(act.pos[0], act.pos[1], act.r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(127,127,127,.15)';
    ctx.fill();
    ctx.lineWidth = 1 / state.zoom;
    ctx.strokeStyle = 'rgba(80,80,80,.7)';
    ctx.stroke();
  }
}

/* ---------- Zoom & Scroll ---------- */
function fitWidth() {
  if (!state.nb) return;
  const maxW = Math.max(...state.nb.pages.map((p) => p.w));
  const avail = viewer.clientWidth - (window.innerWidth < 720 ? 24 : 48);
  state.fit = true;
  setZoom(clamp(avail / maxW, 0.25, 1.25), undefined, undefined, true);
}
function setZoom(z, cx, cy, keepFit = false) {
  z = clamp(z, 0.25, 5);
  if (!keepFit) state.fit = false;
  const vr = viewer.getBoundingClientRect();
  cx ??= vr.left + vr.width / 2;
  cy ??= vr.top + vr.height / 2;
  let anchor = null;
  for (const v of views.values()) {
    const r = v.wrap.getBoundingClientRect();
    if (cy >= r.top - 14 && cy <= r.bottom + 14) {
      anchor = { v, px: (cx - r.left) / state.zoom, py: (cy - r.top) / state.zoom };
      break;
    }
  }
  state.zoom = z;
  layout();
  if (anchor) {
    const r = anchor.v.wrap.getBoundingClientRect();
    viewer.scrollLeft += r.left + anchor.px * z - cx;
    viewer.scrollTop += r.top + anchor.py * z - cy;
  }
}
function scrollToPage(i, smooth = false) {
  const p = state.nb.pages[i];
  const v = p && views.get(p.id);
  if (!v) return;
  viewer.scrollTo({ top: v.wrap.offsetTop - 16, behavior: smooth ? 'smooth' : 'auto' });
}
let curRaf = 0;
function updateCurrent() {
  curRaf = 0;
  if (!state.nb) return;
  const vr = viewer.getBoundingClientRect();
  const cy = vr.top + vr.height * 0.4;
  let best = 0;
  state.nb.pages.forEach((p, i) => {
    const v = views.get(p.id);
    if (v && v.wrap.getBoundingClientRect().top <= cy) best = i;
  });
  const changed = best !== state.cur;
  state.cur = best;
  $('#page-ind').textContent = `${best + 1} / ${state.nb.pages.length}`;
  for (const t of $('#thumbs').children) t.classList.toggle('current', t.dataset.id === state.nb.pages[best].id);
  if (changed && state.sidebar) {
    const t = $('#thumbs').children[best];
    t?.scrollIntoView({ block: 'nearest' });
  }
}
viewer.addEventListener('scroll', () => { if (!curRaf) curRaf = requestAnimationFrame(updateCurrent); }, { passive: true });
viewer.addEventListener('wheel', (e) => {
  if (!e.ctrlKey && !e.metaKey) return;
  e.preventDefault();
  setZoom(state.zoom * Math.exp(-e.deltaY * 0.0025), e.clientX, e.clientY);
}, { passive: false });
window.addEventListener('resize', () => { if (state.nb && state.fit) fitWidth(); });

/* ---------- Miniaturen ---------- */
const thumbQueue = new Set();
let thumbTimer = 0;
function buildThumbs() {
  const el = $('#thumbs');
  el.innerHTML = '';
  state.nb.pages.forEach((p, i) => {
    const d = document.createElement('div');
    d.className = 'thumb';
    d.dataset.id = p.id;
    const c = document.createElement('canvas');
    c.width = 140; c.height = Math.round(140 * p.h / p.w);
    d.appendChild(c);
    d.insertAdjacentHTML('beforeend', `<span>${i + 1}</span>`);
    d.onclick = () => {
      scrollToPage(pageIndex(p.id), true);
      if (isNarrow()) { state.sidebar = false; applySidebar(); }
    };
    el.appendChild(d);
  });
  queueAllThumbs();
  updateCurrent();
}
function queueAllThumbs() { if (state.nb) state.nb.pages.forEach((p) => queueThumb(p)); }
function queueThumb(page) {
  thumbQueue.add(page.id);
  if (!thumbTimer) thumbTimer = setTimeout(processThumbs, 250);
}
function processThumbs() {
  thumbTimer = 0;
  if (!state.nb || !state.sidebar) return;
  let n = 0;
  for (const id of thumbQueue) {
    thumbQueue.delete(id);
    const page = findPage(id);
    const c = $(`.thumb[data-id="${id}"] canvas`);
    if (!page || !c) continue;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.round(140 * dpr); c.height = Math.round(140 * dpr * page.h / page.w);
    const ctx = c.getContext('2d');
    const f = c.width / page.w;
    ctx.setTransform(f, 0, 0, f, 0, 0);
    renderPage(ctx, page);
    if (++n >= 6) break;
  }
  if (thumbQueue.size) thumbTimer = setTimeout(processThumbs, 16);
}
function markChanged(page) {
  queueThumb(page);
  scheduleSave();
}

/* =====================================================================
   Werkzeuge
   ===================================================================== */
function setTool(t) {
  if (t !== 'lasso') clearSelection();
  closeTextEditor();
  state.tool = t;
  for (const b of document.querySelectorAll('.tool[data-tool]')) b.classList.toggle('active', b.dataset.tool === t);
  for (const v of views.values()) v.wrap.className = 'page t-' + t;
  renderOptions();
  savePrefs();
}

function renderOptions() {
  const t = state.tool, cfg = state.tools[t];
  const o = $('#options');
  let html = '';
  if (t === 'shape') {
    html += SHAPES.map(([k, n]) => `<button class="wbtn ${cfg.kind === k ? 'active' : ''}" data-shape="${k}" title="${n}">${icon(k)}</button>`).join('');
    html += '<span class="opt-sep"></span>';
  }
  if (cfg && 'color' in cfg) {
    const colors = t === 'highlighter' ? HL_COLORS : PEN_COLORS;
    html += colors.map((c) => `<button class="swatch ${c === cfg.color ? 'active' : ''}" style="--c:${c}" data-color="${c}" title="${c}"></button>`).join('');
    const custom = !colors.includes(cfg.color);
    html += `<label class="swatch custom ${custom ? 'active' : ''}" title="Eigene Farbe" ${custom ? `style="background:${cfg.color}"` : ''}><input type="color" value="${cfg.color}"></label>`;
    html += '<span class="opt-sep"></span>';
  }
  if (WIDTHS[t]) {
    html += WIDTHS[t].map((w, i) => {
      const d = [5, 9, 14][i];
      return `<button class="wbtn ${cfg.width === w ? 'active' : ''}" data-width="${w}" title="Stärke ${i + 1}"><span class="dot" style="width:${d}px;height:${d}px"></span></button>`;
    }).join('');
  }
  if (t === 'text') {
    html += TEXT_SIZES.map((s, i) => `<button class="wbtn ${cfg.size === s ? 'active' : ''}" data-size="${s}" title="Größe ${s}"><span style="font-size:${[12, 16, 21][i]}px;font-weight:600">A</span></button>`).join('');
    html += '<span class="opt-hint">Tippe auf die Seite, um zu schreiben</span>';
  }
  if (t === 'eraser') html += '<span class="opt-hint">Radiert ganze Striche</span>';
  if (t === 'lasso') html += '<span class="opt-hint">Umkreise Inhalte zum Verschieben, Skalieren oder Kopieren</span>';
  o.innerHTML = html;
  const ci = o.querySelector('input[type=color]');
  if (ci) ci.addEventListener('input', (e) => { cfg.color = e.target.value; e.target.parentElement.style.background = cfg.color; o.querySelectorAll('.swatch').forEach((s) => s.classList.remove('active')); e.target.parentElement.classList.add('active'); savePrefs(); });
}
$('#options').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  const cfg = state.tools[state.tool];
  if (b.dataset.color) cfg.color = b.dataset.color;
  else if (b.dataset.width) cfg.width = +b.dataset.width;
  else if (b.dataset.size) cfg.size = +b.dataset.size;
  else if (b.dataset.shape) cfg.kind = b.dataset.shape;
  else return;
  renderOptions();
  savePrefs();
});
$('#tools').addEventListener('click', (e) => {
  const b = e.target.closest('.tool[data-tool]');
  if (b) setTool(b.dataset.tool);
});

/* =====================================================================
   Eingabe (Stift, Maus, Touch)
   ===================================================================== */
let act = null;            // laufende Aktion
const touches = new Map(); // aktive Finger
let pinch = null;

function getPt(e, v) {
  const r = v.wrap.getBoundingClientRect();
  return [(e.clientX - r.left) / state.zoom, (e.clientY - r.top) / state.zoom];
}

viewer.addEventListener('contextmenu', (e) => e.preventDefault());

viewer.addEventListener('pointerdown', (e) => {
  if (e.target.closest('.sel-menu, .text-editor, .pages-end')) return;
  if (e.pointerType === 'touch') {
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (touches.size === 2) { abortAction(); startPinch(); return; }
    if (touches.size > 2) return;
  }
  if (pinch) return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  if (editing) { closeTextEditor(); if (state.tool === 'text') return; }

  const wrap = e.target.closest('.page');
  // Finger: im „Nur Stift“-Modus oder außerhalb einer Seite wird gescrollt
  if (e.pointerType === 'touch' && (state.penOnly || !wrap)) {
    act = { type: 'pan', id: e.pointerId, x: e.clientX, y: e.clientY };
    viewer.setPointerCapture(e.pointerId);
    return;
  }
  if (!wrap) {
    if (e.pointerType === 'mouse') clearSelection();
    return;
  }
  const v = views.get(wrap.dataset.id);
  if (!v) return;
  e.preventDefault();
  viewer.setPointerCapture(e.pointerId);
  const pt = getPt(e, v);

  if (e.target.closest('.sel-handle')) return startScale(v, pt, e);
  if (e.target.closest('.sel-box')) return startMove(v, pt, e);
  if (state.selection) clearSelection();

  // Radierer-Ende eines Stifts (z.B. Surface Pen)
  const tool = (e.pointerType === 'pen' && (e.buttons & 32)) ? 'eraser' : state.tool;
  switch (tool) {
    case 'pen':
    case 'highlighter': return startStroke(v, e, tool);
    case 'eraser': return startErase(v, pt, e);
    case 'lasso': return startLasso(v, pt, e);
    case 'shape': return startShape(v, pt, e);
    case 'text': act = { type: 'text', id: e.pointerId, v, pt }; return;
  }
});

viewer.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'touch' && touches.has(e.pointerId)) {
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch) return movePinch();
  }
  if (!act || act.id !== e.pointerId) return;
  switch (act.type) {
    case 'pan':
      viewer.scrollLeft -= e.clientX - act.x;
      viewer.scrollTop -= e.clientY - act.y;
      act.x = e.clientX; act.y = e.clientY;
      break;
    case 'stroke': addStrokePoints(e); break;
    case 'erase': eraseTo(getPt(e, act.v)); break;
    case 'lasso': {
      const pt = getPt(e, act.v);
      const L = act.poly[act.poly.length - 1];
      if (Math.hypot(pt[0] - L[0], pt[1] - L[1]) > 2 / state.zoom) { act.poly.push(pt); scheduleLive(); }
      break;
    }
    case 'shape': {
      let pt = getPt(e, act.v);
      if (e.shiftKey && act.kind !== 'line' && act.kind !== 'arrow') {
        const d = Math.max(Math.abs(pt[0] - act.a[0]), Math.abs(pt[1] - act.a[1]));
        pt = [act.a[0] + Math.sign(pt[0] - act.a[0]) * d, act.a[1] + Math.sign(pt[1] - act.a[1]) * d];
      }
      act.s.points = shapePoints(act.kind, act.a, pt);
      scheduleLive();
      break;
    }
    case 'move': moveSelection(getPt(e, act.v)); break;
    case 'scale': scaleSelection(getPt(e, act.v)); break;
  }
});

function endPointer(e) {
  if (e.pointerType === 'touch') {
    touches.delete(e.pointerId);
    if (pinch) { if (touches.size < 2) pinch = null; return; }
  }
  if (!act || act.id !== e.pointerId) return;
  const a = act;
  if (e.type === 'pointercancel' && a.type !== 'pan') { abortAction(); return; }
  act = null;
  switch (a.type) {
    case 'stroke':
    case 'shape': {
      detachLive();
      if (a.type === 'shape' && a.s.points.length < 2) break;
      const page = a.v.page;
      const before = snap(page);
      page.strokes.push(a.s);
      commit(page, before);
      scheduleRender(a.v);
      break;
    }
    case 'erase':
      detachLive();
      if (a.changed) commit(a.v.page, a.before);
      break;
    case 'lasso':
      detachLive();
      finishLasso(a);
      break;
    case 'move':
    case 'scale':
      commit(a.v.page, a.before);
      renderSelection();
      break;
    case 'text': {
      const it = itemAt(a.v.page, a.pt[0], a.pt[1], 'text');
      if (it) openTextEditor(a.v, it, false);
      else {
        const cfg = state.tools.text;
        openTextEditor(a.v, { id: uid(), type: 'text', x: r1(a.pt[0]), y: r1(a.pt[1] - cfg.size * 0.6), text: '', size: cfg.size, color: cfg.color, w: 0, h: 0 }, true);
      }
      break;
    }
  }
}
viewer.addEventListener('pointerup', endPointer);
viewer.addEventListener('pointercancel', endPointer);

function abortAction() {
  if (!act) return;
  const a = act;
  act = null;
  if (['stroke', 'shape', 'lasso', 'erase'].includes(a.type)) detachLive();
  if (['erase', 'move', 'scale'].includes(a.type) && a.before) {
    restore(a.v.page, a.before);
    scheduleRender(a.v);
    if (a.type !== 'erase') renderSelection();
  }
}

/* ---------- Zwei-Finger-Gesten ---------- */
function startPinch() {
  const [a, b] = [...touches.values()];
  pinch = {
    d0: Math.hypot(a.x - b.x, a.y - b.y) || 1,
    z0: state.zoom,
    mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2,
  };
}
function movePinch() {
  const [a, b] = [...touches.values()];
  if (!a || !b) return;
  const d = Math.hypot(a.x - b.x, a.y - b.y);
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  viewer.scrollLeft -= mx - pinch.mx;
  viewer.scrollTop -= my - pinch.my;
  pinch.mx = mx; pinch.my = my;
  const z = pinch.z0 * d / pinch.d0;
  if (Math.abs(z - state.zoom) > 0.002) setZoom(z, mx, my);
}

/* ---------- Stift & Textmarker ---------- */
function startStroke(v, e, tool) {
  const cfg = state.tools[tool];
  act = { type: 'stroke', id: e.pointerId, v, s: { id: uid(), tool, color: cfg.color, width: cfg.width, points: [] } };
  attachLive(v);
  addStrokePoints(e);
}
function addStrokePoints(e) {
  const evs = (e.getCoalescedEvents && e.getCoalescedEvents()) || [];
  const list = evs.length ? evs : [e];
  const P = act.s.points;
  const minD = 0.6 / state.zoom;
  for (const ev of list) {
    const [x, y] = getPt(ev, act.v);
    let p = ev.pointerType === 'pen' ? clamp(ev.pressure || 0.5, 0.05, 1) : 0.5;
    const L = P[P.length - 1];
    if (L) {
      if (Math.hypot(x - L[0], y - L[1]) < minD) continue;
      if (ev.pointerType === 'pen') p = L[2] * 0.6 + p * 0.4;
    }
    P.push([r1(x), r1(y), Math.round(p * 100) / 100]);
  }
  scheduleLive();
}

/* ---------- Radierer ---------- */
function startErase(v, pt, e) {
  act = { type: 'erase', id: e.pointerId, v, before: snap(v.page), last: pt, pos: pt, r: state.tools.eraser.width / 2, changed: false };
  attachLive(v);
  eraseTo(pt);
}
function eraseTo(pt) {
  const page = act.v.page;
  const [x0, y0] = act.last, [x1, y1] = pt;
  const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / (act.r / 2)));
  const n = page.strokes.length;
  for (let i = 0; i <= steps; i++) {
    const x = x0 + (x1 - x0) * i / steps, y = y0 + (y1 - y0) * i / steps;
    page.strokes = page.strokes.filter((s) => !strokeHit(s, x, y, act.r));
  }
  if (page.strokes.length !== n) { act.changed = true; scheduleRender(act.v); }
  act.last = pt;
  act.pos = pt;
  scheduleLive();
}

/* ---------- Formen ---------- */
function startShape(v, pt, e) {
  const cfg = state.tools.shape;
  act = { type: 'shape', id: e.pointerId, v, a: pt, kind: cfg.kind, s: { id: uid(), tool: 'shape', straight: true, color: cfg.color, width: cfg.width, points: [] } };
  attachLive(v);
}

/* ---------- Lasso & Auswahl ---------- */
function startLasso(v, pt, e) {
  act = { type: 'lasso', id: e.pointerId, v, poly: [pt] };
  attachLive(v);
}
function finishLasso(a) {
  const page = a.v.page;
  const poly = a.poly;
  const strokes = new Set(), items = new Set();
  const bb = poly.reduce((b, p) => ({ x0: Math.min(b.x0, p[0]), y0: Math.min(b.y0, p[1]), x1: Math.max(b.x1, p[0]), y1: Math.max(b.y1, p[1]) }), { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity });
  const isTap = (bb.x1 - bb.x0) + (bb.y1 - bb.y0) < 8 / state.zoom;
  if (isTap) {
    const [x, y] = poly[0];
    const it = itemAt(page, x, y);
    if (it) items.add(it.id);
    else {
      const s = [...page.strokes].reverse().find((s) => strokeHit(s, x, y, 4 / state.zoom));
      if (s) strokes.add(s.id);
    }
  } else if (poly.length > 2) {
    for (const s of page.strokes) {
      let inside = 0;
      for (const p of s.points) if (pointInPoly(p[0], p[1], poly)) inside++;
      if (inside / s.points.length >= 0.5) strokes.add(s.id);
    }
    for (const it of page.items) if (pointInPoly(it.x + it.w / 2, it.y + it.h / 2, poly)) items.add(it.id);
  }
  if (strokes.size || items.size) {
    state.selection = { pageId: page.id, strokes, items };
    renderSelection();
  }
}
function selContent() {
  const sel = state.selection;
  const page = findPage(sel.pageId);
  if (!page) return { page: null, strokes: [], items: [] };
  return { page, strokes: page.strokes.filter((s) => sel.strokes.has(s.id)), items: page.items.filter((i) => sel.items.has(i.id)) };
}
function selBBox() {
  const { strokes, items } = selContent();
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const r of [...strokes.map(strokeBBox), ...items]) {
    x0 = Math.min(x0, r.x); y0 = Math.min(y0, r.y);
    x1 = Math.max(x1, r.x + r.w); y1 = Math.max(y1, r.y + r.h);
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
let selEl = null;
function clearSelection() {
  state.selection = null;
  selEl?.remove();
  selEl = null;
}
function renderSelection() {
  selEl?.remove();
  selEl = null;
  if (!state.selection) return;
  const { page, strokes, items } = selContent();
  const v = page && views.get(page.id);
  if (!v || (!strokes.length && !items.length)) { state.selection = null; return; }
  selEl = document.createElement('div');
  selEl.className = 'sel-box';
  const hasColor = strokes.some((s) => s.tool !== 'highlighter') || items.some((i) => i.type === 'text');
  selEl.innerHTML = `
    <div class="sel-menu">
      ${hasColor ? PEN_COLORS.map((c) => `<button class="mini" style="--c:${c}" data-sel="color" data-c="${c}" title="Farbe"></button>`).join('') + '<span class="msep"></span>' : ''}
      <button data-sel="copy" title="Kopieren (Strg+C)">${icon('copy')}Kopieren</button>
      <button data-sel="dup" title="Duplizieren">${icon('plus')}Duplizieren</button>
      <button data-sel="del" title="Löschen (Entf)">${icon('trash')}</button>
    </div>
    <div class="sel-handle" title="Größe ändern"></div>`;
  selEl.querySelector('.sel-menu').addEventListener('click', onSelMenu);
  v.wrap.appendChild(selEl);
  positionSel();
}
function positionSel() {
  if (!selEl) return;
  const bb = selBBox(), z = state.zoom, pad = 8;
  Object.assign(selEl.style, {
    left: bb.x * z - pad + 'px', top: bb.y * z - pad + 'px',
    width: bb.w * z + pad * 2 + 'px', height: bb.h * z + pad * 2 + 'px',
  });
  selEl.classList.toggle('menu-below', bb.y * z < 60);
}
function onSelMenu(e) {
  const b = e.target.closest('[data-sel]');
  if (!b) return;
  const { page, strokes, items } = selContent();
  const before = snap(page);
  switch (b.dataset.sel) {
    case 'color':
      for (const s of strokes) if (s.tool !== 'highlighter') s.color = b.dataset.c;
      for (const it of items) if (it.type === 'text') it.color = b.dataset.c;
      break;
    case 'copy':
      copySelection();
      toast('Kopiert – mit Strg+V einfügen');
      return;
    case 'dup': {
      const ns = clone(strokes), ni = clone(items);
      offsetContent(ns, ni, 20);
      page.strokes.push(...ns);
      page.items.push(...ni);
      state.selection = { pageId: page.id, strokes: new Set(ns.map((s) => s.id)), items: new Set(ni.map((i) => i.id)) };
      break;
    }
    case 'del':
      deleteSelection();
      return;
  }
  commit(page, before);
  scheduleRender(views.get(page.id));
  renderSelection();
}
function offsetContent(strokes, items, d) {
  for (const s of strokes) { s.id = uid(); for (const p of s.points) { p[0] += d; p[1] += d; } }
  for (const it of items) { it.id = uid(); it.x += d; it.y += d; }
}
function deleteSelection() {
  if (!state.selection) return;
  const { page } = selContent();
  const sel = state.selection;
  const before = snap(page);
  page.strokes = page.strokes.filter((s) => !sel.strokes.has(s.id));
  page.items = page.items.filter((i) => !sel.items.has(i.id));
  clearSelection();
  commit(page, before);
  scheduleRender(views.get(page.id));
}
function copySelection() {
  if (!state.selection) return;
  const { strokes, items } = selContent();
  const assets = {};
  for (const it of items) if (it.type === 'image') assets[it.asset] = state.nb.assets[it.asset];
  clipboard = { strokes: clone(strokes), items: clone(items), assets };
}
function paste() {
  if (!clipboard) return;
  const page = currentPage();
  const before = snap(page);
  const ns = clone(clipboard.strokes), ni = clone(clipboard.items);
  const samePage = state.selection?.pageId === page.id;
  offsetContent(ns, ni, samePage ? 20 : 0);
  for (const [k, d] of Object.entries(clipboard.assets)) if (!state.nb.assets[k]) state.nb.assets[k] = d;
  page.strokes.push(...ns);
  page.items.push(...ni);
  commit(page, before);
  if (state.tool !== 'lasso') setTool('lasso');
  state.selection = { pageId: page.id, strokes: new Set(ns.map((s) => s.id)), items: new Set(ni.map((i) => i.id)) };
  scheduleRender(views.get(page.id));
  renderSelection();
}
function startMove(v, pt, e) {
  act = { type: 'move', id: e.pointerId, v, before: snap(v.page), last: pt };
}
function moveSelection(pt) {
  const dx = pt[0] - act.last[0], dy = pt[1] - act.last[1];
  act.last = pt;
  const { strokes, items } = selContent();
  for (const s of strokes) { for (const p of s.points) { p[0] += dx; p[1] += dy; } bboxCache.delete(s); }
  for (const it of items) { it.x += dx; it.y += dy; }
  scheduleRender(act.v);
  positionSel();
}
function startScale(v, pt, e) {
  const { strokes, items } = selContent();
  act = {
    type: 'scale', id: e.pointerId, v, before: snap(v.page), bb: selBBox(), start: pt,
    orig: {
      s: strokes.map((s) => ({ s, pts: s.points.map((p) => p.slice()), w: s.width })),
      i: items.map((it) => ({ it, x: it.x, y: it.y, w: it.w, h: it.h, size: it.size })),
    },
  };
}
function scaleSelection(pt) {
  const { bb, start, orig } = act;
  const den = Math.max(4, (start[0] - bb.x) + (start[1] - bb.y));
  const f = clamp(((pt[0] - bb.x) + (pt[1] - bb.y)) / den, 0.08, 20);
  const X = (x) => bb.x + (x - bb.x) * f, Y = (y) => bb.y + (y - bb.y) * f;
  for (const o of orig.s) {
    o.s.points = o.pts.map((p) => [r1(X(p[0])), r1(Y(p[1])), p[2]]);
    o.s.width = Math.max(0.3, o.w * f);
    bboxCache.delete(o.s);
  }
  for (const o of orig.i) {
    o.it.x = X(o.x); o.it.y = Y(o.y); o.it.w = o.w * f; o.it.h = o.h * f;
    if (o.it.type === 'text') o.it.size = Math.max(4, o.size * f);
  }
  scheduleRender(act.v);
  positionSel();
}

/* ---------- Text ---------- */
let editing = null;
function openTextEditor(v, item, isNew) {
  closeTextEditor();
  const ta = document.createElement('textarea');
  ta.className = 'text-editor';
  ta.value = item.text;
  ta.wrap = 'off';
  ta.spellcheck = true;
  editing = { v, item, ta, isNew, before: snap(v.page) };
  positionTextEditor();
  v.wrap.appendChild(ta);
  scheduleRender(v);
  const fit = () => {
    ta.style.height = '0px';
    ta.style.width = '0px';
    ta.style.height = ta.scrollHeight + 'px';
    ta.style.width = Math.max(40, ta.scrollWidth + 4) + 'px';
  };
  ta.addEventListener('input', fit);
  ta.addEventListener('blur', () => closeTextEditor());
  ta.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Escape' || (e.key === 'Enter' && (e.metaKey || e.ctrlKey))) ta.blur();
  });
  fit();
  requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); });
  ta.focus();
}
function positionTextEditor() {
  if (!editing) return;
  const { item, ta } = editing, z = state.zoom;
  Object.assign(ta.style, {
    left: item.x * z + 'px', top: item.y * z + 'px',
    fontSize: item.size * z + 'px', color: item.color,
  });
  ta.style.height = 'auto';
  ta.style.height = ta.scrollHeight + 'px';
}
function closeTextEditor() {
  if (!editing) return;
  const { v, item, ta, isNew, before } = editing;
  editing = null;
  const text = ta.value.replace(/\s+$/, '');
  ta.remove();
  const page = v.page;
  if (!text) {
    if (!isNew) page.items = page.items.filter((i) => i.id !== item.id);
  } else {
    item.text = text;
    measureText(item);
    if (isNew) page.items.push(item);
  }
  commit(page, before);
  scheduleRender(v);
}

/* ---------- Bilder ---------- */
async function insertImageFile(file) {
  if (!file || !file.type.startsWith('image/')) return;
  try {
    const { src, w: iw, h: ih } = await fileToScaledDataURL(file);
    const page = currentPage();
    const v = views.get(page.id);
    const f = Math.min(1, (page.w * 0.6) / iw, (page.h * 0.5) / ih);
    const w = iw * f, h = ih * f;
    // In die Mitte des sichtbaren Bereichs der Seite setzen
    const vr = viewer.getBoundingClientRect(), r = v.wrap.getBoundingClientRect();
    const cy = clamp((vr.top + vr.height / 2 - r.top) / state.zoom, h / 2, page.h - h / 2);
    const key = uid();
    state.nb.assets[key] = src;
    const it = { id: uid(), type: 'image', asset: key, x: r1((page.w - w) / 2), y: r1(cy - h / 2), w, h };
    const before = snap(page);
    page.items.push(it);
    commit(page, before);
    setTool('lasso');
    state.selection = { pageId: page.id, strokes: new Set(), items: new Set([it.id]) };
    scheduleRender(v);
    renderSelection();
  } catch (err) {
    console.error(err);
    toast('Bild konnte nicht geladen werden');
  }
}

/* =====================================================================
   Seitenverwaltung
   ===================================================================== */
function rebuildAfterPageChange(scrollTo) {
  clearSelection();
  buildPages();
  buildThumbs();
  if (scrollTo != null) scrollToPage(scrollTo);
  updateCurrent();
  scheduleSave();
}
function addPage(after = state.cur) {
  const ref = state.nb.pages[after] || state.nb.pages[state.nb.pages.length - 1];
  const p = newPage({ paper: ref?.paper, color: ref?.color, landscape: ref && !ref.bg ? ref.w > ref.h : false });
  state.nb.pages.splice(after + 1, 0, p);
  rebuildAfterPageChange(after + 1);
}
function duplicatePage(i) {
  const p = clone(state.nb.pages[i]);
  p.id = uid();
  p.strokes.forEach((s) => { s.id = uid(); });
  p.items.forEach((it) => { it.id = uid(); });
  state.nb.pages.splice(i + 1, 0, p);
  rebuildAfterPageChange(i + 1);
}
async function deletePage(i) {
  if (state.nb.pages.length === 1) { toast('Die letzte Seite kann nicht gelöscht werden'); return; }
  if (!(await ask({ title: `Seite ${i + 1} löschen?`, message: 'Die Seite und ihr Inhalt werden entfernt.', ok: 'Löschen', danger: true }))) return;
  state.nb.pages.splice(i, 1);
  rebuildAfterPageChange(Math.min(i, state.nb.pages.length - 1));
}
function movePage(i, d) {
  const j = i + d;
  const P = state.nb.pages;
  if (j < 0 || j >= P.length) return;
  [P[i], P[j]] = [P[j], P[i]];
  rebuildAfterPageChange(j);
}
function setPaper(page, paper, color, all) {
  for (const p of all ? state.nb.pages : [page]) {
    if (paper) p.paper = paper;
    if (color) p.color = color;
    const v = views.get(p.id);
    if (v) scheduleRender(v);
    queueThumb(p);
  }
  scheduleSave();
}

function pageMenu(anchor) {
  const i = state.cur, page = currentPage();
  const el = document.createElement('div');
  const mk = (label, ic, fn, danger) => {
    const b = document.createElement('button');
    b.className = 'menu-item' + (danger ? ' danger' : '');
    b.innerHTML = icon(ic) + `<span>${label}</span>`;
    b.onclick = () => { closeMenu(); fn(); };
    el.appendChild(b);
  };
  el.insertAdjacentHTML('beforeend', `<div class="menu-title">Seite ${i + 1} von ${state.nb.pages.length}</div>`);
  mk('Neue Seite danach', 'plus', () => addPage(i));
  mk('Seite duplizieren', 'copy', () => duplicatePage(i));
  mk('Nach oben verschieben', 'up', () => movePage(i, -1));
  mk('Nach unten verschieben', 'down', () => movePage(i, 1));
  mk('PDF-Seiten anhängen …', 'upload', () => $('#file-pdf-append').click());
  mk('Seite löschen', 'trash', () => deletePage(i), true);
  el.insertAdjacentHTML('beforeend', '<div class="menu-sep"></div><div class="menu-title">Papier</div>');
  const grid = document.createElement('div');
  grid.className = 'paper-grid';
  const sel = { paper: page.paper, color: page.color, landscape: page.w > page.h };
  const allLbl = document.createElement('label');
  allLbl.className = 'menu-item';
  allLbl.innerHTML = '<input type="checkbox"><span>Auf alle Seiten anwenden</span>';
  const allCb = allLbl.querySelector('input');
  buildPaperGrid(grid, sel, (p) => { sel.paper = p; setPaper(page, p, null, allCb.checked); });
  el.appendChild(grid);
  const seg = document.createElement('div');
  seg.className = 'seg';
  buildSeg(seg, Object.entries(PAPER_COLORS).map(([k, v]) => [k, v[1]]), page.color, (c) => {
    sel.color = c;
    setPaper(page, null, c, allCb.checked);
    buildPaperGrid(grid, sel, (p) => { sel.paper = p; setPaper(page, p, null, allCb.checked); });
  });
  el.appendChild(seg);
  el.appendChild(allLbl);
  openMenu(anchor, el);
}

/* =====================================================================
   PDF-Import & -Export, Backups
   ===================================================================== */
async function pdfToPages(file, onProgress) {
  await loadScript(PDFJS_URL);
  const pdfjs = window.pdfjsLib;
  pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages = [], assets = {};
  for (let n = 1; n <= pdf.numPages; n++) {
    onProgress?.(n, pdf.numPages);
    const p = await pdf.getPage(n);
    const vp1 = p.getViewport({ scale: 1 });
    const land = vp1.width > vp1.height;
    const w = land ? PAGE_H : PAGE_W;
    const h = Math.round(w * vp1.height / vp1.width);
    const vp = p.getViewport({ scale: (w * 2) / vp1.width });
    const c = document.createElement('canvas');
    c.width = Math.round(vp.width); c.height = Math.round(vp.height);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, c.width, c.height);
    await p.render({ canvasContext: ctx, viewport: vp }).promise;
    const key = uid();
    assets[key] = c.toDataURL('image/jpeg', 0.86);
    pages.push({ id: uid(), w, h, paper: 'blank', color: 'white', bg: key, strokes: [], items: [] });
    p.cleanup();
  }
  pdf.destroy();
  return { pages, assets };
}
async function importPDF(file) {
  if (!file) return;
  try {
    toast('PDF wird importiert …', 0);
    const { pages, assets } = await pdfToPages(file, (n, t) => toast(`PDF wird importiert … ${n}/${t}`, 0));
    const nb = newNotebook({ title: file.name.replace(/\.pdf$/i, ''), cover: 'none' });
    nb.pages = pages;
    nb.assets = assets;
    await saveFresh(nb);
    toast(`${pages.length} ${pages.length === 1 ? 'Seite' : 'Seiten'} importiert`);
    openNotebook(nb.id);
  } catch (err) {
    console.error(err);
    toast('PDF-Import fehlgeschlagen: ' + (err?.message || err), 5000);
  }
}
async function appendPDF(file) {
  if (!file || !state.nb) return;
  try {
    toast('PDF wird eingefügt …', 0);
    const { pages, assets } = await pdfToPages(file, (n, t) => toast(`PDF wird eingefügt … ${n}/${t}`, 0));
    Object.assign(state.nb.assets, assets);
    state.nb.pages.splice(state.cur + 1, 0, ...pages);
    rebuildAfterPageChange(state.cur + 1);
    toast(`${pages.length} ${pages.length === 1 ? 'Seite' : 'Seiten'} eingefügt`);
  } catch (err) {
    console.error(err);
    toast('PDF konnte nicht eingefügt werden: ' + (err?.message || err), 5000);
  }
}
async function renderPageCanvas(page, scale = 2) {
  await preloadPage(page);
  const c = document.createElement('canvas');
  c.width = Math.round(page.w * scale); c.height = Math.round(page.h * scale);
  const ctx = c.getContext('2d');
  ctx.scale(scale, scale);
  renderPage(ctx, page);
  return c;
}
async function exportPDF() {
  const nb = state.nb;
  try {
    toast('PDF wird erstellt …', 0);
    await loadScript(JSPDF_URL);
    const { jsPDF } = window.jspdf;
    let doc = null;
    for (let i = 0; i < nb.pages.length; i++) {
      toast(`PDF wird erstellt … ${i + 1}/${nb.pages.length}`, 0);
      const page = nb.pages[i];
      const c = await renderPageCanvas(page, 2);
      const w = page.w * 0.75, h = page.h * 0.75; // px -> pt
      const orientation = w > h ? 'landscape' : 'portrait';
      if (!doc) doc = new jsPDF({ unit: 'pt', format: [w, h], orientation, compress: true });
      else doc.addPage([w, h], orientation);
      doc.addImage(c.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, w, h, undefined, 'FAST');
    }
    doc.save(safeName(nb.title) + '.pdf');
    toast('PDF exportiert');
  } catch (err) {
    console.error(err);
    toast('PDF-Export fehlgeschlagen: ' + (err?.message || err), 5000);
  }
}
async function exportPNG() {
  const page = currentPage();
  const c = await renderPageCanvas(page, 2);
  c.toBlob((b) => download(b, `${safeName(state.nb.title)} – Seite ${state.cur + 1}.png`), 'image/png');
}
function exportBackup(nb) {
  const data = JSON.stringify({ format: 'jelly-notebook', version: 1, notebook: nb });
  download(new Blob([data], { type: 'application/json' }), safeName(nb.title) + '.jelly.json');
}
async function importBackup(file) {
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (data.format !== 'jelly-notebook' || !data.notebook?.pages) throw new Error('Unbekanntes Format');
    const nb = reId(data.notebook);
    await saveFresh(nb);
    toast('Backup importiert');
    renderLibrary();
  } catch (err) {
    console.error(err);
    toast('Backup konnte nicht geladen werden: ' + (err?.message || err), 5000);
  }
}

/* =====================================================================
   Menüs
   ===================================================================== */
let menuEl = null;
function closeMenu() {
  menuEl?.remove();
  menuEl = null;
  document.removeEventListener('pointerdown', onOutside, true);
}
function onOutside(e) { if (menuEl && !menuEl.contains(e.target)) closeMenu(); }
function openMenu(anchor, items) {
  closeMenu();
  const m = document.createElement('div');
  m.className = 'menu';
  if (items instanceof HTMLElement) m.appendChild(items);
  else for (const it of items) {
    if (it === '-') { m.insertAdjacentHTML('beforeend', '<div class="menu-sep"></div>'); continue; }
    const b = document.createElement('button');
    b.className = 'menu-item' + (it.danger ? ' danger' : '');
    b.innerHTML = (it.icon ? icon(it.icon) : '') + `<span>${esc(it.label)}</span>` + (it.check !== undefined ? `<span class="check">${it.check ? '✓' : ''}</span>` : '');
    b.onclick = () => { closeMenu(); it.action(); };
    m.appendChild(b);
  }
  document.body.appendChild(m);
  const r = anchor.getBoundingClientRect();
  const mw = m.offsetWidth, mh = m.offsetHeight;
  let left = clamp(r.right - mw, 8, window.innerWidth - mw - 8);
  if (r.left + mw < window.innerWidth - 8 && r.left < window.innerWidth / 2) left = r.left;
  let top = r.bottom + 6;
  if (top + mh > window.innerHeight - 8) top = Math.max(8, r.top - mh - 6);
  m.style.left = left + 'px';
  m.style.top = top + 'px';
  menuEl = m;
  setTimeout(() => document.addEventListener('pointerdown', onOutside, true));
}

/* =====================================================================
   UI-Verdrahtung
   ===================================================================== */
for (const el of document.querySelectorAll('[data-icon]')) el.innerHTML = icon(el.dataset.icon);

function applySidebar() {
  $('#sidebar').classList.toggle('hidden', !state.sidebar);
  $('#btn-sidebar').classList.toggle('active', state.sidebar);
  if (state.sidebar && state.nb) queueAllThumbs();
}

$('#btn-new').onclick = openNewDialog;
$('#btn-import-pdf').onclick = () => $('#file-pdf').click();
$('#btn-import-backup').onclick = () => $('#file-backup').click();
$('#file-pdf').onchange = (e) => { importPDF(e.target.files[0]); e.target.value = ''; };
$('#file-pdf-append').onchange = (e) => { appendPDF(e.target.files[0]); e.target.value = ''; };
$('#file-backup').onchange = (e) => { importBackup(e.target.files[0]); e.target.value = ''; };
$('#file-image').onchange = (e) => { insertImageFile(e.target.files[0]); e.target.value = ''; };
$('#search').addEventListener('input', () => renderLibrary());

$('#btn-back').onclick = showLibrary;
$('#btn-sidebar').onclick = () => {
  state.sidebar = !state.sidebar;
  applySidebar();
  if (!isNarrow()) savePrefs();
  if (state.fit && !isNarrow()) requestAnimationFrame(fitWidth);
};
$('#nb-title').addEventListener('input', (e) => {
  state.nb.title = e.target.value.trim() || 'Unbenanntes Notizbuch';
  document.title = state.nb.title + ' – Jelly Notes';
  scheduleSave();
});
$('#nb-title').addEventListener('keydown', (e) => { if (e.key === 'Enter') e.target.blur(); });
$('#btn-undo').onclick = undo;
$('#btn-redo').onclick = redo;
$('#btn-image').onclick = () => $('#file-image').click();
$('#btn-page').onclick = (e) => pageMenu(e.currentTarget);
$('#btn-add-page-end').onclick = () => addPage(state.nb.pages.length - 1);
$('#btn-add-page-side').onclick = () => addPage(state.nb.pages.length - 1);
$('#btn-zoom-in').onclick = () => setZoom(state.zoom * 1.2);
$('#btn-zoom-out').onclick = () => setZoom(state.zoom / 1.2);
$('#btn-zoom-fit').onclick = fitWidth;
$('#btn-export').onclick = (e) => openMenu(e.currentTarget, [
  { label: 'Als PDF exportieren', icon: 'download', action: exportPDF },
  { label: 'Aktuelle Seite als PNG', icon: 'image', action: exportPNG },
  { label: 'Backup exportieren (.json)', icon: 'file', action: async () => { await saveNow(); exportBackup(state.nb); } },
]);
$('#btn-more').onclick = (e) => openMenu(e.currentTarget, [
  { label: 'Nur Stift zeichnet (Finger scrollen)', icon: 'hand', check: state.penOnly, action: () => {
    state.penOnly = !state.penOnly;
    savePrefs();
    toast(state.penOnly ? 'Finger scrollen jetzt – nur der Stift zeichnet' : 'Finger zeichnen wieder');
  } },
  { label: 'Seitenübersicht', icon: 'sidebar', check: state.sidebar, action: () => $('#btn-sidebar').click() },
  '-',
  { label: 'Tastenkürzel', icon: 'more', action: () => ask({ title: 'Tastenkürzel', cancel: '', message:
    'P Stift · H Textmarker · E Radierer · L Lasso · S Formen · T Text\n' +
    'Strg+Z Rückgängig · Strg+Umschalt+Z Wiederholen\n' +
    'Strg+C / Strg+V Auswahl kopieren / einfügen · Entf Auswahl löschen\n' +
    'Strg + Mausrad oder Zwei-Finger-Geste: Zoomen\n' +
    'Umschalt beim Zeichnen von Formen: Quadrat / Kreis' }) },
]);

document.addEventListener('keydown', (e) => {
  if (!state.nb || $('#editor').classList.contains('hidden')) return;
  if (e.target.closest?.('input, textarea, dialog')) return;
  const mod = e.ctrlKey || e.metaKey;
  const k = e.key.toLowerCase();
  if (mod && k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
  if (mod && k === 'y') { e.preventDefault(); redo(); return; }
  if (mod && k === 'c') { if (state.selection) { e.preventDefault(); copySelection(); toast('Kopiert'); } return; }
  if (mod && k === 'x') { if (state.selection) { e.preventDefault(); copySelection(); deleteSelection(); } return; }
  if (mod && k === 'v') return; // über das paste-Event (damit auch Bilder funktionieren)
  if (mod && (k === '=' || k === '+')) { e.preventDefault(); setZoom(state.zoom * 1.2); return; }
  if (mod && k === '-') { e.preventDefault(); setZoom(state.zoom / 1.2); return; }
  if (mod && k === '0') { e.preventDefault(); fitWidth(); return; }
  if (mod || e.altKey) return;
  if ((k === 'delete' || k === 'backspace') && state.selection) { e.preventDefault(); deleteSelection(); return; }
  if (k === 'escape') { clearSelection(); closeMenu(); return; }
  const map = { p: 'pen', h: 'highlighter', e: 'eraser', l: 'lasso', s: 'shape', t: 'text' };
  if (map[k]) setTool(map[k]);
  if (k === 'pagedown') { e.preventDefault(); scrollToPage(Math.min(state.cur + 1, state.nb.pages.length - 1), true); }
  if (k === 'pageup') { e.preventDefault(); scrollToPage(Math.max(state.cur - 1, 0), true); }
});
document.addEventListener('paste', (e) => {
  if (!state.nb || $('#editor').classList.contains('hidden')) return;
  if (e.target.closest?.('input, textarea')) return;
  const file = [...(e.clipboardData?.files || [])].find((f) => f.type.startsWith('image/'));
  if (file) { e.preventDefault(); insertImageFile(file); return; }
  if (clipboard) { e.preventDefault(); paste(); }
});
// Bilder & PDFs per Drag-and-drop
for (const ev of ['dragover', 'drop']) {
  window.addEventListener(ev, (e) => {
    if (!e.dataTransfer?.types.includes('Files')) return;
    e.preventDefault();
    if (ev !== 'drop') return;
    const f = e.dataTransfer.files[0];
    if (!f) return;
    if (f.type === 'application/pdf') state.nb ? appendPDF(f) : importPDF(f);
    else if (f.type.startsWith('image/') && state.nb) insertImageFile(f);
    else if (f.name.endsWith('.json') && !state.nb) importBackup(f);
  });
}
document.addEventListener('visibilitychange', () => { if (document.hidden && saveTimer) saveNow(); });
window.addEventListener('pagehide', () => { if (saveTimer) saveNow(); });

/* =====================================================================
   Start
   ===================================================================== */
async function startApp() {
  const m = location.hash.match(/^#nb=([\w-]+)$/);
  if (m) return openNotebook(m[1]);
  const metas = await db.listMeta();
  if (!metas.length) {
    // Willkommens-Notizbuch beim ersten Start
    const nb = newNotebook({ title: 'Mein erstes Notizbuch', cover: COVERS[4], paper: 'lined' });
    const p = nb.pages[0];
    p.items.push({ id: uid(), type: 'text', x: 96, y: 52, size: 30, color: PEN_COLORS[0], text: 'Willkommen bei Jelly Notes 👋' });
    p.items.push({ id: uid(), type: 'text', x: 96, y: 136, size: 20, color: PEN_COLORS[1], text:
      'Schreibe mit dem Stift, markiere mit dem Textmarker,\nradiere ganze Striche weg und verschiebe Inhalte mit dem Lasso.\n\nTipp: Importiere PDFs, um sie zu annotieren.' });
    p.items.forEach(measureText);
    await saveFresh(nb);
  }
  showLibrary();
}

/* ---------- Konten (nur wenn Supabase in config.js eingetragen ist) ---------- */
let authMode = 'signin';
const AUTH_TEXT = {
  signin: { title: 'Anmelden', sub: 'Melde dich an, um deine Notizbücher auf jedem Gerät zu öffnen.', btn: 'Anmelden' },
  signup: { title: 'Konto erstellen', sub: 'Mit einem Konto sind deine Notizbücher sicher gespeichert und überall verfügbar.', btn: 'Konto erstellen' },
  reset: { title: 'Passwort vergessen', sub: 'Gib deine E-Mail-Adresse ein. Wir schicken dir einen Link zum Zurücksetzen.', btn: 'Link senden' },
  recovery: { title: 'Neues Passwort', sub: 'Wähle ein neues Passwort für dein Konto.', btn: 'Passwort speichern' },
};
function authMessage(err) {
  const m = String(err?.message || err || '');
  if (/invalid login credentials/i.test(m)) return 'E-Mail oder Passwort ist falsch.';
  if (/email not confirmed/i.test(m)) return 'Bitte bestätige zuerst deine E-Mail-Adresse. Den Link findest du in deinem Postfach.';
  if (/already registered|already exists/i.test(m)) return 'Für diese E-Mail gibt es schon ein Konto. Melde dich stattdessen an.';
  if (/at least 6|password should be/i.test(m)) return 'Das Passwort muss mindestens 6 Zeichen lang sein.';
  if (/rate limit|too many/i.test(m)) return 'Zu viele Versuche. Warte ein paar Minuten und versuche es dann erneut.';
  if (/invalid.*email|email.*invalid/i.test(m)) return 'Diese E-Mail-Adresse ist ungültig.';
  if (/failed to fetch|network/i.test(m)) return 'Keine Verbindung zum Server. Prüfe deine Internetverbindung.';
  return m || 'Etwas ist schiefgelaufen. Bitte versuche es erneut.';
}
function setAuthMode(mode, msg = '', ok = false) {
  authMode = mode;
  const t = AUTH_TEXT[mode];
  $('#auth-title').textContent = t.title;
  $('#auth-sub').textContent = t.sub;
  $('#auth-submit').textContent = t.btn;
  $('#f-email').hidden = mode === 'recovery';
  $('#auth-email').required = mode !== 'recovery';
  $('#f-pass').hidden = mode === 'reset';
  $('#auth-pass').required = mode !== 'reset';
  $('#auth-pass').autocomplete = mode === 'signin' ? 'current-password' : 'new-password';
  $('#f-pass2').hidden = !(mode === 'signup' || mode === 'recovery');
  $('#auth-pass2').required = !$('#f-pass2').hidden;
  $('#auth-forgot').hidden = mode !== 'signin';
  $('#auth-switch').innerHTML = mode === 'signin'
    ? 'Noch kein Konto? <button type="button" class="link" data-mode="signup">Registrieren</button>'
    : mode === 'recovery' ? '' : 'Schon ein Konto? <button type="button" class="link" data-mode="signin">Anmelden</button>';
  const el = $('#auth-msg');
  el.textContent = msg;
  el.className = 'auth-msg' + (ok ? ' ok' : '');
  $('#auth-pass').value = '';
  $('#auth-pass2').value = '';
}
function showAuth(mode = 'signin', msg = '', ok = false) {
  $('#library').classList.add('hidden');
  $('#editor').classList.add('hidden');
  $('#auth').classList.remove('hidden');
  document.title = 'Anmelden – Jelly Notes';
  setAuthMode(mode, msg, ok);
  if (mode !== 'recovery') $('#auth-email').focus();
  else $('#auth-pass').focus();
}
async function enterAccount() {
  db = cloud;
  $('#btn-account').hidden = false;
  $('#auth').classList.add('hidden');
  try { await startApp(); } catch (err) {
    console.error(err);
    showAuth('signin', 'Deine Notizbücher konnten nicht geladen werden: ' + authMessage(err));
  }
}
async function signOut() {
  if (state.nb) { await saveNow(); state.nb = null; imgCache.clear(); }
  await auth.signOut();
  $('#nb-grid').innerHTML = '';
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  showAuth('signin', 'Du wurdest abgemeldet.', true);
}
$('#auth-switch').addEventListener('click', (e) => {
  const b = e.target.closest('[data-mode]');
  if (b) setAuthMode(b.dataset.mode);
});
$('#auth-forgot').onclick = () => setAuthMode('reset');
$('#auth-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = $('#auth-email').value.trim();
  const pass = $('#auth-pass').value;
  const msg = $('#auth-msg');
  if ((authMode === 'signup' || authMode === 'recovery') && pass !== $('#auth-pass2').value) {
    msg.className = 'auth-msg';
    msg.textContent = 'Die Passwörter stimmen nicht überein.';
    return;
  }
  const btn = $('#auth-submit');
  btn.disabled = true;
  msg.className = 'auth-msg';
  msg.textContent = '';
  try {
    if (authMode === 'signin') {
      await auth.signIn(email, pass);
      await enterAccount();
    } else if (authMode === 'signup') {
      const d = await auth.signUp(email, pass);
      if (d.session) await enterAccount();
      else setAuthMode('signin', `Fast geschafft! Wir haben dir eine E-Mail an ${email} geschickt. Klicke auf den Link darin, dann kannst du dich anmelden.`, true);
    } else if (authMode === 'reset') {
      await auth.resetPassword(email);
      setAuthMode('signin', `Falls ein Konto für ${email} existiert, ist der Link zum Zurücksetzen unterwegs.`, true);
    } else if (authMode === 'recovery') {
      await auth.updatePassword(pass);
      toast('Passwort geändert');
      await enterAccount();
    }
  } catch (err) {
    console.error(err);
    msg.className = 'auth-msg';
    msg.textContent = authMessage(err);
  } finally {
    btn.disabled = false;
  }
});
$('#btn-account').onclick = (e) => openMenu(e.currentTarget, [
  { label: auth.user?.email || 'Konto', icon: 'user', action: () => {} },
  '-',
  { label: 'Abmelden', icon: 'logout', action: signOut },
]);

async function init() {
  if (!cloudConfigured) return startApp();
  // Vor auth.init merken: Supabase entfernt die Token aus der Adresse
  const recovery = /type=recovery/.test(location.hash);
  let session;
  try {
    session = await auth.init((event) => {
      if (event === 'PASSWORD_RECOVERY') showAuth('recovery');
      else if (event === 'SIGNED_OUT' && db === cloud && $('#auth').classList.contains('hidden')) {
        // In einem anderen Tab abgemeldet
        state.nb = null;
        showAuth('signin', 'Du wurdest abgemeldet.', true);
      }
    });
  } catch (err) {
    showAuth('signin', authMessage(err));
    return;
  }
  if (recovery) return showAuth('recovery');
  if (session) enterAccount();
  else showAuth('signin');
}
init();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
