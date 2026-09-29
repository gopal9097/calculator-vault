export class StorageService {
  constructor(dbName = 'c', dbVersion = 1) {
    this.dbName = dbName;
    this.dbVersion = dbVersion;
    this.db = null;
  }

  async getDb() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('h')) {
          db.createObjectStore('h');
        }
        if (!db.objectStoreNames.contains('f')) {
          db.createObjectStore('f');
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onerror = () => {
        reject(new Error(`Failed to open IndexedDB: ${request.error?.message}`));
      };
    });
  }

  async executeTx(storeName, mode, callback) {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      const resultHolder = callback(store);

      tx.oncomplete = () => {
        resolve(resultHolder ? resultHolder.result : undefined);
      };

      tx.onerror = () => {
        reject(tx.error);
      };
    });
  }

  async getHeader() {
    return this.executeTx('h', 'readonly', (store) => store.get('h'));
  }

  async saveHeader(header) {
    return this.executeTx('h', 'readwrite', (store) => store.put(header, 'h'));
  }

  async getSettings() {
    try {
      const s = await this.executeTx('h', 'readonly', (store) => store.get('settings'));
      return s || {
        theme: 'auto',
        sound: true,
        idleTimeout: 60,
        discreetTitle: 'Calculator'
      };
    } catch {
      return {
        theme: 'auto',
        sound: true,
        idleTimeout: 60,
        discreetTitle: 'Calculator'
      };
    }
  }

  async saveSettings(settings) {
    return this.executeTx('h', 'readwrite', (store) => store.put(settings, 'settings'));
  }

  async getAllFiles() {
    return this.executeTx('f', 'readonly', (store) => store.getAll());
  }

  async getFile(id) {
    return this.executeTx('f', 'readonly', (store) => store.get(id));
  }

  async saveFile(id, encryptedMetadata, encryptedData) {
    return this.executeTx('f', 'readwrite', (store) =>
      store.put({ id, m: encryptedMetadata, d: encryptedData }, id)
    );
  }

  async updateFileMetadata(id, updatedEncryptedMetadata) {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('f', 'readwrite');
      const store = tx.objectStore('f');
      const getReq = store.get(id);

      getReq.onsuccess = () => {
        const record = getReq.result;
        if (!record) {
          reject(new Error('File record not found'));
          return;
        }
        record.m = updatedEncryptedMetadata;
        store.put(record, id);
      };

      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }

  async deleteFile(id) {
    return this.executeTx('f', 'readwrite', (store) => store.delete(id));
  }

  async deleteMultipleFiles(ids) {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('f', 'readwrite');
      const store = tx.objectStore('f');
      ids.forEach((id) => store.delete(id));
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }

  async estimateStorageUsage() {
    if (navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        return {
          usage: estimate.usage || 0,
          quota: estimate.quota || 0
        };
      } catch {
        // Fallback
      }
    }
    return { usage: 0, quota: 0 };
  }

  async clearAll() {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['h', 'f'], 'readwrite');
      tx.objectStore('h').clear();
      tx.objectStore('f').clear();
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }
}
