import CryptoJS from 'crypto-js';

// Função que retorna uma chave de 32 bytes (256 bits) em formato Hex
const getEncryptionKey = (userId: number): CryptoJS.lib.WordArray => {
  const rawKey = `eliano-key-${userId}-${process.env.ENCRYPTION_SECRET || 'default-secret'}`;
  const hash = CryptoJS.SHA256(rawKey); // Garante 256 bits
  return hash; // WordArray de 32 bytes
};

export const encryptEmail = (data: string, userId: number): string => {
  const key = getEncryptionKey(userId);
  const iv = CryptoJS.lib.WordArray.random(16); // 16 bytes = 128 bits

  const encrypted = CryptoJS.AES.encrypt(data, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  const result = iv.concat(encrypted.ciphertext).toString(CryptoJS.enc.Base64);
  return result;
};

export const decryptEmail = (encryptedData: string, userId: number): string => {
  try {
    if (!encryptedData || encryptedData.length < 24 || !/^[A-Za-z0-9+/=]+$/.test(encryptedData)) {
      return encryptedData;
    }
    const raw = CryptoJS.enc.Base64.parse(encryptedData);
    const iv = CryptoJS.lib.WordArray.create(raw.words.slice(0, 4), 16); // 4 words = 16 bytes
    const ciphertext = CryptoJS.lib.WordArray.create(raw.words.slice(4), raw.sigBytes - 16);

    const key = getEncryptionKey(userId);
    const cipherParams = CryptoJS.lib.CipherParams.create({ ciphertext });
    const decrypted = CryptoJS.AES.decrypt(cipherParams, key, {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (err) {
    console.error('Erro ao descriptografar:', err);
    return encryptedData;
  }
};