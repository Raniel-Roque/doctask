import { Buffer } from "buffer";

// Check if Web Crypto API is available
function checkCryptoAvailability() {
  if (!window.crypto || !window.crypto.subtle) {
    throw new Error(
      "Web Crypto API is not available. This feature requires a secure context (HTTPS) or localhost. " +
        "Please ensure you're running the application in a secure environment.",
    );
  }
}

// Generate a random encryption key
export async function generateEncryptionKey(): Promise<CryptoKey> {
  checkCryptoAvailability();
  return await window.crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"],
  );
}

// Export the key to a string format that can be stored
export async function exportKey(key: CryptoKey): Promise<string> {
  checkCryptoAvailability();
  const exported = await window.crypto.subtle.exportKey("raw", key);
  return Buffer.from(exported).toString("base64");
}

// Import a key from a string format
export async function importKey(keyString: string): Promise<CryptoKey> {
  checkCryptoAvailability();
  const keyData = Buffer.from(keyString, "base64");
  return await window.crypto.subtle.importKey(
    "raw",
    keyData,
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"],
  );
}

// Encrypt data using AES-GCM
export async function encryptData<T>(data: T, key: CryptoKey): Promise<string> {
  checkCryptoAvailability();
  const encoder = new TextEncoder();
  const dataString = JSON.stringify(data);
  const dataBuffer = encoder.encode(dataString);

  // Generate a random IV
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  // Encrypt the data
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    dataBuffer,
  );

  // Combine IV and encrypted data
  const result = new Uint8Array(iv.length + encryptedBuffer.byteLength);
  result.set(iv);
  result.set(new Uint8Array(encryptedBuffer), iv.length);

  return Buffer.from(result).toString("base64");
}

// Decrypt data using AES-GCM
export async function decryptData<T>(
  encryptedData: string,
  key: CryptoKey,
): Promise<T> {
  checkCryptoAvailability();
  const encryptedBuffer = Buffer.from(encryptedData, "base64");

  // Extract IV and encrypted data
  const iv = encryptedBuffer.slice(0, 12);
  const data = encryptedBuffer.slice(12);

  // Decrypt the data
  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: new Uint8Array(iv),
    },
    key,
    new Uint8Array(data),
  );

  // Convert back to string and parse JSON
  const decoder = new TextDecoder();
  const decryptedString = decoder.decode(decryptedBuffer);
  return JSON.parse(decryptedString) as T;
}
