// Cover-Designs für Notizbücher: Vektorgrafiken (300×400), als Hintergrundbild eingebunden.

function rng(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}
const svg = (body, defs = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400" preserveAspectRatio="xMidYMid slice"><defs>${defs}</defs>${body}</svg>`;

function terrazzo() {
  const r = rng(11), cols = ['#e07a5f', '#3d405b', '#81b29a', '#f2cc8f', '#c9ada7'];
  let out = '<rect width="300" height="400" fill="#f4efe8"/>';
  for (let i = 0; i < 70; i++) {
    const x = r() * 300, y = r() * 400, s = 3 + r() * 12, a = r() * 180;
    out += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${s.toFixed(1)}" ry="${(s * (0.45 + r() * 0.5)).toFixed(1)}" transform="rotate(${a.toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})" fill="${cols[i % cols.length]}"/>`;
  }
  return svg(out);
}
function night() {
  const r = rng(5);
  let stars = '';
  for (let i = 0; i < 90; i++) stars += `<circle cx="${(r() * 300).toFixed(1)}" cy="${(r() * 400).toFixed(1)}" r="${(0.5 + r() * 1.4).toFixed(2)}" fill="#fff" opacity="${(0.4 + r() * 0.6).toFixed(2)}"/>`;
  return svg(`<rect width="300" height="400" fill="url(#ng)"/>${stars}<circle cx="215" cy="95" r="34" fill="#fff4d6"/><circle cx="230" cy="85" r="30" fill="#232a63"/>`,
    '<linearGradient id="ng" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#101935"/><stop offset="1" stop-color="#2d2f74"/></linearGradient>');
}
function leaves() {
  const r = rng(3), cols = ['#6b9e6e', '#a7c957', '#f2e8cf', '#4c7a5c'];
  let out = '<rect width="300" height="400" fill="#264536"/>';
  for (let i = 0; i < 26; i++) {
    const x = r() * 320 - 10, y = r() * 420 - 10, a = r() * 360, s = 14 + r() * 22;
    out += `<g transform="translate(${x.toFixed(0)} ${y.toFixed(0)}) rotate(${a.toFixed(0)})"><path d="M0 ${-s} C ${s * 0.7} ${-s * 0.4} ${s * 0.7} ${s * 0.4} 0 ${s} C ${-s * 0.7} ${s * 0.4} ${-s * 0.7} ${-s * 0.4} 0 ${-s}Z" fill="${cols[i % cols.length]}"/><path d="M0 ${-s} L0 ${s}" stroke="#264536" stroke-width="1.2" opacity=".5"/></g>`;
  }
  return svg(out);
}

export const COVER_DESIGNS = {
  brush: { name: 'Pinselstriche', light: true, base: '#f6f1e7', svg: svg(`
    <rect width="300" height="400" fill="#f6f1e7"/>
    <path d="M-20 60 C 60 20 140 90 210 40 S 330 20 340 70 L 340 150 C 250 175 150 120 60 172 S -20 160 -20 140Z" fill="#e8c66a"/>
    <path d="M180 120 C 250 110 330 160 320 260 C 300 330 230 300 200 250 C 170 200 140 160 180 120Z" fill="#8fb1c4"/>
    <path d="M-10 230 C 40 210 95 255 82 305 C 70 355 20 380 -10 360Z" fill="#f2b8c6"/>
    <path d="M60 300 C 120 268 200 300 260 330 S 335 360 335 420 L -20 420 L -20 360 C 10 340 30 320 60 300Z" fill="#a9c3cf"/>
    <path d="M196 330 C 240 318 300 340 312 380 L 312 420 L 186 420Z" fill="#e8c66a"/>
    <g stroke="#fff" stroke-width="2.4" opacity=".35" fill="none"><path d="M10 95 C 90 70 170 120 290 70"/><path d="M190 160 C 240 175 280 210 300 250"/><path d="M40 360 C 120 330 200 350 300 380"/></g>`) },
  sage: { name: 'Salbei', light: true, base: '#e9efd6', svg: svg(`
    <rect width="300" height="400" fill="#e9efd6"/>
    <rect width="150" height="250" fill="url(#vl)"/>
    <path d="M0 205 C 60 150 140 235 210 190 S 300 170 300 212 L 300 262 L 0 262Z" fill="#d7e3b6"/>
    <rect y="262" width="300" height="138" fill="#b9cc97"/>
    <rect y="262" width="300" height="138" fill="url(#hl)"/>`,
    '<pattern id="vl" width="7" height="10" patternUnits="userSpaceOnUse"><rect width="2" height="10" fill="#c3d2a2"/></pattern><pattern id="hl" width="10" height="6" patternUnits="userSpaceOnUse"><rect width="10" height="1.6" fill="#a5bb83"/></pattern>') },
  terrazzo: { name: 'Terrazzo', light: true, base: '#f4efe8', svg: terrazzo() },
  waves: { name: 'Wellen', light: true, base: '#dfeefa', svg: svg(`
    <rect width="300" height="400" fill="#e6f2fb"/>
    <path d="M0 170 C 60 140 110 200 170 170 S 260 140 300 165 L300 400 L0 400Z" fill="#b8dcf2"/>
    <path d="M0 225 C 70 195 120 255 185 222 S 265 200 300 220 L300 400 L0 400Z" fill="#7fbde3"/>
    <path d="M0 285 C 60 258 125 312 190 282 S 270 262 300 280 L300 400 L0 400Z" fill="#3f93c9"/>
    <path d="M0 345 C 70 320 130 368 195 342 S 270 325 300 340 L300 400 L0 400Z" fill="#1f5f99"/>
    <circle cx="70" cy="80" r="26" fill="#fff" opacity=".8"/>`) },
  sunset: { name: 'Abendrot', light: false, base: '#ff8a7a', svg: svg(`
    <rect width="300" height="400" fill="url(#ss)"/>
    <circle cx="150" cy="235" r="78" fill="#ffe29a"/>
    <g fill="#ff8a8a"><rect y="250" width="300" height="9"/><rect y="272" width="300" height="12"/><rect y="298" width="300" height="16"/><rect y="328" width="300" height="22"/><rect y="364" width="300" height="36"/></g>`,
    '<linearGradient id="ss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb47d"/><stop offset=".6" stop-color="#ff7c8f"/><stop offset="1" stop-color="#b8517d"/></linearGradient>') },
  grid: { name: 'Raster', light: false, base: '#1f2a44', svg: svg(`
    <rect width="300" height="400" fill="#1f2a44"/>
    <rect width="300" height="400" fill="url(#gr)"/>
    <circle cx="210" cy="140" r="58" fill="none" stroke="#f2c14e" stroke-width="5"/>
    <rect x="40" y="250" width="90" height="90" fill="none" stroke="#7dd3c8" stroke-width="5" transform="rotate(12 85 295)"/>`,
    '<pattern id="gr" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#ffffff" stroke-opacity=".12" stroke-width="1"/></pattern>') },
  dots: { name: 'Punkte', light: true, base: '#f2c14e', svg: svg(`
    <rect width="300" height="400" fill="#f2c14e"/><rect width="300" height="400" fill="url(#dt)"/>`,
    '<pattern id="dt" width="30" height="30" patternUnits="userSpaceOnUse"><circle cx="7" cy="7" r="5" fill="#fff6dc"/><circle cx="22" cy="22" r="5" fill="#fff6dc"/></pattern>') },
  stripes: { name: 'Streifen', light: true, base: '#f7d6e0', svg: svg(`
    <rect width="300" height="400" fill="#fbeff3"/><rect width="300" height="400" fill="url(#st)"/>`,
    '<pattern id="st" width="48" height="48" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="16" height="48" fill="#f4b6c8"/><rect x="16" width="8" height="48" fill="#a8d5e2"/></pattern>') },
  marble: { name: 'Marmor', light: true, base: '#f2f0ec', svg: svg(`
    <rect width="300" height="400" fill="#f3f1ed"/><rect width="300" height="400" filter="url(#mb)"/>`,
    '<filter id="mb" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".008 .03" numOctaves="4" seed="8"/><feColorMatrix values="0 0 0 0 .42  0 0 0 0 .43  0 0 0 0 .46  -4.2 0 0 0 2.3"/></filter>') },
  mountains: { name: 'Berge', light: true, base: '#dbeaf0', svg: svg(`
    <rect width="300" height="400" fill="url(#mg)"/>
    <circle cx="205" cy="120" r="34" fill="#fff1c9"/>
    <path d="M0 260 L70 170 L120 225 L185 140 L300 255 L300 400 L0 400Z" fill="#9db8ca"/>
    <path d="M0 300 L90 215 L150 275 L215 205 L300 290 L300 400 L0 400Z" fill="#6f8fa8"/>
    <path d="M0 345 L60 300 L130 340 L210 285 L300 335 L300 400 L0 400Z" fill="#3f5d73"/>`,
    '<linearGradient id="mg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfe6f1"/><stop offset="1" stop-color="#f7efe2"/></linearGradient>') },
  leaves: { name: 'Blätter', light: false, base: '#264536', svg: leaves() },
  night: { name: 'Nachthimmel', light: false, base: '#14213d', svg: night() },
};

const urlCache = {};
export const isDesign = (c) => typeof c === 'string' && c.startsWith('d:') && !!COVER_DESIGNS[c.slice(2)];
export function coverStyle(c) {
  if (!isDesign(c)) return `--cover:${c}`;
  const k = c.slice(2);
  // einfache Anführungszeichen, damit der Wert in style="…" eingebettet werden kann
  urlCache[k] ??= `url('data:image/svg+xml,${encodeURIComponent(COVER_DESIGNS[k].svg.replace(/\s+/g, ' ')).replace(/'/g, '%27')}')`;
  return `--cover:${COVER_DESIGNS[k].base};background-image:${urlCache[k]};background-size:cover;background-position:center`;
}
export const designLight = (c) => isDesign(c) && COVER_DESIGNS[c.slice(2)].light;
