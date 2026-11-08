// Build: validate data/cards.json and render dist/index.html from web/template.html.
// No dependencies, no network. Fails loudly on an invalid deck.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

export function validateDeck(deck) {
  const errors = [];
  if (!deck || typeof deck !== 'object') return ['deck must be an object'];
  for (const key of ['title', 'baseUrl', 'sections']) {
    if (!deck[key]) errors.push(`missing "${key}"`);
  }
  if (!Array.isArray(deck.sections) || deck.sections.length === 0) {
    errors.push('"sections" must be a non-empty array');
    return errors;
  }
  const seenRoutes = new Set();
  deck.sections.forEach((s, si) => {
    if (!s.id || !s.name) errors.push(`section ${si}: missing "id" or "name"`);
    if (!Array.isArray(s.cards) || s.cards.length === 0) {
      errors.push(`section ${si} (${s.id}): must have at least one card`);
      return;
    }
    s.cards.forEach((c, ci) => {
      if (!c.title) errors.push(`section ${si} card ${ci}: missing "title"`);
      if (!c.route) errors.push(`section ${si} card ${ci} (${c.title}): missing "route"`);
      else if (seenRoutes.has(c.route)) errors.push(`duplicate route: ${c.route}`);
      else seenRoutes.add(c.route);
      if (!c.what) errors.push(`section ${si} card ${ci} (${c.title}): missing "what"`);
      if (c.badgeTone && !['ok', 'accent', 'warn'].includes(c.badgeTone)) {
        errors.push(`section ${si} card ${ci}: badgeTone must be ok|accent|warn`);
      }
      if (c.steps && !Array.isArray(c.steps)) errors.push(`section ${si} card ${ci}: "steps" must be an array`);
      // secret leak guard: a card step or description must not look like a credential assignment
      for (const field of ['what', ...(c.steps ?? [])]) {
        if (/\b(password|passwd|pwd)\b\s*[:=]/i.test(field)) {
          errors.push(`section ${si} card ${ci} (${c.title}): possible credential in text — never put passwords in cards`);
        }
      }
    });
  });
  return errors;
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

export function render(deck) {
  const template = fs.readFileSync(path.join(root, 'web', 'template.html'), 'utf8');
  const sectionsHtml = deck.sections.map((s) => {
    const cards = s.cards.map((c) => {
      const badge = c.badge ? `<span class="badge ${c.badgeTone ?? 'accent'}">${escapeHtml(c.badge)}</span>` : '';
      const steps = c.steps?.length
        ? `<ul class="steps">${c.steps.map((st) => `<li>${escapeHtml(st)}</li>`).join('')}</ul>`
        : '';
      const url = deck.baseUrl.replace(/\/$/, '') + c.route;
      return `        <div class="card">
          <div class="card-top"><h3>${escapeHtml(c.title)}</h3>${badge}</div>
          <p class="route">${escapeHtml(c.route)}</p>
          <p>${escapeHtml(c.what)}</p>
          ${steps}
          <div class="btnrow"><a class="run" href="${escapeHtml(url)}" target="_blank" rel="noopener">Open ${escapeHtml(c.route)} &rarr;</a></div>
        </div>`;
    }).join('\n');
    const count = s.cards.length;
    return `      <section id="${escapeHtml(s.id)}">
        <h2>${escapeHtml(s.name)}</h2>
        ${s.note ? `<p class="sec-note">${escapeHtml(s.note)}</p>` : ''}
${cards}
      </section>`;
  }).join('\n');
  const nav = deck.sections.map((s) => `<a href="#${escapeHtml(s.id)}">${escapeHtml(s.name)} <span class="count">${s.cards.length}</span></a>`).join('\n        ');
  return template
    .replaceAll('__TITLE__', escapeHtml(deck.title))
    .replaceAll('__EYEBROW__', escapeHtml(deck.eyebrow ?? 'Demo handoff'))
    .replaceAll('__INTRO__', escapeHtml(deck.intro ?? ''))
    .replaceAll('__CREDENTIALS_NOTE__', escapeHtml(deck.credentialsNote ?? 'Sign-in credentials are not published on this page. Ask the demo owner who sent you here.'))
    .replaceAll('__NAV__', nav)
    .replaceAll('__SECTIONS__', sectionsHtml);
}

export function build() {
  const deck = JSON.parse(fs.readFileSync(path.join(root, 'data', 'cards.json'), 'utf8'));
  const errors = validateDeck(deck);
  if (errors.length) {
    for (const e of errors) console.error(`cards.json: ${e}`);
    throw new Error(`${errors.length} deck validation error(s)`);
  }
  fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
  fs.writeFileSync(path.join(root, 'dist', 'index.html'), render(deck));
  fs.copyFileSync(path.join(root, 'web', 'styles.css'), path.join(root, 'dist', 'styles.css'));
  for (const f of ['theme-init.js', 'theme.js', 'shelf.js']) fs.copyFileSync(path.join(root, 'web', f), path.join(root, 'dist', f));
  const cards = deck.sections.reduce((n, s) => n + s.cards.length, 0);
  console.log(`built dist/index.html: ${deck.sections.length} sections, ${cards} cards, baseUrl ${deck.baseUrl}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) build();
