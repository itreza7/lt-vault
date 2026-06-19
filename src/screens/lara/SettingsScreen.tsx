/**
 * SettingsScreen (faithful redesign) — vault identity, security, backups.
 *
 * "My Vault" header card, grouped Security rows (biometric toggle, auto-lock,
 * change master passphrase), Backup rows (save / share the encrypted
 * .ltvault), a Features row that opens the Autofill demo, and a red Lock-vault
 * action. Presentational only — every action arrives via props; App owns
 * crypto, storage, and the keychain. Auto-lock and change-passphrase expand
 * inline.
 */

import React, { useRef, useState } from 'react';
import {
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

import { lc, ls, lr } from '../../laraTheme';
import { Icon } from '../../icons';
import {
  GradientButton,
  GroupCard,
  LaraChip,
  LaraSwitch,
  LogoMark,
  PasswordField,
  SectionLabel,
  SettingsRow,
} from '../../components/lara';

export type SettingsScreenProps = {
  itemCount: number;
  biometricAvailable: boolean;
  biometricEnabled: boolean;
  onToggleBiometric: (enable: boolean) => void;
  autoLockMinutes: number;
  onChangeAutoLock: (minutes: number) => void;
  onExportShare: () => void;
  onSaveFile: () => void;
  busyExport?: boolean;
  busySaveFile?: boolean;
  exportInfo?: string | null;
  exportError?: string | null;
  onChangeMaster: (
    current: string,
    next: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  onLock: () => void;
  onOpenAutofill: () => void;
  insetsTop: number;
};

const AUTO_LOCK_CHOICES: { label: string; minutes: number }[] = [
  { label: 'Immediately', minutes: 0 },
  { label: '1 minute', minutes: 1 },
  { label: '5 minutes', minutes: 5 },
  { label: '15 minutes', minutes: 15 },
];

const MIN_MASTER_LENGTH = 8;

function autoLockLabel(minutes: number): string {
  const found = AUTO_LOCK_CHOICES.find(c => c.minutes === minutes);
  return found ? found.label : `${minutes} minutes`;
}

export default function SettingsScreen({
  itemCount,
  biometricAvailable,
  biometricEnabled,
  onToggleBiometric,
  autoLockMinutes,
  onChangeAutoLock,
  onExportShare,
  onSaveFile,
  busyExport = false,
  busySaveFile = false,
  exportInfo,
  exportError,
  onChangeMaster,
  onLock,
  onOpenAutofill,
  insetsTop,
}: SettingsScreenProps): React.ReactElement {
  const [lockOpen, setLockOpen] = useState(false);
  const [changeOpen, setChangeOpen] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [changeError, setChangeError] = useState<string | null>(null);
  const [changeBusy, setChangeBusy] = useState(false);
  const [changeDone, setChangeDone] = useState(false);
  const newRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  function resetChange() {
    setCurrent('');
    setNext('');
    setConfirm('');
    setChangeError(null);
    setChangeBusy(false);
  }

  function toggleChange() {
    setChangeDone(false);
    if (changeOpen) {
      resetChange();
    }
    setChangeOpen(o => !o);
  }

  async function submitChange() {
    setChangeError(null);
    if (!current) {
      setChangeError('Enter your current passphrase.');
      return;
    }
    if (next.length < MIN_MASTER_LENGTH) {
      setChangeError(`New passphrase must be at least ${MIN_MASTER_LENGTH} characters.`);
      return;
    }
    if (next !== confirm) {
      setChangeError('New passphrase and confirmation don’t match.');
      return;
    }
    setChangeBusy(true);
    try {
      const result = await onChangeMaster(current, next);
      if (result.ok) {
        resetChange();
        setChangeOpen(false);
        setChangeDone(true);
      } else {
        setChangeBusy(false);
        setChangeError(result.error ?? 'Couldn’t update the passphrase.');
      }
    } catch {
      setChangeBusy(false);
      setChangeError('Couldn’t update the passphrase. Try again.');
    }
  }

  return (
    <View style={st.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={lc.appBg} />
      <KeyboardAvoidingView
        style={st.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[st.content, { paddingTop: insetsTop + 16 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Text style={st.h1}>Settings</Text>

          {/* My Vault */}
          <View style={st.vaultCard}>
            <LogoMark size={54} />
            <View style={st.vaultText}>
              <Text style={st.vaultName}>My Vault</Text>
              <Text style={st.vaultMeta}>
                {itemCount === 1 ? '1 item' : `${itemCount} items`} · stored on
                this device
              </Text>
            </View>
            <Text style={st.encrypted}>ENCRYPTED</Text>
          </View>

          {/* Security */}
          <View style={st.section}>
            <SectionLabel>Security</SectionLabel>
          </View>
          <GroupCard>
            <SettingsRow
              icon="fingerprint"
              label="Biometric unlock"
              sub={biometricAvailable ? undefined : 'Not available on this device'}
              divider
              right={
                <LaraSwitch
                  value={biometricEnabled}
                  disabled={!biometricAvailable}
                  onValueChange={onToggleBiometric}
                />
              }
            />
            <SettingsRow
              icon="clock"
              label="Auto-lock"
              value={autoLockLabel(autoLockMinutes)}
              chevron
              divider
              onPress={() => setLockOpen(o => !o)}
            />
            {lockOpen ? (
              <View style={st.expand}>
                <View style={st.chipRow}>
                  {AUTO_LOCK_CHOICES.map(choice => (
                    <LaraChip
                      key={choice.minutes}
                      label={choice.label}
                      active={autoLockMinutes === choice.minutes}
                      onPress={() => onChangeAutoLock(choice.minutes)}
                    />
                  ))}
                </View>
              </View>
            ) : null}
            <SettingsRow
              icon="lock"
              label="Change master password"
              chevron
              onPress={toggleChange}
            />
            {changeOpen ? (
              <View style={st.expand}>
                <PasswordField
                  value={current}
                  onChangeText={setCurrent}
                  placeholder="Current passphrase"
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => newRef.current?.focus()}
                />
                <View style={st.formGap}>
                  <PasswordField
                    ref={newRef}
                    value={next}
                    onChangeText={setNext}
                    placeholder="New passphrase (min 8)"
                    returnKeyType="next"
                    blurOnSubmit={false}
                    onSubmitEditing={() => confirmRef.current?.focus()}
                  />
                </View>
                <View style={st.formGap}>
                  <PasswordField
                    ref={confirmRef}
                    value={confirm}
                    onChangeText={setConfirm}
                    placeholder="Confirm new passphrase"
                    returnKeyType="go"
                    onSubmitEditing={submitChange}
                  />
                </View>
                {changeError ? (
                  <Text style={st.error}>{changeError}</Text>
                ) : null}
                <View style={st.formActions}>
                  <View style={st.formBtn}>
                    <GradientButton
                      label="Update"
                      onPress={submitChange}
                      busy={changeBusy}
                      height={48}
                    />
                  </View>
                  <Pressable onPress={toggleChange} style={st.cancel} hitSlop={8}>
                    <Text style={st.cancelText}>Cancel</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </GroupCard>
          {changeDone ? (
            <Text style={st.doneNote}>Master passphrase updated.</Text>
          ) : null}

          {/* Backup */}
          <View style={st.section}>
            <SectionLabel>Backup</SectionLabel>
          </View>
          <GroupCard>
            <SettingsRow
              icon="download"
              label="Export backup file"
              sub="Save an encrypted .ltvault file"
              value={busySaveFile ? 'Saving…' : undefined}
              divider
              onPress={onSaveFile}
            />
            <SettingsRow
              icon="share"
              iconColor={lc.secondary}
              iconTint={lc.tintViolet}
              label="Share backup"
              sub="Send the encrypted file"
              value={busyExport ? 'Sharing…' : undefined}
              onPress={onExportShare}
            />
          </GroupCard>
          <Text style={st.note}>
            {exportError
              ? exportError
              : exportInfo
              ? exportInfo
              : 'Backups are encrypted with your master passphrase — useless without it.'}
          </Text>

          {/* Features */}
          <View style={st.section}>
            <SectionLabel>Features</SectionLabel>
          </View>
          <GroupCard>
            <SettingsRow
              icon="login"
              iconColor={lc.secondary}
              iconTint={lc.tintViolet}
              label="Autofill"
              sub="See it in action"
              chevron
              onPress={onOpenAutofill}
            />
          </GroupCard>

          {/* Lock */}
          <Pressable
            onPress={onLock}
            style={({ pressed }) => [st.lockBtn, pressed && { opacity: 0.85 }]}>
            <Icon name="lock" size={18} color={lc.dangerAlt} />
            <Text style={st.lockText}>Lock vault now</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: lc.appBg },
  fill: { flex: 1 },
  content: {
    paddingHorizontal: ls.screen,
    paddingBottom: 48,
  },

  h1: { fontSize: 30, fontWeight: '800', letterSpacing: -0.75, color: lc.text, marginBottom: 20 },

  vaultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    backgroundColor: lc.card,
    borderWidth: 1,
    borderColor: lc.borderFaint,
    borderRadius: lr.card,
    padding: 16,
  },
  vaultText: { flex: 1, minWidth: 0 },
  vaultName: { fontSize: 17, fontWeight: '800', color: lc.text },
  vaultMeta: { fontSize: 13, color: lc.textMuted, marginTop: 2 },
  encrypted: {
    fontSize: 11,
    fontWeight: '700',
    color: lc.success,
    backgroundColor: lc.tintGreen,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 20,
    overflow: 'hidden',
  },

  section: { marginTop: 24 },

  expand: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 16,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  formGap: { marginTop: 12 },
  error: { color: lc.danger, fontSize: 13, lineHeight: 19, marginTop: 12 },
  formActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 14,
  },
  formBtn: { flex: 1 },
  cancel: { paddingVertical: 10, paddingHorizontal: 8 },
  cancelText: { color: lc.slate, fontSize: 15, fontWeight: '600' },
  doneNote: {
    color: lc.success,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 10,
    marginLeft: 4,
  },

  note: {
    fontSize: 12,
    lineHeight: 18,
    color: lc.textMuted,
    marginTop: 9,
    marginHorizontal: 6,
  },

  lockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#fff5f5',
    borderWidth: 1,
    borderColor: '#fecdd3',
    marginTop: 26,
  },
  lockText: { color: lc.dangerAlt, fontSize: 15, fontWeight: '700' },
});
