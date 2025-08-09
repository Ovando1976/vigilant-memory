// src/hooks/useTrackRide.js
import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function useTrackRide(rideId) {
  const [ride, setRide] = useState(null);

  useEffect(() => {
    if (!rideId) return;
    const unsub = onSnapshot(doc(db, 'rides', rideId), (doc) => {
      if (doc.exists()) setRide(doc.data());
    });
    return () => unsub();
  }, [rideId]);

  return ride;
}