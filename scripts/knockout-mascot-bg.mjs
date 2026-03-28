/**
 * Makes edge-connected near-white pixels transparent (removes matte background,
 * keeps interior whites like the duck's eye).
 */
import sharp from "sharp";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const inputPath = join(root, "public/mascot-light.png");
const outPath = join(root, "public/mascot-light.png");
const iconPath = join(root, "src/app/icon.png");

const THRESH = 248;

function nearWhite(r, g, b) {
  return r >= THRESH && g >= THRESH && b >= THRESH;
}

const { data, info } = await sharp(inputPath)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const w = info.width;
const h = info.height;
const ch = 4;
const buf = Buffer.from(data);
const vis = new Uint8Array(w * h);

const queue = [];
function enqueue(x, y) {
  if (x < 0 || x >= w || y < 0 || y >= h) return;
  const k = y * w + x;
  if (vis[k]) return;
  const j = k * ch;
  if (!nearWhite(buf[j], buf[j + 1], buf[j + 2])) return;
  vis[k] = 1;
  queue.push([x, y]);
}

for (let x = 0; x < w; x++) {
  enqueue(x, 0);
  enqueue(x, h - 1);
}
for (let y = 0; y < h; y++) {
  enqueue(0, y);
  enqueue(w - 1, y);
}

const dirs = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
while (queue.length) {
  const [x, y] = queue.shift();
  const idx = (y * w + x) * ch;
  buf[idx + 3] = 0;
  for (const [dx, dy] of dirs) {
    enqueue(x + dx, y + dy);
  }
}

const out = await sharp(buf, {
  raw: { width: w, height: h, channels: 4 },
})
  .png()
  .toBuffer();

writeFileSync(outPath, out);
writeFileSync(iconPath, out);
console.log("Updated public/mascot-light.png and src/app/icon.png");
