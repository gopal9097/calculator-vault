export class CryptoEngine {
  constructor() {
    this.subtle = window.crypto.subtle;
    this.masterKey = null;
    this.header = null;
  }

  randomBytes(n) {
    const bytes = new Uint8Array(n);
    window.crypto.getRandomValues(bytes);
    return bytes;
  }

  // Derive 256-bit key from passcode using PBKDF2 (600k rounds)
  async deriveKEK(passcode, salt, iterations = 600000) {
    const encoder = new TextEncoder();
    const baseKey = await this.subtle.importKey(
      'raw',
      encoder.encode(passcode),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return this.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations,
        hash: 'SHA-256'
      },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async encryptBuffer(key, buffer) {
    const iv = this.randomBytes(12);
    const ct = await this.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      buffer
    );
    return { iv, ct };
  }

  async decryptBuffer(key, encryptedObj) {
    return this.subtle.decrypt(
      { name: 'AES-GCM', iv: encryptedObj.iv },
      key,
      encryptedObj.ct
    );
  }

  async setupPasscode(passcode) {
    const salt = this.randomBytes(16);
    const iterations = 600000;
    const rawMK = this.randomBytes(32);

    const kek = await this.deriveKEK(passcode, salt, iterations);
    const wrappedMK = await this.encryptBuffer(kek, rawMK);

    this.masterKey = await this.subtle.importKey(
      'raw',
      rawMK,
      'AES-GCM',
      false,
      ['encrypt', 'decrypt']
    );

    rawMK.fill(0);

    this.header = {
      salt,
      it: iterations,
      w: wrappedMK,
      createdAt: Date.now()
    };

    return this.header;
  }

  async unlock(passcode, header) {
    if (!header || !header.salt || !header.w) {
      throw new Error('Vault is not initialized');
    }

    try {
      const kek = await this.deriveKEK(passcode, header.salt, header.it);
      const decryptedMK = await this.decryptBuffer(kek, header.w);
      const rawMK = new Uint8Array(decryptedMK);

      this.masterKey = await this.subtle.importKey(
        'raw',
        rawMK,
        'AES-GCM',
        false,
        ['encrypt', 'decrypt']
      );

      rawMK.fill(0);
      this.header = header;
      return true;
    } catch {
      return false;
    }
  }

  async encryptFileData(arrayBuffer) {
    if (!this.masterKey) throw new Error('Vault is locked');
    return this.encryptBuffer(this.masterKey, arrayBuffer);
  }

  async decryptFileData(encryptedData) {
    if (!this.masterKey) throw new Error('Vault is locked');
    return this.decryptBuffer(this.masterKey, encryptedData);
  }

  async encryptMetadata(metadataObj) {
    if (!this.masterKey) throw new Error('Vault is locked');
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(metadataObj));
    return this.encryptBuffer(this.masterKey, data);
  }

  async decryptMetadata(encryptedMetadata) {
    if (!this.masterKey) throw new Error('Vault is locked');
    const decryptedBuffer = await this.decryptBuffer(this.masterKey, encryptedMetadata);
    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(decryptedBuffer));
  }

  isUnlocked() {
    return this.masterKey !== null;
  }

  lock() {
    this.masterKey = null;
  }
}
