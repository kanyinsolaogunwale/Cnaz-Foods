/**
 * Generates the Cnaz Foods mobile app assets from the real website logo
 * (public/images/logo-cn.png) — no image libraries, pure Node.
 *
 * The source logo is an 800x800 palette PNG on a white background, so every
 * generated icon keeps a white background (matching the logo's own canvas).
 *
 * Outputs (in mobile/assets/):
 *   icon.png                       1024x1024  (iOS + Expo)
 *   android-icon-foreground.png    1024x1024  (adaptive foreground, logo at 58%)
 *   android-icon-background.png    1024x1024  (solid white)
 *   favicon.png                       48x48
 *   splash-icon.png                800x800    (copy of the real logo)
 *
 * Also copies the real product photos into mobile/assets/products/ so the
 * app serves the same imagery as the website.
 */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const root = path.resolve(__dirname, "..", ".."); // repo root
const SRC_LOGO = path.join(root, "public", "images", "logo-cn.png");
const OUT_DIR = path.join(__dirname, "..", "assets");
const PRODUCTS_OUT = path.join(OUT_DIR, "products");

// ---------------------------------------------------------------- PNG decode
function decodePng(buffer) {
  if (buffer.readUInt32BE(0) !== 0x89504e47) throw new Error("Not a PNG");
  let off = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let palette = null;
  const idat = [];

  while (off < buffer.length) {
    const len = buffer.readUInt32BE(off);
    const type = buffer.toString("ascii", off + 4, off + 8);
    const data = buffer.subarray(off + 8, off + 8 + len);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === "PLTE") {
      palette = Buffer.from(data);
    } else if (type === "IDAT") {
      idat.push(Buffer.from(data));
    } else if (type === "IEND") {
      break;
    }
    off += 12 + len;
  }

  if (bitDepth !== 8) throw new Error(`Unsupported bit depth: ${bitDepth}`);
  if (colorType !== 2 && colorType !== 6 && colorType !== 3) {
    throw new Error(`Unsupported colour type: ${colorType}`);
  }

  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 1;
  const bpp = channels;
  const stride = width * bpp;
  const raw = zlib.inflateSync(Buffer.concat(idat));

  // Un-filter scanlines.
  const pixels = Buffer.alloc(height * stride);
  let prior = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const out = pixels.subarray(y * stride, (y + 1) * stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? out[x - bpp] : 0;
      const b = prior[x];
      const c = x >= bpp ? prior[x - bpp] : 0;
      let value = line[x];
      if (filter === 1) value = (value + a) & 0xff;
      else if (filter === 2) value = (value + b) & 0xff;
      else if (filter === 3) value = (value + ((a + b) >> 1)) & 0xff;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        value = (value + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 0xff;
      }
      out[x] = value;
    }
    prior = out;
  }

  // Expand to RGBA.
  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    if (colorType === 3) {
      const idx = pixels[i] * 3;
      rgba[i * 4] = palette[idx];
      rgba[i * 4 + 1] = palette[idx + 1];
      rgba[i * 4 + 2] = palette[idx + 2];
      rgba[i * 4 + 3] = 255;
    } else {
      rgba[i * 4] = pixels[i * channels];
      rgba[i * 4 + 1] = pixels[i * channels + 1];
      rgba[i * 4 + 2] = pixels[i * channels + 2];
      rgba[i * 4 + 3] = colorType === 6 ? pixels[i * channels + 3] : 255;
    }
  }
  return { width, height, data: rgba };
}

// ---------------------------------------------------------------- PNG encode
const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type RGBA
  const stride = width * 4;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ------------------------------------------------------------------ renderer
/** Renders source onto a WxH white canvas, logo scaled to `scale` of the canvas, centered. */
function render(src, size, scale, background = { r: 255, g: 255, b: 255 }) {
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      out[i] = background.r;
      out[i + 1] = background.g;
      out[i + 2] = background.b;
      out[i + 3] = 255;
    }
  }
  const draw = Math.round(size * scale);
  const offsetX = Math.round((size - draw) / 2);
  const offsetY = Math.round((size - draw) / 2);
  for (let y = 0; y < draw; y++) {
    const sy = Math.min(src.height - 1, Math.floor((y / draw) * src.height));
    for (let x = 0; x < draw; x++) {
      const sx = Math.min(src.width - 1, Math.floor((x / draw) * src.width));
      const si = (sy * src.width + sx) * 4;
      const di = ((y + offsetY) * size + (x + offsetX)) * 4;
      const alpha = src.data[si + 3] / 255;
      if (alpha === 0) continue;
      for (let c = 0; c < 3; c++) {
        out[di + c] = Math.round(src.data[si + c] * alpha + out[di + c] * (1 - alpha));
      }
    }
  }
  return out;
}

// --------------------------------------------------------------------- main
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(PRODUCTS_OUT, { recursive: true });

const logo = decodePng(fs.readFileSync(SRC_LOGO));
console.log(`Source logo: ${logo.width}x${logo.height}`);

const targets = [
  ["icon.png", 1024, 0.82],
  ["android-icon-foreground.png", 1024, 0.58],
  ["favicon.png", 48, 0.92],
];
for (const [name, size, scale] of targets) {
  fs.writeFileSync(path.join(OUT_DIR, name), encodePng(size, size, render(logo, size, scale)));
  console.log(`Wrote assets/${name} (${size}x${size}, logo at ${Math.round(scale * 100)}%)`);
}

// Solid white adaptive-icon background.
const bg = Buffer.alloc(1024 * 1024 * 4, 255);
fs.writeFileSync(path.join(OUT_DIR, "android-icon-background.png"), encodePng(1024, 1024, bg));
console.log("Wrote assets/android-icon-background.png (solid white)");

// The splash uses the real logo directly.
fs.copyFileSync(SRC_LOGO, path.join(OUT_DIR, "splash-icon.png"));
console.log("Wrote assets/splash-icon.png (copy of the real logo)");

// Copy the real product photos so the app shows the same imagery as the site.
const productsDir = path.join(root, "public", "images", "products");
for (const file of fs.readdirSync(productsDir)) {
  if (!file.endsWith(".png")) continue;
  fs.copyFileSync(path.join(productsDir, file), path.join(PRODUCTS_OUT, file));
  console.log(`Copied assets/products/${file}`);
}
console.log("DONE");
