import { taxiRates } from '../data/taxiRates';

export function getLocalTaxiRate(from, to, passengers = 1) {
  const route = taxiRates.find((r) => r.from === from && r.to === to);
  if (!route) return null;

  const fare =
    passengers === 1
      ? route.onePerson
      : route.onePerson + route.twoPlus * (passengers - 1);

  return {
    fare,
    durationMin: route.durationMin,
  };
}
