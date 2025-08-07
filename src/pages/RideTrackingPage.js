import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { FaCar } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import MyMapView from '../components/RoutePreviewMap';
import { subscribeToRide } from '../lib/rideService';

export default function RideTrackingPage() {
  const { t } = useTranslation();
  const { rideId } = useParams();              // ← /ridesharing/track/:rideId
  const [ride, setRide] = useState(null);

  useEffect(() => {
    const unsubscribe = subscribeToRide(rideId, setRide);
    return unsubscribe;
  }, [rideId]);

  /* if nothing was found show a friendly message */
  if (!ride) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white">
        <p className="text-xl font-medium">{t('Ride not found')} 😢</p>
      </main>
    );
  }

  const { status = 'requested' } = ride;

  if (status === 'cancelled') {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white">
        <p className="text-xl font-medium">{t('Ride cancelled')} 😢</p>
      </main>
    );
  }

  const {
    pickup,
    dropoff,
    pickupCoords,
    dropoffCoords,
    fare,
    durationMin,
  } = ride;

  return (
    <>
      <Helmet>
        <title>{t('Track Ride')} | USVI Explorer</title>
      </Helmet>

      <main className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white px-4 py-6">
        <h1 className="text-3xl font-bold flex items-center gap-2 mb-2">
          <FaCar /> {t('Track Ride')}
        </h1>

        <p className="text-lg mb-2">
          📍 <strong>{pickup}</strong> → <strong>{dropoff}</strong>
        </p>

        <p className="mb-1">
          ⏱️ ETA:{' '}
          {typeof durationMin === 'number' ? `${durationMin} min` : t('Unknown')}
        </p>
        <p className="mb-1">
          💰 {t('Estimated Fare')}:&nbsp;
          {typeof fare === 'number' ? `$${fare.toFixed(2)}` : '–'}
        </p>
        <p className="mb-4">🚦 {t('Status')}: {status}</p>

        {pickupCoords && dropoffCoords ? (
          <div className="h-[300px] w-full rounded shadow overflow-hidden">
            <MyMapView
              pickupCoords={pickupCoords}
              dropoffCoords={dropoffCoords}
              height={300}
            />
          </div>
        ) : (
          <p className="text-red-600 font-medium mt-4">
            {t('Unable to display route map.')}
          </p>
        )}
      </main>
    </>
  );
}