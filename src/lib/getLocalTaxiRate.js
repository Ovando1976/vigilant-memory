import { taxiRates as defaultRates } from '../data/taxiRates';

export function getLocalTaxiRateFrom(rates, pickup, dropoff, passengers = 1) {
  const row = rates.find(r => r.from === pickup && r.to === dropoff);
  if (!row) throw new Error('No rate found for this route.');
  const farePerParty = Number(row.fare); // adjust if your data is per person
  const fare = farePerParty; // or farePerParty * passengers if per-person
  const durationMin = row.durationMin ?? 12;
  return { fare, durationMin };
}

// Old signature still works (uses hard-coded list)
export function getLocalTaxiRate(pickup, dropoff, passengers = 1) {
  return getLocalTaxiRateFrom(defaultRates, pickup, dropoff, passengers);
}