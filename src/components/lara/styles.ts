/**
 * Shared StyleSheets for the lara component set. Kept together so the grouped
 * component files (gradient/buttons/fields/chips/rows/controls/tabbar) can
 * reference the same style objects they did when this was one file.
 */

import { StyleSheet } from 'react-native';

import { lc, lr, mono, font } from '../../laraTheme';

/* Gradient buttons, fields, chips, avatars, dividers, cards. */
export const styles = StyleSheet.create({
  pressed: { transform: [{ scale: 0.97 }] },
  dim: { opacity: 0.6 },

  logo: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },

  gradBtn: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  gradBtnText: { fontFamily: font, color: '#fff', fontSize: 16, fontWeight: '700' },
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  passField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 56,
    alignSelf: 'stretch',
    backgroundColor: lc.card,
    borderWidth: 1,
    borderColor: lc.border,
    borderRadius: lr.field,
    paddingLeft: 14,
    paddingRight: 8,
  },
  passInput: {
    flex: 1,
    minWidth: 0,
    color: lc.text,
    fontSize: 16,
    padding: 0,
    fontFamily: font,
  },
  eyeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 48,
    backgroundColor: lc.card,
    borderWidth: 1,
    borderColor: lc.borderSoft,
    borderRadius: lr.field,
    paddingHorizontal: 14,
  },
  searchInput: { flex: 1, minWidth: 0, color: lc.text, fontSize: 15, padding: 0, fontFamily: font },

  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: lr.pill,
  },
  chipActive: { backgroundColor: lc.primary },
  chipIdle: {
    backgroundColor: lc.card,
    borderWidth: 1,
    borderColor: lc.borderSoft,
  },
  chipText: { fontFamily: font, fontSize: 13, fontWeight: '600', color: lc.slate },
  chipTextActive: { color: '#fff', fontWeight: '700' },

  avatar: {
    borderRadius: lr.avatar,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: font, color: '#fff', fontSize: 18, fontWeight: '800' },

  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    alignSelf: 'stretch',
  },
  orLine: { flex: 1, height: 1, backgroundColor: lc.border },
  orText: { fontFamily: font, fontSize: 12, fontWeight: '600', color: lc.textMuted },

  card: {
    backgroundColor: lc.card,
    borderWidth: 1,
    borderColor: lc.borderFaint,
    borderRadius: lr.card,
  },
});

/* Icon chips, section labels, grouped rows, switch, slider, tab bar. */
export const t = StyleSheet.create({
  chipBox: { alignItems: 'center', justifyContent: 'center' },

  sectionLabel: {
    fontFamily: font,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: lc.textMuted,
    marginLeft: 4,
    marginBottom: 10,
  },

  group: {
    backgroundColor: lc.card,
    borderWidth: 1,
    borderColor: lc.borderFaint,
    borderRadius: lr.card,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: lc.divider },
  rowMid: { flex: 1, minWidth: 0 },
  rowLabel: { fontFamily: font, fontSize: 15, fontWeight: '600', color: lc.text },
  rowSub: { fontFamily: font, fontSize: 12, color: lc.textMuted, marginTop: 1 },
  rowValue: { fontFamily: font, fontSize: 14, fontWeight: '500', color: lc.textMuted },

  switch: {
    width: 46,
    height: 28,
    borderRadius: 16,
    padding: 3,
    flexDirection: 'row',
  },
  switchOn: { backgroundColor: lc.primary, justifyContent: 'flex-end' },
  switchOff: { backgroundColor: '#cbd5e1', justifyContent: 'flex-start' },
  switchDisabled: { opacity: 0.5 },
  knob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  sliderWrap: { height: 24, justifyContent: 'center' },
  sliderTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: lc.border,
  },
  sliderFill: {
    position: 'absolute',
    left: 0,
    height: 4,
    borderRadius: 2,
    backgroundColor: lc.primary,
  },
  sliderThumb: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: lc.primary,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: lc.primary,
    shadowOpacity: 0.4,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderTopWidth: 1,
    borderTopColor: lc.borderFaint,
    paddingTop: 11,
    paddingHorizontal: 14,
  },
  tab: { flex: 1, alignItems: 'center', gap: 5, paddingTop: 2 },
  tabLabel: { fontFamily: font, fontSize: 11, fontWeight: '700' },
});

/* Light icon button, labeled field, detail row, strength meter. */
export const d = StyleSheet.create({
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnActive: { backgroundColor: lc.tintBlue },

  fieldGroup: { marginBottom: 16 },
  fieldLabel: {
    fontFamily: font,
    fontSize: 12,
    fontWeight: '700',
    color: lc.slate,
    marginBottom: 7,
  },
  inputWrap: { justifyContent: 'center' },
  input: {
    backgroundColor: lc.card,
    borderWidth: 1,
    borderColor: lc.border,
    borderRadius: lr.field,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: lc.text,
    fontFamily: font,
  },
  inputMono: { fontFamily: mono },
  inputMulti: { minHeight: 88, textAlignVertical: 'top', paddingTop: 13 },
  inputPadRight: { paddingRight: 48 },
  inputAction: { position: 'absolute', right: 8 },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: lc.divider,
    gap: 12,
  },
  detailMain: { flex: 1, minWidth: 0 },
  detailLabel: {
    fontFamily: font,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: lc.primary,
    marginBottom: 3,
  },
  detailValue: { fontFamily: font, fontSize: 16, color: lc.text },
  detailActions: { flexDirection: 'row', alignItems: 'center' },

  strengthWrap: { gap: 6 },
  strengthBars: { flexDirection: 'row', gap: 6 },
  strengthSeg: { flex: 1, height: 6, borderRadius: 3 },
  strengthLabel: { fontFamily: font, fontSize: 13, fontWeight: '700' },
});
