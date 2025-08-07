// src/lib/createRideRequest.js
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

import { db } from './firebase';

export async function createRideRequest({
  pickup,
  dropoff,
  pickupCoords,
  dropoffCoords,
  fare,
  durationMin,
  passengerCount = 1,
  ownerId,
}) {
  const newRide = {
    pickup,
    dropoff,
    pickupCoords,
    dropoffCoords,
    fare,
    durationMin,
    passengerCount,
    ownerId: ownerId || null,
    status: 'requested',
    createdAt: serverTimestamp(),
  };


  const docRef = await addDoc(collection(db, 'rideRequests'), newRide);

  return docRef.id;
}