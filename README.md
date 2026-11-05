# demo-field-guide-LAB

Tier: Tool. A JSON-driven card-deck handoff page for the demo family: each deployment serves its own `data/cards.json` (title, intro, base URL, sections, cards) and the page renders it. Genericized from the AI-DEMO2 personal-agents-handoff page — no baked-in routes, hosts, or credentials.

## Run

```bash
npm run build          # validate deck + render dist/
npm test               # node --test test/*.test.js
npm start              # http://127.0.0.1:7590 (loopback only)
npm run doctor         # rebuild + consistency checks
docker compose up -d --build
```

## Edit the deck

`data/cards.json`: set `title`, `eyebrow`, `intro`, `baseUrl` (the deployment's demo origin), optional `credentialsNote` (prose only — never a secret), and `sections[].cards[]`. Each card: `title`, `route`, `what`, optional `steps[]`, optional `badge` + `badgeTone` (`ok`|`accent`|`warn`). The build validates and refuses credential-shaped text (`password: …`) in card content.

## Rules notes

- Mock-only by nature (a static page); `POST /api/mode` answers 409 and the header toggle shows Real disabled, per rule 19.
- Loopback-only bind, host check, GET/HEAD (+ the 409 POST route) only, zero outbound calls, no dependencies.
- Port 7590. Docker publishes `127.0.0.1:7590` only; the in-container server binds `0.0.0.0` so the Docker proxy can reach it.
- Tests: `node --test test/*.test.js` (glob, not a directory).
