/**
 * useVaultSession — the app's state machine and all vault actions, extracted
 * from App so the component is just wiring + render.
 *
 *   loading → (create | unlock) → unlocked
 *
 * Security (see CLAUDE.md): the master passphrase lives only in React state
 * while unlocked and is wiped on Lock. Every change re-encrypts the whole vault.
 */

import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { emptyVault, type Item, type Vault } from '../model';
import { encryptVault, decryptVault, type VaultBlob } from '../vaultCrypto';
import { vaultExists, loadVaultBlob, saveVaultBlob } from '../vaultStorage';
import {
  exportBackup,
  saveBackupToFile,
  pickBackupBlob,
} from '../vaultBackup';
import {
  isBiometricAvailable,
  isBiometricEnabled,
  enableBiometric,
  disableBiometric,
  getBiometricMaster,
} from '../biometric';
import type { LaraTabKey } from '../components/lara';
import { useAutoLock } from './useAutoLock';
import { useAppBackHandler } from './useAppBackHandler';

const MIN_PASSPHRASE_LENGTH = 8;
const AUTOLOCK_KEY = 'larateam.autolock.minutes';

export type Screen = 'loading' | 'create' | 'unlock' | 'unlocked';

export type Route =
  | { name: 'list' }
  | { name: 'pickType' }
  | { name: 'detail'; id: string }
  | { name: 'editor'; item: Item; isNew: boolean };

export function useVaultSession() {
  const [screen, setScreen] = useState<Screen>('loading');
  const [pass, setPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Master passphrase + decrypted vault — in memory only while unlocked.
  const [master, setMaster] = useState('');
  const [vault, setVault] = useState<Vault>(emptyVault());

  // Navigation while unlocked.
  const [tab, setTab] = useState<LaraTabKey>('vault');
  const [route, setRoute] = useState<Route>({ name: 'list' });
  const [showAutofill, setShowAutofill] = useState(false);

  // Backup restore (pre-unlock).
  const [importing, setImporting] = useState(false);
  const [pendingBlob, setPendingBlob] = useState<VaultBlob | null>(null);
  const [restoreInfo, setRestoreInfo] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  // Backup export (Settings).
  const [busyExport, setBusyExport] = useState(false);
  const [busySaveFile, setBusySaveFile] = useState(false);
  const [exportInfo, setExportInfo] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  // Biometrics + auto-lock.
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioEnabled, setBioEnabled] = useState(false);
  const [autoLockMinutes, setAutoLockMinutes] = useState(5);

  // Decide the first screen + load preferences.
  useEffect(() => {
    (async () => {
      try {
        const [exists, available, enabled, lock] = await Promise.all([
          vaultExists(),
          isBiometricAvailable(),
          isBiometricEnabled(),
          AsyncStorage.getItem(AUTOLOCK_KEY),
        ]);
        setBioAvailable(available);
        setBioEnabled(enabled);
        if (lock != null) {
          setAutoLockMinutes(parseInt(lock, 10) || 0);
        }
        setScreen(exists ? 'unlock' : 'create');
      } catch {
        setScreen('create');
      }
    })();
  }, []);

  // If the open detail item disappears (e.g. just deleted), return to the list.
  useEffect(() => {
    if (route.name === 'detail' && !vault.items.some(i => i.id === route.id)) {
      setRoute({ name: 'list' });
    }
  }, [route, vault]);

  /* --- helpers ----------------------------------------------------------- */
  function resetEntry() {
    setPass('');
    setConfirm('');
    setError(null);
  }

  function clearTransient() {
    setExportInfo(null);
    setExportError(null);
    setBusyExport(false);
    setBusySaveFile(false);
  }

  async function enterUnlocked(data: Vault, usedMaster: string) {
    setMaster(usedMaster);
    setVault(data);
    setTab('vault');
    setRoute({ name: 'list' });
    clearTransient();
    resetEntry();
    setPendingBlob(null);
    setRestoreInfo(null);
    setRestoreError(null);
    setScreen('unlocked');
  }

  async function handleCreate() {
    setError(null);
    if (pass.length < MIN_PASSPHRASE_LENGTH) {
      setError(
        `Choose a passphrase of at least ${MIN_PASSPHRASE_LENGTH} characters.`,
      );
      return;
    }
    if (pass !== confirm) {
      setError('The two passphrases don’t match. Try again.');
      return;
    }
    setBusy(true);
    try {
      const fresh = emptyVault();
      const blob = await encryptVault(fresh, pass);
      await saveVaultBlob(blob);
      await enterUnlocked(fresh, pass);
    } catch {
      setError('Couldn’t create the vault. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleUnlock(withMaster?: string) {
    const candidate = withMaster ?? pass;
    setError(null);
    if (candidate.length === 0) {
      setError('Enter your passphrase to unlock.');
      return;
    }
    setBusy(true);
    try {
      const blob = await loadVaultBlob();
      if (!blob) {
        setError('No vault found on this device.');
        return;
      }
      const data = await decryptVault(blob, candidate);
      await enterUnlocked(data, candidate);
    } catch {
      setError('That passphrase didn’t work. Check it and try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleBiometricUnlock() {
    setError(null);
    const stored = await getBiometricMaster();
    if (stored) {
      await handleUnlock(stored);
    }
    // If null: user cancelled or it failed — leave them on the passphrase field.
  }

  function handleLock() {
    setMaster('');
    setVault(emptyVault());
    setTab('vault');
    setRoute({ name: 'list' });
    clearTransient();
    resetEntry();
    setScreen('unlock');
  }

  // Lock when returning to the foreground after the auto-lock window.
  useAutoLock(screen === 'unlocked', autoLockMinutes, handleLock);

  // Hardware-back navigation (overlays → parent, tab → Vault, Vault → exit).
  const cancelRestore = useCallback(() => setPendingBlob(null), []);
  useAppBackHandler({
    screen,
    tab,
    route,
    showAutofill,
    hasPendingRestore: pendingBlob != null,
    setTab,
    setRoute,
    setShowAutofill,
    cancelRestore,
  });

  // Re-encrypt the whole vault with the in-memory master and persist it.
  const persist = useCallback(
    async (next: Vault): Promise<boolean> => {
      setBusy(true);
      try {
        const blob = await encryptVault(next, master);
        await saveVaultBlob(blob);
        setVault(next);
        return true;
      } catch {
        return false;
      } finally {
        setBusy(false);
      }
    },
    [master],
  );

  /* --- item mutations ---------------------------------------------------- */
  const upsertItem = useCallback(
    async (item: Item): Promise<boolean> => {
      const exists = vault.items.some(i => i.id === item.id);
      const items = exists
        ? vault.items.map(i => (i.id === item.id ? item : i))
        : [...vault.items, item];
      return persist({ schema: 2, items });
    },
    [vault, persist],
  );

  const deleteItem = useCallback(
    async (id: string): Promise<boolean> => {
      return persist({ schema: 2, items: vault.items.filter(i => i.id !== id) });
    },
    [vault, persist],
  );

  const toggleFavorite = useCallback(
    async (id: string): Promise<boolean> => {
      return persist({
        schema: 2,
        items: vault.items.map(i =>
          i.id === id ? { ...i, favorite: !i.favorite } : i,
        ),
      });
    },
    [vault, persist],
  );

  /* --- backup ------------------------------------------------------------ */
  async function handleExportShare() {
    setExportError(null);
    setExportInfo(null);
    setBusyExport(true);
    try {
      const ok = await exportBackup();
      setExportInfo(
        ok
          ? 'Backup shared. It’s an encrypted .ltvault — safe to keep anywhere.'
          : 'Nothing to export yet.',
      );
    } catch {
      setExportError('Couldn’t export the backup. Please try again.');
    } finally {
      setBusyExport(false);
    }
  }

  async function handleSaveFile() {
    setExportError(null);
    setExportInfo(null);
    setBusySaveFile(true);
    try {
      const result = await saveBackupToFile();
      if (result.status === 'saved') {
        setExportInfo(`Saved ${result.name}. Encrypted — safe to keep anywhere.`);
      } else if (result.status === 'empty') {
        setExportInfo('Nothing to export yet.');
      }
    } catch (e) {
      setExportError(
        e instanceof Error ? e.message : 'Couldn’t save the backup file.',
      );
    } finally {
      setBusySaveFile(false);
    }
  }

  async function handlePickBackup() {
    setRestoreError(null);
    setRestoreInfo(null);
    setImporting(true);
    try {
      const blob = await pickBackupBlob();
      if (!blob) {
        return;
      }
      if (await vaultExists()) {
        setPendingBlob(blob);
      } else {
        await saveVaultBlob(blob);
        resetEntry();
        setRestoreInfo(
          'Backup restored. Unlock it with the passphrase that backup was made with.',
        );
        setScreen('unlock');
      }
    } catch (e) {
      setRestoreError(
        e instanceof Error ? e.message : 'Couldn’t import that file.',
      );
    } finally {
      setImporting(false);
    }
  }

  async function handleConfirmRestore() {
    if (!pendingBlob) {
      return;
    }
    setRestoreError(null);
    setImporting(true);
    try {
      await saveVaultBlob(pendingBlob);
      setPendingBlob(null);
      resetEntry();
      setRestoreInfo(
        'Backup restored. Unlock it with the passphrase that backup was made with.',
      );
    } catch {
      setRestoreError('Couldn’t save the restored backup. Please try again.');
    } finally {
      setImporting(false);
    }
  }

  /* --- settings actions -------------------------------------------------- */
  async function handleToggleBiometric(enable: boolean) {
    try {
      if (enable) {
        const ok = await enableBiometric(master);
        setBioEnabled(ok);
      } else {
        await disableBiometric();
        setBioEnabled(false);
      }
    } catch {
      setBioEnabled(false);
    }
  }

  async function handleChangeAutoLock(minutes: number) {
    setAutoLockMinutes(minutes);
    try {
      await AsyncStorage.setItem(AUTOLOCK_KEY, String(minutes));
    } catch {
      // Non-secret preference; safe to ignore a write failure.
    }
  }

  async function handleChangeMaster(
    current: string,
    next: string,
  ): Promise<{ ok: boolean; error?: string }> {
    if (current !== master) {
      return { ok: false, error: 'Your current passphrase is incorrect.' };
    }
    if (next.length < MIN_PASSPHRASE_LENGTH) {
      return {
        ok: false,
        error: `Choose a new passphrase of at least ${MIN_PASSPHRASE_LENGTH} characters.`,
      };
    }
    try {
      const blob = await encryptVault(vault, next);
      await saveVaultBlob(blob);
      setMaster(next);
      // Keep biometric unlock in sync with the new passphrase.
      if (bioEnabled) {
        await enableBiometric(next).catch(() => {});
      }
      return { ok: true };
    } catch {
      return { ok: false, error: 'Couldn’t update the passphrase. Try again.' };
    }
  }

  /* --- navigation -------------------------------------------------------- */
  const openItem = useCallback((id: string) => setRoute({ name: 'detail', id }), []);
  const openAdd = useCallback(() => setRoute({ name: 'pickType' }), []);

  async function handleSaveItem(item: Item) {
    const ok = await upsertItem(item);
    if (ok) {
      setRoute({ name: 'detail', id: item.id });
    }
    return ok;
  }

  async function handleDeleteItem(id: string) {
    const ok = await deleteItem(id);
    if (ok) {
      setRoute({ name: 'list' });
    }
  }

  return {
    // state
    screen,
    pass,
    setPass,
    confirm,
    setConfirm,
    error,
    busy,
    vault,
    tab,
    setTab,
    route,
    setRoute,
    showAutofill,
    setShowAutofill,
    importing,
    pendingBlob,
    setPendingBlob,
    restoreInfo,
    restoreError,
    busyExport,
    busySaveFile,
    exportInfo,
    exportError,
    bioAvailable,
    bioEnabled,
    autoLockMinutes,
    // actions
    handleCreate,
    handleUnlock,
    handleBiometricUnlock,
    handleLock,
    handlePickBackup,
    handleConfirmRestore,
    handleExportShare,
    handleSaveFile,
    handleToggleBiometric,
    handleChangeAutoLock,
    handleChangeMaster,
    toggleFavorite,
    openItem,
    openAdd,
    handleSaveItem,
    handleDeleteItem,
  };
}
