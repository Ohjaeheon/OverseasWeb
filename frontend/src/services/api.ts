import axios from 'axios';
import forge from 'node-forge';

async function decryptData(ciphertextBase64: string, password: string): Promise<string> {
  const combined = new Uint8Array(atob(ciphertextBase64).split("").map(c => c.charCodeAt(0)));
  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const encrypted = combined.slice(28);
  
  if (window.crypto && window.crypto.subtle) {
    try {
      const enc = new TextEncoder();
      const pbkdf2Key = await window.crypto.subtle.importKey(
        "raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveKey"]
      );
      const key = await window.crypto.subtle.deriveKey(
        { name: "PBKDF2", salt: salt, iterations: 100000, hash: "SHA-256" },
        pbkdf2Key, { name: "AES-GCM", length: 256 }, false, ["decrypt"]
      );
      const decrypted = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv }, key, encrypted
      );
      return new TextDecoder().decode(decrypted);
    } catch (err) {
      console.warn("Native subtle decrypt failed, falling back to node-forge:", err);
    }
  }
  
  // Fallback to node-forge decryption
  const binaryString = atob(ciphertextBase64);
  const saltBytes = binaryString.slice(0, 16);
  const ivBytes = binaryString.slice(16, 28);
  const encryptedAndTagBytes = binaryString.slice(28);
  
  const ciphertextBytes = encryptedAndTagBytes.slice(0, encryptedAndTagBytes.length - 16);
  const tagBytes = encryptedAndTagBytes.slice(encryptedAndTagBytes.length - 16);
  
  const derivedKeyBytes = forge.pkcs5.pbkdf2(
    password, 
    saltBytes, 
    100000, 
    32, 
    forge.md.sha256.create()
  );
  
  const decipher = forge.cipher.createDecipher('AES-GCM', derivedKeyBytes);
  decipher.start({
    iv: ivBytes,
    tag: forge.util.createBuffer(tagBytes)
  });
  decipher.update(forge.util.createBuffer(ciphertextBytes));
  const success = decipher.finish();
  if (!success) {
    throw new Error("Forge decryption failed (auth tag mismatch)");
  }
  
  return forge.util.decodeUtf8(decipher.output.getBytes());
}

async function encryptData(plaintext: string, password: string): Promise<string> {
  if (window.crypto && window.crypto.subtle) {
    try {
      const enc = new TextEncoder();
      const salt = window.crypto.getRandomValues(new Uint8Array(16));
      const pbkdf2Key = await window.crypto.subtle.importKey(
        "raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveKey"]
      );
      const key = await window.crypto.subtle.deriveKey(
        { name: "PBKDF2", salt: salt, iterations: 100000, hash: "SHA-256" },
        pbkdf2Key, { name: "AES-GCM", length: 256 }, false, ["encrypt"]
      );
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const encrypted = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv }, key, enc.encode(plaintext)
      );
      const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
      combined.set(salt, 0);
      combined.set(iv, salt.length);
      combined.set(new Uint8Array(encrypted), salt.length + iv.length);
      
      let binary = "";
      combined.forEach(b => {
        binary += String.fromCharCode(b);
      });
      return btoa(binary);
    } catch (err) {
      console.warn("Native subtle encrypt failed, falling back to node-forge:", err);
    }
  }
  
  // Fallback to node-forge encryption
  const salt = forge.random.getBytesSync(16);
  const iv = forge.random.getBytesSync(12);
  
  const derivedKeyBytes = forge.pkcs5.pbkdf2(
    password,
    salt,
    100000,
    32,
    forge.md.sha256.create()
  );
  
  const cipher = forge.cipher.createCipher('AES-GCM', derivedKeyBytes);
  cipher.start({ iv: iv });
  cipher.update(forge.util.createBuffer(plaintext, 'utf8'));
  cipher.finish();
  
  const ciphertext = cipher.output.getBytes();
  const tag = cipher.mode.tag.getBytes();
  
  const combined = salt + iv + ciphertext + tag;
  return btoa(combined);
}

// Expose globally
(window as any).encryptData = encryptData;
(window as any).decryptData = decryptData;

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(async (response) => {
  if (response.data && response.data.encryptedData) {
    try {
      const decryptedStr = await decryptData(response.data.encryptedData, "만국소성");
      response.data = JSON.parse(decryptedStr);
    } catch (e) {
      console.error("Failed to decrypt API response:", e);
    }
  }
  return response;
});

export default api;
