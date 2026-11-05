// Doctor: verify the lab is complete and consistent.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateDeck } from './build.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let fail = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) fail++;
};

check('data/cards.json exists', fs.existsSync(path.join(root, 'data', 'cards.json')));
check('web/template.html exists', fs.existsSync(path.join(root, 'web', 'template.html')));
check('web/styles.css exists', fs.existsSync(path.join(root, 'web', 'styles.css')));
check('dist/index.html built', fs.existsSync(path.join(root, 'dist', 'index.html')), fs.existsSync(path.join(root, 'dist', 'index.html')) ? '' : 'run npm run build');

try {
  const deck = JSON.parse(fs.readFileSync(path.join(root, 'data', 'cards.json'), 'utf8'));
  const errors = validateDeck(deck);
  check('deck validates', errors.length === 0, errors.join('; '));
  const cards = deck.sections.reduce((n, s) => n + s.cards.length, 0);
  check('deck has cards', cards > 0, `${cards} cards in ${deck.sections.length} sections`);
  check('baseUrl set', typeof deck.baseUrl === 'string' && deck.baseUrl.length > 0, deck.baseUrl);
  const noSecrets = JSON.stringify(deck);
  check('no credential-shaped text', !/\b(password|passwd|pwd)\b\s*[:=]\s*["']?\w/i.test(noSecrets));
} catch (e) {
  check('cards.json parses', false, e.message);
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
check('test script uses glob', /test\/\*\.test\.js/.test(pkg.scripts.test ?? ''));

process.exit(fail ? 1 : 0);
