import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Coffee, Settings, Plus, X, Check, Clock, Thermometer, Scale,
  Sparkles, History, Gauge, AlertTriangle, Link as LinkIcon, Users, Zap, Database, Sun, Moon, Store, Image as ImageIcon, BookOpen, Heart, ChevronDown, Droplet, Droplets
} from "lucide-react";

/* ---------------------------------------------------------------
   The Dial In Collective — a persistent, community-tuned espresso dial in journal
   Community learning is layered across independent buckets:
     exact coffee → roast+style
------------------------------------------------------------------ */

const FONT_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
`;

/* Palettes live in CSS variables so light and dark stay in lockstep. */
const THEME_CSS = `
.sc-root, .sc-root *, .sc-portal {
  --sc-cream: #F3ECE0;
  --sc-cream-deep: #EAE0CE;
  --sc-espresso: #2B1B14;
  --sc-espresso-soft: #4A3527;
  --sc-copper: #B8703F;
  --sc-copper-text: #814E2C;
  --sc-on-blue-mid: #FFFFFF;
  --sc-copper-soft: #D99361;
  --sc-blue-xdark: #1E3548;
  --sc-blue-dark: #2F5574;
  --sc-blue-mid: #41759F;
  --sc-blue-light: #6E9DC4;
  --sc-blue-xlight: #A1BFD9;
  --sc-gold: #D9A857;
  --sc-bitter: #7A2E3D;
  --sc-line: #DECDB8;
  --sc-compass-grid: #DECDB8;
  --sc-disabled-text: #1A120D;
  --sc-line-soft: #E4D8C4;
  --sc-surface: #FFFFFF;
  --sc-overlay: rgba(43, 27, 20, 0.4);
  --sc-ink: #1A120D;
  --sc-r1: #50983E;
  --sc-dialed: #50983E;
  --sc-r2: #EDC31D;
  --sc-r3: #EC9213;
  --sc-r4: #DF5920;
  --sc-r5: #A5221D;
}
.sc-root[data-theme="dark"], .sc-root[data-theme="dark"] * {
  --sc-cream: #171009;
  --sc-cream-deep: #241A12;
  --sc-espresso: #F2E8DA;
  --sc-espresso-soft: #F0EAE0;
  --sc-copper: #E0904F;
  --sc-copper-text: #E0904F;
  --sc-on-blue-mid: #1A120D;
  --sc-copper-soft: #C87F45;
  --sc-blue-xdark: #2C506D;
  --sc-blue-dark: #3E7098;
  --sc-blue-mid: #588FBB;
  --sc-blue-light: #92B6D3;
  --sc-blue-xlight: #BED3E4;
  --sc-gold: #E5BC6B;
  --sc-bitter: #C4606F;
  --sc-line: #3A2A1E;
  --sc-compass-grid: #8A7360;
  --sc-disabled-text: #FFFFFF;
  --sc-line-soft: #2E2118;
  --sc-surface: #1F1710;
  --sc-overlay: rgba(0, 0, 0, 0.65);
  --sc-ink: #1A120D;
  --sc-r1: #6CBB58;
  --sc-dialed: #6CBB58;
  --sc-r2: #EFCB39;
  --sc-r3: #EFA339;
  --sc-r4: #E47444;
  --sc-r5: #C72923;
}
.sc-root input, .sc-root select, .sc-root textarea { color-scheme: light dark; }
.sc-root[data-theme="dark"] input::placeholder,
.sc-root[data-theme="dark"] textarea::placeholder { color: #7A6A59; }

/* Modals must always fit on screen and scroll internally rather than push
   their own buttons off the bottom of the viewport. vh is unreliable on
   mobile browsers with dynamic address bars, so dvh (actual visible area)
   overrides it in browsers that support it; vh remains the fallback. */
.sc-modal-panel {
  max-height: 90vh;
  max-height: 90dvh;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

/* The root's background has to cover the whole viewport, not just however
   tall its own content happens to be — otherwise a short coffee list on a
   tall screen leaves the page's own (white) background showing below it.
   A fixed pixel minimum can never guarantee that on an arbitrary screen
   size, so this uses the real viewport height instead, with the same
   vh/dvh fallback as the modal rule above. */
.sc-fill-viewport {
  min-height: 100vh;
  min-height: 100dvh;
}

/* A real type-scale bump, applied once here rather than by editing the ~64
   individual text-xs/text-sm usages throughout the file — one change stays
   correct even as new elements are added later, instead of silently
   reverting to Tailwind's smaller defaults the next time someone reaches
   for text-xs without knowing this override exists. Values are in rem so
   they respect a person's own browser/OS text-size setting, not just a
   fixed pixel count. text-xs (12px) already met the new floor, so it moves
   up modestly; text-sm (14px) moves up to match. Headings (text-lg/xl)
   are left alone — they were never the hard-to-read complaint. */
.sc-root .text-xs { font-size: 0.875rem !important; }  /* 13px -> 14px */
.sc-root .text-sm { font-size: 1rem !important; }        /* 15px -> 16px */
`;

const COLORS = {
  cream: "var(--sc-cream)",
  creamDeep: "var(--sc-cream-deep)",
  espresso: "var(--sc-espresso)",
  espressoSoft: "var(--sc-espresso-soft)",
  copper: "var(--sc-copper)",
  copperText: "var(--sc-copper-text)",
  onBlueMid: "var(--sc-on-blue-mid)",
  copperSoft: "var(--sc-copper-soft)",
  blueXDark: "var(--sc-blue-xdark)",
  blueDark: "var(--sc-blue-dark)",
  blueMid: "var(--sc-blue-mid)",
  blueLight: "var(--sc-blue-light)",
  blueXLight: "var(--sc-blue-xlight)",
  gold: "var(--sc-gold)",
  dialed: "var(--sc-dialed)",
  bitter: "var(--sc-bitter)",
  line: "var(--sc-line)",
  lineSoft: "var(--sc-line-soft)",
  compassGrid: "var(--sc-compass-grid)",
  disabledText: "var(--sc-disabled-text)",
  surface: "var(--sc-surface)",
  overlay: "var(--sc-overlay)",
  ink: "var(--sc-ink)",
  ramp: ["var(--sc-r1)", "var(--sc-r2)", "var(--sc-r3)", "var(--sc-r4)", "var(--sc-r5)"],
};

const ROAST_LEVELS = ["Light", "Light-Medium", "Medium", "Medium-Dark", "Dark"];
const PROCESSES = ["Washed", "Natural", "Honey", "Anaerobic", "Other/Unknown"];
/* Sensory input is captured on five 1-5 scales rather than binary tags, so the
   engine gets direction AND magnitude — "very sour" should move the grind
   further than "slightly sour".

   Two kinds of scale, because not every sensory variable is bipolar:
   - "balance" scales have a correct middle; deviation either way is a fault.
   - "quality" scales run one direction only; there is no such thing as an
     espresso that is too sweet, so inventing an opposite pole would make the
     midpoint meaningless. `goal` records which end is the good end. */
const TASTE_SCALES = [
  {
    key: "extraction", label: "Extraction", type: "balance",
    low: "Sour", high: "Bitter", mid: "Balanced",
    hint: "Sour points to under-extraction, bitter to over-extraction.",
  },
  {
    key: "body", label: "Body", type: "balance",
    low: "Thin", high: "Heavy", mid: "Balanced",
    hint: "Thin means watery or hollow; heavy means thick or overly syrupy.",
  },
  {
    key: "clarity", label: "Clarity", type: "quality", goal: "high",
    low: "Muddled", high: "Distinct",
    hint: "Whether individual flavors are separated or blurred together.",
  },
  {
    key: "sweetness", label: "Sweetness", type: "quality", goal: "high",
    low: "None", high: "Exceptional",
    hint: "The single best indicator that a shot has landed.",
  },
  {
    key: "astringency", label: "Astringency / Dryness", type: "quality", goal: "low",
    low: "None", high: "Severe",
    hint: "Drying, papery, or puckering finish. Less is always better.",
    // Every other scale's good end is displayed on the right (Distinct,
    // Exceptional). Astringency's good end (None) is numerically the LOW
    // value, which would otherwise visually land on the left — breaking that
    // pattern. This flips only where the poles are DISPLAYED on the slider;
    // the stored 1-5 value and its meaning never change, so nothing outside
    // ScaleRow's own rendering needs to know about this.
    reverseDisplay: true,
  },
];

/* Nothing is pre-selected. Every scale must be actively chosen before a shot
   can be logged — otherwise an untouched form could qualify as "dialed in" and
   write an unverified recipe into the shared community record. */
const emptyTasteScales = () =>
  TASTE_SCALES.reduce((acc, s) => { acc[s.key] = null; return acc; }, {});
const tasteScalesComplete = (v) => !!v && TASTE_SCALES.every((s) => v[s.key] != null);

/* Older shots were logged as an array of tags. Map them onto the scales so
   history and the compass keep working rather than showing blanks. */
function scalesFromLegacyTags(tags = []) {
  const v = { extraction: 3, body: 3, clarity: 3, sweetness: 3, astringency: 1 };
  if (tags.includes("Sour")) v.extraction = 2;
  if (tags.includes("Bitter")) v.extraction = 4;
  if (tags.includes("Weak/Thin")) v.body = 2;
  if (tags.includes("Harsh/Muddy")) v.clarity = 2;
  if (tags.includes("Astringent/Dry") || tags.includes("Astringent")) v.astringency = 4;
  if (tags.includes("Sweet")) v.sweetness = 4;
  if (tags.includes("Balanced")) { v.extraction = 3; v.body = 3; }
  return v;
}

const shotScales = (shot) =>
  shot?.tasteScales || (shot?.tasteTags ? scalesFromLegacyTags(shot.tasteTags) : null);

/* Shot history shows only what stood out — listing all five readings every time
   would bury the signal. Balanced/neutral values are simply omitted. */
/* Always shows all five axes (not just the notable ones) — meant specifically
   for the expanded shot view, sitting above the compass as its legend. Color
   comes straight from the same ramp the sliders and compass use. Label: the
   axis's own name when it reads pure green (a shorthand "Sweet" for
   Sweetness specifically, matching the term already used elsewhere in the
   app); the specific pole reached when it doesn't — bare for the two balance
   scales (Sour/Bitter, Thin/Heavy), and "Axis: Pole" for the three quality
   scales (e.g. "Clarity: Muddled"), since those have only one fault
   direction and naming the axis avoids ambiguity a bare pole name could have. */
function tasteChipsFull(shot) {
  const v = shotScales(shot);
  if (!v) return [];
  return TASTE_SCALES.map((scale) => {
    const n = v[scale.key];
    if (!Number.isFinite(n)) return { key: scale.key, label: scale.label, color: COLORS.lineSoft, textColor: COLORS.espresso };
    const color = scaleRampColor(scale, n);
    /* Quality scales (Clarity, Sweetness, Astringency / Dryness) only have
       one fault direction, so the axis name alone already says everything —
       no pole name is ever appended, only the color changes.
       Balance scales (Extraction, Body) can be off in either direction, so
       they show which way they're leaning — but only when they're actually
       leaning; centered reads as the bare axis name, same as the others. */
    const label =
      scale.type === "balance" && n !== 3
        ? `${scale.label}: ${n < 3 ? scale.low : scale.high}`
        : scale.label;
    return { key: scale.key, label, color, textColor: rampTextColor(color) };
  });
}
const SHOT_STYLES = ["Traditional", "Turbo", "Ristretto", "Lungo", "Custom"];
/* One shared mapping for every place a style needs a badge: which icon, which
   background token. Traditional deliberately gets no icon and the neutral
   background — it's the unmarked baseline, not a "departure" like the other
   three, so it shouldn't visually compete with them. Ristretto and Lungo reuse
   existing theme tokens (copper / copperSoft) rather than inventing new colors,
   the same way `dialed` reuses the sensory-slider green instead of a new one. */
const STYLE_BADGE = {
  /* Graduated dark-to-light by concentration, grounded in the app's own
     RATIO_TABLE averages rather than picked by eye: Ristretto 1.30 (shortest,
     most concentrated) through Lungo 2.82 (longest, most diluted). Custom has
     no fixed ratio by definition, so it sits at the neutral middle position
     rather than being ranked by data — a design choice, not a measurement.
     Every shade's text color was chosen by real contrast, not assumed: the
     three darker shades need white, the two lighter ones need ink. */
  Ristretto: { Icon: Droplet, bgKey: "blueXDark", text: "#fff" },
  Traditional: { Icon: null, bgKey: "blueDark", text: "#fff" },
  // blueMid sits at the crossover point: white reads on it in light theme
  // (4.92) but ink reads better in dark (5.33 vs 3.46), so its text color is
  // theme-aware rather than a single hardcoded value.
  Custom: { Icon: null, bgKey: "blueMid", text: "var(--sc-on-blue-mid)" },
  Turbo: { Icon: Zap, bgKey: "blueLight", text: null },
  Lungo: { Icon: Droplets, bgKey: "blueXLight", text: null },
};
function styleBadge(style) {
  const cfg = STYLE_BADGE[style] || STYLE_BADGE.Traditional;
  return { Icon: cfg.Icon, background: COLORS[cfg.bgKey], color: cfg.text || COLORS.ink };
}

const STYLE_HINTS = {
  Traditional: "The 1:2, 25-32s default — a safe, balanced starting point for most coffees.",
  Turbo: "High yield, very fast flow (think 18g→50g in ~15s). Coarser grind than you'd expect. Shines on light, fruity/floral coffees — clean and juicy, less body. A puck screen helps flow evenly at this speed.",
  Ristretto: "Short, concentrated pour. More body and intensity, less sweetness range to work with.",
  Lungo: "Long pour, more diluted. Can unlock clarity in some coffees but risks going thin or bitter on darker roasts.",
  Custom: "Set every target yourself — no assumptions.",
};

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const hashStr = (s) => {
  let h = 0;
  for (let i = 0; i < (s || "").length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
};
/* Slugs become shared community storage keys, so two different coffees must
   never produce the same one. Naively stripping non-[a-z0-9] collapsed every
   non-Latin name (Japanese, Cyrillic, Arabic, emoji) to "unknown", which
   silently pooled unrelated coffees into a single bucket and averaged their
   recipes together. Accents are folded to their base letter so "Café" and
   "Cafe" still match, and anything left with no usable Latin characters gets
   a short hash of the original instead — distinct input, distinct key. */
/* "Jose" and "José" already share a storage key (slug folds accents), so the
   community record holds one entry for both. This decides which spelling that
   entry actually shows: the accented form wins whenever one exists, since
   accents are almost always the correct rendering and their absence is usually
   just a keyboard limitation. The first person to type it accented therefore
   upgrades the display name for everyone afterwards, and the value never
   degrades back to the plain form. */
const hasAccents = (v) =>
  typeof v === "string" && v.normalize("NFD") !== v.normalize("NFC").normalize("NFD").replace(/[\u0300-\u036f]/g, "");

function preferAccented(incoming, existing) {
  if (typeof incoming !== "string" || !incoming.trim()) return existing;
  if (typeof existing !== "string" || !existing.trim()) return incoming;
  /* "é" can be one codepoint or "e" + a combining accent — visually identical,
     byte-wise different. Both already share a bucket (slug folds accents), but
     storing whichever encoding arrived last makes the saved bytes flip-flop and
     defeats plain string comparison elsewhere. NFC picks one canonical form. */
  incoming = incoming.normalize("NFC");
  existing = existing.normalize("NFC");
  // Only choose between spellings of the SAME name — never override a genuinely
  // different value that happens to occupy the same field.
  if (slug(incoming) !== slug(existing)) return incoming;
  if (hasAccents(existing) && !hasAccents(incoming)) return existing;
  return incoming;
}

const slug = (s) => {
  const raw = (s === null || s === undefined ? "" : String(s)).trim();
  if (!raw) return "unknown";
  const folded = raw
    .normalize("NFD")                    // split accented chars into base + mark
    .replace(/[\u0300-\u036f]/g, "")     // drop the combining marks
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  if (folded) return folded;
  // No Latin characters survived — key off a hash so distinct names stay distinct.
  return `u-${hashStr(raw)}`;
};
const normalizeUrl = (u) => (u || "").trim().toLowerCase().replace(/[?#].*$/, "").replace(/\/$/, "");

/* ---------------- storage helpers ---------------- */
async function getKey(key, shared = false) {
  try {
    const r = await window.storage.get(key, shared);
    return r ? JSON.parse(r.value) : null;
  } catch {
    return null;
  }
}
/* A dialed-in shot writes to 2 shared community buckets (coffee, roast+style)
   plus the person's own coffee record and index — storage can still fail or
   be rate limited, so silently swallowing a failure would let someone believe
   a shot saved when it didn't. Failures are counted and surfaced in the UI. */
let storageFailures = 0;
let onStorageFailure = null;
const subscribeStorageFailures = (fn) => { onStorageFailure = fn; };

async function setKey(key, val, shared = false) {
  try {
    await window.storage.set(key, JSON.stringify(val), shared);
    return true;
  } catch (e) {
    console.error("storage set failed", key, e);
    storageFailures += 1;
    if (onStorageFailure) onStorageFailure(storageFailures);
    return false;
  }
}
async function deleteKey(key, shared = false) {
  try { await window.storage.delete(key, shared); } catch { /* ignore */ }
}

/* The app never needed key enumeration before — every read was for a key it
   already knew the name of. Export does need it: the shared community buckets
   accumulate under keys derived from other people's coffees, so there's no way
   to reconstruct the list locally. Returns [] rather than throwing so a
   storage-unavailable environment degrades to "nothing to export" instead of
   failing the whole operation. */
async function listKeys(prefix = "", shared = false) {
  try {
    const r = await window.storage.list(prefix, shared);
    return Array.isArray(r?.keys) ? r.keys : [];
  } catch {
    return [];
  }
}

/* ---------------- roaster name normalization ----------------
   People type roaster names inconsistently ("Proud Mary", "Proud Mary
   Coffee", "Proud Mary Coffee USA"), and that fragments community data
   across buckets that should be one. Two defenses:
   1. Shorten to a colloquial display name at save time, so the stored
      value itself converges for common variants.
   2. When a roaster URL is known, anchor the bucket key to the site's
      domain instead of whatever string was typed — the strongest
      possible signal, since two different phrasings of "Proud Mary"
      sourced from proudmarycoffee.com always collide.
------------------------------------------------------------- */
const ROASTER_SUFFIXES = [
  /\s+coffee\s+roasters?$/i, /\s+coffee\s+roasting(?:\s+co\.?)?$/i, /\s+coffee\s+company$/i,
  /\s+coffee\s+co\.?$/i, /\s+roasting\s+co\.?$/i, /\s+roasters?$/i, /\s+roasting$/i,
  /\s+coffee$/i, /\s+usa$/i, /\s+us$/i, /\s+llc\.?$/i, /\s+inc\.?$/i, /\s+co\.?$/i,
];
function shortenRoasterName(raw) {
  if (!raw) return raw;
  // Extraction output is parsed JSON, so this can arrive as a number, object
  // or array rather than a string — coerce before any string method.
  let s = String(raw).trim();
  if (!s) return "";
  let changed = true;
  while (changed) {
    changed = false;
    for (const re of ROASTER_SUFFIXES) {
      const next = s.replace(re, "").trim();
      // Never strip down to nothing — a name that's ONLY "Coffee" or "Roasters" stays as-is.
      if (next && next.length >= 2 && next !== s) {
        s = next;
        changed = true;
      }
    }
  }
  return s;
}
function roasterDomainToken(url) {
  if (!url) return null;
  try {
    const host = new URL(url).hostname.replace(/^www\./i, "");
    const token = host.split(".")[0];
    return token ? token.toLowerCase() : null;
  } catch {
    return null;
  }
}
/* The resolved key used for community bucketing — prefer the domain anchor,
   fall back to the (already-shortened) display name. */
function roasterBucketKey(roasterName, roasterUrl) {
  return roasterDomainToken(roasterUrl) || slug(shortenRoasterName(roasterName));
}

/* React does not block `javascript:` (or `data:`) URLs in href — it renders
   them as given, and clicking one executes script in the page. A roaster URL
   is free-text the user pastes, and the field is also written to shared
   storage, so it is never rendered as a link without passing through here
   first. Anything that isn't plainly http(s) yields null and the link is
   simply not shown, rather than being rendered as something clickable. */
function safeHttpUrl(u) {
  if (typeof u !== "string") return null;
  const trimmed = u.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : null;
}

const K = {
  coffee: (roasterKey, name) => `cx-coffee:${roasterKey}--${slug(name)}`,
  recipe: (roast, style) => `cx-recipe:${slug(roast)}-${slug(style)}`,
  /* "Similar coffees" — same roast, style, AND origin/process/variety, so
     this only ever matches genuinely comparable coffees rather than
     everything at a given roast level. Requires at least one of the three
     to be known; a key built from three unknowns would be indistinguishable
     from the general roast+style bucket while still costing a write on
     every dialed-in shot for zero benefit. */
  similarRecipe: (roast, style, origin, process, variety) => {
    if (!origin && !process && !variety) return null;
    return `cx-recipe-similar:${slug(roast)}-${slug(style)}-${slug(origin || "")}-${slug(process || "")}-${slug(variety || "")}`;
  },
  /* Elevation is continuous, so two coffees are never at the exact same
     figure — this bands to the nearest 300m instead of requiring an exact
     match, the same way a person would round when comparing growing
     conditions by ear ("high-grown, low 1900s"). */
  elevationRecipe: (roast, style, elevationM) => {
    const parsed = parseElevation(elevationM);
    if (!parsed) return null;
    const band = Math.round(parsed.mid / 300) * 300;
    return `cx-recipe-elev:${slug(roast)}-${slug(style)}-${band}`;
  },
  url: (u) => `cx-url:${hashStr(normalizeUrl(u))}`,
};

/* ---------------- roaster page extraction ----------------
   Retrieval is the hard part, not parsing. Server-side fetch tools aren't
   guaranteed to be enabled, and web_search only returns snippets — which is
   why fields in a page's meta description (name, origin, process, notes) came
   through while specs further down (elevation, roast scales) did not.
   So we retrieve page text ourselves, through a ladder of strategies, and
   escalate whenever the result is missing the below-the-fold fields.
---------------------------------------------------------- */

/* Shopify and friends append tracking junk that adds nothing and hurts cache hits. */
const TRACKING_PARAMS = /^(_pos|_fid|_ss|_sid|_pxid|utm_[a-z]+|fbclid|gclid|mc_cid|mc_eid|ref|source)$/i;
function cleanUrl(raw) {
  const url = String(raw || "").trim();
  if (!url) return url;
  try {
    const u = new URL(url);
    [...u.searchParams.keys()].forEach((k) => { if (TRACKING_PARAMS.test(k)) u.searchParams.delete(k); });
    u.hash = "";
    return u.toString().replace(/\?$/, "");
  } catch {
    return url;
  }
}

function htmlToText(html) {
  let t = String(html || "");
  t = t.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ");
  t = t.replace(/<noscript[\s\S]*?<\/noscript>/gi, " ").replace(/<svg[\s\S]*?<\/svg>/gi, " ");
  // keep alt text — roasters put specs in image alt attributes surprisingly often
  t = t.replace(/<img[^>]*alt=["']([^"']+)["'][^>]*>/gi, " $1 ");
  t = t.replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr)>/gi, "\n").replace(/<[^>]+>/g, " ");
  t = t.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
       .replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  return t.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

/* Pulls the roaster's own product photo out of raw HTML (og:image / twitter:image
   meta tags) so it can be read the same way a manually uploaded screenshot is —
   layout and typography cues (what's emphasized vs. a sub-label) often settle
   ambiguities that plain text can't, like which line is the actual coffee name. */
function extractMetaImages(html) {
  const urls = [];
  const re = /<meta[^>]+(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image)["'][^>]+content=["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html)) && urls.length < 2) {
    const u = m[1];
    if (u && !urls.includes(u)) urls.push(u.startsWith("//") ? `https:${u}` : u);
  }
  return urls;
}

const withTimeout = (promise, ms) =>
  Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(new Error("timed out")), ms))]);

/* Ways to get the page's actual text into the browser, best first. "direct" and
   "proxy" return raw HTML, so meta-image extraction works on them; "reader" (a
   readability service) returns pre-cleaned text with the head stripped, so no
   image URLs come from that path — text-only in that case. */
const PAGE_READERS = [
  {
    label: "direct",
    run: async (url) => {
      const r = await withTimeout(fetch(url), 12000);
      if (!r.ok) throw new Error("direct fetch failed");
      const html = await r.text();
      return { text: htmlToText(html), images: extractMetaImages(html) };
    },
  },
  {
    label: "reader",
    run: async (url) => {
      const r = await withTimeout(fetch(`https://r.jina.ai/${url}`), 20000);
      if (!r.ok) throw new Error("reader failed");
      return { text: (await r.text()).trim(), images: [] };
    },
  },
  {
    label: "proxy",
    run: async (url) => {
      const r = await withTimeout(fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`), 20000);
      if (!r.ok) throw new Error("proxy failed");
      const html = await r.text();
      return { text: htmlToText(html), images: extractMetaImages(html) };
    },
  },
];

async function readPageText(url) {
  const tried = [];
  for (const reader of PAGE_READERS) {
    try {
      const { text, images } = await reader.run(url);
      if (text && text.length > 400) return { text: text.slice(0, 150000), via: reader.label, tried, images: images || [] };
      tried.push(`${reader.label} (too short)`);
    } catch (e) {
      tried.push(`${reader.label} (${e.message})`);
    }
  }
  return { text: null, via: null, tried, images: [] };
}

/* Chunked so a full-size product photo doesn't blow the call stack the way
   String.fromCharCode(...hugeArray) would. */
function arrayBufferToBase64(buf) {
  let binary = "";
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function fetchImageAsContentBlock(imgUrl) {
  try {
    const r = await withTimeout(fetch(imgUrl), 12000);
    if (!r.ok) return null;
    const blob = await r.blob();
    if (blob.size > 5_000_000 || !/^image\//.test(blob.type)) return null;
    const buf = await blob.arrayBuffer();
    return { type: "image", source: { type: "base64", media_type: blob.type || "image/jpeg", data: arrayBufferToBase64(buf) } };
  } catch {
    return null;
  }
}

const EXTRACT_SCHEMA = `{
  "name": "the SPECIFIC coffee/lot name only — see naming rule below — or null",
  "roaster": "a short, colloquial roaster name the way someone would say it out loud (e.g. 'Proud Mary', not 'Proud Mary Coffee Roasters USA') — or null",
  "origin": "country, or country and region, or null",
  "elevationM": "elevation as a string — keep a range like \"1970-2241\" and open-ended values like \"1800+\" as written; convert feet to meters — or null",
  "roastLevel": one of "Light", "Light-Medium", "Medium", "Medium-Dark", "Dark", or null,
  "roastLevelSource": "stated" if the page gives the roast level plainly, "scale" if you read it off a slider or scale graphic, or null,
  "process": one of "Washed", "Natural", "Honey", "Anaerobic", "Other/Unknown", or null,
  "tastingNotes": "the roaster's tasting notes as a comma-separated string, or null",
  "variety": "cultivar or variety, e.g. Heirloom, Bourbon, Gesha — or null",
  "producer": "farm/estate name, plus the grower or family name in parentheses if both are given separately, e.g. 'Abana Estate (Omran Family)' — or null",
  "summary": "1-2 sentences IN YOUR OWN WORDS on what matters for pulling this coffee AS ESPRESSO. Say nothing about pour-over or filter. Do not copy the roaster's wording. Null if no usable write-up.",
  "espressoNotes": "anything the page says about this coffee AS ESPRESSO specifically. Your own words. Null if not discussed.",
  "roasterRecipe": { "doseG": number or null, "yieldG": number or null, "ratio": number or null, "timeLow": number or null, "timeHigh": number or null, "tempC": number or null } or null,
  "nonEspressoRecipe": "any pour-over/filter/immersion recipe, as a plain string. Discarded — this slot exists only to keep filter numbers out of roasterRecipe. Null if none."
}`;

const EXTRACT_RULES = `This tool is for ESPRESSO ONLY. Filter and pour-over data is asked for solely to keep it out of the espresso fields.

Read EVERYTHING you are given — headings, spec blocks, tables, the write-up, brew guides, image alt text, and any images supplied. If a product photo of the bag is included, its typography is a strong signal: the most prominent or emphasized line is usually the coffee's actual name, while smaller lines above or below it give origin, estate, variety, or process.

Naming rule — titles are often compound strings that cram several fields into one line, e.g. "COUNTRY | Estate Name | Lot | Variety | Process" or "COUNTRY, Estate – Lot". Do NOT use the whole string as name. Pull out only the specific, distinguishing part — typically a lot, micro-lot, or farm-section name — and route everything else into its own field: the country into origin, the estate/farm into producer, the cultivar into variety, the process into process. If a farm/estate name and a separate grower or family name both appear, combine them in producer as "<Estate> (<Family>)".

Roaster name — give it the way a regular customer would say it, not the full legal/marketing name. Strip generic suffixes like "Coffee", "Coffee Roasters", "Roasting Co", "Company", "USA", "LLC" unless the name has nothing else to it.

How to read roaster pages:
- If a page lists more than one process for a single coffee (a blend of differently-processed lots, e.g. "Washed, Natural"), and Natural is one of them, drop Natural and use the other one instead — "Washed, Natural" becomes Washed. This only applies when Natural appears alongside a different process for the same coffee; if Natural is the only process listed, it's still Natural.
- Specs are often laid out visually and the LABEL FREQUENTLY COMES AFTER THE VALUE. A heading "1970m-2241m" sitting directly above the word "Elevation" means the elevation is 1970-2241. Match each value to whichever label sits nearest it, above or below.
- Roast level may be drawn as a scale with only its endpoints written out (e.g. "Light" and "Medium"). Those are the ends of the scale, NOT the roast level. If you cannot tell where the marker sits, take the midpoint — endpoints "Light" and "Medium" mean "Light-Medium", and set roastLevelSource to "scale".
- Ignore scales measuring something other than roast — a "Comfort / Adventure" scale, or a "Mild / Curious / Wild" collection-intensity scale, describe flavor or product-line branding, not roast level.
- MOST SPECIALTY ROASTERS DO NOT PUBLISH A ROAST LEVEL AT ALL. If it genuinely isn't there, return null. Do not invent one.
- Espresso brew guides sometimes separate a pre-infusion/"line pressure" ramp (e.g. "Line Pressure: 0-3.5s") from the main full-pressure extraction (e.g. "9 Bar: 25s"). Put ONLY the full-pressure duration in roasterRecipe.timeLow/timeHigh — do not add the pre-infusion time to it. Instead, note the pre-infusion detail in espressoNotes, since many home machines can't do pre-infusion and the person needs to know it's an optional step, not part of the core time target.
- Espresso and filter figures are often printed side by side, sometimes sharing one label. "Espresso | Filter — Ratio 1:2.5 | 1:16" means the ESPRESSO ratio is 2.5 and the filter ratio is 16; take only the first. Put 2.5 in roasterRecipe.ratio.
- If a recipe gives only a ratio and no grams, fill roasterRecipe.ratio and leave doseG and yieldG null. If it gives grams, fill doseG and yieldG.
- A 1:16 or 1:17 ratio, a 2:40 brew time, or a grind in microns is FILTER. It must never land in roasterRecipe.

Rules: use null for anything not stated. Never guess or invent values.

Before answering, confirm you specifically looked for ELEVATION and ROAST LEVEL, and re-read your summary and espressoNotes to delete any clause that is only about filter brewing. If removing filter material leaves nothing meaningful, return null for that field.`;

const textPrompt = (url, pageText) =>
  `Below is the full text of a coffee roaster's product page${url ? ` (${url})` : ""}. Extract what the roaster states about the coffee.

Respond with ONLY a JSON object — no preamble, no explanation, no markdown code fences. Use exactly this shape:
${EXTRACT_SCHEMA}

${EXTRACT_RULES}

--- PAGE TEXT ---
${pageText}
--- END PAGE TEXT ---`;

const urlPrompt = (url) =>
  `Fetch and read the FULL page at this URL, then extract what the roaster states about the coffee: ${url}

Do not answer from search snippets or memory — retrieve the page itself. Name, origin, process and tasting notes sit near the top, but elevation, variety, producer, roast level and brew recipes are usually further down and will be missed if you only read the summary.

Respond with ONLY a JSON object — no preamble, no explanation, no markdown code fences. Use exactly this shape:
${EXTRACT_SCHEMA}

${EXTRACT_RULES}`;

const imagePrompt = () =>
  `These images come from a coffee roaster's product page or bag. Extract what they state about the coffee.

Respond with ONLY a JSON object — no preamble, no explanation, no markdown code fences. Use exactly this shape:
${EXTRACT_SCHEMA}

${EXTRACT_RULES}`;

function parseJsonReply(payload) {
  const text = (payload.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Nothing readable came back.");
  return JSON.parse(cleaned.slice(start, end + 1));
}

/* ---------------- personal shot memory ----------------
   Grind numbers are meaningless between people, which is why they're never
   shared. But a person's own history on their own grinder is the single best
   signal available — better than any community average, because it already
   accounts for their burrs, alignment, calibration and basket.

   Per-coffee history already drives grind sensitivity (learnGrindSensitivity).
   This store adds the piece that can't come from a single coffee: where this
   person tends to land ACROSS coffees, so a brand new bag can start near a
   setting that has actually worked on their grinder rather than at mid-range
   or at a community average normalised from other people's dials.
--------------------------------------------------------- */
const PERSONAL_KEY = "personal-shots";
/* No fixed sample cap — history grows for as long as it fits. The storage layer
   enforces a hard ~5MB ceiling per key, and exceeding it makes the write throw
   and lose the shot entirely, so the only guard is a byte budget: keep every
   sample until the payload nears that ceiling, and only then drop the oldest.
   At roughly 140 bytes a sample this holds on the order of 28,000 shots, so in
   practice nothing is ever discarded. */
const PERSONAL_BYTE_BUDGET = 4_000_000;

async function recordPersonalShot(shot, coffee) {
  const g = parseFloat(shot.grindSetting);
  const t = Number(shot.timeS);
  if (!Number.isFinite(g) || !Number.isFinite(t) || t <= 0) return;
  const store = (await getKey(PERSONAL_KEY)) || { samples: [] };
  let next = [
    {
      g, t,
      dose: Number(shot.doseG) || null,
      ratio: Number.isFinite(Number(shot.yieldG) / Number(shot.doseG)) ? Number((shot.yieldG / shot.doseG).toFixed(2)) : null,
      roast: coffee.roastLevel || null,
      style: coffee.style || "Traditional",
      coffeeId: coffee.id,
      dialed: !!shot.dialedIn,
      ts: Date.now(),
    },
    // Sanitised on read as well as on use: a corrupted store would otherwise
    // be spread back into the new array and persisted forward permanently.
    // (A non-array here would also throw outright when spread.)
    ...usablePersonalSamples(store.samples, { requireTime: true }),
  ];
  // Trim the oldest only if the payload would otherwise be rejected outright.
  while (next.length > 1 && JSON.stringify({ samples: next }).length > PERSONAL_BYTE_BUDGET) {
    next = next.slice(0, Math.max(1, Math.floor(next.length * 0.9)));
  }
  await setKey(PERSONAL_KEY, { samples: next });
}

/* Where this person usually lands for a given roast — used to start a brand
   new coffee near something proven instead of at the middle of the dial. */
/* Personal history comes back from storage, which can hand over a partially
   written record, a value edited outside the app, or data from an older
   schema. Every consumer of it goes through this first, so a corrupted store
   degrades to "no personal history" instead of crashing recipe generation.

   The two consumers need different fields, so requiring both would silently
   discard usable history: picking a starting grind only needs the setting
   itself, while measuring grind sensitivity needs a paired shot time too. */
function usablePersonalSamples(samples, { requireTime = false } = {}) {
  if (!Array.isArray(samples)) return [];
  return samples.filter(
    (x) =>
      x && typeof x === "object" &&
      Number.isFinite(Number(x.g)) &&
      (!requireTime || Number.isFinite(Number(x.t)))
  );
}

/* The person's own dialed-in shots on OTHER coffees of the same roast + style
   are a better predictor than a community average from strangers' equipment —
   same machine, same water, same palate. This shapes it into the same aggregate
   form the community buckets use so it can slot into the existing tier list. */
function personalAggregate(rawSamples, roastLevel, style) {
  const samples = usablePersonalSamples(rawSamples, { requireTime: true })
    .filter((x) => x.dialed && x.roast === roastLevel && x.style === style);
  if (samples.length < 2) return null;
  const agg = emptyAgg();
  for (const x of samples) {
    const ratio = Number(x.ratio);
    const time = Number(x.t);
    if (Number.isFinite(ratio) && ratio > 0) { agg.sumRatio += ratio; agg.ratioCount += 1; }
    if (Number.isFinite(time) && time > 0) { agg.sumTimeS += time; agg.timeCount += 1; }
    agg.count += 1;
  }
  return agg;
}

/* A grinder range is required to save Equipment Settings at all (see
   settingsOk), so this is always computable — even for a brand new coffee
   with zero shot or community history. A real number beats a vague "start
   in the middle" in words, since the actual middle is already known. */
/* A grinder range is required to save Equipment Settings at all (see
   settingsOk), so this is always computable — even for a brand new coffee
   with zero shot or community history. */
function equipmentMidpoint(equipment) {
  const min = Math.min(Number(equipment?.grinderMin), Number(equipment?.grinderMax));
  const max = Math.max(Number(equipment?.grinderMin), Number(equipment?.grinderMax));
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  return { value: Math.round(((min + max) / 2) * 10) / 10, min, max };
}

function rangeMidpoint(equipment) {
  const mid = equipmentMidpoint(equipment);
  if (!mid) return null;
  return `Start around ${mid.value} — the middle of your ${mid.min}-${mid.max} espresso range — then adjust from there based on shot time.`;
}

function personalStartGrind(rawSamples, roastLevel, style, equipment) {
  const samples = usablePersonalSamples(rawSamples);
  if (!samples.length) return null;
  const median = (arr) => {
    if (!arr.length) return null;
    const v = arr.map((x) => x.g).sort((a, b) => a - b);
    const m = Math.floor(v.length / 2);
    return Math.round((v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2) * 10) / 10;
  };
  // History predates any later change to the declared espresso range, so a past
  // setting can fall outside the current bounds. Clamp rather than suggest a
  // number the person has said isn't espresso territory for them.
  const min = Math.min(Number(equipment?.grinderMin), Number(equipment?.grinderMax));
  const max = Math.max(Number(equipment?.grinderMin), Number(equipment?.grinderMax));
  const clamp = (v) => {
    if (v === null) return null;
    if (!Number.isFinite(min) || !Number.isFinite(max)) return v;
    return Math.round(Math.min(max, Math.max(min, v)) * 10) / 10;
  };
  const dialed = samples.filter((s) => s.dialed && Number.isFinite(s.g));
  const tiers = [
    { arr: dialed.filter((s) => s.roast === roastLevel && s.style === style), label: `your dialed-in ${roastLevel || "similar"} ${style} shots` },
    { arr: dialed.filter((s) => s.roast === roastLevel), label: `your dialed-in ${roastLevel || "similar"} roasts` },
    { arr: dialed, label: "your dialed-in shots so far" },
  ];
  for (const t of tiers) {
    if (t.arr.length >= 2) {
      const v = clamp(median(t.arr));
      if (v !== null) return { value: v, count: t.arr.length, label: t.label };
    }
  }
  return null;
}

/* ---------------- custom target validation ----------------
   Canonical plausibility bounds for hand-entered brew variables, applied
   everywhere dose/yield/time/temp are typed by a person — checked against a
   real range rather than just "is it positive", since a bare positive check
   would wave through a typo like 3s instead of 30s. Problems are reported to
   the form so they can be fixed before saving, not silently corrected after.

   Grind Setting deliberately has NO fixed bound here — it's defined entirely
   by the person's own declared espresso range (grinderMin/grinderMax), since
   grinder dial numbers are arbitrary and there's no universal "valid" one.

   This is distinct from ESPRESSO_BOUNDS further down, which exists to catch
   obviously-wrong data scraped from a roaster's webpage (a filter recipe,
   garbage numbers). That gate is intentionally wider than what a person
   should type by hand: rejecting a true positive there just falls back to
   the formula (cheap), while being too strict would throw away a legitimate
   but unusual published recipe. INPUT_BOUNDS exists to catch a fat-fingered
   typo in a form, which is a different job with a different right answer. */
const INPUT_BOUNDS = {
  doseG: [12.0, 28.0],
  yieldG: [12.0, 100.0],
  timeS: [5.0, 60.0],
  tempC: [85.0, 99.9],
};

/* Grinder dials have no universal scale — 0-10, 0-50 and 1-100 all exist — so
   there's no meaningful ceiling to enforce. A negative setting is never real,
   though, so the only bound is a floor at zero. Infinity stands in for "no
   upper limit" so this can share the same isOutOfBounds/boundedStyle helpers
   as every other numeric field. */
const GRIND_BOUNDS = [0, Infinity];

const CUSTOM_BANDS = {
  yieldG: { range: INPUT_BOUNDS.yieldG, label: "Yield", unit: "g" },
  timeLow: { range: INPUT_BOUNDS.timeS, label: "Fastest shot time", unit: "s" },
  timeHigh: { range: INPUT_BOUNDS.timeS, label: "Slowest shot time", unit: "s" },
  tempC: { range: INPUT_BOUNDS.tempC, label: "Brew temperature", unit: "°C" },
};

function validateCustomTargets(targets, equipment) {
  const problems = [];
  const fmt = (k, v) =>
    k === "tempC" ? `${showTemp(v, equipment)}${tempLabel(equipment)}` : `${v}${CUSTOM_BANDS[k].unit}`;

  for (const [key, spec] of Object.entries(CUSTOM_BANDS)) {
    const raw = targets?.[key];
    if (raw === null || raw === undefined || raw === "") {
      problems.push({ key, message: `${spec.label} is required.` });
      continue;
    }
    const n = Number(raw);
    if (!Number.isFinite(n)) {
      problems.push({ key, message: `${spec.label} needs to be a number.` });
      continue;
    }
    const [lo, hi] = spec.range;
    if (n < lo || n > hi) {
      problems.push({
        key,
        message: `${spec.label} of ${fmt(key, n)} looks out of range for espresso — expected between ${fmt(key, lo)} and ${fmt(key, hi)}. Check for a typo.`,
      });
    }
  }

  // Cross-field check runs only when both ends are actually present and in
  // range — otherwise blank fields (Number("") is 0) would add a confusing
  // "you've entered 0s to 0s" on top of the two "required" messages.
  const present = (v) => v !== null && v !== undefined && v !== "";
  const inBand = (v, [lo, hi]) => Number.isFinite(Number(v)) && Number(v) >= lo && Number(v) <= hi;
  if (
    present(targets?.timeLow) && present(targets?.timeHigh) &&
    inBand(targets.timeLow, CUSTOM_BANDS.timeLow.range) &&
    inBand(targets.timeHigh, CUSTOM_BANDS.timeHigh.range) &&
    Number(targets.timeHigh) <= Number(targets.timeLow)
  ) {
    problems.push({
      key: "timeHigh",
      // The custom form asks for a target *window*, so these are two ends of a
      // range rather than one figure entered twice.
      message: `The slowest shot time needs to be greater than the fastest — you've entered ${Number(targets.timeLow)}s to ${Number(targets.timeHigh)}s.`,
    });
  }
  return problems;
}

/* ---------------- espresso plausibility gate ---------------- */
const ESPRESSO_BOUNDS = { doseG: [5, 30], yieldG: [10, 120], ratio: [0.8, 4.5], timeS: [8, 90], tempC: [80, 100] };
const inRange = (v, [lo, hi]) => v !== null && v >= lo && v <= hi;
const toNum = (v) => (v === null || v === undefined || v === "" || isNaN(Number(v)) ? null : Number(v));

function sanitizeRoasterRecipe(rr) {
  if (!rr || typeof rr !== "object") return { recipe: null, rejected: null };
  const doseG = toNum(rr.doseG);
  const yieldG = toNum(rr.yieldG);
  let ratio = toNum(rr.ratio);
  let timeLow = toNum(rr.timeLow);
  let timeHigh = toNum(rr.timeHigh);
  let tempC = toNum(rr.tempC);

  // A ratio alone is usable — Proud Mary publishes "Ratio 1:2.5" with no grams.
  if (doseG === null || yieldG === null) {
    if (ratio === null) return { recipe: null, rejected: null };
    if (!inRange(ratio, ESPRESSO_BOUNDS.ratio)) {
      return { recipe: null, rejected: `a 1:${ratio} recipe, which is filter rather than espresso` };
    }
  } else {
    if (!inRange(doseG, ESPRESSO_BOUNDS.doseG) || !inRange(yieldG, ESPRESSO_BOUNDS.yieldG)) {
      return { recipe: null, rejected: `a ${doseG}g → ${yieldG}g recipe, which is outside espresso range` };
    }
    const derived = yieldG / doseG;
    if (derived < ESPRESSO_BOUNDS.ratio[0] || derived > ESPRESSO_BOUNDS.ratio[1]) {
      return { recipe: null, rejected: `a 1:${derived.toFixed(1)} recipe, which is filter rather than espresso` };
    }
    ratio = derived;
  }

  if (!inRange(timeLow, ESPRESSO_BOUNDS.timeS)) { timeLow = null; timeHigh = null; }
  if (timeHigh !== null && !inRange(timeHigh, ESPRESSO_BOUNDS.timeS)) timeHigh = timeLow;
  if (timeLow !== null && timeHigh !== null && timeHigh < timeLow) { const t = timeLow; timeLow = timeHigh; timeHigh = t; }
  if (tempC !== null && tempC >= 175 && tempC <= 215) tempC = Math.round(((tempC - 32) * 5) / 9 * 10) / 10; // published in F
  if (!inRange(tempC, ESPRESSO_BOUNDS.tempC)) tempC = null;

  return { recipe: { doseG, yieldG, ratio: Number(ratio.toFixed(2)), timeLow, timeHigh, tempC }, rejected: null };
}

/* ---------------- prose relevance screen ---------------- */
const FILTER_TERMS = /\b(pour[- ]?overs?|v60|origami|chemex|aeropress|aero press|kalita|wave dripper|clever dripper|french press|moka pot|percolat|immersion|batch brew|cold brew|drip (?:coffee|brewer|method|recipe)|filter (?:coffee|brew\w*|recipe|method|profile)|as (?:a )?filter|gooseneck|slurry|bloom phase|blooming|drawdown|agitation|tds|microns?|µm|1:1[2-9]\b|1:[2-9][0-9]\b)\b/i;
const ESPRESSO_TERMS = /\b(espresso|shots?|portafilter|basket|puck|crema|ristretto|lungo|latte|cappuccino|flat white|cortado|macchiato|milk drinks?|group ?head|tamp\w*|pre[- ]?infus\w*|9 ?bar)\b/i;
const escapeRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function scrubForEspresso(text, roasterName) {
  if (!text) return null;
  const raw = String(text).trim();
  if (!raw) return null;
  const nameRe = roasterName ? new RegExp(escapeRe(roasterName), "gi") : null;
  const clauses = raw.match(/[^.!?;]+[.!?;]*/g) || [raw];
  const kept = clauses.filter((c) => {
    const probe = nameRe ? c.replace(nameRe, " ") : c;
    if (ESPRESSO_TERMS.test(probe)) return true;
    if (FILTER_TERMS.test(probe)) return false;
    return true;
  });
  const out = kept.join(" ").replace(/\s+/g, " ").replace(/^[;,\s]+/, "").trim();
  if (out.length < 15) return null;
  return { text: out, trimmed: out.length < raw.length };
}

function sanitizeExtraction(data) {
  const clean = { ...data };
  delete clean.nonEspressoRecipe;
  delete clean.filterRecipe;

  if (clean.roaster) clean.roaster = shortenRoasterName(clean.roaster);

  const { recipe, rejected } = sanitizeRoasterRecipe(data.roasterRecipe);
  clean.roasterRecipe = recipe;
  clean.recipeRejected = rejected || null;

  let proseTrimmed = false;
  for (const field of ["summary", "espressoNotes"]) {
    const result = scrubForEspresso(data[field], data.roaster);
    clean[field] = result ? result.text : null;
    if (result?.trimmed || (data[field] && !result)) proseTrimmed = true;
  }
  clean.proseTrimmed = proseTrimmed;
  if (!ROAST_LEVELS.includes(clean.roastLevel)) clean.roastLevel = null;
  if (!clean.roastLevel) {
    const guess = inferRoastLevel(clean);
    if (guess) {
      clean.roastLevel = guess.level;
      clean.roastLevelSource = "estimated";
      clean.roastLevelBasis = guess.basis;
    }
  }
  return clean;
}

/* Most specialty roasters never publish a roast level, so a blank field is
   usually correct rather than a failure. Rather than leave the user stuck on a
   required field, infer a starting guess from signals that ARE on the page and
   label it plainly as an estimate they can override. */
const DARK_NOTE_TERMS = /\b(chocolate|cocoa|caramel|toffee|nut\w*|almond|hazelnut|molasses|brown sugar|malt|smok\w*|roasty|tobacco|dark fruit|fudge|graham)\b/gi;
const LIGHT_NOTE_TERMS = /\b(floral|jasmine|bergamot|citrus|lemon|lime|grapefruit|berry|blueberry|raspberry|strawberry|peach|apricot|nectarine|tropical|mango|papaya|pineapple|tea[- ]?like|delicate|sparkl\w*|juicy|candy|melon|hibiscus|rose|lychee)\b/gi;
const EXPERIMENTAL = /\b(gesha|geisha|carbonic|anaerobic|maceration|co[- ]?ferment|natural|honey|experimental|wild|reserve)\b/i;

function inferRoastLevel(d) {
  const notes = `${d.tastingNotes || ""} ${d.summary || ""} ${d.espressoNotes || ""}`;
  const light = (notes.match(LIGHT_NOTE_TERMS) || []).length;
  const dark = (notes.match(DARK_NOTE_TERMS) || []).length;
  const reasons = [];

  let score = 0;
  if (light || dark) {
    score = light - dark;
    reasons.push(light > dark ? "fruit-forward tasting notes" : dark > light ? "chocolate/nutty tasting notes" : "mixed tasting notes");
  }
  if (EXPERIMENTAL.test(`${d.variety || ""} ${d.process || ""} ${d.tastingNotes || ""}`)) {
    score += 1;
    reasons.push("specialty variety/process");
  }
  if (!reasons.length) return null;

  const level = score >= 2 ? "Light" : score >= 0 ? "Light-Medium" : score >= -2 ? "Medium" : "Medium-Dark";
  return { level, basis: reasons.join(" and ") };
}

/* Bump whenever extraction rules, schema, or prompts change. Cached entries
   written under an older version are ignored and re-read, so improvements
   actually reach URLs that were looked up before — otherwise an early, weaker
   extraction gets frozen in the shared cache forever. */
const EXTRACTION_VERSION = 6;

/* Did we actually reach past the meta description? These fields never appear
   in a search snippet, so finding none of them means retrieval fell short. */
const DEEP_FIELDS = ["elevationM", "roastLevel", "variety", "producer", "roasterRecipe"];
const deepFieldCount = (d) => DEEP_FIELDS.filter((f) => d && d[f] !== null && d[f] !== undefined && d[f] !== "").length;

/* Different retrieval strategies fail on different fields — the text pass might
   land the recipe while a tool pass lands the elevation. Take the union rather
   than letting one strategy's result wholesale replace another's. */
const MERGEABLE_FIELDS = [
  "name", "roaster", "origin", "elevationM", "roastLevel", "roastLevelSource", "roastLevelBasis",
  "process", "tastingNotes", "variety", "producer", "summary", "espressoNotes", "roasterRecipe",
];
function mergeExtractions(primary, secondary) {
  if (!primary) return secondary;
  if (!secondary) return primary;
  const out = { ...primary };
  for (const f of MERGEABLE_FIELDS) {
    const have = out[f];
    if (have === null || have === undefined || have === "") {
      const alt = secondary[f];
      if (alt !== null && alt !== undefined && alt !== "") out[f] = alt;
    }
  }
  return out;
}

async function postMessages(body, beta, apiKey) {
  const headers = { "Content-Type": "application/json" };
  if (beta) headers["anthropic-beta"] = beta;
  // A personal key bypasses the artifact's built-in access entirely and calls
  // the real public API directly from the browser. That requires two headers
  // the built-in path doesn't need: a version pin, and Anthropic's explicit
  // opt-in for direct browser calls (keys aren't meant to be used client-side
  // by default, for the obvious reason that browser JS is visible to its own
  // user — this header is Anthropic's sanctioned way to allow it anyway).
  if (apiKey) {
    headers["x-api-key"] = apiKey;
    headers["anthropic-version"] = "2023-06-01";
    headers["anthropic-dangerous-direct-browser-access"] = "true";
  }
  return fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers, body: JSON.stringify(body) });
}

async function askClaude(content, tools, beta, { raw = false, apiKey = null } = {}) {
  const body = { model: "claude-sonnet-4-6", max_tokens: 1500, messages: [{ role: "user", content }] };
  if (tools) body.tools = tools;
  const response = await postMessages(body, beta, apiKey);
  if (!response.ok) {
    if (response.status === 401) throw new Error("That API key was rejected — check it's copied correctly.");
    throw new Error(`Lookup failed (${response.status}).`);
  }
  const parsed = parseJsonReply(await response.json());
  return raw ? parsed : sanitizeExtraction(parsed);
}

/* Retrieval inside the app can only reach search snippets for most pages, and a
   page's default snippet is its meta description — which carries name, origin,
   process and tasting notes but almost never elevation or roast level. Snippets
   are query-dependent though, so asking specifically for a missing field
   surfaces a different snippet that often contains it. This runs targeted
   lookups for whatever is still blank and fills only those gaps. */
const GAP_FIELDS = [
  { key: "elevationM", label: "growing elevation (in meters or masl)" },
  { key: "roastLevel", label: "roast level (light / medium / dark)" },
  { key: "variety", label: "coffee variety or cultivar" },
  { key: "producer", label: "producer, farm, or washing station" },
  { key: "process", label: "processing method" },
];

function gapPrompt(missing, ctx) {
  const who = [ctx.roaster, ctx.name].filter(Boolean).join(" ");
  let domain = "";
  try { domain = ctx.roasterUrl ? new URL(ctx.roasterUrl).hostname.replace(/^www\./, "") : ""; } catch { domain = ""; }

  return `Find these specific missing details about the coffee "${ctx.name}" from the roaster "${ctx.roaster}"${ctx.origin ? ` (${ctx.origin})` : ""}:
${missing.map((m) => `- ${m.label}`).join("\n")}

${domain ? `The coffee's own product page is ${ctx.roasterUrl}.` : ""}
Search the web for each field individually, using narrow queries that name the field directly${domain ? `, and prefer restricting to the roaster's own site — e.g. "site:${domain} ${ctx.name} elevation", "site:${domain} ${ctx.name} roast level"` : ` — e.g. "${who} elevation", "${who} roast level"`}. A page's default snippet is its marketing blurb, so specification values usually only appear when the query names the field.

*** ACCURACY REQUIREMENT — READ CAREFULLY ***
Many different roasters sell coffee from the same region, estate, or washing station, often under near-identical names. Those are DIFFERENT COFFEES with DIFFERENT specifications. For example, a dozen roasters sell an Ethiopian "Hambela" and each lists its own distinct elevation.
${domain ? `- ONLY accept a value that comes from ${domain} — the roaster's own website — for this exact coffee.` : `- ONLY accept a value that is unambiguously about ${ctx.roaster}'s specific coffee.`}
- A value from any other roaster's website is WRONG, even if the coffee name matches exactly. Do not use it.
- A general figure for the region, country, or growing area is WRONG. Do not use it.
- If you cannot find the value on the roaster's own page for this exact coffee, return null. A null is correct and useful; a plausible-looking wrong number is harmful because it will be saved and shared with other people.

Respond with ONLY a JSON object, no preamble or code fences, containing just these keys:
{
${missing.map((m) => `  "${m.key}": value or null`).join(",\n")}
}

Formatting:
- elevationM: keep ranges as written, e.g. "1970-2241". Convert feet to meters. Keep open-ended values like "1800+".
- roastLevel: exactly one of "Light", "Light-Medium", "Medium", "Medium-Dark", "Dark". If the roaster shows a scale with only its endpoints labelled (e.g. "Light" and "Medium"), take the midpoint — "Light-Medium".
- process: exactly one of "Washed", "Natural", "Honey", "Anaerobic", "Other/Unknown".`;
}

async function fillGaps(data, apiKey) {
  if (!data?.name) return data;
  const missing = GAP_FIELDS.filter((f) => {
    const v = data[f.key];
    return v === null || v === undefined || v === "";
  });
  if (!missing.length) return data;

  try {
    const found = await askClaude(
      gapPrompt(missing, { name: data.name, roaster: data.roaster, origin: data.origin, roasterUrl: data.sourceUrl }),
      [{ type: "web_search_20250305", name: "web_search", max_uses: 6 }],
      null,
      { raw: true, apiKey }
    );
    for (const m of missing) {
      const v = found?.[m.key];
      if (v === null || v === undefined || v === "") continue;
      if (m.key === "roastLevel" && !ROAST_LEVELS.includes(v)) continue;
      if (m.key === "process" && !PROCESSES.includes(v)) continue;
      data[m.key] = v;
      if (m.key === "roastLevel") data.roastLevelSource = "stated";
    }
  } catch (e) {
    console.error("Gap-field search failed:", e);
    /* gap search unavailable — data is returned as-is, still usable */
  }
  return data;
}

async function fetchCoffeeFromUrl(rawUrl, { forceRefresh = false, apiKey = null } = {}) {
  const url = cleanUrl(rawUrl);

  const cached = await getKey(K.url(url), true);
  if (cached && !forceRefresh && cached.v === EXTRACTION_VERSION && deepFieldCount(cached) > 0) {
    // Cached entries still get a gap pass — an entry saved with blanks
    // shouldn't stay blank forever just because it was cached once.
    const before = deepFieldCount(cached);
    const healed = await fillGaps({ ...cached, sourceUrl: url }, apiKey);
    const data = sanitizeExtraction(healed);
    if (deepFieldCount(data) > before) {
      await setKey(K.url(url), { ...data, v: EXTRACTION_VERSION, sourceUrl: url, cachedAt: Date.now() }, true);
    }
    return { data, fromCache: true };
  }

  let best = null;

  // 1. Read the page ourselves and hand over the real text — no server-side tool needed.
  const page = await readPageText(url);
  if (page.text) {
    // Pull in the page's own product photo when one was found — bag/label
    // photography often makes visually ambiguous things (which line is the
    // actual name vs. a sub-label) obvious in a way plain text can't.
    let imageBlocks = [];
    if (page.images.length) {
      const fetched = await Promise.all(page.images.map((u) => fetchImageAsContentBlock(u)));
      imageBlocks = fetched.filter(Boolean);
    }

    try {
      const content = imageBlocks.length
        ? [...imageBlocks, { type: "text", text: textPrompt(url, page.text) }]
        : textPrompt(url, page.text);
      best = await askClaude(content, null, null, { apiKey });
    } catch (e) {
      console.error("Text-based extraction pass failed:", e);
      /* text pass failed — fall through to server-side fetch tools below */
    }
  }

  // 2. If anything's still missing, try server-side fetch tools and merge in
  //    whatever they find — a second strategy often lands the field the first
  //    one missed, so results are combined rather than replaced.
  if (!best || deepFieldCount(best) < DEEP_FIELDS.length) {
    for (const rung of [
      { tools: [{ type: "web_fetch_20260318", name: "web_fetch", max_uses: 3, max_content_tokens: 40000 }], beta: null },
      { tools: [{ type: "web_fetch_20250910", name: "web_fetch", max_uses: 3, max_content_tokens: 40000 }], beta: "web-fetch-2025-09-10" },
      { tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }], beta: null },
    ]) {
      const before = deepFieldCount(best);
      try {
        const data = await askClaude(urlPrompt(url), rung.tools, rung.beta, { apiKey });
        best = mergeExtractions(best, data);
        const after = deepFieldCount(best);
        if (after >= DEEP_FIELDS.length) break;      // nothing left to find
        if (before > 0 && after === before) break;   // this rung added nothing; further rungs are weaker
      } catch (e) {
        console.error(`Retrieval rung failed:`, e);
        /* this rung unavailable — try the next one */
      }
    }
  }

  if (!best) throw new Error("Couldn't read that page.");
  best.sourceUrl = url;
  best = await fillGaps(best, apiKey);
  const finalData = sanitizeExtraction(best);
  await setKey(K.url(url), { ...finalData, v: EXTRACTION_VERSION, sourceUrl: url, cachedAt: Date.now() }, true);
  return { data: finalData, fromCache: false };
}

async function fetchCoffeeFromImages(images, apiKey) {
  const content = [
    ...images.map((img) => ({ type: "image", source: { type: "base64", media_type: img.mediaType, data: img.data } })),
    { type: "text", text: imagePrompt() },
  ];
  return askClaude(content, null, null, { apiKey });
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = () => reject(new Error("Couldn't read that image."));
    reader.readAsDataURL(file);
  });
}

/* Aggregates never expire and never cap — count grows forever, averages use every sample. */
function emptyAgg() {
  return { count: 0, sumRatio: 0, ratioCount: 0, sumTempC: 0, tempCount: 0, sumTimeS: 0, timeCount: 0, sumGrindPos: 0, grindPosCount: 0 };
}
function addToAgg(agg, shot, equipment) {
  const a = agg || emptyAgg();
  // Relative grind position transfers across grinders where a raw number can't.
  const pos = grindPosition(shot.grindSetting, equipment);
  const hasPos = pos !== null;
  // Temperature is optional — many machines can't control it. It needs its own
  // counter, because folding a missing temp in as 0 would drag every community
  // average toward zero. Range-checked as well as finite: a nonsense value that
  // is merely finite (a negative, say) would still skew every reader's average.
  const rawTemp = shot.tempC === null || shot.tempC === undefined || shot.tempC === "" ? null : Number(shot.tempC);
  const temp = rawTemp;
  const hasTemp = temp !== null && !isNaN(temp) && temp >= INPUT_BOUNDS.tempC[0] && temp <= INPUT_BOUNDS.tempC[1];
  /* A zero or missing dose yields Infinity/NaN, and once either lands in a sum
     it can never be averaged back out — the bucket is poisoned for everyone.
     Anything non-finite is dropped rather than recorded.

     Finiteness alone isn't enough, though: two NEGATIVE values divide to a
     perfectly finite, positive ratio (-38 / -5 = 7.6), which would sail past a
     bare `> 0` check and land a value far outside any real espresso range into
     shared data. The form blocks such input long before here, but this is the
     last gate before other people's recommendations, so it validates the
     source numbers independently rather than trusting the caller. */
  const dose = Number(shot.doseG);
  const yieldG = Number(shot.yieldG);
  const ratio = yieldG / dose;
  const hasRatio =
    Number.isFinite(ratio) && ratio > 0 &&
    dose > 0 && yieldG > 0 &&
    ratio >= ESPRESSO_BOUNDS.ratio[0] && ratio <= ESPRESSO_BOUNDS.ratio[1];
  const time = Number(shot.timeS);
  const hasTime = Number.isFinite(time) && time > 0 && time >= INPUT_BOUNDS.timeS[0] && time <= INPUT_BOUNDS.timeS[1];
  return {
    count: a.count + 1,
    sumRatio: a.sumRatio + (hasRatio ? ratio : 0),
    ratioCount: (a.ratioCount || 0) + (hasRatio ? 1 : 0),
    sumTempC: a.sumTempC + (hasTemp ? temp : 0),
    tempCount: (a.tempCount || 0) + (hasTemp ? 1 : 0),
    sumTimeS: a.sumTimeS + (hasTime ? time : 0),
    timeCount: (a.timeCount || 0) + (hasTime ? 1 : 0),
    sumGrindPos: (a.sumGrindPos || 0) + (hasPos ? pos : 0),
    grindPosCount: (a.grindPosCount || 0) + (hasPos ? 1 : 0),
  };
}
/* Per-field counters (ratioCount, tempCount, timeCount) were added
   after some buckets had already been written. Older records only have `count`,
   so fall back to it rather than silently discarding their data. Temperature is
   the exception: it was genuinely optional from the start, so a missing
   tempCount can't be assumed to mean "every shot had a temperature". */
function aggCount(agg, countField) {
  if (!agg) return 0;
  if (!countField || countField === "count") return agg.count || 0;
  if (agg[countField] != null) return agg[countField];
  // These were added later and are genuinely optional, so a missing counter
  // must not be read as "every shot had one".
  return countField === "tempCount" || countField === "grindPosCount" ? 0 : agg.count || 0;
}
const avg = (agg, field, countField = "count") => {
  const n = aggCount(agg, countField);
  return n ? agg[field] / n : null;
};

/* trust weight: ramps to full at 10 samples, stays at full beyond */
const trustWeight = (count) => Math.min(count, 10) / 10;

/* ---------------- roast/style defaults ---------------- */
const TEMP_BY_ROAST = { Light: 95, "Light-Medium": 94, Medium: 93, "Medium-Dark": 91.5, Dark: 90 };
const RATIO_TABLE = {
  /* Traditional was uniformly shorter than the evidence supports at every roast
     level except Medium. Light and Dark are pulled toward the report's
     highest-confidence single anchors — Hoffmann (~1:2.47) and Hedrick's
     current Meticulous work (1:2.5) explicitly converge on light roast, and
     Hoffmann's own more-developed dial-in (19g -> 38g, ~1:2) anchors the dark
     end. Medium is untouched: it already matches the SCA's modern-survey
     center and is the report's best-supported row. Light-Medium and
     Medium-Dark are interpolated between their neighbors. */
  Traditional: { Light: 2.5, "Light-Medium": 2.35, Medium: 2.0, "Medium-Dark": 1.9, Dark: 1.8 },
  Turbo: { Light: 3.0, "Light-Medium": 2.8, Medium: 2.6, "Medium-Dark": 2.4, Dark: 2.2 },
  Ristretto: { Light: 1.5, "Light-Medium": 1.4, Medium: 1.3, "Medium-Dark": 1.2, Dark: 1.1 },
  /* Only Dark was outside the evidence range (2.4, vs a 2.5 floor). Nudged to
     2.5 — the minimum change that clears the floor while staying distinctly
     below Medium-Dark, preserving the table's existing descending pattern. */
  Lungo: { Light: 3.2, "Light-Medium": 3.0, Medium: 2.8, "Medium-Dark": 2.6, Dark: 2.5 },
};
const TIME_TABLE = {
  Traditional: { normal: [25, 32], dark: [22, 28] },
  Turbo: { normal: [12, 18], dark: [12, 18] },
  Ristretto: { normal: [20, 25], dark: [18, 23] },
  Lungo: { normal: [30, 40], dark: [28, 36] },
};
const isDarkish = (r) => r === "Dark" || r === "Medium-Dark";

/* `Number(x) || fallback` looks like a guard but passes negatives and Infinity,
   both of which a bare number input accepts. Dose underpins every derived
   figure, so it gets a real range check. */
const safeDose = (v, fallback = 18) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= INPUT_BOUNDS.doseG[0] && n <= INPUT_BOUNDS.doseG[1] ? n : fallback;
};

/* Temperatures are ALWAYS stored in Celsius. Only display and input convert —
   otherwise a Fahrenheit user would write 200 into a shared community bucket
   that a Celsius user then reads as 200C. */
// Rounding used to happen at BOTH steps of a unit round-trip (F->C on store,
// C->F on display), and two roundings compound: typing 193F stored as 89.4C
// then displayed back as 192.9F — never the number that was actually typed.
// The fix is to round only once, at the boundary the person actually reads —
// keeping the stored Celsius value at full precision and rounding only on
// display recovers the exact input for any whole-degree value.
const cToF = (c) => Math.round((Number(c) * 9) / 5 + 32);
const fToC = (f) => ((Number(f) - 32) * 5) / 9;
const cToC = (c) => Math.round(Number(c));
const tempUnitOf = (eq) => (eq?.tempUnit === "F" ? "F" : "C");
/* Not every machine can control brew temperature, so tracking it is opt-out. */
const tracksTemp = (eq) => eq?.trackTemp !== false;
const showTemp = (c, eq) => (c === null || c === undefined ? "" : tempUnitOf(eq) === "F" ? cToF(c) : cToC(c));
const readTemp = (v, eq) => (v === "" || v === null || v === undefined ? null : tempUnitOf(eq) === "F" ? fToC(v) : cToC(v));
const tempLabel = (eq) => (tempUnitOf(eq) === "F" ? "\u00B0F" : "\u00B0C");
const degStep = (eq) => (tempUnitOf(eq) === "F" ? 2 : 1);

/* A free-text taste preference is read for direction only, and every word that
   influenced the result is shown back to the user so the reasoning is visible
   rather than a black box. */
const CLARITY_WORDS = /\b(clarity|clean|bright|tea[- ]?like|delicate|floral|citrus|lemon|bergamot|fruity|fruit[- ]forward|juicy|light roast|lighter roast|nuanced|acidity|sparkl\w*|complex|berry|tropical)\b/gi;
const BODY_WORDS = /\b(body|rich|syrupy|thick|heavy|bold|chocolate|cocoa|nutty|caramel|creamy|comfort|classic|traditional|milk drinks?|latte|cappuccino|flat white|cortado|dark roast|darker roast|sweet\w* finish)\b/gi;

function readPreferences(text) {
  if (!text) return null;
  const clarity = [...new Set((String(text).match(CLARITY_WORDS) || []).map((w) => w.toLowerCase()))];
  const body = [...new Set((String(text).match(BODY_WORDS) || []).map((w) => w.toLowerCase()))];
  if (!clarity.length && !body.length) return null;
  const lean = clarity.length > body.length ? "clarity" : body.length > clarity.length ? "body" : "balanced";
  return { lean, matched: (lean === "body" ? body : clarity).slice(0, 4) };
}

/* ---------------- elevation parsing ----------------
   Accepts a single figure or a range, with or without units:
   "1900" · "1900m" · "1970-2241" · "1,970 – 2,241 masl" · "6500ft"
---------------------------------------------------- */
function parseElevation(input) {
  if (input === null || input === undefined) return null;
  const raw = String(input).trim();
  if (!raw) return null;
  // A leading minus means the entry is wrong, not that the elevation is
  // negative. The digit regex below would silently drop the sign and read
  // "-500" as 500m, so reject outright rather than invent a plausible value.
  // Dashes *between* numbers are range separators and must still be allowed.
  if (/^\s*[-–—]/.test(raw)) return null;
  const inFeet = /(?:\d|\s|^)(?:ft|feet|foot)\b|'/i.test(raw);
  const nums = raw.replace(/,/g, "").match(/\d+(?:\.\d+)?/g);
  if (!nums) return null;
  let vals = nums.map(Number).filter((n) => n > 0 && n < 20000);
  if (!vals.length) return null;
  if (inFeet) vals = vals.map((v) => Math.round(v * 0.3048));
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  return { min, max, mid: Math.round((min + max) / 2), isRange: min !== max, converted: inFeet };
}

function formatElevation(input) {
  const p = parseElevation(input);
  if (!p) return null;
  const n = (v) => v.toLocaleString();
  return p.isRange ? `${n(p.min)}–${n(p.max)} m` : `${n(p.min)} m`;
}

/* ---------------- read every relevant community bucket ---------------- */
async function fetchBuckets({ name, roaster, roasterUrl, roastLevel, style, origin, process, variety, elevationM }) {
  const roasterKey = roasterBucketKey(roaster, roasterUrl);
  const similarKey = K.similarRecipe(roastLevel, style, origin, process, variety);
  const elevationKey = K.elevationRecipe(roastLevel, style, elevationM);
  // Community buckets are keyed only by the coffee and its roast + style. Raw
  // grind numbers are never shared (meaningless across dials), but grind
  // POSITION — where a setting sits as a fraction of each person's own espresso
  // range — is, since that does translate. Personal history is loaded alongside
  // and takes priority over it, being the same grinder.
  const [exactCoffee, recipeB, similarRecipe, elevationRecipe, personal] = await Promise.all([
    getKey(K.coffee(roasterKey, name), true),
    getKey(K.recipe(roastLevel, style), true),
    similarKey ? getKey(similarKey, true) : Promise.resolve(null),
    elevationKey ? getKey(elevationKey, true) : Promise.resolve(null),
    getKey(PERSONAL_KEY),
  ]);
  return { exactCoffee, recipeB, similarRecipe, elevationRecipe, personalSamples: personal?.samples || [] };
}

/* Layer buckets most-specific-first for each variable independently. */
function layeredValue(candidates) {
  // candidates: [{agg, label, field, countField}] in priority order
  for (const c of candidates) {
    const count = aggCount(c.agg, c.countField);
    const value = c.agg ? avg(c.agg, c.field, c.countField || "count") : null;
    // Guard against a legacy bucket that recorded a non-finite value before
    // aggregation was hardened — better to fall through than to trust it.
    if (count >= 3 && Number.isFinite(value)) {
      return { value, count, label: c.label, weight: trustWeight(count) };
    }
  }
  return null;
}

function computeBaseline(data, equipment, buckets) {
  const { roastLevel, elevationM, process, style, customTargets, roaster, espressoNotes, tastingNotes, variety, summary } = data;
  const dose = safeDose(equipment?.doseG);
  const styleAgg = (b) => b?.styles?.[style];

  /* Roast level is optional at creation. Resolve one working value, once:
     - a real, user/roaster-given value passes straight through
     - if data already carries an estimate/assumption from a prior save
       (e.g. a style change on an already-created coffee), that resolution
       is trusted as-is rather than re-guessed, so the badge stays stable
     - otherwise infer from whatever signal exists (tasting notes, variety,
       process), and if even that comes up empty, assume Medium outright */
  const priorlyUnconfirmed = data.roastLevelSource === "estimated" || data.roastLevelSource === "assumed" || data.roastLevelSource === "scale";
  let resolvedRoast = roastLevel || null;
  let roastSource = priorlyUnconfirmed ? data.roastLevelSource : null;
  let roastBasis = priorlyUnconfirmed ? data.roastLevelBasis : null;
  if (!resolvedRoast) {
    const guess = inferRoastLevel({ tastingNotes, summary, espressoNotes, variety, process });
    if (guess) {
      resolvedRoast = guess.level;
      roastSource = "estimated";
      roastBasis = guess.basis;
    } else {
      resolvedRoast = "Medium";
      roastSource = "assumed";
      roastBasis = null;
    }
  }

  if (style === "Custom" && customTargets) {
    /* The form validates these before they can be saved, so bad values should
       never reach here. This stays as a last-resort backstop for records
       written before validation existed — it clamps rather than reports,
       because by this point there's no field left to point the person at. */
    const pos = (v, fallback, lo, hi) => {
      const n = Number(v);
      if (!Number.isFinite(n) || n <= 0) return fallback;
      return Math.min(hi, Math.max(lo, n));
    };
    const cYield = pos(customTargets.yieldG, Math.round(dose * 2), 5, 200);
    const cLow = Math.round(pos(customTargets.timeLow, 25, 5, 120));
    let cHigh = Math.round(pos(customTargets.timeHigh, cLow + 7, 5, 120));
    if (cHigh <= cLow) cHigh = cLow + 3;
    const cTemp = pos(customTargets.tempC, TEMP_BY_ROAST[resolvedRoast] ?? 93, 70, 105);
    return {
      doseG: dose,
      ratio: Number((cYield / dose).toFixed(2)),
      yieldG: cYield,
      timeLow: cLow,
      timeHigh: cHigh,
      tempC: cTemp,
      grindHint: "Custom target — dial grind purely against your own time/taste read.",
      grindValue: null,
      grindSuggestion: null, notes: [], sources: [],
      style,
      resolvedRoastLevel: resolvedRoast, roastLevelSource: roastSource, roastLevelBasis: roastBasis,
    };
  }

  /* Ratio/temp lookups use the resolved roast, with a floor that can't come
     back undefined: exact roast → this style's own Medium tier (so an
     unconfirmed-roast Turbo still gets Turbo math, not Traditional math) →
     Traditional Medium as the absolute last resort. */
  let ratio = RATIO_TABLE[style]?.[resolvedRoast] ?? RATIO_TABLE[style]?.Medium ?? RATIO_TABLE.Traditional.Medium;
  let tempC = TEMP_BY_ROAST[resolvedRoast] ?? TEMP_BY_ROAST.Medium;
  let [timeLow, timeHigh] = (TIME_TABLE[style] || TIME_TABLE.Traditional)[isDarkish(resolvedRoast) ? "dark" : "normal"];
  const sources = [];

  /* The roaster dialed this coffee on their own bar, so their published
     espresso recipe is a strong prior — but real dialed-in shots from
     people using it beat it, so community data is checked first. It only
     shapes Traditional; Turbo/Ristretto/Lungo are deliberate departures. */
  const rr = data.roasterRecipe;
  const finitePos = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : null);
  const rawRrRatio = rr?.ratio ?? (rr?.doseG && rr?.yieldG ? rr.yieldG / rr.doseG : null);
  // Persisted recipes are replayed on every recompute, so a record written under
  // older extraction rules could still hold an out-of-band value. Re-check here.
  const rrRatio = (() => {
    const v = finitePos(rawRrRatio);
    return v !== null && v >= ESPRESSO_BOUNDS.ratio[0] && v <= ESPRESSO_BOUNDS.ratio[1] ? v : null;
  })();
  const rrTemp = (() => {
    const v = finitePos(rr?.tempC);
    return v !== null && v >= ESPRESSO_BOUNDS.tempC[0] && v <= ESPRESSO_BOUNDS.tempC[1] ? v : null;
  })();
  const rrTimeLow = (() => {
    const v = finitePos(rr?.timeLow);
    return v !== null && v >= ESPRESSO_BOUNDS.timeS[0] && v <= ESPRESSO_BOUNDS.timeS[1] ? v : null;
  })();
  const rrTimeHigh = (() => {
    const v = finitePos(rr?.timeHigh);
    return v !== null && v >= ESPRESSO_BOUNDS.timeS[0] && v <= ESPRESSO_BOUNDS.timeS[1] ? v : rrTimeLow;
  })();
  const rrLabel = `${roaster || "the roaster"}'s published recipe`;
  const roastLabel = resolvedRoast;
  const ROASTER_WEIGHT = 0.65;

  // --- ratio / temp / time: exact coffee (this style) → exact coffee (any style) → roast+style
  // Your own history on similar coffees outranks the community average — same
  // machine, water and palate — but is still outranked by data on this exact bag.
  const ownSimilar = personalAggregate(buckets?.personalSamples, resolvedRoast, style);
  const rtCandidates = [
    { agg: styleAgg(buckets?.exactCoffee), label: `this exact coffee in ${style} style` },
    { agg: ownSimilar, label: `your own ${roastLabel} ${style} shots` },
    { agg: styleAgg(buckets?.similarRecipe) || buckets?.similarRecipe, label: `similar ${roastLabel} ${style} coffees (same origin/process/variety)` },
    { agg: styleAgg(buckets?.elevationRecipe) || buckets?.elevationRecipe, label: `${roastLabel} ${style} coffees at a similar elevation` },
    { agg: styleAgg(buckets?.recipeB) || buckets?.recipeB, label: `${roastLabel} roast, ${style} style` },
  ];
  const ratioHit = layeredValue(rtCandidates.map((c) => ({ ...c, field: "sumRatio", countField: "ratioCount" })));
  if (ratioHit) {
    ratio = ratio * (1 - ratioHit.weight) + ratioHit.value * ratioHit.weight;
    sources.push({ what: "Ratio", label: ratioHit.label, count: ratioHit.count });
  } else if (style === "Traditional" && rrRatio) {
    ratio = ratio * (1 - ROASTER_WEIGHT) + rrRatio * ROASTER_WEIGHT;
    sources.push({ what: "Ratio", label: rrLabel, kind: "roaster" });
  }

  const tempCandidates = [
    { agg: styleAgg(buckets?.exactCoffee), label: `this exact coffee in ${style} style`, field: "sumTempC", countField: "tempCount" },
    { agg: styleAgg(buckets?.similarRecipe) || buckets?.similarRecipe, label: `similar ${roastLabel} ${style} coffees (same origin/process/variety)`, field: "sumTempC", countField: "tempCount" },
    { agg: styleAgg(buckets?.elevationRecipe) || buckets?.elevationRecipe, label: `${roastLabel} ${style} coffees at a similar elevation`, field: "sumTempC", countField: "tempCount" },
    { agg: styleAgg(buckets?.recipeB) || buckets?.recipeB, label: `${roastLabel} roast, ${style} style`, field: "sumTempC", countField: "tempCount" },
  ];
  const tempHit = layeredValue(tempCandidates);
  if (tempHit) {
    tempC = tempC * (1 - tempHit.weight) + tempHit.value * tempHit.weight;
    sources.push({ what: "Temp", label: tempHit.label, count: tempHit.count });
  } else if (rrTemp !== null) {
    tempC = tempC * (1 - ROASTER_WEIGHT) + rrTemp * ROASTER_WEIGHT;
    sources.push({ what: "Temp", label: rrLabel, kind: "roaster" });
  }

  const timeHit = layeredValue([
    { agg: styleAgg(buckets?.exactCoffee), label: `this exact coffee in ${style} style`, field: "sumTimeS", countField: "timeCount" },
    { agg: ownSimilar, label: `your own ${roastLabel} ${style} shots`, field: "sumTimeS", countField: "timeCount" },
    { agg: styleAgg(buckets?.similarRecipe) || buckets?.similarRecipe, label: `similar ${roastLabel} ${style} coffees (same origin/process/variety)`, field: "sumTimeS", countField: "timeCount" },
    { agg: styleAgg(buckets?.elevationRecipe) || buckets?.elevationRecipe, label: `${roastLabel} ${style} coffees at a similar elevation`, field: "sumTimeS", countField: "timeCount" },
    { agg: styleAgg(buckets?.recipeB) || buckets?.recipeB, label: `${roastLabel} roast, ${style} style`, field: "sumTimeS", countField: "timeCount" },
  ]);

  /* Grind position is stored as a fraction of each person's own espresso range,
     so it can be translated back onto this person's dial. It's a starting hint
     only — everyone draws their espresso range slightly differently, and burr
     wear and alignment still vary — so it never overrides shot time. */
  const posHit = layeredValue([
    { agg: styleAgg(buckets?.exactCoffee), label: `this exact coffee in ${style} style`, field: "sumGrindPos", countField: "grindPosCount" },
    { agg: styleAgg(buckets?.similarRecipe) || buckets?.similarRecipe, label: `similar ${roastLabel} ${style} coffees (same origin/process/variety)`, field: "sumGrindPos", countField: "grindPosCount" },
    { agg: styleAgg(buckets?.elevationRecipe) || buckets?.elevationRecipe, label: `${roastLabel} ${style} coffees at a similar elevation`, field: "sumGrindPos", countField: "grindPosCount" },
    { agg: styleAgg(buckets?.recipeB) || buckets?.recipeB, label: `${roastLabel} roast, ${style} style`, field: "sumGrindPos", countField: "grindPosCount" },
  ]);
  let grindSuggestion = null;
  // The person's own history wins when it exists: it's the same grinder, so no
  // normalisation error, and it already reflects their burrs and calibration.
  const ownStart = personalStartGrind(buckets?.personalSamples, resolvedRoast, style, equipment);
  if (ownStart) {
    grindSuggestion = { value: ownStart.value, count: ownStart.count, label: ownStart.label, own: true };
  } else if (posHit && Number.isFinite(posHit.value)) {
    const setting = positionToSetting(posHit.value, equipment);
    if (setting !== null) {
      const pct = Math.round(posHit.value * 100);
      grindSuggestion = {
        value: setting,
        count: posHit.count,
        label: posHit.label,
        where: pct <= 33 ? "the finer end" : pct >= 67 ? "the coarser end" : "the middle",
      };
    }
  }

  if (timeHit) {
    const width = (timeHigh - timeLow) / 2;
    const center = (timeLow + timeHigh) / 2;
    const blended = center * (1 - timeHit.weight) + timeHit.value * timeHit.weight;
    timeLow = Math.round(blended - width);
    timeHigh = Math.round(blended + width);
    sources.push({ what: "Time", label: timeHit.label, count: timeHit.count });
  } else if (style === "Traditional" && rrTimeLow !== null) {
    const rLow = rrTimeLow;
    const rHigh = rrTimeHigh ?? rrTimeLow;
    timeLow = Math.round(timeLow * (1 - ROASTER_WEIGHT) + rLow * ROASTER_WEIGHT);
    timeHigh = Math.round(timeHigh * (1 - ROASTER_WEIGHT) + rHigh * ROASTER_WEIGHT);
    if (timeHigh <= timeLow) timeHigh = timeLow + 3;
    sources.push({ what: "Time", label: rrLabel, kind: "roaster" });
  }

  /* Community data says what works generally; the roaster says what works on
     their bar; preference is the last, smallest nudge toward the user's own
     taste. Applied last and kept modest so it tunes rather than overrides. */
  const prefs = readPreferences(equipment?.tastingPreferences);
  if (prefs && prefs.lean !== "balanced" && style !== "Custom") {
    const delta = prefs.lean === "clarity" ? 0.15 : -0.15;
    ratio = Number((ratio + delta).toFixed(2));
    sources.push({
      what: "Ratio",
      label: `your preference for ${prefs.lean} (${prefs.matched.join(", ")})`,
      kind: "preference",
    });
  }

  const yieldG = Math.round(dose * ratio);
  const notes = [];
  if (roastSource === "estimated") {
    notes.push(`Roast level not given — estimated as ${resolvedRoast} from ${roastBasis}. Edit it if you know better.`);
  } else if (roastSource === "assumed") {
    notes.push(`No roast level given and nothing else suggested one — assuming a neutral Medium baseline (1:2, ~93°C). Add a roast level for a more tailored starting point.`);
  }
  if (prefs?.lean === "clarity" && style === "Traditional" && ["Light", "Light-Medium"].includes(resolvedRoast)) {
    notes.push("You lean toward clarity and this is a light roast — Turbo style is worth trying here, since it tends to give a cleaner, more separated cup than a traditional shot.");
  }
  const elev = parseElevation(elevationM);
  if (elev && elev.mid >= 1700) notes.push("High-grown, dense bean — expect to grind finer than usual to hit the target time.");
  if (elev && elev.isRange && elev.max - elev.min >= 400) {
    notes.push("Wide elevation spread suggests several lots blended together — bean density varies across the batch, so shots may be a little less repeatable than a single-elevation lot.");
  }
  if (["Natural", "Honey", "Anaerobic"].includes(process)) notes.push("Fruit-forward process — extra care with distribution; if flavors turn winey or fermented, try a shorter ratio.");
  /* These cautions assert something about the bean, so they only fire when the
     roast level is actually known. Firing them off an assumed Medium would
     contradict the "no roast level given" note directly above. An estimated
     value is good enough — it's derived from real signals on the page. */
  const roastIsKnown = roastSource !== "assumed";
  if (roastIsKnown && style === "Turbo" && !["Light", "Light-Medium"].includes(resolvedRoast)) notes.push("Turbo is best documented on light/light-medium roasts — darker beans may just taste hollow at this ratio.");
  if (roastIsKnown && isDarkish(resolvedRoast) && style === "Traditional") notes.push("Dark roasts extract fast — lean coarser and watch for bitterness creeping in early.");
  if (roastIsKnown && resolvedRoast === "Light" && style === "Traditional") notes.push("Light roasts resist extraction — lean finer, and don't be afraid of the longer ratio.");
  if (espressoNotes) notes.push(`${roaster || "The roaster"} on this as espresso: ${espressoNotes}`);

  /* A formula/community-blended recipe can land outside INPUT_BOUNDS at the
     edges of the input space — a very short ratio at the dose floor, or a long
     one at the dose ceiling. The log form pre-fills straight from this recipe,
     so without a clamp here it could open already flagged red for a combination
     the person never typed by hand. Clamping yield recomputes ratio so the two
     can never contradict each other on screen. */
  const clampedYield = Math.min(INPUT_BOUNDS.yieldG[1], Math.max(INPUT_BOUNDS.yieldG[0], yieldG));
  const clampedRatio = Number((clampedYield / dose).toFixed(2));
  const clampedTimeLow = Math.min(INPUT_BOUNDS.timeS[1], Math.max(INPUT_BOUNDS.timeS[0], timeLow));
  const clampedTimeHigh = Math.max(clampedTimeLow + 1, Math.min(INPUT_BOUNDS.timeS[1], Math.max(INPUT_BOUNDS.timeS[0], timeHigh)));
  const clampedTemp = Math.min(INPUT_BOUNDS.tempC[1], Math.max(INPUT_BOUNDS.tempC[0], tempC));

  return {
    doseG: dose,
    ratio: clampedRatio,
    yieldG: clampedYield,
    timeLow: clampedTimeLow, timeHigh: clampedTimeHigh,
    tempC: Number(clampedTemp.toFixed(1)),
    style,
    resolvedRoastLevel: resolvedRoast,
    roastLevelSource: roastSource,
    roastLevelBasis: roastBasis,
    grindHint: grindSuggestion?.own
      ? `Start around ${grindSuggestion.value} — the median of ${grindSuggestion.label} (${grindSuggestion.count} shots on your grinder). Adjust from there on shot time.`
      : grindSuggestion
      ? `Start around ${grindSuggestion.value} — ${grindSuggestion.count} dialed-in shot${grindSuggestion.count === 1 ? "" : "s"} for ${grindSuggestion.label} landed toward ${grindSuggestion.where} of the espresso range. Adjust from there on shot time.`
      : style === "Turbo"
      ? "Start noticeably coarser than a traditional shot — turbo relies on fast, even flow, not resistance."
      : rangeMidpoint(equipment),
    /* A real number for the recipe grid itself, not just the sentence below
       it — grindHint explains WHY, this is what to actually dial to. Real
       data always wins. The equipment midpoint fills in when there's none,
       EXCEPT for Turbo and Custom: showing a plain "start here" number next
       to text that says "start coarser than this" (Turbo) or "no formula
       anchor" (Custom) would have the number and the sentence beside it
       contradicting each other. */
    grindValue: grindSuggestion?.value ?? (style !== "Turbo" && style !== "Custom" ? equipmentMidpoint(equipment)?.value ?? null : null),
    grindSuggestion,
    notes,
    sources,
  };
}

/* ---------------- grind math (lower = finer, always) ---------------- */
function grindStep(equipment) {
  const min = Number(equipment?.grinderMin);
  const max = Number(equipment?.grinderMax);
  if (isNaN(min) || isNaN(max)) return null;
  const range = Math.abs(max - min);
  if (!range) return null;
  return Math.max(0.1, Math.round(range * 0.03 * 10) / 10);
}
/* Where a setting sits inside the person's own espresso range, 0 = finest,
   1 = coarsest. Raw grind numbers mean nothing across grinders, but a relative
   position does: "most people land toward the fine end for this coffee" holds
   whether the dial reads 0-10 or 1-40. This is the only grind signal that can
   honestly be shared. It still assumes people define their espresso range
   comparably, which is why it's only ever used as a soft hint. */
function grindPosition(grindSetting, equipment) {
  const g = parseFloat(grindSetting);
  const min = Math.min(Number(equipment?.grinderMin), Number(equipment?.grinderMax));
  const max = Math.max(Number(equipment?.grinderMin), Number(equipment?.grinderMax));
  if (!Number.isFinite(g) || !Number.isFinite(min) || !Number.isFinite(max) || max === min) return null;
  return Math.min(1, Math.max(0, (g - min) / (max - min)));
}
function positionToSetting(pos, equipment) {
  const min = Math.min(Number(equipment?.grinderMin), Number(equipment?.grinderMax));
  const max = Math.max(Number(equipment?.grinderMin), Number(equipment?.grinderMax));
  if (!Number.isFinite(min) || !Number.isFinite(max) || max === min) return null;
  return Math.round((min + pos * (max - min)) * 10) / 10;
}

/* How many seconds of shot time one unit of grind actually moves, learned from
   the person's own history rather than assumed. Only consecutive shots where
   the grind moved and dose/yield held roughly steady are used, so the time
   change can reasonably be attributed to grind. The median is taken because a
   single channeled shot would otherwise skew it badly. */
function learnGrindSensitivity(shots = []) {
  // Shot history is loaded from storage, so it can arrive as a non-array or
  // contain null/partial entries from a truncated write. Guard here rather
  // than at each call site, since this is the only consumer of the raw list.
  if (!Array.isArray(shots)) return null;
  const samples = [];
  for (let i = 0; i < shots.length - 1; i++) {
    const newer = shots[i];
    const older = shots[i + 1];
    if (!newer || !older || typeof newer !== "object" || typeof older !== "object") continue;
    const g1 = parseFloat(newer.grindSetting);
    const g0 = parseFloat(older.grindSetting);
    const t1 = Number(newer.timeS);
    const t0 = Number(older.timeS);
    if (![g1, g0, t1, t0].every(Number.isFinite)) continue;
    const dg = g1 - g0;
    if (Math.abs(dg) < 0.05) continue;
    // Attribute the time change to grind only if the other levers held steady.
    if (Math.abs(Number(newer.doseG) - Number(older.doseG)) > 0.6) continue;
    if (Math.abs(Number(newer.yieldG) - Number(older.yieldG)) > 3) continue;
    const sens = (t1 - t0) / dg;
    if (Number.isFinite(sens)) samples.push(sens);
  }
  if (samples.length < 2) return null;
  samples.sort((a, b) => a - b);
  const mid = Math.floor(samples.length / 2);
  const median = samples.length % 2 ? samples[mid] : (samples[mid - 1] + samples[mid]) / 2;
  // Expect negative: coarser (higher number) means less time. A near-zero or
  // positive slope means the data is too noisy to trust.
  if (!Number.isFinite(median) || median > -0.5) return null;
  return { secondsPerUnit: median, samples: samples.length };
}

/* Uses learned sensitivity to say how far to move, instead of a fixed step. */
function grindMoveForTime(shot, recipe, equipment, sensitivity) {
  const current = parseFloat(shot.grindSetting);
  if (!Number.isFinite(current) || !sensitivity) return null;
  const targetTime = (recipe.timeLow + recipe.timeHigh) / 2;
  const deltaT = targetTime - Number(shot.timeS);
  if (!Number.isFinite(deltaT)) return null;
  const deltaG = deltaT / sensitivity.secondsPerUnit;
  const min = Math.min(Number(equipment?.grinderMin), Number(equipment?.grinderMax));
  const max = Math.max(Number(equipment?.grinderMin), Number(equipment?.grinderMax));
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  const next = Math.round(Math.min(max, Math.max(min, current + deltaG)) * 10) / 10;
  if (next === Math.round(current * 10) / 10) return null;
  return { value: next, samples: sensitivity.samples };
}

/* Returns the next setting to try, or flags that the grinder is already at the
   end of its espresso range — in which case grind can't solve the problem and
   dose/ratio have to move instead. */
function grindAdvice(currentStr, direction, equipment) {
  const current = parseFloat(currentStr);
  const step = grindStep(equipment);
  if (isNaN(current) || step === null) return { value: null, atLimit: false };
  const min = Math.min(Number(equipment.grinderMin), Number(equipment.grinderMax));
  const max = Math.max(Number(equipment.grinderMin), Number(equipment.grinderMax));
  const raw = direction === "finer" ? current - step : current + step;
  const next = Math.round(Math.min(max, Math.max(min, raw)) * 10) / 10;
  if (next === Math.round(current * 10) / 10) return { value: null, atLimit: true };
  return { value: next, atLimit: false };
}

/* ---------------- suggestion engine ---------------- */
/* The one definition of "dialed in", shared by logging a new shot and editing
   an existing one — otherwise an edit could leave a stale stamp that no longer
   matches the numbers shown beside it. */
/* Taste is the real signal. A shot that tastes right but ran a few seconds past
   the style's window is still a good shot — the window is a guide, not a rule —
   so a generous tolerance applies before time can disqualify anything. */
/* Per-style, per-direction time tolerance. The evidence report doesn't give
   exact tolerance numbers (its own confidence in time bands is Low almost
   everywhere) — these are a reasoned synthesis of its qualitative claims, each
   floored at 5s so no style is ever stricter than the general case:

   - Traditional: floor on the fast side (nothing supports an unusually short
     traditional shot), but generously wide on the slow side — light-roast
     conventional shots documented to 40s, and lever/preinfusion profiles
     explicitly noted reaching 50-60s while still tasting better as yield rose.
   - Turbo: the inverse. Wide on the fast side — the research anchor's own café
     implementation routinely reached ~14s, well under typical windows — but
     floored on the slow side, since running slow abandons the low-resistance,
     high-flow regime that defines the method in the first place.
   - Ristretto and Lungo: the report states both "should primarily be defined
     by ratio, not arbitrary time," so both get a modest, roughly symmetric
     widening rather than a floor — time simply matters less as a gate for
     either. Lungo's slow side gets slightly more room, consistent with the
     controlled data showing extraction keeps climbing as ratio lengthens,
     with no observed upper bound. */
const TIME_TOLERANCE_S = {
  /* Traditional's slow side is roast-dependent, not a flat number: a delicious
     45s shot on a dark roast confirmed the tolerance needed to be wider than
     the earlier flat +10s guess, and light roast's documented lever/preinfusion
     ceiling (50-60s) argues for even more room there than on darker roasts. */
  Traditional: { fast: 5, slow: { normal: 18, dark: 17 } }, // ceilings: 32+18=50s, 28+17=45s
  Turbo: { fast: 10, slow: 5 },
  Ristretto: { fast: 7, slow: 7 },
  Lungo: { fast: 7, slow: 10 },
};

function timeTolerance(style, isDark = false) {
  const t = TIME_TOLERANCE_S[style] || TIME_TOLERANCE_S.Traditional;
  const slowRaw = typeof t.slow === "object" ? (isDark ? t.slow.dark : t.slow.normal) : t.slow;
  return { fast: Math.max(5, t.fast), slow: Math.max(5, slowRaw) };
}

function shotIsDialedIn(shot, recipe) {
  const raw = shotScales(shot) || {};
  if (!tasteScalesComplete(raw)) return false;
  const time = Number(shot?.timeS);
  if (!Number.isFinite(time)) return false;
  const lo = Number(recipe?.timeLow);
  const hi = Number(recipe?.timeHigh);
  if (Number.isFinite(lo) && Number.isFinite(hi)) {
    const tol = timeTolerance(recipe?.style, isDarkish(recipe?.resolvedRoastLevel));
    if (time < lo - tol.fast || time > hi + tol.slow) return false;
  }
  /* Every axis must read pure green on the exact ramp the sliders and compass
     use — anything less than a fully centered, ideal shot no longer counts.
     This guarantees the compass is always a solid green pentagon whenever the
     badge says Dialed In; the two can no longer visually contradict each other. */
  return TASTE_SCALES.every((s) => scaleRampColor(s, raw[s.key]) === COLORS.ramp[0]);
}

/* What the shot actually IS, judged by its own numbers rather than by the style
   label attached to it. Used to tell someone when a great shot has drifted into
   a different style's territory. */
function styleFromNumbers(ratio, timeS) {
  if (!Number.isFinite(ratio)) return null;
  if (ratio <= 1.6) return "Ristretto";
  if (Number.isFinite(timeS) && timeS <= 20 && ratio >= 2.2) return "Turbo";
  if (ratio >= 2.8) return "Lungo";
  return "Traditional";
}

/* The recipe a dialed-in shot implies. Shared so that logging a shot, editing
   one, and reconciling an older record all produce exactly the same result. */
function recipeFromDialedShot(shot, recipe, equipment) {
  const next = { ...recipe };
  const dose = Number(shot.doseG);
  const yld = Number(shot.yieldG);
  const time = Number(shot.timeS);
  if (Number.isFinite(dose) && dose > 0) next.doseG = dose;
  if (Number.isFinite(yld) && yld > 0) next.yieldG = yld;
  if (Number.isFinite(time) && time > 0) {
    const halfWidth = Math.max(2, Math.round((recipe.timeHigh - recipe.timeLow) / 2));
    next.timeLow = Math.max(INPUT_BOUNDS.timeS[0], Math.round(time - halfWidth));
    next.timeHigh = Math.min(INPUT_BOUNDS.timeS[1], Math.round(time + halfWidth));
  }
  const shotTemp = Number(shot.tempC);
  if (tracksTemp(equipment) && Number.isFinite(shotTemp)) next.tempC = shotTemp;
  if (Number.isFinite(next.yieldG) && Number.isFinite(next.doseG) && next.doseG > 0) {
    next.ratio = Number((next.yieldG / next.doseG).toFixed(2));
  }
  return next;
}

/* A concrete next thing to try when nothing is actually wrong. Espresso is
   rarely "finished" — there's usually a little more sweetness or clarity
   available — so this offers one specific, actionable nudge rather than
   declaring victory. Returns null only when the shot is genuinely maxed out. */
function refinementIdea(v, recipe, equipment) {
  const dose = Number(recipe.doseG);
  const yld = Number(recipe.yieldG);
  const step = Number.isFinite(yld) ? Math.max(1, Math.round(yld * 0.08)) : 3;

  /* Astringency has to come first among the refinements. Any value above 1
     blocks a shot from counting as dialed in, so falling through to the
     generic "nothing obviously left to fix" line would have the app
     contradicting its own verdict — refusing to call the shot done while
     telling the person there is nothing to do about it. Mild dryness is
     usually fines or slightly-too-hot water rather than a scope problem,
     so the nudge is temperature first where the machine allows it. */
  if (v.astringency >= 2) {
    return tracksTemp(equipment)
      ? `Just a touch of dryness on the finish — try dropping the temp about ${degStep(equipment)}${tempLabel(equipment)}, and check your distribution and tamp for fines.`
      : `Just a touch of dryness on the finish — usually fines finding their way through. Recheck distribution (WDT) and tamp level, and try grinding a hair coarser with a slightly longer yield.`;
  }
  if (v.clarity <= 3 && v.sweetness >= 4) {
    return `Sweet but not especially distinct — try extending the yield by about ${step}g to open the shot up and sharpen clarity. Grind a touch finer if it starts running short.`;
  }
  if (v.sweetness <= 3 && tracksTemp(equipment)) {
    return `There's likely more sweetness here — try raising the temp about ${degStep(equipment)}${tempLabel(equipment)}, or extending the yield by about ${step}g.`;
  }
  if (v.sweetness <= 3) {
    return `There's likely more sweetness here — try extending the yield by about ${step}g and grinding slightly finer to keep the shot time.`;
  }
  if (v.clarity === 4 || v.sweetness === 4) {
    return `Close to the top of this coffee — a small yield change either way (±${step}g) is usually what separates a good shot from a great one. Try one longer, then one shorter, and keep whichever wins.`;
  }
  if (Number.isFinite(dose) && dose + 0.5 <= INPUT_BOUNDS.doseG[1]) {
    return `Nothing obviously left to fix. If you want to explore, +0.5g of dose at the same ratio often adds body without losing clarity.`;
  }
  return null;
}

function suggestNext(recipe, shot, equipment, history = [], personalSamples = []) {
  const messages = [];
  /* How far one unit of grind actually moves shot time on this setup. Measured
     on this coffee first, since bean and recipe are held constant there. A new
     bag has no pairs yet, so it falls back to the person's other coffees —
     still their own grinder, so the response curve carries over.

     The fallback must group by coffee before pairing: learnGrindSensitivity
     compares *consecutive* entries, and two adjacent samples from different
     bags aren't a valid comparison — different beans need different grind
     settings, so the apparent slope between them is noise, not sensitivity. */
  // How many times this recipe has already been confirmed — drives whether the
  // engine keeps refining or declares the coffee settled.
  const priorDialedCount = (Array.isArray(history) ? history : []).filter((h) => h && h.dialedIn).length;
  const ownCoffeeSensitivity = learnGrindSensitivity(history);
  const sensitivity =
    ownCoffeeSensitivity ||
    (() => {
      const byCoffee = new Map();
      for (const x of usablePersonalSamples(personalSamples, { requireTime: true })) {
        const key = x.coffeeId || "unknown";
        if (!byCoffee.has(key)) byCoffee.set(key, []);
        byCoffee.get(key).push({
          grindSetting: x.g, timeS: x.t, doseG: x.dose,
          yieldG: x.dose && x.ratio ? x.dose * x.ratio : null,
        });
      }
      // Take the first group that yields a usable slope — each is internally
      // consistent, so no cross-bag pair is ever formed.
      for (const group of byCoffee.values()) {
        const s = learnGrindSensitivity(group);
        if (s) return s;
      }
      return null;
    })();
  // The message below states where the number came from, so it must not claim
  // "this coffee" when the fallback pulled it from a different bag.
  const sensitivitySource = ownCoffeeSensitivity ? "on this coffee" : "on your other coffees";
  const raw = shotScales(shot) || {};
  // A scale left unset is treated as "not reported", never as a fault.
  const v = {
    extraction: raw.extraction ?? 3, body: raw.body ?? 3, clarity: raw.clarity ?? 3,
    sweetness: raw.sweetness ?? 3, astringency: raw.astringency ?? 1,
  };
  const time = Number(shot.timeS);
  const updated = { ...recipe };
  let dialedIn = false;

  /* A shot that tastes right is not "wrong" for running a few seconds long, so
     grind corrections use the same tolerance the dialed-in test does. Without
     this, a tolerated shot would still be told to grind coarser — and, because
     that counts as a correction, would never be allowed to update the recipe. */
  const tastesRight = shotIsDialedIn(shot, recipe);
  const tol = timeTolerance(recipe.style, isDarkish(recipe.resolvedRoastLevel));
  const timeFast = time < recipe.timeLow - (tastesRight ? tol.fast : 0);
  const timeSlow = time > recipe.timeHigh + (tastesRight ? tol.slow : 0);
  const timeOnTarget = !timeFast && !timeSlow;

  // Magnitude of each fault: 0 = fine, 1 = slight, 2 = pronounced.
  const sour = Math.max(0, 3 - v.extraction);
  const bitter = Math.max(0, v.extraction - 3);
  const thin = Math.max(0, 3 - v.body);
  const heavy = Math.max(0, v.body - 3);
  const astringent = Math.max(0, v.astringency - 1);
  const muddled = Math.max(0, 3 - v.clarity);
  const lowSweet = Math.max(0, 3 - v.sweetness);
  const yieldFloor = Math.round(recipe.doseG * 1.1);
  const step = (mag) => (mag >= 2 ? 4 : 2); // pronounced faults move further

  // 1. Time is mechanical — fix it before chasing flavour. If the grinder has
  //    run out of range, grind can no longer solve it, so the advice switches
  //    to the other two levers that change puck resistance: dose and ratio.
  if (timeFast) {
    const calibrated = grindMoveForTime(shot, recipe, equipment, sensitivity);
    const g = grindAdvice(shot.grindSetting, "finer", equipment);
    if (calibrated) {
      messages.push({ kind: "grind", text: `Shot ran fast (${time}s vs target ${recipe.timeLow}-${recipe.timeHigh}s) — go to about ${calibrated.value} (from ${shot.grindSetting}). That's sized from your own last ${calibrated.samples} adjustments ${sensitivitySource}, not a generic step.` });
    } else if (g.value !== null) {
      messages.push({ kind: "grind", text: `Shot ran fast (${time}s vs target ${recipe.timeLow}-${recipe.timeHigh}s) — grind finer, keep dose/yield the same, and re-test. Try around ${g.value} (from ${shot.grindSetting}).` });
    } else if (g.atLimit) {
      messages.push({
        kind: "dose",
        text: `Shot ran fast (${time}s) but you're already at the fine end of your espresso range, so grind can't fix this. Raise the dose by 0.5-1g to build more resistance in the basket — or shorten the yield to about ${Math.max(Math.round(recipe.doseG * 1.1), recipe.yieldG - 4)}g so you stop the shot before it thins out.`,
      });
      updated.doseG = Number(Math.min(INPUT_BOUNDS.doseG[1], recipe.doseG + 0.5).toFixed(1));
    } else {
      messages.push({ kind: "grind", text: `Shot ran fast (${time}s vs target ${recipe.timeLow}-${recipe.timeHigh}s) — grind finer, keep dose/yield the same, and re-test.` });
    }
  } else if (timeSlow) {
    const calibrated = grindMoveForTime(shot, recipe, equipment, sensitivity);
    const g = grindAdvice(shot.grindSetting, "coarser", equipment);
    if (calibrated) {
      messages.push({ kind: "grind", text: `Shot ran slow (${time}s vs target ${recipe.timeLow}-${recipe.timeHigh}s) — go to about ${calibrated.value} (from ${shot.grindSetting}). That's sized from your own last ${calibrated.samples} adjustments ${sensitivitySource}, not a generic step.` });
    } else if (g.value !== null) {
      messages.push({ kind: "grind", text: `Shot ran slow (${time}s vs target ${recipe.timeLow}-${recipe.timeHigh}s) — grind coarser and re-test. Try around ${g.value} (from ${shot.grindSetting}).` });
    } else if (g.atLimit) {
      messages.push({
        kind: "dose",
        text: `Shot ran slow (${time}s) but you're already at the coarse end of your espresso range, so grind can't fix this. Drop the dose by 0.5-1g to reduce resistance — and check the puck for channeling or an overfilled basket.`,
      });
      updated.doseG = Number(Math.max(INPUT_BOUNDS.doseG[0], recipe.doseG - 0.5).toFixed(1));
    } else {
      messages.push({ kind: "grind", text: `Shot ran slow (${time}s vs target ${recipe.timeLow}-${recipe.timeHigh}s) — grind coarser and re-test.` });
    }
  }

  // 2. Poor clarity is a puck-prep defect, not an extraction setting. Chasing
  //    it with grind changes just moves the channel around, so it comes first.
  if (muddled >= 1) {
    const alsoAstringent = astringent >= 1;
    messages.push({
      kind: "prep",
      text: muddled >= 2 || alsoAstringent
        ? "Muddled flavours point to channeling rather than grind size. Recheck distribution (WDT), tamp level, and basket fill before changing anything else."
        : "Slightly blurred flavours usually mean uneven extraction — tighten up distribution and tamp before adjusting grind or ratio.",
    });
  }

  // 3. Extraction balance — the primary flavour axis.
  if (timeOnTarget && muddled < 2) {
    if (sour) {
      const g = step(sour);
      messages.push({
        kind: "yield",
        text: sour >= 2
          ? `Clearly sour at a normal shot time means real under-extraction — grind finer, and try extending the yield by about ${g}g.`
          : `Slightly sour — extend the yield by about ${g}g, or nudge the grind a touch finer.`,
      });
      updated.yieldG = recipe.yieldG + g;
    }
    if (bitter) {
      const g = step(bitter);
      /* At the ratio floor there is no yield left to give back, so advising a
         shorter pull would be advice the app itself then declines to apply —
         the recipe would stay put while the text claimed otherwise. Redirect
         to the levers that do still move: grind and temperature. */
      const atFloor = recipe.yieldG - g < yieldFloor;
      messages.push({
        kind: "yield",
        text: atFloor
          ? `Bitter, but the ratio is already as short as this dose allows (${recipe.yieldG}g from ${recipe.doseG}g). Grind coarser instead${tracksTemp(equipment) ? `, and try dropping the temp about ${degStep(equipment)}${tempLabel(equipment)}` : ""} — shortening further would choke the shot.`
          : bitter >= 2
            ? `Clearly bitter at a normal shot time means over-extraction — grind coarser, and pull about ${g}g shorter.`
            : `Slightly bitter — pull about ${g}g shorter, or nudge the grind a touch coarser.`,
      });
      updated.yieldG = Math.max(yieldFloor, recipe.yieldG - g);
    }

    // 4. Body — ratio, and only when extraction itself isn't the bigger fault.
    if (!sour && !bitter) {
      if (thin) {
        const g = step(thin);
        // Same floor problem as the bitter branch above: don't advise a
        // shorter yield the recipe can't actually take.
        const atFloor = recipe.yieldG - g < yieldFloor;
        messages.push({
          kind: "yield",
          text: atFloor
            ? `Thin body, but the ratio is already as short as this dose allows (${recipe.yieldG}g from ${recipe.doseG}g). Try a finer grind for more resistance, or raise the dose slightly for more body.`
            : `Body is thin with balanced extraction — the ratio is running long for this coffee. Shorten the yield by about ${g}g.`,
        });
        updated.yieldG = Math.max(yieldFloor, recipe.yieldG - g);
      }
      if (heavy) {
        const g = step(heavy);
        messages.push({ kind: "yield", text: `Body is heavy and syrupy — lengthen the yield by about ${g}g to open the shot up.` });
        updated.yieldG = recipe.yieldG + g;
      }
    }
  }

  // 5. Astringency is usually fines or temperature, not ratio.
  if (astringent >= 2 && tracksTemp(equipment)) {
    messages.push({
      kind: "temp",
      text: `A drying, papery finish usually comes from excess fines or water that's too hot — check burr alignment and consider dropping temp about ${degStep(equipment)}${tempLabel(equipment)}.`,
    });
    updated.tempC = Number((recipe.tempC - 1).toFixed(1));
  }

  // 6. Low sweetness with nothing else flagged — nudge temp up rather than ratio.
  if (lowSweet >= 1 && messages.length === 0 && tracksTemp(equipment)) {
    messages.push({
      kind: "temp",
      text: `Balanced but not very sweet — try raising the temp about ${degStep(equipment)}${tempLabel(equipment)}, or extending the yield 2g, to pull more sweetness through.`,
    });
    updated.tempC = Number((recipe.tempC + 1).toFixed(1));
  }

  // A genuinely good shot: both balance axes centred, sweet, clean, not drying.
  // Delegated so editing a shot applies exactly the same test.
  const isDialedIn = shotIsDialedIn(shot, recipe);

  if (isDialedIn && messages.length === 0) {
    dialedIn = true;
    // The shot that actually worked becomes the recipe.
    Object.assign(updated, recipeFromDialedShot(shot, recipe, equipment));

    /* If a great shot has drifted into another style's territory, say so rather
       than silently keeping a label that no longer describes it. Taste already
       decided the shot was good; this is information, not a correction. */
    const labelledStyle = recipe.style || "Traditional";
    const actualStyle = styleFromNumbers(updated.ratio, Number(shot.timeS));
    if (actualStyle && actualStyle !== labelledStyle) {
      messages.push({
        kind: "info",
        text: `Worth knowing: at 1:${updated.ratio} in ${shot.timeS}s this is closer to a ${actualStyle.toLowerCase()} than a ${String(labelledStyle).toLowerCase()}. It tastes right, so it's still dialed in — switch the style if you want the targets to match how you're actually pulling it.`,
      });
    }

    /* Confidence grows with confirmations. One good shot could be luck, so
       until it's been reproduced the engine still nudges toward more sweetness
       and clarity rather than declaring the job finished. */
    const confirmations = priorDialedCount + 1;
    if (confirmations >= 3) {
      messages.push({ kind: "done", text: `Balanced, sweet and clean — and that's ${confirmations} dialed-in shots for this coffee now, so this recipe is well established. Saved to the community record.` });
    } else {
      const remaining = 3 - confirmations;
      messages.push({ kind: "done", text: `Balanced and clean — recipe updated to ${updated.doseG}g → ${updated.yieldG}g at ${time}s. Saved to the community record. ${remaining} more shot${remaining === 1 ? "" : "s"} like this and it's locked in.` });
      const refine = refinementIdea(v, updated, equipment);
      if (refine) messages.push({ kind: "refine", text: refine });
    }
  }
  if (messages.length === 0) {
    // Every shot after the first should give the person something to try, not
    // just "nothing's wrong" — otherwise the log stalls with no next step.
    const refine = refinementIdea(v, updated, equipment);
    messages.push({
      kind: refine ? "refine" : "info",
      text: refine || "Nothing clearly off, but not quite dialed in either — log another shot to confirm it repeats.",
    });
  }
  // Ratio is derived from dose and yield, so it has to be recomputed whenever a
  // correction moves the yield — otherwise the recipe card shows a ratio that
  // contradicts the dose and yield printed beside it.
  if (Number.isFinite(updated.yieldG) && Number.isFinite(updated.doseG) && updated.doseG > 0) {
    updated.ratio = Number((updated.yieldG / updated.doseG).toFixed(2));
  }
  return { messages, updated, dialedIn };
}

/* ---------------- write a dialed-in shot to every bucket ---------------- */
/* Tries each candidate name (see communityMatchCandidates) against the same
   roaster bucket this coffee already writes to, in order from most to least
   exact, stopping at the first safe hit. A miss on every candidate is the
   overwhelmingly common case — most coffees are the first of their kind
   logged — so this is expected to return null far more often than not. */
async function findCommunityDetailsMatch(coffee, equipment) {
  for (const roasterKey of roasterKeyCandidates(coffee)) {
    for (const candidate of communityMatchCandidates(coffee)) {
      const matched = await getKey(K.coffee(roasterKey, candidate.name), true);
      if (matched && candidateIsSafe(candidate, matched)) return matched;
    }
  }
  return null;
}

async function recordCommunity(coffee, shot, equipment) {
  const style = coffee.style || "Traditional";
  const roasterKey = roasterBucketKey(coffee.roaster, coffee.roasterUrl);
  /* Shared record is the coffee, its roast, and the shot style. Raw grind
     numbers are never written — only relative grind position, which translates
     across different dials where a bare number would not. */

  const bumpStyled = (existing, meta) => {
    const base = existing || { ...meta, styles: {} };
    const merged = { ...base, ...meta };
    // Keep the best-accented spelling of the human-readable fields rather than
    // letting whoever wrote most recently overwrite it with a plain version.
    for (const field of ["name", "roaster", "origin", "producer", "variety"]) {
      merged[field] = preferAccented(meta[field], base[field]);
    }
    return {
      ...merged,
      styles: { ...(base.styles || {}), [style]: addToAgg(base.styles?.[style], shot, equipment) },
      totalShots: (base.totalShots || 0) + 1,
      updatedAt: Date.now(),
    };
  };

  /* Shared buckets are written by everyone and read by everyone, so one
     person's oversized paste is everyone's problem: past the per-key storage
     cap the write is rejected outright, and no further community writes to
     that bucket succeed for anyone. Personal records keep the user's full
     text — only the SHARED copy is truncated, and generously enough that
     real roaster copy is untouched (the longest real tasting note is a line
     or two; the longest real summary a short paragraph). */
  const cap = (v, n) => (typeof v === "string" && v.length > n ? v.slice(0, n) : v);
  const coffeeMeta = {
    name: cap(coffee.name, 200), roaster: cap(coffee.roaster, 200),
    origin: cap(coffee.origin, 200), elevationM: cap(coffee.elevationM, 100),
    roastLevel: coffee.roastLevel, process: coffee.process,
    tastingNotes: cap(coffee.tastingNotes, 300), roasterUrl: cap(coffee.roasterUrl, 500),
    variety: cap(coffee.variety, 200), producer: cap(coffee.producer, 200),
    summary: cap(coffee.summary, 1000), espressoNotes: cap(coffee.espressoNotes, 2000),
    roasterRecipe: coffee.roasterRecipe,
  };

  /* Descriptive fields only, additive, NEVER the aggregate — used for the
     name-key mirror below. Bumping styles there too would double-count this
     one shot into two separate, diverging aggregates (URL-key and name-key)
     instead of one unified community signal; skipping the bump entirely
     also protects against silently wiping out a real aggregate some OTHER
     contributor already built up under that key on its own. */
  const mergeMetaOnly = (existing, meta) => {
    const base = existing || {};
    const merged = { ...base };
    for (const [k, v] of Object.entries(meta)) {
      if (!merged[k] && v) merged[k] = v;
    }
    for (const field of ["name", "roaster", "origin", "producer", "variety"]) {
      merged[field] = preferAccented(meta[field], base[field]);
    }
    merged.updatedAt = Date.now();
    return merged;
  };

  // The two extra tiers only apply when there's actually something to key on —
  // K's builders already return null in that case, so these writes are simply
  // skipped rather than falling back to some meaningless placeholder key.
  const similarKey = K.similarRecipe(coffee.roastLevel, style, coffee.origin, coffee.process, coffee.variety);
  const elevationKey = K.elevationRecipe(coffee.roastLevel, style, coffee.elevationM);

  /* Same coffee, different key: roasterBucketKey prefers the URL domain over
     the typed name whenever a URL is present, so THIS coffee's own bucket
     might not be the only place someone looking it up later would check
     (see findCommunityDetailsMatch, which now tries both). Mirroring the
     details — not the aggregate — under the name-derived key too means a
     future lookup that lacks this coffee's URL can still find them. */
  const nameOnlyKey = coffee.roaster ? slug(shortenRoasterName(coffee.roaster)) : null;
  const mirrorKey = nameOnlyKey && nameOnlyKey !== "unknown" && nameOnlyKey !== roasterKey ? nameOnlyKey : null;

  const [c, r, sim, elev, mirror] = await Promise.all([
    getKey(K.coffee(roasterKey, coffee.name), true),
    getKey(K.recipe(coffee.roastLevel, style), true),
    similarKey ? getKey(similarKey, true) : Promise.resolve(null),
    elevationKey ? getKey(elevationKey, true) : Promise.resolve(null),
    mirrorKey ? getKey(K.coffee(mirrorKey, coffee.name), true) : Promise.resolve(null),
  ]);

  const writes = [
    setKey(K.coffee(roasterKey, coffee.name), bumpStyled(c, coffeeMeta), true),
    setKey(K.recipe(coffee.roastLevel, style), bumpStyled(r, { roastLevel: coffee.roastLevel, style }), true),
  ];
  if (similarKey) {
    writes.push(setKey(similarKey, bumpStyled(sim, { roastLevel: coffee.roastLevel, style, origin: coffee.origin, process: coffee.process, variety: coffee.variety }), true));
  }
  if (elevationKey) {
    writes.push(setKey(elevationKey, bumpStyled(elev, { roastLevel: coffee.roastLevel, style, elevationM: coffee.elevationM }), true));
  }
  if (mirrorKey) {
    writes.push(setKey(K.coffee(mirrorKey, coffee.name), mergeMetaOnly(mirror, coffeeMeta), true));
  }
  await Promise.all(writes);
}

/* Every migration a stored coffee record needs, in one pure, testable place.

   These used to be written inline inside the card-expand handler, growing by
   one ad-hoc `if` each time the schema changed — which made them impossible to
   test directly, easy to miss when adding a new one, and silently coupled to a
   UI event. Returning `null` when nothing changed lets callers skip the write
   entirely rather than re-persisting an identical record on every expand.

   Each migration is independently idempotent: running this twice on the same
   record is a no-op the second time. */
function migrateCoffeeRecord(coffee, equipment) {
  if (!coffee) return null;
  let next = coffee;
  let changed = false;

  // Records written before recipes adopted a dialed-in shot's actual numbers
  // can still show formula defaults while a dialed-in shot sits in history —
  // the card then contradicts itself.
  const best = (next.shots || []).find((sh) => sh && sh.dialedIn);
  if (best && next.currentRecipe) {
    const reconciled = recipeFromDialedShot(best, next.currentRecipe, equipment);
    const drifted = ["doseG", "yieldG", "timeLow", "timeHigh"].some(
      (f) => Number(reconciled[f]) !== Number(next.currentRecipe[f])
    );
    if (drifted) {
      next = { ...next, currentRecipe: reconciled };
      changed = true;
    }
  }

  // Shots logged before per-shot style tracking have no `style` at all, so the
  // badge silently doesn't render. There's no way to recover what style was
  // actually in effect then; the coffee's current style is the best available
  // guess, and a coffee's style rarely changes shot to shot.
  if ((next.shots || []).some((sh) => sh && !sh.style)) {
    next = {
      ...next,
      shots: next.shots.map((sh) => (sh && !sh.style ? { ...sh, style: next.style || "Traditional" } : sh)),
    };
    changed = true;
  }

  return changed ? next : null;
}

/* Community detail sharing — if another user's coffee looks like the same
   one, their descriptive fields (never their identity or your own recipe/
   shots) fill in whatever you left blank.

   The storage platform has no similarity search — only exact key lookup, or
   listing keys sharing an exact prefix. So "very similar name" can't mean
   true fuzzy matching here; it means a small, bounded, known-safe set of
   name variants, tried as exact lookups. Two things already do most of the
   normalization work for free: slug() collapses case/accents/punctuation/
   whitespace, and roasterBucketKey() prefers the roaster's URL DOMAIN over
   whatever name was typed (so "Sweet Bloom" vs "SweetBloom Coffee Roasters"
   already resolve to the same bucket whenever a URL is present) and already
   strips common roaster suffixes even without one. What's left, and what
   this actually adds, is one narrow real-world pattern: some roasters fold
   the process into the coffee's own name ("Hambela Natural") while others
   keep it in a separate field — the same lot, described two different ways. */
/* roasterBucketKey prefers the URL domain over the typed name WHENEVER a URL
   is present, which means the exact same roaster can resolve to two
   different keys depending on whether this particular coffee happened to
   have a URL attached ("Sweet Bloom" -> sweet-bloom by name, but ->
   sweetbloom by domain once a URL is added). recordCommunity's own key
   derivation has to stay exactly as it is — the numeric aggregates already
   accumulating under those keys would be orphaned by any change there. But
   nothing stops the LOOKUP from being less picky than the write: this tries
   every key a matching coffee could plausibly have been recorded under,
   URL-derived first (more likely to be canonical when available), so a
   coffee without a URL can still find one recorded with it, and vice versa. */
/* Nothing currently stops the same coffee from being added twice — addCoffee
   only guards against a double-click creating two IDENTICAL records, not
   against genuinely adding "Hambela" from "Sweet Bloom" a second time on
   purpose. Reuses the same normalization already trusted for community
   matching, so this catches the same near-misses (case, punctuation, common
   roaster suffixes) rather than only literal exact duplicates. */
/* ---------------- backup / transfer ----------------
   Each published artifact gets its own isolated storage — nothing on the
   platform copies data between them, so moving an install (e.g. from a test
   artifact to the real published one) needs the app to carry its own data
   out and back in.

   Personal keys are enumerable locally (we know their names); shared keys are
   not, since they accumulate under keys derived from OTHER people's coffees,
   which is why listKeys exists. */
const EXPORT_FORMAT = 1;
const PERSONAL_EXPORT_KEYS = ["equipment", "coffee-index", "theme", PERSONAL_KEY];

async function exportAllData() {
  const personal = {};
  for (const key of PERSONAL_EXPORT_KEYS) {
    const v = await getKey(key);
    if (v !== null && v !== undefined) personal[key] = v;
  }
  // Every individual coffee record, discovered from the index rather than
  // guessed — a coffee missing from the index would be unreachable in the UI
  // anyway, so the index is the correct source of truth for what exists.
  for (const item of personal["coffee-index"] || []) {
    if (!item?.id) continue;
    const c = await getKey(`coffee:${item.id}`);
    if (c) personal[`coffee:${item.id}`] = c;
  }

  const shared = {};
  for (const key of await listKeys("cx-", true)) {
    const v = await getKey(key, true);
    if (v !== null && v !== undefined) shared[key] = v;
  }

  return {
    format: EXPORT_FORMAT,
    exportedAt: new Date().toISOString(),
    personal,
    shared,
    counts: { personal: Object.keys(personal).length, shared: Object.keys(shared).length },
  };
}

/* Validates shape before touching storage — a truncated or unrelated JSON
   file should be rejected outright rather than half-written. */
function validateExport(parsed) {
  if (!parsed || typeof parsed !== "object") return "That file isn't valid backup data.";
  if (parsed.format !== EXPORT_FORMAT) return `That backup is format ${parsed.format ?? "unknown"}, but this version reads format ${EXPORT_FORMAT}.`;
  if (typeof parsed.personal !== "object" || typeof parsed.shared !== "object") return "That backup is missing its data sections.";
  return null;
}

/* Import is additive for SHARED data and replacing for PERSONAL data.

   The asymmetry is deliberate. Personal keys are yours alone — restoring a
   backup should reproduce that backup. Shared community buckets belong to
   everyone: overwriting them would discard contributions made by people who
   were never part of this backup, so those are merged by summing the
   aggregates instead, which is exactly how they accumulate normally. */
function mergeSharedBucket(existing, incoming) {
  if (!existing) return incoming;
  if (!incoming) return existing;
  const out = { ...existing };
  for (const [k, v] of Object.entries(incoming)) {
    if (!out[k] && v) out[k] = v;
  }
  const styles = { ...(existing.styles || {}) };
  for (const [style, agg] of Object.entries(incoming.styles || {})) {
    const cur = styles[style];
    if (!cur) { styles[style] = agg; continue; }
    const summed = {};
    for (const field of new Set([...Object.keys(cur), ...Object.keys(agg)])) {
      const a = Number(cur[field]) || 0;
      const b = Number(agg[field]) || 0;
      summed[field] = a + b;
    }
    styles[style] = summed;
  }
  out.styles = styles;
  out.totalShots = (Number(existing.totalShots) || 0) + (Number(incoming.totalShots) || 0);
  out.updatedAt = Date.now();
  return out;
}

async function importAllData(parsed) {
  const error = validateExport(parsed);
  if (error) throw new Error(error);
  let personalCount = 0;
  let sharedCount = 0;
  for (const [key, value] of Object.entries(parsed.personal)) {
    if (await setKey(key, value)) personalCount++;
  }
  for (const [key, value] of Object.entries(parsed.shared)) {
    const existing = await getKey(key, true);
    if (await setKey(key, mergeSharedBucket(existing, value), true)) sharedCount++;
  }
  return { personalCount, sharedCount };
}

function findExistingCoffee(index, name, roaster) {
  if (!name || !roaster || !Array.isArray(index)) return null;
  const nameKey = slug(name);
  const roasterKey = slug(shortenRoasterName(roaster));
  return index.find((c) => c && slug(c.name) === nameKey && slug(shortenRoasterName(c.roaster)) === roasterKey) || null;
}

function roasterKeyCandidates(coffee) {
  const keys = [];
  const urlKey = roasterDomainToken(coffee?.roasterUrl);
  if (urlKey) keys.push(urlKey);
  const nameKey = slug(shortenRoasterName(coffee?.roaster));
  // "unknown" is slug()'s fallback for a blank/missing name, not a real
  // identifier — roaster is required to save a coffee at all, so this
  // shouldn't be reachable, but two unrelated no-roaster records could
  // otherwise collide into the same bucket if it somehow were.
  if (nameKey !== "unknown" && !keys.includes(nameKey)) keys.push(nameKey);
  return keys;
}

function communityMatchCandidates(coffee) {
  const name = String(coffee?.name || "").trim();
  if (!name) return [];
  const candidates = [{ name, requireProcess: null }];
  for (const proc of PROCESSES) {
    if (proc === "Other/Unknown") continue;
    const re = new RegExp(`\\s+${proc}$`, "i");
    if (re.test(name)) {
      const stripped = name.replace(re, "").trim();
      if (stripped) candidates.push({ name: stripped, requireProcess: proc });
    }
  }
  return candidates;
}

/* Whether a found record is safe to treat as the same coffee. Exact-name
   matches (requireProcess === null) always pass — that's just the coffee's
   own name, unchanged. A process-stripped match only passes if the matched
   record's own process is either unset (plausibly the same lot, just not
   described that way) or the SAME process that was stripped — never a
   DIFFERENT one, which would mean two genuinely different offerings under a
   shared base name ("Hambela Natural" vs an actually-distinct "Hambela
   Washed"), not the same coffee described two ways. */
function candidateIsSafe(candidate, matched) {
  if (candidate.requireProcess === null) return true;
  if (!matched.process) return true;
  return String(matched.process).toLowerCase() === candidate.requireProcess.toLowerCase();
}

/* Additive only: every field here is set ONLY when the local record doesn't
   already have a value, whatever that value is — never overwritten, never
   compared for "better." Identity (name, roaster, style), the local user's
   own recipe, and their shot history are never touched by this at all; they
   aren't in this list because they were never meant to be. */
const COMMUNITY_DETAIL_FIELDS = ["origin", "elevationM", "process", "variety", "producer", "tastingNotes", "summary", "espressoNotes", "roasterUrl", "roasterRecipe"];
function mergeCommunityDetails(coffee, matched) {
  if (!coffee || !matched) return null;
  const next = { ...coffee };
  let changed = false;
  for (const field of COMMUNITY_DETAIL_FIELDS) {
    if (!next[field] && matched[field]) {
      next[field] = matched[field];
      changed = true;
    }
  }
  return changed ? next : null;
}

/* ---------------- UI atoms ---------------- */

/* One place that renders a style pill, rather than the same inline IIFE
   copy-pasted at each call site — the previous form also called styleBadge()
   up to four times to render a single badge (once per property read). Only
   the size/spacing differ between usages, so those are the props. */
/* The two modals had identical shells — overlay, panel, injected <style>, and
   header row — differing only in title and whether close is conditional.
   Sharing it means a change to modal chrome (padding, max width, scroll
   behaviour) happens once instead of being applied twice by hand. */
function ModalShell({ title, onClose, canClose = true, children }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{ background: COLORS.overlay }}>
      <div className="w-full max-w-md rounded-2xl p-6 sc-modal-panel" style={{ background: COLORS.surface }}>
        <style>{FONT_CSS}{THEME_CSS}</style>
        <div className="flex items-center justify-between mb-4">
          <h2 style={{ fontFamily: "Fraunces, serif", color: COLORS.espresso }} className="text-lg font-semibold">{title}</h2>
          {canClose && <button onClick={onClose} aria-label="Close" className="p-2 -m-2 rounded-full"><X size={18} color={COLORS.espressoSoft} /></button>}
        </div>
        {children}
      </div>
    </div>
  );
}

/* A plain string join (" · ") has no way to style just the separator — the
   dot and the text around it are one text node. This keeps the same array-of-
   parts calling convention callers already use, but renders each dot as its
   own bolder span between plain-weight text segments. */
function DotJoined({ parts }) {
  const filtered = parts.filter(Boolean);
  return filtered.map((part, i) => (
    <React.Fragment key={i}>
      {i > 0 && <span style={{ fontWeight: 700 }}> · </span>}
      {part}
    </React.Fragment>
  ));
}

function StyleBadge({ style, suffix = "", fontSize, className = "", iconClass = "mr-1 -mt-0.5" }) {
  if (!style) return null;
  const { Icon, background, color } = styleBadge(style);
  return (
    <span className={`rounded-full font-medium ${className}`} style={{ background, color, fontSize, fontFamily: "Inter, sans-serif" }}>
      {Icon && <Icon size={12} strokeWidth={2.6} className={`inline ${iconClass}`} />}{style}{suffix}
    </span>
  );
}

function Field({ label, children }) {
  return (
    <label className="block mb-3">
      <span className="block tracking-wide mb-1" style={{ fontSize: "0.875rem", color: COLORS.espressoSoft, fontFamily: "Inter, sans-serif", fontWeight: 500 }}>{label}</span>
      {children}
    </label>
  );
}
function EstimateBadge() {
  return (
    <span className="normal-case px-1.5 py-0.5 rounded-full ml-1" style={{ fontSize: "0.8125rem", background: COLORS.creamDeep, color: COLORS.espressoSoft, fontFamily: "Inter, sans-serif" }}>
      estimated
    </span>
  );
}
function AutoBadge() {
  return (
    <span className="normal-case px-1.5 py-0.5 rounded-full ml-1" style={{ fontSize: "0.8125rem", background: COLORS.creamDeep, color: COLORS.copperText, fontFamily: "Inter, sans-serif" }}>
      from roaster
    </span>
  );
}
const inputStyle = {
  width: "100%", padding: "8px 10px", borderRadius: "8px", border: `1px solid ${COLORS.line}`,
  background: COLORS.surface, color: COLORS.espresso, fontFamily: "Inter, sans-serif", fontSize: "1rem", outline: "none",
};

/* Shared live-validation: a field goes red the moment a typed value falls
   outside INPUT_BOUNDS, rather than only failing silently at save time. A
   blank field is never flagged — an empty box isn't a mistake, a value that
   was typed and is wrong is. */
const isOutOfBounds = (raw, [lo, hi]) => {
  if (raw === "" || raw === null || raw === undefined) return false;
  const n = Number(raw);
  return !Number.isFinite(n) || n < lo || n > hi;
};
const boundedStyle = (raw, bound, base = inputStyle) =>
  isOutOfBounds(raw, bound) ? { ...base, border: `1px solid ${COLORS.bitter}` } : base;

/* ---------------- Extraction Compass ---------------- */
/* Position: extraction (vertical, bipolar around 3 — sour above, bitter below)
   and clarity (horizontal — clarity is a quality scale with no "too clear"
   direction, so it only ever pulls left toward Muddled as it drops from its
   best value of 5; it rests at center, never past it, when clarity is good).
   Size: body — thin shots get a smaller marker, heavy shots a larger one.
   Color: sweetness/astringency, reusing the app's existing "this is good"
   and "this is a fault" colors rather than inventing new meaning.
   Together these five values drive a single genuinely continuous marker,
   replacing the old discrete one-of-four-zones highlight — a shot slightly
   short on clarity now sits slightly, not entirely, toward Muddled. */
/* True 5-axis radar chart — one spoke per taste scale (same order as the input
   sliders), each dot pulled outward from center by how far that value sits
   from ITS OWN ideal, and colored by the exact same ramp the slider used to
   pick it. A dialed-in shot collapses every dot to the center, all green; any
   fault pushes that one axis outward and toward yellow/red — this is a
   magnitude view (how far off), not a direction view. Balance scales
   (extraction, body) can be off in either of two directions but this chart
   can only show "how far", not "which way" — the taste chips shown alongside
   already carry that distinction (Sour vs Bitter, Thin vs Heavy), so nothing
   is actually lost, just not duplicated here. */
function radarDistance01(scale, n) {
  if (scale.type === "balance") return Math.abs(n - 3) / 2;             // 0 at 3, 1 at either end
  if (scale.goal === "high") return Math.max(0, (5 - n) / 4);           // 0 at 5 (best), 1 at 1
  return Math.max(0, (n - 1) / 4);                                      // goal "low": 0 at 1 (best), 1 at 5
}

function ExtractionCompass({ scales }) {
  const v = scales || {};
  const hasData = TASTE_SCALES.some((s) => Number.isFinite(v[s.key]));
  const cx0 = 110, cy0 = 110, maxR = 78;
  const angleFor = (i) => (i * 2 * Math.PI) / TASTE_SCALES.length; // index 0 at top, clockwise
  const pointAt = (r, angle) => ({ x: cx0 + r * Math.sin(angle), y: cy0 - r * Math.cos(angle) });

  const axisPoints = TASTE_SCALES.map((scale, i) => {
    const n = Number.isFinite(v[scale.key]) ? v[scale.key] : null;
    const dist01 = n === null ? 0 : radarDistance01(scale, n);
    const angle = angleFor(i);
    const { x, y } = pointAt(dist01 * maxR, angle);
    const rim = pointAt(maxR, angle);
    const color = n === null ? COLORS.lineSoft : scaleRampColor(scale, n);
    return { key: scale.key, label: scale.label, x, y, rim, color, dist01 };
  });

  // The polygon itself takes the color of its single worst axis — one glance
  // at overall severity, while the dots keep the per-variable detail.
  const severity = (d) => (d <= 0.01 ? 0 : d <= 0.5 ? 1 : 2);
  const worst = hasData ? Math.max(...axisPoints.map((p) => severity(p.dist01))) : -1;
  const polygonColor = worst === 0 ? COLORS.dialed : worst === 1 ? COLORS.ramp[2] : worst === 2 ? COLORS.ramp[4] : COLORS.lineSoft;
  const polygonPath = axisPoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  /* Label size is set relative to the pentagon (fontSize 11 vs maxR 78, a
     ~0.14 ratio) rather than as an independent number — the labels had
     grown to look oversized next to the shape once the viewBox was tightened
     around content bounds (a narrower viewBox at the same rendered width
     scales EVERYTHING up together, so "fit the box" and "keep text small
     relative to the graph" pull in different directions and both have to be
     solved at once, not just the box).

     The viewBox itself is fitted to the actual drawn bounds (pentagon
     vertices + every label's text box) using a deliberately PESSIMISTIC
     character-width estimate, so it stays tight without the labels clipping
     — verified with margin to spare even at an unrealistically wide estimate. */
  const maxWidth = "415px";

  return (
    <svg viewBox="-52 6 298 191" className="w-full mx-auto" style={{ maxWidth }}>
      {[1, 0.66, 0.33].map((frac) => (
        <polygon
          key={frac}
          points={TASTE_SCALES.map((_, i) => { const p = pointAt(maxR * frac, angleFor(i)); return `${p.x.toFixed(1)},${p.y.toFixed(1)}`; }).join(" ")}
          fill="none" stroke={COLORS.compassGrid} strokeWidth="1"
        />
      ))}
      {axisPoints.map((p) => (
        <line key={p.key} x1={cx0} y1={cy0} x2={p.rim.x} y2={p.rim.y} stroke={COLORS.compassGrid} strokeWidth="1" />
      ))}
      {hasData && <polygon points={polygonPath} fill={polygonColor} fillOpacity="0.25" stroke={polygonColor} strokeWidth="2" />}
      {hasData && axisPoints.map((p) => (
        <circle key={p.key} cx={p.x} cy={p.y} r="6" fill={p.color} stroke={COLORS.surface} strokeWidth="1.5" />
      ))}
      {axisPoints.map((p, i) => {
        // Push labels out just past the rim so they don't collide with the grid.
        const label = pointAt(maxR + 14, angleFor(i));
        const anchor = Math.abs(label.x - cx0) < 4 ? "middle" : label.x > cx0 ? "start" : "end";
        return (
          <text key={p.key} x={label.x} y={label.y + 3} textAnchor={anchor} fontSize="11" fontFamily="Inter, sans-serif" fill={COLORS.espresso} fontWeight="400">
            {p.label.includes(" / ") ? p.label.split(" / ")[1] : p.label}
          </text>
        );
      })}
    </svg>
  );
}

/* Shared click-to-enlarge overlay for the compass — one modal, reused by
   every place ExtractionCompass appears, rather than duplicating the
   overlay/backdrop/close-button plumbing at each call site. */
/* The card list needs enough per-coffee detail to render collapsed AND
   expanded without a fetch per card, so the index stores a small summary
   alongside each entry — kept in sync anywhere a coffee is created or changed. */
function summarizeCoffee(coffee) {
  const r = coffee.currentRecipe || {};
  return {
    id: coffee.id,
    name: coffee.name,
    roaster: coffee.roaster,
    origin: coffee.origin,
    roastLevel: coffee.roastLevel,
    roastLevelSource: coffee.roastLevelSource || null,
    style: coffee.style || "Traditional",
    tastingNotes: coffee.tastingNotes,
    recipe: r.doseG ? { doseG: r.doseG, yieldG: r.yieldG, timeLow: r.timeLow, timeHigh: r.timeHigh, tempC: r.tempC } : null,
    shotCount: (coffee.shots || []).length,
    dialedIn: (coffee.shots || []).some((s) => s.dialedIn),
  };
}

/* ---------------- Main App ---------------- */
export default function DialInCollective() {
  const [loading, setLoading] = useState(true);
  const [equipment, setEquipment] = useState(null);
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);
  const [coffeeIndex, setCoffeeIndex] = useState([]);
  const [loadedCoffees, setLoadedCoffees] = useState({}); // id -> full coffee record, cached on expand
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const [showAddCoffee, setShowAddCoffee] = useState(false);
  const [activeLogForm, setActiveLogForm] = useState(null); // { id, form } — one active form at a time
  const [editingShot, setEditingShot] = useState(null); // { coffeeId, shotId, form }
  const [theme, setTheme] = useState("light");
  // Mirrors coffeeIndex synchronously so async handlers never act on a stale
  // closure, and so persistence stays out of the (pure) state updater.
  const coffeeIndexRef = useRef([]);
  /* Same reason as coffeeIndexRef: async handlers snapshot a coffee record,
     hit an await (storage reads), then write a value derived from that stale
     snapshot. Logging a shot while a style change was in flight silently
     destroyed one of the two changes — and persisted the loss. A ref updated
     synchronously means every write is derived from the freshest record. */
  const loadedCoffeesRef = useRef({});
  /* Guards against double-firing an in-flight write. Must be a ref rather than
     state: a state update wouldn't be visible to a second click arriving in the
     same tick, which is exactly the double-click case this exists to stop. */
  const inFlightRef = useRef({});
  const [saveError, setSaveError] = useState(false);

  const commitIndex = useCallback((mutator) => {
    const next = mutator(coffeeIndexRef.current);
    coffeeIndexRef.current = next;
    setCoffeeIndex(next);
    return setKey("coffee-index", next);
  }, []);

  /* Single write path for a coffee record. `mutator` receives the CURRENT
     record (post-await), never a pre-await snapshot, so concurrent edits
     merge instead of clobbering each other. */
  const commitCoffee = useCallback((id, mutator) => {
    const current = loadedCoffeesRef.current[id];
    if (!current) return Promise.resolve(false);
    const next = mutator(current);
    loadedCoffeesRef.current = { ...loadedCoffeesRef.current, [id]: next };
    setLoadedCoffees(loadedCoffeesRef.current);
    return setKey(`coffee:${id}`, next).then(() => next);
  }, []);

  useEffect(() => {
    subscribeStorageFailures(() => setSaveError(true));
    return () => subscribeStorageFailures(null);
  }, []);

  useEffect(() => {
    (async () => {
      const [eq, idx, savedTheme] = await Promise.all([getKey("equipment"), getKey("coffee-index"), getKey("theme")]);
      setEquipment(eq);
      coffeeIndexRef.current = idx || [];
      setCoffeeIndex(idx || []);
      if (savedTheme === "dark" || savedTheme === "light") setTheme(savedTheme);
      else if (typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches) setTheme("dark");
      if (!eq) setShowEquipmentModal(true);
      setLoading(false);
    })();
  }, []);

  async function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    await setKey("theme", next);
  }

  async function saveEquipment(eq) {
    setEquipment(eq);
    await setKey("equipment", eq);
    setShowEquipmentModal(false);
  }

  /* Multiple cards can be open at once, so each expand fetches and caches its
     own full record rather than replacing a single "selected coffee". */
  async function toggleExpand(id) {
    const isExpanded = expandedIds.has(id);
    setExpandedIds((prev) => {
      const next = new Set(prev);
      isExpanded ? next.delete(id) : next.add(id);
      return next;
    });
    if (!isExpanded && !loadedCoffeesRef.current[id]) {
      let c = await getKey(`coffee:${id}`);
      if (c) {
        const migrated = migrateCoffeeRecord(c, equipment);
        if (migrated) c = migrated;

        // Additive only — see mergeCommunityDetails. A miss (null) is the
        // normal case and changes nothing.
        const communityMatch = await findCommunityDetailsMatch(c, equipment);
        const enriched = communityMatch ? mergeCommunityDetails(c, communityMatch) : null;
        if (enriched) c = enriched;

        if (migrated || enriched) {
          await setKey(`coffee:${id}`, c);
        }
        loadedCoffeesRef.current = { ...loadedCoffeesRef.current, [id]: c };
        setLoadedCoffees(loadedCoffeesRef.current);
        // Backfill an older/stale index entry now that we have the full record.
        await commitIndex((prev) => prev.map((item) => (item.id === id ? summarizeCoffee(c) : item)));
      }
    }
  }

  async function addCoffee(data) {
    // Double-clicking "Generate starting recipe" would create two coffees with
    // different ids but identical content.
    if (inFlightRef.current.addCoffee) return;
    inFlightRef.current.addCoffee = true;
    try {
    const id = uid();
    const cleanData = { ...data, roaster: shortenRoasterName(data.roaster) };
    const buckets = await fetchBuckets(cleanData);
    const recipe = computeBaseline(cleanData, equipment, buckets);
    const coffee = {
      id, ...cleanData,
      roastLevel: recipe.resolvedRoastLevel,
      roastLevelSource: recipe.roastLevelSource || "",
      roastLevelBasis: recipe.roastLevelBasis || "",
      createdAt: Date.now(), currentRecipe: recipe, shots: [],
    };
    await setKey(`coffee:${id}`, coffee);
    await commitIndex((prev) => [summarizeCoffee(coffee), ...prev]);
    loadedCoffeesRef.current = { ...loadedCoffeesRef.current, [id]: coffee };
    setLoadedCoffees(loadedCoffeesRef.current);
    setExpandedIds((prev) => new Set(prev).add(id)); // open the new one right away
    setShowAddCoffee(false);
    } finally {
      inFlightRef.current.addCoffee = false;
    }
  }

  async function deleteCoffee(id) {
    await commitIndex((prev) => prev.filter((c) => c.id !== id));
    await deleteKey(`coffee:${id}`);
    { const next = { ...loadedCoffeesRef.current }; delete next[id]; loadedCoffeesRef.current = next; setLoadedCoffees(next); }
    setExpandedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
    setActiveLogForm((prev) => (prev?.id === id ? null : prev));
  }

  async function changeStyle(id, newStyle, customTargets) {
    const snapshot = loadedCoffeesRef.current[id];
    if (!snapshot) return;
    const data = { ...snapshot, style: newStyle, customTargets: customTargets || snapshot.customTargets };
    const buckets = await fetchBuckets(data);
    const recipe = computeBaseline(data, equipment, buckets);
    // Re-read through commitCoffee: a shot logged during the awaits above must
    // not be discarded, so only the style-related fields are applied on top of
    // whatever the record looks like now.
    const updated = await commitCoffee(id, (live) => ({
      ...live,
      style: newStyle,
      customTargets: customTargets || live.customTargets,
      roastLevel: recipe.resolvedRoastLevel,
      roastLevelSource: recipe.roastLevelSource || "",
      roastLevelBasis: recipe.roastLevelBasis || "",
      currentRecipe: recipe,
    }));
    if (updated) await commitIndex((prev) => prev.map((c) => (c.id === id ? summarizeCoffee(updated) : c)));
  }

  /* Editing a past shot replays the whole chain: the corrected shot is judged
     against the recipe that was in effect at the time, then every later shot is
     rolled forward from there. So fixing a typo corrects not just that row but
     its dialed-in stamp and every recipe that followed from it. */
  function openEditShot(coffeeId, shotId) {
    const coffee = loadedCoffeesRef.current[coffeeId];
    const shot = coffee?.shots?.find((x) => x.id === shotId);
    if (!shot) return;
    setActiveLogForm(null);
    setEditingShot({
      coffeeId,
      shotId,
      form: {
        doseG: shot.doseG, yieldG: shot.yieldG, timeS: shot.timeS,
        grindSetting: shot.grindSetting ?? "",
        tempC: shot.tempC ?? null,
        tasteScales: { ...emptyTasteScales(), ...(shotScales(shot) || {}) },
        notes: shot.notes || "",
      },
    });
  }

  function updateEditForm(updater) {
    setEditingShot((prev) => (prev ? { ...prev, form: typeof updater === "function" ? updater(prev.form) : updater } : prev));
  }

  async function saveEditedShot() {
    if (!editingShot) return;
    if (inFlightRef.current.editShot) return;
    inFlightRef.current.editShot = true;
    try {
      const { coffeeId, shotId, form } = editingShot;
      const coffee = loadedCoffeesRef.current[coffeeId];
      if (!coffee) return;

      const idx = coffee.shots.findIndex((x) => x.id === shotId);
      if (idx === -1) return;

      /* Replay the corrected shot through the same engine that produced the
         original advice. The recipe it was judged against is the one in effect
         BEFORE this shot — i.e. rebuilt from the shots that preceded it — so a
         correction is evaluated in its real historical context rather than
         against today's recipe. */
      const olderShots = coffee.shots.slice(idx + 1);
      const buckets = await fetchBuckets(coffee);
      let recipeAtTime = computeBaseline(coffee, equipment, buckets);
      const personal = (await getKey(PERSONAL_KEY))?.samples || [];
      for (let i = olderShots.length - 1; i >= 0; i--) {
        recipeAtTime = suggestNext(recipeAtTime, olderShots[i], equipment, olderShots.slice(i + 1), personal).updated;
      }

      const editedShot = { ...coffee.shots[idx], ...form, editedAt: Date.now() };
      const replay = suggestNext(recipeAtTime, editedShot, equipment, olderShots, personal);
      editedShot.dialedIn = replay.dialedIn;
      editedShot.suggestionMessages = replay.messages;

      /* Then roll forward through every shot logged after it, so the current
         recipe reflects the corrected history rather than the mistaken one. */
      let recipe = replay.updated;
      const newerShots = coffee.shots.slice(0, idx);
      const rebuiltNewer = [];
      for (let i = newerShots.length - 1; i >= 0; i--) {
        const priorForThis = [...rebuiltNewer, editedShot, ...olderShots];
        const res = suggestNext(recipe, newerShots[i], equipment, priorForThis, personal);
        rebuiltNewer.unshift({ ...newerShots[i], dialedIn: res.dialedIn, suggestionMessages: res.messages });
        recipe = res.updated;
      }

      const updated = await commitCoffee(coffeeId, (live) => ({
        ...live,
        shots: [...rebuiltNewer, editedShot, ...olderShots],
        currentRecipe: recipe,
      }));
      if (updated) await commitIndex((prev) => prev.map((c) => (c.id === coffeeId ? summarizeCoffee(updated) : c)));
      setEditingShot(null);
    } finally {
      inFlightRef.current.editShot = false;
    }
  }

  function openLogForm(id) {
    const coffee = loadedCoffeesRef.current[id];
    if (!coffee) return;
    const r = coffee.currentRecipe;
    // The recipe's own dose/temp only catch up to what someone actually typed
    // once a shot dials in — a shot that deviates slightly but doesn't qualify
    // leaves the recipe target untouched. Grind already avoided this by
    // reading the last shot directly; dose and temp now do the same, so a
    // form re-opened after a non-dialed-in shot reflects what was actually
    // entered last time, not a stale target. Yield and time start blank on
    // every new shot regardless of history — those are deliberately never
    // auto-filled.
    const last = coffee.shots.length ? coffee.shots[0] : null;
    // Formatted to one decimal as a STRING, but only this once, at the
    // moment the form opens — this is not reapplied on every keystroke (that
    // would fight the person's typing, forcing "1" into "1.0" mid-edit). The
    // moment they touch the field, onChange converts back to a plain number,
    // same as it always has.
    const oneDecimal = (n) => (Number.isFinite(n) ? n.toFixed(1) : n);
    setActiveLogForm({
      id,
      form: {
        doseG: oneDecimal(last && Number.isFinite(last.doseG) ? last.doseG : r.doseG),
        yieldG: "",
        timeS: "",
        grindSetting: last ? last.grindSetting : (r.grindSuggestion?.value ?? ""),
        tempC: tracksTemp(equipment)
          ? (last && Number.isFinite(last.tempC) ? last.tempC : r.tempC)
          : null,
        tasteScales: emptyTasteScales(), notes: "",
      },
    });
  }

  function updateLogForm(updater) {
    setActiveLogForm((prev) => (prev ? { ...prev, form: typeof updater === "function" ? updater(prev.form) : updater } : prev));
  }

  function cancelLog() {
    setActiveLogForm(null);
  }

  async function submitShot() {
    if (!activeLogForm) return;
    const { id, form: logForm } = activeLogForm;
    // Double-clicking Save would otherwise record two identical shots and write
    // to the shared community record twice, inflating its sample count.
    if (inFlightRef.current.submitShot) return;
    inFlightRef.current.submitShot = true;
    try {
    const coffee = loadedCoffeesRef.current[id];
    if (!coffee) return;
    const recipe = coffee.currentRecipe;
    const personal = (await getKey(PERSONAL_KEY))?.samples || [];
    // Coerced once, here, before anything reads it — the form may hold a
    // formatted string for display purposes (so a whole number like 18 can
    // show "18.0"), and both suggestNext and every downstream consumer of a
    // saved shot (Number.isFinite checks throughout the engine) require real
    // numbers, not numeric-looking strings. Coercing only at the final shot
    // object would still have left suggestNext working off the raw strings.
    const cleanForm = {
      ...logForm,
      doseG: Number(logForm.doseG), yieldG: Number(logForm.yieldG), timeS: Number(logForm.timeS),
      tempC: logForm.tempC === null || logForm.tempC === "" ? null : Number(logForm.tempC),
    };
    const suggestion = suggestNext(recipe, cleanForm, equipment, coffee.shots, personal);
    // Recorded at logging time, not read from coffee.style later — the coffee's
    // style can change afterward (Change Style), and a shot's history shouldn't
    // silently relabel itself to whatever the coffee is set to today.
    const shot = {
      id: uid(), timestamp: Date.now(), ...cleanForm,
      style: coffee.style || "Traditional", dialedIn: suggestion.dialedIn, suggestionMessages: suggestion.messages,
    };
    // Append onto the CURRENT record rather than the pre-await snapshot, so a
    // style change that landed during the awaits above isn't clobbered.
    const updated = await commitCoffee(id, (live) => ({
      ...live,
      shots: [shot, ...live.shots],
      // `updated` now carries the adopted recipe on a dialed-in shot too, so the
      // card reflects what actually worked rather than the pre-shot target.
      currentRecipe: suggestion.updated,
    }));
    if (!updated) return;
    setActiveLogForm(null);
    // Logging a shot brings the coffee to the top — the list is most-recently-used, not add-order.
    await commitIndex((prev) => [summarizeCoffee(updated), ...prev.filter((c) => c.id !== id)]);
    await recordPersonalShot(shot, coffee);
    if (suggestion.dialedIn) await recordCommunity(coffee, shot, equipment);
    } finally {
      // `finally` so a storage failure can't leave the button permanently dead.
      inFlightRef.current.submitShot = false;
    }
  }

  if (loading) {
    return (
      <div className="sc-root sc-fill-viewport flex items-center justify-center p-10" data-theme={theme} style={{ background: COLORS.cream }}>
        <style>{FONT_CSS}{THEME_CSS}</style>
        <p style={{ fontFamily: "Inter, sans-serif", color: COLORS.espressoSoft }}>Loading The Dial In Collective…</p>
      </div>
    );
  }

  return (
    <div className="sc-root sc-fill-viewport w-full" data-theme={theme} style={{ background: COLORS.cream }}>
      <style>{FONT_CSS}{THEME_CSS}</style>

      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${COLORS.line}` }}>
        <div className="flex items-center gap-2">
          <Coffee size={22} color={COLORS.copper} />
          <div>
            <h1 style={{ fontFamily: "Fraunces, serif", color: COLORS.espresso, fontWeight: 600 }} className="text-xl leading-none">The Dial In Collective</h1>
            <p style={{ fontFamily: "Inter, sans-serif", color: COLORS.espressoSoft }} className="text-xs mt-0.5">Better espresso through shared experience.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleTheme} aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"} className="p-2 rounded-full hover:opacity-80" style={{ background: COLORS.creamDeep }} title={theme === "dark" ? "Switch to light" : "Switch to dark"}>
            {theme === "dark" ? <Sun size={18} color={COLORS.gold} /> : <Moon size={18} color={COLORS.espressoSoft} />}
          </button>
          <button onClick={() => setShowEquipmentModal(true)} aria-label="Equipment settings" className="p-2 rounded-full hover:opacity-80" style={{ background: COLORS.creamDeep }} title="Equipment settings">
            <Settings size={18} color={COLORS.espressoSoft} />
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4">
        {saveError && (
          <div className="mb-3 p-3 rounded-lg flex items-start gap-2" style={{ background: COLORS.surface, border: `1px solid ${COLORS.bitter}` }}>
            <AlertTriangle size={14} color={COLORS.bitter} className="shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs" style={{ color: COLORS.espresso, fontFamily: "Inter, sans-serif" }}>
                Something didn't save. Storage may be temporarily rate limited — recent changes might not persist. Try again in a moment.
              </p>
            </div>
            <button onClick={() => setSaveError(false)} style={{ fontSize: "0.8125rem", color: COLORS.espressoSoft, fontFamily: "Inter, sans-serif" }}>Dismiss</button>
          </div>
        )}
        <button onClick={() => setShowAddCoffee(true)} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium text-sm mb-3" style={{ background: COLORS.copper, color: COLORS.ink, fontFamily: "Inter, sans-serif" }}>
          <Plus size={16} /> Add Coffee
        </button>

        {coffeeIndex.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <Sparkles size={28} color={COLORS.copperSoft} />
            <p style={{ fontFamily: "Inter, sans-serif", color: COLORS.espressoSoft }} className="mt-3 text-sm text-center">
              No coffees yet — add your first bag to get a starting recipe.
            </p>
          </div>
        )}

        <div className="space-y-2">
          {coffeeIndex.map((c) => (
            <CoffeeCard
              key={c.id}
              c={c}
              full={loadedCoffees[c.id] || null}
              expanded={expandedIds.has(c.id)}
              equipment={equipment}
              onToggleExpand={() => toggleExpand(c.id)}
              onDelete={() => deleteCoffee(c.id)}
              onChangeStyle={(s, t) => changeStyle(c.id, s, t)}
              onOpenLog={() => openLogForm(c.id)}
              logForm={activeLogForm?.id === c.id ? activeLogForm.form : null}
              setLogForm={updateLogForm}
              onSubmitShot={submitShot}
              onCancelLog={cancelLog}
              editingShot={editingShot?.coffeeId === c.id ? editingShot : null}
              onEditShot={(shotId) => openEditShot(c.id, shotId)}
              setEditForm={updateEditForm}
              onSaveEdit={saveEditedShot}
              onCancelEdit={() => setEditingShot(null)}
            />
          ))}
        </div>

        <div className="mt-6 pt-4" style={{ borderTop: `1px solid ${COLORS.line}` }}>
          <p className="flex items-start gap-1.5 mb-4" style={{ fontSize: "0.8125rem", color: COLORS.espressoSoft, fontFamily: "Inter, sans-serif" }}>
            <Database size={12} className="shrink-0 mt-0.5" color={COLORS.copper} />
            <span>The Dial In Collective personalizes espresso recipes for all your coffees — improving with every shot The Collective logs.</span>
          </p>
          <p style={{ fontSize: "0.8125rem", color: COLORS.espressoSoft, fontFamily: "Inter, sans-serif" }}>
            By using this tool you agree and consent that your coffee data will be used to improve the recommendations of this tool. We do not record any of your personal information.
          </p>
        </div>
      </div>

      {showEquipmentModal && <EquipmentModal initial={equipment} onSave={saveEquipment} onClose={() => equipment && setShowEquipmentModal(false)} canClose={!!equipment} />}
      {showAddCoffee && <AddCoffeeModal equipment={equipment} coffeeIndex={coffeeIndex} onSave={addCoffee} onClose={() => setShowAddCoffee(false)} />}
    </div>
  );
}

/* ---------------- Coffee Card (collapsed summary that expands into full detail inline) ---------------- */
function CoffeeCard({ c, full, expanded, equipment, onToggleExpand, onDelete, onChangeStyle, onOpenLog, logForm, setLogForm, onSubmitShot, onCancelLog, editingShot, onEditShot, setEditForm, onSaveEdit, onCancelEdit }) {
  const roastDisplay = c.roastLevel ? `${c.roastLevel}${c.roastLevelSource ? " (est.)" : ""}` : null;
  const basicLine = [c.roaster, c.origin, roastDisplay].filter(Boolean).join(" · ");
  return (
    <div className="rounded-xl" style={{ background: expanded ? COLORS.surface : "transparent", border: `1px solid ${expanded ? COLORS.line : "transparent"}` }}>
      <button
        onClick={onToggleExpand}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left rounded-xl"
        style={{ background: expanded ? "transparent" : COLORS.creamDeep }}
        aria-expanded={expanded}
      >
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate flex items-center gap-1.5" style={{ color: COLORS.espresso, fontFamily: "Inter, sans-serif" }}>
            {(() => {
              const { Icon, background } = styleBadge(c.style);
              return Icon && <Icon size={12} strokeWidth={2.6} className="shrink-0" color={background} />;
            })()}
            <span className="truncate font-bold">{c.name}</span>
            {c.dialedIn && (
              <span className="shrink-0 px-1.5 py-0.5 rounded-full" style={{ fontSize: "0.8125rem", background: COLORS.dialed, color: COLORS.ink, fontFamily: "Inter, sans-serif" }}>
                Dialed in
              </span>
            )}
          </div>
          <div className="text-xs truncate" style={{ color: COLORS.espressoSoft, fontFamily: "Inter, sans-serif" }}>
            {basicLine.length ? <DotJoined parts={[c.roaster, c.origin, roastDisplay]} /> : "Tap to view"}
          </div>
        </div>
        <ChevronDown
          size={16}
          color={COLORS.espressoSoft}
          className="shrink-0"
          style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 150ms ease" }}
        />
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-1">
          {full ? (
            <CoffeeDetailBody
              coffee={full}
              equipment={equipment}
              onDelete={onDelete}
              onChangeStyle={onChangeStyle}
              onOpenLog={onOpenLog}
              logForm={logForm}
              setLogForm={setLogForm}
              onSubmitShot={onSubmitShot}
              onCancelLog={onCancelLog}
              editingShot={editingShot}
              onEditShot={onEditShot}
              setEditForm={setEditForm}
              onSaveEdit={onSaveEdit}
              onCancelEdit={onCancelEdit}
            />
          ) : (
            <p className="text-xs py-2" style={{ color: COLORS.espressoSoft, fontFamily: "Inter, sans-serif" }}>Loading details…</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------- Equipment Modal ---------------- */
function EquipmentModal({ initial, onSave, onClose, canClose }) {
  const [doseG, setDoseG] = useState(initial?.doseG || 18);
  const [grinderMin, setGrinderMin] = useState(initial?.grinderMin ?? "");
  const [grinderMax, setGrinderMax] = useState(initial?.grinderMax ?? "");
  // `notes` is the pre-rename key; still read so older saved setups migrate.
  const [notes, setNotes] = useState(initial?.tastingPreferences || initial?.notes || "");
  const [tempUnit, setTempUnit] = useState(initial?.tempUnit || "F");
  const [trackTemp, setTrackTemp] = useState(initial?.trackTemp !== false);
  const [apiKey, setApiKey] = useState(initial?.apiKey || "");
  const [showKey, setShowKey] = useState(false);
  const [keyCheck, setKeyCheck] = useState("idle"); // idle | checking | ok | bad
  const [backupState, setBackupState] = useState("idle"); // idle | working | done | error
  const [backupMessage, setBackupMessage] = useState("");
  const [backupText, setBackupText] = useState("");

  /* The artifact sandbox blocks file downloads outright — blob URLs and
     synthetic <a download> clicks are both refused by its security policy,
     for any file type. So the backup is handed over as selectable TEXT the
     person copies, and taken back the same way, which the sandbox does
     permit. Clipboard access can also be restricted, so the textarea is the
     primary mechanism and the copy button is a convenience on top of it. */
  async function handleExport() {
    setBackupState("working");
    setBackupMessage("");
    try {
      const data = await exportAllData();
      setBackupText(JSON.stringify(data));
      setBackupState("done");
      setBackupMessage(`${data.counts.personal} personal record${data.counts.personal === 1 ? "" : "s"} and ${data.counts.shared} community record${data.counts.shared === 1 ? "" : "s"} ready below — copy all of it and save it somewhere safe.`);
    } catch (e) {
      console.error("Export failed:", e);
      setBackupState("error");
      setBackupMessage(e?.message ? `Export failed: ${e.message}` : "Export failed.");
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(backupText);
      setBackupMessage("Copied to clipboard.");
    } catch {
      // Clipboard API is itself sometimes blocked in the sandbox; the text is
      // already on screen and selectable, so this is a convenience failing,
      // not the export failing.
      setBackupMessage("Couldn't copy automatically — select the text below and copy it manually.");
    }
  }

  async function handleImport() {
    if (!backupText.trim()) {
      setBackupState("error");
      setBackupMessage("Paste your backup text into the box below first.");
      return;
    }
    setBackupState("working");
    setBackupMessage("");
    try {
      const parsed = JSON.parse(backupText);
      const { personalCount, sharedCount } = await importAllData(parsed);
      setBackupState("done");
      setBackupMessage(`Imported ${personalCount} personal record${personalCount === 1 ? "" : "s"} and merged ${sharedCount} community record${sharedCount === 1 ? "" : "s"}. Reload the page to see them.`);
    } catch (e) {
      console.error("Import failed:", e);
      setBackupState("error");
      setBackupMessage(e?.message ? `Import failed: ${e.message}` : "Import failed — is that valid backup text?");
    }
  }
  const prefRead = readPreferences(notes);
  // One named gate rather than repeating the same check across onClick,
  // disabled and style — and it now covers the grinder range too.
  const settingsOk =
    !isOutOfBounds(doseG, INPUT_BOUNDS.doseG) &&
    !isOutOfBounds(grinderMin, GRIND_BOUNDS) &&
    !isOutOfBounds(grinderMax, GRIND_BOUNDS);

  async function verifyKey() {
    if (!apiKey.trim()) return;
    setKeyCheck("checking");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey.trim(),
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 8, messages: [{ role: "user", content: "hi" }] }),
      });
      setKeyCheck(res.ok ? "ok" : "bad");
    } catch (e) {
      console.error("API key verification failed:", e);
      setKeyCheck("bad");
    }
  }

  return (
    <ModalShell title="Your Setup" onClose={onClose} canClose={canClose}>
        <Field label="Usual Dose (g)">
          <input type="number" step="0.1" min={INPUT_BOUNDS.doseG[0]} max={INPUT_BOUNDS.doseG[1]}
            style={boundedStyle(doseG, INPUT_BOUNDS.doseG)} value={doseG} onChange={(e) => setDoseG(e.target.value)} />
          {isOutOfBounds(doseG, INPUT_BOUNDS.doseG) && (
            <span className="block mt-1" style={{ fontSize: "0.8125rem", color: COLORS.bitter, fontFamily: "Inter, sans-serif" }}>
              Expected between {INPUT_BOUNDS.doseG[0]}g and {INPUT_BOUNDS.doseG[1]}g.
            </span>
          )}
        </Field>
        <div className="mt-2 pt-3" style={{ borderTop: `1px solid ${COLORS.line}` }}>
          <p className="text-sm font-medium mb-1" style={{ color: COLORS.espresso, fontFamily: "Inter, sans-serif" }}>Grinder Espresso Range</p>
          <p className="text-xs mb-3" style={{ color: COLORS.espressoSoft, fontFamily: "Inter, sans-serif" }}>
            The part of your grinder's dial you'd actually pull espresso in — not its full range. Grind suggestions stay inside these bounds.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Finest Setting">
              <input type="number" step="0.1" min="0" style={boundedStyle(grinderMin, GRIND_BOUNDS)} value={grinderMin} onChange={(e) => setGrinderMin(e.target.value)} placeholder="e.g. 0.0" />
              {isOutOfBounds(grinderMin, GRIND_BOUNDS) && (
                <span className="block mt-1" style={{ fontSize: "0.8125rem", color: COLORS.bitter, fontFamily: "Inter, sans-serif" }}>
                  Can't be negative.
                </span>
              )}
            </Field>
            <Field label="Coarsest Setting">
              <input type="number" step="0.1" min="0" style={boundedStyle(grinderMax, GRIND_BOUNDS)} value={grinderMax} onChange={(e) => setGrinderMax(e.target.value)} placeholder="e.g. 10.0" />
              {isOutOfBounds(grinderMax, GRIND_BOUNDS) && (
                <span className="block mt-1" style={{ fontSize: "0.8125rem", color: COLORS.bitter, fontFamily: "Inter, sans-serif" }}>
                  Can't be negative.
                </span>
              )}
              <span className="block mt-1" style={{ fontSize: "0.8125rem", color: COLORS.espressoSoft, fontFamily: "Inter, sans-serif" }}>
                Use the coarsest setting you'd still call espresso, not where the grinder physically stops.
              </span>
            </Field>
          </div>
          <p style={{ fontFamily: "Inter, sans-serif", color: COLORS.espressoSoft }} className="text-xs mb-3">
            Lower numbers are treated as finer. Settings use tenths, so 3.2 works.
          </p>
        </div>
        <label className="flex items-start gap-2 mb-3 cursor-pointer">
          <input type="checkbox" checked={trackTemp} onChange={(e) => setTrackTemp(e.target.checked)} style={{ marginTop: 3 }} />
          <span>
            <span className="text-sm" style={{ color: COLORS.espresso, fontFamily: "Inter, sans-serif" }}>Track brew temperature</span>
            <span className="block" style={{ fontSize: "0.8125rem", color: COLORS.espressoSoft, fontFamily: "Inter, sans-serif" }}>
              Turn off if your machine doesn't let you set a temperature — it'll be hidden from recipes and shot logs.
            </span>
          </span>
        </label>
        {trackTemp && <Field label="Temperature Units">
          <div className="flex gap-2">
            {["F", "C"].map((u) => (
              <button key={u} onClick={() => setTempUnit(u)}
                className="flex-1 py-2 rounded-lg text-sm font-medium"
                style={{
                  border: `1px solid ${tempUnit === u ? COLORS.copper : COLORS.line}`,
                  background: tempUnit === u ? COLORS.copper : "transparent",
                  color: tempUnit === u ? COLORS.ink : COLORS.espressoSoft,
                  fontFamily: "Inter, sans-serif",
                }}>
                {u === "F" ? "Fahrenheit (°F)" : "Celsius (°C)"}
              </button>
            ))}
          </div>
        </Field>}
        <Field label="Tasting Preferences / Notes (Optional)">
          <textarea
            style={{ ...inputStyle, minHeight: 70 }}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. I like more light roast coffee and prefer high clarity and floral, citrus, and fruity tasting notes."
          />
          {prefRead && (
            <span className="block mt-1" style={{ fontSize: "0.8125rem", color: COLORS.copperText, fontFamily: "Inter, sans-serif" }}>
              Read as a preference for {prefRead.lean} ({prefRead.matched.join(", ")}) — recipes will lean that way.
            </span>
          )}
          {!notes && (
            <span className="block mt-1" style={{ fontSize: "0.8125rem", color: COLORS.espressoSoft, fontFamily: "Inter, sans-serif" }}>
              Describe what you like in a cup and recipes will be nudged toward it.
            </span>
          )}
        </Field>

        <div className="mt-2 pt-4" style={{ borderTop: `1px solid ${COLORS.line}` }}>
          <p className="text-sm font-medium mb-1" style={{ color: COLORS.espresso, fontFamily: "Inter, sans-serif" }}>
            AI Autofill Access <span style={{ fontSize: "0.8125rem", color: COLORS.espressoSoft, fontWeight: 400 }}>(Optional)</span>
          </p>
          <p className="text-xs mb-3" style={{ color: COLORS.espressoSoft, fontFamily: "Inter, sans-serif" }}>
            Reading a roaster's URL or photo uses Claude. By default this app uses the access built into this Claude session — that may not be available to everyone who opens this tool. Adding your own Anthropic API key here makes autofill use your own account instead, billed to you directly.
          </p>
          <Field label="Anthropic API Key">
            <div className="flex gap-2">
              <input
                type={showKey ? "text" : "password"}
                style={{ ...inputStyle, fontFamily: "JetBrains Mono, monospace" }}
                value={apiKey}
                onChange={(e) => { setApiKey(e.target.value); setKeyCheck("idle"); }}
                placeholder="sk-ant-…"
                autoComplete="off"
              />
              <button onClick={() => setShowKey((v) => !v)} className="px-3 rounded-lg text-xs shrink-0" style={{ border: `1px solid ${COLORS.line}`, color: COLORS.espressoSoft, fontFamily: "Inter, sans-serif" }}>
                {showKey ? "Hide" : "Show"}
              </button>
            </div>
          </Field>
          <div className="flex items-center gap-2 -mt-2 mb-3">
            <button onClick={verifyKey} disabled={!apiKey.trim() || keyCheck === "checking"}
              className="text-xs px-3 py-1.5 rounded-full font-medium"
              style={{ background: apiKey.trim() ? COLORS.creamDeep : "transparent", color: COLORS.espressoSoft, border: `1px solid ${COLORS.line}`, fontFamily: "Inter, sans-serif" }}>
              {keyCheck === "checking" ? "Checking…" : "Test Key"}
            </button>
            {keyCheck === "ok" && <span style={{ fontSize: "0.8125rem", color: COLORS.copperText, fontFamily: "Inter, sans-serif" }}>✓ Key works</span>}
            {keyCheck === "bad" && <span style={{ fontSize: "0.8125rem", color: COLORS.bitter, fontFamily: "Inter, sans-serif" }}>Couldn't verify this key</span>}
            {apiKey && (
              <button onClick={() => { setApiKey(""); setKeyCheck("idle"); }} className="text-xs underline ml-auto" style={{ color: COLORS.espressoSoft, fontFamily: "Inter, sans-serif" }}>
                Remove Key
              </button>
            )}
          </div>
          <p style={{ fontSize: "0.8125rem", color: COLORS.espressoSoft, fontFamily: "Inter, sans-serif" }}>
            Stored only on this device, never shared with other users or the community database. Don't have one? Create it at{" "}
            <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" style={{ color: COLORS.copperText }}>console.anthropic.com</a>
            {" "}— note that API usage bills per request and is separate from any Claude.ai subscription.
          </p>
        </div>

        <div className="mt-2 pt-4" style={{ borderTop: `1px solid ${COLORS.line}` }}>
          <p className="text-sm font-medium mb-1" style={{ color: COLORS.espresso, fontFamily: "Inter, sans-serif" }}>Backup &amp; Transfer</p>
          <p className="mb-2" style={{ fontSize: "0.8125rem", color: COLORS.espressoSoft, fontFamily: "Inter, sans-serif" }}>
            Download everything — your equipment, coffees, shot history, and the community data this copy has seen — as a single file. Use it as a backup, or to move your data into another published copy of this app, since each one keeps its own separate storage.
          </p>
          <div className="flex gap-2">
            <button onClick={handleExport} disabled={backupState === "working"}
              className="flex-1 py-2 rounded-lg font-medium text-sm"
              style={{ background: COLORS.creamDeep, color: COLORS.espresso, fontFamily: "Inter, sans-serif" }}>
              {backupState === "working" ? "Working…" : "Export Data"}
            </button>
            <button onClick={handleImport} disabled={backupState === "working"}
              className="flex-1 py-2 rounded-lg font-medium text-sm"
              style={{ background: COLORS.creamDeep, color: COLORS.espresso, fontFamily: "Inter, sans-serif" }}>
              Import Data
            </button>
          </div>
          <textarea
            value={backupText}
            onChange={(e) => setBackupText(e.target.value)}
            placeholder="Press Export Data to fill this with your backup — or paste a backup here and press Import Data."
            spellCheck={false}
            style={{ ...inputStyle, minHeight: 90, marginTop: 8, fontFamily: "JetBrains Mono, monospace", fontSize: "0.75rem" }}
          />
          {backupText && (
            <button onClick={handleCopy} className="text-xs underline mt-1" style={{ color: COLORS.copperText, fontFamily: "Inter, sans-serif" }}>
              Copy to Clipboard
            </button>
          )}
          {backupMessage && (
            <p className="mt-2" style={{ fontSize: "0.8125rem", color: backupState === "error" ? COLORS.bitter : COLORS.espressoSoft, fontFamily: "Inter, sans-serif" }}>
              {backupMessage}
            </p>
          )}
          <p className="mt-2" style={{ fontSize: "0.8125rem", color: COLORS.espressoSoft, fontFamily: "Inter, sans-serif" }}>
            Importing replaces your own coffees and settings with the backup's, and merges community data rather than overwriting it. Reload the page afterward to see the imported data.
          </p>
        </div>

        <button onClick={() => settingsOk && onSave({ doseG, grinderMin, grinderMax, tempUnit, trackTemp, tastingPreferences: notes, apiKey: apiKey.trim() })}
          disabled={!settingsOk}
          className="w-full py-2 rounded-lg font-medium text-sm mt-4"
          style={{ background: settingsOk ? COLORS.copper : COLORS.line, color: settingsOk ? COLORS.ink : COLORS.disabledText, fontFamily: "Inter, sans-serif" }}>
          Save Equipment
        </button>
    </ModalShell>
  );
}

/* ---------------- Style fields ---------------- */
function StyleFields({ style, setStyle, customTargets, setCustomTargets, doseG, equipment, requireChoice }) {
  const update = (k, v) => setCustomTargets((f) => ({ ...f, [k]: v }));
  // Validated live so a typo is caught at the field, before it can be saved.
  const customProblems = style === "Custom" ? validateCustomTargets(customTargets, equipment) : [];
  const flagged = new Set(customProblems.map((p) => p.key));
  const fieldStyle = (k) => (flagged.has(k) ? { ...inputStyle, border: `1px solid ${COLORS.bitter}` } : inputStyle);
  return (
    <>
      <Field label={requireChoice ? "Shot Style *" : "Shot Style"}>
        <select style={inputStyle} value={style} onChange={(e) => setStyle(e.target.value)}>
          {requireChoice && <option value="">Select…</option>}
          {SHOT_STYLES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </Field>
      <p style={{ fontFamily: "Inter, sans-serif", color: COLORS.espressoSoft }} className="text-xs -mt-2 mb-3 flex gap-1.5">
        {(() => {
          const { Icon, background } = styleBadge(style);
          return Icon && <Icon size={14} strokeWidth={2.6} className="shrink-0 mt-0.5" color={background} />;
        })()}
        {STYLE_HINTS[style] || "Traditional is the safe default. Turbo, Ristretto, and Lungo are deliberate departures — pick one if that's what you're after."}
      </p>
      {style === "Custom" && (
        <>
          <div className="grid grid-cols-2 gap-3 p-3 rounded-lg mb-1" style={{ background: COLORS.cream }}>
            <Field label={`Yield (g), Dose ${doseG || 18}g`}>
              <input type="number" step="0.1" min={INPUT_BOUNDS.yieldG[0]} max={INPUT_BOUNDS.yieldG[1]} style={fieldStyle("yieldG")} value={customTargets.yieldG || ""} onChange={(e) => update("yieldG", e.target.value)} />
            </Field>
            <Field label={`Temp (${tempLabel(equipment)})`}>
              <input type="number" step="1"
                min={tempUnitOf(equipment) === "F" ? cToF(INPUT_BOUNDS.tempC[0]) : INPUT_BOUNDS.tempC[0]}
                max={tempUnitOf(equipment) === "F" ? cToF(INPUT_BOUNDS.tempC[1]) : INPUT_BOUNDS.tempC[1]}
                style={fieldStyle("tempC")} value={showTemp(customTargets.tempC, equipment)} onChange={(e) => update("tempC", readTemp(e.target.value, equipment))} />
            </Field>
            <Field label="Fastest Shot Time (s)">
              <input type="number" step="0.1" min={INPUT_BOUNDS.timeS[0]} max={INPUT_BOUNDS.timeS[1]} style={fieldStyle("timeLow")} value={customTargets.timeLow || ""} onChange={(e) => update("timeLow", e.target.value)} />
            </Field>
            <Field label="Slowest Shot Time (s)">
              <input type="number" step="0.1" min={INPUT_BOUNDS.timeS[0]} max={INPUT_BOUNDS.timeS[1]} style={fieldStyle("timeHigh")} value={customTargets.timeHigh || ""} onChange={(e) => update("timeHigh", e.target.value)} />
            </Field>
          </div>
          <p style={{ fontSize: "0.8125rem", color: COLORS.espressoSoft, fontFamily: "Inter, sans-serif" }} className="mb-2">
            The two times are the ends of your target window — a shot landing anywhere between them counts as on target.
          </p>
          {customProblems.length > 0 && (
            <div className="p-2.5 rounded-lg mb-2 space-y-1" style={{ background: COLORS.surface, border: `1px solid ${COLORS.bitter}` }}>
              {customProblems.map((p, i) => (
                <p key={i} className="text-xs flex gap-1.5" style={{ fontFamily: "Inter, sans-serif", color: COLORS.espresso }}>
                  <AlertTriangle size={13} color={COLORS.bitter} className="shrink-0 mt-0.5" /> {p.message}
                </p>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}

/* ---------------- Add Coffee Modal ---------------- */
/* Fields worth prompting for after an autofill leaves gaps. Only name and
   roaster actually gate saving (see canSave) — the rest simply sharpen the
   recipe, so this list is about nudging, not blocking. */
/* Fields worth prompting for after an autofill leaves gaps. Only name and
   roaster actually gate saving (see canSave) — the rest simply sharpen the
   recipe, so this list is about nudging, not blocking.

   producer is deliberately absent: it has no visible input anywhere in this
   form, so including it here produced a nudge ("add it below") pointing at a
   field that didn't exist. It belongs with summary/espressoNotes below —
   enrichment captured when available, never demanded from the user. */
/* Fields worth prompting for after an autofill leaves gaps. Only name and
   roaster actually gate saving (see canSave) — the rest simply sharpen the
   recipe, so this list is about nudging, not blocking.

   Every key here must have a real input in the form below it, or the nudge
   ("add it below") points at nothing — that was the bug that got producer
   removed from this list; it's back now that the field actually exists. */
const PROMPTABLE_FIELDS = [
  { key: "name", label: "Name" },
  { key: "roaster", label: "Roaster" },
  { key: "origin", label: "Origin" },
  { key: "elevationM", label: "Elevation" },
  { key: "roastLevel", label: "Roast level" },
  { key: "process", label: "Process" },
  { key: "variety", label: "Variety" },
  { key: "producer", label: "Producer" },
  { key: "tastingNotes", label: "Tasting notes" },
];
/* summary and espressoNotes have no input anywhere in this form — enrichment
   captured when available, never demanded from the user. */

function AddCoffeeModal({ equipment, coffeeIndex, onSave, onClose }) {
  const [form, setForm] = useState({ name: "", roaster: "", origin: "", elevationM: "", roastLevel: "", process: "", tastingNotes: "", roasterUrl: "", variety: "", producer: "", summary: "", espressoNotes: "", roastLevelSource: "", roastLevelBasis: "" });
  const [style, setStyle] = useState("Traditional");
  const [customTargets, setCustomTargets] = useState({ yieldG: 36, tempC: 93, timeLow: 25, timeHigh: 32 });
  const [known, setKnown] = useState(null);
  const [confirmedDuplicateId, setConfirmedDuplicateId] = useState(null);
  const [fetchState, setFetchState] = useState("idle"); // idle | loading | done | error
  const [fetchError, setFetchError] = useState("");
  const [autoFilled, setAutoFilled] = useState([]);
  const [images, setImages] = useState([]);
  const [roasterRecipe, setRoasterRecipe] = useState(null);
  const [recipeRejected, setRecipeRejected] = useState(null);
  const [proseTrimmed, setProseTrimmed] = useState(false);
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  function mergeExtracted(base, data) {
    const next = { ...base };
    const filled = [];
    const take = (key, value, allowed) => {
      if (value === null || value === undefined || value === "") return;
      if (allowed && !allowed.includes(value)) return;
      next[key] = value;
      filled.push(key);
    };
    take("name", data.name);
    take("roaster", data.roaster);
    take("origin", data.origin);
    take("elevationM", data.elevationM);
    take("roastLevel", data.roastLevel, ROAST_LEVELS);
    if (data.roastLevelSource) next.roastLevelSource = data.roastLevelSource;
    if (data.roastLevelBasis) next.roastLevelBasis = data.roastLevelBasis;
    take("process", data.process, PROCESSES);
    take("tastingNotes", data.tastingNotes);
    take("variety", data.variety);
    take("producer", data.producer);
    take("summary", data.summary);
    take("espressoNotes", data.espressoNotes);
    return { next, filled, recipe: data.roasterRecipe };
  }

  async function addImages(fileList) {
    const files = Array.from(fileList || []).filter((f) => f.type.startsWith("image/")).slice(0, 4);
    if (!files.length) return;
    try {
      const encoded = await Promise.all(
        files.map(async (f) => ({ name: f.name, mediaType: f.type, data: await fileToBase64(f), preview: URL.createObjectURL(f) }))
      );
      setImages((prev) => {
        const combined = [...prev, ...encoded];
        const kept = combined.slice(0, 4);
        // createObjectURL was already called for every encoded file above, so
        // anything the 4-image cap pushes out here would otherwise leak a blob
        // URL for an image the person never even saw.
        combined.slice(4).forEach((img) => URL.revokeObjectURL(img.preview));
        return kept;
      });
    } catch (e) {
      setFetchError(e.message);
    }
  }

  // Object URLs hold their underlying blob in memory until explicitly revoked.
  // A ref (not `images` itself) avoids a stale closure capturing whatever the
  // array looked like when the effect first ran — this always revokes whatever
  // is actually present when the modal unmounts, however it was closed.
  const imagesRef = useRef(images);
  imagesRef.current = images;
  useEffect(() => () => { imagesRef.current.forEach((img) => URL.revokeObjectURL(img.preview)); }, []);

  async function runLookup({ forceRefresh = false } = {}) {
    if (!form.roasterUrl && !images.length) return;
    setFetchState("loading");
    setFetchError("");

    let working = { ...form };
    // A forced re-read should report on its own findings, not inherit badges
    // from the stale run it's replacing.
    const filled = new Set(forceRefresh ? [] : autoFilled);
    let recipe = forceRefresh ? null : roasterRecipe;
    let rejected = null;
    let trimmed = false;
    const failed = [];

    /* Both extraction sources (page text, uploaded images) fold their result
       in identically. Keeping that in one place means a newly-merged field
       can't be added to one branch and silently forgotten in the other. */
    const absorb = (data) => {
      const r = mergeExtracted(working, data);
      working = r.next;
      r.filled.forEach((k) => filled.add(k));
      if (r.recipe?.ratio) recipe = r.recipe;
      if (data.recipeRejected) rejected = data.recipeRejected;
      if (data.proseTrimmed) trimmed = true;
    };

    if (form.roasterUrl) {
      try {
        const { data } = await fetchCoffeeFromUrl(form.roasterUrl, { forceRefresh, apiKey: equipment?.apiKey || null });
        absorb(data);
      } catch (e) {
        // A bare `catch {}` here was discarding the real reason every time,
        // even when it was genuinely informative (a rejected key, a specific
        // HTTP status) — replacing it with an identical generic message
        // regardless of cause, so a real failure and "nothing to extract"
        // were indistinguishable to anyone trying to find out why.
        console.error("Roaster URL lookup failed:", e);
        failed.push(e?.message ? `the page (${e.message})` : "the page");
      }
    }
    if (images.length) {
      try {
        absorb(await fetchCoffeeFromImages(images, equipment?.apiKey || null));
      } catch (e) {
        console.error("Image extraction failed:", e);
        failed.push(e?.message ? `${images.length === 1 ? "the image" : "the images"} (${e.message})` : images.length === 1 ? "the image" : "the images");
      }
    }

    setForm(working);
    setAutoFilled([...filled]);
    setRoasterRecipe(recipe);
    setRecipeRejected(rejected);
    setProseTrimmed(trimmed);

    if (filled.size) {
      setFetchState("done");
      setFetchError(failed.length ? `Couldn't read ${failed.join(" or ")}, but filled in what was available.` : "");
    } else {
      setFetchState("error");
      setFetchError("Nothing readable turned up. Fill the details in below, or add a screenshot of the spec section.");
    }
  }

  function useRoasterRecipe() {
    setCustomTargets({
      yieldG: roasterRecipe.yieldG || Math.round(safeDose(equipment?.doseG) * roasterRecipe.ratio),
      tempC: roasterRecipe.tempC || 93,
      timeLow: roasterRecipe.timeLow || 25,
      timeHigh: roasterRecipe.timeHigh || roasterRecipe.timeLow || 32,
    });
    setStyle("Custom");
  }

  const missing = PROMPTABLE_FIELDS.filter((f) => !form[f.key]);

  // Look up an existing community record when the name settles
  useEffect(() => {
    if (!form.name || form.name.length < 3) { setKnown(null); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      const rec = await getKey(K.coffee(roasterBucketKey(form.roaster, form.roasterUrl), form.name), true);
      if (cancelled) return;
      setKnown(rec);
      /* Silently adopt the community record's better-accented spelling — typing
         "Cafe Granja" for a coffee already recorded as "Café Granja" should
         show the accented form. preferAccented only swaps between spellings of
         the same name, so this can never replace a genuinely different value,
         and it no-ops when the typed version is already the accented one. */
      if (rec) {
        setForm((f) => {
          const name = preferAccented(f.name, rec.name);
          const roaster = preferAccented(f.roaster, rec.roaster);
          if (name === f.name && roaster === f.roaster) return f;
          return { ...f, name, roaster };
        });
      }
    }, 500);
    return () => { cancelled = true; clearTimeout(t); };
  }, [form.name, form.roaster, form.roasterUrl]);

  function applyKnown() {
    if (!known) return;
    setForm((f) => ({
      ...f,
      roaster: known.roaster || f.roaster,
      origin: known.origin || f.origin,
      elevationM: known.elevationM || f.elevationM,
      roastLevel: known.roastLevel || f.roastLevel,
      process: known.process || f.process,
      tastingNotes: known.tastingNotes || f.tastingNotes,
      roasterUrl: known.roasterUrl || f.roasterUrl,
      variety: known.variety || f.variety,
      producer: known.producer || f.producer,
      summary: known.summary || f.summary,
      espressoNotes: known.espressoNotes || f.espressoNotes,
    }));
  }

  // Custom targets must pass the same plausibility check the form displays, so
  // a flagged typo can't be saved past the warning.
  const customOk = style !== "Custom" || validateCustomTargets(customTargets, equipment).length === 0;
  const canSave = form.name && form.roaster && customOk;
  const existingMatch = findExistingCoffee(coffeeIndex, form.name, form.roaster);
  const needsDuplicateConfirmation = existingMatch && existingMatch.id !== confirmedDuplicateId;

  return (
    <ModalShell title="New Coffee" onClose={onClose}>
        <p className="mb-3" style={{ fontSize: "0.8125rem", color: COLORS.espressoSoft, fontFamily: "Inter, sans-serif" }}>* required — everything else (including shot style, which defaults to Traditional) can be filled in or changed later.</p>
        {/* Step 1 — roaster URL and/or screenshots */}
        <div className="p-3 rounded-lg mb-4" style={{ background: COLORS.cream }}>
          <span className="block tracking-wide mb-1" style={{ fontSize: "0.875rem", color: COLORS.espressoSoft, fontFamily: "Inter, sans-serif", fontWeight: 500 }}>
            Roaster Page URL
          </span>
          <input style={inputStyle} value={form.roasterUrl} onChange={(e) => update("roasterUrl", e.target.value)} placeholder="https://sweetbloomcoffee.com/products/hambela" />

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <label className="text-xs px-3 py-1.5 rounded-full cursor-pointer font-medium flex items-center gap-1.5"
              style={{ border: `1px solid ${COLORS.line}`, color: COLORS.espressoSoft, fontFamily: "Inter, sans-serif" }}>
              <ImageIcon size={13} /> Add screenshot
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { addImages(e.target.files); e.target.value = ""; }} />
            </label>
            <span style={{ fontSize: "0.8125rem", color: COLORS.espressoSoft, fontFamily: "Inter, sans-serif" }}>
              for the bag, or a screenshot of the roaster's website for the most accurate info
            </span>
          </div>

          {images.length > 0 && (
            <div className="flex gap-2 mt-2 flex-wrap">
              {images.map((img, i) => (
                <div key={i} className="relative">
                  <img src={img.preview} alt="" className="w-14 h-14 object-cover rounded-lg" style={{ border: `1px solid ${COLORS.line}` }} />
                  <button onClick={() => setImages((p) => { URL.revokeObjectURL(p[i].preview); return p.filter((_, n) => n !== i); })}
                    aria-label="Remove image" className="absolute -top-1.5 -right-1.5 rounded-full p-1" style={{ background: COLORS.bitter }}>
                    {/* bitter is dark enough that ink fails badly (contrast ~2.0) — kept white deliberately */}
                    <X size={11} color="#fff" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button onClick={() => runLookup()} disabled={(!form.roasterUrl && !images.length) || fetchState === "loading"}
            className="w-full mt-2.5 py-2 rounded-lg text-sm font-medium"
            style={{ background: (form.roasterUrl || images.length) && fetchState !== "loading" ? COLORS.copper : COLORS.line, color: (form.roasterUrl || images.length) && fetchState !== "loading" ? COLORS.ink : COLORS.disabledText, fontFamily: "Inter, sans-serif" }}>
            {fetchState === "loading" ? "Reading…" : "Autofill Details"}
          </button>

          {fetchState !== "done" && (
            <p className="text-xs mt-1.5" style={{ color: fetchState === "error" ? COLORS.bitter : COLORS.espressoSoft, fontFamily: "Inter, sans-serif" }}>
              {fetchState === "loading"
                ? "Reading the page…"
                : fetchError || "Optional — paste a link, add screenshots, or both."}
            </p>
          )}
        </div>

        {(recipeRejected || proseTrimmed) && (
          <div className="p-2.5 rounded-lg mb-3 flex items-start gap-2" style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}` }}>
            <AlertTriangle size={14} color={COLORS.espressoSoft} className="shrink-0 mt-0.5" />
            <p className="text-xs" style={{ color: COLORS.espressoSoft, fontFamily: "Inter, sans-serif" }}>
              {recipeRejected ? `Skipped ${recipeRejected}. ` : ""}
              {proseTrimmed ? "Filter and pour-over notes were removed from the write-up. " : ""}
              This tool tracks espresso only.
            </p>
          </div>
        )}

        {/* Roaster's own espresso recipe, when they publish one */}
        {roasterRecipe?.ratio && (
          <div className="p-3 rounded-lg mb-3" style={{ background: COLORS.surface, border: `1px solid ${COLORS.copper}` }}>
            <p className="text-xs font-medium flex items-center gap-1.5" style={{ color: COLORS.espresso, fontFamily: "Inter, sans-serif" }}>
              <Sparkles size={13} color={COLORS.copper} /> {form.roaster || "The roaster"} publishes an espresso recipe
            </p>
            <p className="text-sm mt-1" style={{ fontFamily: "JetBrains Mono, monospace", color: COLORS.espresso }}>
              {roasterRecipe.doseG ? `${roasterRecipe.doseG}g → ${roasterRecipe.yieldG}g` : `1:${roasterRecipe.ratio}`}
              {roasterRecipe.timeLow ? ` · ${roasterRecipe.timeLow}${roasterRecipe.timeHigh && roasterRecipe.timeHigh !== roasterRecipe.timeLow ? `-${roasterRecipe.timeHigh}` : ""}s` : ""}
              {roasterRecipe.tempC ? ` · ${showTemp(roasterRecipe.tempC, equipment)}${tempLabel(equipment)}` : ""}
            </p>
            <button onClick={useRoasterRecipe} className="text-xs underline mt-1" style={{ color: COLORS.copperText, fontFamily: "Inter, sans-serif" }}>
              Use It as My Starting Point
            </button>
          </div>
        )}

        {/* Step 2 — what's still needed */}
        {fetchState === "done" && missing.length > 0 && (
          <div className="p-2.5 rounded-lg mb-3 flex items-start gap-2" style={{ background: COLORS.surface, border: `1px solid ${COLORS.copperSoft}` }}>
            <AlertTriangle size={14} color={COLORS.copper} className="shrink-0 mt-0.5" />
            <p className="text-xs" style={{ color: COLORS.espresso, fontFamily: "Inter, sans-serif" }}>
              The page didn't list {missing.map((m) => m.label.toLowerCase()).join(", ")} — add {missing.length === 1 ? "it" : "them"} below for a better starting recipe.
            </p>
          </div>
        )}

        <Field label={<>Name / Bag Label * {autoFilled.includes("name") && <AutoBadge />}</>}>
          <input style={inputStyle} value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="e.g. Hambela" />
        </Field>
        {known && (
          <div className="-mt-1 mb-3 p-2.5 rounded-lg flex items-start gap-2" style={{ background: COLORS.cream }}>
            <Users size={14} color={COLORS.copper} className="shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs" style={{ color: COLORS.espresso, fontFamily: "Inter, sans-serif" }}>
                {known.totalShots} dialed-in shot{known.totalShots === 1 ? "" : "s"} recorded for this coffee.
              </p>
              <button onClick={applyKnown} className="text-xs underline mt-0.5" style={{ color: COLORS.copperText, fontFamily: "Inter, sans-serif" }}>
                Fill in the Known Details
              </button>
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label={<>Roaster * {autoFilled.includes("roaster") && <AutoBadge />}</>}>
            <input style={inputStyle} value={form.roaster} onChange={(e) => update("roaster", e.target.value)} placeholder="e.g. Sweet Bloom" />
          </Field>
          <Field label={<>Origin {autoFilled.includes("origin") && <AutoBadge />}</>}>
            <input style={inputStyle} value={form.origin} onChange={(e) => update("origin", e.target.value)} placeholder="e.g. Guji, Ethiopia" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={<>Elevation (Optional) {autoFilled.includes("elevationM") && <AutoBadge />}</>}>
            <input style={inputStyle} value={form.elevationM} onChange={(e) => update("elevationM", e.target.value)} placeholder="e.g. 1970-2241" />
            {form.elevationM && (
              <span className="block mt-1" style={{ fontSize: "0.8125rem", color: parseElevation(form.elevationM) ? COLORS.espressoSoft : COLORS.bitter, fontFamily: "Inter, sans-serif" }}>
                {parseElevation(form.elevationM)
                  ? `Read as ${formatElevation(form.elevationM)}${parseElevation(form.elevationM).converted ? " (converted from feet)" : ""}`
                  : "Couldn't read that — try a number or a range."}
              </span>
            )}
          </Field>
          <Field label={<>Roast Level (Optional) {autoFilled.includes("roastLevel") && (form.roastLevelSource === "estimated" ? <EstimateBadge /> : <AutoBadge />)}</>}>
            <select style={inputStyle} value={form.roastLevel} onChange={(e) => setForm((f) => ({ ...f, roastLevel: e.target.value, roastLevelSource: "", roastLevelBasis: "" }))}>
              <option value="">Select…</option>
              {ROAST_LEVELS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            {form.roastLevelSource === "estimated" && form.roastLevelBasis && (
              <span className="block mt-1" style={{ fontSize: "0.8125rem", color: COLORS.espressoSoft, fontFamily: "Inter, sans-serif" }}>
                The page doesn't state a roast level — estimated from {form.roastLevelBasis}. Change it if you know better.
              </span>
            )}
            {form.roastLevelSource === "scale" && (
              <span className="block mt-1" style={{ fontSize: "0.8125rem", color: COLORS.espressoSoft, fontFamily: "Inter, sans-serif" }}>
                Read off the roaster's roast scale — worth a sanity check.
              </span>
            )}
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={<>Process (Optional) {autoFilled.includes("process") && <AutoBadge />}</>}>
            <select style={inputStyle} value={form.process} onChange={(e) => update("process", e.target.value)}>
              <option value="">Select…</option>
              {PROCESSES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
          <Field label={<>Variety (Optional) {autoFilled.includes("variety") && <AutoBadge />}</>}>
            <input style={inputStyle} value={form.variety} onChange={(e) => update("variety", e.target.value)} placeholder="e.g. Heirloom" />
          </Field>
        </div>
        <Field label={<>Producer (Optional) {autoFilled.includes("producer") && <AutoBadge />}</>}>
          <input style={inputStyle} value={form.producer} onChange={(e) => update("producer", e.target.value)} placeholder="e.g. Abana Estate (Omran Family)" />
        </Field>
        <Field label={<>Tasting Notes (Optional) {autoFilled.includes("tastingNotes") && <AutoBadge />}</>}>
          <textarea style={{ ...inputStyle, minHeight: 60 }} value={form.tastingNotes} onChange={(e) => update("tastingNotes", e.target.value)} placeholder="e.g. raspberry, yellow peach, milk chocolate" />
        </Field>
        <StyleFields style={style} setStyle={setStyle} customTargets={customTargets} setCustomTargets={setCustomTargets} doseG={equipment?.doseG} equipment={equipment} />
        {needsDuplicateConfirmation && (
          <div className="mt-2 p-3 rounded-lg" style={{ background: COLORS.cream, border: `1px solid ${COLORS.bitter}` }}>
            <p className="text-sm" style={{ color: COLORS.espresso, fontFamily: "Inter, sans-serif" }}>
              You already have <strong>{existingMatch.name}</strong> from <strong>{existingMatch.roaster}</strong>
              {existingMatch.shotCount ? ` with ${existingMatch.shotCount} shot${existingMatch.shotCount === 1 ? "" : "s"} logged` : ""}. Add this as a separate entry anyway?
            </p>
            <button onClick={() => setConfirmedDuplicateId(existingMatch.id)} className="text-xs underline mt-1.5" style={{ color: COLORS.bitter, fontFamily: "Inter, sans-serif" }}>
              Add Anyway
            </button>
          </div>
        )}
        <button onClick={() => canSave && !needsDuplicateConfirmation && onSave({ ...form, roaster: shortenRoasterName(form.roaster), style, roasterRecipe, customTargets: style === "Custom" ? customTargets : undefined })}
          disabled={!canSave || needsDuplicateConfirmation} className="w-full py-2 rounded-lg font-medium text-sm mt-2"
          style={{ background: canSave && !needsDuplicateConfirmation ? COLORS.copper : COLORS.line, color: canSave && !needsDuplicateConfirmation ? COLORS.ink : COLORS.disabledText, fontFamily: "Inter, sans-serif" }}>
          Generate Starting Recipe
        </button>
        {!canSave && (
          <p className="text-xs text-center mt-2" style={{ color: COLORS.espressoSoft, fontFamily: "Inter, sans-serif" }}>
            {!form.name ? "A name is required." : !form.roaster ? "A roaster is required." : "Fix the highlighted custom targets to continue."}
          </p>
        )}
    </ModalShell>
  );
}

/* ---------------- Change Style panel ---------------- */
function ChangeStylePanel({ coffee, onApply, onCancel, equipment }) {
  const [style, setStyle] = useState(coffee.style || "Traditional");
  const [customTargets, setCustomTargets] = useState(
    coffee.customTargets || { yieldG: coffee.currentRecipe.yieldG, tempC: coffee.currentRecipe.tempC, timeLow: coffee.currentRecipe.timeLow, timeHigh: coffee.currentRecipe.timeHigh }
  );
  // Same gate as the add form — this path can set custom targets too, so it
  // can't be allowed to apply a value the add form would have rejected.
  const canApply = style !== "Custom" || validateCustomTargets(customTargets, equipment).length === 0;
  return (
    <div className="mt-3 p-4 rounded-xl" style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}` }}>
      <StyleFields style={style} setStyle={setStyle} customTargets={customTargets} setCustomTargets={setCustomTargets} doseG={coffee.currentRecipe.doseG} equipment={equipment} />
      <div className="flex gap-2">
        <button onClick={() => canApply && onApply(style, style === "Custom" ? customTargets : undefined)} disabled={!canApply}
          className="flex-1 py-2 rounded-lg text-sm font-medium"
          style={{ background: canApply ? COLORS.copper : COLORS.line, color: canApply ? COLORS.ink : COLORS.disabledText, fontFamily: "Inter, sans-serif" }}>
          Apply style
        </button>
        <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm" style={{ border: `1px solid ${COLORS.line}`, fontFamily: "Inter, sans-serif", color: COLORS.espressoSoft }}>Cancel</button>
      </div>
    </div>
  );
}

/* ---------------- Coffee Detail Body (rendered inside an expanded CoffeeCard) ---------------- */
function CoffeeDetailBody({ coffee, equipment, onDelete, onOpenLog, logForm, setLogForm, onSubmitShot, onCancelLog, onChangeStyle, editingShot, onEditShot, setEditForm, onSaveEdit, onCancelEdit }) {
  // Shown for as long as the most recent shot has not yet qualified as dialed
  // in — reads straight from the stored shot, so it reappears correctly after
  // a reload or a collapse/re-expand, not just for the session that logged it.
  const mostRecentShot = coffee.shots[0];
  const lastSuggestion = mostRecentShot && !mostRecentShot.dialedIn && mostRecentShot.suggestionMessages
    ? { messages: mostRecentShot.suggestionMessages }
    : null;
  const [editingStyle, setEditingStyle] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [expandedShotIds, setExpandedShotIds] = useState(new Set());
  const toggleShotExpand = (id) => setExpandedShotIds((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const r = coffee.currentRecipe;
  const style = coffee.style || "Traditional";

  return (
    <div>
      {/* The card's collapsed row already shows name/roaster/origin/roast — this
          adds what's left (elevation, process, notes, link) plus the remove action. */}
      <div className="flex items-start justify-between gap-3 mb-1">
        <div className="min-w-0 space-y-1">
          {(coffee.variety || coffee.elevationM || coffee.process) && (
            <p className="text-xs" style={{ color: COLORS.espressoSoft, fontFamily: "Inter, sans-serif" }}>
              <DotJoined parts={[coffee.variety, formatElevation(coffee.elevationM), coffee.process]} />
            </p>
          )}
          {coffee.tastingNotes && (
            <p className="text-xs italic break-words" style={{ color: COLORS.espressoSoft, fontFamily: "Inter, sans-serif" }}>"{coffee.tastingNotes}"</p>
          )}
          {safeHttpUrl(coffee.roasterUrl) && (
            <a href={safeHttpUrl(coffee.roasterUrl)} target="_blank" rel="noopener noreferrer" className="text-xs flex items-center gap-1 break-all" style={{ color: COLORS.copperText, fontFamily: "Inter, sans-serif" }}>
              <LinkIcon size={12} /> Roaster page
            </a>
          )}
        </div>
        {!confirmingDelete ? (
          <button onClick={() => setConfirmingDelete(true)} className="text-xs shrink-0" style={{ color: COLORS.bitter, fontFamily: "Inter, sans-serif" }}>Remove</button>
        ) : (
          <div className="flex flex-col items-end gap-1 shrink-0">
            <div className="flex items-center gap-2">
              <button onClick={onDelete} className="text-xs font-medium" style={{ color: COLORS.bitter, fontFamily: "Inter, sans-serif" }}>Yes, Remove</button>
              <button onClick={() => setConfirmingDelete(false)} className="text-xs underline" style={{ color: COLORS.espressoSoft, fontFamily: "Inter, sans-serif" }}>Cancel</button>
            </div>
            <span style={{ fontSize: "0.8125rem", color: COLORS.espressoSoft, fontFamily: "Inter, sans-serif" }}>Only removes it from your list — community data isn't affected</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 mt-3">
        <StyleBadge style={style} suffix=" style" className="text-xs px-2.5 py-1" />
        <button onClick={() => setEditingStyle((v) => !v)} className="text-xs underline" style={{ color: COLORS.espressoSoft, fontFamily: "Inter, sans-serif" }}>
          {editingStyle ? "Close" : "Change Style"}
        </button>
      </div>
      {editingStyle && <ChangeStylePanel coffee={coffee} equipment={equipment} onCancel={() => setEditingStyle(false)} onApply={(s, t) => { onChangeStyle(s, t); setEditingStyle(false); }} />}

      {(coffee.summary || coffee.espressoNotes || coffee.producer || coffee.roasterRecipe?.ratio) && (
        <div className="mt-4 p-3 rounded-xl" style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}` }}>
          <p className="tracking-wide mb-1.5 flex items-center gap-1.5" style={{ fontSize: "0.8125rem", color: COLORS.espressoSoft, fontFamily: "Inter, sans-serif", fontWeight: 500 }}>
            <BookOpen size={12} /> From The Roaster
          </p>
          {coffee.producer && (
            <p className="text-xs mb-1" style={{ color: COLORS.espressoSoft, fontFamily: "Inter, sans-serif" }}>
              {coffee.producer}
            </p>
          )}
          {coffee.summary && (
            <p className="text-sm" style={{ color: COLORS.espresso, fontFamily: "Inter, sans-serif" }}>{coffee.summary}</p>
          )}
          {coffee.espressoNotes && (
            <p className="text-sm mt-1.5" style={{ color: COLORS.espresso, fontFamily: "Inter, sans-serif" }}>
              <span style={{ color: COLORS.espressoSoft }}>As espresso: </span>{coffee.espressoNotes}
            </p>
          )}
          {coffee.roasterRecipe?.ratio && (
            <p className="text-xs mt-2" style={{ fontFamily: "JetBrains Mono, monospace", color: COLORS.copperText }}>
              published espresso recipe · {coffee.roasterRecipe.doseG ? `${coffee.roasterRecipe.doseG}g → ${coffee.roasterRecipe.yieldG}g` : `1:${coffee.roasterRecipe.ratio}`}
              {coffee.roasterRecipe.timeLow ? ` · ${coffee.roasterRecipe.timeLow}${coffee.roasterRecipe.timeHigh && coffee.roasterRecipe.timeHigh !== coffee.roasterRecipe.timeLow ? `-${coffee.roasterRecipe.timeHigh}` : ""}s` : ""}
            </p>
          )}
        </div>
      )}

      <div className="mt-4 p-4 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-4" style={{ background: COLORS.creamDeep }}>
        <RecipeStat icon={<Scale size={16} color={COLORS.copper} />} label="Dose" value={`${r.doseG}g`} />
        <RecipeStat icon={<Gauge size={16} color={COLORS.copper} />} label="Yield" value={`${r.yieldG}g`} sub={`1:${r.ratio}`} />
        <RecipeStat icon={<Clock size={16} color={COLORS.copper} />} label="Time" value={`${r.timeLow}-${r.timeHigh}s`} />
        {tracksTemp(equipment) && <RecipeStat icon={<Thermometer size={16} color={COLORS.copper} />} label="Temp" value={`${showTemp(r.tempC, equipment)}${tempLabel(equipment)}`} />}
        {Number.isFinite(r.grindValue) && <RecipeStat icon={<Settings size={16} color={COLORS.copper} />} label="Grind" value={`${r.grindValue}`} sub={r.grindSuggestion ? "from data" : "starting point"} />}
      </div>

      {r.sources?.length > 0 && (
        <div className="mt-2 space-y-0.5">
          {r.sources.map((s, i) => (
            <p key={i} className="text-xs flex items-center gap-1.5" style={{ color: COLORS.copperText, fontFamily: "Inter, sans-serif" }}>
              {s.kind === "roaster" ? <Store size={12} /> : s.kind === "preference" ? <Heart size={12} /> : <Users size={12} />}
              {s.kind === "roaster"
                ? `${s.what} shaped by ${s.label}`
                : s.kind === "preference"
                ? `${s.what} nudged by ${s.label}`
                : `${s.what} refined from ${s.count} shot${s.count === 1 ? "" : "s"} — ${s.label}`}
            </p>
          ))}
        </div>
      )}

      {r.notes?.length > 0 && (
        <div className="mt-3 space-y-1">
          {r.notes.map((n, i) => (
            <p key={i} style={{ fontFamily: "Inter, sans-serif", color: COLORS.espressoSoft }} className="text-xs flex gap-1.5">
              <AlertTriangle size={13} color={COLORS.copperSoft} className="shrink-0 mt-0.5" /> {n}
            </p>
          ))}
        </div>
      )}
      {r.grindHint && (
        <p style={{ fontFamily: "Inter, sans-serif", color: r.grindSuggestion ? COLORS.copper : COLORS.espressoSoft }} className="text-xs mt-2">{r.grindHint}</p>
      )}

      {!logForm && (
        <button onClick={onOpenLog} className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium" style={{ background: COLORS.copper, color: COLORS.ink, fontFamily: "Inter, sans-serif" }}>
          <Plus size={16} /> Log a Shot
        </button>
      )}
      {logForm && <ShotLogForm logForm={logForm} setLogForm={setLogForm} onSubmit={onSubmitShot} onCancel={onCancelLog} equipment={equipment} />}

      {lastSuggestion && (
        <div className="mt-5 p-4 rounded-xl" style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}` }}>
          <div className="flex flex-col gap-3">
            <div className="space-y-2">
              {lastSuggestion.messages.map((m, i) => (
                <p key={i} className="text-sm flex gap-2" style={{ fontFamily: "Inter, sans-serif", color: COLORS.espresso }}>
                  {m.kind === "done" ? <Check size={16} color={COLORS.dialed} className="shrink-0 mt-0.5" /> : <Sparkles size={14} color={COLORS.copper} className="shrink-0 mt-0.5" />}
                  {m.text}
                </p>
              ))}
            </div>
            <div className="flex gap-1.5 flex-wrap justify-center">
              {tasteChipsFull(coffee.shots[0]).map((c) => (
                <span key={c.key} className="px-2 py-0.5 rounded-full" style={{ fontSize: "0.8125rem", background: c.color, color: c.textColor }}>{c.label}</span>
              ))}
            </div>
            <div className="flex justify-center">
              <ExtractionCompass scales={shotScales(coffee.shots[0])} />
            </div>
          </div>
        </div>
      )}

      {coffee.shots.length > 0 && (
        <div className="mt-6">
          <h3 style={{ fontFamily: "Inter, sans-serif", color: COLORS.espressoSoft, fontSize: "0.8125rem", fontWeight: 500 }} className="tracking-wide mb-2 flex items-center gap-1.5">
            <History size={13} /> Shot History
          </h3>
          <div className="space-y-2">
            {coffee.shots.map((s) =>
              editingShot?.shotId === s.id ? (
                <div key={s.id}>
                  <p className="mb-1" style={{ fontSize: "0.8125rem", color: COLORS.copperText, fontFamily: "Inter, sans-serif" }}>
                    Editing shot from {new Date(s.timestamp).toLocaleDateString()}
                  </p>
                  <ShotLogForm
                    logForm={editingShot.form}
                    setLogForm={setEditForm}
                    onSubmit={onSaveEdit}
                    onCancel={onCancelEdit}
                    equipment={equipment}
                    submitLabel="Save Changes"
                  />
                </div>
              ) : (
              <div key={s.id} className="p-3 rounded-lg text-sm" style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}`, fontFamily: "Inter, sans-serif" }}>
                <button onClick={() => toggleShotExpand(s.id)} aria-expanded={expandedShotIds.has(s.id)} className="w-full flex justify-between items-center flex-wrap gap-1 text-left">
                  <span style={{ fontFamily: "JetBrains Mono, monospace", color: COLORS.espresso }} className="text-xs">
                    {s.doseG}g → {s.yieldG}g · {s.timeS}s{s.tempC != null && s.tempC !== "" ? ` · ${showTemp(s.tempC, equipment)}${tempLabel(equipment)}` : ""}{s.grindSetting ? ` · grind ${s.grindSetting}` : ""}
                  </span>
                  <span className="flex items-center gap-1 shrink-0">
                    <span style={{ color: COLORS.espressoSoft }} className="text-xs">
                      {new Date(s.timestamp).toLocaleDateString()}{s.editedAt ? " · edited" : ""}
                    </span>
                    <ChevronDown size={14} color={COLORS.espressoSoft}
                      style={{ transform: expandedShotIds.has(s.id) ? "rotate(180deg)" : "none", transition: "transform 150ms ease" }} />
                  </span>
                </button>
                {expandedShotIds.has(s.id) && (
                  <>
                    <div className="flex gap-1.5 flex-wrap justify-center mt-2">
                      {tasteChipsFull(s).map((c) => (
                        <span key={c.key} className="px-2 py-0.5 rounded-full" style={{ fontSize: "0.8125rem", background: c.color, color: c.textColor }}>{c.label}</span>
                      ))}
                    </div>
                    <div className="flex justify-center my-2">
                      <ExtractionCompass scales={shotScales(s)} />
                    </div>
                  </>
                )}
                <div className="flex gap-1.5 flex-wrap mt-1.5">
                  {s.style && (
                    <StyleBadge style={s.style} fontSize="0.8125rem" className="px-2 py-0.5" iconClass="mr-0.5 -mt-0.5" />
                  )}
                  {s.dialedIn && <span className="px-2 py-0.5 rounded-full" style={{ fontSize: "0.8125rem", background: COLORS.dialed, color: COLORS.ink }}>Dialed in</span>}
                </div>
                {s.notes && <p style={{ color: COLORS.espressoSoft }} className="text-xs mt-1.5 italic">{s.notes}</p>}
                <div className="mt-2">
                  <button onClick={() => onEditShot(s.id)} className="text-xs underline" style={{ color: COLORS.copperText, fontFamily: "Inter, sans-serif" }}>Edit</button>
                </div>
              </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function RecipeStat({ icon, label, value, sub }) {
  return (
    <div>
      <div className="flex items-center gap-1.5">
        {icon}
        <span style={{ fontFamily: "Inter, sans-serif", color: COLORS.espressoSoft, fontSize: "0.8125rem", fontWeight: 500 }} className="tracking-wide">{label}</span>
      </div>
      <div style={{ fontFamily: "JetBrains Mono, monospace", color: COLORS.espresso }} className="text-lg font-medium mt-0.5">
        {value} {sub && <span className="text-xs" style={{ color: COLORS.espressoSoft }}>({sub})</span>}
      </div>
    </div>
  );
}

/* ---------------- Shot Log Form ---------------- */
/* One ramp-color rule, shared by the input sliders and the compass below — so
   a dot on the compass is guaranteed to show the exact same color the person
   saw when they picked that value, never a second, independently-tuned copy
   that could drift out of sync with it. */
function scaleRampColor(scale, n) {
  if (scale.type === "balance") {
    if (n === 3) return COLORS.ramp[0];
    if (n === 2 || n === 4) return COLORS.ramp[2];
    return COLORS.ramp[4];
  }
  return scale.goal === "high" ? COLORS.ramp[5 - n] : COLORS.ramp[n - 1];
}

/* Text color to pair with a ramp swatch. Green/yellow/orange are all light
   enough to need dark ink; only the deep-red end is dark enough to need
   white — verified by actual contrast, not assumed uniform across the ramp. */
function rampTextColor(color) {
  return color === COLORS.ramp[4] ? "#fff" : COLORS.ink;
}

function ScaleRow({ scale, value, onChange }) {
  const isBalance = scale.type === "balance";
  const levels = [1, 2, 3, 4, 5];
  // Visual-only: which physical position each stored value renders at, and
  // which pole label sits on which side. The stored value itself (and every
  // color derived from it) never changes — only where it's drawn.
  const displayLevels = scale.reverseDisplay ? [5, 4, 3, 2, 1] : levels;
  const leftLabel = scale.reverseDisplay ? scale.high : scale.low;
  const rightLabel = scale.reverseDisplay ? scale.low : scale.high;

  /* Every level carries its own good→bad colour so the gradient reads at a
     glance; the unselected ones sit at low opacity so the current pick still
     stands out. Balance scales run green in the middle out to red at both
     ends; quality scales run green→red in whichever direction is good. */
  const rampColor = (n) => scaleRampColor(scale, n);

  return (
    <div className="mb-3">
      <div className="flex items-baseline justify-between mb-1">
        <span className="tracking-wide" style={{ fontSize: "0.875rem", color: COLORS.espressoSoft, fontFamily: "Inter, sans-serif", fontWeight: 500 }}>
          {scale.label}
        </span>
        <span style={{ fontSize: "0.8125rem", color: value == null ? COLORS.espressoSoft : COLORS.espresso, fontFamily: "Inter, sans-serif" }}>
          {value == null ? "Tap to rate" : isBalance && value === 3 ? scale.mid : value <= 2 ? scale.low : value >= 4 ? scale.high : "Moderate"}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="shrink-0" style={{ fontSize: "0.8125rem", color: COLORS.espressoSoft, fontFamily: "Inter, sans-serif", width: 58, textAlign: "right" }}>
          {leftLabel}
        </span>
        <div className="flex-1 flex items-center gap-1">
          {displayLevels.map((n) => (
            <button
              key={n}
              onClick={() => onChange(n)}
              aria-label={`${scale.label} level ${n}`}
              aria-pressed={n === value}
              className="flex-1 rounded-full transition-opacity"
              style={{
                height: 22,
                background: rampColor(n),
                opacity: value == null ? 0.14 : n === value ? 1 : 0.22,
                outline: n === value ? `2px solid ${COLORS.espresso}` : "none",
                outlineOffset: 1,
                border: "none",
              }}
            />
          ))}
        </div>
        <span className="shrink-0" style={{ fontSize: "0.8125rem", color: COLORS.espressoSoft, fontFamily: "Inter, sans-serif", width: 58 }}>
          {rightLabel}
        </span>
      </div>
      <p style={{ fontSize: "0.8125rem", color: COLORS.espressoSoft, fontFamily: "Inter, sans-serif", marginTop: 2 }}>{scale.hint}</p>
    </div>
  );
}

function ShotLogForm({ logForm, setLogForm, onSubmit, onCancel, equipment, submitLabel = "Save Shot & Get Suggestion" }) {
  const update = (k, v) => setLogForm((f) => ({ ...f, [k]: v }));
  const setScale = (key, n) => setLogForm((f) => ({ ...f, tasteScales: { ...f.tasteScales, [key]: n } }));
  const rangeKnown = grindStep(equipment) !== null;
  const scales = logForm.tasteScales || emptyTasteScales();
  const unrated = TASTE_SCALES.filter((sc) => scales[sc.key] == null).length;
  const inBounds = (x, [lo, hi]) => x !== "" && x !== null && x !== undefined && Number.isFinite(Number(x)) && Number(x) >= lo && Number(x) <= hi;
  const numbersOk = inBounds(logForm.doseG, INPUT_BOUNDS.doseG) && inBounds(logForm.yieldG, INPUT_BOUNDS.yieldG) && inBounds(logForm.timeS, INPUT_BOUNDS.timeS);
  const ready = numbersOk && tasteScalesComplete(scales);

  return (
    <div className="mt-4 p-4 rounded-xl" style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}` }}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Field label="Dose (g)">
          <input type="number" step="0.1" min={INPUT_BOUNDS.doseG[0]} max={INPUT_BOUNDS.doseG[1]}
            style={boundedStyle(logForm.doseG, INPUT_BOUNDS.doseG)} value={logForm.doseG} onChange={(e) => update("doseG", e.target.value === "" ? "" : Number(e.target.value))} />
        </Field>
        <Field label="Yield (g)">
          <input type="number" step="0.1" min={INPUT_BOUNDS.yieldG[0]} max={INPUT_BOUNDS.yieldG[1]}
            style={boundedStyle(logForm.yieldG, INPUT_BOUNDS.yieldG)} value={logForm.yieldG} onChange={(e) => update("yieldG", e.target.value === "" ? "" : Number(e.target.value))} />
        </Field>
        <Field label="Time (s)">
          <input type="number" step="0.1" min={INPUT_BOUNDS.timeS[0]} max={INPUT_BOUNDS.timeS[1]}
            style={boundedStyle(logForm.timeS, INPUT_BOUNDS.timeS)} value={logForm.timeS} onChange={(e) => update("timeS", e.target.value === "" ? "" : Number(e.target.value))} />
        </Field>
        <Field label="Grind Setting">
          <input type="number" step="0.1" style={inputStyle} value={logForm.grindSetting} onChange={(e) => update("grindSetting", e.target.value)} placeholder="e.g. 3.2" />
        </Field>
        {tracksTemp(equipment) && (() => {
          // Temperature adjusts by whole degrees only — showTemp already returns
          // a whole number in either unit, so no separate display formatting is
          // needed here the way the sub-degree fields need.
          const raw = showTemp(logForm.tempC, equipment);
          return (
            <Field label={`Temp (${tempLabel(equipment)}, Optional)`}>
              <input type="number" step="1"
                min={tempUnitOf(equipment) === "F" ? cToF(INPUT_BOUNDS.tempC[0]) : INPUT_BOUNDS.tempC[0]}
                max={tempUnitOf(equipment) === "F" ? cToF(INPUT_BOUNDS.tempC[1]) : INPUT_BOUNDS.tempC[1]}
                style={boundedStyle(raw, tempUnitOf(equipment) === "F" ? [cToF(INPUT_BOUNDS.tempC[0]), cToF(INPUT_BOUNDS.tempC[1])] : INPUT_BOUNDS.tempC)}
                value={raw} onChange={(e) => update("tempC", readTemp(e.target.value, equipment))} placeholder="—" />
            </Field>
          );
        })()}
      </div>
      {!rangeKnown && (
        <p className="text-xs -mt-2 mb-3" style={{ color: COLORS.espressoSoft, fontFamily: "Inter, sans-serif" }}>
          Set your grinder espresso range in Settings to get specific next-setting suggestions.
        </p>
      )}

      <p className="tracking-wide mb-2" style={{ fontSize: "0.8125rem", color: COLORS.espressoSoft, fontFamily: "Inter, sans-serif", fontWeight: 500 }}>How Did It Taste?</p>
      {TASTE_SCALES.map((s) => (
        <ScaleRow key={s.key} scale={s} value={scales[s.key]} onChange={(n) => setScale(s.key, n)} />
      ))}

      <Field label="Notes (Optional)">
        <textarea style={{ ...inputStyle, minHeight: 50 }} value={logForm.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Anything else worth remembering…" />
      </Field>
      <div className="flex gap-2 mt-2">
        <button onClick={onSubmit} disabled={!ready} className="flex-1 py-2 rounded-lg text-sm font-medium" style={{ background: ready ? COLORS.copper : COLORS.line, color: ready ? COLORS.ink : COLORS.disabledText, fontFamily: "Inter, sans-serif" }}>
          {submitLabel}
        </button>
        <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm" style={{ border: `1px solid ${COLORS.line}`, fontFamily: "Inter, sans-serif", color: COLORS.espressoSoft }}>Cancel</button>
      </div>
      {!ready && (
        <p className="text-center mt-2" style={{ fontSize: "0.8125rem", color: COLORS.espressoSoft, fontFamily: "Inter, sans-serif" }}>
          {!numbersOk
            ? `Dose (${INPUT_BOUNDS.doseG[0]}-${INPUT_BOUNDS.doseG[1]}g), yield (${INPUT_BOUNDS.yieldG[0]}-${INPUT_BOUNDS.yieldG[1]}g) and time (${INPUT_BOUNDS.timeS[0]}-${INPUT_BOUNDS.timeS[1]}s) all need a value in range.`
            : `Rate ${unrated} more ${unrated === 1 ? "scale" : "scales"} to save this shot.`}
        </p>
      )}
    </div>
  );
}
