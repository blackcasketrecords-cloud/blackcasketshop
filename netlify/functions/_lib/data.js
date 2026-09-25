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
  'death-metal',
  'other'
];

const GENRE_LABELS = {
  'black-metal': 'Black Metal',
  'doom-metal': 'Doom Metal',
  'metal': 'Metal',
  'dungeon-synth': 'Dungeon Synth',
  'ambient': 'Ambient',
  'comfy-synth': 'Comfy Synth',
  'death-metal': 'Death Metal',
  'other': 'Other'
};

// Sub-brands / side projects a product can belong to. "blackcasket" is the
// default (the main label) rather than leaving the field blank.
const PROJECTS = ['blackcasket', 'ugunsvija', 'mushroom', 'perkona'];

const PROJECT_LABELS = {
  blackcasket: 'Black Casket',
  ugunsvija: 'Ugunsvija',
  mushroom: 'Mushroom Grandpa',
  perkona: 'Perkona Calve'
};

module.exports = { CATEGORIES, CATEGORY_LABELS, GENRES, GENRE_LABELS, PROJECTS, PROJECT_LABELS };
