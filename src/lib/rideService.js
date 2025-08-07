import { collection, doc, getDoc, onSnapshot, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';

const ridesCol = collection(db, 'rides');

/**
 * Fetch a single ride document once. Returns `null` if not found.
 */
export async function fetchRide(rideId) {
  const snap = await getDoc(doc(ridesCol, rideId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/**
 * Subscribe to real-time updates for a ride.
 * @param {string} rideId
 * @param {(ride: object|null) => void} callback
 * @returns {() => void} unsubscribe function
 */
export function subscribeToRide(rideId, callback) {
  return onSnapshot(doc(ridesCol, rideId), (snap) => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
}

/**
 * Update fields on a ride document.
 */
export async function updateRide(rideId, data) {
  await updateDoc(doc(ridesCol, rideId), data);
}

/**
 * Fetch rides matching one or more statuses.
 * @param {string|string[]} statuses
 */
export async function fetchRidesByStatus(statuses) {
  const arr = Array.isArray(statuses) ? statuses : [statuses];
  const q = query(
    ridesCol,
    where('status', arr.length > 1 ? 'in' : '==', arr.length > 1 ? arr : arr[0])
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Subscribe to rides by status.
 * @param {string|string[]} statuses
 * @param {(rides: object[]) => void} callback
 * @returns {() => void}
 */
export function subscribeToRidesByStatus(statuses, callback) {
  const arr = Array.isArray(statuses) ? statuses : [statuses];
  const q = query(
    ridesCol,
    where('status', arr.length > 1 ? 'in' : '==', arr.length > 1 ? arr : arr[0])
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

