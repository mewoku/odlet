// Second-source check: for each selected game, find it on chessgames.com (a different database than the
// pgnmentor collection the games were mined from) and confirm the move list is identical.
// Polite: one request every few seconds, back-off when the site asks to slow down, and only the PGNs of
// rows that match the year and the number of moves are fetched.
// Usage: node crosscheck.mjs <crosscheck-in.json> <out.json>
// input: [{ key, white, black, year, moves: ["e4", ...] }]
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { Chess } from 'chess.js';

const [inFile, outFile] = process.argv.slice(2);
const UA = 'Mozilla/5.0 (research; chess puzzle verification)';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const GAP_MS = 5000;

async function fetchText(url, looksValid) {
  for (let attempt = 0; attempt < 8; attempt++) {
    await sleep(GAP_MS);
    const body = execFileSync('curl.exe', ['-s', '-L', '-A', UA, '-m', '40', url], { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
    if (!/TECHNICAL DIFFICULTIES|Please register/i.test(body) && looksValid(body)) return body;
    console.error(`  throttled/invalid (attempt ${attempt + 1}); waiting`);
    await sleep(30000 * (attempt + 1));
  }
  return '';
}

function surname(n) { return n.split(',')[0].trim().split(/\s+/).pop(); }

function sanList(pgn) {
  const c = new Chess();
  try { c.loadPgn(pgn); } catch { return null; }
  return c.history();
}

const selected = JSON.parse(fs.readFileSync(inFile, 'utf8').replace(/^﻿/, ''));
const results = [];
for (const g of selected) {
  const q = `${surname(g.white)} ${surname(g.black)}`.replace(/\s+/g, '+');
  const html = await fetchText(`https://www.chessgames.com/perl/ezsearch.pl?search=${q}`, b => b.includes('chessgame?gid='));
  // rows: gid, result, full-move count, year
  const rows = [...html.matchAll(/chessgame\?gid=(\d+)">[^<]*<\/a>.*?<font[^>]*>(1-0|0-1|1\/2-1\/2)<\/font>.*?<font[^>]*>(\d+)<\/font>.*?<font[^>]*>(\d{4})<\/font>/gs)]
    .map(m => ({ gid: m[1], result: m[2], moves: Number(m[3]), year: m[4] }));
  const fullMoves = Math.ceil(g.moves.length / 2);
  const likely = rows.filter(r => r.moves === fullMoves && r.year === g.year);
  const gids = [...new Set((likely.length ? likely : rows.filter(r => r.moves === fullMoves)).map(r => r.gid))].slice(0, 6);
  let found = null;
  for (const gid of gids) {
    const pgn = await fetchText(`https://www.chessgames.com/perl/nph-chesspgn?text=1&gid=${gid}`, b => b.includes('[Event'));
    const moves = sanList(pgn);
    if (!moves) continue;
    if (moves.length === g.moves.length && moves.every((m, i) => m === g.moves[i])) {
      const h = {};
      for (const m of pgn.matchAll(/^\[(\w+)\s+"(.*)"\]\s*$/gm)) h[m[1]] = m[2];
      found = { gid, event: h.Event, site: h.Site, date: h.Date, white: h.White, black: h.Black, source: h.Source || null };
      break;
    }
  }
  results.push({ key: g.key, searched: q, rows: rows.length, tried: gids, match: found });
  console.error(`${g.key}: ${found ? 'MATCH gid ' + found.gid : `no identical game (rows ${rows.length}, tried ${gids.join(',') || 'none'})`}`);
  fs.writeFileSync(outFile, JSON.stringify(results, null, 1));
}
