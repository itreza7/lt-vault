/**
 * UnlockScreen (faithful redesign) — decrypt the device vault.
 *
 * Light surface, gradient logo, master-password field with show/hide, gradient
 * Unlock CTA, optional biometric circle, and a footer reassurance line. Also
 * hosts the restore-from-backup affordance and the "replace vault?" confirm
 * that the pre-unlock flow needs, so no functionality is lost vs. the strongbox
 * gate it replaces.
 *
 * Presentational only — all crypto/storage stays in App.
 */

import React, { useEffect, useRef } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { lc, ls, lr } from '../../laraTheme';
import { Icon } from '../../icons';
import {
  GradientButton,
  LogoMark,
  OrDivider,
  PasswordField,
} from '../../components/lara';

export type UnlockScreenProps = {
  insetsTop: number;
  insetsBottom: number;
  pass: string;
  setPass: (s: string) => void;
  error: string | null;
  busy: boolean;
  onUnlock: () => void;
  bioAvailable: boolean;
  bioEnabled: boolean;
  onBiometricUnlock: () => void;
  importing: boolean;
  onPickBackup: () => void;
  restoreInfo: string | null;
  restoreError: string | null;
  pendingRestore: boolean;
  onConfirmRestore: () => void;
  onCancelRestore: () => void;
};

export default function UnlockScreen({
  insetsTop,
  insetsBottom,
  pass,
  setPass,
  error,
  busy,
  onUnlock,
  bioAvailable,
  bioEnabled,
  onBiometricUnlock,
  importing,
  onPickBackup,
  restoreInfo,
  restoreError,
  pendingRestore,
  onConfirmRestore,
  onCancelRestore,
}: UnlockScreenProps): React.ReactElement {
  const showBiometric = bioAvailable && bioEnabled;

  // Default to the fingerprint prompt as soon as the screen appears; cancelling
  // it just leaves the master-password field for manual entry.
  const triedBio = useRef(false);
  const bioUnlockRef = useRef(onBiometricUnlock);
  bioUnlockRef.current = onBiometricUnlock;
  useEffect(() => {
    if (showBiometric && !triedBio.current) {
      triedBio.current = true;
      bioUnlockRef.current();
    }
  }, [showBiometric]);

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={lc.appBg} />
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insetsTop + 72, paddingBottom: insetsBottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.center}>
            <LogoMark size={60} />
            <Text style={styles.h2}>Unlock your vault</Text>
            <Text style={styles.subtitle}>
              Enter your master password to decrypt the vault stored on this
              device.
            </Text>
          </View>

          {pendingRestore ? (
            <RestoreConfirm
              error={restoreError}
              busy={importing}
              onConfirm={onConfirmRestore}
              onCancel={onCancelRestore}
            />
          ) : (
            <View style={styles.form}>
              {restoreInfo ? (
                <View style={styles.info}>
                  <Text style={styles.infoText}>{restoreInfo}</Text>
                </View>
              ) : null}

              <PasswordField
                value={pass}
                onChangeText={setPass}
                placeholder="Master password"
                onSubmitEditing={onUnlock}
              />

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <View style={styles.unlockBtn}>
                <GradientButton label="Unlock" onPress={onUnlock} busy={busy} />
              </View>

              {showBiometric ? (
                <>
                  <View style={styles.divider}>
                    <OrDivider />
                  </View>
                  <Pressable
                    onPress={onBiometricUnlock}
                    accessibilityRole="button"
                    accessibilityLabel="Unlock with biometrics"
                    style={({ pressed }) => [
                      styles.bioCircle,
                      pressed && styles.bioPressed,
                    ]}>
                    <Icon name="fingerprint" size={34} color={lc.primary} />
                  </Pressable>
                  <Text style={styles.bioLabel}>Unlock with biometrics</Text>
                </>
              ) : null}

              <Pressable
                onPress={onPickBackup}
                disabled={importing}
                hitSlop={8}
                style={styles.restoreLink}>
                <Text style={styles.restoreLinkText}>
                  {importing ? 'Opening…' : 'Restore from a backup file'}
                </Text>
              </Pressable>
              {restoreError ? (
                <Text style={styles.error}>{restoreError}</Text>
              ) : null}
            </View>
          )}

          <View style={styles.grow} />

          <View style={styles.footer}>
            <Icon name="lock" size={13} color={lc.textMuted} />
            <Text style={styles.footerText}>
              AES-256 encrypted · stored only on this device
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/* "Replace vault?" confirmation shown after picking a backup to restore. ---- */
function RestoreConfirm({
  error,
  busy,
  onConfirm,
  onCancel,
}: {
  error: string | null;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <View style={styles.form}>
      <View style={styles.danger}>
        <Text style={styles.dangerTitle}>Restore this backup?</Text>
        <Text style={styles.dangerText}>
          Your current vault will be overwritten and can’t be recovered. You’ll
          unlock the restored vault with the passphrase its backup was made with.
        </Text>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable
        onPress={onConfirm}
        disabled={busy}
        style={({ pressed }) => [
          styles.replaceBtn,
          pressed && !busy && { opacity: 0.85 },
          busy && { opacity: 0.6 },
        ]}>
        <Text style={styles.replaceText}>
          {busy ? 'Replacing…' : 'Replace vault'}
        </Text>
      </Pressable>
      <Pressable onPress={onCancel} style={styles.cancelBtn} hitSlop={8}>
        <Text style={styles.cancelText}>Cancel</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: lc.appBg },
  fill: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: ls.gate,
    alignItems: 'center',
  },

  center: { alignItems: 'center', alignSelf: 'stretch' },
  h2: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: lc.ink,
    marginTop: 24,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: lc.textSub,
    textAlign: 'center',
  },

  form: { alignSelf: 'stretch', alignItems: 'center', marginTop: 28 },
  info: {
    alignSelf: 'stretch',
    backgroundColor: lc.tintBlue,
    borderRadius: lr.field,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  infoText: { color: lc.primary, fontSize: 13, lineHeight: 19, fontWeight: '500' },

  unlockBtn: { alignSelf: 'stretch', marginTop: 14 },

  error: {
    alignSelf: 'stretch',
    color: lc.danger,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
  },

  divider: { alignSelf: 'stretch', marginTop: 24, marginBottom: 4 },
  bioCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: lc.border,
    backgroundColor: lc.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  bioPressed: { transform: [{ scale: 0.94 }] },
  bioLabel: { marginTop: 12, fontSize: 14, fontWeight: '600', color: lc.slate },

  restoreLink: { marginTop: 22, paddingVertical: 4 },
  restoreLinkText: { color: lc.primary, fontSize: 15, fontWeight: '700' },

  grow: { flex: 1, minHeight: 24 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 24,
  },
  footerText: { fontSize: 12, fontWeight: '500', color: lc.textMuted },

  // Restore confirm
  danger: {
    alignSelf: 'stretch',
    backgroundColor: lc.tintRose,
    borderRadius: lr.card,
    padding: 16,
    marginBottom: 16,
  },
  dangerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: lc.ink,
    marginBottom: 6,
  },
  dangerText: { fontSize: 14, lineHeight: 20, color: lc.slate },
  replaceBtn: {
    alignSelf: 'stretch',
    height: 54,
    borderRadius: lr.field,
    backgroundColor: lc.dangerAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  replaceText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: { marginTop: 14, paddingVertical: 8 },
  cancelText: { color: lc.slate, fontSize: 15, fontWeight: '600' },
});
