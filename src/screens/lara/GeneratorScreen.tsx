/**
 * GeneratorScreen (faithful redesign) — create a strong, unique password.
 *
 * Dark display card with the generated value in mono, copy + regenerate, an
 * entropy-based strength meter, a length slider (8–32), and four character-set
 * toggles. Uses the project's CSPRNG-backed generatePassword and the 30s
 * clipboard auto-clear; ambiguous characters are excluded per the handoff.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { lc, ls, lr, lt, mono, shadow } from '../../laraTheme';
import { Icon } from '../../icons';
import { GradientButton, LaraSwitch, Slider } from '../../components/lara';
import {
  generatePassword,
  generateUuidPassword,
  type GenOptions,
} from '../../passwordGen';
import { copyWithAutoClear, CLIPBOARD_CLEAR_SECONDS } from '../../clipboard';

export type GeneratorScreenProps = { insetsTop: number };

type Sets = { upper: boolean; lower: boolean; numbers: boolean; symbols: boolean };

const OPTION_ROWS: { key: keyof Sets; label: string }[] = [
  { key: 'upper', label: 'Uppercase (A–Z)' },
  { key: 'lower', label: 'Lowercase (a–z)' },
  { key: 'numbers', label: 'Numbers (0–9)' },
  { key: 'symbols', label: 'Symbols (!@#)' },
];

/** Entropy-based strength, matching the handoff's pool/bit thresholds. */
function strengthFor(length: number, sets: Sets) {
  let pool = 0;
  if (sets.lower) pool += 25;
  if (sets.upper) pool += 24;
  if (sets.numbers) pool += 8;
  if (sets.symbols) pool += 13;
  if (!pool) pool = 25;
  const bits = length * Math.log2(pool);
  if (bits < 50) return { index: 1, label: 'Weak', color: lc.danger };
  if (bits < 75) return { index: 2, label: 'Fair', color: lc.warning };
  if (bits < 110) return { index: 3, label: 'Strong', color: lc.successAlt };
  return { index: 4, label: 'Excellent', color: lc.success };
}

export default function GeneratorScreen({
  insetsTop,
}: GeneratorScreenProps): React.ReactElement {
  const [length, setLength] = useState(20);
  const [sets, setSets] = useState<Sets>({
    upper: true,
    lower: true,
    numbers: true,
    symbols: true,
  });
  const [uuid, setUuid] = useState(false);
  const [password, setPassword] = useState('');
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const regenerate = useCallback(() => {
    const opts: GenOptions = {
      length,
      lowercase: sets.lower,
      uppercase: sets.upper,
      digits: sets.numbers,
      symbols: sets.symbols,
      avoidAmbiguous: true,
    };
    setPassword(uuid ? generateUuidPassword(opts) : generatePassword(opts));
    setCopied(false);
  }, [length, sets, uuid]);

  // Regenerate on mount and whenever length/sets change.
  useEffect(() => {
    regenerate();
  }, [regenerate]);

  useEffect(
    () => () => {
      if (copyTimer.current) {
        clearTimeout(copyTimer.current);
      }
    },
    [],
  );

  const onCopy = useCallback(async () => {
    if (!password) {
      return;
    }
    await copyWithAutoClear(password);
    setCopied(true);
    if (copyTimer.current) {
      clearTimeout(copyTimer.current);
    }
    copyTimer.current = setTimeout(() => setCopied(false), 1600);
  }, [password]);

  // Never let the user disable the last remaining character set.
  const enabledCount = OPTION_ROWS.filter(o => sets[o.key]).length;
  const toggle = (key: keyof Sets, on: boolean) => {
    if (!on && enabledCount <= 1) {
      return;
    }
    setSets(prev => ({ ...prev, [key]: on }));
  };

  const strength = strengthFor(uuid ? 32 : length, sets);

  return (
    <View style={st.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={lc.appBg} />
      <ScrollView
        contentContainerStyle={[st.content, { paddingTop: insetsTop + 16 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Text style={lt.h1}>Generator</Text>
        <Text style={st.subtitle}>Create a strong, unique password.</Text>

        {/* Dark display card */}
        <View style={[st.display, shadow.hero]}>
          <Text style={st.password} selectable>
            {password}
          </Text>
          <View style={st.displayActions}>
            <View style={st.copyBtn}>
              <GradientButton
                label={copied ? 'Copied!' : 'Copy password'}
                onPress={onCopy}
                height={44}
                icon={copied ? 'check' : 'copy'}
              />
            </View>
            <Pressable
              onPress={regenerate}
              accessibilityRole="button"
              accessibilityLabel="Regenerate password"
              style={({ pressed }) => [st.regen, pressed && { opacity: 0.7 }]}>
              <Icon name="refresh" size={18} color="#fff" />
            </Pressable>
          </View>
        </View>

        {/* Strength */}
        <View style={st.strengthHead}>
          <Text style={st.strengthLabel}>Strength</Text>
          <Text style={[st.strengthWord, { color: strength.color }]}>
            {strength.label}
          </Text>
        </View>
        <View style={st.segs}>
          {[0, 1, 2, 3].map(i => (
            <View
              key={i}
              style={[
                st.seg,
                { backgroundColor: i < strength.index ? strength.color : lc.border },
              ]}
            />
          ))}
        </View>

        {/* Format */}
        <View style={st.formatCard}>
          <View style={st.optionRow}>
            <View style={st.formatText}>
              <Text style={st.optionLabel}>UUID format</Text>
              <Text style={st.optionSub}>Grouped 8-4-4-4-12 with hyphens</Text>
            </View>
            <LaraSwitch value={uuid} onValueChange={setUuid} />
          </View>
        </View>

        {/* Length (fixed at 32 in UUID format) */}
        {!uuid ? (
          <View style={st.lengthCard}>
            <View style={st.lengthHead}>
              <Text style={st.lengthLabel}>Length</Text>
              <Text style={st.lengthValue}>{length}</Text>
            </View>
            <Slider value={length} min={8} max={32} onChange={setLength} />
          </View>
        ) : null}

        {/* Options */}
        <View style={st.optionsCard}>
          {OPTION_ROWS.map((opt, i) => (
            <View
              key={opt.key}
              style={[st.optionRow, i > 0 && st.optionDivider]}>
              <Text style={st.optionLabel}>{opt.label}</Text>
              <LaraSwitch
                value={sets[opt.key]}
                onValueChange={on => toggle(opt.key, on)}
              />
            </View>
          ))}
        </View>

        <Text style={st.footnote}>
          Copied passwords clear from the clipboard after{' '}
          {CLIPBOARD_CLEAR_SECONDS}s.
        </Text>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: lc.appBg },
  content: { paddingHorizontal: ls.screen, paddingBottom: 40 },

  subtitle: { ...lt.subtitle, marginTop: 4, marginBottom: 22 },

  display: {
    backgroundColor: lc.ink,
    borderRadius: lr.hero,
    paddingVertical: 22,
    paddingHorizontal: 20,
  },
  password: {
    color: '#fff',
    fontFamily: mono,
    fontSize: 21,
    lineHeight: 31,
    fontWeight: '500',
    minHeight: 64,
  },
  displayActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
  },
  copyBtn: { flex: 1 },
  regen: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  strengthHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 22,
    marginBottom: 10,
    marginHorizontal: 2,
  },
  strengthLabel: { fontSize: 14, fontWeight: '700', color: lc.text },
  strengthWord: { fontSize: 14, fontWeight: '800' },
  segs: { flexDirection: 'row', gap: 6 },
  seg: { flex: 1, height: 7, borderRadius: 6 },

  formatCard: {
    backgroundColor: lc.card,
    borderWidth: 1,
    borderColor: lc.borderFaint,
    borderRadius: lr.card,
    marginTop: 22,
    overflow: 'hidden',
  },
  formatText: { flex: 1, minWidth: 0 },
  optionSub: { fontSize: 12, color: lc.textMuted, marginTop: 2 },

  lengthCard: {
    backgroundColor: lc.card,
    borderWidth: 1,
    borderColor: lc.borderFaint,
    borderRadius: lr.card,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginTop: 14,
  },
  lengthHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  lengthLabel: { fontSize: 15, fontWeight: '600', color: lc.text },
  lengthValue: {
    fontFamily: mono,
    fontSize: 16,
    fontWeight: '700',
    color: lc.primary,
  },

  optionsCard: {
    backgroundColor: lc.card,
    borderWidth: 1,
    borderColor: lc.borderFaint,
    borderRadius: lr.card,
    marginTop: 14,
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 18,
  },
  optionDivider: { borderTopWidth: 1, borderTopColor: lc.divider },
  optionLabel: { fontSize: 15, fontWeight: '600', color: lc.text },

  footnote: {
    fontSize: 12,
    color: lc.textMuted,
    textAlign: 'center',
    marginTop: 22,
    lineHeight: 18,
  },
});
