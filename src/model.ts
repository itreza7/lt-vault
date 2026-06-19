/**
 * model — the decrypted vault data model (schema v2).
 *
 * v1 stored a flat `Record<name, { value, note? }>`. v2 stores typed items
 * (Login / Card / Secure Note / Identity / Password) so the app can offer
 * 1Password-style categories, search, favorites, generator and health audit.
 *
 * This module is pure data + helpers. It NEVER imports crypto, storage, React,
 * or anything with side effects, so it is safe to use from any layer. IDs use
 * the secure RNG polyfill (react-native-get-random-values is installed at the
 * crypto entry point); we never use Math.random for anything identity-bearing.
 */

/* Item categories ---------------------------------------------------------- */
export type ItemType = 'login' | 'password' | 'card' | 'note' | 'identity';

export const ITEM_TYPES: ItemType[] = [
  'login',
  'password',
  'card',
  'note',
  'identity',
];

/** Human label for a category. */
export const TYPE_LABEL: Record<ItemType, string> = {
  login: 'Login',
  password: 'Password',
  card: 'Card',
  note: 'Secure Note',
  identity: 'Identity',
};

/** Plural label for section headers. */
export const TYPE_LABEL_PLURAL: Record<ItemType, string> = {
  login: 'Logins',
  password: 'Passwords',
  card: 'Cards',
  note: 'Secure Notes',
  identity: 'Identities',
};

/**
 * Well-known field keys per category, in display/edit order. The editor renders
 * one input per key; `secret` fields are masked + revealable, `mono` fields use
 * the monospace face, `multiline` get a tall input.
 */
export type FieldSpec = {
  key: string;
  label: string;
  secret?: boolean;
  mono?: boolean;
  multiline?: boolean;
  keyboard?: 'default' | 'email-address' | 'number-pad' | 'url' | 'phone-pad';
  placeholder?: string;
};

export const FIELDS: Record<ItemType, FieldSpec[]> = {
  login: [
    { key: 'username', label: 'Username', placeholder: 'name@example.com' },
    { key: 'password', label: 'Password', secret: true, mono: true },
    { key: 'url', label: 'Website', keyboard: 'url', placeholder: 'example.com' },
    {
      key: 'totp',
      label: 'One-time code secret',
      secret: true,
      mono: true,
      placeholder: 'Base32 secret from the 2FA setup screen',
    },
  ],
  password: [{ key: 'value', label: 'Password', secret: true, mono: true }],
  card: [
    { key: 'cardholder', label: 'Cardholder' },
    { key: 'number', label: 'Card number', mono: true, keyboard: 'number-pad' },
    { key: 'expiry', label: 'Expires', placeholder: 'MM / YY' },
    { key: 'cvv', label: 'Security code', secret: true, mono: true, keyboard: 'number-pad' },
  ],
  note: [{ key: 'body', label: 'Note', multiline: true }],
  identity: [
    { key: 'fullName', label: 'Full name' },
    { key: 'email', label: 'Email', keyboard: 'email-address' },
    { key: 'phone', label: 'Phone', keyboard: 'phone-pad' },
    { key: 'address', label: 'Address', multiline: true },
  ],
};

/** A user-added custom field on any item. */
export type CustomField = {
  label: string;
  value: string;
  secret?: boolean;
};

/** One stored item. `fields` holds the well-known keys for its type. */
export type Item = {
  id: string;
  type: ItemType;
  title: string;
  favorite: boolean;
  /** Optional user-defined category/folder (e.g. "Work"), distinct from type. */
  category?: string;
  fields: Record<string, string>;
  custom?: CustomField[];
  note?: string; // freeform note available on every type
  createdAt: number;
  updatedAt: number;
};

/** The decrypted vault (schema v2). */
export type Vault = {
  schema: 2;
  items: Item[];
};

/** A fresh, empty v2 vault. */
export function emptyVault(): Vault {
  return { schema: 2, items: [] };
}

/* ID generation ------------------------------------------------------------ */
/**
 * 128-bit random id as lowercase hex. Uses the secure RNG installed by
 * react-native-get-random-values. Falls back to a time-seeded id only if the
 * polyfill is somehow absent, so item creation can never hard-crash.
 */
export function newId(): string {
  const bytes = new Uint8Array(16);
  const g = globalThis as unknown as {
    crypto?: { getRandomValues?<T extends ArrayBufferView>(a: T): T };
  };
  if (g.crypto?.getRandomValues) {
    g.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = (Date.now() + i * 131) & 0xff;
    }
  }
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, '0');
  }
  return out;
}

/* Construction ------------------------------------------------------------- */
export function makeItem(type: ItemType, now: number = Date.now()): Item {
  return {
    id: newId(),
    type,
    title: '',
    favorite: false,
    fields: {},
    note: '',
    createdAt: now,
    updatedAt: now,
  };
}

/* Display helpers ---------------------------------------------------------- */

/** The secondary line shown under an item title in the list. */
export function subtitleFor(item: Item): string {
  switch (item.type) {
    case 'login':
      return item.fields.username || item.fields.url || 'Login';
    case 'password':
      return 'Password';
    case 'card': {
      const n = (item.fields.number || '').replace(/\s+/g, '');
      return n ? `•••• ${n.slice(-4)}` : 'Card';
    }
    case 'note': {
      const body = item.fields.body || item.note || '';
      const firstLine = body.split('\n')[0].trim();
      return firstLine || 'Secure note';
    }
    case 'identity':
      return item.fields.email || item.fields.fullName || 'Identity';
    default:
      return '';
  }
}

/** Distinct user categories across the vault, case-insensitive, sorted. */
export function categoriesOf(items: Item[]): string[] {
  const seen = new Map<string, string>(); // lowercase → original casing
  for (const it of items) {
    const c = it.category?.trim();
    if (c && !seen.has(c.toLowerCase())) {
      seen.set(c.toLowerCase(), c);
    }
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

/** The primary "password material" of an item, for copy + health audit. */
export function passwordOf(item: Item): string | null {
  if (item.type === 'login') {
    return item.fields.password || null;
  }
  if (item.type === 'password') {
    return item.fields.value || null;
  }
  return null;
}

/* Migration ---------------------------------------------------------------- */

/** Legacy v1 shape: a flat map of name → { value, note? }. */
export type LegacyV1 = Record<string, { value: string; note?: string }>;

/**
 * Promote any decrypted payload to a v2 Vault. Accepts:
 *  - a real v2 Vault (returned as-is, items normalized)
 *  - a legacy v1 Record (each entry becomes a `password` item)
 *  - anything else (treated as an empty vault — fail safe, never throw)
 */
export function toVault(parsed: unknown, now: number = Date.now()): Vault {
  if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;
    if (obj.schema === 2 && Array.isArray(obj.items)) {
      return { schema: 2, items: (obj.items as Item[]).map(normalizeItem) };
    }
    // Legacy v1: a flat record of name → { value, note? }.
    const items: Item[] = [];
    for (const [name, raw] of Object.entries(obj)) {
      if (raw && typeof raw === 'object' && 'value' in (raw as object)) {
        const v = raw as { value: string; note?: string };
        items.push({
          id: newId(),
          type: 'password',
          title: name,
          favorite: false,
          fields: { value: String(v.value ?? '') },
          note: v.note ? String(v.note) : '',
          createdAt: now,
          updatedAt: now,
        });
      }
    }
    return { schema: 2, items };
  }
  return emptyVault();
}

/** Defensively fill in any missing fields on an item loaded from disk. */
function normalizeItem(raw: Item): Item {
  const now = Date.now();
  return {
    id: raw.id || newId(),
    type: ITEM_TYPES.includes(raw.type) ? raw.type : 'password',
    title: typeof raw.title === 'string' ? raw.title : '',
    favorite: !!raw.favorite,
    category:
      typeof raw.category === 'string' && raw.category.trim()
        ? raw.category.trim()
        : undefined,
    fields: raw.fields && typeof raw.fields === 'object' ? raw.fields : {},
    custom: Array.isArray(raw.custom) ? raw.custom : undefined,
    note: typeof raw.note === 'string' ? raw.note : '',
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : now,
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : now,
  };
}
