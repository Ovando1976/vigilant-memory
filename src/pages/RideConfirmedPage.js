import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  CircularProgress,
} from '@mui/material';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import logger from '../logger';

/* ------------- Stripe initialisation (CRA uses process.env) ------------- */
const stripePromise = loadStripe(
  process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY
);

function readRide(id) {
  try {
    return JSON.parse(localStorage.getItem('rideRequests') || '{}')[id] || null;
  } catch {
    return null;
  }
}

export default function RideConfirmedPage() {
  const navigate   = useNavigate();
  const location   = useLocation();
  const { rideId } = useParams();

  /* ---------- Retrieve ride from navigation state or localStorage ---------- */
  const [ride, setRide] = useState(() => location.state?.ride || readRide(rideId));
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
    const sync = (e) => {
      if (e.key === 'rideRequests') setRide(readRide(rideId));
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [rideId]);

  if (!ride) {
    return (
      <Box p={4}>
        <Typography variant="h6">No ride data found.</Typography>
        <Button variant="outlined" onClick={() => navigate('/home')}>
          Return Home
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
      alert('Unable to start payment. Please try again.');
    } finally {
      setPaying(false);
    }
  };

  /* ------------------------------- UI ------------------------------------ */
  return (
    <Box p={4}>
      <Paper sx={{ p: 4, mb: 3 }}>
        <Typography variant="h4" fontWeight={600} color="primary" gutterBottom>
          🎉 Ride Confirmed!
        </Typography>
        <Typography variant="subtitle1" gutterBottom>
          Your ride is being dispatched. You’ll be notified once a driver accepts.
        </Typography>

        <Box mt={3}>
          <Typography variant="h6">Trip Summary</Typography>
          <Typography>📍 Pickup: <strong>{ride.pickup}</strong></Typography>
          <Typography>🏁 Drop‑off: <strong>{ride.dropoff}</strong></Typography>
          <Typography>👥 Passengers: {ride.passengerCount || 1}</Typography>
          <Typography>
            💰 Estimated Fare: $
            {ride.fare != null ? ride.fare.toFixed(2) : '—'}
          </Typography>
          <Typography>
            ⏱️ ETA: {ride.durationMin != null ? `${ride.durationMin} min` : '—'}
          </Typography>
        </Box>
      </Paper>

      <Box display="flex" flexWrap="wrap" gap={2}>
        <Button
          variant="contained"
          onClick={() => navigate(`../track/${rideId}`)}
        >
          Track Ride
        </Button>

        <Button variant="outlined" onClick={() => navigate('/home')}>
          Return Home
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
          {paying ? <CircularProgress size={22} /> : 'Pay Now'}
        </Button>
      </Box>
    </Box>
  );
}