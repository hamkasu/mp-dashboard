/**
 * Generates PWA screenshots as valid PNG files without any external dependencies.
 * Uses the Node.js built-in zlib to compress pixel data per the PNG spec.
 * Layout mirrors the real app: blue header, stat cards, MP list rows.
 */
import { createDeflate } from 'zlib';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Writable } from 'stream';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, '../client/public');

// App theme colours (matching manifest.json + tailwind config)
const BLUE      = [37,  99,  235]; // #2563eb — primary
const BLUE_DARK = [29,  78,  216]; // #1d4ed8 — header
const BLUE_MID  = [59, 130, 246];  // #3b82f6 — accent
const WHITE     = [255, 255, 255];
const GRAY_50   = [249, 250, 251];
const GRAY_100  = [243, 244, 246];
const GRAY_200  = [229, 231, 235];
const GRAY_400  = [156, 163, 175];
const GRAY_600  = [75,  85,  99];
const GRAY_800  = [31,  41,  55];
const GREEN     = [16,  185, 129]; // attendance badge
const AMBER     = [245, 158,  11]; // mid score badge
const RED       = [239,  68,  68]; // low score badge
const GOLD      = [251, 191,  36]; // star badge

// ──────────────────────────────────────────────
// Minimal PNG encoder
// ──────────────────────────────────────────────
function u32be(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n, 0);
  return b;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (const byte of buf) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const crcInput = Buffer.concat([typeBytes, data]);
  const crcBuf = u32be(crc32(crcInput));
  return Buffer.concat([u32be(data.length), typeBytes, data, crcBuf]);
}

async function deflateSync(data) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const deflate = createDeflate({ level: 6 });
    const writer = new Writable({
      write(chunk, _enc, cb) { chunks.push(chunk); cb(); }
    });
    writer.on('finish', () => resolve(Buffer.concat(chunks)));
    deflate.on('error', reject);
    deflate.pipe(writer);
    deflate.end(data);
  });
}

async function encodePNG(pixels, width, height) {
  // pixels: flat Uint8Array of RGBA values, row-major
  const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8]  = 8;  // bit depth
  ihdrData[9]  = 2;  // colour type: RGB (no alpha needed)
  ihdrData[10] = 0;  // compression
  ihdrData[11] = 0;  // filter
  ihdrData[12] = 0;  // interlace

  // Build raw scanlines: filter byte 0 + RGB per pixel
  const raw = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 3)] = 0; // filter: None
    for (let x = 0; x < width; x++) {
      const src = (y * width + x) * 4;
      const dst = y * (1 + width * 3) + 1 + x * 3;
      raw[dst]   = pixels[src];
      raw[dst+1] = pixels[src+1];
      raw[dst+2] = pixels[src+2];
    }
  }

  const compressed = await deflateSync(raw);

  return Buffer.concat([
    PNG_SIG,
    chunk('IHDR', ihdrData),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ──────────────────────────────────────────────
// Drawing helpers
// ──────────────────────────────────────────────
class Canvas {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.data = new Uint8Array(w * h * 4).fill(255);
  }
  set(x, y, r, g, b) {
    if (x < 0 || x >= this.w || y < 0 || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    this.data[i] = r; this.data[i+1] = g; this.data[i+2] = b; this.data[i+3] = 255;
  }
  rect(x, y, w, h, [r, g, b]) {
    for (let dy = 0; dy < h; dy++)
      for (let dx = 0; dx < w; dx++)
        this.set(x + dx, y + dy, r, g, b);
  }
  roundRect(x, y, w, h, radius, color) {
    this.rect(x + radius, y, w - radius*2, h, color);
    this.rect(x, y + radius, w, h - radius*2, color);
    for (let cy = 0; cy < radius; cy++) {
      for (let cx = 0; cx < radius; cx++) {
        const dist = Math.sqrt((cx - radius)**2 + (cy - radius)**2);
        if (dist <= radius) {
          this.set(x + cx, y + cy, ...color);
          this.set(x + w - 1 - cx, y + cy, ...color);
          this.set(x + cx, y + h - 1 - cy, ...color);
          this.set(x + w - 1 - cx, y + h - 1 - cy, ...color);
        }
      }
    }
  }
  circle(cx, cy, r, color) {
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++)
        if (dx*dx + dy*dy <= r*r)
          this.set(cx + dx, cy + dy, ...color);
  }
  hline(x, y, w, [r, g, b]) {
    for (let dx = 0; dx < w; dx++) this.set(x + dx, y, r, g, b);
  }
}

// ──────────────────────────────────────────────
// Mock-UI builders
// ──────────────────────────────────────────────

// Draws a stat card: coloured top stripe, white card, number + label blocks
function statCard(canvas, x, y, w, h, accent) {
  canvas.roundRect(x, y, w, h, 8, WHITE);
  canvas.rect(x + 8, y + 8, w - 16, 5, accent);    // accent stripe
  canvas.rect(x + 8, y + 22, 48, 10, GRAY_800);    // number placeholder
  canvas.rect(x + 8, y + 38, 64, 7,  GRAY_400);    // label placeholder
}

// Draws a table row with avatar circle + text bars + badge
function mpRow(canvas, x, y, w, h, badge) {
  canvas.rect(x, y, w, h, WHITE);
  canvas.hline(x, y + h - 1, w, GRAY_200);
  canvas.circle(x + 20, y + h/2, 14, GRAY_200);     // avatar
  canvas.rect(x + 42, y + 12, 110, 9,  GRAY_800);   // name
  canvas.rect(x + 42, y + 26, 80,  7,  GRAY_400);   // constituency
  canvas.roundRect(w - 52, y + 14, 40, 18, 6, badge); // score badge
}

// ──────────────────────────────────────────────
// MOBILE screenshot  540 × 720
// ──────────────────────────────────────────────
async function buildMobile() {
  const W = 540, H = 720;
  const cv = new Canvas(W, H);
  cv.rect(0, 0, W, H, GRAY_50);

  // Header bar
  cv.rect(0, 0, W, 56, BLUE_DARK);
  cv.rect(16, 16, 120, 12, WHITE);   // "MyParliament" title block
  cv.rect(16, 32, 80,  8,  BLUE_MID); // subtitle block
  // Search icon area
  cv.circle(W - 28, 28, 12, BLUE_MID);

  // Tab bar (3 tabs)
  cv.rect(0, 56, W, 40, BLUE);
  const tabW = Math.floor(W / 3);
  cv.rect(0, 56, tabW, 40, WHITE);        // active tab highlight (white on blue)
  cv.rect(4, 62, tabW - 8, 28, BLUE);    // restore to blue inside so only bottom line shows
  cv.rect(0, 92, tabW, 4, WHITE);         // active underline
  for (let t = 0; t < 3; t++) {
    cv.rect(t * tabW + 20, 68, 60, 8, t === 0 ? WHITE : [150, 180, 255]);
  }

  // Stat cards row
  const CARD_Y = 108, CARD_H = 72;
  const cardColors = [GREEN, BLUE, AMBER];
  const cardW = Math.floor((W - 24) / 2);
  statCard(cv, 8,          CARD_Y,       cardW, CARD_H, cardColors[0]);
  statCard(cv, 8 + cardW + 8, CARD_Y,   cardW, CARD_H, cardColors[1]);

  // Second card row (1 wide)
  statCard(cv, 8, CARD_Y + CARD_H + 8, W - 16, 60, cardColors[2]);

  // MP list header
  cv.rect(0, CARD_Y + CARD_H*2 + 4, W, 32, WHITE);
  cv.rect(12, CARD_Y + CARD_H*2 + 11, 100, 10, GRAY_800);
  cv.hline(0, CARD_Y + CARD_H*2 + 35, W, GRAY_200);

  // MP rows
  const ROW_H = 56;
  const badges = [GREEN, GREEN, AMBER, AMBER, RED];
  const LIST_TOP = CARD_Y + CARD_H*2 + 36;
  for (let i = 0; i < 5; i++) {
    mpRow(cv, 0, LIST_TOP + i * ROW_H, W, ROW_H, badges[i]);
  }

  // Bottom nav bar
  cv.rect(0, H - 56, W, 56, WHITE);
  cv.hline(0, H - 56, W, GRAY_200);
  const NAV_ICONS = 5;
  const navW = Math.floor(W / NAV_ICONS);
  for (let n = 0; n < NAV_ICONS; n++) {
    const nx = n * navW + navW/2;
    cv.circle(nx, H - 38, 10, n === 0 ? BLUE : GRAY_400);
    cv.rect(n * navW + 12, H - 20, navW - 24, 6, n === 0 ? BLUE : GRAY_200);
  }

  return encodePNG(cv.data, W, H);
}

// ──────────────────────────────────────────────
// DESKTOP screenshot  1280 × 720
// ──────────────────────────────────────────────
async function buildDesktop() {
  const W = 1280, H = 720;
  const cv = new Canvas(W, H);
  cv.rect(0, 0, W, H, GRAY_50);

  // Sidebar
  const SIDE_W = 220;
  cv.rect(0, 0, SIDE_W, H, BLUE_DARK);
  cv.rect(16, 20, 130, 14, WHITE);       // logo
  cv.rect(16, 38, 90,  8,  BLUE_MID);   // sub-title
  const NAV_ITEMS = ['MPs', 'Hansard', 'Bills', 'Committees', 'AI Agents', 'Settings'];
  for (let i = 0; i < NAV_ITEMS.length; i++) {
    const ny = 80 + i * 48;
    if (i === 0) {
      cv.roundRect(8, ny, SIDE_W - 16, 36, 6, BLUE);    // active nav item
      cv.rect(20, ny + 12, 80, 10, WHITE);
    } else {
      cv.rect(20, ny + 12, 70, 8, [150, 180, 255]);
    }
  }
  // Sidebar footer
  cv.rect(8, H - 60, SIDE_W - 16, 44, BLUE);
  cv.circle(24, H - 38, 14, BLUE_MID);
  cv.rect(46, H - 46, 80, 8,  WHITE);
  cv.rect(46, H - 32, 60, 6,  BLUE_MID);

  // Top bar (main area)
  const MAIN_X = SIDE_W;
  cv.rect(MAIN_X, 0, W - MAIN_X, 56, WHITE);
  cv.hline(MAIN_X, 56, W - MAIN_X, GRAY_200);
  cv.rect(MAIN_X + 16, 14, 200, 28, GRAY_100);  // search box
  cv.rect(MAIN_X + 24, 22, 100, 12, GRAY_400);  // search placeholder
  cv.circle(W - 40, 28, 16, GRAY_200);           // avatar

  // Stat cards row
  const STAT_Y = 76, STAT_H = 90;
  const STAT_COLS = 4;
  const STAT_W = Math.floor((W - MAIN_X - 40) / STAT_COLS);
  const statAccents = [BLUE, GREEN, AMBER, RED];
  for (let s = 0; s < STAT_COLS; s++) {
    const sx = MAIN_X + 20 + s * (STAT_W + 8);
    statCard(cv, sx, STAT_Y, STAT_W - 4, STAT_H, statAccents[s]);
    // bigger number block for desktop
    cv.rect(sx + 12, STAT_Y + 22, 70, 16, GRAY_800);
    cv.rect(sx + 12, STAT_Y + 45, 90, 10, GRAY_400);
  }

  // Data table below stats
  const TABLE_Y = STAT_Y + STAT_H + 16;
  cv.rect(MAIN_X + 20, TABLE_Y, W - MAIN_X - 40, H - TABLE_Y - 20, WHITE);
  // Table header row
  cv.rect(MAIN_X + 20, TABLE_Y, W - MAIN_X - 40, 40, GRAY_100);
  const COL_LABELS = [180, 260, 140, 120, 100, 80];
  let hx = MAIN_X + 32;
  for (const cw of COL_LABELS) {
    cv.rect(hx, TABLE_Y + 14, cw - 12, 10, GRAY_600);
    hx += cw;
  }
  cv.hline(MAIN_X + 20, TABLE_Y + 40, W - MAIN_X - 40, GRAY_200);

  // Table rows
  const ROW_H = 52;
  const BADGES = [GREEN, GREEN, GREEN, AMBER, RED, AMBER, RED, AMBER, GREEN, GREEN];
  for (let r = 0; r < 10; r++) {
    const ry = TABLE_Y + 40 + r * ROW_H;
    if (r % 2 === 0) cv.rect(MAIN_X + 20, ry, W - MAIN_X - 40, ROW_H, GRAY_50);
    // Row cells
    cv.circle(MAIN_X + 44, ry + ROW_H/2, 16, GRAY_200);  // avatar
    let cx2 = MAIN_X + 72;
    cv.rect(cx2, ry + 14, 140, 10, GRAY_800);
    cv.rect(cx2, ry + 28, 100, 8,  GRAY_400);
    cx2 += 180;
    cv.rect(cx2, ry + 18, 100, 14, GRAY_400);
    cx2 += 140;
    cv.rect(cx2, ry + 18, 80,  14, GRAY_400);
    cx2 += 120;
    cv.roundRect(cx2, ry + 16, 50, 18, 6, BADGES[r]);
    cx2 += 100;
    cv.roundRect(cx2, ry + 16, 50, 18, 6, AMBER);
    cv.hline(MAIN_X + 20, ry + ROW_H - 1, W - MAIN_X - 40, GRAY_200);
  }

  return encodePNG(cv.data, W, H);
}

// ──────────────────────────────────────────────
// Run
// ──────────────────────────────────────────────
console.log('Generating mobile screenshot (540×720)...');
const mobilePng = await buildMobile();
const mobilePath = join(PUBLIC_DIR, 'screenshot-mobile.png');
writeFileSync(mobilePath, mobilePng);
console.log(`  ✓ ${mobilePath}  (${mobilePng.length} bytes)`);

console.log('Generating desktop screenshot (1280×720)...');
const desktopPng = await buildDesktop();
const desktopPath = join(PUBLIC_DIR, 'screenshot-desktop.png');
writeFileSync(desktopPath, desktopPng);
console.log(`  ✓ ${desktopPath}  (${desktopPng.length} bytes)`);

console.log('Done.');
