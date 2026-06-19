/**
 * vaultStorage — AsyncStorage wrapper for the single encrypted vault.
 *
 * Only ciphertext is ever written, and it is written as a .ltvault container
 * (never JSON). Legacy installs that still hold a v1 JSON blob are read
 * transparently and rewritten as a container on the next save. No plaintext,
 * passphrase, or key touches storage. Nothing here goes off-device.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { VaultBlob } from './vaultCrypto';
import { isVaultBlob } from './vaultCrypto';
import {
  encodeContainer,
  decodeContainer,
  looksLikeContainer,
} from './ltvault';

/** Storage key for the encrypted container. */
const STORAGE_KEY = 'larateam.vault.v2';
/** Older key that may still hold a v1 JSON blob from before the rebrand. */
const LEGACY_KEY = 'myvault.blob.v1';

/** True once a vault has been created on this device (new or legacy). */
export async function vaultExists(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (raw != null) {
    return true;
  }
  return (await AsyncStorage.getItem(LEGACY_KEY)) != null;
}

/** Parse a stored string (container or legacy JSON) into a VaultBlob. */
function parseStored(raw: string): VaultBlob {
  if (looksLikeContainer(raw)) {
    return decodeContainer(raw);
  }
  const parsed = JSON.parse(raw);
  if (!isVaultBlob(parsed)) {
    throw new Error('Stored vault is not in a recognized format.');
  }
  return parsed;
}

/** Load the stored encrypted blob, or null if no vault exists yet. */
export async function loadVaultBlob(): Promise<VaultBlob | null> {
  const raw =
    (await AsyncStorage.getItem(STORAGE_KEY)) ??
    (await AsyncStorage.getItem(LEGACY_KEY));
  if (raw == null) {
    return null;
  }
  return parseStored(raw);
}

/** Persist the encrypted blob as a .ltvault container, replacing any previous one. */
export async function saveVaultBlob(blob: VaultBlob): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, encodeContainer(blob));
  // Drop any legacy JSON copy so there is exactly one source of truth.
  await AsyncStorage.removeItem(LEGACY_KEY);
}

/**
 * Return the stored vault as a .ltvault container string for the user to back
 * up, or null if no vault exists. The content is already encrypted — this
 * exposes no secrets. Legacy JSON is upconverted to a container on the way out.
 */
export async function exportVaultBlob(): Promise<string | null> {
  const blob = await loadVaultBlob();
  return blob ? encodeContainer(blob) : null;
}
