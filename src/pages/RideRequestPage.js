// src/pages/RideRequestPage.js
import React, { useMemo, useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";

import "../styles/usvi-ui.css"; // ensure this is imported somewhere once

import { auth } from "../lib/firebase";
import { locationCoords } from "../data/locationCoords";
import { allLocations } from "../data/taxiRates";
import { getLocalTaxiRate } from "../lib/getLocalTaxiRate";
import { createRideRequest } from "../lib/createRideRequest";
import useTaxiRatesFromFirestore from "../hooks/useTaxiRatesFromFirestore";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

// Prefer Firestore; fallback to local — UI estimate ONLY (do NOT send to Firestore)
function computeFare({ rates, pickup, dropoff, pax }) {
  try {
    if (rates && Array.isArray(rates) && rates.length > 0) {
      const r = rates.find(
        (x) => x.from === pickup && x.to === dropoff && Number(x.minPassengers || 1) <= pax
      );
      if (r) {
        const base = Number(r.baseFare || r.fare || 0);
        const perExtra = Number(r.perExtra || 0);
        const included = Number(r.included || 1);
        const extras = Math.max(0, pax - included);
        const fare = base + extras * perExtra;
        const durationMin = Number(r.durationMin || 15);
        return { fare, durationMin };
      }
    }
    return getLocalTaxiRate(pickup, dropoff, pax);
  } catch {
    return null;
  }
}

export default function RideRequestPage() {
  const q = useQuery();
  const navigate = useNavigate();
  const { rates } = useTaxiRatesFromFirestore();

  // Prefills
  const qPickup = q.get("pickup") || "";
  const qDropoff = q.get("dropoff") || "";
  const qIsland = (q.get("island") || "").toUpperCase(); // "STT" | "STJ" | "STX" | ""

  // Form state
  const [pickup, setPickup] = useState(allLocations.includes(qPickup) ? qPickup : "");
  const [dropoff, setDropoff] = useState(allLocations.includes(qDropoff) ? qDropoff : "");
  const [passengers, setPassengers] = useState(1);
  const [promo, setPromo] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [pickupTime, setPickupTime] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });

  // If only dropoff provided, pick a sensible default pickup by island
  useEffect(() => {
    if (!pickup && dropoff) {
      if (qIsland === "STT") setPickup("Cyril E. King Airport");
      else if (qIsland === "STJ") setPickup("Cruz Bay Ferry");
      else if (qIsland === "STX") setPickup("Christiansted");
      else setPickup("Charlotte Amalie");
    }
  }, [pickup, dropoff, qIsland]);

  const pax = Math.max(1, parseInt(String(passengers || 1), 10));

  const fareInfo = useMemo(() => {
    if (!pickup || !dropoff || pickup === dropoff) return null;
    return computeFare({ rates, pickup, dropoff, pax });
  }, [rates, pickup, dropoff, pax]);

  // Do NOT require fare to book; server/Firestore is the source of truth.
  const canBook =
    pickup &&
    dropoff &&
    pickup !== dropoff &&
    locationCoords[pickup] &&
    locationCoords[dropoff] &&
    !busy;

  async function handleBook() {
    try {
      setErr("");
      if (!canBook) {
        setErr("Please complete the form before booking.");
        return;
      }
      setBusy(true);
      const rideId = await createRideRequest({
        pickup,
        dropoff,
        pickupCoords: locationCoords[pickup],
        dropoffCoords: locationCoords[dropoff],
        passengerCount: pax,
        // Pass a Date; helper should convert to Firestore Timestamp
        scheduledAt: new Date(pickupTime),
        promo: promo || undefined,
        ownerId: auth.currentUser ? auth.currentUser.uid : null,
        island: qIsland || undefined,
        // IMPORTANT: Do NOT send any price fields here
      });
      navigate(`/ridesharing/review/${rideId}`);
    } catch (e) {
      console.error("createRideRequest failed", e);
      setErr("Could not create ride. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="usvi-container" style={{ padding: "24px 0" }}>
      <header className="usvi-row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
        <h1 className="h4" style={{ fontSize: "1.8rem" }}>Request a Ride</h1>
        <Link to="/shortcuts" className="chip chip-outline clickable">Back to Shortcuts</Link>
      </header>

      <section className="usvi-section">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleBook();
          }}
          className="usvi-grid"
          style={{ rowGap: 12 }}
        >
          {/* Pickup */}
          <div className="usvi-row" style={{ gap: 8 }}>
            <label htmlFor="pickup" style={{ width: 120, fontWeight: 700 }}>Pickup</label>
            <select
              id="pickup"
              className="usvi-input"
              value={pickup}
              onChange={(e) => setPickup(e.target.value)}
            >
              <option value="">Select pickup…</option>
              {allLocations.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          {/* Dropoff */}
          <div className="usvi-row" style={{ gap: 8 }}>
            <label htmlFor="dropoff" style={{ width: 120, fontWeight: 700 }}>Dropoff</label>
            <select
              id="dropoff"
              className="usvi-input"
              value={dropoff}
              onChange={(e) => setDropoff(e.target.value)}
            >
              <option value="">Select dropoff…</option>
              {allLocations.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          {/* Pax */}
          <div className="usvi-row" style={{ gap: 8 }}>
            <label htmlFor="pax" style={{ width: 120, fontWeight: 700 }}>Passengers</label>
            <input
              id="pax"
              className="usvi-input"
              type="number"
              min={1}
              max={10}
              value={passengers}
              onChange={(e) => setPassengers(parseInt(e.target.value || "1", 10))}
              style={{ width: 120 }}
            />
          </div>

          {/* Time */}
          <div className="usvi-row" style={{ gap: 8 }}>
            <label htmlFor="pickupTime" style={{ width: 120, fontWeight: 700 }}>Pickup time</label>
            <input
              id="pickupTime"
              className="usvi-input"
              type="datetime-local"
              value={pickupTime}
              onChange={(e) => setPickupTime(e.target.value)}
              style={{ width: 280 }}
            />
          </div>

          {/* Promo */}
          <div className="usvi-row" style={{ gap: 8 }}>
            <label htmlFor="promo" style={{ width: 120, fontWeight: 700 }}>Promo</label>
            <input
              id="promo"
              className="usvi-input"
              type="text"
              placeholder="Optional code"
              value={promo}
              onChange={(e) => setPromo(e.target.value)}
              style={{ width: 240 }}
            />
          </div>

          {/* Fare preview & Book */}
          <div className="usvi-row" style={{ justifyContent: "space-between", marginTop: 8 }}>
            <div className="usvi-row" style={{ gap: 10 }}>
              <span className="chip">{qIsland || "USVI"}</span>
              {fareInfo ? (
                <>
                  <span className="chip chip-outline">~{fareInfo.durationMin} min</span>
                  <strong style={{ fontSize: 18 }}>${fareInfo.fare.toFixed(2)} <span style={{fontWeight:400, fontSize:14}}>(est)</span></strong>
                </>
              ) : (
                <span className="chip chip-outline">Fare pending…</span>
              )}
            </div>

            <button
              type="submit"
              disabled={!canBook}
              className={`btn ${canBook ? "btn-primary" : "btn-disabled"}`}
              style={{ minWidth: 180 }}
            >
              {busy ? "Booking…" : fareInfo ? `Book (est) • $${fareInfo.fare.toFixed(2)}` : "Book"}
            </button>
          </div>

          {err && (
            <div className="mt-2" style={{ color: "#c1121f", fontWeight: 600 }}>{err}</div>
          )}
        </form>
      </section>
    </main>
  );
}