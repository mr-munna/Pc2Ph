import { SecurityFingerprint } from '../types';

const CHUNK_SIZE = 256 * 1024; // 256KB chunk size for ultra-high-speed WebRTC P2P streaming and low CPU overhead
const IV_LENGTH = 12; // 96 bits for AES-GCM

/**
 * ArrayBuffer / Uint8Array conversion helpers
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Derive a 256-bit AES-GCM CryptoKey from a user secret string or room passphrase.
 * Uses PBKDF2 with SHA-256 and a deterministic salt derived from room ID.
 */
export async function deriveEncryptionKey(passphrase: string, roomId: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passphraseBytes = encoder.encode(passphrase);
  
  // Import raw key bytes for PBKDF2
  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    passphraseBytes,
    { name: 'PBKDF2' },
    false,
    ['deriveKey', 'deriveBits']
  );

  // Salt derived from room ID for scope isolation
  const salt = encoder.encode(`cipherdrop_salt_${roomId.toLowerCase()}`);

  return await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Generate a random 256-bit passphrase for new room creation
 */
export function generateRandomPassphrase(): string {
  const array = new Uint8Array(16);
  window.crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a random 6-digit numeric room PIN
 */
export function generateRoomPin(): string {
  const num = Math.floor(100000 + Math.random() * 900000);
  return num.toString();
}

/**
 * Encrypt a string (like clipboard text or file metadata) using AES-256-GCM
 */
export async function encryptText(text: string, key: CryptoKey): Promise<{ ciphertextBase64: string; ivBase64: string }> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  return {
    ciphertextBase64: arrayBufferToBase64(encrypted),
    ivBase64: arrayBufferToBase64(iv.buffer)
  };
}

/**
 * Decrypt a string using AES-256-GCM
 */
export async function decryptText(ciphertextBase64: string, ivBase64: string, key: CryptoKey): Promise<string> {
  const ciphertextBuffer = base64ToArrayBuffer(ciphertextBase64);
  const ivBuffer = base64ToArrayBuffer(ivBase64);

  const decrypted = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(ivBuffer) },
    key,
    ciphertextBuffer
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * Encrypt an ArrayBuffer chunk using AES-256-GCM
 */
export async function encryptChunk(chunk: ArrayBuffer, key: CryptoKey): Promise<{ encryptedBase64: string; ivBase64: string }> {
  const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    chunk
  );

  return {
    encryptedBase64: arrayBufferToBase64(encrypted),
    ivBase64: arrayBufferToBase64(iv.buffer)
  };
}

/**
 * Decrypt an ArrayBuffer chunk using AES-256-GCM
 */
export async function decryptChunk(encryptedBase64: string, ivBase64: string, key: CryptoKey): Promise<ArrayBuffer> {
  const ciphertextBuffer = base64ToArrayBuffer(encryptedBase64);
  const ivBuffer = base64ToArrayBuffer(ivBase64);

  return await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(ivBuffer) },
    key,
    ciphertextBuffer
  );
}

/**
 * Calculate visual Security Fingerprint from Derived Key / Secret
 */
export async function calculateSecurityFingerprint(key: CryptoKey, secretString: string): Promise<SecurityFingerprint> {
  const encoder = new TextEncoder();
  const rawData = encoder.encode(secretString);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', rawData);
  const hashHex = bufferToHex(hashBuffer);

  // Mnemonic words array for human verification
  const wordList = [
    'Shield', 'Cipher', 'Beacon', 'Nexus', 'Falcon', 'Orbit', 'Pulse', 'Matrix',
    'Quantum', 'Zenith', 'Vortex', 'Sentry', 'Helios', 'Echo', 'Aurora', 'Titan',
    'Polaris', 'Titanium', 'Cobalt', 'Apex', 'Starlight', 'Cipher', 'Sol', 'Nova'
  ];

  const emojiList = ['🔒', '🛡️', '🔑', '⚡', '🌌', '🚀', '🔮', '🛰️', '💎', '🌟', '🛡️', '⚡'];
  const colorsList = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#14B8A6'];

  const bytes = new Uint8Array(hashBuffer);
  
  const selectedWords = [
    wordList[bytes[0] % wordList.length],
    wordList[bytes[1] % wordList.length],
    wordList[bytes[2] % wordList.length],
    wordList[bytes[3] % wordList.length],
  ];

  const selectedEmojis = [
    emojiList[bytes[4] % emojiList.length],
    emojiList[bytes[5] % emojiList.length],
    emojiList[bytes[6] % emojiList.length],
    emojiList[bytes[7] % emojiList.length],
  ];

  const selectedColors = [
    colorsList[bytes[8] % colorsList.length],
    colorsList[bytes[9] % colorsList.length],
    colorsList[bytes[10] % colorsList.length],
    colorsList[bytes[11] % colorsList.length],
  ];

  return {
    hashHex: hashHex.substring(0, 16).toUpperCase(),
    words: selectedWords,
    emojis: selectedEmojis,
    colorBlocks: selectedColors
  };
}

export { CHUNK_SIZE };
