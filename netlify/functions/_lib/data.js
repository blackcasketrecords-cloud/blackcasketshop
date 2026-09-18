// Shared constants for product categories and genres.
// Keep this list in sync with the admin panel and storefront UI.

const CATEGORIES = ['cd', 'tape', 'vinyl', 'merch', 'bundle', 'other'];

const CATEGORY_LABELS = {
  cd: 'CD',
  tape: 'Tape',
  vinyl: 'Vinyl',
  merch: 'Merch',
  bundle: 'Bundle',
  other: 'Other'
};

const GENRES = [
  'black-metal',
  'doom-metal',
  'metal',
  'dungeon-synth',
  'ambient',
  'comfy-synth',
  'death-metal'
];

const GENRE_LABELS = {
  'black-metal': 'Black Metal',
  'doom-metal': 'Doom Metal',
  'metal': 'Metal',
  'dungeon-synth': 'Dungeon Synth',
  'ambient': 'Ambient',
  'comfy-synth': 'Comfy Synth',
  'death-metal': 'Death Metal'
};

module.exports = { CATEGORIES, CATEGORY_LABELS, GENRES, GENRE_LABELS };
