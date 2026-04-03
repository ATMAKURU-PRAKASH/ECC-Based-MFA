
// Utility functions for Web Crypto API operations

// Convert ArrayBuffer to Base64 string
export const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const binary = String.fromCharCode(...new Uint8Array(buffer));
  return window.btoa(binary);
};

// Convert Base64 string to ArrayBuffer
export const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binaryString = window.atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

// Generate ECDSA Key Pair (P-256)
export const generateECCKeyPair = async (): Promise<CryptoKeyPair> => {
  return await window.crypto.subtle.generateKey(
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    true,
    ["sign", "verify"]
  );
};

// Export Key to Base64 String
export const exportKey = async (key: CryptoKey): Promise<string> => {
  const format = key.type === "public" ? "spki" : "pkcs8";
  const exported = await window.crypto.subtle.exportKey(format, key);
  return arrayBufferToBase64(exported);
};

// Import Public Key from Base64 String
export const importPublicKey = async (base64Key: string): Promise<CryptoKey> => {
  const keyBuffer = base64ToArrayBuffer(base64Key);
  return await window.crypto.subtle.importKey(
    "spki",
    keyBuffer,
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    true,
    ["verify"]
  );
};

// Import Private Key from Base64 String
export const importPrivateKey = async (base64Key: string): Promise<CryptoKey> => {
  const keyBuffer = base64ToArrayBuffer(base64Key);
  return await window.crypto.subtle.importKey(
    "pkcs8",
    keyBuffer,
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    true,
    ["sign"]
  );
};

// Sign data with Private Key
export const signData = async (privateKey: CryptoKey, data: string): Promise<string> => {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const signature = await window.crypto.subtle.sign(
    {
      name: "ECDSA",
      hash: { name: "SHA-256" },
    },
    privateKey,
    dataBuffer
  );
  return arrayBufferToBase64(signature);
};

// Verify signature with Public Key
export const verifySignature = async (
  publicKey: CryptoKey,
  signatureBase64: string,
  data: string
): Promise<boolean> => {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const signatureBuffer = base64ToArrayBuffer(signatureBase64);
  
  return await window.crypto.subtle.verify(
    {
      name: "ECDSA",
      hash: { name: "SHA-256" },
    },
    publicKey,
    signatureBuffer,
    dataBuffer
  );
};

// Hash data using SHA-256
export const hashData = async (data: string): Promise<string> => {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", dataBuffer);
  return arrayBufferToBase64(hashBuffer);
};

// Encrypt data using AES-GCM (for securing private key storage if needed)
export const encryptAES = async (data: string, key: CryptoKey): Promise<{ iv: string; ciphertext: string }> => {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  const ciphertext = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    dataBuffer
  );

  return {
    iv: arrayBufferToBase64(iv.buffer),
    ciphertext: arrayBufferToBase64(ciphertext),
  };
};
