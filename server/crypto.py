from Crypto.Cipher import AES
from Crypto.Util.Padding import unpad
import base64
import hashlib

def get_key(user_id, secret):
    raw = f'eliano-key-{user_id}-{secret}'
    return hashlib.sha256(raw.encode()).digest()  # 32 bytes

def decrypt_email(encrypted_b64, user_id, secret):
    data = base64.b64decode(encrypted_b64)
    iv = data[:16]
    ciphertext = data[16:]

    key = get_key(user_id, secret)
    cipher = AES.new(key, AES.MODE_CBC, iv)
    decrypted = cipher.decrypt(ciphertext)
    return unpad(decrypted, AES.block_size).decode('utf-8')

# Teste
user_id = 1
secret = 'default-secret'  # deve ser igual ao process.env.ENCRYPTION_SECRET ou o valor padrão

# Cole aqui o valor gerado no TS
encrypted_data = 'oaMSZG2Z7nxSMkUpBQVr9oOrVu3+5Y5aO/g3rdECUp4='  # exemplo: '9I5Mu3Ivg8HRKXLvU4TfCtv1CZ05xslrxKncz+NFFhA='
print(decrypt_email(encrypted_data, user_id, secret))
