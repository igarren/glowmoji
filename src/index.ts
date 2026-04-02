// ─── Types ──────────────────────────────────────────────────────────────────

export type Shape = 'square' | 'squircle' | 'circle';

export interface GlowmojiOptions {
  /** Seed string — username, email, anything deterministic */
  name: string;
  /** Pixel size (width & height). Default: 64 */
  size?: number;
  /** Outer + face shape. Default: 'squircle' */
  shape?: Shape;
  /**
   * Override the glow/face color with any CSS hex color (e.g. '#ff6b6b').
   * When provided, the palette's face/glow colors are replaced with derived
   * tints of this color while bg and dark are kept from the palette.
   */
  color?: string;
}

export interface GlowmojiResult {
  /** Raw SVG markup string */
  svg: string;
  /** A data-URI you can drop into an <img src="…"> */
  dataUri: string;
  /** Palette that was chosen */
  palette: Palette;
}

export interface Palette {
  bg: string;
  face: string;
  glow: string;
  dark: string;
}

// ─── Palettes ───────────────────────────────────────────────────────────────

const PALETTES: Palette[] = [
  { bg: '#050a06', face: '#c2f0a0', glow: '#d8ffb8', dark: '#1a3a08' },
  { bg: '#05060f', face: '#a0b8f0', glow: '#c0d4ff', dark: '#0a1840' },
  { bg: '#0f0510', face: '#dda0f0', glow: '#f0c8ff', dark: '#3a0850' },
  { bg: '#0f0a00', face: '#f0d898', glow: '#fff0b0', dark: '#3a2800' },
  { bg: '#0f0505', face: '#f0a8a8', glow: '#ffc8ff', dark: '#3a0808' },
  { bg: '#00080f', face: '#98d8f0', glow: '#b8f0ff', dark: '#00283a' },
  { bg: '#050f08', face: '#98f0c0', glow: '#b8ffd8', dark: '#003a18' },
  { bg: '#0a080f', face: '#b8a8f0', glow: '#d4c8ff', dark: '#180838' },
];

// ─── Color helpers ──────────────────────────────────────────────────────────

/**
 * Given a hex color like '#ff6b6b', return a lightened version for the glow.
 * Blends the color toward white by `amount` (0–1).
 */
function lighten(hex: string, amount: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 0xff) + (255 - ((n >> 16) & 0xff)) * amount));
  const g = Math.min(255, Math.round(((n >> 8) & 0xff) + (255 - ((n >> 8) & 0xff)) * amount));
  const b = Math.min(255, Math.round((n & 0xff) + (255 - (n & 0xff)) * amount));
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(31, h) + s.charCodeAt(i) | 0;
  }
  return Math.abs(h);
}

function getPalette(name: string): Palette {
  return PALETTES[hashStr(name) % PALETTES.length];
}

function getInitial(name: string): string {
  return (name || '?').trim().charAt(0).toUpperCase();
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── Border radius for the outer wrapper (CSS) ─────────────────────────────

export function getBorderRadius(shape: Shape, size: number): string {
  if (shape === 'circle') return `${size / 2}px`;
  if (shape === 'squircle') return `${Math.round(size * 0.22)}px`;
  return `${Math.round(size * 0.07)}px`;
}

// ─── Face shape path builder ────────────────────────────────────────────────

/**
 * Returns SVG markup for the face shape — a circle, squircle, or rounded-rect
 * centred at (cx, cy) with the given "radius" (half-width).
 */
function faceShape(
  cx: number,
  cy: number,
  r: number,
  shape: Shape,
  fill: string,
  uid: string,
): string {
  if (shape === 'circle') {
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`;
  }

  // For square / squircle we draw a rounded rect centred on (cx, cy).
  const side = r * 2;
  const x = cx - r;
  const y = cy - r;

  if (shape === 'square') {
    const rx = r * 0.15; // slight rounding so it doesn't look harsh
    return `<rect x="${x}" y="${y}" width="${side}" height="${side}" rx="${rx}" ry="${rx}" fill="${fill}"/>`;
  }

  // squircle — use an SVG superellipse path for a smooth iOS-style shape
  return superellipsePath(cx, cy, r, r, fill);
}

/**
 * Attempt a superellipse (squircle) via cubic bezier approximation.
 * n ≈ 4 (iOS-style). k controls how "square" the curves are (0.82–0.86 is good).
 */
function superellipsePath(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  fill: string,
): string {
  const k = 0.85; // control-point ratio — higher = more square
  const kx = rx * k;
  const ky = ry * k;

  // Start at top-centre, go clockwise
  const d = [
    `M ${cx} ${cy - ry}`,
    `C ${cx + kx} ${cy - ry}, ${cx + rx} ${cy - ky}, ${cx + rx} ${cy}`,
    `C ${cx + rx} ${cy + ky}, ${cx + kx} ${cy + ry}, ${cx} ${cy + ry}`,
    `C ${cx - kx} ${cy + ry}, ${cx - rx} ${cy + ky}, ${cx - rx} ${cy}`,
    `C ${cx - rx} ${cy - ky}, ${cx - kx} ${cy - ry}, ${cx} ${cy - ry}`,
    'Z',
  ].join(' ');

  return `<path d="${d}" fill="${fill}"/>`;
}

/**
 * Glow layers — same shape as the face, just larger and translucent.
 */
function glowLayers(
  cx: number,
  cy: number,
  baseR: number,
  shape: Shape,
  color: string,
  uid: string,
): string {
  const layers = [
    { r: baseR * 1.50, o: 0.07 },
    { r: baseR * 1.25, o: 0.10 },
    { r: baseR * 1.05, o: 0.14 },
    { r: baseR * 0.88, o: 0.18 },
    { r: baseR * 0.70, o: 0.15 },
  ];

  return layers
    .map((l) => {
      if (shape === 'circle') {
        return `<circle cx="${cx}" cy="${cy}" r="${l.r}" fill="${color}" opacity="${l.o}"/>`;
      }
      // For squircle / square, keep glow as circles — it looks better
      return `<circle cx="${cx}" cy="${cy}" r="${l.r}" fill="${color}" opacity="${l.o}"/>`;
    })
    .join('\n    ');
}

/**
 * Specular highlight — an elliptical shine on the upper-left of the face.
 * Adapts to the face shape so it sits naturally inside.
 */
function specularHighlight(
  cx: number,
  cy: number,
  faceR: number,
  shape: Shape,
): string {
  const hx = cx - faceR * 0.25;
  const hy = cy - faceR * 0.3;
  const hrx = faceR * 0.18;
  const hry = faceR * 0.1;
  const angle = shape === 'square' ? -15 : -30;
  return `<ellipse cx="${hx}" cy="${hy}" rx="${hrx}" ry="${hry}" fill="white" opacity="0.28" transform="rotate(${angle} ${hx} ${hy})"/>`;
}

// ─── Main generator ─────────────────────────────────────────────────────────

/**
 * Generate a glowmoji-style avatar.
 *
 * ```ts
 * import { glowmoji } from 'glowmoji';
 * const { svg, dataUri } = glowmoji({ name: 'Alice', size: 64, shape: 'squircle', color: '#ff6b6b' });
 * document.getElementById('avatar').innerHTML = svg;
 * ```
 */
export function glowmoji(options: GlowmojiOptions): GlowmojiResult {
  const { name, size: s = 64, shape = 'squircle', color } = options;

  const base = getPalette(name);
  // If a custom color is passed, override face + glow while keeping bg/dark
  const p: Palette = color
    ? { ...base, face: color, glow: lighten(color, 0.25) }
    : base;
  const h = hashStr(name);
  const init = escapeXml(getInitial(name));
  const uid = ((h >>> 0) % 0xffffff).toString(36);

  const cx = s / 2;
  const cy = s / 2;
  const faceR = s * 0.43;

  // Eyes
  const eyeY = cy - faceR * 0.1;
  const eyeGap = faceR * 0.32;
  const lx = cx - eyeGap;
  const rx = cx + eyeGap;
  const dotR = faceR * 0.1;

  // Letter — bumped up from 0.12 → 0.18
  const fontSize = Math.round(s * 0.18);
  const letterY = cy + faceR * 0.22;

  // Mouth — tiny offset for character
  const mouthY = cy + faceR * 0.46;
  const mouthW = faceR * 0.3;
  const mouthX = cx + ((h >> 10) % 5) - 2;
  const mouthH = Math.max(1.5, s * 0.02);

  // Outer clip
  const outerRx =
    shape === 'circle' ? s / 2 :
    shape === 'squircle' ? Math.round(s * 0.22) :
    Math.round(s * 0.07);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" style="display:block;">
  <defs>
    <radialGradient id="fg_${uid}" cx="36%" cy="30%" r="70%">
      <stop offset="0%" stop-color="${p.glow}"/>
      <stop offset="40%" stop-color="${p.face}"/>
      <stop offset="100%" stop-color="${p.face}"/>
    </radialGradient>
    <clipPath id="clip_${uid}">
      <rect width="${s}" height="${s}" rx="${outerRx}" ry="${outerRx}"/>
    </clipPath>
  </defs>
  <g clip-path="url(#clip_${uid})">
    <rect width="${s}" height="${s}" fill="${p.bg}"/>
    ${glowLayers(cx, cy, faceR, shape, p.glow, uid)}
    ${faceShape(cx, cy, faceR, shape, `url(#fg_${uid})`, uid)}
    ${specularHighlight(cx, cy, faceR, shape)}
    <ellipse cx="${lx}" cy="${eyeY}" rx="${dotR}" ry="${dotR}" fill="${p.dark}"/>
    <ellipse cx="${rx}" cy="${eyeY}" rx="${dotR}" ry="${dotR}" fill="${p.dark}"/>
    <text x="${cx}" y="${letterY}" text-anchor="middle" font-family="monospace" font-size="${fontSize}" font-weight="700" fill="${p.dark}" opacity="0.35" dominant-baseline="central">${init}</text>
    <rect x="${mouthX - mouthW / 2}" y="${mouthY}" width="${mouthW}" height="${mouthH}" rx="${mouthH / 2}" fill="${p.dark}" opacity="0.6"/>
  </g>
</svg>`;

  const dataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

  return { svg, dataUri, palette: p };
}

// convenience re-exports
export { PALETTES, hashStr };
export default glowmoji;
