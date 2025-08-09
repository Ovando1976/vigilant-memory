// src/hooks/useDrivers.js
import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function useDrivers() {
  const [drivers, setDrivers] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'drivers'), (snapshot) => {
      const data = [];
      snapshot.forEach((doc) => {
        const location = doc.data().location;
        if (location?.lat && location?.lng) {
          data.push({ id: doc.id, ...location });
        }
      });
      setDrivers(data);
    });

    return () => unsub();
  }, []);

  return drivers;
}