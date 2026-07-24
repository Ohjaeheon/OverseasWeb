import axios from 'axios';

async function decryptData(ciphertextBase64: string, password: string): Promise<string> {
  const combined = new Uint8Array(atob(ciphertextBase64).split("").map(c => c.charCodeAt(0)));
  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const encrypted = combined.slice(28);
  
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
}

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
