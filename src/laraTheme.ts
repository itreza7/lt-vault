/**
 * laraTheme — design tokens for the Larateam "faithful" visual identity.
 *
 * This is the blue/violet, light-surface direction from the design handoff
 * (designs/.../README.md). It deliberately departs from the strongbox theme in
 * ./theme.ts — the user explicitly chose to reproduce the handoff precisely for
 * the redesigned screens. Keep every hex here; screens import from this module
 * and never hard-code colors.
 *
 * Typeface: the handoff's Plus Jakarta Sans + JetBrains Mono, bundled from
 * assets/fonts (see react-native.config.js). On Android the family name is the
 * .ttf basename; both are variable fonts so a single file covers every weight.
 */

/* Colors ------------------------------------------------------------------- */
export const lc = {
  // Brand
  primary: '#2563eb', // primary buttons, active tab, links
  secondary: '#7c3aed', // gradient end
  accent: '#a855f7', // tertiary accent

  // Surfaces
  appBg: '#f8fafc', // every in-app screen background
  card: '#ffffff', // cards, rows, inputs
  ink: '#0f172a', // dark surfaces (generator card, toast) + primary text

  // Hairlines
  border: '#e2e8f0', // input / strong hairline
  borderSoft: '#e9eef5', // search field / chip border
  borderFaint: '#eef2f7', // card border
  divider: '#f1f5f9', // list-row divider

  // Text
  text: '#0f172a', // primary
  textSub: '#64748b', // subtitles
  textMuted: '#94a3b8', // meta, placeholders, idle tab
  slate: '#475569', // chip idle text, footer note
  chevron: '#cbd5e1', // row chevron

  // Status
  success: '#059669',
  successAlt: '#10b981',
  successBright: '#34d399',
  warning: '#f59e0b', // weak-password dot
  danger: '#ef4444', // reused
  dangerAlt: '#e11d48', // breach / lock-vault

  white: '#ffffff',

  // Tint backgrounds for icon chips
  tintBlue: '#eff6ff',
  tintViolet: '#f3e8ff',
  tintGreen: '#ecfdf5',
  tintAmber: '#fffbeb',
  tintRed: '#fef2f2',
  tintRose: '#fff1f2',
} as const;

/** Brand gradient stops — rendered via SVG (no gradient lib installed). */
export const gradient = {
  from: lc.primary, // #2563eb
  to: lc.secondary, // #7c3aed
  // 135deg ≈ top-left → bottom-right
  x1: '0%',
  y1: '0%',
  x2: '100%',
  y2: '100%',
} as const;

/**
 * Letter-avatar palette for vault rows. The handoff uses per-brand colors;
 * with real user data we pick a stable color by hashing the item title.
 */
export const avatarPalette = [
  '#ea4335', // google red
  '#0f172a', // github ink
  '#a855f7', // figma violet
  '#1db954', // spotify green
  '#ff9900', // amazon amber
  '#334155', // notion slate
  '#2563eb', // brand blue
  '#e11d48', // rose
  '#059669', // green
  '#7c3aed', // violet
] as const;

/* Spacing — 4pt base; screen gutters match the handoff -------------------- */
export const ls = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  screen: 22, // app-screen horizontal padding
  gate: 32, // onboarding / unlock padding
  topBar: 66, // top padding clearing the status bar
  tabClear: 110, // bottom padding clearing the tab bar
} as const;

/* Corner radii ------------------------------------------------------------- */
export const lr = {
  card: 18, // cards / sheets
  hero: 20, // generator dark card / score card
  field: 14, // inputs / buttons
  chip: 12, // small icon chips
  pill: 20, // chips / pills
  avatar: 12,
  logo: 18, // logo mark (60px); onboarding uses 22
} as const;

/* Shadows ------------------------------------------------------------------ */
export const shadow = {
  card: {
    shadowColor: '#0f172a',
    shadowOpacity: 0.03,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  primary: {
    shadowColor: lc.primary,
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  hero: {
    shadowColor: '#0f172a',
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 18 },
    elevation: 12,
  },
} as const;

/* Typography --------------------------------------------------------------- */
export const font = 'PlusJakartaSans';
export const mono = 'JetBrainsMono';

export const lt = {
  h1: { fontFamily: font, fontSize: 30, fontWeight: '800', letterSpacing: -0.75, color: lc.text }, // screen title
  h2: { fontFamily: font, fontSize: 24, fontWeight: '800', letterSpacing: -0.5, color: lc.ink }, // section heading
  cardTitle: { fontFamily: font, fontSize: 17, fontWeight: '800', color: lc.text },
  rowTitle: { fontFamily: font, fontSize: 15, fontWeight: '700', color: lc.text },
  body: { fontFamily: font, fontSize: 15, fontWeight: '400', color: lc.text },
  subtitle: { fontFamily: font, fontSize: 14, fontWeight: '500', color: lc.textMuted },
  meta: { fontFamily: font, fontSize: 13, fontWeight: '500', color: lc.textMuted },
  label: {
    fontFamily: font,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: lc.textMuted,
  },
} as const;
