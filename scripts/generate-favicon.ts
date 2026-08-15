import { deflateSync } from "node:zlib";
import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { Buffer } from "node:buffer";

// ---------------------------------------------------------------------------
// OwOGG favicon generator — deterministic, dependency-free.
//
// Canonical source: apps/web/public/favicon.svg (hand-authored).
// This script rasterises the SAME design — OwOGG's brand mark, the literal
// word "OwO" (two round "O"s + a "w" built from the same line-art convention
// as Lucide icons) tilted diagonally, stroked in white on a brand-gradient
// rounded hub (bg-gradient-to-tr from-brand to-accent-purple) — into PNG / ICO
// fallbacks and writes a web manifest. No external image-processing/SVG-
// rasterisation dependency is required: PNGs are encoded with the built-in
// zlib + a hand-written CRC32; pixels are produced by supersampling a
// distance-to-stroke test against the letterform's shapes (circles tested
// exactly — distance to center vs. radius; the "w"'s straight segments via
// distanceToSegment), with the whole letterform rotated by a fixed angle
// before the distance test so every downstream primitive (AABBs, distance
// functions) just works in already-rotated coordinates.
// ---------------------------------------------------------------------------

const REPO_ROOT = resolve(import.meta.dirname, "..");
const OUT_DIR = resolve(REPO_ROOT, "apps/web", "public");
const SVG_PATH = resolve(OUT_DIR, "favicon.svg");

// Brand palette (must match favicon.svg and apps/web/app/app.css)
const BRAND = [99, 102, 241] as const; // --color-brand #6366f1
const ACCENT_PURPLE = [168, 85, 247] as const; // --color-accent-purple #a855f7
const ICON_WHITE = [255, 255, 255] as const; // matches Header's text-white
const VIEWBOX = 512;
const BG_RX = 112; // rounded-square background corner radius, in canvas units

// ---------------------------------------------------------------------------
// OwOGG's brand mark — the word "OwO" as three letterforms in a row, each
// built the same way apps/web/app/components/ui/OwoWordmarkIcon.tsx builds a
// round "O"/"w": circles for the O's, a "w" made of two smooth cubic-Bézier
// "U" bumps (softer/cuter than a sharp zigzag — no pointy corners, reads more
// like a friendly mascot mark than a geometric wordmark). Defined here in
// unrotated "letter space"; ROTATION_DEG below tilts the whole word
// diagonally, matching the reference OwO wordmark logo.
// ---------------------------------------------------------------------------
type IconPoint = readonly [number, number];
type IconSegment =
  | { kind: "line"; from: IconPoint; to: IconPoint }
  | { kind: "cubic"; from: IconPoint; c1: IconPoint; c2: IconPoint; to: IconPoint };
type IconCircle = { cx: number; cy: number; r: number };

const LETTER_CIRCLES: IconCircle[] = [
  { cx: 8, cy: 8, r: 7 }, // "O"
  { cx: 40, cy: 8, r: 7 }, // "O"
];

// "w", as two cubic-Bézier "U" bumps between the two O's. Each cubic's control
// points are pulled straight down from its endpoints to the same depth
// (y=16), which — by the cubic Bézier midpoint formula — makes the curve
// pass exactly through the intended valley point at t=0.5 (20.5,13 for the
// first bump, 27.5,13 for the second), same coordinates the old straight-
// line zigzag used, just smoothed into a rounded "U" instead of a sharp "V".
const LETTER_W_CURVES: IconSegment[] = [
  { kind: "cubic", from: [17, 3], c1: [17, 16], c2: [24, 16], to: [24, 5] },
  { kind: "cubic", from: [24, 5], c1: [24, 16], c2: [31, 16], to: [31, 3] },
];

const ICON_STROKE_WIDTH = 3; // in letter-space units — bold, matching the reference wordmark
const ROTATION_DEG = -25; // tilts the word so it rises left-to-right, like the reference logo

// Pivot for the rotation: center of the unrotated letterform's bounding box
// (x: 1-47, y: 1-15 — O radius 7 from cx 8/40, w peaks/valleys at y 3/13).
const LETTER_PIVOT: IconPoint = [24, 8];

function rotatePoint([x, y]: IconPoint, degrees: number, [px, py]: IconPoint): IconPoint {
  const rad = (degrees * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = x - px;
  const dy = y - py;
  return [px + dx * cos - dy * sin, py + dx * sin + dy * cos];
}

/** Cubic Bézier flattened by direct parametric sampling (De Casteljau-equivalent). n=24 is
 * finely subdivided enough that the polyline is visually indistinguishable from the true curve
 * even at the 1024px output. */
function flattenCubic(
  from: IconPoint,
  c1: IconPoint,
  c2: IconPoint,
  to: IconPoint,
  n: number,
): IconPoint[] {
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

const ROTATED_CIRCLES: IconCircle[] = LETTER_CIRCLES.map(({ cx, cy, r }) => {
  const [rx, ry] = rotatePoint([cx, cy], ROTATION_DEG, LETTER_PIVOT);
  return { cx: rx, cy: ry, r };
});
// Rotate each cubic's four defining points, then flatten the rotated curve into short line
// segments for the distance test (rotation is rigid, so flattening after rotating gives the
// exact same polyline as rotating a pre-flattened polyline would — just less work).
const ROTATED_W_LINES: { a: IconPoint; b: IconPoint }[] = LETTER_W_CURVES.flatMap((seg) => {
  if (seg.kind !== "cubic") return [];
  const from = rotatePoint(seg.from, ROTATION_DEG, LETTER_PIVOT);
  const c1 = rotatePoint(seg.c1, ROTATION_DEG, LETTER_PIVOT);
  const c2 = rotatePoint(seg.c2, ROTATION_DEG, LETTER_PIVOT);
  const to = rotatePoint(seg.to, ROTATION_DEG, LETTER_PIVOT);
  const pts = flattenCubic(from, c1, c2, to, 24);
  const lines: { a: IconPoint; b: IconPoint }[] = [];
  for (let i = 0; i < pts.length - 1; i++) lines.push({ a: pts[i]!, b: pts[i + 1]! });
  return lines;
});

// Bounding box of the ROTATED letterform: a circle's bbox is always
// [cx-r,cx+r]x[cy-r,cy+r] regardless of rotation (rotating a circle around any
// pivot only moves its center), so this is exact, not an overestimate.
const ICON_BBOX = {
  x0: Math.min(
    ...ROTATED_CIRCLES.map((c) => c.cx - c.r),
    ...ROTATED_W_LINES.flatMap((l) => [l.a[0], l.b[0]]),
  ),
  x1: Math.max(
    ...ROTATED_CIRCLES.map((c) => c.cx + c.r),
    ...ROTATED_W_LINES.flatMap((l) => [l.a[0], l.b[0]]),
  ),
  y0: Math.min(
    ...ROTATED_CIRCLES.map((c) => c.cy - c.r),
    ...ROTATED_W_LINES.flatMap((l) => [l.a[1], l.b[1]]),
  ),
  y1: Math.max(
    ...ROTATED_CIRCLES.map((c) => c.cy + c.r),
    ...ROTATED_W_LINES.flatMap((l) => [l.a[1], l.b[1]]),
  ),
};
// Fit the rotated letterform into the 512 canvas, centered, with margins
// matching the header badge's visual proportions against its background tile.
const ICON_SCALE = 400 / (ICON_BBOX.x1 - ICON_BBOX.x0);
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

// Precomputed per-shape AABB (expanded by the stroke half-width) so `colorAt` — called once
// per supersample, i.e. millions of times for the larger raster sizes — can reject most
// shapes with four comparisons instead of a sqrt. Combined with the whole-icon AABB reject
// below, this keeps even the 1024px render well under a second.
const CANVAS_LINES = ROTATED_W_LINES.map(({ a, b }) => {
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
const CANVAS_CIRCLES = ROTATED_CIRCLES.map(({ cx, cy, r }) => {
  const [ccx, ccy] = toCanvas([cx, cy]);
  const cr = r * ICON_SCALE;
  return {
    cx: ccx,
    cy: ccy,
    r: cr,
    minX: ccx - cr - STROKE_HALF_WIDTH,
    maxX: ccx + cr + STROKE_HALF_WIDTH,
    minY: ccy - cr - STROKE_HALF_WIDTH,
    maxY: ccy + cr + STROKE_HALF_WIDTH,
  };
});
const ICON_AABB = {
  minX: Math.min(...CANVAS_LINES.map((l) => l.minX), ...CANVAS_CIRCLES.map((c) => c.minX)),
  maxX: Math.max(...CANVAS_LINES.map((l) => l.maxX), ...CANVAS_CIRCLES.map((c) => c.maxX)),
  minY: Math.min(...CANVAS_LINES.map((l) => l.minY), ...CANVAS_CIRCLES.map((c) => c.minY)),
  maxY: Math.max(...CANVAS_LINES.map((l) => l.maxY), ...CANVAS_CIRCLES.map((c) => c.maxY)),
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

/** Exact distance from a point to a circle's *outline* (not its filled disc) — the O's are
 * stroked circles (fill="none"), so a point is "on the stroke" when its distance to the
 * center is within STROKE_HALF_WIDTH of the radius, not merely inside the disc. */
function distanceToCircleOutline(px: number, py: number, cx: number, cy: number, r: number) {
  const dx = px - cx;
  const dy = py - cy;
  return Math.abs(Math.sqrt(dx * dx + dy * dy) - r);
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

/** Whether a canvas point falls inside the rounded-square background. Standard rounded-rect
 * point test: clamp the point onto the "inner core rect" (whose corners are the arc centers),
 * then check the distance from that clamped point against the radius — correct for both the
 * flat edges and the corner arcs, for any point within the canvas. Keeps the PNG faithful to
 * favicon.svg's `rx="112"` rounded rect instead of a hard square. */
function insideRoundedSquare(px: number, py: number): boolean {
  const rx = BG_RX;
  const cx = Math.min(Math.max(px, rx), VIEWBOX - rx);
  const cy = Math.min(Math.max(py, rx), VIEWBOX - rx);
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy <= rx * rx;
}

function colorAt(px: number, py: number): readonly [number, number, number] {
  // bg-gradient-to-tr: bottom-left (brand) -> top-right (accent-purple).
  const t = Math.min(1, Math.max(0, (px + (VIEWBOX - py)) / (VIEWBOX * 2)));
  const bg = lerp(BRAND, ACCENT_PURPLE, t);

  // Whole-icon AABB reject — skips the shape loop entirely for the majority of pixels (pure
  // background), which is the bulk of the win.
  if (
    px >= ICON_AABB.minX &&
    px <= ICON_AABB.maxX &&
    py >= ICON_AABB.minY &&
    py <= ICON_AABB.maxY
  ) {
    for (const circle of CANVAS_CIRCLES) {
      if (px < circle.minX || px > circle.maxX || py < circle.minY || py > circle.maxY) continue;
      if (distanceToCircleOutline(px, py, circle.cx, circle.cy, circle.r) <= STROKE_HALF_WIDTH) {
        return ICON_WHITE;
      }
    }
    for (const seg of CANVAS_LINES) {
      if (px < seg.minX || px > seg.maxX || py < seg.minY || py > seg.maxY) continue;
      if (distanceToSegment(px, py, seg.a, seg.b) <= STROKE_HALF_WIDTH) {
        return ICON_WHITE;
      }
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
      let aSum = 0;
      const sample = (yy: number, xx: number) => {
        const px = (xx / size) * VIEWBOX;
        const py = (yy / size) * VIEWBOX;
        const inside = insideRoundedSquare(px, py);
        if (inside) {
          const c = colorAt(px, py);
          r += c[0];
          g += c[1];
          b += c[2];
          aSum += 255;
        }
      };
      let count = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          sample(y + (sy + 0.5) / ss, x + (sx + 0.5) / ss);
          count++;
        }
      }
      const idx = (y * size + x) * 4;
      if (aSum > 0) {
        pixels[idx] = Math.round(r / (aSum / 255));
        pixels[idx + 1] = Math.round(g / (aSum / 255));
        pixels[idx + 2] = Math.round(b / (aSum / 255));
      }
      pixels[idx + 3] = Math.round(aSum / count);
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

  console.log("🎨 Generating OwOGG favicon variants from favicon.svg ...");

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
    name: "OwOGG",
    short_name: "OwOGG",
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
