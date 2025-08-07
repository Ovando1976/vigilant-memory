import { taxiRates } from "../data/taxiRates";

export function getLocalTaxiRate(from, to, passengers = 1) {
  if (typeof from !== "string" || !from.trim()) {
    throw new Error("Invalid pickup location");
  }
  if (typeof to !== "string" || !to.trim()) {
    throw new Error("Invalid dropoff location");
  }
  if (!Number.isInteger(passengers) || passengers < 1) {
    throw new Error("Passengers must be an integer greater than or equal to 1");
  }

  const route = taxiRates.find((r) => r.from === from && r.to === to);
  if (!route) {
    throw new Error(`No taxi rate found for route from ${from} to ${to}`);
  }

  const fare =
    passengers === 1
      ? route.onePerson
      : route.onePerson + route.twoPlus * (passengers - 1);

  return {
    fare,
    durationMin: route.durationMin,
  };
}