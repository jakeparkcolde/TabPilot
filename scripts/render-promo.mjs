import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { Buffer } from "node:buffer";

const width = 440;
const height = 280;
const rgba = Buffer.alloc(width * height * 4);

for (let y = 0; y < height; y += 1) {
  for (let x = 0; x < width; x += 1) {
    const nx = x / width;
    const ny = y / height;
    const offset = (y * width + x) * 4;
    const glow = Math.max(0, 1 - Math.hypot(nx - 0.5, ny - 0.5) * 1.6);
    const base = 10 + Math.round(glow * 8);
    const color = [base, base + Math.round(glow * 8), base + 2, 255];

    const waves = [
      { center: 0.35, color: [15, 81, 50, 255] },
      { center: 0.5, color: [45, 140, 95, 255] },
      { center: 0.65, color: [168, 221, 197, 255] },
    ];
    for (const wave of waves) {
      if (distanceToWave(nx, ny, wave.center) < 0.027) {
        color.splice(0, 4, ...wave.color);
      }
    }

    rgba.set(color, offset);
  }
}

mkdirSync("store-assets", { recursive: true });
writeFileSync(
  "store-assets/promo-small-440x280.png",
  encodePng(width, height, rgba),
);

function distanceToWave(x, y, centerY) {
  let minimum = Infinity;
  let previous = null;
  for (let step = 0; step <= 120; step += 1) {
    const px = 0.08 + (step / 120) * 0.84;
    const py =
      centerY +
      Math.sin((px - 0.08) * Math.PI * 5.2) * 0.055 +
      Math.sin(px * Math.PI * 1.4) * 0.018;
    if (previous) {
      minimum = Math.min(minimum, distanceToSegment(x, y, previous, [px, py]));
    }
    previous = [px, py];
  }
  return minimum;
}

function distanceToSegment(x, y, start, end) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const lengthSquared = dx * dx + dy * dy;
  const ratio = Math.max(
    0,
    Math.min(1, ((x - start[0]) * dx + (y - start[1]) * dy) / lengthSquared),
  );
  return Math.hypot(x - (start[0] + ratio * dx), y - (start[1] + ratio * dy));
}

function encodePng(imageWidth, imageHeight, pixels) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(imageWidth, 0);
  ihdr.writeUInt32BE(imageHeight, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  const rows = Buffer.alloc((imageWidth * 4 + 1) * imageHeight);
  for (let y = 0; y < imageHeight; y += 1) {
    const rowOffset = y * (imageWidth * 4 + 1);
    rows[rowOffset] = 0;
    pixels.copy(
      rows,
      rowOffset + 1,
      y * imageWidth * 4,
      (y + 1) * imageWidth * 4,
    );
  }

  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(rows)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const output = Buffer.alloc(data.length + 12);
  output.writeUInt32BE(data.length, 0);
  typeBuffer.copy(output, 4);
  data.copy(output, 8);
  output.writeUInt32BE(
    crc32(Buffer.concat([typeBuffer, data])),
    data.length + 8,
  );
  return output;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
