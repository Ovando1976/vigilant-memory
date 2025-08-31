/* normalizeTaxiAliases.cjs — see comments for usage */
require("dotenv").config();
const admin = require("firebase-admin");

admin.initializeApp({ credential: admin.credential.applicationDefault() });
const db = admin.firestore();

const DRY_RUN = !!process.env.DRY_RUN;

// ---- helpers (match server.js) ----
const LABEL_TO_CODE = {
  "st. thomas": "STT", "st thomas": "STT", STT: "STT",
  "st. john":   "STJ", "st john":   "STJ", STJ: "STJ",
  "st. croix":  "STX", "st croix":  "STX", STX: "STX",
};
const norm = (s="") => s.toString().normalize("NFKD")
  .replace(/[’‘]/g,"'").replace(/[“”]/g,'"')
  .replace(/\s+/g," ").trim().toLowerCase();
const slug = (s="") => s.toString().normalize("NFKD")
  .replace(/[\u0300-\u036f]/g,"").toLowerCase()
  .replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
const makeRouteId = (code, fromName, toName) => `${code}-${slug(fromName)}__${slug(toName)}`;

// Canonicalize common UI ↔ data mismatches (keys are normalized via `norm()`).
const ALIAS = new Map([
  // ---- Havensight / Yacht Haven variations ----
  ["havensight",                "Yacht Haven - Havensight"],
  ["havensight (crossroad)",    "Yacht Haven - Havensight"],
  ["havensight cruise port",    "Yacht Haven - Havensight"],
  ["yacht haven",               "Yacht Haven - Havensight"],
  ["yacht haven grande",        "Yacht Haven - Havensight"],

  // ---- Airport variations ----
  ["airport",                   "Cyril E. King Airport"],
  ["cek airport",               "Cyril E. King Airport"],
  ["cyril e king",              "Cyril E. King Airport"],
  ["cyril e. king",             "Cyril E. King Airport"],

  // ---- Downtown CA ----
  ["charlotte amalie downtown", "Charlotte Amalie"],

  // ---- Ferries / docks ----
  ["red hook ferry",            "Red Hook"],
  ["cruz bay ferry",            "Cruz Bay"],
  // If you want West Indian Dock to count as Town:
  ["west indian dock",          "Charlotte Amalie"],

  // ---- Bolongo normalization (Firestore had “Bolongo Bay”; UI uses “Bolongo”) ----
  ["bolongo bay",               "Bolongo"],

  // ---- Common spelling/shortcuts ----
  ["magens",                    "Magens Bay"],
  ["magen's",                   "Magens Bay"],
  ["secret harbour",            "Secret Harbor"],

  // (Add more as you encounter them — left side is any user/DB variant, right side is the dropdown canonical)
]);

function toIslandCode(v){
  if(!v) return null;
  const k = String(v).trim();
  return LABEL_TO_CODE[k.toLowerCase()] || LABEL_TO_CODE[k] || null;
}

async function buildCanonicalLocationMap(){
  const m = new Map();
  try{
    const snap = await db.collection("locations").limit(5000).get();
    snap.forEach(d => {
      const name = d.data()?.name;
      if (name) m.set(norm(name), String(name));
    });
  }catch{}
  return m;
}

function inferCodeFromNames(from, to){
  const f = (from||"").toLowerCase(), t = (to||"").toLowerCase();
  const stj = ["cruz bay","coral bay","trunk bay","maho bay","bethany","chocolate hole"];
  const stx = ["christiansted","frederiksted","sunny isle","gallows bay","la reine"];
  if (stj.some(s => f.includes(s) || t.includes(s))) return "STJ";
  if (stx.some(s => f.includes(s) || t.includes(s))) return "STX";
  return "STT";
}

(async () => {
  const canon = await buildCanonicalLocationMap();
  const col = db.collection("taxiRates");
  const snap = await col.get();
  if (snap.empty){ console.log("No taxiRates docs."); return process.exit(0); }

  let toCopy = [], toUpdate = [], unchanged = 0;

  snap.forEach(doc => {
    const id = doc.id, d = doc.data() || {};
    const from0 = String(d.from||""); const to0 = String(d.to||""); const island0 = d.island;

    // alias → locations canonical
    let from1 = ALIAS.get(norm(from0)) || from0;
    let to1   = ALIAS.get(norm(to0))   || to0;
    const locF = canon.get(norm(from1)); if (locF) from1 = locF;
    const locT = canon.get(norm(to1));   if (locT) to1   = locT;

    const code = toIslandCode(island0) || inferCodeFromNames(from1, to1) || "STT";
    const targetId = makeRouteId(code, from1, to1);

    const needRename = targetId !== id;
    const needFields = (from1!==from0) || (to1!==to0) || (code!==island0);

    if (!needRename && !needFields){ unchanged++; return; }

    const next = { ...d, from: from1, to: to1, island: code, routeId: targetId };
    if (next.included == null) next.included = 1;

    if (needRename) toCopy.push({ oldId:id, newId:targetId, next });
    else toUpdate.push({ id, next });
  });

  console.log(`taxiRates: ${snap.size} docs → rename ${toCopy.length}, update ${toUpdate.length}, unchanged ${unchanged}`);
  if (DRY_RUN){ console.log("DRY_RUN=1 — no writes."); return process.exit(0); }

  const B = 400;

  for (let i=0;i<toCopy.length;i+=B){
    const chunk = toCopy.slice(i,i+B);
    const batch = db.batch();
    chunk.forEach(({newId,next}) => batch.set(col.doc(newId), next, {merge:false}));
    await batch.commit();
    console.log(`Created ${Math.min(i+B,toCopy.length)}/${toCopy.length}`);
  }

  for (let i=0;i<toCopy.length;i+=B){
    const chunk = toCopy.slice(i,i+B);
    const batch = db.batch();
    chunk.forEach(({oldId}) => batch.delete(col.doc(oldId)));
    await batch.commit();
    console.log(`Deleted ${Math.min(i+B,toCopy.length)}/${toCopy.length} old`);
  }

  for (let i=0;i<toUpdate.length;i+=B){
    const chunk = toUpdate.slice(i,i+B);
    const batch = db.batch();
    chunk.forEach(({id,next}) => batch.set(col.doc(id), next, {merge:true}));
    await batch.commit();
    console.log(`Updated ${Math.min(i+B,toUpdate.length)}/${toUpdate.length}`);
  }

  console.log("✅ Normalization complete.");
  process.exit(0);
})().catch(e => { console.error("❌ Migration failed:", e); process.exit(1); });
