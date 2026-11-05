// Reset: rebuild dist from data/cards.json. The app is stateless, so a reset is a rebuild.
import { build } from './build.mjs';
build();
console.log('reset complete: dist rebuilt from data/cards.json');
