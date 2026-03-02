/**
 * Generates assets/icon.ico from scratch — no external dependencies.
 * Embeds PNG images at [16, 24, 32, 48, 64, 128, 256] px.
 * Design: #5470F5 rounded-square background + white 2×2 kanban grid.
 */

const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

const BLUE = [84, 112, 245, 255];
const WHITE = [255, 255, 255, 255];
const CLEAR = [0, 0, 0, 0];

// ── CRC32 ──────────────────────────────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

// ── PNG helpers ────────────────────────────────────────────────────────────
function pngChunk(type, data) {
  const tb = Buffer.from(type, 'ascii');
  const lb = Buffer.alloc(4); lb.writeUInt32BE(data.length);
  const cb = Buffer.alloc(4); cb.writeUInt32BE(crc32(Buffer.concat([tb, data])));
  return Buffer.concat([lb, tb, data, cb]);
}

function buildPNG(size) {
  const px = drawIcon(size);

  const sig  = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA

  const rows = [];
  for (let y = 0; y < size; y++) {
    rows.push(Buffer.from([0]));                          // filter: None
    rows.push(Buffer.from(px.buffer, y * size * 4, size * 4));
  }
  const idat = zlib.deflateSync(Buffer.concat(rows), { level: 9 });

  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Icon pixel art ─────────────────────────────────────────────────────────
function inRoundedRect(px, py, rx, ry, rw, rh, r) {
  const x1 = rx + r, x2 = rx + rw - r;
  const y1 = ry + r, y2 = ry + rh - r;
  if (px >= x1 && px < x2 && py >= ry && py < ry + rh) return true;
  if (px >= rx && px < rx + rw && py >= y1 && py < y2) return true;
  const corners = [[x1, y1],[x2, y1],[x1, y2],[x2, y2]];
  for (const [cx, cy] of corners) {
    if ((px - cx) ** 2 + (py - cy) ** 2 <= r * r) return true;
  }
  return false;
}

function drawIcon(size) {
  const buf = new Uint8Array(size * size * 4);

  const bgR  = Math.max(2, Math.round(size * 0.18));   // background corner radius
  const pad  = Math.max(2, Math.round(size * 0.20));   // grid padding from edge
  const gap  = Math.max(1, Math.round(size * 0.08));   // gap between cells
  const cell = Math.floor((size - pad * 2 - gap) / 2); // cell size
  const cr   = Math.max(1, Math.round(cell * 0.22));   // cell corner radius

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      if (!inRoundedRect(x, y, 0, 0, size, size, bgR)) {
        buf.set(CLEAR, i);
        continue;
      }
      buf.set(BLUE, i);

      // 2×2 grid cells
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 2; col++) {
          const cx = pad + col * (cell + gap);
          const cy = pad + row * (cell + gap);
          if (inRoundedRect(x, y, cx, cy, cell, cell, cr)) {
            buf.set(WHITE, i);
          }
        }
      }
    }
  }
  return buf;
}

// ── ICO assembler ──────────────────────────────────────────────────────────
function buildICO(sizes) {
  const pngs = sizes.map(buildPNG);

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2); // type: ICO
  header.writeUInt16LE(sizes.length, 4);

  let offset = 6 + sizes.length * 16;
  const entries = sizes.map((s, i) => {
    const e = Buffer.alloc(16);
    e[0] = s >= 256 ? 0 : s;
    e[1] = s >= 256 ? 0 : s;
    e.writeUInt16LE(1,  4); // color planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(pngs[i].length, 8);
    e.writeUInt32LE(offset, 12);
    offset += pngs[i].length;
    return e;
  });

  return Buffer.concat([header, ...entries, ...pngs]);
}

// ── Run ────────────────────────────────────────────────────────────────────
const SIZES  = [16, 24, 32, 48, 64, 128, 256];
const outDir = path.join(__dirname, '..', 'assets');
fs.mkdirSync(outDir, { recursive: true });

const ico = buildICO(SIZES);
const out = path.join(outDir, 'icon.ico');
fs.writeFileSync(out, ico);
console.log(`✓ icon.ico written — ${SIZES.join(', ')}px — ${(ico.length / 1024).toFixed(1)} KB`);
