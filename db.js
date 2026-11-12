// Kleine IndexedDB-Schicht: Metadaten, Notizbücher und Assets (Bilder/PDF-Seiten) getrennt,
// damit beim Speichern während des Schreibens nicht jedes Mal alle Bilder kopiert werden.

const DB_NAME = 'jelly-notes';
const VERSION = 1;
let dbPromise = null;

function open() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, VERSION);
      req.onupgradeneeded = () => {
        const d = req.result;
        d.createObjectStore('meta', { keyPath: 'id' });
        d.createObjectStore('notebooks', { keyPath: 'id' });
        const assets = d.createObjectStore('assets', { keyPath: 'id' });
        assets.createIndex('nb', 'nb');
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

function done(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

const req2p = (r) => new Promise((resolve, reject) => {
  r.onsuccess = () => resolve(r.result);
  r.onerror = () => reject(r.error);
});

export const db = {
  async listMeta() {
    const d = await open();
    return req2p(d.transaction('meta').objectStore('meta').getAll());
  },

  async loadNotebook(id) {
    const d = await open();
    const tx = d.transaction(['notebooks', 'assets']);
    const nb = await req2p(tx.objectStore('notebooks').get(id));
    if (!nb) return null;
    const rows = await req2p(tx.objectStore('assets').index('nb').getAll(id));
    nb.assets = {};
    for (const r of rows) nb.assets[r.key] = r.data;
    return nb;
  },

  /** Speichert Notizbuch + Metadaten; `assetKeys` = nur die noch nicht gespeicherten Assets. */
  async saveNotebook(nb, meta, assetKeys = []) {
    const d = await open();
    const tx = d.transaction(['notebooks', 'meta', 'assets'], 'readwrite');
    const { assets, ...rest } = nb;
    tx.objectStore('notebooks').put(rest);
    tx.objectStore('meta').put(meta);
    const as = tx.objectStore('assets');
    for (const key of assetKeys) {
      if (assets[key]) as.put({ id: nb.id + ':' + key, nb: nb.id, key, data: assets[key] });
    }
    return done(tx);
  },

  async deleteAssets(nbId, keys) {
    if (!keys.length) return;
    const d = await open();
    const tx = d.transaction('assets', 'readwrite');
    for (const k of keys) tx.objectStore('assets').delete(nbId + ':' + k);
    return done(tx);
  },

  async deleteNotebook(id) {
    const d = await open();
    const tx = d.transaction(['notebooks', 'meta', 'assets'], 'readwrite');
    tx.objectStore('notebooks').delete(id);
    tx.objectStore('meta').delete(id);
    const keys = await req2p(tx.objectStore('assets').index('nb').getAllKeys(id));
    for (const k of keys) tx.objectStore('assets').delete(k);
    return done(tx);
  },
};
