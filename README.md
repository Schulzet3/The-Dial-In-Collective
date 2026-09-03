# The Dial In Collective

Espresso App

A persistent, community-tuned espresso dial-in journal. Log your equipment
and coffees, record shots against a five-axis taste read (extraction, body,
clarity, sweetness, astringency), and get a recipe engine that folds in
roast/style defaults, roaster-published recipes, and prior shots — yours and,
where storage supports it, the wider community's.

## Running it locally

```
npm install
npm run dev
```

Then open the printed local URL.

## About `src/DialInCollective.jsx`

This is the app's full source, unmodified from how it was originally built —
as a page for the Claude Artifacts runtime, which provides a `window.storage`
global (get/set/delete/list, each taking a `shared` flag) backed by a real
server, and access to Claude for the roaster-page/photo autofill feature.

Outside that runtime neither of those exist, so this scaffold adds just
enough to run the component in a normal browser:

- `src/storage-shim.js` — a `window.storage` polyfill backed by
  `localStorage`. It's per-browser only: there's no backend here to actually
  share "community" data between different people, so treat that side of the
  app as a personal sandbox in this build. Swapping in a real key-value
  backend behind the same four methods would restore genuine sharing.
- The "Autofill Details" feature (reading a roaster's URL or a photo) calls
  the Anthropic API directly from the browser. It works if you add your own
  API key under Settings → AI Autofill Access; there's no session-provided
  fallback outside the Artifacts runtime.

## Published Artifact version

https://claude.ai/code/artifact/a0f33b89-9214-44b7-8132-78d3594612ac

A separate, standalone build of the same app, published as a Claude Artifact
so it needs no install step and gets real shared community storage. It
differs from `src/DialInCollective.jsx` in a few ways forced by what a
published Artifact page can and can't do:

- **Community storage is real** — the Artifact's `db` capability backs the
  shared recipe-aggregate buckets, so "the community's" data in that build
  actually is shared across everyone who opens it (equipment, coffees, and
  shot history stay private to each viewer's browser, same as this build).
- **Roaster-URL autofill is gone.** A published Artifact page can't fetch an
  arbitrary external URL, so reading a roaster's product page by link isn't
  possible there. The URL field still exists for saving a reference link.
- **Screenshot autofill still works**, using the Artifact `sample`
  capability (Claude on the viewer's own account) instead of a hand-built
  Anthropic API call — no API key needed, unlike this repo's build.
- Icons are inlined as plain SVG path data instead of importing
  `lucide-react`, since a published Artifact page can only load a script
  from a small CDN allowlist.
