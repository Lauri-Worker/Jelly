// Dokumenten-Scanner: Ecken erkennen, perspektivisch entzerren, Papier aufhellen.
// Läuft komplett im Browser auf Canvas-Pixeldaten.

/** Lädt ein Foto und verkleinert es auf höchstens `max` Pixel Kantenlänge. */
export async function loadScanImage(file, max = 2400) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error('Das Foto konnte nicht geöffnet werden.'));
      i.src = url;
    });
    const f = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * f);
    c.height = Math.round(img.naturalHeight * f);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Standard-Ecken: leicht eingerückt. Reihenfolge: oben links, oben rechts, unten rechts, unten links. */
export function defaultCorners(w, h, inset = 0.06) {
  const x0 = w * inset, y0 = h * inset, x1 = w * (1 - inset), y1 = h * (1 - inset);
  return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
}

/**
 * Sucht ein helles Blatt Papier im Bild (größte helle Fläche) und gibt seine vier Ecken zurück.
 * Fällt auf eingerückte Standard-Ecken zurück, wenn nichts Passendes gefunden wird.
 */
export function detectCorners(canvas) {
  const W = canvas.width, H = canvas.height;
  const s = 220 / Math.max(W, H);
  const w = Math.max(8, Math.round(W * s)), h = Math.max(8, Math.round(H * s));
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(canvas, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data;
  const n = w * h;
  const gray = new Uint8Array(n);
  const hist = new Uint32Array(256);
  for (let i = 0; i < n; i++) {
    const g = (d[i * 4] * 77 + d[i * 4 + 1] * 150 + d[i * 4 + 2] * 29) >> 8;
    gray[i] = g;
    hist[g]++;
  }
  // Otsu-Schwelle
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0, wB = 0, best = 0, thr = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (!wB) continue;
    const wF = n - wB;
    if (!wF) break;
    sumB += t * hist[t];
    const mB = sumB / wB, mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > best) { best = between; thr = t; }
  }
  // Größte zusammenhängende helle Fläche
  const label = new Int32Array(n).fill(-1);
  const stack = new Int32Array(n);
  let bestComp = null;
  for (let start = 0; start < n; start++) {
    if (gray[start] <= thr || label[start] !== -1) continue;
    let sp = 0, size = 0;
    let tl = start, br = start, tr = start, bl = start;
    let tlV = Infinity, brV = -Infinity, trV = -Infinity, blV = Infinity;
    let touchesAll = 0;
    stack[sp++] = start;
    label[start] = start;
    while (sp) {
      const p = stack[--sp];
      size++;
      const x = p % w, y = (p / w) | 0;
      if (x + y < tlV) { tlV = x + y; tl = p; }
      if (x + y > brV) { brV = x + y; br = p; }
      if (x - y > trV) { trV = x - y; tr = p; }
      if (x - y < blV) { blV = x - y; bl = p; }
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) touchesAll++;
      const nb = [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1];
      for (const q of nb) {
        if (q >= 0 && label[q] === -1 && gray[q] > thr) { label[q] = start; stack[sp++] = q; }
      }
    }
    if (!bestComp || size > bestComp.size) bestComp = { size, tl, tr, br, bl, touchesAll };
  }
  const area = bestComp ? bestComp.size / n : 0;
  if (!bestComp || area < 0.12 || area > 0.97) return defaultCorners(W, H);
  const pt = (p) => [((p % w) + 0.5) / s, (((p / w) | 0) + 0.5) / s];
  const corners = [pt(bestComp.tl), pt(bestComp.tr), pt(bestComp.br), pt(bestComp.bl)];
  // Plausibilität: die gefundene Fläche muss ein vernünftiges Viereck ergeben
  if (quadArea(corners) < W * H * 0.1) return defaultCorners(W, H);
  return corners.map(([x, y]) => [Math.min(W, Math.max(0, x)), Math.min(H, Math.max(0, y))]);
}

function quadArea(q) {
  let a = 0;
  for (let i = 0; i < 4; i++) {
    const [x1, y1] = q[i], [x2, y2] = q[(i + 1) % 4];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2;
}

/** Löst A·x = b (Gauß-Elimination mit Pivotsuche). */
function solve(A, b) {
  const n = b.length;
  for (let i = 0; i < n; i++) {
    let max = i;
    for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[max][i])) max = r;
    [A[i], A[max]] = [A[max], A[i]];
    [b[i], b[max]] = [b[max], b[i]];
    for (let r = i + 1; r < n; r++) {
      const f = A[r][i] / A[i][i];
      for (let c = i; c < n; c++) A[r][c] -= f * A[i][c];
      b[r] -= f * b[i];
    }
  }
  const x = new Array(n);
  for (let i = n - 1; i >= 0; i--) {
    let s = b[i];
    for (let c = i + 1; c < n; c++) s -= A[i][c] * x[c];
    x[i] = s / A[i][i];
  }
  return x;
}

/** Homographie, die Punkte des Zielrechtecks (W×H) auf das Viereck im Foto abbildet. */
function homography(quad, W, H) {
  const dst = [[0, 0], [W, 0], [W, H], [0, H]];
  const A = [], b = [];
  for (let i = 0; i < 4; i++) {
    const [u, v] = dst[i], [x, y] = quad[i];
    A.push([u, v, 1, 0, 0, 0, -u * x, -v * x]); b.push(x);
    A.push([0, 0, 0, u, v, 1, -u * y, -v * y]); b.push(y);
  }
  return solve(A, b);
}

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/**
 * Entzerrt das Viereck `corners` aus `canvas` zu einem geraden Blatt und wendet einen Filter an.
 * filter: 'original' | 'color' (aufgehellt) | 'gray' | 'bw'
 */
export function warpDocument(canvas, corners, filter = 'color', maxSide = 2000) {
  const [tl, tr, br, bl] = corners;
  let W = Math.max(dist(tl, tr), dist(bl, br));
  let H = Math.max(dist(tl, bl), dist(tr, br));
  const f = Math.min(1.5, maxSide / Math.max(W, H));
  W = Math.max(16, Math.round(W * f));
  H = Math.max(16, Math.round(H * f));
  const h = homography(corners, W, H);

  const sw = canvas.width, sh = canvas.height;
  const src = canvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, sw, sh).data;
  const out = document.createElement('canvas');
  out.width = W; out.height = H;
  const octx = out.getContext('2d');
  const img = octx.createImageData(W, H);
  const o = img.data;
  for (let v = 0; v < H; v++) {
    for (let u = 0; u < W; u++) {
      const den = h[6] * u + h[7] * v + 1;
      let x = (h[0] * u + h[1] * v + h[2]) / den;
      let y = (h[3] * u + h[4] * v + h[5]) / den;
      x = Math.min(sw - 1.001, Math.max(0, x));
      y = Math.min(sh - 1.001, Math.max(0, y));
      const x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0;
      const i00 = (y0 * sw + x0) * 4, i10 = i00 + 4, i01 = i00 + sw * 4, i11 = i01 + 4;
      const k = (v * W + u) * 4;
      for (let c = 0; c < 3; c++) {
        const top = src[i00 + c] + (src[i10 + c] - src[i00 + c]) * fx;
        const bot = src[i01 + c] + (src[i11 + c] - src[i01 + c]) * fx;
        o[k + c] = top + (bot - top) * fy;
      }
      o[k + 3] = 255;
    }
  }
  if (filter !== 'original') enhance(img, filter);
  octx.putImageData(img, 0, 0);
  return out;
}

/** Gleicht ungleichmäßige Beleuchtung aus (Papier wird weiß) und verstärkt den Kontrast. */
function enhance(img, filter) {
  const { width: W, height: H, data: d } = img;
  const B = Math.max(12, Math.round(Math.min(W, H) / 36));
  const gw = Math.ceil(W / B), gh = Math.ceil(H / B);
  let grid = new Float32Array(gw * gh);
  // Hellster Wert je Block (in 2er-Schritten) = Papierhelligkeit
  for (let by = 0; by < gh; by++) {
    for (let bx = 0; bx < gw; bx++) {
      let m = 0;
      const ye = Math.min(H, (by + 1) * B), xe = Math.min(W, (bx + 1) * B);
      for (let y = by * B; y < ye; y += 2) {
        for (let x = bx * B; x < xe; x += 2) {
          const i = (y * W + x) * 4;
          const l = (d[i] * 77 + d[i + 1] * 150 + d[i + 2] * 29) >> 8;
          if (l > m) m = l;
        }
      }
      grid[by * gw + bx] = Math.max(40, m);
    }
  }
  // Zweimal 3×3 glätten
  for (let pass = 0; pass < 2; pass++) {
    const g2 = new Float32Array(gw * gh);
    for (let y = 0; y < gh; y++) {
      for (let x = 0; x < gw; x++) {
        let s = 0, c = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, yy = y + dy;
          if (xx >= 0 && yy >= 0 && xx < gw && yy < gh) { s += grid[yy * gw + xx]; c++; }
        }
        g2[y * gw + x] = s / c;
      }
    }
    grid = g2;
  }
  const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);
  for (let y = 0; y < H; y++) {
    const gy = Math.min(gh - 1.001, Math.max(0, (y + 0.5) / B - 0.5));
    const y0 = gy | 0, fy = gy - y0, y1 = Math.min(gh - 1, y0 + 1);
    for (let x = 0; x < W; x++) {
      const gx = Math.min(gw - 1.001, Math.max(0, (x + 0.5) / B - 0.5));
      const x0 = gx | 0, fx = gx - x0, x1 = Math.min(gw - 1, x0 + 1);
      const top = grid[y0 * gw + x0] + (grid[y0 * gw + x1] - grid[y0 * gw + x0]) * fx;
      const bot = grid[y1 * gw + x0] + (grid[y1 * gw + x1] - grid[y1 * gw + x0]) * fx;
      const bg = top + (bot - top) * fy;
      const i = (y * W + x) * 4;
      if (filter === 'color') {
        for (let c = 0; c < 3; c++) d[i + c] = clamp((d[i + c] * 255 / bg - 28) * 1.13);
      } else {
        const l = (d[i] * 77 + d[i + 1] * 150 + d[i + 2] * 29) >> 8;
        const nrm = l / bg;
        const v = filter === 'bw' ? (nrm < 0.74 ? 0 : 255) : clamp((nrm * 255 - 45) * 1.3);
        d[i] = d[i + 1] = d[i + 2] = v;
      }
    }
  }
}
