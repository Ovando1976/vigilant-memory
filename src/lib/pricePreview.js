// src/lib/pricePreview.js
export async function pricePreview({ pickup, dropoff, pax, island }) {
  const r = await fetch('/api/rides/price/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      pickup, dropoff, passengerCount: pax, island
    }),
  });
  if (!r.ok) throw new Error('preview_failed');
  return r.json(); // { amountCents, durationMin, rateId }
}