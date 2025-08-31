import React, { useEffect, useState } from 'react';
import { collection, getDocs, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function TestFirebasePage() {
  const [state, setState] = useState({ loading: true, error: null, docs: [] });

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(limit(collection(db, 'taxiRates'), 5));
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setState({ loading: false, error: null, docs });
        console.log('✅ taxiRates sample:', docs);
      } catch (e) {
        console.error('❌ Firestore read failed:', e);
        setState({ loading: false, error: e.message || String(e), docs: [] });
      }
    })();
  }, []);

  if (state.loading) return <div style={{padding:16}}>Loading…</div>;
  if (state.error) return <div style={{padding:16, color:'crimson'}}>Error: {state.error}</div>;
  return (
    <div style={{padding:16}}>
      <h3>Firestore OK ✅</h3>
      <pre>{JSON.stringify(state.docs, null, 2)}</pre>
    </div>
  );
}