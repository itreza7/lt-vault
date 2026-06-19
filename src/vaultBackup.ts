/**
 * vaultBackup — export the vault to a .ltvault file + system share sheet, and
 * pick/validate a .ltvault (or legacy JSON) file for restore.
 *
 * Everything here moves only CIPHERTEXT. Export writes the already-encrypted
 * .ltvault container; import reads a file and validates its shape but NEVER
 * decrypts — the passphrase check happens later, at unlock. Nothing is sent
 * off-device beyond the file the user explicitly shares.
 */

import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import {
  pick,
  saveDocuments,
  keepLocalCopy,
  types,
  errorCodes,
  isErrorWithCode,
} from '@react-native-documents/picker';

import { isVaultBlob, type VaultBlob } from './vaultCrypto';
import { exportVaultBlob } from './vaultStorage';
import {
  LTVAULT_EXT,
  looksLikeContainer,
  decodeContainer,
} from './ltvault';

const MIME = 'application/octet-stream';

/** Backup filename for a given day: larateam-vault-YYYY-MM-DD.ltvault */
export function backupFileName(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `larateam-vault-${y}-${m}-${d}.${LTVAULT_EXT}`;
}

/**
 * Write the .ltvault container to a file and open the system share sheet.
 * Returns false if there is no vault to export yet. Dismissing the share sheet
 * is not treated as an error (failOnCancel: false).
 */
export async function exportBackup(): Promise<boolean> {
  const container = await exportVaultBlob(); // already-encrypted container, or null
  if (container == null) {
    return false;
  }

  const fileName = backupFileName();
  // Cache dir: OS-managed, app-private; the file is ciphertext regardless.
  const path = `${RNFS.CachesDirectoryPath}/${fileName}`;
  await RNFS.writeFile(path, container, 'utf8');

  await Share.open({
    url: `file://${path}`,
    type: MIME,
    filename: fileName,
    failOnCancel: false,
  });
  return true;
}

/** Outcome of a "save to file" attempt. */
export type SaveBackupResult =
  | { status: 'saved'; name: string }
  | { status: 'empty' } // no vault to export yet
  | { status: 'cancelled' }; // user dismissed the save dialog

/**
 * Write the .ltvault container to a file the user chooses via the system
 * "Save as" dialog (Android Storage Access Framework) — a real file on disk.
 *
 * The content is already ciphertext; this exposes no secrets. Returns 'saved'
 * with the chosen file name, 'empty' if there is no vault yet, or 'cancelled'
 * if the user backed out. Throws an Error with a clear message on a genuine
 * save failure.
 */
export async function saveBackupToFile(): Promise<SaveBackupResult> {
  const container = await exportVaultBlob();
  if (container == null) {
    return { status: 'empty' };
  }

  const fileName = backupFileName();
  const path = `${RNFS.CachesDirectoryPath}/${fileName}`;
  await RNFS.writeFile(path, container, 'utf8');

  try {
    const [result] = await saveDocuments({
      sourceUris: [`file://${path}`],
      mimeType: MIME,
      fileName,
      copy: true,
    });
    if (result.error) {
      throw new Error('Couldn’t save the backup file. Please try again.');
    }
    return { status: 'saved', name: result.name ?? fileName };
  } catch (e) {
    if (isErrorWithCode(e) && e.code === errorCodes.OPERATION_CANCELED) {
      return { status: 'cancelled' }; // user backed out — not an error
    }
    if (e instanceof Error) {
      throw e;
    }
    throw new Error('Couldn’t save the backup file. Please try again.');
  } finally {
    RNFS.unlink(path).catch(() => {});
  }
}

/**
 * Let the user pick a backup file, read it, and validate it is a real vault.
 *
 * Accepts both the new .ltvault container and a legacy JSON blob. Returns the
 * parsed VaultBlob, or null if the user cancelled the picker. Throws an Error
 * with a clear, user-facing message for an unreadable or non-vault file. Never
 * decrypts and never crashes on bad input.
 */
export async function pickBackupBlob(): Promise<VaultBlob | null> {
  let picked;
  try {
    [picked] = await pick({ type: [types.allFiles] });
  } catch (e) {
    if (isErrorWithCode(e) && e.code === errorCodes.OPERATION_CANCELED) {
      return null; // user backed out — not an error
    }
    throw new Error('Couldn’t open the file picker. Please try again.');
  }

  // Copy the picked content:// URI into app cache so we can read it as a plain file.
  let localPath: string;
  try {
    const [copy] = await keepLocalCopy({
      files: [
        { uri: picked.uri, fileName: picked.name ?? `backup.${LTVAULT_EXT}` },
      ],
      destination: 'cachesDirectory',
    });
    if (copy.status !== 'success') {
      throw new Error('copy failed');
    }
    localPath = copy.localUri.replace(/^file:\/\//, '');
  } catch {
    throw new Error('Couldn’t read that file. Please pick a valid backup.');
  }

  let text: string;
  try {
    text = await RNFS.readFile(localPath, 'utf8');
  } catch {
    throw new Error('Couldn’t read that file. Please pick a valid backup.');
  } finally {
    // Best-effort cleanup of the temporary local copy.
    RNFS.unlink(localPath).catch(() => {});
  }

  // New format: a .ltvault container.
  if (looksLikeContainer(text)) {
    try {
      return decodeContainer(text);
    } catch {
      throw new Error('That .ltvault file is corrupted or not a vault backup.');
    }
  }

  // Legacy fallback: a v1 JSON blob.
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('That file isn’t a Larateam Vault backup.');
  }
  if (!isVaultBlob(parsed)) {
    throw new Error('That file isn’t a Larateam Vault backup (missing fields).');
  }
  return parsed;
}
