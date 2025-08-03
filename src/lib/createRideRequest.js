// src/lib/createRideRequest.js
export function createRideRequest({
  pickup,
  dropoff,
  pickupCoords,
  dropoffCoords,
  fare,
  durationMin,
}) {
  // ► simple unique id
  const rideId =
    Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  const newRide = {
    rideId,
    pickup,
    dropoff,
    pickupCoords,
    dropoffCoords,
    fare,
    durationMin,
    status: 'requested',
    createdAt: Date.now(),
  };

  // store in localStorage (as an object keyed by rideId)
  const storeKey = 'rideRequests';
  const existing = JSON.parse(localStorage.getItem(storeKey) || '{}');
  existing[rideId] = newRide;
  localStorage.setItem(storeKey, JSON.stringify(existing));

  return rideId;
}