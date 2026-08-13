import { deflateSync } from "node:zlib";
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { Buffer } from "node:buffer";

// ---------------------------------------------------------------------------
// GAMEMOA favicon generator — deterministic, dependency-free.
//
// Canonical source: apps/web/public/favicon.svg (hand-authored).
// This script rasterises the SAME design — lucide-react's actual Gamepad2 icon
// path data (the exact icon live-rendered by Header/Sidebar/Footer, not an
// approximation of it) stroked in white on a brand-gradient rounded hub
// (bg-gradient-to-tr from-brand to-accent-purple) — into PNG / ICO fallbacks and
// writes a web manifest. No external image-processing/SVG-rasterisation
// dependency is required: PNGs are encoded with the built-in zlib + a
// hand-written CRC32; pixels are produced by supersampling a distance-to-stroke
// test against the icon's path flattened into line segments (cubic Béziers and
// arcs subdivided analytically — see flattenCubic/flattenArc below).
// ---------------------------------------------------------------------------

const REPO_ROOT = resolve(import.meta.dirname, "..");
const OUT_DIR = resolve(REPO_ROOT, "apps/web", "public");
const SVG_PATH = resolve(OUT_DIR, "favicon.svg");

// Brand palette (must match favicon.svg and apps/web/app/app.css)
const BRAND = [99, 102, 241] as const; // --color-brand #6366f1
const ACCENT_PURPLE = [168, 85, 247] as const; // --color-accent-purple #a855f7
const ICON_WHITE = [255, 255, 255] as const; // matches Header's text-white
const VIEWBOX = 512;
const BG_RX = 112;

// ---------------------------------------------------------------------------
// lucide-react's Gamepad2 icon, transcribed exactly from
// node_modules/lucide-react/dist/esm/icons/gamepad-2.js (24x24 viewBox,
// stroke-width 2, fill: none — every Lucide icon is line art, never filled).
// Body outline path — M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101
// -.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414
// -1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3
// 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0
// 0 17.32 5z — plus 4 <line> elements (D-pad cross, two round-capped "dot"
// buttons). Resolved to absolute coordinates below so this generator never
// needs a general SVG path parser for a shape this static.
// ---------------------------------------------------------------------------
type IconPoint = readonly [number, number];
type IconSegment =
  | { kind: "line"; from: IconPoint; to: IconPoint }
  | { kind: "cubic"; from: IconPoint; c1: IconPoint; c2: IconPoint; to: IconPoint }
  | {
      kind: "arc";
      from: IconPoint;
      rx: number;
      ry: number;
      largeArc: 0 | 1;
      sweep: 0 | 1;
      to: IconPoint;
    };

const BODY_OUTLINE: IconSegment[] = [
  { kind: "line", from: [17.32, 5], to: [6.68, 5] },
  { kind: "arc", from: [6.68, 5], rx: 4, ry: 4, largeArc: 0, sweep: 0, to: [2.702, 8.59] },
  {
    kind: "cubic",
    from: [2.702, 8.59],
    c1: [2.696, 8.642],
    c2: [2.692, 8.691],
    to: [2.685, 8.742],
  },
  { kind: "cubic", from: [2.685, 8.742], c1: [2.604, 9.416], c2: [2, 14.456], to: [2, 16] },
  { kind: "arc", from: [2, 16], rx: 3, ry: 3, largeArc: 0, sweep: 0, to: [5, 19] },
  { kind: "cubic", from: [5, 19], c1: [6, 19], c2: [6.5, 18.5], to: [7, 18] },
  { kind: "line", from: [7, 18], to: [8.414, 16.586] },
  { kind: "arc", from: [8.414, 16.586], rx: 2, ry: 2, largeArc: 0, sweep: 1, to: [9.828, 16] },
  { kind: "line", from: [9.828, 16], to: [14.172, 16] },
  { kind: "arc", from: [14.172, 16], rx: 2, ry: 2, largeArc: 0, sweep: 1, to: [15.586, 16.586] },
  { kind: "line", from: [15.586, 16.586], to: [17, 18] },
  { kind: "cubic", from: [17, 18], c1: [17.5, 18.5], c2: [18, 19], to: [19, 19] },
  { kind: "arc", from: [19, 19], rx: 3, ry: 3, largeArc: 0, sweep: 0, to: [22, 16] },
  {
    kind: "cubic",
    from: [22, 16],
    c1: [22, 14.455],
    c2: [21.396, 9.416],
    to: [21.315, 8.742],
  },
  {
    kind: "cubic",
    from: [21.315, 8.742],
    c1: [21.308, 8.692],
    c2: [21.304, 8.642],
    to: [21.298, 8.591],
  },
  { kind: "arc", from: [21.298, 8.591], rx: 4, ry: 4, largeArc: 0, sweep: 0, to: [17.32, 5] },
];

const DECORATION_LINES: IconSegment[] = [
  { kind: "line", from: [6, 11], to: [10, 11] }, // D-pad horizontal bar
  { kind: "line", from: [8, 9], to: [8, 13] }, // D-pad vertical bar
  { kind: "line", from: [15, 12], to: [15.01, 12] }, // face button (round-capped dot)
  { kind: "line", from: [18, 10], to: [18.01, 10] }, // face button (round-capped dot)
];

const ICON_STROKE_WIDTH = 2; // lucide-react default stroke-width, in 24x24 icon units

/** Cubic Bézier flattened by direct parametric sampling (De Casteljau-equivalent). */
function flattenCubic(from: IconPoint, c1: IconPoint, c2: IconPoint, to: IconPoint, n: number) {
  const pts: IconPoint[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const mt = 1 - t;
    const x =
      mt * mt * mt * from[0] + 3 * mt * mt * t * c1[0] + 3 * mt * t * t * c2[0] + t * t * t * to[0];
    const y =
      mt * mt * mt * from[1] + 3 * mt * mt * t * c1[1] + 3 * mt * t * t * c2[1] + t * t * t * to[1];
    pts.push([x, y]);
  }
  return pts;
}

/** SVG elliptical-arc-to-points, per the SVG 1.1 spec's endpoint-to-center conversion
 * (Appendix F.6). Simplified for x-axis-rotation = 0, which covers every arc in this
 * icon — the only rotation value it ever uses. */
function flattenArc(
  from: IconPoint,
  rx: number,
  ry: number,
  largeArc: 0 | 1,
  sweep: 0 | 1,
  to: IconPoint,
  n: number,
) {
  const [x1, y1] = from;
  const [x2, y2] = to;
  const dx2 = (x1 - x2) / 2;
  const dy2 = (y1 - y2) / 2;
  let rxAdj = rx;
  let ryAdj = ry;
  const lambda = (dx2 * dx2) / (rx * rx) + (dy2 * dy2) / (ry * ry);
  if (lambda > 1) {
    const s = Math.sqrt(lambda);
    rxAdj = rx * s;
    ryAdj = ry * s;
  }
  const sign = largeArc !== sweep ? 1 : -1;
  const num = rxAdj * rxAdj * ryAdj * ryAdj - rxAdj * rxAdj * dy2 * dy2 - ryAdj * ryAdj * dx2 * dx2;
  const den = rxAdj * rxAdj * dy2 * dy2 + ryAdj * ryAdj * dx2 * dx2;
  const co = sign * Math.sqrt(Math.max(0, num / den));
  const cxp = (co * rxAdj * dy2) / ryAdj;
  const cyp = (-co * ryAdj * dx2) / rxAdj;
  const cx = cxp + (x1 + x2) / 2;
  const cy = cyp + (y1 + y2) / 2;

  const angle = (ux: number, uy: number, vx: number, vy: number) => {
    const dot = ux * vx + uy * vy;
    const len = Math.sqrt(ux * ux + uy * uy) * Math.sqrt(vx * vx + vy * vy);
    let a = Math.acos(Math.min(1, Math.max(-1, dot / len)));
    if (ux * vy - uy * vx < 0) a = -a;
    return a;
  };
  const theta1 = angle(1, 0, (x1 - cx) / rxAdj, (y1 - cy) / ryAdj);
  let dtheta = angle((x1 - cx) / rxAdj, (y1 - cy) / ryAdj, (x2 - cx) / rxAdj, (y2 - cy) / ryAdj);
  if (!sweep && dtheta > 0) dtheta -= 2 * Math.PI;
  if (sweep && dtheta < 0) dtheta += 2 * Math.PI;

  const pts: IconPoint[] = [];
  for (let i = 0; i <= n; i++) {
    const t = theta1 + (dtheta * i) / n;
    pts.push([cx + rxAdj * Math.cos(t), cy + ryAdj * Math.sin(t)]);
  }
  return pts;
}

/** Every segment of the icon (body outline + decorations), flattened to short line
 * segments in the icon's native 24x24 coordinate space. Curves are subdivided finely
 * enough that the polyline is visually indistinguishable from the true curve even at
 * 512px+ output. */
function flattenIconToLines(): { a: IconPoint; b: IconPoint }[] {
  const lines: { a: IconPoint; b: IconPoint }[] = [];
  const addPolyline = (pts: IconPoint[]) => {
    for (let i = 0; i < pts.length - 1; i++) lines.push({ a: pts[i]!, b: pts[i + 1]! });
  };
  for (const seg of [...BODY_OUTLINE, ...DECORATION_LINES]) {
    if (seg.kind === "line") lines.push({ a: seg.from, b: seg.to });
    else if (seg.kind === "cubic") addPolyline(flattenCubic(seg.from, seg.c1, seg.c2, seg.to, 24));
    else addPolyline(flattenArc(seg.from, seg.rx, seg.ry, seg.largeArc, seg.sweep, seg.to, 24));
  }
  return lines;
}

const ICON_LINES = flattenIconToLines();

// Fit the icon's 24x24 (bbox ~20x14) coordinate space into the 512 canvas, centered,
// with margins matching the header badge's visual proportions (icon ~5/9 of its box).
const ICON_BBOX = { x0: 2, y0: 5, x1: 22, y1: 19 };
const ICON_SCALE = 320 / (ICON_BBOX.x1 - ICON_BBOX.x0);
const ICON_CENTER: IconPoint = [
  (ICON_BBOX.x0 + ICON_BBOX.x1) / 2,
  (ICON_BBOX.y0 + ICON_BBOX.y1) / 2,
];
const CANVAS_CENTER = VIEWBOX / 2;
const STROKE_HALF_WIDTH = (ICON_STROKE_WIDTH * ICON_SCALE) / 2;

function toCanvas([x, y]: IconPoint): IconPoint {
  return [
    CANVAS_CENTER + (x - ICON_CENTER[0]) * ICON_SCALE,
    CANVAS_CENTER + (y - ICON_CENTER[1]) * ICON_SCALE,
  ];
}

// Precomputed per-segment AABB (expanded by the stroke half-width) so `colorAt` — called
// once per supersample, i.e. millions of times for the larger raster sizes — can reject
// most segments with four comparisons instead of a sqrt. Combined with the whole-icon AABB
// reject below, this cuts a 1024px render from minutes to well under a second: the icon
// only covers a fraction of the canvas, and most on-icon pixels are only near 1-2 of the
// ~130 flattened segments at a time.
const CANVAS_LINES = ICON_LINES.map(({ a, b }) => {
  const ca = toCanvas(a);
  const cb = toCanvas(b);
  return {
    a: ca,
    b: cb,
    minX: Math.min(ca[0], cb[0]) - STROKE_HALF_WIDTH,
    maxX: Math.max(ca[0], cb[0]) + STROKE_HALF_WIDTH,
    minY: Math.min(ca[1], cb[1]) - STROKE_HALF_WIDTH,
    maxY: Math.max(ca[1], cb[1]) + STROKE_HALF_WIDTH,
  };
});
const ICON_AABB = {
  minX: Math.min(...CANVAS_LINES.map((l) => l.minX)),
  maxX: Math.max(...CANVAS_LINES.map((l) => l.maxX)),
  minY: Math.min(...CANVAS_LINES.map((l) => l.minY)),
  maxY: Math.max(...CANVAS_LINES.map((l) => l.maxY)),
};

function distanceToSegment(px: number, py: number, a: IconPoint, b: IconPoint): number {
  const [ax, ay] = a;
  const [bx, by] = b;
  const abx = bx - ax;
  const aby = by - ay;
  const lenSq = abx * abx + aby * aby;
  let t = lenSq === 0 ? 0 : ((px - ax) * abx + (py - ay) * aby) / lenSq;
  t = Math.min(1, Math.max(0, t));
  const cx = ax + t * abx;
  const cy = ay + t * aby;
  const dx = px - cx;
  const dy = py - cy;
  return Math.sqrt(dx * dx + dy * dy);
}

function lerp(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
  t: number,
) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ] as const;
}

function colorAt(px: number, py: number): readonly [number, number, number] {
  // bg-gradient-to-tr: bottom-left (brand) -> top-right (accent-purple).
  const t = Math.min(1, Math.max(0, (px + (VIEWBOX - py)) / (VIEWBOX * 2)));
  const bg = lerp(BRAND, ACCENT_PURPLE, t);

  // Whole-icon AABB reject — skips the segment loop entirely for the majority of pixels
  // (pure background), which is the bulk of the win.
  if (px < ICON_AABB.minX || px > ICON_AABB.maxX || py < ICON_AABB.minY || py > ICON_AABB.maxY) {
    return bg;
  }

  for (const seg of CANVAS_LINES) {
    if (px < seg.minX || px > seg.maxX || py < seg.minY || py > seg.maxY) continue;
    if (distanceToSegment(px, py, seg.a, seg.b) <= STROKE_HALF_WIDTH) {
      return ICON_WHITE;
    }
  }
  return bg;
}

function rasterize(size: number, ss = 4): Buffer {
  const pixels = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      const sample = (yy: number, xx: number) => {
        const px = (xx / size) * VIEWBOX;
        const py = (yy / size) * VIEWBOX;
        const c = colorAt(px, py);
        r += c[0];
        g += c[1];
        b += c[2];
      };
      let count = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          sample(y + (sy + 0.5) / ss, x + (sx + 0.5) / ss);
          count++;
        }
      }
      const idx = (y * size + x) * 4;
      pixels[idx] = Math.round(r / count);
      pixels[idx + 1] = Math.round(g / count);
      pixels[idx + 2] = Math.round(b / count);
      pixels[idx + 3] = 255;
    }
  }
  return encodePng(size, size, pixels);
}

// --- minimal PNG encoder (built-in zlib, hand-written CRC) ------------------
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([length, typeBuf, data, crcBuf]);
}

function encodePng(width: number, height: number, rgba: Buffer): Buffer {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0; // filter: none
    rgba.copy(raw, y * stride + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    signature,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function encodeIco(images: { size: number; png: Buffer }[]): Buffer {
  const count = images.length;
  const header = Buffer.alloc(6);
  header.writeUInt16BE(0, 0); // reserved
  header.writeUInt16BE(1, 2); // type 1 = icon
  header.writeUInt16BE(count, 4);

  const entries: Buffer[] = [];
  let offset = 6 + count * 16;
  const datas = images.map(({ size, png }) => {
    const entry = Buffer.alloc(16);
    entry[0] = size >= 256 ? 0 : size; // width
    entry[1] = size >= 256 ? 0 : size; // height
    entry[2] = 0; // colors
    entry[3] = 0; // reserved
    entry.writeUInt16BE(1, 4); // planes
    entry.writeUInt16BE(32, 6); // bit count
    entry.writeUInt32BE(png.length, 8); // size
    entry.writeUInt32BE(offset, 12); // offset
    offset += png.length;
    return { entry, png };
  });
  for (const d of datas) entries.push(d.entry);
  const body = Buffer.concat(datas.map((d) => d.png));
  return Buffer.concat([header, ...entries, body]);
}

function writeOut(name: string, data: Buffer | string) {
  const dir = OUT_DIR;
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, name), data);
  console.log(`  + ${name} (${typeof data === "string" ? data.length : data.length} bytes)`);
}

function main() {
  if (!existsSync(SVG_PATH)) {
    throw new Error(`Canonical favicon.svg not found at ${SVG_PATH}`);
  }

  console.log("🎨 Generating GAMEMOA favicon variants from favicon.svg ...");

  const png16 = rasterize(16);
  const png32 = rasterize(32);
  const png48 = rasterize(48);
  const png180 = rasterize(180);
  const png192 = rasterize(192);
  const png512 = rasterize(512);
  // 1024x1024 isn't consumed by the web app itself — no <link>/manifest entry references it —
  // but third-party surfaces (Discord Developer Portal's App Icon field recommends 1024x1024,
  // future app-store-style listings) want a higher-resolution source than 512 provides.
  const png1024 = rasterize(1024);

  writeOut("favicon-16x16.png", png16);
  writeOut("favicon-32x32.png", png32);
  writeOut("favicon-48x48.png", png48);
  writeOut("favicon-180x180.png", png180);
  writeOut("favicon-192x192.png", png192);
  writeOut("favicon-512x512.png", png512);
  writeOut("favicon-1024x1024.png", png1024);
  writeOut("apple-touch-icon.png", png180);
  writeOut(
    "favicon.ico",
    encodeIco([
      { size: 16, png: png16 },
      { size: 32, png: png32 },
      { size: 48, png: png48 },
    ]),
  );

  const manifest = {
    name: "GAMEMOA",
    short_name: "GAMEMOA",
    description: "설치 없이 바로 즐기는 가벼운 웹 미니게임 모음 플랫폼",
    theme_color: "#6366f1",
    background_color: "#0b0d14",
    display: "standalone",
    icons: [
      { src: "/favicon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/favicon-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "/favicon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
  };
  writeOut("site.webmanifest", JSON.stringify(manifest, null, 2) + "\n");

  // Self-validation
  const required = [
    "favicon.svg",
    "favicon.ico",
    "favicon-32x32.png",
    "apple-touch-icon.png",
    "favicon-192x192.png",
    "favicon-512x512.png",
    "site.webmanifest",
  ];
  const missing = required.filter((f) => !existsSync(resolve(OUT_DIR, f)));
  if (missing.length) {
    throw new Error(`Favicon validation failed, missing: ${missing.join(", ")}`);
  }
  console.log("✅ Favicon variants generated and validated.");
}

main();
