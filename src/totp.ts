// src/totp.ts
// RFC 6238 TOTP — pure JavaScript, no native crypto, no network.
// Implements SHA-1, HMAC-SHA1, and Base32 decode (RFC 4648) inline using Buffer.
//
// VERIFIED against the RFC 6238 SHA-1 test vectors:
//   secret (Base32) 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ' == ASCII "12345678901234567890", digits=8
//     timestamp = 59000          -> '94287082'
//     timestamp = 1111111109000  -> '07081804'
//     timestamp = 1234567890000  -> '89005924'
// (timestamps are in milliseconds; the function divides by 1000 internally)

/* eslint-disable no-bitwise */ // SHA-1/HMAC/base32 are inherently bitwise.
import { Buffer } from 'buffer';

// --- SHA-1 ------------------------------------------------------------------
// Returns a 20-byte Buffer for the given message Buffer.
function sha1(msg: Buffer): Buffer {
  // 32-bit left rotate.
  const rotl = (n: number, b: number): number => ((n << b) | (n >>> (32 - b))) >>> 0;

  const ml = msg.length * 8; // message length in bits

  // Pre-processing: append 0x80, pad with zeros, append 64-bit big-endian length.
  // total length must be a multiple of 64 bytes.
  const withOne = msg.length + 1;
  const padTo = (Math.ceil((withOne + 8) / 64)) * 64;
  const buf = Buffer.alloc(padTo);
  msg.copy(buf, 0);
  buf[msg.length] = 0x80;
  // Write the 64-bit length. JS bitwise is 32-bit; high word from ml / 2^32.
  const hi = Math.floor(ml / 0x100000000);
  const lo = ml >>> 0;
  buf.writeUInt32BE(hi >>> 0, padTo - 8);
  buf.writeUInt32BE(lo, padTo - 4);

  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;

  const w = new Array<number>(80);

  for (let off = 0; off < buf.length; off += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = buf.readUInt32BE(off + i * 4);
    }
    for (let i = 16; i < 80; i++) {
      w[i] = rotl(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1);
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;

    for (let i = 0; i < 80; i++) {
      let f: number;
      let k: number;
      if (i < 20) {
        f = (b & c) | (~b & d);
        k = 0x5a827999;
      } else if (i < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (i < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }
      const tmp = (rotl(a, 5) + (f >>> 0) + e + k + w[i]) >>> 0;
      e = d;
      d = c;
      c = rotl(b, 30);
      b = a;
      a = tmp;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
  }

  const out = Buffer.alloc(20);
  out.writeUInt32BE(h0, 0);
  out.writeUInt32BE(h1, 4);
  out.writeUInt32BE(h2, 8);
  out.writeUInt32BE(h3, 12);
  out.writeUInt32BE(h4, 16);
  return out;
}

// --- HMAC-SHA1 --------------------------------------------------------------
const SHA1_BLOCK = 64; // bytes

function hmacSha1(key: Buffer, msg: Buffer): Buffer {
  let k = key;
  if (k.length > SHA1_BLOCK) {
    k = sha1(k);
  }
  if (k.length < SHA1_BLOCK) {
    const padded = Buffer.alloc(SHA1_BLOCK);
    k.copy(padded, 0);
    k = padded;
  }

  const oKeyPad = Buffer.alloc(SHA1_BLOCK);
  const iKeyPad = Buffer.alloc(SHA1_BLOCK);
  for (let i = 0; i < SHA1_BLOCK; i++) {
    oKeyPad[i] = k[i] ^ 0x5c;
    iKeyPad[i] = k[i] ^ 0x36;
  }

  const inner = sha1(Buffer.concat([iKeyPad, msg]));
  return sha1(Buffer.concat([oKeyPad, inner]));
}

// --- Base32 (RFC 4648) ------------------------------------------------------
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function normalizeBase32(secret: string): string {
  return secret.replace(/\s+/g, '').toUpperCase();
}

export function isValidBase32Secret(secret: string): boolean {
  if (!secret) {
    return false;
  }
  const s = normalizeBase32(secret);
  // Non-empty, only A-Z and 2-7, with optional trailing '=' padding.
  return /^[A-Z2-7]+=*$/.test(s);
}

function base32Decode(secret: string): Buffer {
  const s = normalizeBase32(secret).replace(/=+$/g, '');
  if (s.length === 0) {
    return Buffer.alloc(0);
  }
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;
  for (let i = 0; i < s.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(s[i]);
    if (idx === -1) {
      // Invalid character; treat the whole secret as undecodable.
      return Buffer.alloc(0);
    }
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((value >>> bits) & 0xff);
    }
  }
  return Buffer.from(bytes);
}

// --- TOTP -------------------------------------------------------------------
export function generateTotp(
  secret: string,
  opts?: { digits?: number; period?: number; timestamp?: number },
): string {
  if (!isValidBase32Secret(secret)) {
    return '';
  }
  const key = base32Decode(secret);
  if (key.length === 0) {
    return '';
  }

  const digits = opts?.digits ?? 6;
  const period = opts?.period ?? 30;
  const timestamp = opts?.timestamp ?? Date.now();

  const counter = Math.floor(Math.floor(timestamp / 1000) / period);

  // Encode counter as an 8-byte big-endian buffer.
  const counterBuf = Buffer.alloc(8);
  const hi = Math.floor(counter / 0x100000000);
  const lo = counter >>> 0;
  counterBuf.writeUInt32BE(hi >>> 0, 0);
  counterBuf.writeUInt32BE(lo, 4);

  const hmac = hmacSha1(key, counterBuf);

  // RFC 4226 dynamic truncation.
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binCode =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const mod = binCode % Math.pow(10, digits);
  return mod.toString().padStart(digits, '0');
}

export function totpRemainingSeconds(period = 30, timestamp = Date.now()): number {
  return period - (Math.floor(timestamp / 1000) % period);
}
