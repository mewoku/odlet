// Mines real games (PGN files) that END IN CHECKMATE and lists the positions from which the winner
// delivered mate in 2 or 3 of his own moves, exactly as played in the game.
// Usage: node mine.mjs <dataDir> <out.json>
import fs from 'node:fs';
import path from 'node:path';
import { Chess } from 'chess.js';

const [dataDir, outFile] = process.argv.slice(2);

function* games(text) {
  // Split on the start of a header block that follows a blank line.
  const parts = text.replace(/\r/g, '').split(/\n\n(?=\[Event )/);
  for (const p of parts) if (p.trim()) yield p;
}

function headers(text) {
  const h = {};
  for (const m of text.matchAll(/^\[(\w+)\s+"(.*)"\]\s*$/gm)) h[m[1]] = m[2];
  return h;
}

const results = [];
let total = 0, mates = 0, bad = 0;
for (const player of fs.readdirSync(dataDir, { withFileTypes: true })) {
  if (!player.isDirectory()) continue;
  const dir = path.join(dataDir, player.name);
  for (const f of fs.readdirSync(dir)) {
    if (!f.toLowerCase().endsWith('.pgn')) continue;
    const text = fs.readFileSync(path.join(dir, f), 'utf8');
    for (const g of games(text)) {
      total++;
      const h = headers(g);
      if (h.FEN || h.SetUp === '1') continue;
      if (h.Result !== '1-0' && h.Result !== '0-1') continue;
      const chess = new Chess();
      try { chess.loadPgn(g); } catch { bad++; continue; }
      if (!chess.isCheckmate()) continue;
      mates++;
      const hist = chess.history({ verbose: true });
      const N = hist.length;
      const matedColor = chess.turn(); // side to move is mated
      const winner = matedColor === 'w' ? 'b' : 'w';
      for (const k of [2, 3]) {
        const start = N - (2 * k - 1);
        if (start < 0) continue;
        const first = hist[start];
        if (first.color !== winner) continue;
        const sol = hist.slice(start);
        const replay = new Chess();
        for (let i = 0; i < start; i++) replay.move(hist[i].san);
        const fen = replay.fen();
        const attackerMoves = sol.filter((_, i) => i % 2 === 0);
        results.push({
          source: player.name, file: f,
          white: h.White, black: h.Black, event: h.Event, site: h.Site, date: h.Date, round: h.Round, result: h.Result,
          totalPlies: N, startPly: start, k, winner, fen, moves: hist.map(m => m.san),
          solution: sol.map(m => m.san),
          legalAtStart: replay.moves().length,
          allAttackerChecks: attackerMoves.every(m => /[+#]$/.test(m.san)),
          firstIsCheck: /[+#]$/.test(first.san),
          hasPromotion: sol.some(m => m.promotion), hasCastle: sol.some(m => m.flags.includes('k') || m.flags.includes('q')),
          hasEp: sol.some(m => m.flags.includes('e')),
          pieces: (fen.split(' ')[0].match(/[a-zA-Z]/g) || []).length,
        });
      }
    }
  }
}
fs.writeFileSync(outFile, JSON.stringify(results));
console.log(JSON.stringify({ games: total, mateEndings: mates, unreadable: bad, candidates: results.length }));

