// src/pages/RideReviewPage.js
import React, { useEffect, useState } from 'react';
import { Box, Button, Paper, Typography, Grid, Chip, Alert, Stack } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import RoutePreviewMap from '../components/RoutePreviewMap';
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

export default function RideReviewPage() {
  const { rideId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [ride, setRide] = useState(undefined); // undefined=loading, null=not found
  const [err, setErr] = useState('');
  const [askedForPrice, setAskedForPrice] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!rideId) return;
    setRide(undefined);
    setErr('');
    const ref = doc(db, 'rideRequests', rideId);
    const unsub = onSnapshot(
      ref,
      (snap) => setRide(snap.exists() ? ({ id: snap.id, ...(snap.data() || {}) }) : null),
      (e) => { console.error('ride subscribe failed', e); setErr('Failed to load ride'); setRide(null); }
    );
    return unsub;
  }, [rideId]);

  // ask server to compute price once
  useEffect(() => {
    if (!ride || askedForPrice) return;
    if (!Number.isInteger(ride.amountCents)) {
      setAskedForPrice(true);
      (async () => {
        try {
          const r = await fetch('/api/rides/price', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ rideId }),
          });
          if (!r.ok) {
            const j = await r.json().catch(() => null);
            if (r.status === 404 && j?.error === 'rate_not_found') {
              setErr('No published rate found for this route. Please edit the trip or try another route.');
            } else {
              setErr('Unable to fetch price. Tap “Refresh price” to retry.');
            }
          }
        } catch {
          setErr('Network error while fetching price.');
        }
      })();
    }
  }, [ride, rideId, askedForPrice]);

  // derived (no hooks)
  const isOwner        = !!auth.currentUser && ride && ride.ownerId === auth.currentUser.uid;
  const canOwnerCancel = !!(isOwner && ride && !ride.driverId && ride.status === 'pending');

  const amountCents  = Number.isInteger(ride?.amountCents) ? ride.amountCents : null;
  const fallbackFare = Number.isFinite(Number(ride?.fare)) ? Number(ride.fare) : null;
  const priceLabel   = amountCents != null
    ? `$${(amountCents / 100).toFixed(2)}`
    : (fallbackFare != null ? `$${fallbackFare.toFixed(2)} (est)` : t('pending') || 'pending');

  const etaLabel = Number.isFinite(Number(ride?.durationMin))
    ? `${Number(ride.durationMin)} min`
    : '—';

  let when = null;
  if (ride?.scheduledAt) {
    try {
      const d = ride.scheduledAt?.toDate ? ride.scheduledAt.toDate() : new Date(ride.scheduledAt);
      when = Number.isNaN(d.getTime()) ? null : d;
    } catch {}
  }

  async function startCheckout() {
    try {
      setErr('');
      if (amountCents == null) {
        setErr('Price not ready yet. Please wait a moment.');
        return;
      }
      setConfirming(true);

      // Create Checkout Session (server verifies amount against Firestore)
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          rideId,
          amountCents,
          pickup: ride?.pickup || '',
          dropoff: ride?.dropoff || '',
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.message || `Checkout failed (${res.status})`);
      }

      // Prefer a direct URL (best compatibility with embedded browsers / iOS)
      if (payload?.url) {
        window.location.assign(payload.url);
        return;
      }

      // Fallback to Stripe.js sessionId
      if (payload?.sessionId) {
        const pk = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY;
        if (!pk) throw new Error('Stripe publishable key not configured');
        const { loadStripe } = await import('@stripe/stripe-js');
        const stripe = await loadStripe(pk);
        const { error } = await stripe.redirectToCheckout({ sessionId: payload.sessionId });
        if (error) throw error;
        return;
      }

      throw new Error('No checkout URL or sessionId returned');
    } catch (e) {
      console.error('checkout error', e);
      setErr(e.message || 'Checkout failed');
    } finally {
      setConfirming(false);
    }
  }

  async function cancelRide() {
    try {
      setErr('');
      if (!canOwnerCancel) return;
      await updateDoc(doc(db, 'rideRequests', rideId), {
        status: 'canceled',
        updatedAt: serverTimestamp(),
      });
      navigate('/');
    } catch (e) {
      console.error('cancel error', e);
      setErr('Could not cancel the ride.');
    }
  }

  // render states
  if (ride === undefined) {
    return <Box p={4}><Typography variant="h6">{t('loading') || 'Loading…'}</Typography></Box>;
  }
  if (ride === null) {
    return (
      <Box p={4}>
        <Typography variant="h5" gutterBottom>{t('rideNotFound') || 'Ride not found'}</Typography>
        <Button variant="contained" onClick={() => navigate(-1)}>{t('back') || 'Back'}</Button>
      </Box>
    );
  }

  return (
    <Box p={{ xs: 2, md: 4 }}>
      <Paper sx={{ p: { xs: 3, md: 4 }, maxWidth: 720, mx: 'auto' }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <Typography variant="h4" fontWeight="bold">{t('reviewYourRide') || 'Review Your Ride'}</Typography>
          <Chip size="small" label={ride.status || 'pending'} />
        </Stack>

        {!!err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

        <Grid container spacing={2} mb={2}>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="text.secondary">{t('pickup') || 'Pickup'}</Typography>
            <Typography>{ride.pickup || '—'}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="text.secondary">{t('dropoff') || 'Dropoff'}</Typography>
            <Typography>{ride.dropoff || '—'}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="text.secondary">{t('estimatedFare') || 'Estimated Fare'}</Typography>
            <Typography>{priceLabel}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="text.secondary">{t('eta') || 'ETA'}</Typography>
            <Typography>{etaLabel}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="text.secondary">{t('pickupTime') || 'Pickup time'}</Typography>
            <Typography>{when ? when.toLocaleString() : '—'}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="text.secondary">{t('passengers') || 'Passengers'}</Typography>
            <Typography>{ride.passengerCount ?? '—'}</Typography>
          </Grid>
        </Grid>

        {ride.pickupCoords && ride.dropoffCoords && (
          <Box mb={3} sx={{ height: 280, borderRadius: 2, overflow: 'hidden' }}>
            <RoutePreviewMap pickupCoords={ride.pickupCoords} dropoffCoords={ride.dropoffCoords} />
          </Box>
        )}

        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Button variant="outlined" onClick={() => navigate(-1)}>{t('back') || 'Back'}</Button>
          <Box>
            <Button variant="text" color="error" onClick={cancelRide} disabled={!canOwnerCancel} sx={{ mr: 1 }}>
              {t('cancel') || 'Cancel'}
            </Button>
            {amountCents == null && (
              <Button
                variant="outlined"
                onClick={() => {
                  setErr('');
                  fetch('/api/rides/price', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ rideId, force: true }),
                  }).catch(() => setErr('Could not refresh price'));
                }}
                sx={{ mr: 1 }}
              >
                {t('refreshPrice') || 'Refresh price'}
              </Button>
            )}
            <Button
              variant="contained"
              onClick={startCheckout}
              disabled={amountCents == null || confirming}
            >
              {amountCents == null
                ? (t('waitingForPrice') || 'Waiting for price…')
                : confirming
                ? (t('startingCheckout') || 'Starting checkout…')
                : (t('confirmRide') || 'Confirm & Pay')}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}