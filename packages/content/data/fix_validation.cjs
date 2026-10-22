const fs = require('fs');
const path = require('path');

const basePath = 'd:/nilaza/packages/content/data';

// 1. Fix tarot-card-designs.json
let designsPath = path.join(basePath, 'tarot-card-designs.json');
let designs = JSON.parse(fs.readFileSync(designsPath, 'utf8'));
designs.forEach(d => {
  if (d.deckId === 'stellar-academy') d.deckId = 'stellar-mosaic';
  if (d.id === 'stellar-academy-design-set') d.id = 'stellar-mosaic-design-set';
});
fs.writeFileSync(designsPath, JSON.stringify(designs, null, 2) + '\n', 'utf8');

// 2. Fix tarot-deck-backs.json
let backsPath = path.join(basePath, 'tarot-deck-backs.json');
let backs = JSON.parse(fs.readFileSync(backsPath, 'utf8'));
backs.forEach(b => {
  if (b.deckId === 'stellar-academy') b.deckId = 'stellar-mosaic';
  if (b.id === 'stellar-academy-back') b.id = 'stellar-mosaic-back';
  if (b.assetPath === 'assets/tarot/deck-backs/stellar-academy.png') b.assetPath = 'assets/tarot/deck-backs/stellar-mosaic.png';
});
fs.writeFileSync(backsPath, JSON.stringify(backs, null, 2) + '\n', 'utf8');

// (stellar-academy-mvp-test-data.json was already fixed and renamed)

// 4. Fix persona-detail-content.json
let detailsPath = path.join(basePath, 'persona-detail-content.json');
let details = JSON.parse(fs.readFileSync(detailsPath, 'utf8'));

const mapping = {
  'book-art-of-war-strategist': 'book-strategic-thinker',
  'book-tao-te-ching-guide': 'book-harmony-guide',
  'book-meditations-stoic': 'book-stoic-journal'
};

details.forEach(d => {
  if (mapping[d.ownerId]) {
    d.ownerId = mapping[d.ownerId];
  }
  // Also update id if it contains the old string
  for (const [oldId, newId] of Object.entries(mapping)) {
    if (d.id.includes(oldId)) {
      d.id = d.id.replace(oldId, newId);
    }
  }
});
fs.writeFileSync(detailsPath, JSON.stringify(details, null, 2) + '\n', 'utf8');

console.log('Fixes applied successfully!');
