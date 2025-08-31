// scripts/fixTaxiIsland.cjs
require("dotenv").config();
const admin = require("firebase-admin");

admin.initializeApp({ credential: admin.credential.applicationDefault() });
const db = admin.firestore();

(async () => {
  const snap = await db.collection("taxiRates").get();
  const batch = db.batch();
  snap.forEach(doc => {
    const d = doc.data();
    if (d.island === "St. Thomas") batch.update(doc.ref, { island: "STT" });
    if (d.island === "St. John")   batch.update(doc.ref, { island: "STJ" });
    if (d.island === "St. Croix")  batch.update(doc.ref, { island: "STX" });
  });
  await batch.commit();
  console.log("✅ Normalized island codes");
})();