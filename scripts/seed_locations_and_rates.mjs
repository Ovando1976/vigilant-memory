#!/usr/bin/env node
/* Seed USVI locations + pairwise taxiRates in Firestore
   Usage:
     node scripts/seed_locations_and_rates.mjs STT
     node scripts/seed_locations_and_rates.mjs STJ
     node scripts/seed_locations_and_rates.mjs STX

   Flags:
     --apply             write changes (omit for dry-run)
     --update-existing   backfill coords/duration ONLY (no price changes)
*/
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import admin from 'firebase-admin';
import { pathToFileURL } from 'node:url';

/* -------------------------- CLI & constants -------------------------- */
const APPLY = process.argv.includes('--apply');
const UPDATE_EXISTING = process.argv.includes('--update-existing'); // default: append-only
const ISL = (process.argv.find((a) => /^(STT|STJ|STX)$/i.test(a)) || 'STT').toUpperCase();

const ISLAND_LABEL = { STT: 'St. Thomas', STJ: 'St. John', STX: 'St. Croix' };
const LABEL_TO_CODE = {
  'st. thomas': 'STT',
  'st thomas': 'STT',
  'st. john': 'STJ',
  'st john': 'STJ',
  'st. croix': 'STX',
  'st croix': 'STX',
};
const HUB = { STT: 'Charlotte Amalie', STJ: 'Cruz Bay', STX: 'Christiansted' };
const ALT = { STT: "Cyril E. King Airport", STJ: 'Cruz Bay', STX: 'Frederiksted' };

/* ----------------------- Firebase Admin init ------------------------- */
if (!admin.apps.length) {
  const svcJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON; // raw JSON string
  const svcB64 =
    process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 || process.env.FIREBASE_SERVICE_ACCOUNT_B64; // base64 JSON
  const gacPath =
    process.env.GOOGLE_APPLICATION_CREDENTIALS || path.resolve('serviceAccountKey.json');

  let credential = null;
  let projectId = process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || null;

  if (svcJson) {
    const cfg = JSON.parse(svcJson);
    credential = admin.credential.cert(cfg);
    projectId ||= cfg.project_id;
    console.log('[seed] Using FIREBASE_SERVICE_ACCOUNT_JSON');
  } else if (svcB64) {
    const cfg = JSON.parse(Buffer.from(svcB64, 'base64').toString('utf8'));
    credential = admin.credential.cert(cfg);
    projectId ||= cfg.project_id;
    console.log('[seed] Using FIREBASE_SERVICE_ACCOUNT_BASE64');
  } else if (gacPath && fs.existsSync(gacPath)) {
    const cfg = JSON.parse(fs.readFileSync(gacPath, 'utf8'));
    credential = admin.credential.cert(cfg);
    projectId ||= cfg.project_id;
    console.log(`[seed] Using GOOGLE_APPLICATION_CREDENTIALS at ${gacPath}`);
  } else {
    console.error(
      '[seed] No Firebase credentials found. Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_*'
    );
    process.exit(1);
  }
  admin.initializeApp({ credential, projectId });
}
const db = admin.firestore();

/* ----------------------- Load locationCoords ------------------------- */
const LOCS_FILE = fs.existsSync('src/data/locationCoords.js')
  ? 'src/data/locationCoords.js'
  : fs.existsSync('src/data/locationCoords.mjs')
  ? 'src/data/locationCoords.mjs'
  : null;

if (!LOCS_FILE) {
  console.error('Missing src/data/locationCoords.(js|mjs)');
  process.exit(1);
}
const { locationCoords } = await import(pathToFileURL(path.resolve(LOCS_FILE)).href);

/* -------------------------------- Utils ------------------------------ */
const norm = (s = '') =>
  s
    .toString()
    .normalize('NFKD')
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();

function islandOfCoords({ lat, lng }) {
  if (lat < 18.0) return 'STX';
  return lng > -64.84 ? 'STJ' : 'STT';
}

function toIslandCodeLoose(v, fromName) {
  const raw = norm(v || '').toLowerCase();
  if (LABEL_TO_CODE[raw]) return LABEL_TO_CODE[raw];
  if (/^(stt|stj|stx)$/i.test(v || '')) return v.toUpperCase();

  const n = norm(fromName || '');
  if (byIsland.STT.has(n)) return 'STT';
  if (byIsland.STJ.has(n)) return 'STJ';
  if (byIsland.STX.has(n)) return 'STX';
  return null;
}

function haversineKm(a, b) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLng / 2);
  const aa = s1 * s1 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * s2 * s2;
  return 2 * R * Math.asin(Math.sqrt(aa));
}
function estMinutes(from, to) {
  const km = haversineKm(from, to);
  return Math.max(10, Math.round((km / 28) * 60)); // ~28 km/h avg
}

/* --------------- Build per-island name -> coords maps ---------------- */
const byIsland = { STT: new Map(), STJ: new Map(), STX: new Map() };
for (const [name, coords] of Object.entries(locationCoords)) {
  const code = islandOfCoords(coords);
  byIsland[code].set(norm(name), coords);
}

/* --------------- Snapshot existing taxiRates (once) ------------------ */
const rateSnap = await db.collection('taxiRates').limit(10000).get();
const existing = new Map(); // key: CODE|from->to
for (const d of rateSnap.docs) {
  const r = d.data() || {};
  const from = norm(r.from);
  const to = norm(r.to);
  const code = toIslandCodeLoose(r.island, r.from) || 'UNK';
  const key = `${code}|${from}->${to}`;
  existing.set(key, { id: d.id, ...r });
}

/* -------------------- Build anchor maps (per island) ------------------ */
function anchorMaps(islCode) {
  const maps = {
    baseToHub: new Map(),
    extraToHub: new Map(),
    baseToAlt: new Map(),
    extraToAlt: new Map(),
  };
  for (const [k, r] of existing.entries()) {
    const [code, pair] = k.split('|');
    if (code !== islCode) continue;
    const [from, to] = pair.split('->');
    const base = Number(r.baseFare ?? r.fare ?? r.rateOne ?? 0);
    const per = Number(r.perExtra ?? r.rateTwoPlus ?? 0);

    if (to === norm(HUB[islCode])) {
      maps.baseToHub.set(from, base);
      maps.extraToHub.set(from, per);
    }
    if (to === norm(ALT[islCode])) {
      maps.baseToAlt.set(from, base);
      maps.extraToAlt.set(from, per);
    }
    if (from === norm(HUB[islCode])) {
      maps.baseToHub.set(to, base);
      maps.extraToHub.set(to, per);
    }
    if (from === norm(ALT[islCode])) {
      maps.baseToAlt.set(to, base);
      maps.extraToAlt.set(to, per);
    }
  }
  return maps;
}
const anchors = anchorMaps(ISL);

/* ----------------------- Batched writes (safe) ------------------------ */
const BATCH_LIMIT = 450;
let batch = db.batch();
let pending = 0;
let wrote = 0,
  updated = 0,
  locWrote = 0;

async function flush() {
  if (!pending) return;
  await batch.commit();
  batch = db.batch();
  pending = 0;
}

/* ------------------ Append-only upsert (await flush) ------------------ */
async function upsertTaxiRate({
  from,
  to,
  islandCode,
  rateOne,
  rateTwoPlus,
  fromCoords,
  toCoords,
  durationMin,
  estimated,
}) {
  const key = `${islandCode}|${norm(from)}->${norm(to)}`;
  const stamp = admin.firestore.FieldValue.serverTimestamp();

  if (existing.has(key)) {
    if (!UPDATE_EXISTING) return; // append-only: do NOT touch prices/docs

    // Only backfill metadata; never change prices
    const { id } = existing.get(key);
    const ref = db.collection('taxiRates').doc(id);
    const data = {
      coordinates: fromCoords, // legacy field
      fromCoords,
      toCoords,
      durationMin,
      updatedAt: stamp,
      estimated: !!estimated,
    };
    batch.update(ref, data);
    pending++;
    updated++;
    if (pending >= BATCH_LIMIT) await flush();
    return;
  }

  // Create a brand-new doc
  const ref = db.collection('taxiRates').doc();
  batch.set(ref, {
    from,
    to,
    island: islandCode, // store code (STT/STJ/STX)
    rateOne,
    rateTwoPlus,
    included: 1,
    durationMin,
    coordinates: fromCoords,
    fromCoords,
    toCoords,
    updatedAt: stamp,
    estimated: !!estimated,
  });
  pending++;
  wrote++;
  if (pending >= BATCH_LIMIT) await flush();
}

/* --------------- Compose synthetic price when missing ----------------- */
function synthesizePrice(islCode, A, B) {
  const a = norm(A),
    b = norm(B);
  const baseA = anchors.baseToHub.get(a);
  const baseB = anchors.baseToHub.get(b);
  const perA = anchors.extraToHub.get(a);
  const perB = anchors.extraToHub.get(b);

  let base = Math.max(baseA ?? 0, baseB ?? 0);
  let per = Math.max(perA ?? 0, perB ?? 0);

  if (!base || !per) {
    const altA = anchors.baseToAlt.get(a);
    const altB = anchors.baseToAlt.get(b);
    const altpA = anchors.extraToAlt.get(a);
    const altpB = anchors.extraToAlt.get(b);
    base = Math.max(base || 0, altA ?? 0, altB ?? 0);
    per = Math.max(per || 0, altpA ?? 0, altpB ?? 0);
  }

  if (!base) base = { STT: 10, STJ: 8, STX: 12 }[islCode];
  if (!per) per = Math.max(4, Math.round(base * 0.66)); // ~⅔ rule

  return { base, per, estimated: true };
}

/* ---------------- Seed one island (locations + rates) ----------------- */
async function runIsland(islCode) {
  const islMap = byIsland[islCode];
  const islLabel = ISLAND_LABEL[islCode];
  const names = Array.from(islMap.keys()).sort();

  console.log(
    `[${islCode}] locations: ${names.length} • apply=${APPLY} • update-existing=${UPDATE_EXISTING}`
  );

  // Locations (append-only)
  for (const name of names) {
    const coords = islMap.get(name);
    const q = await db
      .collection('locations')
      .where('name', '==', name)
      .where('island', '==', islLabel) // historical 'locations' uses label
      .limit(1)
      .get();

    if (q.empty) {
      if (APPLY) {
        const ref = db.collection('locations').doc();
        batch.set(ref, {
          name,
          island: islLabel,
          coordinates: coords,
          lat: coords.lat,
          lng: coords.lng,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        pending++;
        locWrote++;
        if (pending >= BATCH_LIMIT) await flush();
      } else {
        locWrote++;
      }
    }
  }

  // Pairwise taxiRates within the island (both directions)
  for (let i = 0; i < names.length; i++) {
    for (let j = 0; j < names.length; j++) {
      if (i === j) continue;
      const from = names[i],
        to = names[j];
      const fromC = islMap.get(from),
        toC = islMap.get(to);
      const durationMin = estMinutes(fromC, toC);

      const key = `${islCode}|${norm(from)}->${norm(to)}`;
      if (existing.has(key)) {
        await upsertTaxiRate({
          from,
          to,
          islandCode: islCode,
          rateOne:
            Number(existing.get(key).rateOne ?? existing.get(key).baseFare ?? 0) || 0,
          rateTwoPlus:
            Number(existing.get(key).rateTwoPlus ?? existing.get(key).perExtra ?? 0) || 0,
          fromCoords: fromC,
          toCoords: toC,
          durationMin,
          estimated: !!existing.get(key).estimated,
        });
        continue;
      }

      const synth = synthesizePrice(islCode, from, to);
      await upsertTaxiRate({
        from,
        to,
        islandCode: islCode,
        rateOne: synth.base,
        rateTwoPlus: synth.per,
        fromCoords: fromC,
        toCoords: toC,
        durationMin,
        estimated: synth.estimated,
      });
    }
  }

  if (APPLY) await flush();
  console.log(
    `[${islCode}] write summary → locations new:${locWrote}, rates new:${wrote}, rates updated:${updated} ${
      APPLY ? '(applied)' : '(dry-run)'
    }`
  );
}

/* --------------------------------- Run -------------------------------- */
await runIsland(ISL);
if (APPLY) await flush();
console.log('Done.');