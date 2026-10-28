import { Chess } from 'chess.js';
const positions = [
  ['start', 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 4],
  ['kiwipete', 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', 3],
  ['pos3', '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', 4],
  ['pos4', 'r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1', 3],
  ['pos5', 'rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8', 3],
  ['pos6', 'r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10', 3],
];
function perft(c, d) {
  if (d === 0) return 1;
  const ms = c.moves({ verbose: true });
  if (d === 1) return ms.length;
  let n = 0;
  for (const m of ms) { c.move(m); n += perft(c, d - 1); c.undo(); }
  return n;
}
for (const [name, fen, maxD] of positions) {
  const c = new Chess(fen);
  const r = [];
  for (let d = 1; d <= maxD; d++) r.push(perft(c, d));
  console.log(name.padEnd(9), JSON.stringify(r), fen);
}
