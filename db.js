// Kleine IndexedDB-Schicht: Metadaten, Notizbücher und Assets (Bilder/PDF-Seiten) getrennt,
// damit beim Speichern während des Schreibens nicht jedes Mal alle Bilder kopiert werden.

const DB_NAME = 'jelly-notes';
const VERSION = 2;
let dbPromise = null;

function open() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, VERSION);
      req.onupgradeneeded = () => {
        const d = req.result;
        const has = (n) => d.objectStoreNames.contains(n);
        if (!has('meta')) d.createObjectStore('meta', { keyPath: 'id' });
        if (!has('notebooks')) d.createObjectStore('notebooks', { keyPath: 'id' });
        if (!has('assets')) d.createObjectStore('assets', { keyPath: 'id' }).createIndex('nb', 'nb');
        if (!has('folders')) d.createObjectStore('folders', { keyPath: 'id' }); // ab Version 2
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

  async listFolders() {
    const d = await open();
    return req2p(d.transaction('folders').objectStore('folders').getAll());
  },

  async saveFolder(folder) {
    const d = await open();
    const tx = d.transaction('folders', 'readwrite');
    tx.objectStore('folders').put(folder);
    return done(tx);
  },

  async deleteFolder(id) {
    const d = await open();
    const tx = d.transaction('folders', 'readwrite');
    tx.objectStore('folders').delete(id);
    return done(tx);
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

  /** Ändert Titel/Cover, ohne die Bilder des Notizbuchs zu laden. */
  async patchNotebook(id, patch) {
    const d = await open();
    const tx = d.transaction(['notebooks', 'meta'], 'readwrite');
    const nb = await req2p(tx.objectStore('notebooks').get(id));
    const meta = await req2p(tx.objectStore('meta').get(id));
    if (nb) tx.objectStore('notebooks').put(Object.assign(nb, patch));
    // Favorit setzen ändert nicht das Bearbeitungsdatum
    const stamp = Object.keys(patch).every((k) => k === 'favorite' || k === 'trashed') ? {} : { updatedAt: Date.now() };
    if (meta) tx.objectStore('meta').put(Object.assign(meta, patch, stamp));
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
