/**
 * AutofillScreen — set up LT Vault as the device autofill service.
 *
 * Reached from Settings → Features → Autofill. Shows whether LT Vault is the
 * active autofill service, opens the system picker to enable it, and explains
 * how filling works. The actual filling happens in VaultAutofillActivity; this
 * screen only manages enablement + guidance.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  AppState,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { lc, ls, lr } from '../../laraTheme';
import { Icon } from '../../icons';
import { GradientButton, IconChip, LogoMark } from '../../components/lara';
import { Autofill } from '../../autofill/native';

export type AutofillScreenProps = {
  insetsTop: number;
  insetsBottom: number;
  onClose: () => void;
};

type Status = 'checking' | 'unsupported' | 'enabled' | 'disabled';

const STEPS: { icon: 'login' | 'fingerprint' | 'check'; text: string }[] = [
  { icon: 'login', text: 'Tap a username or password field in any app or browser.' },
  { icon: 'fingerprint', text: 'Choose “Unlock LT Vault to fill”, then unlock with biometrics or your passphrase.' },
  { icon: 'check', text: 'Pick the matching login — username, password, and 2FA codes fill in.' },
];

export default function AutofillScreen({
  insetsTop,
  insetsBottom,
  onClose,
}: AutofillScreenProps): React.ReactElement {
  const [status, setStatus] = useState<Status>('checking');
  const [busy, setBusy] = useState(false);

  const check = useCallback(async () => {
    const supported = await Autofill.isSupported();
    if (!supported) {
      setStatus('unsupported');
      return;
    }
    setStatus((await Autofill.hasEnabledService()) ? 'enabled' : 'disabled');
  }, []);

  useEffect(() => {
    check();
    // Re-check when returning from the system autofill picker.
    const sub = AppState.addEventListener('change', s => {
      if (s === 'active') {
        check();
      }
    });
    return () => sub.remove();
  }, [check]);

  const onEnable = useCallback(async () => {
    setBusy(true);
    try {
      await Autofill.openAutofillSettings();
    } finally {
      setBusy(false);
    }
  }, []);

  return (
    <View style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={lc.appBg} />
      <ScrollView
        contentContainerStyle={[
          s.content,
          { paddingTop: insetsTop + 8, paddingBottom: insetsBottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={s.topBar}>
          <Pressable
            onPress={onClose}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={s.back}>
            <Icon name="chevronLeft" size={22} color={lc.text} />
          </Pressable>
        </View>

        <View style={s.hero}>
          <LogoMark size={56} />
          <Text style={s.title}>Autofill</Text>
          <Text style={s.subtitle}>
            Fill saved logins and 2FA codes into apps and browsers.
          </Text>
        </View>

        {/* Status */}
        <View style={s.statusCard}>
          {status === 'enabled' ? (
            <>
              <IconChip icon="check" color={lc.success} tint={lc.tintGreen} size={40} radius={12} />
              <View style={s.statusText}>
                <Text style={s.statusTitle}>Autofill is on</Text>
                <Text style={s.statusSub}>LT Vault is your autofill service.</Text>
              </View>
            </>
          ) : status === 'disabled' ? (
            <>
              <IconChip icon="alert" color={lc.warning} tint={lc.tintAmber} size={40} radius={12} />
              <View style={s.statusText}>
                <Text style={s.statusTitle}>Not enabled yet</Text>
                <Text style={s.statusSub}>Turn LT Vault on as your autofill service.</Text>
              </View>
            </>
          ) : status === 'unsupported' ? (
            <>
              <IconChip icon="close" color={lc.danger} tint={lc.tintRed} size={40} radius={12} />
              <View style={s.statusText}>
                <Text style={s.statusTitle}>Not available</Text>
                <Text style={s.statusSub}>This device doesn’t support autofill.</Text>
              </View>
            </>
          ) : (
            <Text style={s.statusSub}>Checking…</Text>
          )}
        </View>

        {status === 'disabled' ? (
          <View style={s.enableBtn}>
            <GradientButton label="Enable autofill" onPress={onEnable} busy={busy} />
          </View>
        ) : null}
        {status === 'enabled' ? (
          <Pressable onPress={onEnable} style={s.changeBtn}>
            <Text style={s.changeText}>Open autofill settings</Text>
          </Pressable>
        ) : null}

        {/* How it works */}
        <Text style={s.section}>HOW IT WORKS</Text>
        <View style={s.steps}>
          {STEPS.map((step, i) => (
            <View key={i} style={s.step}>
              <IconChip icon={step.icon} color={lc.primary} tint={lc.tintBlue} size={36} />
              <Text style={s.stepText}>{step.text}</Text>
            </View>
          ))}
        </View>

        {/* Browsers need one more toggle */}
        <View style={s.callout}>
          <IconChip icon="globe" color={lc.secondary} tint={lc.tintViolet} size={36} />
          <View style={s.calloutBody}>
            <Text style={s.calloutTitle}>Using a browser?</Text>
            <Text style={s.calloutText}>
              Chrome, Edge and Brave fill with their own service by default. To
              use LT Vault there, open that browser → Settings → Autofill → turn
              on “Use another service” (a.k.a. “Autofill using another service”).
              Apps work right away; Firefox doesn’t support third-party autofill.
            </Text>
          </View>
        </View>

        <Text style={s.note}>
          Your vault is unlocked for each fill — nothing leaves the device.
        </Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: lc.appBg },
  content: { paddingHorizontal: ls.screen },

  topBar: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  back: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
  },

  hero: { alignItems: 'center', gap: 10, marginBottom: 22 },
  title: { fontSize: 24, fontWeight: '800', color: lc.text },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: lc.textSub,
    textAlign: 'center',
    paddingHorizontal: 12,
  },

  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: lc.card,
    borderWidth: 1,
    borderColor: lc.borderFaint,
    borderRadius: lr.card,
    padding: 16,
    minHeight: 72,
  },
  statusText: { flex: 1, minWidth: 0 },
  statusTitle: { fontSize: 16, fontWeight: '700', color: lc.text },
  statusSub: { fontSize: 13, color: lc.textMuted, marginTop: 2 },

  enableBtn: { marginTop: 16 },
  changeBtn: { marginTop: 14, alignItems: 'center', paddingVertical: 8 },
  changeText: { color: lc.primary, fontSize: 15, fontWeight: '700' },

  section: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: lc.textMuted,
    marginTop: 26,
    marginBottom: 12,
    marginLeft: 4,
  },
  steps: { gap: 14 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stepText: { flex: 1, fontSize: 14, lineHeight: 20, color: lc.text },

  callout: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: lc.card,
    borderWidth: 1,
    borderColor: lc.borderFaint,
    borderRadius: lr.card,
    padding: 16,
    marginTop: 26,
  },
  calloutBody: { flex: 1, minWidth: 0 },
  calloutTitle: { fontSize: 15, fontWeight: '700', color: lc.text, marginBottom: 4 },
  calloutText: { fontSize: 13, lineHeight: 19, color: lc.textMuted },

  note: {
    fontSize: 12,
    lineHeight: 18,
    color: lc.textMuted,
    marginTop: 16,
    marginHorizontal: 4,
  },
});
