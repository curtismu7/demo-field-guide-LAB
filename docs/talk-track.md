# Talk track: Demo field guide LAB

Each `##` heading is one presenter step. This is a Tool-tier handoff page: one static card deck, driven entirely by `data/cards.json`. Nothing here is live against a tenant.

## This is a static page

Open the page and point at the header. There is no backend behind the cards, no login, and no outbound calls — the server only serves a build of `data/cards.json`. The Real toggle is disabled because there is nothing to go real against.

## The deck is the product

Say the idea: every demo surface in one place — what it shows, what to click, and a link straight to the live route. The eyebrow, intro and baseUrl at the top are all from the same JSON file.

## Walk the sections

Scroll the sections in order. Each section is a group of cards for one audience or phase of the handoff. Read the intro line of the section before touching the cards.

## Open a card

Click a card's link. It goes to that demo's route on the deployment's baseUrl. Then come back and show the card again: the `what` line is the one-sentence pitch, and the `steps[]` list is what the colleague does after they arrive.

## Point at the badges

Each card can carry a badge — ok, accent or warn tone. "Verified live" means the route was checked when the deck was built; a warn badge is the deck author flagging something to read first. Badges are data, not magic: they are whatever the deployment set.

## Show how it is edited

The whole page is `data/cards.json`: title, eyebrow, intro, baseUrl, optional `credentialsNote` (prose only), then `sections[].cards[]` with title, route, what, steps, badge. Edit the file, run `npm run build` to validate and render, refresh the page.

## The build is the guard

The build validates the deck and refuses credential-shaped text (anything like `password: ...`) in card content. Say it: the page cannot leak a secret even if someone pastes one into a card.

## No credentials on the page, ever

Point at the credentials block: it renders an "ask your demo owner" note unless the deployment sets `credentialsNote`, and even then the text is prose, never a secret. This is a handoff page, not a key vault.

## Hand it over

The takeaway: a colleague gets one URL, sees every surface with links and first steps, and the owner maintains it by editing one JSON file. Reset is not needed — there is no state; refresh is the whole reset.
