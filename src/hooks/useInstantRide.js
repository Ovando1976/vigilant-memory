// src/hooks/useInstantRide.js
import { useNavigate } from "react-router-dom";
import { resolveRoute } from "../lib/resolveRoute";

/**
 * Helper: geolocate the user (promise).
 */
function getCurrentPosition(opts = {}) {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator))
      return reject(new Error("geolocation_unavailable"));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 15000, ...opts }
    );
  });
}

/**
 * Formats query params safely.
 */
function toQs(params) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v == null) return;
    q.set(k, String(v));
  });
  return `?${q.toString()}`;
}

/**
 * Exposes 2 entry points:
 *  - rideFromHereTo({lat,lng,label}, { island })
 *  - rideTo({lat,lng,label}, { island, pickup })   // pickup can be {lat,lng,label} if you already have it
 */
export function useInstantRide() {
  const navigate = useNavigate();

  /**
   * Generic: build URL to RideRequest with pins + labels.
   */
  function goToRideRequest({ pickup, dropoff, island }) {
    const qs = toQs({
      island: island || "",
      // pickup pin (custom)
      pickupLat: pickup?.lat,
      pickupLng: pickup?.lng,
      pickupLabel: pickup?.label || "Current location",
      // dropoff pin (custom)
      destLat: dropoff?.lat,
      destLng: dropoff?.lng,
      destLabel: dropoff?.label || "Destination",
      // (if you want the page to try GPS again, set autoPickup=1, but we pass explicit coords)
      autoPickup: 0,
    });
    navigate(`/ridesharing${qs}`);
  }

  /**
   * rideTo: if you already know both ends (or at least the destination),
   * try to resolve them to canonical rate locations;
   * if resolver fails, still navigate with pins (server will compute price later).
   */
  async function rideTo(dest, { island, pickup } = {}) {
    try {
      const dropoff = {
        lat: Number(dest.lat),
        lng: Number(dest.lng),
        label: dest.label || "Destination",
      };

      // If pickup coords weren’t supplied, try GPS
      let from = pickup;
      if (!from?.lat || !from?.lng) {
        try {
          const here = await getCurrentPosition();
          from = { ...here, label: "Current location" };
        } catch {
          // if denied GPS, still allow user to choose on the form
          goToRideRequest({ pickup: null, dropoff, island });
          return;
        }
      }

      // Ask server to resolve both pins to canonical locations (best match)
      // This improves pricing and labeling immediately.
      let resolved = null;
      try {
        resolved = await resolveRoute({
          pickup: from.label,
          dropoff: dropoff.label,
          pickupCoords: { lat: from.lat, lng: from.lng },
          dropoffCoords: { lat: dropoff.lat, lng: dropoff.lng },
          island,
        });
      } catch {
        // keep going with bare pins if resolve fails
      }

      const pickupPayload = resolved?.from
        ? {
            lat: resolved.from.lat,
            lng: resolved.from.lng,
            label: resolved.from.name,
          }
        : from;

      const dropoffPayload = resolved?.to
        ? {
            lat: resolved.to.lat,
            lng: resolved.to.lng,
            label: resolved.to.name,
          }
        : dropoff;

      const islandCode =
        resolved?.island || (island ? String(island).toUpperCase().trim() : "");

      goToRideRequest({
        pickup: pickupPayload,
        dropoff: dropoffPayload,
        island: islandCode,
      });
    } catch {
      // final fallback: push form with just the dest pin; user can choose pickup
      goToRideRequest({
        pickup: null,
        dropoff: {
          lat: Number(dest.lat),
          lng: Number(dest.lng),
          label: dest.label || "Destination",
        },
        island,
      });
    }
  }

  /**
   * Shorthand: ride from GPS to a destination
   */
  async function rideFromHereTo(dest, { island } = {}) {
    return rideTo(dest, { island });
  }

  return { rideTo, rideFromHereTo };
}

export default useInstantRide;
