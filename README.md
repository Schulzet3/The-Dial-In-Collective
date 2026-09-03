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

A published Claude Artifact version of this app — with real shared community
storage and photo-based autofill wired to the Artifacts runtime instead —
is available separately; ask for the link if you don't have it.
