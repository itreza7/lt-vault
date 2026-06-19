/**
 * ltvault — the Larateam Vault container format (.ltvault).
 *
 * The encrypted vault is NEVER persisted or exported as JSON. Instead the
 * already-encrypted parts (salt / iv / tag / ciphertext + KDF parameters) are
 * packed into a compact binary frame, base64-armored, and wrapped between
 * BEGIN/END banners. The artifact is opaque ciphertext end to end — "encrypted
 * by itself" — and carries everything decryptVault needs, with a magic number
 * and version so the format can evolve without ambiguity.
 *
 * Binary frame (all integers big-endian):
 *   "LTVT"        4 bytes   magic
 *   u8            1 byte    container version (= 1)
 *   u8            1 byte    KDF id (1 = argon2id)
 *   u32           4 bytes   Argon2 memory (KiB)
 *   u32           4 bytes   Argon2 iterations
 *   u8            1 byte    Argon2 parallelism
 *   u8            1 byte    derived-key length (bytes)
 *   u8 + bytes              salt   (length-prefixed)
 *   u8 + bytes              iv     (length-prefixed)
 *   u8 + bytes              tag    (length-prefixed)
 *   u32 + bytes             ciphertext (length-prefixed)
 *
 * Text armor (what actually lands in storage / a .ltvault file):
 *   -----BEGIN LARATEAM VAULT-----
 *   <base64 of the binary frame, wrapped at 64 cols>
 *   -----END LARATEAM VAULT-----
 *
 * This module imports nothing but Buffer — no crypto, no I/O. It only reshapes
 * data that is already encrypted, so it can leak nothing.
 */

/* eslint-disable no-bitwise */ // binary framing needs byte-level bit ops.
import { Buffer } from 'buffer';
import type { VaultBlob, KdfParams } from './vaultCrypto';

export const LTVAULT_EXT = 'ltvault';
export const MAGIC = 'LTVT';
export const CONTAINER_VERSION = 1;
const KDF_ARGON2ID = 1;

const BEGIN = '-----BEGIN LARATEAM VAULT-----';
const END = '-----END LARATEAM VAULT-----';

/** Cheap sniff: does this text look like a .ltvault container (vs legacy JSON)? */
export function looksLikeContainer(text: string): boolean {
  return text.trimStart().startsWith(BEGIN);
}

function writeU32(buf: Buffer, offset: number, n: number): void {
  buf.writeUInt32BE(n >>> 0, offset);
}

/** Encode a VaultBlob into the armored .ltvault text container. */
export function encodeContainer(blob: VaultBlob): string {
  const salt = Buffer.from(blob.salt, 'hex');
  const iv = Buffer.from(blob.iv, 'hex');
  const tag = Buffer.from(blob.tag, 'hex');
  const content = Buffer.from(blob.content, 'base64');
  const kdf = blob.kdf;

  const header = Buffer.alloc(4 + 1 + 1 + 4 + 4 + 1 + 1);
  header.write(MAGIC, 0); // MAGIC is ASCII; default utf8 encodes identically
  header.writeUInt8(CONTAINER_VERSION, 4);
  header.writeUInt8(KDF_ARGON2ID, 5);
  writeU32(header, 6, kdf.memory);
  writeU32(header, 10, kdf.iterations);
  header.writeUInt8(kdf.parallelism & 0xff, 14);
  header.writeUInt8(kdf.hashLength & 0xff, 15);

  const saltLen = Buffer.from([salt.length & 0xff]);
  const ivLen = Buffer.from([iv.length & 0xff]);
  const tagLen = Buffer.from([tag.length & 0xff]);
  const contentLen = Buffer.alloc(4);
  writeU32(contentLen, 0, content.length);

  const frame = Buffer.concat([
    header,
    saltLen,
    salt,
    ivLen,
    iv,
    tagLen,
    tag,
    contentLen,
    content,
  ]);

  const b64 = frame.toString('base64');
  const wrapped = b64.replace(/(.{64})/g, '$1\n').replace(/\n$/, '');
  return `${BEGIN}\n${wrapped}\n${END}\n`;
}

/**
 * Decode an armored .ltvault container back into a VaultBlob.
 * Throws a clear, non-leaking Error if the bytes are not a valid container;
 * callers surface "not a Larateam Vault backup" to the user.
 */
export function decodeContainer(text: string): VaultBlob {
  const trimmed = text.trim();
  if (!trimmed.startsWith(BEGIN) || !trimmed.endsWith(END)) {
    throw new Error('Not a Larateam Vault container.');
  }
  const body = trimmed
    .slice(BEGIN.length, trimmed.length - END.length)
    .replace(/\s+/g, '');

  let frame: Buffer;
  try {
    frame = Buffer.from(body, 'base64');
  } catch {
    throw new Error('Larateam Vault container is corrupted.');
  }

  if (frame.length < 16 || frame.toString('ascii', 0, 4) !== MAGIC) {
    throw new Error('Not a Larateam Vault container.');
  }
  const containerVersion = frame.readUInt8(4);
  if (containerVersion !== CONTAINER_VERSION) {
    throw new Error(`Unsupported .ltvault version (${containerVersion}).`);
  }
  if (frame.readUInt8(5) !== KDF_ARGON2ID) {
    throw new Error('Unsupported key-derivation in .ltvault container.');
  }

  const kdf: KdfParams = {
    memory: frame.readUInt32BE(6),
    iterations: frame.readUInt32BE(10),
    parallelism: frame.readUInt8(14),
    hashLength: frame.readUInt8(15),
    mode: 'argon2id',
  };

  let off = 16;
  // subarray() on the buffer polyfill is typed as Uint8Array; callers wrap with
  // Buffer.from before re-encoding, so that is fine.
  const readChunk = (lenBytes: 1 | 4): Uint8Array => {
    if (off + lenBytes > frame.length) {
      throw new Error('Larateam Vault container is truncated.');
    }
    const len = lenBytes === 1 ? frame.readUInt8(off) : frame.readUInt32BE(off);
    off += lenBytes;
    if (off + len > frame.length) {
      throw new Error('Larateam Vault container is truncated.');
    }
    const chunk = frame.subarray(off, off + len);
    off += len;
    return chunk;
  };

  const salt = readChunk(1);
  const iv = readChunk(1);
  const tag = readChunk(1);
  const content = readChunk(4);

  return {
    v: containerVersion,
    kdf,
    salt: Buffer.from(salt).toString('hex'),
    iv: Buffer.from(iv).toString('hex'),
    tag: Buffer.from(tag).toString('hex'),
    content: Buffer.from(content).toString('base64'),
  };
}
