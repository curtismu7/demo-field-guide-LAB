# Demo field guide LAB

Tier: Tool. A JSON-driven card-deck handoff page: each deployment serves its own `data/cards.json` (title, intro, base URL, cards with routes, steps and badges) and the page renders it. Genericized from the AI-DEMO2 personal-agents-handoff page — no baked-in routes, hosts or credentials. Port 7590.
Edit `data/cards.json`, run `npm run build && npm test`. No credentials or usernames on the page, ever (the credentials block renders a "ask your demo owner" note unless a deployment sets `credentialsNote` text — still no secrets). Rules: ~/Development/STANDALONE-RULES.md.
Do not deploy to SE: this is local standalone only (rule 18, Docker only). Tests: `node --test test/*.test.js` (glob, not a directory).
