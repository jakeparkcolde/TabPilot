import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { Buffer } from "node:buffer";
import process from "node:process";

const outputDirectory = process.argv[2] ?? "public/icons";
const sizes = [16, 32, 48, 128];
const samples = 4;

mkdirSync(outputDirectory, { recursive: true });

for (const size of sizes) {
  const rgba = Buffer.alloc(size * size * 4);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const accumulated = [0, 0, 0, 0];

      for (let sy = 0; sy < samples; sy += 1) {
        for (let sx = 0; sx < samples; sx += 1) {
          const nx = (x + (sx + 0.5) / samples) / size;
          const ny = (y + (sy + 0.5) / samples) / size;
          const color = sampleIcon(nx, ny);
          for (let channel = 0; channel < 4; channel += 1) {
            accumulated[channel] += color[channel];
          }
        }
      }

      const offset = (y * size + x) * 4;
      const sampleCount = samples * samples;
      for (let channel = 0; channel < 4; channel += 1) {
        rgba[offset + channel] = Math.round(accumulated[channel] / sampleCount);
      }
    }
  }

  writeFileSync(
    `${outputDirectory}/icon-${size}.png`,
    encodePng(size, size, rgba),
  );
}

function sampleIcon(x, y) {
  const background = [10, 10, 10, 255];
  const transparent = [0, 0, 0, 0];
  const inset = 0.125;
  const radius = 0.16;

  if (!insideRoundedRect(x, y, inset, inset, 1 - inset * 2, radius)) {
    return transparent;
  }

  const waves = [
    { y: 0.34, color: [15, 81, 50, 255] },
    { y: 0.51, color: [45, 140, 95, 255] },
    { y: 0.68, color: [168, 221, 197, 255] },
  ];

  for (const wave of waves) {
    if (distanceToWave(x, y, wave.y) <= 0.038) {
      return wave.color;
    }
  }

  return background;
}

function insideRoundedRect(x, y, left, top, width, radius) {
  const right = left + width;
  const bottom = top + width;
  const nearestX = Math.max(left + radius, Math.min(x, right - radius));
  const nearestY = Math.max(top + radius, Math.min(y, bottom - radius));
  const dx = x - nearestX;
  const dy = y - nearestY;
  return (
    x >= left &&
    x <= right &&
    y >= top &&
    y <= bottom &&
    dx * dx + dy * dy <= radius * radius
  );
}

function distanceToWave(x, y, centerY) {
  const points = [];
  const segments = [
    [
      [0.17, centerY],
      [0.29, centerY - 0.105],
      [0.39, centerY + 0.105],
      [0.51, centerY - 0.01],
    ],
    [
      [0.51, centerY - 0.01],
      [0.63, centerY - 0.12],
      [0.74, centerY + 0.08],
      [0.85, centerY],
    ],
  ];

  for (const segment of segments) {
    for (let step = 0; step <= 36; step += 1) {
      points.push(cubicPoint(segment, step / 36));
    }
  }

  let minimum = Infinity;
  for (let index = 1; index < points.length; index += 1) {
    minimum = Math.min(
      minimum,
      distanceToSegment(x, y, points[index - 1], points[index]),
    );
  }
  return minimum;
}

function cubicPoint(points, t) {
  const inverse = 1 - t;
  const a = inverse ** 3;
  const b = 3 * inverse ** 2 * t;
  const c = 3 * inverse * t ** 2;
  const d = t ** 3;
  return [
    a * points[0][0] + b * points[1][0] + c * points[2][0] + d * points[3][0],
    a * points[0][1] + b * points[1][1] + c * points[2][1] + d * points[3][1],
  ];
}

function distanceToSegment(x, y, start, end) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const lengthSquared = dx * dx + dy * dy;
  const ratio =
    lengthSquared === 0
      ? 0
      : Math.max(
          0,
          Math.min(
            1,
            ((x - start[0]) * dx + (y - start[1]) * dy) / lengthSquared,
          ),
        );
  return Math.hypot(x - (start[0] + ratio * dx), y - (start[1] + ratio * dy));
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  const rows = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * (width * 4 + 1);
    rows[rowOffset] = 0;
    rgba.copy(rows, rowOffset + 1, y * width * 4, (y + 1) * width * 4);
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
