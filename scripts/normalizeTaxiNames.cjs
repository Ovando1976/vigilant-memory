// scripts/normalizeTaxiNames.cjs
require("dotenv").config();
const admin = require("firebase-admin");
admin.initializeApp({ credential: admin.credential.applicationDefault() });
const db = admin.firestore();

(async () => {
  const snap = await db.collection("taxiRates").get();
  const batch = db.batch();
  let changed = 0;
  snap.forEach(doc => {
    const d = doc.data();
    if (d.from === "Bolongo Bay") {
      batch.update(doc.ref, { from: "Bolongo" });
      changed++;
    }
    if (d.to === "Bolongo Bay") {
      batch.update(doc.ref, { to: "Bolongo" });
      changed++;
    }
  });
  if (changed) await batch.commit();
  console.log(`✅ Updated ${changed} docs`);
  process.exit(0);
})();