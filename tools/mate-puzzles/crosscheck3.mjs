// Robust second-source check for a list of keys from selected.json (search by surnames + year, rows of the same
// year and result, robust PGN cleaning). Writes crosscheck3-out.json. Usage: node crosscheck3.mjs <key> [<key>...]
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { Chess } from 'chess.js';

const keys = process.argv.slice(2);
const UA = 'Mozilla/5.0 (research; chess puzzle verification)';
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function get(url, ok) {
  for (let a = 0; a < 6; a++) {
    await sleep(6000);
    const b = execFileSync('curl.exe', ['-s', '-L', '-A', UA, '-m', '40', url], { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
    if (!/TECHNICAL DIFFICULTIES|Please register/i.test(b) && ok(b)) return b;
    console.error('  throttled; waiting'); await sleep(40000 * (a + 1));
  }
  return '';
}
const surname = n => n.split(',')[0].trim().split(/\s+/).pop();
function movesOf(pgn) {
  let t = pgn.split(/\r?\n/).filter(l => !/^\s*\[/.test(l)).join('\n');
  const comments = [...t.matchAll(/\{([^}]*)\}/g)].map(m => m[1]);
  t = t.replace(/\{[^}]*\}/g, ' ').replace(/;[^\n]*/g, ' ');
  while (/\([^()]*\)/.test(t)) t = t.replace(/\([^()]*\)/g, ' ');
  t = t.replace(/\$\d+/g, ' ').replace(/\s+/g, ' ').trim();
  const c = new Chess();
  try { c.loadPgn(t); } catch { return { moves: null, comments }; }
  return { moves: c.history(), comments };
}
const headers = pgn => { const h = {}; for (const m of pgn.matchAll(/^\[(\w+)\s+"(.*)"\]\s*$/gm)) h[m[1]] = m[2]; return h; };

const sel = JSON.parse(fs.readFileSync('selected.json', 'utf8'));
const outFile = 'crosscheck3-out.json';
const results = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, 'utf8')) : [];
for (const key of keys) {
  const s = sel.find(x => x.key === key);
  if (!s) { console.error(`unknown key ${key}`); continue; }
  const year = s.date.slice(0, 4);
  const html = await get(`https://www.chessgames.com/perl/ezsearch.pl?search=${surname(s.white)}+${surname(s.black)}+${year}`, b => b.includes('chessgame?gid='));
  const rows = [...html.matchAll(/chessgame\?gid=(\d+)">([^<]*)<\/a>.*?<font[^>]*>(1-0|0-1|1\/2-1\/2)<\/font>.*?<font[^>]*>(\d+)<\/font>.*?<font[^>]*>(\d{4})<\/font>/gs)]
    .map(m => ({ gid: m[1], moves: Number(m[4]), year: m[5], result: m[3] }))
    .filter(r => r.year === year && r.result === s.result)
    .sort((a, b) => Math.abs(a.moves - Math.ceil(s.moves.length / 2)) - Math.abs(b.moves - Math.ceil(s.moves.length / 2)));
  let match = null;
  for (const row of rows.slice(0, 6)) {
    const pgn = await get(`https://www.chessgames.com/perl/nph-chesspgn?text=1&gid=${row.gid}`, b => b.includes('[Event'));
    const { moves } = movesOf(pgn);
    if (!moves) continue;
    if (moves.length === s.moves.length && moves.every((m, i) => m === s.moves[i])) {
      const h = headers(pgn);
      match = { gid: row.gid, event: h.Event, site: h.Site, date: h.Date, white: h.White, black: h.Black, source: h.Source || null };
      break;
    }
  }
  const i = results.findIndex(r => r.key === key);
  const rec = { key, rows: rows.length, match };
  if (i >= 0) results[i] = rec; else results.push(rec);
  fs.writeFileSync(outFile, JSON.stringify(results, null, 1));
  console.error(`${key}: ${match ? 'MATCH gid ' + match.gid : 'NOT FOUND (' + rows.length + ' rows)'}`);
}
