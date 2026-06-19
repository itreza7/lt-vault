/**
 * OnboardingScreen (faithful redesign) — first run: create the local vault.
 *
 * A full-bleed dark gradient hero (logo, wordmark, headline, body) over the
 * real create form: master passphrase + confirmation, the no-recovery warning,
 * a gradient "Create your vault" CTA, and a "Restore from backup" secondary
 * that opens the file picker. Presentational — App owns crypto/storage.
 */

import React, { forwardRef, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';

import { lc, ls, lr } from '../../laraTheme';
import { Icon } from '../../icons';
import { GradientButton, LogoMark } from '../../components/lara';

export type OnboardingScreenProps = {
  insetsTop: number;
  insetsBottom: number;
  pass: string;
  confirm: string;
  setPass: (s: string) => void;
  setConfirm: (s: string) => void;
  error: string | null;
  busy: boolean;
  onCreate: () => void;
  importing: boolean;
  onPickBackup: () => void;
  restoreError: string | null;
};

/** Dark slate gradient backdrop (≈165deg), drawn with SVG. */
function HeroBackdrop() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id="laraHero" x1="0%" y1="0%" x2="25%" y2="100%">
            <Stop offset="0" stopColor="#1e293b" />
            <Stop offset="0.6" stopColor="#0f172a" />
            <Stop offset="1" stopColor="#0b1220" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#laraHero)" />
      </Svg>
    </View>
  );
}

/** Password input styled for the dark hero. */
const DarkField = forwardRef<
  TextInput,
  {
    value: string;
    onChangeText: (t: string) => void;
    placeholder: string;
    autoFocus?: boolean;
    onSubmitEditing?: () => void;
    returnKeyType?: 'go' | 'next' | 'done';
    blurOnSubmit?: boolean;
  }
>(function DarkFieldImpl(
  {
    value,
    onChangeText,
    placeholder,
    autoFocus,
    onSubmitEditing,
    returnKeyType = 'go',
    blurOnSubmit,
  },
  ref,
) {
  const [hidden, setHidden] = useState(true);
  return (
    <View style={st.darkField}>
      <Icon name="lock" size={18} color="#94a3b8" />
      <TextInput
        ref={ref}
        style={st.darkInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        selectionColor={lc.primary}
        secureTextEntry={hidden}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        importantForAutofill="no"
        autoFocus={autoFocus}
        returnKeyType={returnKeyType}
        blurOnSubmit={blurOnSubmit}
        onSubmitEditing={onSubmitEditing}
      />
      <Pressable
        onPress={() => setHidden(h => !h)}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={hidden ? 'Show' : 'Hide'}>
        <Icon name={hidden ? 'eye' : 'eyeOff'} size={20} color="#94a3b8" />
      </Pressable>
    </View>
  );
});

export default function OnboardingScreen({
  insetsTop,
  insetsBottom,
  pass,
  confirm,
  setPass,
  setConfirm,
  error,
  busy,
  onCreate,
  importing,
  onPickBackup,
  restoreError,
}: OnboardingScreenProps): React.ReactElement {
  const confirmRef = useRef<TextInput>(null);
  return (
    <View style={st.screen}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <HeroBackdrop />
      <KeyboardAvoidingView
        style={st.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[
            st.content,
            { paddingTop: insetsTop + 56, paddingBottom: insetsBottom + 28 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <LogoMark size={72} />

          <View style={st.wordmarkRow}>
            <Text style={st.wordmark}>Larateam</Text>
            <Text style={st.securePill}>SECURE</Text>
          </View>

          <Text style={st.headline}>Security that feels effortless.</Text>
          <Text style={st.body}>
            Your vault lives on this device, locked by a master passphrase only
            you know. No account. No cloud.
          </Text>

          <View style={st.form}>
            <DarkField
              value={pass}
              onChangeText={setPass}
              placeholder="Create a master passphrase"
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => confirmRef.current?.focus()}
            />
            <View style={st.fieldGap}>
              <DarkField
                ref={confirmRef}
                value={confirm}
                onChangeText={setConfirm}
                placeholder="Confirm passphrase"
                returnKeyType="go"
                onSubmitEditing={onCreate}
              />
            </View>

            <View style={st.warn}>
              <Icon name="warning" size={16} color="#fbbf24" />
              <Text style={st.warnText}>
                There is no recovery. Forget this passphrase and your data is
                permanently unreadable.
              </Text>
            </View>

            {error ? <Text style={st.error}>{error}</Text> : null}

            <View style={st.cta}>
              <GradientButton
                label="Create your vault"
                onPress={onCreate}
                busy={busy}
                height={56}
                icon="lock"
              />
            </View>

            <Pressable
              onPress={onPickBackup}
              disabled={importing}
              style={({ pressed }) => [
                st.restoreBtn,
                pressed && !importing && { opacity: 0.8 },
              ]}>
              {importing ? (
                <ActivityIndicator color="#e2e8f0" />
              ) : (
                <>
                  <Icon name="download" size={17} color="#e2e8f0" />
                  <Text style={st.restoreText}>Restore from backup</Text>
                </>
              )}
            </Pressable>
            {restoreError ? (
              <Text style={st.error}>{restoreError}</Text>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0f172a' },
  fill: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: ls.gate,
  },

  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 'auto',
    paddingTop: 32,
    marginBottom: 16,
  },
  wordmark: { fontSize: 19, fontWeight: '800', color: '#fff', letterSpacing: -0.2 },
  securePill: {
    fontSize: 11,
    fontWeight: '700',
    color: '#bfdbfe',
    backgroundColor: 'rgba(37,99,235,0.22)',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
    overflow: 'hidden',
  },

  headline: {
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.6,
    marginBottom: 14,
  },
  body: {
    fontSize: 16,
    lineHeight: 25,
    color: '#94a3b8',
    maxWidth: 320,
    marginBottom: 28,
  },

  form: {},
  darkField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 56,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    borderRadius: lr.field,
    paddingHorizontal: 14,
  },
  darkInput: { flex: 1, minWidth: 0, color: '#fff', fontSize: 16, padding: 0 },
  fieldGap: { marginTop: 12 },

  warn: {
    flexDirection: 'row',
    gap: 9,
    backgroundColor: 'rgba(251,191,36,0.10)',
    borderRadius: lr.field,
    padding: 13,
    marginTop: 16,
  },
  warnText: { flex: 1, color: '#fcd9a3', fontSize: 13, lineHeight: 19 },

  error: { color: '#fca5a5', fontSize: 14, lineHeight: 20, marginTop: 14 },

  cta: { marginTop: 20 },
  restoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 54,
    borderRadius: lr.field,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    marginTop: 12,
  },
  restoreText: { color: '#e2e8f0', fontSize: 15, fontWeight: '600' },
});
