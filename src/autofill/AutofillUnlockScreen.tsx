/**
 * AutofillUnlockScreen — the UI shown inside VaultAutofillActivity.
 *
 * Two modes:
 *  - fill: unlock → decrypt → list logins matching the site/app → return a
 *    Dataset (or a freshly generated TOTP code) to the OS.
 *  - save: the OS captured a username/password on a form submit; unlock →
 *    decrypt → add (or update) the login → re-encrypt and persist.
 *
 * All crypto/biometrics reuse the app's modules. Nothing persists or transmits
 * anything beyond the on-device encrypted vault.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  InteractionManager,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { lc, ls, lr, lt, avatarPalette } from '../laraTheme';
import { Icon } from '../icons';
import {
  GradientButton,
  LogoMark,
  PasswordField,
  LetterAvatar,
} from '../components/lara';
import { loadVaultBlob, saveVaultBlob } from '../vaultStorage';
import { decryptVault, encryptVault } from '../vaultCrypto';
import {
  isBiometricAvailable,
  isBiometricEnabled,
  getBiometricMaster,
} from '../biometric';
import { subtitleFor, passwordOf, makeItem, type Item } from '../model';
import { generateTotp, isValidBase32Secret } from '../totp';
import { Autofill, type AutofillRequest } from './native';
import { rankLogins, hostFromUrl, domainMatch } from './match';

function avatarColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) % 1000000007;
  }
  return avatarPalette[h % avatarPalette.length];
}
function avatarLetter(title: string): string {
  const m = (title || '').match(/[a-z0-9]/i);
  return (m ? m[0] : (title.trim()[0] || '•')).toUpperCase();
}

/** A friendly title from the site domain or app package. */
function titleFor(domain: string, pkg: string | null): string {
  const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  if (domain) {
    return cap(domain.split('.')[0]) || domain;
  }
  if (pkg) {
    const parts = pkg.split('.').filter(p => p.length > 1);
    return cap(parts[parts.length - 1] || pkg);
  }
  return 'New login';
}

type Phase = 'loading' | 'locked' | 'list' | 'empty' | 'saved';

export default function AutofillUnlockScreen(): React.ReactElement {
  const insets = useSafeAreaInsets();

  const [req, setReq] = useState<AutofillRequest | null>(null);
  const [phase, setPhase] = useState<Phase>('loading');
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [matches, setMatches] = useState<Item[]>([]);
  const [others, setOthers] = useState<Item[]>([]);
  const [savedUpdated, setSavedUpdated] = useState(false);
  const triedBio = useRef(false);

  const saveMode = req?.mode === 'save';
  const otpMode =
    !!req && !saveMode && req.hasOtp && !req.hasPassword && !req.hasUsername;
  const target =
    req?.webDomain?.trim() || req?.packageName?.trim() || 'this app';

  // fill: open the vault and list matching logins.
  const openVault = useCallback(
    async (master: string): Promise<boolean> => {
      const blob = await loadVaultBlob();
      if (!blob) {
        setError('No vault found on this device.');
        return false;
      }
      const vault = await decryptVault(blob, master);
      const ranked = rankLogins(vault.items, req!);
      const keep = (it: Item) =>
        otpMode ? isValidBase32Secret(it.fields.totp || '') : true;
      const m = ranked.matches.filter(keep);
      const o = ranked.others.filter(keep);
      setMatches(m);
      setOthers(o);
      setPhase(m.length + o.length === 0 ? 'empty' : 'list');
      return true;
    },
    [req, otpMode],
  );

  // save: add or update the login the OS captured.
  const persistSave = useCallback(
    async (master: string): Promise<boolean> => {
      const blob = await loadVaultBlob();
      if (!blob) {
        setError('No vault found on this device.');
        return false;
      }
      const vault = await decryptVault(blob, master);
      const domain = req?.webDomain ? hostFromUrl(req.webDomain) : '';
      const username = req?.savedUsername || '';
      const password = req?.savedPassword || '';
      const now = Date.now();

      const idx = vault.items.findIndex(
        it =>
          it.type === 'login' &&
          (it.fields.username || '') === username &&
          (domain ? domainMatch(it.fields.url || '', domain) : false),
      );
      let items: Item[];
      if (idx >= 0) {
        items = vault.items.map((it, i) =>
          i === idx
            ? { ...it, fields: { ...it.fields, password }, updatedAt: now }
            : it,
        );
      } else {
        const item = makeItem('login', now);
        item.title = titleFor(domain, req?.packageName ?? null);
        item.fields = { username, password, url: domain };
        items = [...vault.items, item];
      }
      const next = await encryptVault({ schema: 2, items }, master);
      await saveVaultBlob(next);
      setSavedUpdated(idx >= 0);
      setPhase('saved');
      return true;
    },
    [req],
  );

  const unlockWith = useCallback(
    async (master: string) => {
      setError(null);
      setBusy(true);
      try {
        const ok = saveMode ? await persistSave(master) : await openVault(master);
        if (!ok) {
          setPhase('locked');
        }
      } catch {
        setError('That passphrase didn’t work. Try again.');
        setPhase('locked');
      } finally {
        setBusy(false);
      }
    },
    [saveMode, persistSave, openVault],
  );

  const tryBiometric = useCallback(async () => {
    const stored = await getBiometricMaster();
    if (stored) {
      await unlockWith(stored);
    }
  }, [unlockWith]);

  // Read the request, decide initial phase, attempt biometric once.
  useEffect(() => {
    (async () => {
      const r = await Autofill.getRequest();
      if (!r) {
        setError('Couldn’t read the autofill request.');
        setPhase('locked');
        return;
      }
      setReq(r);
      const [available, enabled] = await Promise.all([
        isBiometricAvailable(),
        isBiometricEnabled(),
      ]);
      setBioAvailable(available && enabled);
      setPhase('locked');
      if (available && enabled && !triedBio.current) {
        triedBio.current = true;
        // The autofill auth activity is still resuming when this runs; a
        // BiometricPrompt fired mid-transition silently no-ops (the bug where
        // "fingerprint doesn't work" from a browser fill). Wait for the launch
        // interactions to settle, then prompt.
        InteractionManager.runAfterInteractions(() => {
          getBiometricMaster().then(stored => {
            if (stored) {
              unlockWith(stored);
            }
          });
        });
      }
    })();
    // runs once on mount; unlockWith captures the freshly-set req via getRequest.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPickLogin = useCallback(
    async (item: Item) => {
      if (otpMode) {
        try {
          const code = generateTotp(item.fields.totp || '', { period: 30 });
          await Autofill.fillOtp(code);
        } catch {
          setError('Couldn’t generate the 2FA code.');
        }
        return;
      }
      await Autofill.fillLogin(item.fields.username || null, passwordOf(item));
    },
    [otpMode],
  );

  const renderRow = (item: Item) => (
    <Pressable
      key={item.id}
      onPress={() => onPickLogin(item)}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      <LetterAvatar
        letter={avatarLetter(item.title || '?')}
        color={avatarColor(item.title || item.id)}
      />
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {item.title || 'Untitled'}
        </Text>
        <Text style={styles.rowSub} numberOfLines={1}>
          {otpMode ? 'Tap to fill 2FA code' : subtitleFor(item)}
        </Text>
      </View>
      <Icon name="chevronRight" size={18} color={lc.chevron} />
    </Pressable>
  );

  const headerTitle = saveMode
    ? 'Save login'
    : otpMode
    ? 'Fill 2FA code'
    : 'Fill login';

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={lc.appBg} />
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <LogoMark size={44} />
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>{headerTitle}</Text>
              <Text style={styles.headerTarget} numberOfLines={1}>
                {req?.savedUsername ? `${req.savedUsername} · ${target}` : target}
              </Text>
            </View>
            <Pressable
              onPress={() => (saveMode ? Autofill.close() : Autofill.cancel())}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              style={styles.close}>
              <Icon name="close" size={22} color={lc.textMuted} />
            </Pressable>
          </View>

          {phase === 'loading' ? (
            <View style={styles.centerBox}>
              <ActivityIndicator color={lc.primary} />
            </View>
          ) : null}

          {phase === 'locked' ? (
            <View style={styles.form}>
              <Text style={styles.lockHint}>
                {saveMode
                  ? 'Unlock your vault to save this login.'
                  : `Unlock your vault to ${otpMode ? 'fill the code' : 'fill this login'}.`}
              </Text>
              <PasswordField
                value={pass}
                onChangeText={setPass}
                placeholder="Master passphrase"
                onSubmitEditing={() => unlockWith(pass)}
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <View style={styles.unlockBtn}>
                <GradientButton
                  label={saveMode ? 'Unlock & save' : 'Unlock'}
                  onPress={() => unlockWith(pass)}
                  busy={busy}
                />
              </View>
              {bioAvailable ? (
                <Pressable
                  onPress={tryBiometric}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.bioBtn,
                    pressed && { opacity: 0.7 },
                  ]}>
                  <Icon name="fingerprint" size={20} color={lc.primary} />
                  <Text style={styles.bioText}>Unlock with biometrics</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {phase === 'saved' ? (
            <View style={styles.centerBox}>
              <View style={styles.savedIcon}>
                <Icon name="check" size={26} color={lc.success} />
              </View>
              <Text style={styles.emptyTitle}>
                {savedUpdated ? 'Login updated' : 'Saved to LT Vault'}
              </Text>
              <Text style={styles.emptyBody}>
                {req?.savedUsername || 'This login'} for {target} is now in your
                vault.
              </Text>
              <Pressable onPress={() => Autofill.close()} style={styles.doneBtn}>
                <Text style={styles.doneText}>Done</Text>
              </Pressable>
            </View>
          ) : null}

          {phase === 'empty' ? (
            <View style={styles.centerBox}>
              <Text style={styles.emptyTitle}>
                {otpMode ? 'No 2FA codes for this' : 'No matching logins'}
              </Text>
              <Text style={styles.emptyBody}>
                {otpMode
                  ? 'None of your logins have a saved 2FA secret.'
                  : 'You have no logins saved to fill here.'}
              </Text>
              <Pressable onPress={() => Autofill.cancel()} style={styles.doneBtn}>
                <Text style={styles.doneText}>Close</Text>
              </Pressable>
            </View>
          ) : null}

          {phase === 'list' ? (
            <View>
              {matches.length > 0 ? (
                <>
                  <Text style={styles.section}>For {target}</Text>
                  <View style={styles.list}>{matches.map(renderRow)}</View>
                </>
              ) : null}
              {others.length > 0 ? (
                <>
                  <Text style={styles.section}>
                    {matches.length > 0 ? 'Other logins' : 'All logins'}
                  </Text>
                  <View style={styles.list}>{others.map(renderRow)}</View>
                </>
              ) : null}
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: lc.appBg },
  fill: { flex: 1 },
  content: { paddingHorizontal: ls.screen, flexGrow: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
  },
  headerText: { flex: 1, minWidth: 0 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: lc.text },
  headerTarget: { fontSize: 13, color: lc.textMuted, marginTop: 1 },
  close: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  centerBox: { alignItems: 'center', gap: 8, paddingVertical: 40 },
  savedIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: lc.tintGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },

  form: { marginTop: 8 },
  lockHint: { fontSize: 14, color: lc.textSub, marginBottom: 16 },
  error: { color: lc.danger, fontSize: 14, marginTop: 12 },
  unlockBtn: { marginTop: 14 },
  bioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 10,
  },
  bioText: { color: lc.primary, fontSize: 15, fontWeight: '700' },

  section: { ...lt.label, marginTop: 18, marginBottom: 10, marginLeft: 2 },
  list: { gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: lc.card,
    borderWidth: 1,
    borderColor: lc.borderFaint,
    borderRadius: lr.card,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowPressed: { backgroundColor: lc.appBg },
  rowBody: { flex: 1, minWidth: 0 },
  rowTitle: { ...lt.rowTitle },
  rowSub: { fontSize: 13, color: lc.textMuted, marginTop: 2 },

  emptyTitle: { fontSize: 17, fontWeight: '700', color: lc.text },
  emptyBody: {
    fontSize: 14,
    lineHeight: 20,
    color: lc.textMuted,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  doneBtn: { marginTop: 12, paddingVertical: 10, paddingHorizontal: 24 },
  doneText: { color: lc.primary, fontSize: 15, fontWeight: '700' },
});
