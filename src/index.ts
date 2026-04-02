// ─── Types ──────────────────────────────────────────────────────────────────

export type Shape = 'square' | 'rounded' | 'circle';
export type ClickAnimation = 'blink' | 'hurt' | 'kiss';

export interface GlowmojiOptions {
  /** Seed string — username, email, anything deterministic */
  name: string;
  /** Pixel size (width & height). Default: 64 */
  size?: number;
  /** Outer + face shape. Default: 'rounded' */
  shape?: Shape;
  /**
   * Override the glow/face color with any CSS hex color (e.g. '#ff6b6b').
   * When provided, the palette's face/glow colors are replaced with derived
   * tints of this color while bg and dark are kept from the palette.
   */
  color?: string;
  /**
   * Skip the dark background rect — useful on light pages.
   * The glow will blend into whatever is behind the SVG instead.
   */
  transparent?: boolean;
}

export interface GlowmojiResult {
  /** Raw SVG markup string */
  svg: string;
  /** A data-URI you can drop into an <img src="…"> */
  dataUri: string;
  /** Palette that was chosen */
  palette: Palette;
  /**
   * Animate a blink on the avatar element.
   * Pass the DOM element that contains the SVG (e.g. the div you set innerHTML on).
   */
  blink: (container: Element) => void;
  /**
   * Start auto-blinking on an interval. Returns a cleanup function to stop it.
   */
  autoBlink: (container: Element) => () => void;
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
  if (shape === 'rounded') return `${Math.round(size * 0.22)}px`;
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

  // For square / rounded we draw a rounded rect centred on (cx, cy).
  const side = r * 2;
  const x = cx - r;
  const y = cy - r;

  if (shape === 'square') {
    const rx = r * 0.15; // slight rounding so it doesn't look harsh
    return `<rect x="${x}" y="${y}" width="${side}" height="${side}" rx="${rx}" ry="${rx}" fill="${fill}"/>`;
  }

  // rounded — use an SVG superellipse path for a smooth iOS-style shape
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

// ─── Blink animation ────────────────────────────────────────────────────────

/**
 * Animate a single blink on the avatar inside `container`.
 * Looks for SVG eye ellipses by their id pattern.
 */
export function blink(container: Element): void {
  // eyes have ids like "XXXXXX_le" and "XXXXXX_re"
  const le = container.querySelector<SVGEllipseElement>('[id$="_le"]');
  const re = container.querySelector<SVGEllipseElement>('[id$="_re"]');
  if (!le || !re) return;
  const dotR = parseFloat(le.getAttribute('rx') ?? '0');
  const start = performance.now();
  function step(now: number) {
    const el = now - start;
    let ry: number;
    if (el < 70)       ry = dotR * (1 - el / 70);
    else if (el < 110) ry = 0;
    else if (el < 220) ry = dotR * ((el - 110) / 110);
    else {
      le!.setAttribute('ry', String(dotR));
      re!.setAttribute('ry', String(dotR));
      return;
    }
    const v = String(Math.max(0, ry));
    le!.setAttribute('ry', v);
    re!.setAttribute('ry', v);
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/**
 * Start auto-blinking on an interval. Returns a cleanup function to stop it.
 *
 * ```ts
 * const stop = autoBlink(document.getElementById('avatar'));
 * // later...
 * stop();
 * ```
 */
export function autoBlink(container: Element): () => void {
  let timer: ReturnType<typeof setTimeout>;
  function next() {
    timer = setTimeout(() => { blink(container); next(); }, 2000 + Math.random() * 3500);
  }
  timer = setTimeout(() => { blink(container); next(); }, 500 + Math.random() * 2000);
  return () => clearTimeout(timer);
}

// ─── Hurt animation ─────────────────────────────────────────────────────────

/**
 * Animate a "hurt" reaction — the face squishes slightly, eyes become X marks,
 * and the mouth opens into a round "ow" circle.
 */
export function hurt(container: Element): void {
  const svgEl = container.querySelector('svg');
  if (!svgEl) return;

  const leEl = container.querySelector<SVGEllipseElement>('[id$="_le"]');
  const reEl = container.querySelector<SVGEllipseElement>('[id$="_re"]');
  const mouth = svgEl.querySelector<SVGRectElement>('[data-mouth]');
  if (!leEl || !reEl) return;

  const svg = svgEl;
  const le = leEl;
  const re = reEl;
  const g = svg.querySelector('g')!;

  const dotR = parseFloat(le.getAttribute('rx') ?? '0');
  const leCx = parseFloat(le.getAttribute('cx') ?? '0');
  const leCy = parseFloat(le.getAttribute('cy') ?? '0');
  const reCx = parseFloat(re.getAttribute('cx') ?? '0');
  const reCy = parseFloat(re.getAttribute('cy') ?? '0');
  const eyeColor = le.getAttribute('fill') ?? '#000';

  const origMouthW = mouth ? parseFloat(mouth.getAttribute('width') ?? '0') : 0;
  const origMouthH = mouth ? parseFloat(mouth.getAttribute('height') ?? '0') : 0;
  const origMouthX = mouth ? parseFloat(mouth.getAttribute('x') ?? '0') : 0;
  const origMouthY = mouth ? parseFloat(mouth.getAttribute('y') ?? '0') : 0;
  const origMouthRx = mouth ? parseFloat(mouth.getAttribute('rx') ?? '0') : 0;

  // Create X lines for each eye
  const ns = 'http://www.w3.org/2000/svg';
  const xSize = dotR * 1.4;
  const strokeW = Math.max(1, dotR * 0.55);

  function makeX(cx: number, cy: number): SVGGElement {
    const xg = document.createElementNS(ns, 'g');
    xg.setAttribute('data-hurt-x', '1');
    const l1 = document.createElementNS(ns, 'line');
    l1.setAttribute('x1', String(cx - xSize)); l1.setAttribute('y1', String(cy - xSize));
    l1.setAttribute('x2', String(cx + xSize)); l1.setAttribute('y2', String(cy + xSize));
    l1.setAttribute('stroke', eyeColor); l1.setAttribute('stroke-width', String(strokeW));
    l1.setAttribute('stroke-linecap', 'round');
    const l2 = document.createElementNS(ns, 'line');
    l2.setAttribute('x1', String(cx + xSize)); l2.setAttribute('y1', String(cy - xSize));
    l2.setAttribute('x2', String(cx - xSize)); l2.setAttribute('y2', String(cy + xSize));
    l2.setAttribute('stroke', eyeColor); l2.setAttribute('stroke-width', String(strokeW));
    l2.setAttribute('stroke-linecap', 'round');
    xg.appendChild(l1); xg.appendChild(l2);
    return xg;
  }

  // Replace mouth rect with a circle
  let mouthCircle: SVGCircleElement | null = null;
  if (mouth) {
    const mouthCx = origMouthX + origMouthW / 2;
    const mouthCy = origMouthY + origMouthH / 2;
    const mouthR = dotR * 1.2;
    mouthCircle = document.createElementNS(ns, 'circle');
    mouthCircle.setAttribute('cx', String(mouthCx));
    mouthCircle.setAttribute('cy', String(mouthCy));
    mouthCircle.setAttribute('r', String(mouthR));
    mouthCircle.setAttribute('fill', mouth.getAttribute('fill') ?? '#000');
    mouthCircle.setAttribute('opacity', mouth.getAttribute('opacity') ?? '0.6');
    mouthCircle.setAttribute('data-hurt-mouth', '1');
  }

  const duration = 500;
  const start = performance.now();
  let xShown = false;

  function step(now: number) {
    const elapsed = now - start;
    const t = Math.min(elapsed / duration, 1);

    // Gentle squish
    const squish = t < 0.3
      ? 1 - 0.05 * (t / 0.3)
      : 1 - 0.05 * (1 - (t - 0.3) / 0.7);
    svg.style.transform = `scaleY(${squish})`;

    // Show X eyes + circle mouth at the start
    if (!xShown && t > 0.02) {
      xShown = true;
      le.style.display = 'none';
      re.style.display = 'none';
      g.appendChild(makeX(leCx, leCy));
      g.appendChild(makeX(reCx, reCy));
      if (mouth && mouthCircle) {
        mouth.style.display = 'none';
        g.appendChild(mouthCircle);
      }
    }

    if (t >= 1) {
      // Reset everything
      svg.style.transform = '';
      le.style.display = '';
      re.style.display = '';
      if (mouth) mouth.style.display = '';
      // Remove X marks and circle mouth
      g.querySelectorAll('[data-hurt-x]').forEach(el => el.remove());
      g.querySelectorAll('[data-hurt-mouth]').forEach(el => el.remove());
      return;
    }
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ─── Kiss animation ─────────────────────────────────────────────────────────

/**
 * Animate a "kiss" — one eye winks, mouth puckers, and a heart floats up.
 */
export function kiss(container: Element): void {
  const svgEl = container.querySelector('svg');
  if (!svgEl) return;

  const leEl = container.querySelector<SVGEllipseElement>('[id$="_le"]');
  const reEl = container.querySelector<SVGEllipseElement>('[id$="_re"]');
  const mouth = svgEl.querySelector<SVGRectElement>('[data-mouth]');
  if (!leEl || !reEl) return;

  const svg = svgEl;
  const le = leEl;
  const re = reEl;
  const g = svg.querySelector('g')!;
  const ns = 'http://www.w3.org/2000/svg';

  const dotR = parseFloat(le.getAttribute('rx') ?? '0');
  const reCx = parseFloat(re.getAttribute('cx') ?? '0');
  const reCy = parseFloat(re.getAttribute('cy') ?? '0');

  const origMouthW = mouth ? parseFloat(mouth.getAttribute('width') ?? '0') : 0;
  const origMouthH = mouth ? parseFloat(mouth.getAttribute('height') ?? '0') : 0;
  const origMouthX = mouth ? parseFloat(mouth.getAttribute('x') ?? '0') : 0;
  const origMouthY = mouth ? parseFloat(mouth.getAttribute('y') ?? '0') : 0;
  const origMouthRx = mouth ? parseFloat(mouth.getAttribute('rx') ?? '0') : 0;
  const mouthColor = mouth ? (mouth.getAttribute('fill') ?? '#000') : '#000';

  // Pucker lips — ε shape (two curved bumps facing right)
  let pucker: SVGPathElement | null = null;
  if (mouth) {
    const mcx = origMouthX + origMouthW / 2;
    const mcy = origMouthY + origMouthH / 2;
    const r = dotR * 1.2;
    // Two stacked arcs forming the ε / "3" pucker
    const d = [
      `M ${mcx - r * 0.3} ${mcy - r}`,
      `C ${mcx + r * 0.8} ${mcy - r}, ${mcx + r * 0.8} ${mcy}, ${mcx - r * 0.1} ${mcy}`,
      `C ${mcx + r * 0.8} ${mcy}, ${mcx + r * 0.8} ${mcy + r}, ${mcx - r * 0.3} ${mcy + r}`,
    ].join(' ');
    pucker = document.createElementNS(ns, 'path');
    pucker.setAttribute('d', d);
    pucker.setAttribute('fill', 'none');
    pucker.setAttribute('stroke', mouthColor);
    pucker.setAttribute('stroke-width', String(Math.max(1, dotR * 0.45)));
    pucker.setAttribute('stroke-linecap', 'round');
    pucker.setAttribute('opacity', mouth.getAttribute('opacity') ?? '0.6');
    pucker.setAttribute('data-kiss-pucker', '1');
  }

  // Floating heart
  const heartSize = dotR * 2.5;
  const heartX = reCx + dotR * 2;
  const heartStartY = reCy - dotR;
  const heart = document.createElementNS(ns, 'text');
  heart.setAttribute('x', String(heartX));
  heart.setAttribute('y', String(heartStartY));
  heart.setAttribute('font-size', String(heartSize));
  heart.setAttribute('text-anchor', 'middle');
  heart.setAttribute('data-kiss-heart', '1');
  heart.textContent = '❤';

  const duration = 800;
  const start = performance.now();
  let shown = false;

  function step(now: number) {
    const elapsed = now - start;
    const t = Math.min(elapsed / duration, 1);

    // Wink the right eye (ry shrinks to a line)
    const wink = t < 0.12 ? t / 0.12 : t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1;
    re.setAttribute('ry', String(dotR * (1 - wink * 0.9)));

    if (!shown && t > 0.02) {
      shown = true;
      if (mouth && pucker) {
        mouth.style.display = 'none';
        g.appendChild(pucker);
      }
      g.appendChild(heart);
    }

    // Float the heart upward and fade it out
    if (shown) {
      const floatT = Math.max(0, (t - 0.15) / 0.85);
      const yOff = floatT * dotR * 8;
      const opacity = Math.max(0, 1 - floatT * 1.3);
      heart.setAttribute('y', String(heartStartY - yOff));
      heart.setAttribute('opacity', String(opacity));
    }

    if (t >= 1) {
      // Reset
      re.setAttribute('ry', String(dotR));
      if (mouth) mouth.style.display = '';
      g.querySelectorAll('[data-kiss-pucker]').forEach(el => el.remove());
      g.querySelectorAll('[data-kiss-heart]').forEach(el => el.remove());
      return;
    }
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ─── Main generator ─────────────────────────────────────────────────────────

/**
 * Generate a glowmoji-style avatar.
 *
 * ```ts
 * import { glowmoji } from 'glowmoji';
 * const { svg, dataUri } = glowmoji({ name: 'Alice', size: 64, shape: 'rounded', color: '#ff6b6b' });
 * document.getElementById('avatar').innerHTML = svg;
 * ```
 */
export function glowmoji(options: GlowmojiOptions): GlowmojiResult {
  const { name, size: s = 64, shape = 'rounded', color, transparent = false } = options;

  const base = getPalette(name);
  // If a custom color is passed, override face + glow while keeping bg/dark
  const p: Palette = color
    ? { ...base, face: color, glow: lighten(color, 0.25) }
    : base;
  const h = hashStr(name);
  const init = escapeXml(getInitial(name));
  const uid = ((h >>> 0) % 0xffffff).toString(36) + Math.random().toString(36).slice(2, 6);

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
    shape === 'rounded' ? Math.round(s * 0.22) :
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
    ${transparent ? '' : `<rect width="${s}" height="${s}" fill="${p.bg}"/>`}
    ${glowLayers(cx, cy, faceR, shape, p.glow, uid)}
    ${faceShape(cx, cy, faceR, shape, `url(#fg_${uid})`, uid)}
    ${specularHighlight(cx, cy, faceR, shape)}
    <ellipse id="${uid}_le" cx="${lx}" cy="${eyeY}" rx="${dotR}" ry="${dotR}" fill="${p.dark}"/>
    <ellipse id="${uid}_re" cx="${rx}" cy="${eyeY}" rx="${dotR}" ry="${dotR}" fill="${p.dark}"/>
    <text x="${cx}" y="${letterY}" text-anchor="middle" font-family="monospace" font-size="${fontSize}" font-weight="700" fill="${p.dark}" opacity="0.35" dominant-baseline="central">${init}</text>
    <rect data-mouth="1" x="${mouthX - mouthW / 2}" y="${mouthY}" width="${mouthW}" height="${mouthH}" rx="${mouthH / 2}" fill="${p.dark}" opacity="0.6"/>
  </g>
</svg>`;

  const dataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

  return {
    svg,
    dataUri,
    palette: p,
    blink: (container: Element) => blink(container),
    autoBlink: (container: Element) => autoBlink(container),
  };
}

// ─── Mount helper ───────────────────────────────────────────────────────────

/**
 * Mount a glowmoji into a DOM element — sets innerHTML, auto-blinks, and
 * wires up click interaction. Returns a cleanup function.
 *
 * ```ts
 * import { mount } from 'glowmoji';
 * const stop = mount(document.getElementById('avatar'), { name: 'Alice' });
 * // with hurt animation on click:
 * const stop = mount(el, { name: 'Bob' }, { onClickAnimation: 'hurt' });
 * // later: stop() to remove listeners and stop blinking
 * ```
 */
export function mount(
  container: Element,
  options: GlowmojiOptions,
  mountOptions?: { onClickAnimation?: ClickAnimation },
): () => void {
  const { svg } = glowmoji(options);
  container.innerHTML = svg;
  const anim = mountOptions?.onClickAnimation ?? 'blink';
  const onClick = () => {
    if (anim === 'hurt') hurt(container);
    else if (anim === 'kiss') kiss(container);
    else blink(container);
  };
  container.addEventListener('click', onClick);
  (container as HTMLElement).style.cursor = 'pointer';
  const stop = autoBlink(container);
  return () => {
    stop();
    container.removeEventListener('click', onClick);
    (container as HTMLElement).style.cursor = '';
  };
}

// convenience re-exports
export { PALETTES, hashStr };
export default glowmoji;
