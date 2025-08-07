import {
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "./firebase";
import { locationCoords } from "../data/coords";
import logger from "../logger";

export async function getTaxiRouteSummaryFromFirestore(from, to, passengers = 1) {
  if (!from || !to || !passengers) {
    logger.warn("❗ Invalid input to fare lookup:", { from, to, passengers });
    return null;
  }

  try {
    const q = query(
      collection(db, "taxiRates"),
      where("from", "==", from),
      where("to", "==", to)
    );

    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const doc = snapshot.docs[0].data();
      const fare =
        passengers === 1
          ? doc.onePerson
          : doc.onePerson + doc.twoPlus * (passengers - 1);

      logger.info("✅ Firestore fare match:", { from, to, fare, doc });

      return {
        fare,
        durationMin: doc.durationMin ?? 15,
        source: "firestore",
      };
    } else {
      logger.info("ℹ️ No Firestore fare found for route:", from, "→", to);
    }
  } catch (err) {
    logger.warn("❌ Firestore fare lookup failed:", err);
  }

  // 🔁 Fallback: Calculate Haversine-based estimate
  const pickup = locationCoords[from];
  const dropoff = locationCoords[to];
  if (!pickup || !dropoff) {
    logger.error("❗ Missing coordinates for fallback:", { from, to });
    return null;
  }

  const R = 6371; // Radius of Earth in km
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(dropoff.lat - pickup.lat);
  const dLng = toRad(dropoff.lng - pickup.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(pickup.lat)) *
      Math.cos(toRad(dropoff.lat)) *
      Math.sin(dLng / 2) ** 2;
  const distance = R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));

  const fallbackFare = 5 + distance * 3;
  const fallbackDuration = (distance / 25) * 60;

  logger.info("🧭 Fallback fare:", {
    from,
    to,
    distance: distance.toFixed(2),
    fare: fallbackFare.toFixed(2),
  });

  return {
    fare: Math.round(fallbackFare * 100) / 100,
    durationMin: Math.round(fallbackDuration),
    source: "fallback",
  };
}