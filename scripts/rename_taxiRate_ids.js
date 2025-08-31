#!/usr/bin/env node
/**
 * Rename taxiRates doc IDs to deterministic route ids:
 *   <ISLANDCODE>-<from-slug>__<to-slug>[-pmin<minPassengers>]
 *
 * Dry-run by default. Use:
 *   --apply            write changes
 *   --delete-legacy    delete the old docs after copy
 *   --only-estimated   process only docs with {estimated: true}
 *
 * Examples:
 *   node scripts/rename_taxiRate_ids.js
 *   node scripts/rename_taxiRate_ids.js --apply
 *   node scripts/rename_taxiRate_ids.js --apply --delete-legacy
 *   node scripts/rename_taxiRate_ids.js --apply --only-estimated
 */

require('dotenv').config();
const admin = require('firebase-admin');

/* --------------------------- CLI flags --------------------------- */
const APPLY          = process.argv.includes('--apply');
const DELETE_LEGACY  = process.argv.includes('--delete-legacy');
const ONLY_ESTIMATED = process.argv.includes('--only-estimated');

const LABEL_TO_CODE = {
  'st. thomas': 'STT', 'st thomas': 'STT', STT: 'STT',
  'st. john':   'STJ', 'st john':   'STJ', STJ: 'STJ',
  'st. croix':  'STX', 'st croix':  'STX', STX: 'STX',
};

function toCode(island) {
  if (!island) return null;
  const raw = String(island).trim();
  const key = raw.toLowerCase();
  return LABEL_TO_CODE[key] || LABEL_TO_CODE[raw] || null;
}

function slug(s = '') {
  return String(s)
    .normalize('NFKD')
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[\u0300-\u036f]/g, '')     // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')         // non-alnum -> hyphen
    .replace(/^-+|-+$/g, '')             // trim edges
    .replace(/-{2,}/g, '-');             // collapse
}

function makeRouteId({ island, from, to, minPassengers }) {
  const code = toCode(island);
  if (!code) throw new Error(`Unrecognized island "${island}"`);
  const base = `${code}-${slug(from)}__${slug(to)}`;
  return Number.isFinite(+minPassengers) && +minPassengers > 1
    ? `${base}-pmin${+minPassengers}`
    : base;
}

/* ------------------------ Firebase Admin ------------------------- */
if (!admin.apps.length) {
  let credential = null;
  const svcJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const svcB64  = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 || process.env.FIREBASE_SERVICE_ACCOUNT_B64;
  const gac     = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (svcJson) {
    credential = admin.credential.cert(JSON.parse(svcJson));
    console.log('[rename] Using FIREBASE_SERVICE_ACCOUNT_JSON');
  } else if (svcB64) {
    credential = admin.credential.cert(JSON.parse(Buffer.from(svcB64, 'base64').toString('utf8')));
    console.log('[rename] Using FIREBASE_SERVICE_ACCOUNT_BASE64');
  } else if (gac) {
    credential = admin.credential.applicationDefault();
    console.log(`[rename] Using GOOGLE_APPLICATION_CREDENTIALS at ${gac}`);
  } else {
    console.error('[rename] No credentials. Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_*');
    process.exit(1);
  }

  admin.initializeApp({
    credential,
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT,
  });
}
const db = admin.firestore();

/* ------------------------------ Main ----------------------------- */
(async function main() {
  const snap = await db.collection('taxiRates').limit(50000).get();
  let toCreate = 0, toUpdate = 0, toDelete = 0, skipped = 0;

  for (const doc of snap.docs) {
    const data = doc.data() || {};
    const { island, from, to, minPassengers } = data;

    if (ONLY_ESTIMATED && !data.estimated) { skipped++; continue; }
    if (!from || !to || !island) { skipped++; continue; }

    try {
      const routeId = makeRouteId({ island, from, to, minPassengers });
      if (doc.id === routeId) { skipped++; continue; }

      const newRef = db.collection('taxiRates').doc(routeId);
      const exists = await newRef.get();

      const payload = {
        ...data,
        routeId,
        legacyId: doc.id,
        renamedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (!exists.exists) {
        if (APPLY) {
          await newRef.set(payload, { merge: false });
          toCreate++;
          await doc.ref.update({
            supersededBy: routeId,
            deprecated: true,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          toUpdate++;
          if (DELETE_LEGACY) {
            await doc.ref.delete();
            toDelete++;
          }
        } else {
          toCreate++; toUpdate++;
        }
        continue;
      }

      // Target exists — if it represents the same route, just deprecate old
      const existing = exists.data() || {};
      const sameRoute =
        String(existing.from || '') === String(from || '') &&
        String(existing.to   || '') === String(to   || '') &&
        toCode(existing.island) === toCode(island);

      if (sameRoute) {
        if (APPLY) {
          await doc.ref.update({
            supersededBy: routeId,
            deprecated: true,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          toUpdate++;
          if (DELETE_LEGACY) { await doc.ref.delete(); toDelete++; }
        } else {
          toUpdate++;
        }
      } else {
        // Collision with different content — create an alternate id
        const altId = `${routeId}-alt${Math.random().toString(36).slice(2,7)}`;
        console.warn(`[rename] ID collision for ${routeId}; writing as ${altId}`);
        if (APPLY) {
          await db.collection('taxiRates').doc(altId).set(payload, { merge: false });
          toCreate++;
          await doc.ref.update({
            supersededBy: altId,
            deprecated: true,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          toUpdate++;
          if (DELETE_LEGACY) { await doc.ref.delete(); toDelete++; }
        } else {
          toCreate++; toUpdate++;
        }
      }
    } catch (e) {
      console.warn(`[rename] skipped ${doc.id}: ${e.message}`);
      skipped++;
    }
  }

  console.log(`[rename] apply=${APPLY} only-estimated=${ONLY_ESTIMATED} delete-legacy=${DELETE_LEGACY}`);
  console.log(`[rename] created:${toCreate} updated:${toUpdate} deleted:${toDelete} skipped:${skipped}`);
})().catch((err) => {
  console.error('[rename] fatal:', err);
  process.exit(1);
});