// scripts/seedDemoEvents.cjs
require("dotenv").config();
const admin = require("firebase-admin");
admin.initializeApp({ credential: admin.credential.applicationDefault() });
const db = admin.firestore();

const addDays = (n) => { const d = new Date(); d.setDate(d.getDate()+n); return d; };

(async () => {
  const col = db.collection("events");

  const events = [
    {
      title: "Beach BBQ Night",
      island: "STT",
      location: "Magens Bay",
      description: "Local food + live band by the water.",
      startDate: addDays(2),
    },
    {
      title: "Sunset Sail",
      island: "STJ",
      location: "Cruz Bay",
      description: "Evening sail with drinks + steel pan music.",
      startDate: addDays(5),
    },
    {
      title: "Farmers Market",
      island: "STX",
      location: "Frederiksted",
      description: "Fresh produce & crafts from local vendors.",
      startDate: addDays(1),
    },
  ];

  for (const ev of events) {
    await col.doc(`${ev.island.toLowerCase()}-${ev.title.replace(/\s+/g,'-').toLowerCase()}`)
      .set({
        ...ev,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        startDate: admin.firestore.Timestamp.fromDate(ev.startDate),
      });
  }
  console.log("✅ Seeded demo events");
  process.exit(0);
})();