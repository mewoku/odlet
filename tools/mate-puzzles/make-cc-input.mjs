import fs from 'node:fs';
const sel = JSON.parse(fs.readFileSync('selected.json', 'utf8'));
const out = sel.map(s => ({ key: s.key, white: s.white, black: s.black, year: (s.date || '').slice(0, 4), moves: s.moves }));
fs.writeFileSync('crosscheck-in.json', JSON.stringify(out));
console.log('wrote', out.length);
