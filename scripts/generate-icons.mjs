import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import zlib from 'node:zlib'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'public', 'icons')
mkdirSync(outDir, { recursive: true })

const BACKGROUND = [28, 27, 31, 255]
const ACCENT = [208, 188, 255, 255]

const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

function crc32(buffer) {
  let crc = -1
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ -1) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const typeBuffer = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0)
  return Buffer.concat([length, typeBuffer, data, crc])
}

function encodePng(width, height, rgba) {
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function createCanvas(size) {
  return { size, pixels: Buffer.alloc(size * size * 4) }
}

function setPixel(canvas, x, y, color, alpha = 1) {
  if (x < 0 || y < 0 || x >= canvas.size || y >= canvas.size) return
  const index = (y * canvas.size + x) * 4
  if (alpha >= 1) {
    canvas.pixels[index] = color[0]
    canvas.pixels[index + 1] = color[1]
    canvas.pixels[index + 2] = color[2]
    canvas.pixels[index + 3] = 255
    return
  }
  const existing = canvas.pixels
  existing[index] = Math.round(existing[index] * (1 - alpha) + color[0] * alpha)
  existing[index + 1] = Math.round(existing[index + 1] * (1 - alpha) + color[1] * alpha)
  existing[index + 2] = Math.round(existing[index + 2] * (1 - alpha) + color[2] * alpha)
  existing[index + 3] = Math.max(existing[index + 3], Math.round(255 * alpha))
}

function fillRoundedRect(canvas, radius, color) {
  const size = canvas.size
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = Math.max(radius - x, x - (size - 1 - radius), 0)
      const dy = Math.max(radius - y, y - (size - 1 - radius), 0)
      if (dx * dx + dy * dy > radius * radius) continue
      setPixel(canvas, x, y, color)
    }
  }
}

function drawThickLine(canvas, x0, y0, x1, y1, thickness, color) {
  const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0)) * 2
  const half = thickness / 2
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps
    const cx = x0 + (x1 - x0) * t
    const cy = y0 + (y1 - y0) * t
    for (let dy = -Math.ceil(half); dy <= Math.ceil(half); dy += 1) {
      for (let dx = -Math.ceil(half); dx <= Math.ceil(half); dx += 1) {
        if (Math.hypot(dx, dy) > half) continue
        setPixel(canvas, Math.round(cx + dx), Math.round(cy + dy), color)
      }
    }
  }
}

function drawCircle(canvas, cx, cy, radius, color) {
  for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y += 1) {
    for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x += 1) {
      if (Math.hypot(x - cx, y - cy) > radius) continue
      setPixel(canvas, x, y, color)
    }
  }
}

function drawIcon(size, { rounded, padding }) {
  const canvas = createCanvas(size)
  fillRoundedRect(canvas, rounded ? size * 0.22 : 0, BACKGROUND)
  const inner = size - padding * 2
  const scale = inner / 64
  const toX = (value) => padding + value * scale
  const toY = (value) => padding + value * scale
  const stroke = Math.max(2, 6 * scale)
  const points = [
    [14, 44],
    [24, 34],
    [32, 40],
    [50, 20],
  ]
  for (let i = 0; i < points.length - 1; i += 1) {
    const from = points[i]
    const to = points[i + 1]
    drawThickLine(canvas, toX(from[0]), toY(from[1]), toX(to[0]), toY(to[1]), stroke, ACCENT)
  }
  drawCircle(canvas, toX(50), toY(20), stroke * 0.85, ACCENT)
  return canvas
}

const targets = [
  { file: 'icon-192.png', size: 192, rounded: true, padding: 18 },
  { file: 'icon-512.png', size: 512, rounded: true, padding: 48 },
  { file: 'maskable-512.png', size: 512, rounded: false, padding: 118 },
  { file: 'apple-touch-icon.png', size: 180, rounded: false, padding: 17 },
]

for (const target of targets) {
  const canvas = drawIcon(target.size, target)
  writeFileSync(join(outDir, target.file), encodePng(target.size, target.size, canvas.pixels))
  console.log(`generated ${target.file}`)
}
