// src/hooks/useTaxiRatesFromFirestore.js
import { useEffect, useState, useCallback } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

const CACHE_KEY = 'taxiRatesCache';
const MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes

export default function useTaxiRatesFromFirestore() {
  const [rates, setRates] = useState([]);       // ✅ safe default
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  const fetchOnce = useCallback(async () => {
    const snap = await getDocs(collection(db, 'taxiRates'));
    const items = [];
    snap.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
    return items;
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // try cache first
        const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
        if (cached && Array.isArray(cached.rates) && (Date.now() - cached.ts) < MAX_AGE_MS) {
          if (!cancelled) {
            setRates(cached.rates);
            setLoading(false);
          }
        }

        // always refresh in background
        const fresh = await fetchOnce();
        if (!cancelled) {
          setRates(fresh);
          setLoading(false);
          sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), rates: fresh }));
        }
      } catch (e) {
        if (!cancelled) {
          setError(e);
          setLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [fetchOnce]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const fresh = await fetchOnce();
      setRates(fresh);
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), rates: fresh }));
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [fetchOnce]);

  return { rates, loading, error, refresh };
}