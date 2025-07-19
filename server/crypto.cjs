"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.decryptEmail = exports.encryptEmail = void 0;
var crypto_js_1 = __importDefault(require("crypto-js"));
// Função que retorna uma chave de 32 bytes (256 bits) em formato Hex
var getEncryptionKey = function (userId) {
    var rawKey = "eliano-key-".concat(userId, "-").concat(process.env.ENCRYPTION_SECRET || 'default-secret');
    var hash = crypto_js_1.default.SHA256(rawKey); // Garante 256 bits
    return hash; // WordArray de 32 bytes
};
var encryptEmail = function (data, userId) {
    var key = getEncryptionKey(userId);
    var iv = crypto_js_1.default.lib.WordArray.random(16); // 16 bytes = 128 bits
    var encrypted = crypto_js_1.default.AES.encrypt(data, key, {
        iv: iv,
        mode: crypto_js_1.default.mode.CBC,
        padding: crypto_js_1.default.pad.Pkcs7,
    });
    var result = iv.concat(encrypted.ciphertext).toString(crypto_js_1.default.enc.Base64);
    return result;
};
exports.encryptEmail = encryptEmail;
var decryptEmail = function (encryptedData, userId) {
    try {
        if (!encryptedData || encryptedData.length < 24 || !/^[A-Za-z0-9+/=]+$/.test(encryptedData)) {
            return encryptedData;
        }
        var raw = crypto_js_1.default.enc.Base64.parse(encryptedData);
        var iv = crypto_js_1.default.lib.WordArray.create(raw.words.slice(0, 4), 16); // 4 words = 16 bytes
        var ciphertext = crypto_js_1.default.lib.WordArray.create(raw.words.slice(4), raw.sigBytes - 16);
        var key = getEncryptionKey(userId);
        var cipherParams = crypto_js_1.default.lib.CipherParams.create({ ciphertext: ciphertext });
        var decrypted = crypto_js_1.default.AES.decrypt(cipherParams, key, {
            iv: iv,
            mode: crypto_js_1.default.mode.CBC,
            padding: crypto_js_1.default.pad.Pkcs7,
        });
        return decrypted.toString(crypto_js_1.default.enc.Utf8);
    }
    catch (err) {
        console.error('Erro ao descriptografar:', err);
        return encryptedData;
    }
};
exports.decryptEmail = decryptEmail;
// Teste
var enc = (0, exports.encryptEmail)('teste', 1);
console.log('Encrypted:', enc);
console.log('Decrypted:', (0, exports.decryptEmail)(enc, 1));
