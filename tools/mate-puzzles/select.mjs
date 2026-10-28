// Joins the mined candidates (with full move lists) with the solver results and writes the chosen puzzles.
import fs from 'node:fs';

const dir = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const read = f => JSON.parse(fs.readFileSync(dir + f, 'utf8'));
const readLines = f => fs.readFileSync(dir + f, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));

const cands = read('candidates2.json');
const solved = [...read('solved2.json'), ...readLines('solved3sub.json.jsonl'), ...readLines('solved3key.json.jsonl'), ...readLines('solved3reti.json.jsonl')];
const key = r => [r.white, r.black, r.site, r.date, r.k, r.solution.join(' ')].join('|');
const byKey = new Map(cands.map(c => [key(c), c]));
const unique = new Map();
for (const s of solved) if (s.unique) unique.set(key(s), s);

// [white, black, site, k, solution]
const picks = [
  ['Morphy, Paul', 'Duke Karl Count Isouard', 'Paris', 2, 'Qb8+ Nxb8 Rd8#', 'Opera Game'],
  ['Lasker, Emanuel', 'Bird, Henry Edward', 'Liverpool', 2, 'Ng5+ hxg5 Rh1#', null],
  ['Mayet, Carl', 'Anderssen, Adolf', 'Berlin', 2, 'Qh1+ Rxh1 Rxh1#', null],
  ['Tartakower, Saviely', 'Colle, Edgar', 'San Remo', 2, 'Qg2+ Ke1 Rf1#', null],
  ['Anderssen, Adolf', 'Mayet, Carl', 'Berlin', 2, 'Nf6+ Ke7 Re8#', null],
  ['Anderssen, Adolf', 'Staunton, Howard', 'London', 2, 'Qg7+ Kxe6 Qe7#', null],
  ['Staunton, Howard', 'Williams, Elijah', 'London', 3, 'Nh2+ Ke1 Nf3+ Kf1 Rf2#', null],
  ['Harrwitz, Daniel', 'Anderssen, Adolf', 'Breslau', 3, 'Nf6+ Kg7 Qxh7+ Kxf6 Ng4#', null],
  ['Euwe, Max', 'Reti, Richard', 'Amsterdam', 3, 'Rd7+ Ka8 Nxb6+ Kb8 Bd6#', null],
  ['Anderssen, Adolf', 'Kolisch, Ignatz', 'Paris', 3, 'Rd3+ Ke2 Qd1+ Kf2 Rf3#', null],
  ['Anderssen, Adolf', 'Dufresne, Jean', 'Berlin', 3, 'Bf5+ Ke8 Bd7+ Kf8 Bxe7#', 'Evergreen Game'],
  ['Steinitz, William', 'Mongredien, Augustus', 'London', 3, 'Qxg6+ Kd8 Rf8+ Qe8 Qxe8#', null],
  ['Anderssen, Adolf', 'Kieseritzky, Lionel', 'London', 3, 'Nxg7+ Kd8 Qf6+ Nxf6 Be7#', 'Immortal Game'],
  ['Reti, Richard', 'Tartakower, Saviely', 'Vienna', 3, 'Qd8+ Kxd8 Bg5+ Kc7 Bd8#', null],

  // second batch (2026-10-18): more real games so the 25 adventure fights need no repeats
  ['Capablanca, Jose Raul', 'Marshall, Frank James', 'New York', 2, 'R5g6+ Kh5 g4#', null],
  ['Greenblatt Programm', 'Fischer, Robert James', 'Cambridge', 2, 'Rf1+ Nxf1 Qd1#', null],
  ['Nimzowitsch, Aaron', 'Tarrasch, Siegbert', 'St Petersburg', 2, 'Re8+ Kd7 Bb5#', null],
  ['Nimzowitsch, Aaron', 'Alapin, Simon', 'St Petersburg', 2, 'Qd8+ Bxd8 Re8#', null],
  ['Pillsbury, Harry Nelson', 'Maroczy, Geza', 'Paris', 2, 'Qxh7+ Kxh7 Kg2#', null],
  ['Zukertort, Johannes Hermann', 'Winawer, Szymon', 'Paris', 2, 'Rh8+ Bxh8 Qxh8#', null],
  ['Marco, Georg', 'Tarrasch, Siegbert', 'Hastings', 2, 'Qh4+ Kg2 Qh2#', null],
  ['Marshall, Frank James', 'Bogoljubow, Efim', 'New York', 2, 'Bd3+ Kxa4 Qc2#', null],
  ['Bird, Henry Edward', 'De Riviere, Jules Arnous', 'London', 2, 'Rg8+ Kh5 g4#', null],
  ['Tarrasch, Siegbert', 'Walbrodt, Carl August', 'Leipzig', 2, 'Qh7+ Ke8 Rg8#', null],
  ['Mason, James', 'Lasker, Emanuel', 'London', 2, 'Qc3+ Rb3 Ra7#', null],
  ['Mason, James', 'Chigorin, Mikhail', 'Paris', 2, 'Ra3+ Rxa3 Qb2#', null],
  ['Zukertort, Johannes Hermann', 'Anderssen, Adolf', 'Breslau', 2, 'Ba5+ Qxa5 Qe7#', null],
  ['Morphy, Paul', 'Jefferson, BT.', 'New York', 3, 'Ng6+ Kg8 Qf8+ Rxf8 Ne7#', null],
  ['Blackburne, Joseph Henry', 'Steinitz, William', 'London', 3, 'Qh6+ Kg8 Rf8+ Qxf8 Qxh7#', null],
  ['Mac Connel, James', 'Morphy, Paul', 'New Orleans', 3, 'Nh3+ Kh1 Qg1+ Rxg1 Nf2#', null],
  ['Morphy, Paul', 'Morphy, Alonzo', 'New Orleans', 3, 'Bxf7+ Kh7 Qg6+ Kh8 Qh6#', null],
  ['Anderssen, Adolf', 'Suhle, Berthold', 'Breslau', 3, 'Rg8+ Kxg8 Rg1+ Qg5 Rxg5#', null],
  ['Hamppe, Carl', 'Steinitz, William', 'Vienna', 3, 'Qd2+ Kb1 Qd1+ Rxd1 Rxd1#', null],
  ['Steinitz, William', 'Rosenthal, Samuel', 'London', 3, 'f2+ Kxf2 Qg2+ Ke3 Qf3#', null],
  ['Meek, Alexander Beaufort', 'Morphy, Paul', 'New Orleans', 3, 'Qg4+ Kh1 Qh3+ Kg1 Nf3#', null],
  ['Anderssen, Adolf', 'Schallopp, Emil', 'Altona', 3, 'Qf6+ Kg8 Re8+ Qf8 Ne7#', null],
  ['Lasker, Emanuel', 'Breyer, Gyula', 'Budapest', 3, 'Qg5+ Kh2 Qh4+ Kg2 Qh3#', null],
  ['Morphy, Paul', 'Maurian, Charles Amedee', 'New Orleans', 3, 'Rc6+ Ka5 Bd2+ Ka4 Ra6#', null],
  ['Steinitz, William', 'Lange, Max', 'Vienna', 3, 'Rf4+ Kd3 Rd1+ Kc2 Rf2#', null],
];

const out = [];
for (const [w, b, site, k, sol, title] of picks) {
  const matches = [...unique.values()].filter(u => u.white.trim() === w && u.black.trim() === b && u.site.trim() === site && u.k === k && u.solution.join(' ') === sol);
  // the same game appears in several collections: keep one per distinct game (same full move list)
  const distinct = new Map(matches.map(m => [byKey.get(key(m)).moves.join(' '), m]));
  if (distinct.size !== 1) { console.error(`PICK PROBLEM ${w} - ${b} ${site} k=${k}: ${distinct.size} distinct unique games`); continue; }
  const u = [...distinct.values()][0];
  const full = byKey.get(key(u));
  out.push({ key: `${w}|${b}|${site}|${k}`, title, ...full, steps: u.steps });
}
fs.writeFileSync(dir + 'selected.json', JSON.stringify(out));
console.log(`selected ${out.length} of ${picks.length}`);

