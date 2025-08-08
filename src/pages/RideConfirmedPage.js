import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Button, CircularProgress } from '@mui/material';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { useTranslation } from 'react-i18next';
import logger from '../logger';

import useSnackbar from '../hooks/useSnackbar';

import { subscribeToRide } from '../lib/rideService';


/* ------------- Stripe initialisation (CRA uses process.env) ------------- */
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

export default function RideConfirmedPage() {
  const navigate   = useNavigate();
  const location   = useLocation();
  const { rideId } = useParams();
  const showSnackbar = useSnackbar();

  const { showSnackbar, SnackbarComponent } = useSnackbar();

  const { t } = useTranslation();


  const [ride, setRide] = useState(() => location.state?.ride || null);
  const [paying, setPaying] = useState(false);


  /* --------------------------- Cancel ride handler --------------------------- */
  const handleCancelRide = () => {
    try {
      const store = JSON.parse(localStorage.getItem('rideRequests') || '{}');
      if (store[rideId]) {
        store[rideId] = { ...store[rideId], status: 'cancelled' };
        localStorage.setItem('rideRequests', JSON.stringify(store));
      }
    } catch (err) {
      logger.warn('Failed to cancel ride', err);
    }
    navigate('/home');
  };

  /* keep state in sync if another tab updates localStorage */

  useEffect(() => {
    const unsubscribe = subscribeToRide(rideId, setRide);
    return unsubscribe;
  }, [rideId]);

  if (!ride) {
    return (
      <Box p={4}>
        <Typography variant="h6">{t('noRideData')}</Typography>
        <Button variant="outlined" onClick={() => navigate('/home')}>
          {t('returnHome')}
        </Button>
      </Box>
    );
  }

  /* ----------------------- Stripe Checkout handler ----------------------- */
  const handlePayNow = async () => {
    try {
      setPaying(true);

      // 1. Create Checkout Session via your backend
      const resp = await fetch('/api/create-checkout-session', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({
          rideId,
          amountCents : Math.round((ride.fare || 0) * 100),
          pickup      : ride.pickup,
          dropoff     : ride.dropoff,
        }),
      });

      if (!resp.ok) throw new Error(`Server responded ${resp.status}`);
      const { sessionId } = await resp.json();

      // 2. Redirect to Stripe
      const stripe = await stripePromise;
      if (!stripe) throw new Error('Stripe failed to load');
      const { error } = await stripe.redirectToCheckout({ sessionId });
      if (error) throw error;
    } catch (err) {
      logger.error('Stripe Checkout error', err);

      showSnackbar('Unable to start payment. Please try again.', 'error', 6000);


      showSnackbar('Unable to start payment. Please try again.', 'error');

      alert(t('unableToStartPayment'));

    } finally {
      setPaying(false);
    }
  };

  /* ------------------------------- UI ------------------------------------ */
  return (
    <>
      <SnackbarComponent />
      <Box p={4}>
      <Paper sx={{ p: 4, mb: 3 }}>
        <Typography variant="h4" fontWeight={600} color="primary" gutterBottom>
          {t('rideConfirmed')}
        </Typography>
        <Typography variant="subtitle1" gutterBottom>
          {t('rideDispatched')}
        </Typography>

        <Box mt={3}>
          <Typography variant="h6">{t('tripSummary')}</Typography>
          <Typography>
            📍 {t('pickup')}: <strong>{ride.pickup}</strong>
          </Typography>
          <Typography>
            🏁 {t('dropoff')}: <strong>{ride.dropoff}</strong>
          </Typography>
          <Typography>
            👥 {t('passengers')}: {ride.passengerCount || 1}
          </Typography>
          <Typography>
            💰 {t('estimatedFare')}: ${
              ride.fare != null ? ride.fare.toFixed(2) : '—'
            }
          </Typography>
          <Typography>
            ⏱️ {t('eta')}: {ride.durationMin != null ? `${ride.durationMin} ${t('minutesShort')}` : '—'}
          </Typography>
        </Box>
      </Paper>

      <Box display="flex" flexWrap="wrap" gap={2}>
        <Button
          variant="contained"
          onClick={() => navigate(`../track/${rideId}`)}
        >
          {t('trackRide')}
        </Button>

        <Button variant="outlined" onClick={() => navigate('/home')}>
          {t('returnHome')}
        </Button>

        <Button
          variant="outlined"
          color="error"
          onClick={handleCancelRide}
        >
          Cancel Ride
        </Button>

        <Button
          variant="contained"
          color="secondary"
          disabled={paying}
          onClick={handlePayNow}
        >
          {paying ? <CircularProgress size={22} /> : t('payNow')}
        </Button>
      </Box>
      </Box>
    </>
  );
}