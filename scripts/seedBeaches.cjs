// scripts/seedBeaches.cjs
require("dotenv").config();
const admin = require("firebase-admin");

admin.initializeApp({ credential: admin.credential.applicationDefault() });
const db = admin.firestore();

const DRY_RUN = !!process.env.DRY_RUN;

const beaches = [
  // STT
  { name: "Magens Bay", island: "STT", desc: "Sheltered bay with calm waters.", featured: true },
  { name: "Coki Point", island: "STT", desc: "Snorkeling hotspot with vibrant reef.", featured: true },
  { name: "Sapphire Beach", island: "STT", desc: "Clear water and reef just offshore.", featured: true },
  { name: "Lindquist Beach", island: "STT", desc: "Tranquil white-sand park beach.", featured: true },
  { name: "Hull Bay", island: "STT", desc: "Local vibe, surf when north swells hit.", featured: false },
  { name: "Secret Harbor", island: "STT", desc: "Resort beach with great snorkeling.", featured: false },

  // STJ
  { name: "Trunk Bay", island: "STJ", desc: "Iconic overlook + underwater trail.", featured: true },
  { name: "Maho Bay", island: "STJ", desc: "Turtle spotting in seagrass meadows.", featured: true },
  { name: "Cinnamon Bay", island: "STJ", desc: "Long sandy stretch, gentle surf.", featured: true },
  { name: "Hawksnest Bay", island: "STJ", desc: "Quick access, shaded picnic areas.", featured: false },
  { name: "Salt Pond Bay", island: "STJ", desc: "Hike-in cove, scenic and quiet.", featured: false },

  // STX
  { name: "Shoys Beach", island: "STX", desc: "Crescent beach near Buccaneer.", featured: true },
  { name: "Sandy Point", island: "STX", desc: "Wildlife refuge; limited access.", featured: true },
  { name: "Rainbow Beach", island: "STX", desc: "Sunsets & watersports in Frederiksted.", featured: true },
  { name: "Cane Bay", island: "STX", desc: "Shore diving on the famous wall.", featured: true },
  { name: "Isaac Bay", island: "STX", desc: "Remote hike-in beach, sea turtles.", featured: false },
  { name: "Jack Bay", island: "STX", desc: "Secluded and unspoiled cove.", featured: false },
];

const slug = (s="") => s.toString().normalize("NFKD")
  .replace(/[\u0300-\u036f]/g,"").toLowerCase()
  .replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");

(async () => {
  const col = db.collection("beaches");
  const BATCH = 400;
  let pending = 0, batch = db.batch(), wrote = 0;

  for (const b of beaches) {
    const s = slug(b.name);
    const id = s; // deterministic
    const doc = {
      name: b.name,
      island: b.island,                 // STT | STJ | STX
      slug: s,
      imageUrl: `/images/${s}.jpg`,     // put real imgs there; fallback handled by UI
      description: b.desc,
      featured: !!b.featured,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (DRY_RUN) {
      console.log(`[DRY] set beaches/${id}`, doc);
    } else {
      batch.set(col.doc(id), doc, { merge: true });
      pending++;
      if (pending >= BATCH) {
        await batch.commit(); wrote += pending; pending = 0; batch = db.batch();
        console.log(`Committed ${wrote} beaches…`);
      }
    }
  }
  if (!DRY_RUN && pending) { await batch.commit(); wrote += pending; }
  console.log(`✅ Beaches seeding complete. ${DRY_RUN ? "(dry run)" : `Wrote ${wrote} docs`}`);
  process.exit(0);
})().catch(e => { console.error("❌ Beaches seed failed:", e); process.exit(1); });