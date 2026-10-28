// Verifies candidate positions with an exhaustive forced-mate search (chess.js legal move generation).
// For each candidate (mate in k as played in the game) it checks:
//  - the game's first move is a forced mate in k (every defence loses) and no shorter forced mate exists
//  - it is the ONLY first move that forces mate within k
//  - the same uniqueness holds at the later attacker steps (after the move the defender actually played)
// Usage: node solve.mjs <candidates.json> <out.json> [maxLegal] [onlyKs]
import fs from 'node:fs';
import { Chess } from 'chess.js';

const [inFile, outFile, maxLegalArg, ksArg, nameRe] = process.argv.slice(2);
const maxLegal = Number(maxLegalArg || 60);
const ks = (ksArg || '2,3').split(',').map(Number);

// attacker (side to move) can force mate in <= n of his own moves?
function attackerWins(chess, n) {
  const moves = chess.moves({ verbose: true });
  // quick: any mating move (san ends with '#')
  for (const m of moves) if (m.san.endsWith('#')) return true;
  if (n <= 1) return false;
  for (const m of moves) {
    chess.move(m);
    const ok = defenderLoses(chess, n - 1);
    chess.undo();
    if (ok) return true;
  }
  return false;
}

// defender to move: every legal reply leaves the attacker a forced mate in <= n
function defenderLoses(chess, n) {
  const replies = chess.moves({ verbose: true });
  if (replies.length === 0) return false; // stalemate (checkmate is handled by the caller)
  // try captures and king moves first: they refute most often
  replies.sort((a, b) => (b.captured ? 1 : 0) - (a.captured ? 1 : 0) || (b.piece === 'k') - (a.piece === 'k'));
  for (const r of replies) {
    chess.move(r);
    const ok = attackerWins(chess, n);
    chess.undo();
    if (!ok) return false;
  }
  return true;
}

// all first moves that force mate within n
function forcingMoves(chess, n) {
  const out = [];
  for (const m of chess.moves({ verbose: true })) {
    chess.move(m);
    let ok;
    if (chess.isCheckmate()) ok = true;
    else ok = n > 1 && defenderLoses(chess, n - 1);
    chess.undo();
    if (ok) out.push(m.san);
  }
  return out;
}

const cands = JSON.parse(fs.readFileSync(inFile, 'utf8'))
  .filter(c => ks.includes(c.k) && c.legalAtStart <= maxLegal && !c.hasPromotion && (!nameRe || new RegExp(nameRe).test(c.white + ' ' + c.black)))
  .sort((a, b) => a.legalAtStart - b.legalAtStart);

const out = [];
let i = 0;
for (const c of cands) {
  i++;
  const t0 = Date.now();
  const chess = new Chess(c.fen);
  const steps = [];
  let ok = true;
  let sideMoves = c.solution.filter((_, idx) => idx % 2 === 0).length; // == k
  let remaining = c.k;
  for (let idx = 0; idx < c.solution.length; idx += 2) {
    const forcing = forcingMoves(chess, remaining);
    const shorter = remaining > 1 ? forcingMoves(chess, remaining - 1) : [];
    steps.push({ move: c.solution[idx], forcing, shorter });
    if (forcing.length !== 1 || forcing[0] !== c.solution[idx] || shorter.length > 0) ok = false;
    chess.move(c.solution[idx]);
    if (idx + 1 < c.solution.length) {
      const replies = chess.moves().length;
      steps[steps.length - 1].defenderReplies = replies;
      chess.move(c.solution[idx + 1]);
    }
    remaining--;
  }
  const finalMate = chess.isCheckmate();
  const rec = { ...c, unique: ok && finalMate, steps, ms: Date.now() - t0 };
  out.push(rec);
  fs.appendFileSync(outFile + '.jsonl', JSON.stringify(rec) + '\n');
  if ((i % 20) === 0 || rec.ms > 20000) console.error(`${i}/${cands.length} ${rec.white} - ${rec.black} k=${c.k} unique=${rec.unique} ${rec.ms}ms`);
}
fs.writeFileSync(outFile, JSON.stringify(out));
console.log(JSON.stringify({ checked: out.length, unique: out.filter(r => r.unique).length }));

