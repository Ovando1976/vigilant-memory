// src/lib/createRideRequest.js
import {
  collection,
  addDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { signInAnonymously } from 'firebase/auth';

// Optional: tiny offline shadow for resilience (no PII)
function saveLocalShadow(id, snapshot) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const store = JSON.parse(localStorage.getItem('rideRequests') || '{}');
    store[id] = snapshot;
    localStorage.setItem('rideRequests', JSON.stringify(store));
  } catch {
    /* ignore */
  }
}

function toTimestamp(v) {
  if (!v) throw new Error('scheduledAt_required');
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) throw new Error('invalid_scheduledAt');
    return Timestamp.fromDate(v);
  }
  if (typeof v === 'string') {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) throw new Error('invalid_scheduledAt');
    return Timestamp.fromDate(d);
  }
  if (typeof v === 'object' && v && 'seconds' in v) return v; // Firestore Timestamp
  throw new Error('invalid_scheduledAt');
}

function toCoords(c, which) {
  if (!c || typeof c !== 'object') throw new Error(`${which}_coords_required`);
  const lat = Number(c.lat);
  const lng = Number(c.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error(`invalid_${which}_coords`);
  }
  return { lat, lng };
}

const clean = (s) => String(s ?? '').trim();
const normIsland = (v) => {
  const s = clean(v).toUpperCase();
  return s === 'STT' || s === 'STJ' || s === 'STX' ? s : (s || null);
};

export async function createRideRequest(data) {
  const {
    pickup,
    dropoff,
    pickupCoords,
    dropoffCoords,
    passengerCount,
    scheduledAt,   // Date | string | Firestore Timestamp
    promo,
    island,        // "STT" | "STJ" | "STX" (optional)
    ownerId,       // optional; will be ignored if we have auth
  } = data || {};

  // Ensure we have an authenticated user (anonymous is fine)
  if (!auth.currentUser) {
    try { await signInAnonymously(auth); } catch { /* ignore */ }
  }
  const uid = auth.currentUser?.uid || ownerId || null;
  if (!uid) throw new Error('auth_required');

  const docData = {
    ownerId: uid,
    status: 'pending',
    driverId: null,

    pickup: clean(pickup),
    dropoff: clean(dropoff),

    pickupCoords: toCoords(pickupCoords, 'pickup'),
    dropoffCoords: toCoords(dropoffCoords, 'dropoff'),

    passengerCount: Number.isFinite(+passengerCount)
      ? Math.max(1, Math.floor(+passengerCount))
      : 1,

    scheduledAt: toTimestamp(scheduledAt),

    // DO NOT include any price fields here (fare/amountCents/etc.)
    // Server (/api/rides/price) is the source of truth and will set amountCents & duration.

    promo: promo ? clean(promo) : null,
    island: normIsland(island),

    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (!docData.pickup || !docData.dropoff) {
    throw new Error('pickup_dropoff_required');
  }

  // Create
  const ref = await addDoc(collection(db, 'rideRequests'), docData);

  // Local shadow for smoother UX
  saveLocalShadow(ref.id, {
    id: ref.id,
    ...docData,
    scheduledAt: docData.scheduledAt.toDate().toISOString(),
    createdAt: new Date().toISOString(),
  });

  return ref.id;
}