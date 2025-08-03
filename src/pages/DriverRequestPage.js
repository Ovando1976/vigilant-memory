import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { FaCar } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { RoutePreviewMap } from "../components/RoutePreviewMap";
import { locationCoords } from "../data/locationCoords";
import { getTaxiRouteSummaryFromFirestore } from "../lib/getTaxiRouteSummaryFromFirestore";
import { auth } from "../components/services/firebase";

const Ridesharing = () => {
  const { t } = useTranslation();
  const { search } = useLocation();
  const query = new URLSearchParams(search);
  const pickupLocation = query.get("pickup") ?? "";
  const dropoffLocation = query.get("dropoff") ?? "";
  const passengerCount = parseInt(query.get("passengers") ?? "1", 10);

  const [user, setUser] = useState(null);
  const [fare, setFare] = useState(null);
  const [duration, setDuration] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => auth.onAuthStateChanged(setUser), []);

  const pickupCoords = locationCoords[pickupLocation];
  const dropoffCoords = locationCoords[dropoffLocation];

  useEffect(() => {
    if (!pickupLocation || !dropoffLocation) {
      setFare(null);
      setDuration(null);
      setLoading(false);
      return;
    }

    getTaxiRouteSummaryFromFirestore(
      pickupLocation,
      dropoffLocation,
      passengerCount
    ).then((summary) => {
      if (summary) {
        setFare(summary.fare);
        setDuration(summary.durationMin);
      } else {
        setFare(null);
        setDuration(null);
      }
      setLoading(false);
    });
  }, [pickupLocation, dropoffLocation, passengerCount]);

  return (
    <>
      <Helmet>
        <title>{t("Track Ride")} | USVI Explorer</title>
      </Helmet>

      <main className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white px-4 py-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FaCar /> {t("Track Ride")}
        </h1>

        {user && <p className="text-sm text-gray-600 mb-2">📧 {user.email}</p>}

        {pickupLocation && dropoffLocation ? (
          <>
            <p className="text-lg mb-2">
              📍 <strong>{pickupLocation}</strong> →{" "}
              <strong>{dropoffLocation}</strong>
            </p>
            <p className="mb-1">
              ⏱️ ETA: {duration !== null ? `${duration} min` : "Calculating..."}
            </p>
            <p className="mb-4">
              💰 Estimated Fare: {fare !== null ? `$${fare.toFixed(2)}` : "–"}
            </p>

            {pickupCoords && dropoffCoords ? (
              <div className="h-[300px] w-full rounded shadow overflow-hidden">
                <RoutePreviewMap
                  pickupCoords={pickupCoords}
                  dropoffCoords={dropoffCoords}
                  height={300}
                />
              </div>
            ) : (
              <p className="text-red-600 font-medium mt-4">
                Unable to display route map.
              </p>
            )}
          </>
        ) : (
          <p className="text-gray-500 italic mt-4">
            Please select a pickup and drop-off location to begin.
          </p>
        )}

        {loading && (
          <p className="text-sm text-gray-400 mt-4">Loading route details...</p>
        )}
      </main>
    </>
  );
};

export default Ridesharing;