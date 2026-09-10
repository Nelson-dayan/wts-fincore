const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let c = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c ^= buf[n];
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  const crc = crc32(Buffer.concat([typeBuf, data]));
  crcBuf.writeUInt32BE(crc, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function createPng(width, height, drawPixelFn) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  
  const ihdrChunk = makeChunk('IHDR', ihdr);
  
  const rawRows = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 4);
    row[0] = 0; // Filter type None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = drawPixelFn(x, y, width, height);
      const idx = 1 + x * 4;
      row[idx] = r;
      row[idx + 1] = g;
      row[idx + 2] = b;
      row[idx + 3] = a;
    }
    rawRows.push(row);
  }
  
  const uncompressed = Buffer.concat(rawRows);
  const compressed = zlib.deflateSync(uncompressed);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));
  
  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Draw WTS-FinCore branded icon: Dark slate background (#0f172a / #090d16) with blue/cyan glowing gradient & W mark
function drawWtsIcon(x, y, w, h) {
  const nx = x / w;
  const ny = y / h;
  const cx = nx - 0.5;
  const cy = ny - 0.5;
  const dist = Math.sqrt(cx * cx + cy * cy);

  // Rounded rectangle mask (radius ~ 22%)
  const cornerR = 0.22;
  const absX = Math.abs(cx);
  const absY = Math.abs(cy);
  if (absX > 0.5 - cornerR && absY > 0.5 - cornerR) {
    const dx = absX - (0.5 - cornerR);
    const dy = absY - (0.5 - cornerR);
    if (Math.sqrt(dx * dx + dy * dy) > cornerR) {
      return [0, 0, 0, 0]; // Transparent outside rounded corner
    }
  }

  // Dark modern slate background gradient
  let r = 15 + Math.floor(nx * 15);
  let g = 23 + Math.floor(ny * 25);
  let b = 42 + Math.floor((1 - dist) * 60);

  // Inner cyan/indigo ring border
  if (dist > 0.42 && dist < 0.47) {
    r = 59;
    g = 130;
    b = 246;
  }

  // Draw 'W' shield logo inside (vector points for W)
  const px = nx;
  const py = ny;
  
  // W geometry: 4 diagonal stems
  // Stem 1: (0.28, 0.3) to (0.39, 0.7)
  // Stem 2: (0.39, 0.7) to (0.50, 0.45)
  // Stem 3: (0.50, 0.45) to (0.61, 0.7)
  // Stem 4: (0.61, 0.7) to (0.72, 0.3)
  const stroke = 0.045;
  let isW = false;

  function distToSegment(x, y, x1, y1, x2, y2) {
    const A = x - x1;
    const B = y - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    const dot = A * C + B * D;
    const len_sq = C * C + D * D;
    let param = -1;
    if (len_sq !== 0) param = dot / len_sq;
    let xx, yy;
    if (param < 0) { xx = x1; yy = y1; }
    else if (param > 1) { xx = x2; yy = y2; }
    else { xx = x1 + param * C; yy = y1 + param * D; }
    const dx = x - xx;
    const dy = y - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }

  if (
    distToSegment(px, py, 0.28, 0.32, 0.39, 0.68) < stroke ||
    distToSegment(px, py, 0.39, 0.68, 0.50, 0.44) < stroke ||
    distToSegment(px, py, 0.50, 0.44, 0.61, 0.68) < stroke ||
    distToSegment(px, py, 0.61, 0.68, 0.72, 0.32) < stroke
  ) {
    isW = true;
  }

  if (isW) {
    // Glowing cyan/white for 'W' logo
    r = 240;
    g = 249;
    b = 255;
  }

  return [r, g, b, 255];
}

const publicDir = path.join(__dirname, '..', 'public');

console.log('Generating PWA icons...');

const png192 = createPng(192, 192, drawWtsIcon);
fs.writeFileSync(path.join(publicDir, 'icon-192.png'), png192);

const png512 = createPng(512, 512, drawWtsIcon);
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), png512);

const png180 = createPng(180, 180, drawWtsIcon);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), png180);

console.log('PWA Icons created successfully!');
