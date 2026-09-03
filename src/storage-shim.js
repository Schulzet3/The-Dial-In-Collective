// DialInCollective.jsx was written for the Claude Artifacts runtime, which
// exposes a `window.storage` global (get/set/delete/list, each taking a
// `shared` flag for community vs. personal data) backed by a real server.
// Outside that runtime there is no such global and no server, so this shim
// gives the app something to call in a plain browser build.
//
// It's backed by localStorage, which is per-browser only — there is no
// backend here to actually share data between different people, so `shared`
// data behaves like everyone's own private copy rather than a real
// community pool. The prefix keeps the two namespaces from colliding.
// A real deployment wanting genuine cross-user sharing needs a small
// key-value backend behind this same four-method interface.
const prefixFor = (shared) => (shared ? "dic:shared:" : "dic:personal:");

window.storage = {
  async get(key, shared = false) {
    const raw = localStorage.getItem(prefixFor(shared) + key);
    return raw === null ? null : { value: raw };
  },
  async set(key, value, shared = false) {
    localStorage.setItem(prefixFor(shared) + key, value);
  },
  async delete(key, shared = false) {
    localStorage.removeItem(prefixFor(shared) + key);
  },
  async list(prefix = "", shared = false) {
    const full = prefixFor(shared) + prefix;
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(full)) keys.push(k.slice(prefixFor(shared).length));
    }
    return { keys };
  },
};
