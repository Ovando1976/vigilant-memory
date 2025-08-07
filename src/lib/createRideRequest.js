// src/lib/createRideRequest.js
import { addDoc, collection } from 'firebase/firestore';
import { db } from './firebase';

export async function createRideRequest({
  pickup,
  dropoff,
  pickupCoords,
  dropoffCoords,
  fare,
  durationMin,
}) {
  const newRide = {
    pickup,
    dropoff,
    pickupCoords,
    dropoffCoords,
    fare,
    durationMin,
    status: 'requested',
    createdAt: Date.now(),
  };

  const docRef = await addDoc(collection(db, 'rideRequests'), newRide);
  return docRef.id;
}