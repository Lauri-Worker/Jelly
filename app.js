import { db as localDb } from './db.js';
import { cloud, auth, cloudConfigured } from './cloud.js';
import { LEGAL, NEWS, NEWS_VERSION, APP_VERSION } from './legal.js';
import { loadScanImage, detectCorners, defaultCorners, warpDocument } from './scan.js';

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
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  folderPlus: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M12 10v6M9 13h6"/>',
  move: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 13h6"/><path d="m13 11 2 2-2 2"/>',
  insert: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M12 8v8M8 12h8"/>',
  camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3.5"/>',
  scan: '<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 12h10"/>',
  pdf: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h2.5a1.5 1.5 0 0 1 0 3H8v-3zm0 3v2"/>',
  star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  chev: '<path d="m6 9 6 6 6-6"/>',
  filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
  bookmark: '<path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4.5L5 21V4a1 1 0 0 1 1-1z"/><path d="m12 7 1.2 2.4 2.6.4-1.9 1.8.5 2.6-2.4-1.3-2.4 1.3.5-2.6-1.9-1.8 2.6-.4z"/>',
  people: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7"/><path d="M18.5 14.5A6.5 6.5 0 0 1 21.5 20"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 21a2 2 0 0 0 4 0"/>',
  gridView: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/>',
  listView: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
  cloud: '<path d="M7 18a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 18 8.5a4.75 4.75 0 0 1-.5 9.5z"/><path d="m9.5 13 2 2 3.5-3.5"/>',
  cloudOff: '<path d="M7 18a4.5 4.5 0 0 1-.6-9 6 6 0 0 1 1.3-2.1M10.5 5.2A6 6 0 0 1 18 8.5a4.75 4.75 0 0 1 2.4 8.2M17.5 18H7"/><path d="m3 3 18 18"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  settings: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  shield: '<path d="M12 3 5 6v5c0 4.4 3 8.3 7 10 4-1.7 7-5.6 7-10V6z"/><path d="m9 12 2 2 4-4"/>',
  doc: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
  about: '<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 8h8M8 12h5"/><path d="m14 17 2-6 2 2-2 6"/>',
  restore: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
  chevRight: '<path d="m9 6 6 6-6 6"/>',
  palette: '<path d="M12 3a9 9 0 0 0 0 18c1.1 0 1.5-.8 1.5-1.6 0-.9-.6-1.4-.6-2.2 0-.9.7-1.4 1.6-1.4H17a4 4 0 0 0 4-4c0-4.7-4-8.8-9-8.8z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10.5" cy="7" r="1"/><circle cx="15" cy="7.5" r="1"/>',
  folderFill: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="currentColor"/>',
  home: '<path d="M4 11 12 4l8 7"/><path d="M6 9.5V20h12V9.5"/>',
  textbox: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 9h8M12 9v7"/>',
  note: '<path d="M5 4h14a1 1 0 0 1 1 1v9l-6 6H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"/><path d="M14 20v-5a1 1 0 0 1 1-1h5"/><path d="M8 9h8M8 12.5h5"/>',
  laser: '<path d="m4 20 9-9"/><path d="M13 11l2-2"/><circle cx="17.5" cy="6.5" r="2.5"/><path d="M17.5 1.5v1.5M22.5 6.5H21M21 3l-1 1M14 3l1 1"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  viewMode: '<rect x="3" y="4" width="8" height="16" rx="1.5"/><rect x="13" y="4" width="8" height="16" rx="1.5"/>',
  pagePlus: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M12 11v6M9 14h6"/>',
  moreCircle: '<circle cx="12" cy="12" r="9"/><circle cx="8" cy="12" r=".9"/><circle cx="12" cy="12" r=".9"/><circle cx="16" cy="12" r=".9"/>',
  bookmarkFill: '<path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4.5L5 21V4a1 1 0 0 1 1-1z" fill="currentColor"/>',
  shapeRec: '<path d="M4 17c2-6 5-9 8-9s5 2 8 0" stroke-dasharray="2 2.5"/><circle cx="7" cy="7" r="3"/><rect x="14" y="13" width="6" height="6" rx="1"/>',
  pen_fountain: '<path d="M12 21v-5"/><path d="M12 16 8 9l4-6 4 6z"/><circle cx="12" cy="10" r="1"/>',
  pen_ball: '<path d="M7 21 17 5"/><path d="m15 3 3 2-1.5 2.5-3-2z"/><path d="M7 21l.5-3 2 1.2z" fill="currentColor"/>',
  pen_brush: '<path d="M19 3c-4 3-7 7-8 10l2 2c3-1 7-4 10-8"/><path d="M11 13c-2 0-4 1-4 4 0 1.5-1 3-3 3 3 1 7 1 8-3z"/>',
  play: '<path d="M8 5v14l11-7z" fill="currentColor"/>',
  pause: '<rect x="7" y="5" width="3.5" height="14" rx="1" fill="currentColor"/><rect x="13.5" y="5" width="3.5" height="14" rx="1" fill="currentColor"/>',
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
    pen: { color: PEN_COLORS[0], width: 2.2, pen: 'fountain', shapeRec: false },
    highlighter: { color: HL_COLORS[0], width: 14 },
    eraser: { width: 18 },
    shape: { color: PEN_COLORS[0], width: 2.2, kind: 'rect' },
    text: { color: PEN_COLORS[0], size: 20, font: 'sans', bold: false, italic: false },
    note: { color: '#fff3a3', size: 16 },
    laser: { color: '#ff3b30' },
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
  tool: ['pen', 'highlighter', 'eraser', 'lasso', 'shape', 'text', 'note', 'laser'].includes(prefs.tool) ? prefs.tool : 'pen',
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
  libFolder: null, // geöffneter Ordner in der Bibliothek (null = oberste Ebene)
  libFilter: 'all', // 'all' | 'notebook' | 'pdf'
  libView: 'docs', // 'docs' | 'fav' | 'shared' | 'trash'
  libLayout: (() => { try { return localStorage.getItem('jelly.libLayout') || 'grid'; } catch { return 'grid'; } })(),
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
function newNotebook({ title, cover = COVERS[4], paper = 'lined', color = 'white', landscape = false, folderId = null } = {}) {
  const now = Date.now();
  return {
    id: uid(), title: title || 'Unbenanntes Notizbuch', cover, folderId, createdAt: now, updatedAt: now,
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
const pfBrush = (p) => 0.12 + p * 1.76; // Pinsel: stärkerer Druckeffekt
const PEN_TYPES = [['fountain', 'Füller'], ['ball', 'Kugelschreiber'], ['brush', 'Pinsel']];
const FONTS = {
  sans: ['Standard', FONT],
  serif: ['Serif', 'Georgia, "Times New Roman", serif'],
  mono: ['Schreibmaschine', '"SF Mono", Menlo, Consolas, "Courier New", monospace'],
  hand: ['Handschrift', '"Noteworthy", "Marker Felt", "Comic Sans MS", "Segoe Print", cursive'],
};
const NOTE_COLORS = ['#fff3a3', '#ffd1e3', '#c9f1d0', '#cfe6ff', '#ffd9b3', '#e5d4ff'];
const fontCss = (it) => `${it.italic ? 'italic ' : ''}${it.bold ? '700 ' : ''}${it.size}px ${(FONTS[it.font] || FONTS.sans)[1]}`;

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
  } else if (s.pen === 'ball' && !s.straight) {
    // Kugelschreiber: gleichmäßige Linie ohne Druck
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
      ctx.lineWidth = s.width * (s.pen === 'brush' ? pfBrush(P[i][2]) : pf(P[i][2]));
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
  } else if (it.type === 'note') {
    drawNote(ctx, it);
  } else if (it.type === 'text') {
    ctx.save();
    ctx.fillStyle = dark && it.color === PEN_COLORS[0] ? '#f2f2f2' : it.color;
    ctx.font = fontCss(it);
    ctx.textBaseline = 'top';
    const lh = it.size * 1.25;
    // Kleiner Offset gleicht die Baseline-Unterschiede zur Textarea aus
    const off = (lh - it.size) / 2;
    it.text.split('\n').forEach((line, i) => ctx.fillText(line, it.x, it.y + off + i * lh));
    ctx.restore();
  }
}

/** Bricht Text in Zeilen um, die in `maxW` passen. */
function wrapLines(ctx, text, maxW) {
  const out = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const word of para.split(/(\s+)/)) {
      const test = line + word;
      if (line && ctx.measureText(test).width > maxW) { out.push(line.trimEnd()); line = word.trimStart(); }
      else line = test;
    }
    out.push(line);
  }
  return out;
}
function drawNote(ctx, it) {
  const { x, y, w, h } = it;
  const fold = Math.min(w, h) * 0.14;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.18)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = it.color;
  ctx.beginPath();
  ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + h - fold); ctx.lineTo(x + w - fold, y + h); ctx.lineTo(x, y + h);
  ctx.closePath();
  ctx.fill();
  ctx.shadowColor = 'transparent';
  // Eselsohr
  ctx.fillStyle = 'rgba(0,0,0,.1)';
  ctx.beginPath();
  ctx.moveTo(x + w, y + h - fold); ctx.lineTo(x + w - fold, y + h - fold); ctx.lineTo(x + w - fold, y + h);
  ctx.closePath();
  ctx.fill();
  // Text
  if (it.text) {
    ctx.fillStyle = '#2a2a2e';
    ctx.font = `${it.size}px ${FONTS.hand[1]}`;
    ctx.textBaseline = 'top';
    const pad = 12, lh = it.size * 1.3;
    const lines = wrapLines(ctx, it.text, w - pad * 2);
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h - 4); ctx.clip();
    lines.forEach((l, i) => ctx.fillText(l, x + pad, y + pad + i * lh));
    ctx.restore();
  }
  ctx.restore();
}

function renderPage(ctx, page, opt = {}) {
  const nb = opt.nb || state.nb;
  const dark = page.color === 'dark';
  drawPaper(ctx, page, nb);
  for (const it of page.items) if (it.type === 'image' && it.id !== opt.skip) drawItem(ctx, it, nb, dark);
  for (const s of page.strokes) drawStroke(ctx, s, dark);
  for (const it of page.items) if (it.type === 'note' && it.id !== opt.skip) drawItem(ctx, it, nb, dark);
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
  if (it.type === 'note') return;
  measureCtx.font = fontCss(it);
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
async function makeThumb(nb, width = 480) {
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
  const p0 = nb.pages[0];
  return { id: nb.id, title: nb.title, cover: nb.cover, kind: nb.kind || 'notebook', favorite: !!nb.favorite, trashed: nb.trashed || null, ratio: p0 ? p0.h / p0.w : PAGE_H / PAGE_W, folderId: nb.folderId || null, createdAt: nb.createdAt, updatedAt: nb.updatedAt, pageCount: nb.pages.length, thumb };
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
  for (const r of nb.recordings || []) used.add(r.asset);
  const unused = Object.keys(nb.assets).filter((k) => !used.has(k));
  if (!unused.length) return;
  unused.forEach((k) => { delete nb.assets[k]; imgCache.delete(nb.id + ':' + k); });
  await db.deleteAssets(nb.id, unused.filter((k) => state.savedAssets.has(k)));
}

/* =====================================================================
   Bibliothek
   ===================================================================== */
/** Speichert das offene Notizbuch und merkt sich Zoom und Scrollposition für den Tab. */
async function leaveNotebook() {
  if (!state.nb) return;
  closeTextEditor();
  clearSelection();
  stopLaser();
  if (rec) await stopRecording();
  tabView.set(state.nb.id, { zoom: state.zoom, fit: state.fit, top: viewer.scrollTop, left: viewer.scrollLeft });
  await pruneAssets().catch(console.error);
  await saveNow();
  state.nb = null;
  imgCache.clear();
}
async function showLibrary() {
  const fromEditor = !$('#editor').classList.contains('hidden');
  await leaveNotebook();
  if (fromEditor && !reduceMotion()) {
    requestAnimationFrame(() => $('#library').animate([{ opacity: 0, transform: 'scale(.985)' }, { opacity: 1, transform: 'none' }], { duration: 280, easing: 'cubic-bezier(.2, .8, .2, 1)' }));
  }
  $('#editor').classList.add('hidden');
  $('#auth').classList.add('hidden');
  $('#library').classList.remove('hidden');
  document.title = 'Jelly Notes';
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  renderLibrary();
}

/** Helle Coverfarben bekommen dunkle Schrift. */
function isLightColor(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.68;
}

/* ---------- Ordner ---------- */
const FOLDER_COLORS = ['#3b9ae8', '#2f55b8', '#c4a0f5', '#94336f', '#a3401d', '#f2c418', '#9fe88a', '#f58bc5', '#ef4b4f', '#f7923a', '#f4f4f6', '#5a5b60', '#1c1c1f'];
const TRASH_DAYS = 30;
let folders = [];
let lastMetas = [];
let trashPurged = false;
const folderById = (id) => folders.find((f) => f.id === id);
/** Ordner-ID, die es wirklich gibt; sonst null (= oberste Ebene). */
const validFolder = (id) => (id && folderById(id) ? id : null);
function folderPath(id) {
  const path = [], seen = new Set();
  let f = folderById(id);
  while (f && !seen.has(f.id)) { seen.add(f.id); path.unshift(f); f = folderById(f.parentId); }
  return path;
}
/** true, wenn Ordner `id` gleich `ancestorId` ist oder darin liegt. */
function isInside(id, ancestorId) {
  const seen = new Set();
  let f = folderById(id);
  while (f && !seen.has(f.id)) {
    if (f.id === ancestorId) return true;
    seen.add(f.id);
    f = folderById(f.parentId);
  }
  return false;
}
/** Liegt der Ordner (oder einer darüber) im Papierkorb? */
const inTrashedFolder = (id) => folderPath(validFolder(id)).some((f) => f.trashed);
const liveFolder = (f) => !f.trashed && !inTrashedFolder(f.parentId);
const liveNb = (m) => !m.trashed && !inTrashedFolder(m.folderId);
function childCounts(id) {
  return {
    folders: folders.filter((f) => !f.trashed && validFolder(f.parentId) === id).length,
    notebooks: lastMetas.filter((m) => !m.trashed && validFolder(m.folderId) === id).length,
  };
}
function countLabel({ folders: f, notebooks: n }) {
  const parts = [];
  if (n) parts.push(`${n} ${n === 1 ? 'Dokument' : 'Dokumente'}`);
  if (f) parts.push(`${f} Ordner`);
  return parts.join(' · ') || 'Leer';
}
const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
/** Öffnet einen Ordner; dir = 1 schiebt den Inhalt von rechts herein, -1 von links. */
async function openFolder(id, dir = 1) {
  state.libView = 'docs';
  state.libFolder = validFolder(id);
  closeSearch(false);
  await renderLibrary();
  $('.lib-main').scrollTop = 0;
  if (reduceMotion()) return;
  const opts = { duration: 320, easing: 'cubic-bezier(.2, .8, .2, 1)' };
  $('#nb-grid').animate([{ transform: `translateX(${dir * 70}px)`, opacity: 0 }, { transform: 'none', opacity: 1 }], opts);
  $('#lib-title').animate([{ transform: `translateX(${dir * 30}px)`, opacity: 0 }, { transform: 'none', opacity: 1 }], opts);
}
/** Vorschau wächst vom Dokument in die Bildschirmmitte, dann blendet der Editor ein. */
async function openWithAnimation(card, id) {
  const src = card.querySelector('.doc');
  if (!src || reduceMotion() || state.libLayout === 'list') return openNotebook(id);
  const r = src.getBoundingClientRect();
  const ghost = src.cloneNode(true);
  ghost.querySelectorAll('.star, .pdf-badge').forEach((x) => x.remove());
  ghost.classList.add('open-ghost');
  Object.assign(ghost.style, { position: 'fixed', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px', margin: '0', zIndex: '90', transformOrigin: '0 0', aspectRatio: 'auto' });
  document.body.appendChild(ghost);
  const vw = window.innerWidth, vh = window.innerHeight, ratio = r.height / r.width;
  let h = vh * 0.78, w = h / ratio;
  if (w > vw * 0.8) { w = vw * 0.8; h = w * ratio; }
  const dx = (vw - w) / 2 - r.left, dy = (vh - h) / 2 + 40 - r.top, sc = w / r.width;
  const grow = ghost.animate([{ transform: 'none' }, { transform: `translate(${dx}px, ${dy}px) scale(${sc})` }], { duration: 380, easing: 'cubic-bezier(.2, .8, .2, 1)', fill: 'forwards' });
  const fade = $('.lib-content').animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' });
  await Promise.all([grow.finished, openNotebook(id)]);
  $('#editor').animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: 'ease-out' });
  ghost.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, fill: 'forwards' }).finished.then(() => ghost.remove());
  fade.cancel();
}
// Antipp-Hervorhebung in der Bibliothek
$('#nb-grid').addEventListener('pointerdown', (e) => {
  const card = e.target.closest('.nb-card');
  if (!card || e.target.closest('.star, .nb-more')) return;
  card.classList.add('pressed');
  const off = () => { setTimeout(() => card.classList.remove('pressed'), 160); card.removeEventListener('pointerup', off); card.removeEventListener('pointercancel', off); card.removeEventListener('pointerleave', off); };
  card.addEventListener('pointerup', off);
  card.addEventListener('pointercancel', off);
  card.addEventListener('pointerleave', off);
});
function setLibView(v) {
  state.libView = v;
  closeSearch(false);
  if (isNarrowLib()) setLibSide(false);
  renderLibrary();
  $('.lib-main').scrollTop = 0;
}
async function createFolder() {
  const name = await ask({ title: 'Neuer Ordner', input: 'Neuer Ordner', ok: 'Erstellen' });
  if (!name?.trim()) return;
  const now = Date.now();
  const f = { id: uid(), name: name.trim(), parentId: state.libView === 'docs' ? state.libFolder : null, color: FOLDER_COLORS[0], createdAt: now, updatedAt: now };
  await db.saveFolder(f);
  renderLibrary();
}
async function moveItem(item, dest) {
  dest = validFolder(dest);
  if (item.type === 'folder') {
    const f = folderById(item.id);
    if (!f || validFolder(f.parentId) === dest) return;
    if (dest && isInside(dest, f.id)) { toast('Ein Ordner kann nicht in sich selbst verschoben werden'); return; }
    f.parentId = dest;
    f.updatedAt = Date.now();
    await db.saveFolder(f);
  } else {
    const m = lastMetas.find((x) => x.id === item.id);
    if (!m || validFolder(m.folderId) === dest) return;
    await db.patchNotebook(item.id, { folderId: dest });
  }
  toast(`Verschoben nach „${dest ? folderById(dest).name : 'Dokumente'}“`);
  renderLibrary();
}

/* ---------- Papierkorb ---------- */
async function trashFolder(f) {
  f.trashed = Date.now();
  await db.saveFolder(f);
  if (state.libFolder && isInside(state.libFolder, f.id)) state.libFolder = validFolder(f.parentId);
  toast('Ordner in den Papierkorb verschoben');
  renderLibrary();
}
async function trashNotebook(m) {
  await db.patchNotebook(m.id, { trashed: Date.now() });
  removeTab(m.id);
  toast('In den Papierkorb verschoben');
  renderLibrary();
}
async function restoreItem(type, item) {
  if (type === 'folder') {
    item.trashed = null;
    if (inTrashedFolder(item.parentId)) item.parentId = null;
    await db.saveFolder(item);
  } else {
    await db.patchNotebook(item.id, inTrashedFolder(item.folderId) ? { trashed: null, folderId: null } : { trashed: null });
  }
  toast('Wiederhergestellt');
  renderLibrary();
}
/** Löscht einen Ordner samt Inhalt endgültig. */
async function destroyFolder(f) {
  for (const sub of folders.filter((x) => x.parentId === f.id)) await destroyFolder(sub);
  for (const m of lastMetas.filter((x) => x.folderId === f.id)) await db.deleteNotebook(m.id);
  await db.deleteFolder(f.id);
}
function trashTop() {
  return {
    folders: folders.filter((f) => f.trashed && !inTrashedFolder(f.parentId)),
    notebooks: lastMetas.filter((m) => m.trashed && !inTrashedFolder(m.folderId)),
  };
}
async function emptyTrash() {
  const t = trashTop();
  const n = t.folders.length + t.notebooks.length;
  if (!n) return;
  if (!(await ask({ title: 'Papierkorb leeren?', message: `${n} ${n === 1 ? 'Element wird' : 'Elemente werden'} endgültig gelöscht. Das lässt sich nicht rückgängig machen.`, ok: 'Endgültig löschen', danger: true }))) return;
  for (const f of t.folders) await destroyFolder(f);
  for (const m of t.notebooks) await db.deleteNotebook(m.id);
  toast('Papierkorb geleert');
  renderLibrary();
}
async function purgeOldTrash() {
  const limit = Date.now() - TRASH_DAYS * 864e5;
  let n = 0;
  for (const f of folders.filter((x) => x.trashed && x.trashed < limit)) { await destroyFolder(f); n++; }
  for (const m of lastMetas.filter((x) => x.trashed && x.trashed < limit)) { await db.deleteNotebook(m.id); n++; }
  return n;
}
const daysLeft = (ts) => Math.max(0, Math.ceil((ts + TRASH_DAYS * 864e5 - Date.now()) / 864e5));
function trashMenu(anchor, type, item) {
  openMenu(anchor, [
    { label: 'Wiederherstellen', icon: 'restore', action: () => restoreItem(type, item) },
    '-',
    { label: 'Endgültig löschen', icon: 'trash', danger: true, action: async () => {
      const name = type === 'folder' ? item.name : item.title;
      if (!(await ask({ title: 'Endgültig löschen?', message: `„${name}“${type === 'folder' ? ' und sein Inhalt werden' : ' wird'} endgültig gelöscht.`, ok: 'Löschen', danger: true }))) return;
      if (type === 'folder') await destroyFolder(item); else await db.deleteNotebook(item.id);
      renderLibrary();
    } },
  ]);
}

function folderMenu(anchor, f) {
  openMenu(anchor, [
    { label: 'Öffnen', icon: 'folder', action: () => openFolder(f.id) },
    { label: f.favorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten', icon: 'star', action: async () => { f.favorite = !f.favorite; await db.saveFolder(f); renderLibrary(); } },
    { label: 'Umbenennen', icon: 'edit', action: async () => {
      const t = await ask({ title: 'Ordner umbenennen', input: f.name, ok: 'Speichern' });
      if (!t?.trim()) return;
      f.name = t.trim();
      f.updatedAt = Date.now();
      await db.saveFolder(f);
      renderLibrary();
    } },
    { label: 'Farbe ändern', icon: 'palette', action: () => folderColorMenu(anchor, f) },
    { label: 'Verschieben nach …', icon: 'move', action: () => moveDialog({ type: 'folder', id: f.id, name: f.name }) },
    '-',
    { label: 'In den Papierkorb', icon: 'trash', danger: true, action: () => trashFolder(f) },
  ]);
}
function folderColorMenu(anchor, f) {
  const el = document.createElement('div');
  el.innerHTML = '<div class="menu-title">Ordnerfarbe</div>';
  const sw = document.createElement('div');
  sw.className = 'swatches folder-swatches';
  for (const c of FOLDER_COLORS) {
    const b = document.createElement('button');
    b.className = 'swatch' + (c === f.color ? ' active' : '');
    b.style.setProperty('--c', c);
    b.title = c;
    b.onclick = async () => { closeMenu(); f.color = c; await db.saveFolder(f); renderLibrary(); };
    sw.appendChild(b);
  }
  el.appendChild(sw);
  openMenu(anchor, el);
}
/** Dialog mit Ordnerbaum, um ein Notizbuch oder einen Ordner zu verschieben. */
function moveDialog(item) {
  const current = item.type === 'folder' ? validFolder(folderById(item.id)?.parentId) : validFolder(lastMetas.find((m) => m.id === item.id)?.folderId);
  const dlg = document.createElement('dialog');
  dlg.innerHTML = `<form method="dialog" class="dlg">
    <h2>„${esc(item.name)}“ verschieben</h2>
    <div class="folder-tree" role="list"></div>
    <div class="dlg-actions"><button class="btn ghost" value="cancel">Abbrechen</button></div></form>`;
  const tree = dlg.querySelector('.folder-tree');
  const row = (id, name, depth, color) => {
    const blocked = item.type === 'folder' && id && isInside(id, item.id);
    const here = id === current;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tree-row';
    b.disabled = blocked || here;
    b.style.paddingLeft = 12 + depth * 22 + 'px';
    b.innerHTML = `<span class="tree-ic" style="color:${color || 'var(--accent)'}">${icon(id ? 'folderFill' : 'folder')}</span><span>${esc(name)}</span>${here ? '<span class="tree-hint">aktuell</span>' : ''}`;
    b.onclick = () => { dlg.close(); moveItem(item, id); };
    tree.appendChild(b);
  };
  row(null, 'Dokumente', 0);
  const walk = (parent, depth) => {
    folders.filter((f) => liveFolder(f) && validFolder(f.parentId) === parent)
      .sort((a, b) => a.name.localeCompare(b.name, 'de'))
      .forEach((f) => { row(f.id, f.name, depth, f.color); walk(f.id, depth + 1); });
  };
  walk(null, 1);
  dlg.addEventListener('close', () => dlg.remove());
  document.body.appendChild(dlg);
  dlg.showModal();
}

/* Drag-and-drop in der Bibliothek */
let libDrag = null;
function makeDraggable(el, item) {
  el.draggable = true;
  el.addEventListener('dragstart', (e) => {
    libDrag = item;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.name);
    el.classList.add('dragging');
  });
  el.addEventListener('dragend', () => { libDrag = null; el.classList.remove('dragging'); });
}
function makeDropTarget(el, folderId) {
  el.addEventListener('dragover', (e) => {
    if (!libDrag || (libDrag.type === 'folder' && folderId && isInside(folderId, libDrag.id))) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    el.classList.add('drop-over');
  });
  el.addEventListener('dragleave', () => el.classList.remove('drop-over'));
  el.addEventListener('drop', (e) => {
    el.classList.remove('drop-over');
    if (!libDrag) return;
    e.preventDefault();
    e.stopPropagation();
    const item = libDrag;
    libDrag = null;
    moveItem(item, folderId);
  });
}

/* ---------- Bibliothek zeichnen ---------- */
const TYPE_FILTERS = { all: 'Alle', notebook: 'Notizbücher', pdf: 'PDFs' };
const isPdf = (m) => m.kind === 'pdf';
const matchesType = (m) => state.libFilter === 'all' || (state.libFilter === 'pdf' ? isPdf(m) : !isPdf(m));

async function renderLibrary() {
  const q = $('#search-wrap').hidden ? '' : $('#search').value.trim().toLowerCase();
  let [metas, fl] = await Promise.all([db.listMeta(), db.listFolders()]);
  folders = fl;
  lastMetas = metas;
  if (!trashPurged) {
    trashPurged = true;
    if (await purgeOldTrash()) [metas, fl] = await Promise.all([db.listMeta(), db.listFolders()]);
    folders = fl;
    lastMetas = metas;
  }
  if (state.libFolder && (!folderById(state.libFolder) || !liveFolder(folderById(state.libFolder)))) state.libFolder = null;
  const view = state.libView;
  const cur = state.libFolder;
  const path = folderPath(cur);

  // Kopfbereich
  $('#lib-title').textContent = q ? 'Suchergebnisse'
    : view === 'fav' ? 'Favoriten' : view === 'shared' ? 'Geteilt' : view === 'trash' ? 'Papierkorb'
      : (path.length ? path[path.length - 1].name : 'Dokumente');
  $('#btn-lib-back').hidden = !((view === 'docs' && cur && !q) || view === 'trash');
  document.querySelectorAll('.side-item').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
  $('#lib-filter-label').textContent = TYPE_FILTERS[state.libFilter];
  $('#lib-filter').hidden = view === 'shared' || view === 'trash';
  $('#btn-new').hidden = view === 'shared' || view === 'trash';
  const trash = trashTop();
  $('#btn-empty-trash').hidden = view !== 'trash' || !(trash.folders.length + trash.notebooks.length);
  $('#btn-layout').innerHTML = icon(state.libLayout === 'list' ? 'listView' : 'gridView');
  $('#btn-layout').title = state.libLayout === 'list' ? 'Als Raster anzeigen' : 'Als Liste anzeigen';
  const note = $('#lib-note');
  note.hidden = view !== 'trash';
  note.textContent = `Elemente im Papierkorb werden nach ${TRASH_DAYS} Tagen endgültig gelöscht.`;

  let shownFolders = [], shownNbs = [];
  if (view === 'trash') {
    shownFolders = trash.folders;
    shownNbs = trash.notebooks;
  } else if (view === 'shared') {
    // Teilen ist noch nicht verfügbar
  } else if (q) {
    shownFolders = folders.filter((f) => liveFolder(f) && f.name.toLowerCase().includes(q));
    shownNbs = metas.filter((m) => liveNb(m) && m.title.toLowerCase().includes(q));
  } else if (view === 'fav') {
    shownFolders = folders.filter((f) => liveFolder(f) && f.favorite);
    shownNbs = metas.filter((m) => liveNb(m) && m.favorite);
  } else {
    shownFolders = folders.filter((f) => liveFolder(f) && validFolder(f.parentId) === cur);
    shownNbs = metas.filter((m) => liveNb(m) && validFolder(m.folderId) === cur);
  }
  if (view !== 'trash') shownNbs = shownNbs.filter(matchesType);
  if (view !== 'trash' && state.libFilter !== 'all') shownFolders = view === 'docs' && !q ? shownFolders : [];
  shownFolders.sort((a, b) => a.name.localeCompare(b.name, 'de'));
  shownNbs.sort((a, b) => b.updatedAt - a.updatedAt);
  const where = (id) => folderPath(id).map((f) => f.name).join(' › ') || 'Dokumente';
  const inTrash = view === 'trash';
  const metaText = (ts, parent, trashed) => inTrash ? `Noch ${daysLeft(trashed)} ${daysLeft(trashed) === 1 ? 'Tag' : 'Tage'}`
    : (q || view === 'fav') ? esc(where(parent)) : dateFmt.format(ts);
  const star = (on, label) => inTrash ? '' : `<button class="star${on ? ' on' : ''}" title="${on ? 'Aus Favoriten entfernen' : 'Zu Favoriten'}" aria-label="${label} ${on ? 'aus Favoriten entfernen' : 'zu Favoriten hinzufügen'}" aria-pressed="${on}">${icon('star')}</button>`;
  const label = (title, meta) => `
    <div class="nb-info">
      <div class="item-title"><span class="nb-title">${esc(title)}</span><button class="nb-more" title="Optionen" aria-label="Optionen für ${esc(title)}">${icon('chev')}</button></div>
      <div class="nb-meta">${meta}</div>
    </div>`;

  const grid = $('#nb-grid');
  grid.classList.toggle('list', state.libLayout === 'list');
  grid.innerHTML = '';
  for (const f of shownFolders) {
    const card = document.createElement('div');
    card.className = 'nb-card folder-card';
    const c = childCounts(f.id);
    const n = c.folders + c.notebooks;
    const col = f.color || FOLDER_COLORS[0];
    card.innerHTML = `
      <div class="item-slot">
        <div class="folder-ico${isLightColor(col) ? ' light' : ''}" style="--fc:${col}">
          <div class="folder-ico-back"></div>
          <div class="folder-ico-front">${n && !inTrash ? `<span class="folder-count">${n}</span>` : ''}</div>
          ${star(!!f.favorite, esc(f.name))}
        </div>
      </div>
      ${label(f.name, metaText(f.updatedAt || f.createdAt, f.parentId, f.trashed))}`;
    card.onclick = (e) => {
      if (e.target.closest('.star')) return;
      if (inTrash) { trashMenu(card.querySelector('.nb-more'), 'folder', f); return; }
      if (!e.target.closest('.nb-more')) openFolder(f.id, 1);
    };
    card.querySelector('.nb-more').onclick = (e) => { e.stopPropagation(); inTrash ? trashMenu(e.currentTarget, 'folder', f) : folderMenu(e.currentTarget, f); };
    card.querySelector('.star')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      f.favorite = !f.favorite;
      await db.saveFolder(f);
      renderLibrary();
    });
    if (!inTrash) { makeDraggable(card, { type: 'folder', id: f.id, name: f.name }); makeDropTarget(card, f.id); }
    grid.appendChild(card);
  }
  for (const m of shownNbs) {
    const card = document.createElement('div');
    card.className = 'nb-card';
    const colored = m.cover && m.cover !== 'none' && !isPdf(m);
    const ratio = m.ratio || PAGE_H / PAGE_W;
    const shape = colored ? 'doc-cover' : 'doc-page';
    const orient = colored || ratio >= 1 ? 'portrait' : 'landscape';
    const ar = colored ? '3 / 4' : `1 / ${ratio.toFixed(4)}`;
    card.innerHTML = `
      <div class="item-slot">
        <div class="doc ${shape} ${orient}${colored && isLightColor(m.cover) ? ' light' : ''}" style="--cover:${colored ? m.cover : '#fff'};aspect-ratio:${ar}">
          ${colored ? '' : (m.thumb ? `<img src="${m.thumb}" alt="" draggable="false">` : '')}
          ${isPdf(m) ? '<span class="pdf-badge">PDF</span>' : ''}
          ${star(!!m.favorite, esc(m.title))}
        </div>
      </div>
      ${label(m.title, metaText(m.updatedAt, validFolder(m.folderId), m.trashed))}`;
    card.onclick = (e) => {
      if (e.target.closest('.star')) return;
      if (inTrash) { trashMenu(card.querySelector('.nb-more'), 'notebook', m); return; }
      if (!e.target.closest('.nb-more')) openWithAnimation(card, m.id);
    };
    card.querySelector('.nb-more').onclick = (e) => { e.stopPropagation(); inTrash ? trashMenu(e.currentTarget, 'notebook', m) : notebookMenu(e.currentTarget, m); };
    card.querySelector('.star')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      await db.patchNotebook(m.id, { favorite: !m.favorite });
      renderLibrary();
    });
    if (!inTrash) makeDraggable(card, { type: 'notebook', id: m.id, name: m.title });
    grid.appendChild(card);
  }
  if (!shownFolders.length && !shownNbs.length) {
    const typeWord = state.libFilter === 'pdf' ? 'PDFs' : state.libFilter === 'notebook' ? 'Notizbücher' : 'Dokumente';
    const [ic, h, p] = q ? ['search', 'Keine Treffer', `Für „${esc(q)}“ wurde nichts gefunden.`]
      : view === 'trash' ? ['trash', 'Der Papierkorb ist leer', 'Gelöschte Notizbücher, PDFs und Ordner landen hier und können wiederhergestellt werden.']
        : view === 'shared' ? ['people', 'Noch nichts geteilt', 'Hier erscheinen später Dokumente, die du mit anderen teilst. Das Teilen ist noch nicht verfügbar – bis dahin kannst du Dokumente über ⌄ → „Als PDF exportieren“ weitergeben.']
          : view === 'fav' ? ['bookmark', 'Noch keine Favoriten', 'Tippe bei einem Notizbuch, PDF oder Ordner auf den <b>Stern</b>, damit es hier erscheint.']
            : state.libFilter !== 'all' ? ['filter', `Keine ${typeWord}`, `Hier gibt es keine ${typeWord}. Stelle den Filter oben links auf <b>Alle</b>.`]
              : cur ? ['folder', 'Dieser Ordner ist leer', 'Tippe auf <b>+ Neu</b>, um hier ein Notizbuch, ein PDF oder einen Ordner anzulegen, oder verschiebe etwas hierher.']
                : ['folder', 'Noch keine Dokumente', 'Tippe auf <b>+ Neu</b>, um ein Notizbuch anzulegen, ein PDF hinzuzufügen oder ein Dokument zu scannen.'];
    grid.innerHTML = `<div class="lib-empty"><span class="lib-empty-ic">${icon(ic)}</span><h2>${h}</h2><p>${p}</p></div>`;
  }
}

function notebookMenu(anchor, m) {
  openMenu(anchor, [
    { label: 'Öffnen', icon: 'page', action: () => openNotebook(m.id) },
    { label: m.favorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten', icon: 'star', action: async () => { await db.patchNotebook(m.id, { favorite: !m.favorite }); renderLibrary(); } },
    { label: 'Umbenennen', icon: 'edit', action: async () => {
      const t = await ask({ title: 'Umbenennen', input: m.title, ok: 'Speichern' });
      if (!t?.trim()) return;
      await db.patchNotebook(m.id, { title: t.trim() });
      renderLibrary();
    } },
    ...(isPdf(m) ? [] : [{ label: 'Cover ändern', icon: 'palette', action: () => coverMenu(anchor, m) }]),
    { label: 'Verschieben nach …', icon: 'move', action: () => moveDialog({ type: 'notebook', id: m.id, name: m.title }) },
    { label: 'Duplizieren', icon: 'copy', action: async () => {
      const nb = await db.loadNotebook(m.id);
      const copy = reId(nb);
      copy.title = nb.title + ' (Kopie)';
      copy.favorite = false;
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
    { label: 'In den Papierkorb', icon: 'trash', danger: true, action: () => trashNotebook(m) },
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
    const nb = newNotebook({ title: $('#new-title').value.trim(), ...sel, folderId: targetFolder() });
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
  if (state.nb?.id === id) return;
  await leaveNotebook();
  const nb = await db.loadNotebook(id);
  if (!nb) { toast('Notizbuch nicht gefunden'); removeTab(id); return showLibrary(); }
  addTab(nb);
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
  viewer.classList.toggle('horizontal', getPageLayout() === 'horizontal');
  $('#page-ind').classList.toggle('left', isHorizontal());
  buildPages();
  const tv = tabView.get(id);
  if (tv && !tv.fit) { setZoom(tv.zoom, undefined, undefined); } else fitWidth();
  viewer.scrollTop = tv ? tv.top : 0;
  viewer.scrollLeft = tv ? tv.left : 0;
  if (isHorizontal() && !tv) scrollToPage(0);
  buildThumbs();
  updateCurrent();
  renderTabs();
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
  stopLaser();
  io.disconnect();
  views.clear();
  pagesEl.innerHTML = '';
  for (const page of state.nb.pages) {
    const wrap = document.createElement('div');
    wrap.className = 'page t-' + state.tool;
    wrap.dataset.id = page.id;
    const canvas = document.createElement('canvas');
    wrap.appendChild(canvas);
    if (page.bookmarked) wrap.insertAdjacentHTML('beforeend', `<button class="page-ribbon" title="Lesezeichen entfernen" aria-label="Lesezeichen entfernen">${icon('bookmarkFill')}</button>`);
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
  // Beim Blättern liegen die Nachbarseiten außerhalb des Bildschirms und gleiten erst beim Wischen herein
  if (isHorizontal() && state.nb) {
    const maxW = Math.max(...state.nb.pages.map((p) => p.w)) * z;
    pagesEl.style.gap = Math.max(56, Math.round((viewer.clientWidth - maxW) / 2 + 24)) + 'px';
  } else pagesEl.style.gap = '';
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
/* ---------- Blättern (horizontal) ---------- */
const isHorizontal = () => viewer.classList.contains('horizontal');
function getPageLayout() { try { return localStorage.getItem('jelly.pageLayout') || 'horizontal'; } catch { return 'horizontal'; } }
function setPageLayout(mode) {
  try { localStorage.setItem('jelly.pageLayout', mode); } catch { /* */ }
  applyPageLayout();
}
function applyPageLayout() {
  const cur = state.cur;
  viewer.classList.toggle('horizontal', getPageLayout() === 'horizontal');
  $('#page-ind').classList.toggle('left', isHorizontal());
  if (!state.nb) return;
  fitWidth();
  scrollToPage(cur);
  updateCurrent();
}
/** Ganze Seite passend in den sichtbaren Bereich (für das Blättern). */
function fitHeight() {
  const p = currentPage();
  const top = isNarrow() ? 70 : 84, bottom = 56;
  const z = Math.min((viewer.clientHeight - top - bottom) / p.h, (viewer.clientWidth - 80) / p.w);
  state.fit = true;
  state.fitZoom = clamp(z, 0.2, 2);
  setZoom(state.fitZoom, undefined, undefined, true);
}
let scrollAnim = 0;
function animateScrollLeft(target, dur = 340) {
  cancelAnimationFrame(scrollAnim);
  const from = viewer.scrollLeft, delta = target - from, t0 = performance.now();
  if (Math.abs(delta) < 1) return;
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  const step = (now) => {
    const t = Math.min(1, (now - t0) / dur);
    viewer.scrollLeft = from + delta * ease(t);
    if (t < 1) scrollAnim = requestAnimationFrame(step);
  };
  scrollAnim = requestAnimationFrame(step);
}
function pageCenterLeft(i) {
  const v = views.get(state.nb.pages[i]?.id);
  return v ? v.wrap.offsetLeft + v.wrap.offsetWidth / 2 - viewer.clientWidth / 2 : 0;
}
/** Nach dem Wischen auf die nächste Seite einrasten (vx = Wischgeschwindigkeit in px/ms). */
function snapPage(vx = 0) {
  if (!isHorizontal() || !state.nb) return;
  if (state.fitZoom && state.zoom > state.fitZoom * 1.08) return; // gezoomt: frei verschieben
  const center = viewer.scrollLeft + viewer.clientWidth / 2;
  let nearest = 0, best = Infinity;
  state.nb.pages.forEach((p, i) => {
    const v = views.get(p.id);
    if (!v) return;
    const d = Math.abs(v.wrap.offsetLeft + v.wrap.offsetWidth / 2 - center);
    if (d < best) { best = d; nearest = i; }
  });
  let target = nearest;
  if (Math.abs(vx) > 0.35) {
    const dir = vx < 0 ? 1 : -1;
    const curCenter = pageCenterLeft(nearest) + viewer.clientWidth / 2;
    // In Wischrichtung weiter, falls die nächste Seite noch nicht erreicht ist
    if ((dir > 0 && center >= curCenter - 4) || (dir < 0 && center <= curCenter + 4)) target = nearest + dir;
  }
  target = clamp(target, 0, state.nb.pages.length - 1);
  animateScrollLeft(pageCenterLeft(target));
}
let wheelSnapTimer = 0;
viewer.addEventListener('wheel', (e) => {
  if (!isHorizontal() || e.ctrlKey || e.metaKey) return;
  clearTimeout(wheelSnapTimer);
  wheelSnapTimer = setTimeout(() => snapPage(0), 160);
}, { passive: true });
// Apple Pencil erkannt: Finger blättern und scrollen, der Stift schreibt
function autoPenOnly(e) {
  if (e.pointerType !== 'pen' || state.penOnly) return;
  let asked = false;
  try { asked = localStorage.getItem('jelly.penAuto') === '1'; } catch { /* */ }
  if (asked) return;
  try { localStorage.setItem('jelly.penAuto', '1'); } catch { /* */ }
  state.penOnly = true;
  savePrefs();
  toast('Stift erkannt: Mit dem Finger blätterst und scrollst du jetzt, der Stift schreibt. Ändern unter Ansicht.', 5000);
}

function fitWidth() {
  if (!state.nb) return;
  if (isHorizontal()) return fitHeight();
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
  const horiz = isHorizontal();
  for (const v of views.values()) {
    const r = v.wrap.getBoundingClientRect();
    if (horiz ? (cx >= r.left - 24 && cx <= r.right + 24) : (cy >= r.top - 14 && cy <= r.bottom + 14)) {
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
  if (isHorizontal()) {
    if (smooth) animateScrollLeft(pageCenterLeft(i), 420);
    else viewer.scrollLeft = pageCenterLeft(i);
    return;
  }
  viewer.scrollTo({ top: v.wrap.offsetTop - 16, behavior: smooth ? 'smooth' : 'auto' });
}
let curRaf = 0;
function updateCurrent() {
  curRaf = 0;
  if (!state.nb) return;
  const vr = viewer.getBoundingClientRect();
  const horiz = isHorizontal();
  const cy = vr.top + vr.height * 0.4, cx = vr.left + vr.width / 2;
  let best = 0;
  state.nb.pages.forEach((p, i) => {
    const v = views.get(p.id);
    if (!v) return;
    const r = v.wrap.getBoundingClientRect();
    if (horiz ? r.left - 24 <= cx : r.top <= cy) best = i;
  });
  const changed = best !== state.cur;
  state.cur = best;
  $('#page-ind').textContent = horiz ? `${best + 1} von ${state.nb.pages.length}` : `${best + 1} / ${state.nb.pages.length}`;
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
window.addEventListener('resize', () => {
  if (!state.nb || !state.fit) return;
  const cur = state.cur;
  fitWidth();
  if (isHorizontal()) scrollToPage(cur);
});

/* ---------- Miniaturen ---------- */
const thumbQueue = new Set();
let thumbTimer = 0;
function buildThumbs() {
  const el = $('#thumbs');
  el.innerHTML = '';
  state.nb.pages.forEach((p, i) => {
    const d = document.createElement('div');
    d.className = 'thumb' + (p.bookmarked ? ' bookmarked' : '');
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

const TEXT_SIZE_LIST = [10, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 64, 72];
const LASER_COLORS = ['#ff3b30', '#2f6bff', '#22c55e'];
function paletteFor(t) {
  return t === 'highlighter' ? HL_COLORS : t === 'note' ? NOTE_COLORS : t === 'laser' ? LASER_COLORS : PEN_COLORS;
}
/** Wendet geänderte Textoptionen auch auf das gerade bearbeitete Textfeld an. */
function applyTextCfgToEditing() {
  if (!editing || editing.item.type !== 'text') return;
  const c = state.tools.text;
  Object.assign(editing.item, { size: c.size, color: c.color, font: c.font, bold: c.bold, italic: c.italic });
  positionTextEditor();
  editing.fit?.();
}
function renderOptions() {
  const t = state.tool, cfg = state.tools[t];
  const o = $('#options');
  let html = '';
  if (t === 'pen') {
    const cur = PEN_TYPES.find(([k]) => k === cfg.pen) || PEN_TYPES[0];
    html += `<button class="opt-drop" data-act="pentype" title="Stiftart">${icon('pen_' + cur[0])}<span>${cur[1]}</span>${icon('chev')}</button>`;
    html += `<button class="wbtn ${cfg.shapeRec ? 'active' : ''}" data-act="shaperec" title="Formerkennung: gezeichnete Linien, Kreise und Rechtecke werden begradigt">${icon('shapeRec')}</button>`;
    html += '<span class="opt-sep"></span>';
  }
  if (t === 'shape') {
    html += SHAPES.map(([k, n]) => `<button class="wbtn ${cfg.kind === k ? 'active' : ''}" data-shape="${k}" title="${n}">${icon(k)}</button>`).join('');
    html += '<span class="opt-sep"></span>';
  }
  if (t === 'text') {
    const f = FONTS[cfg.font] || FONTS.sans;
    html += `<button class="opt-drop" data-act="font" title="Schriftart"><span style="font-family:${f[1].replace(/"/g, "'")}">Aa</span><span>${f[0]}</span>${icon('chev')}</button>`;
    html += `<div class="stepper"><button class="wbtn" data-act="size-" title="Kleiner">${icon('minus')}</button><button class="opt-drop size-val" data-act="sizes" title="Schriftgröße">${cfg.size}<small>pt</small></button><button class="wbtn" data-act="size+" title="Größer">${icon('plus')}</button></div>`;
    html += `<button class="wbtn ${cfg.bold ? 'active' : ''}" data-act="bold" title="Fett"><b style="font-size:17px">B</b></button>`;
    html += `<button class="wbtn ${cfg.italic ? 'active' : ''}" data-act="italic" title="Kursiv"><i style="font-size:17px;font-family:Georgia,serif">I</i></button>`;
    html += '<span class="opt-sep"></span>';
  }
  if (t === 'note') {
    html += [[14, 'Klein'], [16, 'Mittel'], [20, 'Groß']].map(([sz, n], i) => `<button class="wbtn ${cfg.size === sz ? 'active' : ''}" data-size="${sz}" title="Schrift ${n}"><span style="font-size:${[12, 15, 19][i]}px;font-weight:600">A</span></button>`).join('');
    html += '<span class="opt-sep"></span>';
  }
  if (cfg && 'color' in cfg) {
    const colors = paletteFor(t);
    html += colors.map((c) => `<button class="swatch ${c === cfg.color ? 'active' : ''}" style="--c:${c}" data-color="${c}" title="${c}"></button>`).join('');
    if (t !== 'laser') {
      const custom = !colors.includes(cfg.color);
      html += `<label class="swatch custom ${custom ? 'active' : ''}" title="Eigene Farbe" ${custom ? `style="background:${cfg.color}"` : ''}><input type="color" value="${cfg.color}"></label>`;
    }
  }
  if (WIDTHS[t]) {
    html += '<span class="opt-sep"></span>';
    html += WIDTHS[t].map((w, i) => {
      const d = [5, 9, 14][i];
      return `<button class="wbtn ${cfg.width === w ? 'active' : ''}" data-width="${w}" title="Stärke ${i + 1}"><span class="dot" style="width:${d}px;height:${d}px"></span></button>`;
    }).join('');
  }
  if (t === 'text') html += '<span class="opt-hint">Tippe auf die Seite, um zu schreiben</span>';
  if (t === 'note') html += '<span class="opt-hint">Tippe auf die Seite für eine Haftnotiz</span>';
  if (t === 'laser') html += '<span class="opt-hint">Zeigen ohne zu schreiben – die Spur verblasst</span>';
  if (t === 'eraser') html += '<span class="opt-hint">Radiert ganze Striche</span>';
  if (t === 'lasso') html += '<span class="opt-hint">Umkreise Inhalte zum Verschieben, Skalieren oder Kopieren</span>';
  o.innerHTML = html;
  const ci = o.querySelector('input[type=color]');
  if (ci) ci.addEventListener('input', (e) => {
    cfg.color = e.target.value;
    e.target.parentElement.style.background = cfg.color;
    o.querySelectorAll('.swatch').forEach((sw) => sw.classList.remove('active'));
    e.target.parentElement.classList.add('active');
    if (t === 'text') applyTextCfgToEditing();
    savePrefs();
  });
}
for (const ev of ['mousedown', 'pointerdown']) {
  document.addEventListener(ev, (e) => { if (editing && e.target.closest?.('#options, .menu')) e.preventDefault(); }, true);
}
$('#options').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  const t = state.tool, cfg = state.tools[t];
  const done = () => { if (t === 'text') applyTextCfgToEditing(); renderOptions(); savePrefs(); };
  if (b.dataset.color) cfg.color = b.dataset.color;
  else if (b.dataset.width) cfg.width = +b.dataset.width;
  else if (b.dataset.size) cfg.size = +b.dataset.size;
  else if (b.dataset.shape) cfg.kind = b.dataset.shape;
  else if (b.dataset.act === 'shaperec') {
    cfg.shapeRec = !cfg.shapeRec;
    toast(cfg.shapeRec ? 'Formerkennung an: Linien, Kreise und Rechtecke werden begradigt' : 'Formerkennung aus');
  } else if (b.dataset.act === 'bold') cfg.bold = !cfg.bold;
  else if (b.dataset.act === 'italic') cfg.italic = !cfg.italic;
  else if (b.dataset.act === 'size-' || b.dataset.act === 'size+') {
    const i = TEXT_SIZE_LIST.findIndex((x) => x >= cfg.size);
    const idx = b.dataset.act === 'size+' ? Math.min(TEXT_SIZE_LIST.length - 1, (TEXT_SIZE_LIST[i] === cfg.size ? i : i - 1) + 1) : Math.max(0, (i < 0 ? TEXT_SIZE_LIST.length : i) - 1);
    cfg.size = TEXT_SIZE_LIST[idx];
  } else if (b.dataset.act === 'sizes') {
    openMenu(b, TEXT_SIZE_LIST.map((sz) => ({ label: sz + ' pt', check: cfg.size === sz, action: () => { cfg.size = sz; done(); } })), 'size-menu');
    return;
  } else if (b.dataset.act === 'font') {
    openMenu(b, Object.entries(FONTS).map(([k, [n]]) => ({ label: n, check: cfg.font === k, action: () => { cfg.font = k; done(); } })));
    return;
  } else if (b.dataset.act === 'pentype') {
    openMenu(b, PEN_TYPES.map(([k, n]) => ({ label: n, icon: 'pen_' + k, check: cfg.pen === k, action: () => { cfg.pen = k; done(); } })));
    return;
  } else return;
  done();
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
  cancelAnimationFrame(scrollAnim);
  autoPenOnly(e);
  if (e.target.closest('.sel-menu, .text-editor, .pages-end, .page-ribbon')) return;
  if (e.pointerType === 'touch') {
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (touches.size === 2) { abortAction(); startPinch(); return; }
    if (touches.size > 2) return;
  }
  if (pinch) return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  if (editing) { closeTextEditor(); if (state.tool === 'text' || state.tool === 'note') return; }

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
    case 'note': act = { type: 'note', id: e.pointerId, v, pt }; return;
    case 'laser': return startLaser(v, e);
  }
});

viewer.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'touch' && touches.has(e.pointerId)) {
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch) return movePinch();
  }
  if (!act || act.id !== e.pointerId) return;
  switch (act.type) {
    case 'pan': {
      const now = performance.now(), dx = e.clientX - act.x;
      viewer.scrollLeft -= dx;
      viewer.scrollTop -= e.clientY - act.y;
      const dt = Math.max(1, now - (act.t || now - 16));
      act.vx = 0.7 * (act.vx || 0) + 0.3 * (dx / dt);
      act.t = now;
      act.x = e.clientX; act.y = e.clientY;
      break;
    }
    case 'stroke': addStrokePoints(e); break;
    case 'laser': addLaserPoints(e); break;
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
    if (pinch) {
      if (touches.size < 2) {
        const vx = performance.now() - (pinch.t || 0) > 120 ? 0 : pinch.vx || 0;
        pinch = null;
        snapPage(vx);
      }
      return;
    }
  }
  if (!act || act.id !== e.pointerId) return;
  const a = act;
  if (e.type === 'pointercancel' && a.type !== 'pan') { abortAction(); return; }
  act = null;
  switch (a.type) {
    case 'pan':
      snapPage(performance.now() - (a.t || 0) > 120 ? 0 : a.vx || 0);
      break;
    case 'stroke':
    case 'shape': {
      detachLive();
      if (a.type === 'shape' && a.s.points.length < 2) break;
      if (a.type === 'stroke' && a.s.tool === 'pen' && state.tools.pen.shapeRec) {
        const rec = recognizeShape(a.s.points);
        if (rec) Object.assign(a.s, { tool: 'shape', straight: true, points: rec, pen: undefined });
      }
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
    case 'laser':
      break;
    case 'text': {
      const it = itemAt(a.v.page, a.pt[0], a.pt[1], 'text') || itemAt(a.v.page, a.pt[0], a.pt[1], 'note');
      if (it) openTextEditor(a.v, it, false);
      else {
        const cfg = state.tools.text;
        openTextEditor(a.v, { id: uid(), type: 'text', x: r1(a.pt[0]), y: r1(a.pt[1] - cfg.size * 0.6), text: '', size: cfg.size, color: cfg.color, font: cfg.font, bold: cfg.bold, italic: cfg.italic, w: 0, h: 0 }, true);
      }
      break;
    }
    case 'note': {
      const it = itemAt(a.v.page, a.pt[0], a.pt[1], 'note');
      if (it) openTextEditor(a.v, it, false);
      else {
        const cfg = state.tools.note, w = 160, h = 160;
        const x = clamp(a.pt[0] - w / 2, 4, a.v.page.w - w - 4), y = clamp(a.pt[1] - 24, 4, a.v.page.h - h - 4);
        openTextEditor(a.v, { id: uid(), type: 'note', x: r1(x), y: r1(y), w, h, text: '', size: cfg.size, color: cfg.color }, true);
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
  const now = performance.now(), dt = Math.max(1, now - (pinch.t || now - 16));
  pinch.vx = 0.7 * (pinch.vx || 0) + 0.3 * ((mx - pinch.mx) / dt);
  pinch.t = now;
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
  if (tool === 'pen' && cfg.pen && cfg.pen !== 'fountain') act.s.pen = cfg.pen;
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

/* ---------- Formerkennung ---------- */
/** Erkennt Linie, Ellipse oder Rechteck in einem gezeichneten Strich; gibt Formpunkte oder null zurück. */
function recognizeShape(P) {
  if (P.length < 6) return null;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, len = 0;
  P.forEach((p, i) => {
    x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]);
    if (i) len += Math.hypot(p[0] - P[i - 1][0], p[1] - P[i - 1][1]);
  });
  const w = x1 - x0, h = y1 - y0, size = Math.max(w, h);
  if (size < 18) return null;
  const A = P[0], B = P[P.length - 1];
  const d = Math.hypot(B[0] - A[0], B[1] - A[1]);
  // Gerade Linie
  if (d > 24 && d > len * 0.9) {
    const maxDev = Math.max(...P.map((p) => distSeg(p[0], p[1], A[0], A[1], B[0], B[1])));
    if (maxDev < Math.max(5, d * 0.06)) return shapePoints('line', [A[0], A[1]], [B[0], B[1]]);
  }
  // Geschlossene Formen
  if (d > size * 0.3 || Math.min(w, h) < 12) return null;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rx = w / 2, ry = h / 2;
  const ellErr = P.reduce((sum, p) => sum + Math.abs(Math.hypot((p[0] - cx) / rx, (p[1] - cy) / ry) - 1), 0) / P.length;
  const tol = Math.min(w, h) * 0.12;
  const nearEdge = P.filter((p) => Math.min(Math.abs(p[0] - x0), Math.abs(p[0] - x1), Math.abs(p[1] - y0), Math.abs(p[1] - y1)) < tol).length / P.length;
  if (nearEdge > 0.8 && ellErr > 0.08) return shapePoints('rect', [x0, y0], [x1, y1]);
  if (ellErr < 0.16) return shapePoints('ellipse', [x0, y0], [x1, y1]);
  if (nearEdge > 0.7) return shapePoints('rect', [x0, y0], [x1, y1]);
  return null;
}

/* ---------- Laserpointer ---------- */
const laserCv = document.createElement('canvas');
laserCv.className = 'live laser';
let laser = null; // { v, trails: [{ pts: [[x, y, t]], color }], raf }
const LASER_FADE = 900;
function startLaser(v, e) {
  if (!laser || laser.v !== v) {
    stopLaser();
    laser = { v, trails: [], raf: 0 };
    laserCv.width = v.canvas.width || Math.round(v.page.w * viewScale(v.page));
    laserCv.height = v.canvas.height || Math.round(v.page.h * viewScale(v.page));
    v.wrap.appendChild(laserCv);
  }
  const tr = { pts: [], color: state.tools.laser.color };
  laser.trails.push(tr);
  act = { type: 'laser', id: e.pointerId, v, tr };
  addLaserPoints(e);
  if (!laser.raf) laser.raf = requestAnimationFrame(drawLaser);
}
function addLaserPoints(e) {
  const evs = (e.getCoalescedEvents && e.getCoalescedEvents()) || [];
  const now = performance.now();
  for (const ev of evs.length ? evs : [e]) {
    const [x, y] = getPt(ev, act.v);
    act.tr.pts.push([x, y, now]);
  }
}
function drawLaser() {
  if (!laser) return;
  laser.raf = 0;
  const now = performance.now();
  const ctx = laserCv.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, laserCv.width, laserCv.height);
  const page = laser.v.page;
  ctx.setTransform(laserCv.width / page.w, 0, 0, laserCv.height / page.h, 0, 0);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const tr of laser.trails) {
    const active = act && act.tr === tr;
    tr.pts = tr.pts.filter((p) => now - p[2] < LASER_FADE || (active && p === tr.pts[tr.pts.length - 1]));
    for (let i = 1; i < tr.pts.length; i++) {
      const a = tr.pts[i - 1], b = tr.pts[i];
      const alpha = Math.max(0, 1 - (now - b[2]) / LASER_FADE);
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = tr.color;
      ctx.shadowColor = tr.color;
      ctx.shadowBlur = 14;
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }
    const last = tr.pts[tr.pts.length - 1];
    if (active && last) {
      ctx.globalAlpha = 1;
      ctx.fillStyle = tr.color;
      ctx.shadowColor = tr.color; ctx.shadowBlur = 18;
      ctx.beginPath(); ctx.arc(last[0], last[1], 6, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    }
  }
  laser.trails = laser.trails.filter((tr) => tr.pts.length || (act && act.tr === tr));
  if (laser.trails.length) laser.raf = requestAnimationFrame(drawLaser);
  else stopLaser();
}
function stopLaser() {
  if (!laser) return;
  cancelAnimationFrame(laser.raf);
  laserCv.remove();
  laser = null;
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
  const isNote = item.type === 'note';
  ta.className = 'text-editor' + (isNote ? ' note-editor' : '');
  ta.value = item.text;
  ta.wrap = isNote ? 'soft' : 'off';
  ta.spellcheck = true;
  editing = { v, item, ta, isNew, before: snap(v.page) };
  positionTextEditor();
  v.wrap.appendChild(ta);
  scheduleRender(v);
  const fit = () => {
    if (isNote) return;
    ta.style.height = '0px';
    ta.style.width = '0px';
    ta.style.height = ta.scrollHeight + 'px';
    ta.style.width = Math.max(40, ta.scrollWidth + 4) + 'px';
  };
  editing.fit = fit;
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
  if (item.type === 'note') {
    Object.assign(ta.style, {
      left: item.x * z + 'px', top: item.y * z + 'px', width: item.w * z + 'px', height: item.h * z + 'px',
      padding: 12 * z + 'px', fontSize: item.size * z + 'px', lineHeight: '1.3', background: item.color,
      fontFamily: FONTS.hand[1],
    });
    return;
  }
  Object.assign(ta.style, {
    left: item.x * z + 'px', top: item.y * z + 'px',
    fontSize: item.size * z + 'px', color: item.color,
    fontFamily: (FONTS[item.font] || FONTS.sans)[1], fontWeight: item.bold ? '700' : '400', fontStyle: item.italic ? 'italic' : 'normal',
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
  if (item.type === 'note') {
    item.text = text;
    if (isNew) page.items.push(item);
  } else if (!text) {
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
    const nb = newNotebook({ title: file.name.replace(/\.pdf$/i, ''), cover: 'none', folderId: targetFolder() });
    nb.kind = 'pdf';
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
    const target = state.libView === 'docs' ? state.libFolder : null;
    if (data.format === 'jelly-library' && Array.isArray(data.notebooks)) {
      toast('Sicherung wird geladen …', 0);
      const idMap = {};
      for (const f of data.folders || []) idMap[f.id] = uid();
      for (const f of data.folders || []) {
        await db.saveFolder({ ...f, id: idMap[f.id], parentId: f.parentId && idMap[f.parentId] ? idMap[f.parentId] : target, trashed: null });
      }
      for (const n of data.notebooks) {
        const nb = reId(n);
        nb.folderId = n.folderId && idMap[n.folderId] ? idMap[n.folderId] : target;
        nb.trashed = null;
        await saveFresh(nb);
      }
      toast(`${data.notebooks.length} ${data.notebooks.length === 1 ? 'Dokument' : 'Dokumente'} wiederhergestellt`);
    } else if (data.format === 'jelly-notebook' && data.notebook?.pages) {
      const nb = reId(data.notebook);
      nb.folderId = target;
      nb.trashed = null;
      await saveFresh(nb);
      toast('Backup importiert');
    } else throw new Error('Unbekanntes Format');
    renderLibrary();
  } catch (err) {
    console.error(err);
    toast('Backup konnte nicht geladen werden: ' + (err?.message || err), 5000);
  }
}

/* =====================================================================
   Dokumenten-Scanner
   ===================================================================== */
const SCAN_FILTERS = [['color', 'Farbe'], ['gray', 'Graustufen'], ['bw', 'S/W'], ['original', 'Original']];
const scan = { target: null, pages: [], queue: [], img: null, corners: null, filter: 'color', view: null, busy: false };
try { scan.filter = localStorage.getItem('jelly.scanFilter') || 'color'; } catch { /* */ }

function startScan(target, pick) {
  scan.target = target;
  scan.pages = [];
  scan.queue = [];
  $(pick ? '#file-scan-pick' : '#file-scan').click();
}
async function onScanFiles(files) {
  const list = [...files].filter((f) => f.type.startsWith('image/') || !f.type);
  if (!list.length) return;
  scan.queue.push(...list);
  $('#scanner').hidden = false;
  if (!scan.busy) nextScanFile();
}
async function nextScanFile() {
  const file = scan.queue.shift();
  if (!file) return showScanReview();
  scan.busy = true;
  setScanMode('loading');
  try {
    scan.img = await loadScanImage(file, 2400);
    scan.corners = detectCorners(scan.img);
    setScanMode('adjust');
  } catch (err) {
    console.error(err);
    toast(err.message || 'Das Foto konnte nicht geöffnet werden.');
    scan.busy = false;
    nextScanFile();
  }
}
function setScanMode(mode) {
  const n = scan.pages.length;
  $('#scan-loading').hidden = mode !== 'loading';
  $('#scan-frame').hidden = mode !== 'adjust';
  $('#scan-review').hidden = mode !== 'review';
  $('#scan-adjust').hidden = mode !== 'adjust';
  $('#scan-more').hidden = mode !== 'review';
  $('#scan-finish').hidden = !n || mode === 'loading';
  $('#scan-finish').textContent = `${n} ${n === 1 ? 'Seite' : 'Seiten'} einfügen`;
  $('#scan-title').textContent = mode === 'review' ? `${n} ${n === 1 ? 'Seite' : 'Seiten'} gescannt` : `Seite ${n + 1}`;
  if (mode === 'adjust') { buildScanFilters(); layoutScan(); }
}
function buildScanFilters() {
  buildSeg($('#scan-filter'), SCAN_FILTERS, scan.filter, (v) => {
    scan.filter = v;
    try { localStorage.setItem('jelly.scanFilter', v); } catch { /* */ }
  });
}
function layoutScan() {
  if (!scan.img || $('#scan-frame').hidden) return;
  const stage = $('#scan-stage').getBoundingClientRect();
  const iw = scan.img.width, ih = scan.img.height;
  const k = Math.min((stage.width - 48) / iw, (stage.height - 48) / ih);
  const w = Math.round(iw * k), h = Math.round(ih * k);
  const frame = $('#scan-frame');
  frame.style.width = w + 'px';
  frame.style.height = h + 'px';
  const c = $('#scan-canvas');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
  c.getContext('2d').drawImage(scan.img, 0, 0, c.width, c.height);
  $('#scan-svg').setAttribute('viewBox', `0 0 ${w} ${h}`);
  scan.view = { k, w, h };
  positionScanHandles();
}
function positionScanHandles() {
  const { k } = scan.view;
  const pts = scan.corners.map(([x, y]) => [x * k, y * k]);
  document.querySelectorAll('.scan-handle').forEach((el) => {
    const [x, y] = pts[+el.dataset.i];
    el.style.left = x + 'px';
    el.style.top = y + 'px';
  });
  $('#scan-poly').setAttribute('points', pts.map((p) => p.join(',')).join(' '));
}
document.querySelectorAll('.scan-handle').forEach((el) => {
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    el.setPointerCapture(e.pointerId);
    el.classList.add('active');
    const i = +el.dataset.i;
    const move = (ev) => {
      const r = $('#scan-frame').getBoundingClientRect();
      const { k } = scan.view;
      const x = clamp((ev.clientX - r.left) / k, 0, scan.img.width);
      const y = clamp((ev.clientY - r.top) / k, 0, scan.img.height);
      scan.corners[i] = [x, y];
      positionScanHandles();
    };
    const up = () => {
      el.classList.remove('active');
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  });
});
window.addEventListener('resize', () => { if (!$('#scanner').hidden) layoutScan(); });

function acceptScanPage() {
  const btn = $('#scan-accept');
  btn.disabled = true;
  btn.textContent = 'Wird bearbeitet …';
  // Kurz warten, damit der Hinweis sichtbar wird, bevor die Rechnung den Bildschirm blockiert
  setTimeout(() => {
    try {
      const out = warpDocument(scan.img, scan.corners, scan.filter, 2000);
      scan.pages.push({ src: out.toDataURL('image/jpeg', 0.86), w: out.width, h: out.height });
    } catch (err) {
      console.error(err);
      toast('Die Seite konnte nicht bearbeitet werden.');
    }
    btn.disabled = false;
    btn.textContent = 'Seite übernehmen';
    scan.img = null;
    scan.busy = false;
    nextScanFile();
  }, 30);
}
function showScanReview() {
  scan.busy = false;
  if (!scan.pages.length) { closeScanner(); return; }
  const el = $('#scan-review');
  el.innerHTML = '';
  scan.pages.forEach((p, i) => {
    const d = document.createElement('div');
    d.className = 'scan-thumb';
    d.innerHTML = `<img src="${p.src}" alt="Seite ${i + 1}"><span>${i + 1}</span><button type="button" title="Seite entfernen" aria-label="Seite ${i + 1} entfernen">×</button>`;
    d.querySelector('button').onclick = () => { scan.pages.splice(i, 1); showScanReview(); };
    el.appendChild(d);
  });
  setScanMode('review');
}
function closeScanner() {
  $('#scanner').hidden = true;
  scan.pages = [];
  scan.queue = [];
  scan.img = null;
  scan.busy = false;
}
async function finishScan() {
  const pages = [], assets = {};
  for (const p of scan.pages) {
    const key = uid();
    assets[key] = p.src;
    const w = p.w > p.h ? PAGE_H : PAGE_W;
    pages.push({ id: uid(), w, h: Math.round(w * p.h / p.w), paper: 'blank', color: 'white', bg: key, strokes: [], items: [] });
  }
  const target = scan.target;
  closeScanner();
  if (target === 'notebook' && state.nb) {
    Object.assign(state.nb.assets, assets);
    state.nb.pages.splice(state.cur + 1, 0, ...pages);
    rebuildAfterPageChange(state.cur + 1);
    toast(`${pages.length} ${pages.length === 1 ? 'Seite' : 'Seiten'} eingefügt`);
  } else {
    const nb = newNotebook({ title: 'Scan ' + new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium' }).format(new Date()), cover: 'none', folderId: targetFolder() });
    nb.pages = pages;
    nb.assets = assets;
    await saveFresh(nb);
    openNotebook(nb.id);
  }
}
$('#file-scan').onchange = (e) => { onScanFiles(e.target.files); e.target.value = ''; };
$('#file-scan-pick').onchange = (e) => { onScanFiles(e.target.files); e.target.value = ''; };
$('#scan-accept').onclick = acceptScanPage;
$('#scan-retake').onclick = () => $('#file-scan').click();
$('#scan-full').onclick = () => { scan.corners = defaultCorners(scan.img.width, scan.img.height, 0); positionScanHandles(); };
$('#scan-next-cam').onclick = () => $('#file-scan').click();
$('#scan-next-pick').onclick = () => $('#file-scan-pick').click();
$('#scan-finish').onclick = finishScan;
$('#scan-cancel').onclick = async () => {
  if (scan.pages.length && !(await ask({ title: 'Scan verwerfen?', message: 'Die bereits gescannten Seiten gehen verloren.', ok: 'Verwerfen', danger: true }))) return;
  closeScanner();
};

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
function openMenu(anchor, items, cls = '') {
  closeMenu();
  const m = document.createElement('div');
  m.className = 'menu' + (cls ? ' ' + cls : '');
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
  $('.editor-body').classList.toggle('with-side', state.sidebar && !isNarrow());
  $('#btn-sidebar').classList.toggle('active', state.sidebar);
  if (state.sidebar && state.nb) queueAllThumbs();
}

$('#btn-new').onclick = (e) => openMenu(e.currentTarget, [
  { label: 'Notizbuch', icon: 'page', action: openNewDialog },
  { label: 'PDF hinzufügen', icon: 'pdf', action: () => $('#file-pdf').click() },
  { label: 'Ordner', icon: 'folderPlus', action: createFolder },
  '-',
  { label: 'Dokument scannen', icon: 'scan', action: () => startScan('new', false) },
  { label: 'Backup laden', icon: 'upload', action: () => $('#file-backup').click() },
]);

$('#file-pdf').onchange = (e) => { importPDF(e.target.files[0]); e.target.value = ''; };
$('#file-pdf-append').onchange = (e) => { appendPDF(e.target.files[0]); e.target.value = ''; };
$('#file-backup').onchange = (e) => { importBackup(e.target.files[0]); e.target.value = ''; };
$('#file-image').onchange = (e) => { insertImageFile(e.target.files[0]); e.target.value = ''; };

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
$('#btn-insert').onclick = (e) => openMenu(e.currentTarget, [
  { label: 'Bild oder Foto', icon: 'image', action: () => $('#file-image').click() },
  { label: 'PDF einfügen', icon: 'pdf', action: () => $('#file-pdf-append').click() },
  '-',
  { label: 'Dokument scannen', icon: 'scan', action: () => startScan('notebook', false) },
  { label: 'Scan aus Fotos', icon: 'camera', action: () => startScan('notebook', true) },
]);
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
  { label: 'Umbenennen', icon: 'edit', action: async () => {
    const t = await ask({ title: 'Umbenennen', input: state.nb.title, ok: 'Speichern' });
    if (!t?.trim() || !state.nb) return;
    state.nb.title = t.trim();
    $('#nb-title').value = state.nb.title;
    document.title = state.nb.title + ' – Jelly Notes';
    updateTabTitle(state.nb.id, state.nb.title);
    scheduleSave();
  } },
  { label: 'Zu Favoriten', icon: 'star', check: !!state.nb?.favorite, action: () => { state.nb.favorite = !state.nb.favorite; scheduleSave(); } },
  '-',
  { label: 'Nur Stift zeichnet (Finger scrollen)', icon: 'hand', check: state.penOnly, action: () => {
    state.penOnly = !state.penOnly;
    savePrefs();
    toast(state.penOnly ? 'Finger scrollen jetzt – nur der Stift zeichnet' : 'Finger zeichnen wieder');
  } },
  { label: 'Seitenübersicht', icon: 'sidebar', check: state.sidebar, action: () => $('#btn-sidebar').click() },
  '-',
  { label: 'Tastenkürzel', icon: 'more', action: () => ask({ title: 'Tastenkürzel', cancel: '', message:
    'P Stift · H Textmarker · E Radierer · L Lasso · S Formen · T Text · N Haftnotiz · K Laserpointer\n' +
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
  const map = { p: 'pen', h: 'highlighter', e: 'eraser', l: 'lasso', s: 'shape', t: 'text', n: 'note', k: 'laser' };
  if (map[k]) setTool(map[k]);
  if (isHorizontal() && (k === 'arrowright' || k === 'arrowleft') && !state.selection) {
    e.preventDefault();
    scrollToPage(clamp(state.cur + (k === 'arrowright' ? 1 : -1), 0, state.nb.pages.length - 1), true);
    return;
  }
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
   Editor: Tabs, Lesezeichen, Suche, Sprachaufnahme, Ansicht
   ===================================================================== */
const TABS_KEY = 'jelly.tabs';
const tabView = new Map(); // id -> { zoom, fit, top, left }
let tabs = (() => { try { return JSON.parse(localStorage.getItem(TABS_KEY) || '[]'); } catch { return []; } })();
function saveTabs() { try { localStorage.setItem(TABS_KEY, JSON.stringify(tabs)); } catch { /* */ } }
function addTab(nb) {
  const t = tabs.find((x) => x.id === nb.id);
  if (t) t.title = nb.title;
  else tabs.push({ id: nb.id, title: nb.title });
  saveTabs();
}
function updateTabTitle(id, title) {
  const t = tabs.find((x) => x.id === id);
  if (t) { t.title = title; saveTabs(); renderTabs(); }
}
function removeTab(id) {
  tabs = tabs.filter((x) => x.id !== id);
  tabView.delete(id);
  saveTabs();
  renderTabs();
}
async function closeTab(id) {
  const i = tabs.findIndex((x) => x.id === id);
  const wasOpen = state.nb?.id === id;
  if (wasOpen) await leaveNotebook();
  removeTab(id);
  if (!wasOpen) return;
  const next = tabs[Math.min(i, tabs.length - 1)];
  if (next) openNotebook(next.id); else showLibrary();
}
function renderTabs() {
  const el = $('#tabs');
  el.innerHTML = '';
  for (const t of tabs) {
    const active = state.nb?.id === t.id;
    const b = document.createElement('div');
    b.className = 'tab' + (active ? ' active' : '');
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', active);
    b.innerHTML = `<button class="tab-main" type="button" title="${esc(t.title)}"><span>${esc(t.title)}</span></button><button class="tab-close" type="button" title="Tab schließen" aria-label="${esc(t.title)} schließen">${icon('close')}</button>`;
    b.querySelector('.tab-main').onclick = () => { if (!active) openNotebook(t.id); };
    b.querySelector('.tab-close').onclick = (e) => { e.stopPropagation(); closeTab(t.id); };
    el.appendChild(b);
  }
  el.querySelector('.tab.active')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

/* Lesezeichen */
function toggleBookmark(page = currentPage()) {
  page.bookmarked = !page.bookmarked;
  const v = views.get(page.id);
  if (v) {
    v.wrap.querySelector('.page-ribbon')?.remove();
    if (page.bookmarked) v.wrap.insertAdjacentHTML('beforeend', `<button class="page-ribbon" title="Lesezeichen entfernen" aria-label="Lesezeichen entfernen">${icon('bookmarkFill')}</button>`);
  }
  $(`.thumb[data-id="${page.id}"]`)?.classList.toggle('bookmarked', !!page.bookmarked);
  toast(page.bookmarked ? `Lesezeichen auf Seite ${pageIndex(page.id) + 1} gesetzt` : 'Lesezeichen entfernt');
  scheduleSave();
}
pagesEl.addEventListener('click', (e) => {
  const r = e.target.closest('.page-ribbon');
  if (r) toggleBookmark(findPage(r.closest('.page').dataset.id));
});
$('#btn-bookmarks').onclick = (e) => {
  const cur = currentPage();
  const marked = state.nb.pages.map((p, i) => [p, i]).filter(([p]) => p.bookmarked);
  openMenu(e.currentTarget, [
    { label: cur.bookmarked ? `Lesezeichen von Seite ${state.cur + 1} entfernen` : `Lesezeichen auf Seite ${state.cur + 1} setzen`, icon: 'bookmark', action: () => toggleBookmark(cur) },
    ...(marked.length ? ['-', ...marked.map(([, i]) => ({ label: `Seite ${i + 1}`, icon: 'bookmarkFill', action: () => scrollToPage(i, true) }))] : []),
  ]);
};

/* Suche im Dokument (Textfelder und Haftnotizen) */
$('#btn-doc-search').onclick = (e) => {
  const el = document.createElement('div');
  el.className = 'doc-search';
  el.innerHTML = `<div class="doc-search-field">${icon('search')}<input type="search" placeholder="Text im Dokument suchen" autocomplete="off"></div><div class="doc-search-res"></div>`;
  const input = el.querySelector('input'), res = el.querySelector('.doc-search-res');
  const run = () => {
    const q = input.value.trim().toLowerCase();
    res.innerHTML = '';
    if (!q) { res.innerHTML = '<p class="doc-search-hint">Durchsucht Textfelder und Haftnotizen. Handschrift und PDF-Text werden nicht erkannt.</p>'; return; }
    const hits = [];
    state.nb.pages.forEach((p, i) => p.items.forEach((it) => {
      if ((it.type === 'text' || it.type === 'note') && it.text?.toLowerCase().includes(q)) hits.push([i, it]);
    }));
    if (!hits.length) { res.innerHTML = '<p class="doc-search-hint">Keine Treffer.</p>'; return; }
    for (const [i, it] of hits.slice(0, 50)) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'menu-item';
      const pos = it.text.toLowerCase().indexOf(q);
      const snip = it.text.slice(Math.max(0, pos - 20), pos + q.length + 30).replace(/\n/g, ' ');
      b.innerHTML = `<span><b>Seite ${i + 1}</b> · ${esc(snip)}</span>`;
      b.onclick = () => { closeMenu(); scrollToPage(i, true); };
      res.appendChild(b);
    }
  };
  input.addEventListener('input', run);
  openMenu(e.currentTarget, el, 'search-menu');
  run();
  setTimeout(() => input.focus(), 30);
};

/* Sprachaufnahme */
let rec = null; // { mr, chunks, start, timer, stream }
function fmtDur(ms) { const sec = Math.round(ms / 1000); return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`; }
async function startRecording() {
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) { toast('Sprachaufnahme wird von diesem Browser nicht unterstützt'); return; }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr = new MediaRecorder(stream);
    rec = { mr, chunks: [], start: Date.now(), stream, page: state.cur, nbId: state.nb.id };
    mr.ondataavailable = (e) => { if (e.data.size) rec?.chunks.push(e.data); };
    mr.start(1000);
    const btn = $('#btn-mic');
    btn.classList.add('recording');
    $('#rec-time').hidden = false;
    rec.timer = setInterval(() => { $('#rec-time').textContent = fmtDur(Date.now() - rec.start); }, 250);
    $('#rec-time').textContent = '0:00';
    toast('Aufnahme läuft – tippe erneut auf das Mikrofon zum Beenden');
  } catch (err) {
    console.error(err);
    toast('Kein Zugriff auf das Mikrofon. Erlaube den Zugriff in den Einstellungen deines Browsers.', 5000);
  }
}
async function stopRecording() {
  if (!rec) return;
  const r = rec;
  rec = null;
  clearInterval(r.timer);
  $('#btn-mic').classList.remove('recording');
  $('#rec-time').hidden = true;
  await new Promise((res) => { r.mr.onstop = res; r.mr.stop(); });
  r.stream.getTracks().forEach((t) => t.stop());
  const blob = new Blob(r.chunks, { type: r.mr.mimeType || 'audio/mp4' });
  if (!blob.size || !state.nb || state.nb.id !== r.nbId) return;
  const key = uid();
  state.nb.assets[key] = await readAsDataURL(blob);
  state.nb.recordings = state.nb.recordings || [];
  state.nb.recordings.push({ id: uid(), asset: key, mime: blob.type, duration: Date.now() - r.start, createdAt: Date.now(), page: r.page });
  scheduleSave();
  toast(`Aufnahme gespeichert (${fmtDur(Date.now() - r.start)})`);
}
let player = null;
$('#btn-mic').onclick = (e) => {
  if (rec) { stopRecording(); return; }
  const list = state.nb.recordings || [];
  const el = document.createElement('div');
  el.className = 'rec-list';
  el.innerHTML = `<button class="menu-item rec-start" type="button">${icon('mic')}<span>Aufnahme starten</span></button>` +
    (list.length ? '<div class="menu-sep"></div><div class="menu-title">Aufnahmen</div>' : '') +
    list.map((r, i) => `<div class="rec-row" data-id="${r.id}">
      <button class="rec-play" type="button" aria-label="Abspielen">${icon('play')}</button>
      <div class="rec-info"><b>Aufnahme ${i + 1}</b><span>${fmtDur(r.duration)} · Seite ${r.page + 1} · ${dateFmt.format(r.createdAt)}</span></div>
      <button class="rec-del" type="button" aria-label="Aufnahme löschen">${icon('trash')}</button></div>`).join('');
  el.querySelector('.rec-start').onclick = () => { closeMenu(); startRecording(); };
  el.addEventListener('click', async (ev) => {
    const row = ev.target.closest('.rec-row');
    if (!row) return;
    const r = list.find((x) => x.id === row.dataset.id);
    if (ev.target.closest('.rec-play')) {
      const btn = row.querySelector('.rec-play');
      if (player && player.id === r.id && !player.audio.paused) { player.audio.pause(); btn.innerHTML = icon('play'); return; }
      player?.audio.pause();
      el.querySelectorAll('.rec-play').forEach((p) => { p.innerHTML = icon('play'); });
      player = { id: r.id, audio: new Audio(state.nb.assets[r.asset]) };
      player.audio.onended = () => { btn.innerHTML = icon('play'); };
      btn.innerHTML = icon('pause');
      player.audio.play().catch(() => toast('Die Aufnahme konnte nicht abgespielt werden'));
    } else if (ev.target.closest('.rec-del')) {
      if (!(await ask({ title: 'Aufnahme löschen?', message: 'Die Aufnahme wird endgültig gelöscht.', ok: 'Löschen', danger: true }))) return;
      state.nb.recordings = state.nb.recordings.filter((x) => x.id !== r.id);
      scheduleSave();
      toast('Aufnahme gelöscht');
    }
  });
  openMenu(e.currentTarget, el, 'rec-menu');
};

/* Ansicht */
function fitPage() {
  const p = currentPage();
  const z = clamp((viewer.clientHeight - 40) / p.h, 0.25, 2);
  state.fit = false;
  setZoom(z);
  scrollToPage(state.cur);
}
$('#btn-view').onclick = (e) => openMenu(e.currentTarget, [
  { label: 'Seiten wischen (horizontal)', icon: 'viewMode', check: getPageLayout() === 'horizontal', action: () => setPageLayout('horizontal') },
  { label: 'Fortlaufend scrollen (vertikal)', icon: 'listView', check: getPageLayout() === 'vertical', action: () => setPageLayout('vertical') },
  '-',
  { label: isHorizontal() ? 'Ganze Seite einpassen' : 'An Seitenbreite anpassen', icon: 'page', action: fitWidth },
  ...(isHorizontal() ? [] : [{ label: 'Ganze Seite anzeigen', icon: 'page', action: fitPage }]),
  '-',
  { label: 'Seitenübersicht', icon: 'sidebar', check: state.sidebar, action: () => $('#btn-sidebar').click() },
  { label: 'Nur Stift zeichnet', icon: 'hand', check: state.penOnly, action: () => { state.penOnly = !state.penOnly; savePrefs(); } },
  '-',
  { label: 'Papier und Seite …', icon: 'grid', action: () => pageMenu($('#btn-page')) },
]);
renderTabs();

/* =====================================================================
   Bibliothek: Seitenleiste, Kopfleiste, Profil-Menü
   ===================================================================== */
const isNarrowLib = () => window.innerWidth < 1000;
let libSideOverlay = false;
function getLibSidePref() { try { return localStorage.getItem('jelly.libSide') !== '0'; } catch { return true; } }
function setLibSide(open) {
  if (isNarrowLib()) libSideOverlay = open;
  else { try { localStorage.setItem('jelly.libSide', open ? '1' : '0'); } catch { /* */ } }
  applyLibSide();
}
function applyLibSide() {
  const narrow = isNarrowLib();
  const open = narrow ? libSideOverlay : getLibSidePref();
  const lib = $('#library');
  lib.classList.toggle('side-open', open);
  lib.classList.toggle('side-narrow', narrow);
  $('#side-scrim').hidden = !(narrow && open);
  $('#btn-side-open').hidden = open && !narrow;
}
$('#btn-side-close').onclick = () => setLibSide(false);
$('#btn-side-open').onclick = () => setLibSide(!(isNarrowLib() ? libSideOverlay : getLibSidePref()));
$('#side-scrim').onclick = () => setLibSide(false);
window.addEventListener('resize', applyLibSide);
document.querySelectorAll('.side-item').forEach((b) => { b.onclick = () => setLibView(b.dataset.view); });
$('.docs-ic').innerHTML = icon('folderFill');
$('#btn-lib-back').onclick = () => {
  if (state.libView === 'trash') { setLibView('docs'); return; }
  const f = folderById(state.libFolder);
  openFolder(f ? validFolder(f.parentId) : null, -1);
};
applyLibSide();

/* Suche */
function openSearch() {
  $('#search-wrap').hidden = false;
  $('#search').focus();
}
function closeSearch(render = true) {
  if ($('#search-wrap').hidden) return;
  $('#search').value = '';
  $('#search-wrap').hidden = true;
  if (render) renderLibrary();
}
$('#btn-search').onclick = openSearch;
$('#btn-search-close').onclick = () => closeSearch();
$('#search').addEventListener('input', () => renderLibrary());
$('#search').addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSearch(); });

/* Filter, Ansicht, Cloud */
$('#lib-filter').onclick = (e) => openMenu(e.currentTarget, Object.entries(TYPE_FILTERS).map(([k, label]) => ({
  label, icon: k === 'pdf' ? 'pdf' : k === 'notebook' ? 'page' : 'gridView', check: state.libFilter === k,
  action: () => { state.libFilter = k; renderLibrary(); },
})));
$('#btn-layout').onclick = () => {
  state.libLayout = state.libLayout === 'list' ? 'grid' : 'list';
  try { localStorage.setItem('jelly.libLayout', state.libLayout); } catch { /* */ }
  renderLibrary();
};
$('#btn-empty-trash').onclick = emptyTrash;
$('#btn-cloud').onclick = showCloudBackup;
function updateCloudIcon() {
  const on = !!auth.user;
  const b = $('#btn-cloud');
  b.innerHTML = icon(on ? 'cloud' : 'cloudOff');
  b.title = on ? 'Mit deinem Konto synchronisiert' : 'Nur auf diesem Gerät gespeichert';
  b.classList.toggle('on', on);
}

/* Glocke: Neuigkeiten */
function newsSeen() { try { return +localStorage.getItem('jelly.newsSeen') || 0; } catch { return 0; } }
function updateBell() { $('#bell-dot').hidden = newsSeen() >= NEWS_VERSION; }
$('#btn-bell').onclick = (e) => {
  const el = document.createElement('div');
  el.className = 'news';
  el.innerHTML = `<div class="menu-title">Neuigkeiten</div>` + NEWS.map((n) => `
    <div class="news-item"><span class="news-dot"></span><div><b>${esc(n.title)}</b><p>${esc(n.text)}</p></div></div>`).join('');
  openMenu(e.currentTarget, el, 'news-menu');
  try { localStorage.setItem('jelly.newsSeen', String(NEWS_VERSION)); } catch { /* */ }
  updateBell();
};
updateBell();

/* Profil */
function profileName() { return auth.user?.email ? auth.user.email.split('@')[0] : 'Lokales Profil'; }
function updateAvatar() {
  const a = $('#btn-avatar');
  a.textContent = auth.user?.email ? auth.user.email[0].toUpperCase() : 'J';
  updateCloudIcon();
}
$('#btn-avatar').onclick = (e) => {
  const el = document.createElement('div');
  el.className = 'acct';
  const user = auth.user;
  el.innerHTML = `
    <div class="acct-card">
      <div class="acct-row">
        <span class="avatar lg">${esc(user?.email ? user.email[0].toUpperCase() : 'J')}</span>
        <div class="acct-who"><div class="acct-name">${esc(profileName())}</div><span class="acct-badge">${user ? 'Mit Konto synchronisiert' : 'Nur auf diesem Gerät'}</span></div>
        <button class="acct-link" data-a="account" type="button">Zum Konto</button>
      </div>
      ${cloudConfigured && !user ? '<div class="acct-sep"></div><button class="acct-signin" data-a="signin" type="button">Anmelden oder Konto erstellen</button>' : ''}
    </div>
    <div class="acct-group">
      <button class="acct-item" data-a="settings" type="button">${icon('settings')}<span>Einstellungen</span></button>
      <button class="acct-item" data-a="cloud" type="button">${icon('cloud')}<span>Cloud &amp; Backup</span></button>
      <button class="acct-item" data-a="trash" type="button">${icon('trash')}<span>Papierkorb</span></button>
    </div>
    <div class="acct-group">
      <button class="acct-item" data-a="about" type="button">${icon('about')}<span>Über</span></button>
    </div>
    <div class="acct-group">
      <button class="acct-item" data-a="privacy" type="button">${icon('shield')}<span>Datenschutzrichtlinie</span>${icon('chevRight')}</button>
      <button class="acct-item" data-a="terms" type="button">${icon('doc')}<span>Nutzungsbedingungen</span>${icon('chevRight')}</button>
      <button class="acct-item" data-a="imprint" type="button">${icon('info')}<span>Impressum</span>${icon('chevRight')}</button>
    </div>`;
  el.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-a]');
    if (!b) return;
    closeMenu();
    const a = b.dataset.a;
    if (a === 'account') showAccount();
    else if (a === 'signin') showAuth('signin');
    else if (a === 'settings') showSettings();
    else if (a === 'cloud') showCloudBackup();
    else if (a === 'trash') setLibView('trash');
    else if (a === 'about') showAbout();
    else showInfo(LEGAL[a].title, LEGAL[a].html);
  });
  openMenu(e.currentTarget, el, 'acct-menu');
};

/** Zeigt eine Info-Seite (Text oder Element) im großen Dialog. */
function showInfo(title, content) {
  const dlg = $('#dlg-info');
  $('#info-title').textContent = title;
  const body = $('#info-body');
  body.innerHTML = '';
  if (typeof content === 'string') body.innerHTML = content;
  else body.appendChild(content);
  if (!dlg.open) dlg.showModal();
  body.scrollTop = 0;
}

function showAccount() {
  const el = document.createElement('div');
  if (auth.user) {
    el.innerHTML = `<p>Angemeldet als <b>${esc(auth.user.email)}</b>.</p>
      <p>Deine Notizbücher, PDFs und Ordner werden automatisch in deinem Konto gespeichert und sind auf allen Geräten verfügbar, auf denen du dich anmeldest.</p>
      <div class="info-actions"><button class="btn danger" type="button" data-out>Abmelden</button></div>`;
    el.querySelector('[data-out]').onclick = () => { $('#dlg-info').close(); signOut(); };
  } else {
    el.innerHTML = `<p>Du nutzt Jelly Notes gerade ohne Konto. Alles, was du anlegst, wird nur in diesem Browser auf diesem Gerät gespeichert.</p>
      <p>${cloudConfigured ? 'Mit einem Konto sind deine Notizen auf allen Geräten verfügbar.' : 'Benutzerkonten sind für diese Website noch nicht eingerichtet. Sichere deine Notizen deshalb regelmäßig über <b>Cloud &amp; Backup</b>.'}</p>
      ${cloudConfigured ? '<div class="info-actions"><button class="btn primary" type="button" data-in>Anmelden oder Konto erstellen</button></div>' : ''}`;
    el.querySelector('[data-in]')?.addEventListener('click', () => { $('#dlg-info').close(); showAuth('signin'); });
  }
  showInfo('Konto', el);
}

/* Einstellungen */
function getTheme() { try { return localStorage.getItem('jelly.theme') || 'system'; } catch { return 'system'; } }
function applyTheme(v = getTheme()) {
  if (v === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.dataset.theme = v;
}
applyTheme();
function settingSwitch(label, hint, value, onChange) {
  const row = document.createElement('label');
  row.className = 'set-row';
  row.innerHTML = `<div class="set-txt"><b>${label}</b><span>${hint}</span></div><input type="checkbox" class="switch" ${value ? 'checked' : ''}>`;
  row.querySelector('input').onchange = (e) => onChange(e.target.checked);
  return row;
}
function showSettings() {
  const el = document.createElement('div');
  el.className = 'settings';
  const theme = document.createElement('div');
  theme.className = 'set-row';
  theme.innerHTML = '<div class="set-txt"><b>Darstellung</b><span>Hell, dunkel oder wie beim Gerät</span></div><div class="seg"></div>';
  buildSeg(theme.querySelector('.seg'), [['system', 'System'], ['light', 'Hell'], ['dark', 'Dunkel']], getTheme(), (v) => {
    try { localStorage.setItem('jelly.theme', v); } catch { /* */ }
    applyTheme(v);
  });
  el.append(
    theme,
    settingSwitch('Nur Stift zeichnet', 'Finger scrollen und zoomen, nur der Stift schreibt (gegen versehentliche Striche mit der Hand)', state.penOnly, (v) => { state.penOnly = v; savePrefs(); }),
    settingSwitch('Seitenübersicht im Notizbuch', 'Miniaturen der Seiten links im Editor anzeigen', state.sidebar, (v) => { state.sidebar = v; savePrefs(); }),
    settingSwitch('Seitenleiste in der Bibliothek', 'Dokumente, Favoriten und Geteilt links anzeigen', getLibSidePref(), (v) => { try { localStorage.setItem('jelly.libSide', v ? '1' : '0'); } catch { /* */ } applyLibSide(); }),
  );
  showInfo('Einstellungen', el);
}

/* Cloud & Backup */
function showCloudBackup() {
  const el = document.createElement('div');
  const on = !!auth.user;
  el.innerHTML = `
    <div class="cloud-card ${on ? 'on' : ''}">${icon(on ? 'cloud' : 'cloudOff')}<div>
      <b>${on ? 'Mit deinem Konto synchronisiert' : 'Nur auf diesem Gerät gespeichert'}</b>
      <p>${on ? `Änderungen werden automatisch im Konto ${esc(auth.user.email)} gespeichert.` : 'Deine Notizen liegen nur in diesem Browser. Wenn du die Website-Daten löschst, sind sie weg – erstelle deshalb regelmäßig ein Backup.'}</p>
    </div></div>
    <div class="set-row"><div class="set-txt"><b>Gesamte Bibliothek sichern</b><span>Alle Notizbücher, PDFs und Ordner in einer Datei (.json)</span></div><button class="btn primary small" type="button" data-exp>Sichern</button></div>
    <div class="set-row"><div class="set-txt"><b>Backup laden</b><span>Eine Sicherung oder ein einzelnes Notizbuch wiederherstellen</span></div><button class="btn small" type="button" data-imp>Laden</button></div>`;
  el.querySelector('[data-exp]').onclick = exportLibrary;
  el.querySelector('[data-imp]').onclick = () => { $('#dlg-info').close(); $('#file-backup').click(); };
  showInfo('Cloud & Backup', el);
}

/* Über */
function showAbout() {
  showInfo('Über Jelly Notes', `
    <div class="about-head"><img src="icon.svg" alt="" width="72" height="72"><div><b>Jelly Notes</b><span>Version ${APP_VERSION}</span></div></div>
    <p>Handschriftliche Notizen, PDFs und Scans – direkt im Browser, auf dem iPad auch als App vom Home-Bildschirm.</p>
    <p>Schreiben mit Drucksensitivität, Textmarker, Lasso, Formen, Text und Bilder, Ordner, Favoriten und Papierkorb. Funktioniert auch offline.</p>
    <h3>Verwendete Bibliotheken</h3>
    <p>pdf.js (Apache 2.0), jsPDF (MIT), supabase-js (MIT), Schrift Bricolage Grotesque (SIL Open Font License).</p>`);
}

/* Gesamte Bibliothek sichern */
async function exportLibrary() {
  try {
    toast('Sicherung wird erstellt …', 0);
    const metas = await db.listMeta();
    const fl = await db.listFolders();
    const notebooks = [];
    for (const m of metas) {
      if (m.trashed) continue;
      const nb = await db.loadNotebook(m.id);
      if (nb) notebooks.push(nb);
    }
    const data = JSON.stringify({ format: 'jelly-library', version: 1, exportedAt: Date.now(), folders: fl.filter((f) => !f.trashed), notebooks });
    const day = new Intl.DateTimeFormat('de-DE').format(new Date()).replace(/\./g, '-');
    download(new Blob([data], { type: 'application/json' }), `Jelly Notes Backup ${day}.json`);
    toast(`${notebooks.length} ${notebooks.length === 1 ? 'Dokument' : 'Dokumente'} gesichert`);
  } catch (err) {
    console.error(err);
    toast('Sicherung fehlgeschlagen: ' + (err?.message || err), 5000);
  }
}

/* =====================================================================
   Start
   ===================================================================== */
/** Ordner, in dem neue Dokumente landen (nur in der Ansicht „Dokumente“). */
function targetFolder() { return state.libView === 'docs' ? state.libFolder : null; }

async function startApp() {
  updateAvatar();
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
  updateAvatar();
  $('#auth').classList.add('hidden');
  try { await startApp(); } catch (err) {
    console.error(err);
    showAuth('signin', 'Deine Notizbücher konnten nicht geladen werden: ' + authMessage(err));
  }
}
async function signOut() {
  if (state.nb) { await saveNow(); state.nb = null; imgCache.clear(); }
  tabs = [];
  saveTabs();
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

/* =====================================================================
   Offline & automatische Updates
   ===================================================================== */
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(() => {});
}

// Erkennt neue Versionen auf dem Server (z.B. nach einem Push auf GitHub)
// anhand von ETag/Last-Modified und lädt die App dann neu. Funktioniert ohne
// Versionsnummern, die man von Hand hochzählen müsste.
const UPDATE_FILES = ['./', 'app.js', 'style.css', 'db.js', 'cloud.js', 'scan.js', 'legal.js'];
let versionSig = null;
let updating = false;
async function serverSignature() {
  const parts = await Promise.all(UPDATE_FILES.map(async (f) => {
    const r = await fetch(f, { method: 'HEAD', cache: 'no-store' });
    if (!r.ok) return '';
    return r.headers.get('etag') || r.headers.get('last-modified') || '';
  }));
  return parts.every((p) => !p) ? null : parts.join('|');
}
async function checkForUpdate() {
  if (updating || !navigator.onLine || !location.protocol.startsWith('http')) return;
  try {
    const sig = await serverSignature();
    if (!sig) return;
    if (versionSig === null) { versionSig = sig; return; }
    if (sig === versionSig) return;
    updating = true;
    if (editing) closeTextEditor();
    if (state.nb) await saveNow();
    try { sessionStorage.setItem('jelly.updated', '1'); } catch { /* */ }
    toast('Neue Version wird installiert …', 0);
    const reg = await navigator.serviceWorker?.getRegistration();
    await reg?.update().catch(() => {});
    setTimeout(() => location.reload(), 400);
  } catch { /* offline oder Server nicht erreichbar */ }
}
checkForUpdate();
document.addEventListener('visibilitychange', () => { if (!document.hidden) checkForUpdate(); });
window.addEventListener('online', checkForUpdate);
setInterval(checkForUpdate, 15 * 60 * 1000);
try {
  if (sessionStorage.getItem('jelly.updated')) {
    sessionStorage.removeItem('jelly.updated');
    setTimeout(() => toast('App wurde aktualisiert'), 800);
  }
} catch { /* */ }
