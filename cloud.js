// Benutzerkonten und Cloud-Speicher über Supabase.
// Bietet dieselbe Schnittstelle wie db.js, damit app.js zwischen lokal und Cloud wechseln kann.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const cloudConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

const BUCKET = 'assets';
let sb = null;
let user = null;

function loadSdk() {
  if (window.supabase) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'vendor/supabase.js';
    s.onload = resolve;
    s.onerror = () => reject(new Error('Die Anmeldung konnte nicht geladen werden. Prüfe deine Internetverbindung.'));
    document.head.appendChild(s);
  });
}

function check({ data, error }) {
  if (error) throw error;
  return data;
}

const dataURLToBlob = async (u) => (await fetch(u)).blob();
const blobToDataURL = (b) => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(r.result);
  r.onerror = rej;
  r.readAsDataURL(b);
});
const assetPath = (nbId, key) => `${user.id}/${nbId}/${key}`;

function assetKeysOf(nb) {
  const keys = new Set();
  for (const p of nb.pages || []) {
    if (p.bg) keys.add(p.bg);
    for (const it of p.items || []) if (it.type === 'image') keys.add(it.asset);
  }
  return [...keys];
}

/** Führt fn für alle Elemente aus, höchstens `n` gleichzeitig. */
async function pool(items, n, fn) {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(n, queue.length) }, async () => {
    while (queue.length) await fn(queue.shift());
  });
  await Promise.all(workers);
}

export const auth = {
  /** Lädt Supabase und gibt die bestehende Sitzung zurück (oder null). */
  async init(onEvent) {
    await loadSdk();
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
    sb.auth.onAuthStateChange((event, session) => {
      user = session?.user || null;
      // Supabase empfiehlt, im Callback keine weiteren Supabase-Aufrufe abzuwarten
      setTimeout(() => onEvent(event, session), 0);
    });
    const { data } = await sb.auth.getSession();
    user = data.session?.user || null;
    return data.session;
  },
  get user() { return user; },
  async signIn(email, password) {
    const d = check(await sb.auth.signInWithPassword({ email, password }));
    user = d.user;
    return d;
  },
  async signUp(email, password) {
    const d = check(await sb.auth.signUp({
      email, password, options: { emailRedirectTo: location.origin + location.pathname },
    }));
    if (d.session) user = d.user;
    return d;
  },
  async resetPassword(email) {
    return check(await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname }));
  },
  async updatePassword(password) {
    return check(await sb.auth.updateUser({ password }));
  },
  async signOut() {
    await sb.auth.signOut();
    user = null;
  },
};

export const cloud = {
  async listMeta() {
    const rows = check(await sb.from('notebooks').select('meta'));
    return rows.map((r) => r.meta);
  },

  async listFolders() {
    const rows = check(await sb.from('folders').select('data'));
    return rows.map((r) => r.data);
  },

  async saveFolder(folder) {
    check(await sb.from('folders').upsert({ id: folder.id, user_id: user.id, data: folder, updated_at: new Date().toISOString() }));
  },

  async deleteFolder(id) {
    check(await sb.from('folders').delete().eq('id', id));
  },

  async loadNotebook(id) {
    const row = check(await sb.from('notebooks').select('data').eq('id', id).maybeSingle());
    if (!row) return null;
    const nb = row.data;
    nb.assets = {};
    await pool(assetKeysOf(nb), 6, async (k) => {
      const { data, error } = await sb.storage.from(BUCKET).download(assetPath(id, k));
      if (!error && data) nb.assets[k] = await blobToDataURL(data);
    });
    return nb;
  },

  async saveNotebook(nb, meta, assetKeys = []) {
    await pool(assetKeys.filter((k) => nb.assets[k]), 4, async (k) => {
      const blob = await dataURLToBlob(nb.assets[k]);
      check(await sb.storage.from(BUCKET).upload(assetPath(nb.id, k), blob, { upsert: true, contentType: blob.type }));
    });
    const { assets, ...data } = nb;
    check(await sb.from('notebooks').upsert({
      id: nb.id, user_id: user.id, meta, data, updated_at: new Date().toISOString(),
    }));
  },

  async patchNotebook(id, patch) {
    const row = check(await sb.from('notebooks').select('meta, data').eq('id', id).single());
    Object.assign(row.data, patch);
    const stamp = Object.keys(patch).every((k) => k === 'favorite' || k === 'trashed') ? {} : { updatedAt: Date.now() };
    Object.assign(row.meta, patch, stamp);
    check(await sb.from('notebooks').update({ meta: row.meta, data: row.data, updated_at: new Date().toISOString() }).eq('id', id));
  },

  async deleteAssets(nbId, keys) {
    if (!keys.length) return;
    check(await sb.storage.from(BUCKET).remove(keys.map((k) => assetPath(nbId, k))));
  },

  async deleteNotebook(id) {
    const row = check(await sb.from('notebooks').select('data').eq('id', id).maybeSingle());
    if (row) {
      const keys = assetKeysOf(row.data);
      if (keys.length) await sb.storage.from(BUCKET).remove(keys.map((k) => assetPath(id, k)));
    }
    check(await sb.from('notebooks').delete().eq('id', id));
  },
};
