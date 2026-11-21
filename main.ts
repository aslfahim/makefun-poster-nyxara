// NYXARA — a travel poster for a city that lives in a crater, under a
// ringed planet that never sets. Painted in one file from raw pixels:
// star field, the great ringed planet, terraced crater streets with lit
// windows, and a crystal spire that catches the planetlight.
import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";

const VW = 768;
const VH = 1024;
const view = new Uint8Array(VW * VH * 3);

let s0 = 20261121;
function pick() {
  // Lehmer step kept strictly positive: a signed overflow here once made
  // negative alphas that wrapped the pixel buffer into neon green.
  s0 = Math.abs((Math.imul(s0, 48271) + 11) % 2147483647);
  if (s0 === 0) s0 = 987654321;
  return s0 / 2147483647;
}
function paint(x, y, c, a) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= VW || y >= VH) return;
  const i = (y * VW + x) * 3;
  view[i] = view[i] * (1 - a) + c[0] * a;
  view[i + 1] = view[i + 1] * (1 - a) + c[1] * a;
  view[i + 2] = view[i + 2] * (1 - a) + c[2] * a;
}
function tone(h) {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}
function fade(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
function nightSky() {
  const stops = [
    [0, tone("#05060f")], [260, tone("#0d1030")], [520, tone("#1c1440")],
    [760, tone("#2a1a4a")], [1024, tone("#170f2e")],
  ];
  for (let y = 0; y < VH; y++) {
    let s = 0;
    while (s < stops.length - 2 && y > stops[s + 1][0]) s++;
    const c = fade(stops[s][1], stops[s + 1][1], Math.min(1, Math.max(0, (y - stops[s][0]) / (stops[s + 1][0] - stops[s][0]))));
    for (let x = 0; x < VW; x++) {
      const i = (y * VW + x) * 3;
      view[i] = c[0]; view[i + 1] = c[1]; view[i + 2] = c[2];
    }
  }
}
function orb(cx, cy, r, c, a) {
  for (let y = Math.floor(cy - r); y <= cy + r; y++) {
    const half = Math.sqrt(Math.max(0, r * r - (y - cy) * (y - cy)));
    for (let x = Math.floor(cx - half); x <= cx + half; x++) paint(x, y, c, a);
  }
}
function disc2(cx, cy, rx, ry, c, a) {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) {
    const t = (y - cy) / ry;
    const half = rx * Math.sqrt(Math.max(0, 1 - t * t));
    for (let x = Math.floor(cx - half); x <= cx + half; x++) paint(x, y, c, a);
  }
}
function aura(cx, cy, rx, ry, c, a) {
  for (let k = 6; k >= 1; k--) disc2(cx, cy, (rx * k) / 6, (ry * k) / 6, c, a / 3.4);
}
function fill(pts, c, a) {
  let lo = Infinity, hi = -Infinity;
  for (const p of pts) { lo = Math.min(lo, p[1]); hi = Math.max(hi, p[1]); }
  for (let y = Math.floor(lo); y <= hi; y++) {
    const xs = [];
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[(i + 1) % pts.length];
      if ((p[1] <= y && q[1] > y) || (q[1] <= y && p[1] > y)) xs.push(p[0] + ((y - p[1]) / (q[1] - p[1])) * (q[0] - p[0]));
    }
    xs.sort((m, n) => m - n);
    for (let i = 0; i + 1 < xs.length; i += 2)
      for (let x = Math.floor(xs[i]); x <= xs[i + 1]; x++) paint(x, y, c, a);
  }
}
function beam(x0, y0, x1, y1, w, c, a) {
  const d = Math.hypot(x1 - x0, y1 - y0);
  const n = Math.max(1, Math.ceil(d / (w * 0.3)));
  for (let i = 0; i <= n; i++) orb(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, w / 2, c, a);
}
function cell(x, y, w, h, c, a) {
  for (let j = Math.floor(y); j < y + h; j++)
    for (let i = Math.floor(x); i < x + w; i++) paint(i, j, c, a);
}

// Stroke letters on a 4x6 grid — the poster's own hand-set type.
const TYPE = {
  A: [[[0, 6], [2, 0], [4, 6]], [[1.1, 4.1], [2.9, 4.1]]],
  B: [[[0, 0], [0, 6]], [[0, 0], [2.6, 0], [3.7, 1], [2.6, 2.1], [0, 2.1]], [[0, 2.1], [2.9, 2.1], [3.9, 3.6], [2.9, 6], [0, 6]]],
  C: [[[4, 1.4], [2.7, 0.1], [0.9, 0.7], [0, 3], [0.9, 5.3], [2.7, 5.9], [4, 4.6]]],
  D: [[[0, 0], [0, 6]], [[0, 0], [2.4, 0], [4, 1.9], [4, 4.1], [2.4, 6], [0, 6]]],
  E: [[[4, 0], [0, 0], [0, 6], [4, 6]], [[0, 3], [3.1, 3]]],
  F: [[[4, 0], [0, 0], [0, 6]], [[0, 3], [3.1, 3]]],
  G: [[[4, 1.4], [2.7, 0.1], [0.9, 0.7], [0, 3], [0.9, 5.3], [2.7, 5.9], [4, 5.9], [4, 3.7], [2.5, 3.7]]],
  H: [[[0, 0], [0, 6]], [[4, 0], [4, 6]], [[0, 3], [4, 3]]],
  I: [[[2, 0], [2, 6]], [[0.6, 0], [3.4, 0]], [[0.6, 6], [3.4, 6]]],
  J: [[[4, 0], [4, 4.5], [3.1, 5.8], [1.3, 6], [0.3, 4.9]]],
  K: [[[0, 0], [0, 6]], [[4, 0], [0.7, 3.1]], [[1.3, 2.5], [4, 6]]],
  L: [[[0, 0], [0, 6], [4, 6]]],
  M: [[[0, 6], [0, 0], [2, 3.4], [4, 0], [4, 6]]],
  N: [[[0, 6], [0, 0], [4, 6], [4, 0]]],
  O: [[[2, 0], [3.6, 0.7], [4, 3], [3.6, 5.3], [2, 6], [0.4, 5.3], [0, 3], [0.4, 0.7], [2, 0]]],
  P: [[[0, 6], [0, 0], [3, 0], [4, 1.1], [3, 2.5], [0, 2.5]]],
  Q: [[[2, 0], [3.6, 0.7], [4, 3], [3.6, 5.3], [2, 6], [0.4, 5.3], [0, 3], [0.4, 0.7], [2, 0]], [[2.7, 4.3], [4.3, 6.3]]],
  R: [[[0, 6], [0, 0], [3, 0], [4, 1.1], [3, 2.5], [0, 2.5]], [[2.1, 2.5], [4, 6]]],
  S: [[[4, 0.9], [2.7, 0], [0.9, 0.6], [0.5, 1.9], [2, 2.9], [3.4, 3.7], [3.6, 5], [2.4, 6], [0.3, 5.3]]],
  T: [[[0, 0], [4, 0]], [[2, 0], [2, 6]]],
  U: [[[0, 0], [0, 4.3], [0.8, 5.6], [2, 6], [3.2, 5.6], [4, 4.3], [4, 0]]],
  V: [[[0, 0], [2, 6], [4, 0]]],
  W: [[[0, 0], [0.8, 6], [2, 2.7], [3.2, 6], [4, 0]]],
  X: [[[0, 0], [4, 6]], [[4, 0], [0, 6]]],
  Y: [[[0, 0], [2, 2.8], [4, 0]], [[2, 2.8], [2, 6]]],
  Z: [[[0, 0], [4, 0], [0, 6], [4, 6]]],
  " ": [],
};
function title(text, cx, y, size, c, a, track) {
  const s = size / 6;
  const w = Math.max(2.4, size * 0.17);
  let x = cx - (text.length * 5 * s + (text.length - 1) * track * s) / 2;
  for (const ch of text.toUpperCase()) {
    for (const st of TYPE[ch] || [])
      for (let i = 0; i + 1 < st.length; i++)
        beam(x + st[i][0] * s, y + st[i][1] * s, x + st[i + 1][0] * s, y + st[i + 1][1] * s, w, c, a);
    x += 5 * s + track * s;
  }
}

// ---- The scene: planetlight over the crater city ----
nightSky();

// Stars: three depths of them, a few with cross sparkle.
for (let i = 0; i < 420; i++) {
  const x = pick() * VW;
  const y = Math.pow(pick(), 1.4) * 700;
  const b = pick();
  orb(x, y, b > 0.92 ? 2 : 1.2, tone("#e8e6ff"), 0.35 + b * 0.6);
  if (b > 0.965) {
    beam(x - 7, y, x + 7, y, 1.4, tone("#cfd4ff"), 0.5);
    beam(x, y - 7, x, y + 7, 1.4, tone("#cfd4ff"), 0.5);
  }
}

// The ringed planet, huge at upper right, banded violet and rose.
const PX = 556, PY = 218, PR = 118;
aura(PX, PY, PR * 1.5, PR * 1.5, tone("#7a5af2"), 0.35);
// Back ring first, so the planet's face can cover its middle.
disc2(PX, PY + 16, PR * 1.85, PR * 0.34, tone("#b9a7f2"), 0.5);
disc2(PX, PY + 16, PR * 1.62, PR * 0.27, tone("#0d1030"), 0.35);
orb(PX, PY, PR, tone("#8a6fe8"), 1);
for (let i = 0; i < 7; i++) {
  const by = PY - PR + 18 + i * ((PR * 2 - 36) / 7);
  const half = Math.sqrt(Math.max(0, PR * PR - (by - PY) * (by - PY)));
  const bandC = [tone("#a78bf0"), tone("#7a5ad0"), tone("#c39bd8"), tone("#6a4cc0")][i % 4];
  beam(PX - half + 4, by, PX + half - 4, by + 6, 9, bandC, 0.35);
}
// Terminator shadow on the planet's lower left.
for (let i = 0; i < 5; i++) orb(PX - 52 + i * 6, PY + 62 - i * 4, PR * 0.62, tone("#241547"), 0.10);
// Front ring over the face.
disc2(PX, PY + 16, PR * 1.85, PR * 0.34, tone("#d9ccff"), 0.28);
{
  // carve the front ring into an arc band by repainting sky inside it is
  // complex; instead draw the ring as two bright ellipse strokes.
  for (const rr of [1.85, 1.72, 1.6]) {
    for (let a = 0; a <= Math.PI * 2; a += 0.012) {
      const x = PX + Math.cos(a) * PR * rr;
      const y = PY + 16 + Math.sin(a) * PR * 0.34 * (rr / 1.85 + 0.4);
      if (Math.sin(a) > -0.15) paint(x, y, tone("#e6dcff"), 0.5);
    }
  }
}

// A small moon, far left, cratered.
orb(112, 150, 34, tone("#d8dcf0"), 1);
orb(100, 140, 8, tone("#b9bdd4"), 0.8);
orb(124, 162, 6, tone("#b9bdd4"), 0.8);
orb(116, 132, 4.4, tone("#c6c9dc"), 0.8);

// The crater: a great bowl rim across the lower half, terraced streets
// stepping down to the city floor.
fill([[0, 560], [150, 640], [330, 700], [520, 692], [768, 612], [768, 1024], [0, 1024]], tone("#120b26"), 1);
for (let t = 0; t < 5; t++) {
  const y0 = 600 + t * 52;
  const inset = t * 26;
  fill([[inset, y0 + 60], [180 + inset * 0.4, y0 + 108], [420, y0 + 118], [640 - inset * 0.4, y0 + 96], [VW - inset, y0 + 44], [VW - inset, y0 + 130], [inset, y0 + 140]], fade(tone("#1d1238"), tone("#241647"), t / 5), 0.85);
  // Windows scattered along this terrace, warm and cool.
  for (let i = 0; i < 34; i++) {
    const wx = 30 + pick() * (VW - 60);
    const wy = y0 + 66 + pick() * 58;
    if (pick() > 0.3) cell(wx, wy, 5, 6.4, pick() > 0.4 ? tone("#ffca66") : tone("#a7e8f2"), 0.9);
  }
}
// City floor glow at the bowl's heart.
aura(392, 880, 300, 90, tone("#5a3d99"), 0.4);

// The crystal spire at the city's heart: three shards, the tallest
// catching planetlight along one edge, with a beacon at its peak.
function shard(cx, baseY, h, wdt, cA, cB) {
  fill([[cx - wdt, baseY], [cx, baseY - h], [cx + wdt * 0.4, baseY]], cA, 1);
  fill([[cx, baseY - h], [cx + wdt * 0.4, baseY], [cx + wdt * 0.08, baseY]], cB, 0.9);
  beam(cx, baseY - h + 8, cx + wdt * 0.3, baseY - 10, 2.4, tone("#eaf6ff"), 0.65);
}
shard(392, 884, 300, 44, tone("#3d2a6e"), tone("#6a4cc0"));
shard(322, 884, 196, 30, tone("#33235c"), tone("#553d99"));
shard(458, 884, 158, 26, tone("#2c1e52"), tone("#4a3585"));
aura(392, 576, 30, 30, tone("#a7e8f2"), 0.8);
orb(392, 576, 6, tone("#eaf6ff"), 1);
// Lit windows climbing the main shard.
for (let i = 0; i < 16; i++) {
  const wy = 640 + i * 14.6;
  const spread = 30 * (1 - (wy - 584) / 320);
  if (pick() > 0.35) cell(392 + (pick() - 0.5) * spread, wy, 4.4, 5.6, tone("#a7e8f2"), 0.85);
}

// A shooting star over the crater rim.
beam(120, 300, 210, 348, 3, tone("#ffffff"), 0.9);
beam(120, 300, 168, 326, 6, tone("#cfd4ff"), 0.35);

// The name low on the crater floor, lavender-white with a violet shadow.
title("NYXARA", VW / 2 + 4, 916, 88, tone("#0a0618"), 0.65, 0.6);
title("NYXARA", VW / 2, 910, 88, tone("#efeaff"), 1, 0.6);
beam(252, 1014 - 6, 516, 1014 - 6, 3, tone("#a78bf0"), 0.8);

// ---- PNG: Sub filter rows again, but packed by this file's own hand ----
const CRC_T = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_T[n] = c >>> 0;
}
function crcSum(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_T[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunkOf(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const sum = Buffer.alloc(4);
  sum.writeUInt32BE(crcSum(body));
  return Buffer.concat([len, body, sum]);
}
function render() {
  const stride = VW * 3;
  const raw = Buffer.alloc((stride + 1) * VH);
  for (let y = 0; y < VH; y++) {
    const row = y * (stride + 1);
    raw[row] = 1; // Sub
    for (let i = 0; i < stride; i++) {
      const left = i >= 3 ? view[y * stride + i - 3] : 0;
      raw[row + 1 + i] = (view[y * stride + i] - left) & 0xff;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(VW, 0);
  ihdr.writeUInt32BE(VH, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunkOf("IHDR", ihdr),
    chunkOf("IDAT", deflateSync(raw, { level: 9 })),
    chunkOf("IEND", Buffer.alloc(0)),
  ]);
}
const outPath = process.env.ENTRY_OUT || "/output/entry.png";
try { mkdirSync(outPath.slice(0, outPath.lastIndexOf("/")), { recursive: true }); } catch { /* provided */ }
writeFileSync(outPath, render());
console.log("NYXARA poster written to", outPath);
