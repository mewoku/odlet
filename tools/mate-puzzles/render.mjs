// Preview of ChessBoardElement's drawing (same sprites, colours, outline method) rendered to PNG without Unity.
// Usage: node render.mjs <out.png> <fen> [selectedSquare] [targets,comma] [flipped]
import fs from 'node:fs';
import zlib from 'node:zlib';
import { Chess } from 'chess.js';

const [out, fen, sel = '', targetsArg = '', flippedArg = '0'] = process.argv.slice(2);
const flipped = flippedArg === '1';
const S = 10;
const sprites = {
  p: ['..........', '....##....', '...####...', '...####...', '....##....', '...####...', '..######..', '...####...', '..######..', '.########.'],
  n: ['..##......', '.####.....', '#####.....', '######....', '#.#####...', '...######.', '...######.', '..#######.', '.#########', '.#########'],
  b: ['....##....', '...####...', '..##.###..', '..#.####..', '..######..', '...####...', '....##....', '...####...', '..######..', '.########.'],
  r: ['##..##..##', '##########', '.########.', '..######..', '..######..', '..######..', '..######..', '.########.', '##########', '##########'],
  q: ['#...##...#', '##..##..##', '.##.##.##.', '.########.', '..######..', '...####...', '...####...', '..######..', '.########.', '##########'],
  k: ['....##....', '..######..', '....##....', '..######..', '.########.', '.########.', '..######..', '...####...', '..######..', '##########'],
};const hex = h => [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
const lerp = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const BLUEGREY = hex('536971'), OFFWHITE = hex('E7E8E5'), DEEPBLUE = hex('135B73'), TEAL = hex('11C5B3'), YELLOW = hex('E8DA37');
const LIGHT = lerp(BLUEGREY, OFFWHITE, 0.3), DARK = DEEPBLUE;
const W = 400, H = 400, sq = 50;
const img = new Uint8Array(W * H * 3);
const fill = (x, y, w, h, c, a = 1) => {
  for (let j = Math.max(0, Math.round(y)); j < Math.min(H, Math.round(y + h)); j++)
    for (let i = Math.max(0, Math.round(x)); i < Math.min(W, Math.round(x + w)); i++) {
      const o = (j * W + i) * 3;
      for (let k = 0; k < 3; k++) img[o + k] = Math.round(img[o + k] * (1 - a) + c[k] * a);
    }
};
const sqIndex = name => ({ file: name.charCodeAt(0) - 97, rank: name.charCodeAt(1) - 49 });
const toScreen = (file, rank) => flipped ? [7 - file, rank] : [file, 7 - rank];
const board = new Chess(fen).board();
const targets = new Set(targetsArg ? targetsArg.split(',') : []);
for (let rank = 0; rank < 8; rank++) for (let file = 0; file < 8; file++) {
  const [c, r] = toScreen(file, rank);
  fill(c * sq, r * sq, sq, sq, (file + rank) % 2 === 1 ? LIGHT : DARK);
  const name = String.fromCharCode(97 + file) + (rank + 1);
  if (name === sel) fill(c * sq, r * sq, sq, sq, YELLOW, 0.6);
}
const drawPiece = (type, white, cx, cy) => {
  const cell = sq * 0.74 / S, o = Math.max(1, cell * 0.9);
  const ox = cx - S * cell / 2, oy = cy - S * cell / 2;
  const fillC = white ? OFFWHITE : hex('0B0C10'), outline = white ? hex('090A0C') : OFFWHITE;
  const paint = (dx, dy, col) => sprites[type].forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '#') fill(ox + dx + x * cell, oy + dy + y * cell, cell + 0.5, cell + 0.5, col); }));
  for (const [dx, dy] of [[o, 0], [-o, 0], [0, o], [0, -o], [o, o], [-o, -o], [o, -o], [-o, o]]) paint(dx, dy, outline);
  paint(0, 0, fillC);
};
for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
  const p = board[r][f]; if (!p) continue;
  const rank = 7 - r; const [c, rr] = toScreen(f, rank);
  drawPiece(p.type, p.color === 'w', c * sq + sq / 2, rr * sq + sq / 2);
}
for (const t of targets) {
  const { file, rank } = sqIndex(t); const [c, r] = toScreen(file, rank);
  const occupied = board[7 - rank][file];
  if (!occupied) fill(c * sq + sq * 0.35, r * sq + sq * 0.35, sq * 0.3, sq * 0.3, TEAL, 0.95);
  else { const w = sq * 0.1; fill(c * sq, r * sq, sq, w, TEAL); fill(c * sq, r * sq + sq - w, sq, w, TEAL); fill(c * sq, r * sq, w, sq, TEAL); fill(c * sq + sq - w, r * sq, w, sq, TEAL); }
}
// PNG encode
const raw = Buffer.alloc((W * 3 + 1) * H);
for (let y = 0; y < H; y++) { raw[y * (W * 3 + 1)] = 0; Buffer.from(img.buffer, y * W * 3, W * 3).copy(raw, y * (W * 3 + 1) + 1); }
const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = buf => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 2;
fs.writeFileSync(out, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
console.log('wrote', out);
