import { deflateSync } from "node:zlib";
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { Buffer } from "node:buffer";

// ---------------------------------------------------------------------------
// GAMEMOA favicon generator — deterministic, dependency-free.
//
// Canonical source: apps/web/public/favicon.svg (hand-authored).
// This script rasterises the SAME parametric design (four mini-game tiles on a
// brand-gradient rounded hub) into PNG / ICO fallbacks and writes a web manifest.
// No external image-processing dependency is required: PNGs are encoded with the
// built-in zlib + a hand-written CRC32; pixels are produced by supersampling an
// analytic rounded-rectangle coverage test.
// ---------------------------------------------------------------------------

const REPO_ROOT = resolve(import.meta.dirname, "..");
const OUT_DIR = resolve(REPO_ROOT, "apps/web", "public");
const SVG_PATH = resolve(OUT_DIR, "favicon.svg");

// Brand palette (must match favicon.svg)
const BRAND = [99, 102, 241] as const; // #6366f1
const BRAND_DARK = [79, 70, 229] as const; // #4f46e5
const BRAND_LIGHT = [129, 140, 248] as const; // #818cf8
const TILE_WHITE = [241, 245, 249] as const; // #f1f5f9
const VIEWBOX = 512;

const TILES = [
  { x: 92, y: 92, color: BRAND_LIGHT as const },
  { x: 284, y: 92, color: TILE_WHITE as const },
  { x: 92, y: 284, color: TILE_WHITE as const },
  { x: 284, y: 284, color: TILE_WHITE as const },
];
const TILE_SIZE = 136;
const TILE_RX = 34;
const BG_RX = 112;

function insideRoundedRect(
  px: number,
  py: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  r: number,
): boolean {
  if (px < x0 || px > x1 || py < y0 || py > y1) return false;
  let dx = 0;
  let dy = 0;
  if (px < x0 + r) dx = x0 + r - px;
  else if (px > x1 - r) dx = px - (x1 - r);
  if (py < y0 + r) dy = y0 + r - py;
  else if (py > y1 - r) dy = py - (y1 - r);
  if (dx <= 0 || dy <= 0) return true;
  return dx * dx + dy * dy <= r * r;
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
  const t = Math.min(1, Math.max(0, (px + py) / (VIEWBOX * 2)));
  let color: readonly [number, number, number] = lerp(BRAND, BRAND_DARK, t);
  for (const tile of TILES) {
    if (
      insideRoundedRect(px, py, tile.x, tile.y, tile.x + TILE_SIZE, tile.y + TILE_SIZE, TILE_RX)
    ) {
      color = tile.color;
    }
  }
  return color;
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

  writeOut("favicon-16x16.png", png16);
  writeOut("favicon-32x32.png", png32);
  writeOut("favicon-48x48.png", png48);
  writeOut("favicon-180x180.png", png180);
  writeOut("favicon-192x192.png", png192);
  writeOut("favicon-512x512.png", png512);
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
