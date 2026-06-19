/**
 * vaultCrypto — pure encrypt/decrypt for the Larateam Vault.
 *
 * Pipeline: master passphrase + random salt --Argon2id--> 256-bit key
 *           plaintext --AES-256-GCM--> { iv, tag, content }
 *
 * The plaintext (a v2 Vault) is serialized internally before encryption; that
 * serialization is invisible — it only ever exists inside the GCM ciphertext.
 * The *persisted artifact* is the .ltvault container (see ltvault.ts), never
 * JSON on disk.
 *
 * Security invariants (see CLAUDE.md "Security spec"):
 *  - Nothing here persists, logs, or transmits anything. Off-device traffic = 0.
 *  - The passphrase and derived key never leave function scope.
 *  - A fresh 16-byte random salt is generated per encryption.
 */

// MUST be the first import: installs crypto.getRandomValues before any crypto use.
import 'react-native-get-random-values';

import { Buffer } from 'buffer';
import Argon2 from 'react-native-argon2';
import AesGcmCrypto from 'react-native-aes-gcm-crypto';

import { toVault, type Vault } from './model';

/** Argon2id parameters. Stored in every blob; changing them after data exists breaks decryption. */
export const KDF_PARAMS = {
  hashLength: 32, // 256-bit key
  memory: 65536, // 64 MB
  iterations: 3,
  parallelism: 1,
  mode: 'argon2id',
} as const;

export type KdfParams = {
  hashLength: number;
  memory: number;
  iterations: number;
  parallelism: number;
  mode: string;
};

/** Blob format version. Bump only with a migration path. */
export const VAULT_VERSION = 1 as const;

/** The encrypted blob — the in-memory shape that the .ltvault container encodes.
 * Contains no plaintext, passphrase, or key. */
export type VaultBlob = {
  v: number;
  kdf: KdfParams;
  salt: string; // hex — input to Argon2id
  iv: string; // hex — AES-GCM initialization vector (library-generated)
  tag: string; // hex — AES-GCM authentication tag
  content: string; // base64 — ciphertext
};

/**
 * Structural check that an unknown value is a vault blob. Verifies the required
 * fields (v, salt, iv, tag, content); `kdf` is optional so legacy blobs still
 * pass and decryptVault falls back to KDF_PARAMS. This does NOT decrypt or
 * authenticate — a structurally valid blob with the wrong passphrase still fails
 * at unlock.
 */
export function isVaultBlob(value: unknown): value is VaultBlob {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const b = value as Record<string, unknown>;
  return (
    typeof b.v === 'number' &&
    typeof b.salt === 'string' &&
    typeof b.iv === 'string' &&
    typeof b.tag === 'string' &&
    typeof b.content === 'string'
  );
}

/** Fill a byte buffer with cryptographically secure random bytes.
 * crypto.getRandomValues is provided by the react-native-get-random-values polyfill.
 * The RN tsconfig omits the DOM lib, so we reach it through a typed globalThis cast. */
function fillRandom(bytes: Uint8Array): Uint8Array {
  return (
    globalThis as unknown as {
      crypto: { getRandomValues<T extends ArrayBufferView>(array: T): T };
    }
  ).crypto.getRandomValues(bytes);
}

/** Derive the AES-256 key from the passphrase + hex salt.
 * Argon2 returns rawHash as hex; AES-GCM wants the key as base64. */
async function deriveKey(
  master: string,
  saltHex: string,
  kdf: KdfParams,
): Promise<string> {
  const { rawHash } = await Argon2(master, saltHex, {
    hashLength: kdf.hashLength,
    memory: kdf.memory,
    iterations: kdf.iterations,
    parallelism: kdf.parallelism,
    mode: kdf.mode as 'argon2id',
    saltEncoding: 'hex',
  });
  return Buffer.from(rawHash, 'hex').toString('base64');
}

/** Encrypt the whole vault into an in-memory blob (encoded to .ltvault by the caller). */
export async function encryptVault(
  data: Vault,
  master: string,
): Promise<VaultBlob> {
  const salt = Buffer.from(fillRandom(new Uint8Array(16))).toString('hex');
  const key = await deriveKey(master, salt, KDF_PARAMS);

  const plaintext = JSON.stringify(data);
  // inBinary=false: plaintext is a UTF-8 string. Returns { iv, tag } as hex, content as base64.
  const { iv, tag, content } = await AesGcmCrypto.encrypt(plaintext, false, key);

  return { v: VAULT_VERSION, kdf: { ...KDF_PARAMS }, salt, iv, tag, content };
}

/**
 * Decrypt a blob back into a v2 Vault.
 * Throws on a wrong passphrase or any tampering (the GCM tag check fails).
 * Legacy v1 payloads are migrated transparently by toVault(). Errors are
 * normalized so nothing about the passphrase or key can leak.
 */
export async function decryptVault(
  blob: VaultBlob,
  master: string,
): Promise<Vault> {
  let plaintext: string;
  try {
    const kdf = blob.kdf ?? KDF_PARAMS;
    const key = await deriveKey(master, blob.salt, kdf);
    plaintext = await AesGcmCrypto.decrypt(
      blob.content,
      key,
      blob.iv,
      blob.tag,
      false,
    );
  } catch {
    throw new Error('Decryption failed: wrong passphrase or corrupted vault.');
  }
  // Parsing/migration is outside the crypto try/catch so a decrypt success is
  // never misreported as a passphrase failure.
  return toVault(JSON.parse(plaintext));
}
