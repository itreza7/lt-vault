// src/passwordGen.ts
// Secure password + passphrase generation and a strength scorer.
// SECURITY: every random value here comes from the platform CSPRNG via
// crypto.getRandomValues. Math.random is never used — it is not cryptographically
// secure and would make generated secrets predictable.

import 'react-native-get-random-values';

export type GenOptions = {
  length: number;
  lowercase: boolean;
  uppercase: boolean;
  digits: boolean;
  symbols: boolean;
  avoidAmbiguous: boolean;
};

export const DEFAULT_GEN_OPTIONS: GenOptions = {
  length: 20,
  lowercase: true,
  uppercase: true,
  digits: true,
  symbols: true,
  avoidAmbiguous: false,
};

export type PassphraseOptions = {
  words: number;
  separator: string;
  capitalize: boolean;
  includeNumber: boolean;
};

export const DEFAULT_PASSPHRASE_OPTIONS: PassphraseOptions = {
  words: 4,
  separator: '-',
  capitalize: true,
  includeNumber: true,
};

// --- character classes -------------------------------------------------------

const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGITS = '0123456789';
const SYMBOLS = '!@#$%^&*()-_=+[]{};:,.?';

// Look-alike characters removed when avoidAmbiguous is set.
const AMBIGUOUS = new Set(['I', 'l', '1', 'O', '0', 'o']);

function stripAmbiguous(set: string): string {
  let out = '';
  for (const ch of set) {
    if (!AMBIGUOUS.has(ch)) {
      out += ch;
    }
  }
  return out;
}

// --- secure RNG helpers ------------------------------------------------------

function randomBytes(n: number): Uint8Array {
  const buf = new Uint8Array(n);
  (globalThis as any).crypto.getRandomValues(buf);
  return buf;
}

// Uniform integer in [0, range) using rejection sampling to avoid modulo bias.
// A raw byte is 0..255; if we naively took `byte % range`, the low residues
// would be slightly more likely whenever 256 is not a multiple of range. We
// therefore reject any byte at or above the largest multiple of `range` that
// fits in a byte (`limit`), and only then reduce modulo `range`.
function randomInt(range: number): number {
  if (range <= 0) {
    return 0;
  }
  if (range === 1) {
    return 0;
  }
  const limit = Math.floor(256 / range) * range;
  // Loop until we draw a byte inside the unbiased window.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const byte = randomBytes(1)[0];
    if (byte < limit) {
      return byte % range;
    }
  }
}

function pick(set: string): string {
  return set[randomInt(set.length)];
}

// In-place Fisher–Yates shuffle driven by the secure RNG.
function secureShuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
}

// --- password generation -----------------------------------------------------

function clampLength(n: number): number {
  if (!Number.isFinite(n)) {
    return 4;
  }
  const i = Math.floor(n);
  if (i < 4) {
    return 4;
  }
  if (i > 64) {
    return 64;
  }
  return i;
}

export function generatePassword(opts: GenOptions): string {
  const length = clampLength(opts.length);

  // Resolve each enabled class, applying ambiguity filtering.
  const classes: string[] = [];
  if (opts.lowercase) {
    classes.push(opts.avoidAmbiguous ? stripAmbiguous(LOWER) : LOWER);
  }
  if (opts.uppercase) {
    classes.push(opts.avoidAmbiguous ? stripAmbiguous(UPPER) : UPPER);
  }
  if (opts.digits) {
    classes.push(opts.avoidAmbiguous ? stripAmbiguous(DIGITS) : DIGITS);
  }
  if (opts.symbols) {
    classes.push(opts.avoidAmbiguous ? stripAmbiguous(SYMBOLS) : SYMBOLS);
  }

  // No class enabled → fall back to lowercase + digits.
  let activeClasses = classes;
  if (activeClasses.length === 0) {
    const fallbackLower = opts.avoidAmbiguous ? stripAmbiguous(LOWER) : LOWER;
    const fallbackDigits = opts.avoidAmbiguous ? stripAmbiguous(DIGITS) : DIGITS;
    activeClasses = [fallbackLower, fallbackDigits];
  }

  // Guarantee at least one char from each enabled class.
  const chars: string[] = [];
  for (const cls of activeClasses) {
    chars.push(pick(cls));
  }

  // Fill the remainder from the combined alphabet.
  const alphabet = activeClasses.join('');
  while (chars.length < length) {
    chars.push(pick(alphabet));
  }

  // If guaranteed chars already exceed the (clamped) length, trim to fit.
  if (chars.length > length) {
    chars.length = length;
  }

  // Shuffle so the guaranteed characters are not always in front.
  secureShuffle(chars);

  return chars.join('');
}

// UUID-style: random chars grouped 8-4-4-4-12 with hyphen separators. Symbols
// are allowed *inside* the groups but the hyphen is reserved as the separator.
const UUID_GROUPS = [8, 4, 4, 4, 12];

export function generateUuidPassword(opts: GenOptions): string {
  const classes: string[] = [];
  if (opts.lowercase) {
    classes.push(opts.avoidAmbiguous ? stripAmbiguous(LOWER) : LOWER);
  }
  if (opts.uppercase) {
    classes.push(opts.avoidAmbiguous ? stripAmbiguous(UPPER) : UPPER);
  }
  if (opts.digits) {
    classes.push(opts.avoidAmbiguous ? stripAmbiguous(DIGITS) : DIGITS);
  }
  if (opts.symbols) {
    // Drop the hyphen — it separates the groups.
    const sym = (opts.avoidAmbiguous ? stripAmbiguous(SYMBOLS) : SYMBOLS).replace(/-/g, '');
    classes.push(sym);
  }

  let activeClasses = classes;
  if (activeClasses.length === 0) {
    activeClasses = [opts.avoidAmbiguous ? stripAmbiguous(LOWER) : LOWER, DIGITS];
  }

  const total = UUID_GROUPS.reduce((a, b) => a + b, 0); // 32
  const chars: string[] = [];
  for (const cls of activeClasses) {
    chars.push(pick(cls)); // guarantee one per enabled class
  }
  const alphabet = activeClasses.join('');
  while (chars.length < total) {
    chars.push(pick(alphabet));
  }
  if (chars.length > total) {
    chars.length = total;
  }
  secureShuffle(chars);

  const out: string[] = [];
  let i = 0;
  for (const g of UUID_GROUPS) {
    out.push(chars.slice(i, i + g).join(''));
    i += g;
  }
  return out.join('-');
}

// --- passphrase generation ---------------------------------------------------

// Embedded wordlist: short, common, unambiguous English words (nouns/verbs).
const WORDS: string[] = [
  'able', 'acid', 'acre', 'aged', 'army', 'atom', 'aunt', 'away', 'baby', 'back',
  'bake', 'ball', 'band', 'bank', 'barn', 'base', 'bath', 'beam', 'bean', 'bear',
  'beat', 'beef', 'bell', 'belt', 'bend', 'best', 'bike', 'bird', 'bite', 'blue',
  'boat', 'body', 'bold', 'bolt', 'bone', 'book', 'boot', 'born', 'boss', 'both',
  'bowl', 'brave', 'bread', 'brick', 'bring', 'broom', 'brush', 'bulb', 'bull', 'bush',
  'busy', 'cabin', 'cage', 'cake', 'calm', 'camp', 'cane', 'card', 'care', 'cart',
  'case', 'cash', 'cast', 'cave', 'cell', 'chair', 'chalk', 'charm', 'cheek', 'chess',
  'chest', 'chief', 'chin', 'city', 'clam', 'clap', 'claw', 'clay', 'clean', 'clear',
  'clerk', 'click', 'cliff', 'climb', 'clock', 'cloth', 'cloud', 'club', 'coach', 'coal',
  'coast', 'coat', 'code', 'coin', 'cold', 'color', 'comb', 'cook', 'cool', 'copy',
  'cork', 'corn', 'cost', 'couch', 'cove', 'crab', 'crane', 'crash', 'cream', 'crew',
  'crop', 'cube', 'curl', 'curve', 'daisy', 'dance', 'dark', 'dart', 'dawn', 'deal',
  'deep', 'deer', 'desk', 'dial', 'dice', 'dirt', 'dish', 'dive', 'dock', 'door',
  'dove', 'drag', 'draw', 'dream', 'dress', 'drift', 'drink', 'drive', 'drop', 'drum',
  'duck', 'dune', 'dust', 'eagle', 'earn', 'east', 'easy', 'edge', 'eggs', 'envy',
  'face', 'fair', 'fall', 'farm', 'fast', 'fawn', 'fear', 'feast', 'feed', 'feet',
  'fern', 'film', 'fire', 'fish', 'fist', 'five', 'flag', 'flame', 'flash', 'flat',
  'flax', 'fleet', 'float', 'flock', 'flour', 'flow', 'fluff', 'flute', 'foam', 'fold',
  'folk', 'food', 'fool', 'foot', 'fork', 'form', 'fort', 'four', 'fram', 'free',
  'frog', 'fruit', 'fuel', 'fund', 'game', 'gate', 'gaze', 'gear', 'gift', 'girl',
  'glad', 'glass', 'glide', 'globe', 'glove', 'glow', 'goal', 'goat', 'gold', 'golf',
  'good', 'grab', 'grain', 'grant', 'grape', 'grass', 'gray', 'graze', 'green', 'grid',
  'grin', 'grip', 'group', 'grove', 'grow', 'gulf', 'hail', 'hair', 'half', 'hall',
  'hand', 'hang', 'harbor', 'hare', 'harm', 'harp', 'hawk', 'head', 'heal', 'heap',
  'heart', 'heat', 'hedge', 'herd', 'hero', 'hide', 'high', 'hike', 'hill', 'hint',
  'hive', 'hold', 'hole', 'home', 'honey', 'hood', 'hook', 'hope', 'horn', 'horse',
  'hose', 'host', 'hour', 'house', 'human', 'hunt', 'hurry', 'icon', 'idea', 'iron',
  'isle', 'item', 'ivory', 'jade', 'jail', 'jazz', 'jeep', 'jewel', 'join', 'joke',
  'judge', 'juice', 'jump', 'keen', 'keep', 'kept', 'kind', 'king', 'kiss', 'kite',
  'knee', 'knife', 'knot', 'know', 'lace', 'lake', 'lamb', 'lamp', 'land', 'lane',
  'large', 'lark', 'lawn', 'leaf', 'leap', 'left', 'lemon', 'lend', 'lens', 'lift',
  'light', 'lily', 'lime', 'line', 'link', 'lion', 'list', 'load', 'loaf', 'loan',
  'lock', 'loft', 'long', 'look', 'loop', 'lord', 'loud', 'love', 'luck', 'lump',
  'lunch', 'lung', 'mace', 'maze', 'meal', 'meat', 'melt', 'menu', 'mesh', 'metal',
  'mild', 'mile', 'milk', 'mill', 'mind', 'mine', 'mint', 'mist', 'moat', 'mold',
  'monk', 'moon', 'moss', 'most', 'moth', 'move', 'mule', 'music', 'nail', 'name',
  'navy', 'near', 'neat', 'neck', 'nest', 'news', 'next', 'nice', 'nine', 'node',
  'noon', 'north', 'nose', 'note', 'oats', 'ocean', 'olive', 'open', 'oval', 'oven',
  'pace', 'pack', 'page', 'pail', 'pain', 'pair', 'palm', 'pant', 'park', 'part',
  'past', 'path', 'peace', 'peak', 'pear', 'peer', 'pest', 'pick', 'pier', 'pike',
  'pile', 'pine', 'pink', 'pint', 'pipe', 'plan', 'plant', 'plate', 'play', 'plug',
  'plum', 'pole', 'pond', 'pony', 'pool', 'pork', 'port', 'post', 'pour', 'press',
  'price', 'pride', 'print', 'prize', 'pull', 'pump', 'punch', 'pure', 'push', 'queen',
  'quest', 'quick', 'quiet', 'quill', 'quilt', 'race', 'rack', 'raft', 'rail', 'rain',
  'rake', 'ramp', 'ranch', 'rank', 'rare', 'rate', 'read', 'real', 'reef', 'rest',
  'rice', 'rich', 'ride', 'ring', 'ripe', 'rise', 'risk', 'road', 'roar', 'robe',
  'rock', 'roof', 'room', 'root', 'rope', 'rose', 'ruby', 'rule', 'rush', 'rust',
  'sack', 'safe', 'sage', 'sail', 'salt', 'sand', 'save', 'scale', 'scarf', 'scene',
  'scout', 'seal', 'seat', 'seed', 'sell', 'send', 'shade', 'shape', 'share', 'shark',
  'sharp', 'sheep', 'sheet', 'shelf', 'shell', 'shine', 'ship', 'shirt', 'shoe', 'shop',
  'shore', 'short', 'shout', 'show', 'sign', 'silk', 'sing', 'sink', 'site', 'size',
  'skate', 'sketch', 'skin', 'skip', 'sky', 'slab', 'sled', 'sleep', 'slice', 'slide',
  'slope', 'slot', 'slow', 'small', 'smart', 'smile', 'smoke', 'snail', 'snake', 'snow',
  'soap', 'sock', 'soft', 'soil', 'song', 'soup', 'sour', 'space', 'spade', 'spark',
  'spear', 'spell', 'spice', 'spin', 'spire', 'spoon', 'sport', 'spot', 'spray', 'spring',
  'sprout', 'stack', 'staff', 'stage', 'stair', 'stamp', 'star', 'stark', 'start', 'steam',
  'steel', 'stem', 'step', 'stick', 'stiff', 'still', 'stock', 'stone', 'stool', 'stop',
  'store', 'storm', 'stove', 'straw', 'stream', 'street', 'strong', 'study', 'sugar', 'suit',
  'sunny', 'surf', 'swan', 'swarm', 'sweep', 'sweet', 'swift', 'swim', 'sword', 'table',
  'tail', 'tale', 'tank', 'tape', 'task', 'team', 'tear', 'tent', 'test', 'text',
  'thaw', 'theme', 'thick', 'thin', 'thorn', 'three', 'throne', 'thumb', 'tide', 'tiger',
  'tile', 'time', 'tiny', 'tire', 'toad', 'toast', 'tone', 'tool', 'tooth', 'torch',
  'tower', 'town', 'toy', 'track', 'trade', 'trail', 'train', 'trap', 'tray', 'treat',
  'tree', 'trend', 'trick', 'trim', 'trip', 'trout', 'truck', 'true', 'trunk', 'trust',
  'tube', 'tulip', 'tuna', 'tune', 'turn', 'twig', 'twin', 'unit', 'urge', 'used',
  'vain', 'vale', 'vane', 'vase', 'vast', 'veil', 'verse', 'vest', 'view', 'vine',
  'visit', 'voice', 'vote', 'wade', 'wage', 'wagon', 'wake', 'walk', 'wall', 'wand',
  'want', 'ward', 'warm', 'wash', 'wave', 'weak', 'wear', 'weave', 'week', 'well',
  'west', 'whale', 'wheat', 'wheel', 'whip', 'white', 'wide', 'wild', 'wind', 'wine',
  'wing', 'wink', 'wire', 'wise', 'wish', 'wolf', 'wood', 'wool', 'word', 'work',
  'worm', 'wrap', 'wren', 'wrist', 'yard', 'yarn', 'year', 'yeast', 'zeal', 'zero', 'zone',
];

function titleCase(word: string): string {
  if (word.length === 0) {
    return word;
  }
  return word.charAt(0).toUpperCase() + word.slice(1);
}

export function generatePassphrase(opts: PassphraseOptions): string {
  const count = Number.isFinite(opts.words) ? Math.max(1, Math.floor(opts.words)) : 1;

  const chosen: string[] = [];
  for (let i = 0; i < count; i++) {
    let word = WORDS[randomInt(WORDS.length)];
    if (opts.capitalize) {
      word = titleCase(word);
    }
    chosen.push(word);
  }

  if (opts.includeNumber) {
    // Append a random 0..99 to one randomly chosen word.
    const idx = randomInt(chosen.length);
    const num = randomInt(100);
    chosen[idx] = chosen[idx] + String(num);
  }

  return chosen.join(opts.separator);
}

// --- strength scoring --------------------------------------------------------

// Returns 0..4. Combines length thresholds (8/12/16/20) with character-class
// variety. All-one-class and very short passwords are penalized; multiple
// classes earn a bonus. Monotonic enough to feel sensible to a user.
export function scorePassword(pw: string): number {
  if (!pw || pw.length === 0) {
    return 0;
  }

  const len = pw.length;

  let classes = 0;
  if (/[a-z]/.test(pw)) classes++;
  if (/[A-Z]/.test(pw)) classes++;
  if (/[0-9]/.test(pw)) classes++;
  if (/[^a-zA-Z0-9]/.test(pw)) classes++;

  // Very short: cap hard regardless of variety.
  if (len < 8) {
    return classes >= 3 && len >= 6 ? 1 : 0;
  }

  // Length tier: how many thresholds (8/12/16/20) the password meets.
  let lengthTier = 0;
  if (len >= 8) lengthTier++;
  if (len >= 12) lengthTier++;
  if (len >= 16) lengthTier++;
  if (len >= 20) lengthTier++;

  // Variety bonus.
  let varietyBonus = 0;
  if (classes >= 2) varietyBonus++;
  if (classes >= 3) varietyBonus++;

  let score = lengthTier + varietyBonus;

  // Penalize all-one-class even when long.
  if (classes <= 1) {
    score -= 1;
  }

  if (score < 0) score = 0;
  if (score > 4) score = 4;
  return score;
}
