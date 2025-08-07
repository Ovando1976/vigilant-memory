// src/pages/RideReviewPage.js
import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Paper,
  Typography,
  Grid,
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MyMapView from '../components/RoutePreviewMap';

/* helper -------------------------------------------------------------- */
function readRide(id) {
  try {
    return JSON.parse(localStorage.getItem('rideRequests') || '{}')[id] ?? null;
  } catch {
    return null; // corrupt JSON
  }
}

export default function RideReviewPage() {
  const { rideId } = useParams();
  const navigate   = useNavigate();
  const { t } = useTranslation();

  /* keep the ride in state so we can react to live storage updates */
  const [ride, setRide] = useState(() => readRide(rideId));

  /* listen for changes from other tabs or the driver dashboard */
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'rideRequests') setRide(readRide(rideId));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [rideId]);

  /* early exit if the ride vanished (bad id, cleared storage, …) */
  if (!ride) {
    return (
      <Box p={4}>
        <Typography variant="h5" gutterBottom>
          {t('rideNotFound')}
        </Typography>
        <Button variant="contained" onClick={() => navigate(-1)}>
          {t('back')}
        </Button>
      </Box>
    );
  }

  /* ─── ride data ─────────────────────────────────────────────────── */
  const {
    pickup        = '—',
    dropoff       = '—',
    pickupCoords,
    dropoffCoords,
    fare          = 0,
    durationMin   = '—',
  } = ride;

  /* confirm handler: mark status + jump to tracking page */
  const handleConfirm = () => {
  /* 1 – mark as confirmed in storage */
  const storeRaw = localStorage.getItem('rideRequests') || '{}';
  const store    = JSON.parse(storeRaw);
  if (store[rideId]) {
    store[rideId] = { ...store[rideId], status: 'confirmed' };
    localStorage.setItem('rideRequests', JSON.stringify(store));
  }

  /* 2 – navigate to the confirmation page, passing the ride object */
  navigate(
    `/ridesharing/confirmed/${rideId}`,
    { state: { ride: { ...store[rideId], id: rideId } }, replace: true }
  );
};

  /* ─── render ────────────────────────────────────────────────────── */
  return (
    <Box p={{ xs: 2, md: 4 }}>
      <Paper sx={{ p: { xs: 3, md: 4 }, maxWidth: 720, mx: 'auto' }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          {t('reviewYourRide')}
        </Typography>

        <Grid container spacing={2} mb={2}>
          <Grid item xs={6}>
            <Typography variant="subtitle2" color="text.secondary">
              {t('pickup')}
            </Typography>
            <Typography>{pickup}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="subtitle2" color="text.secondary">
              {t('dropoff')}
            </Typography>
            <Typography>{dropoff}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="subtitle2" color="text.secondary">
              {t('estimatedFare')}
            </Typography>
            <Typography>${fare.toFixed(2)}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="subtitle2" color="text.secondary">
              {t('eta')}
            </Typography>
            <Typography>{durationMin} min</Typography>
          </Grid>
        </Grid>

        {pickupCoords && dropoffCoords && (
          <Box mb={3} sx={{ height: 280, borderRadius: 2, overflow: 'hidden' }}>
            <MyMapView
              pickupCoords={pickupCoords}
              dropoffCoords={dropoffCoords}
            />
          </Box>
        )}

        <Box textAlign="right">
          <Button variant="outlined" sx={{ mr: 2 }} onClick={() => navigate(-1)}>
            {t('cancel')}
          </Button>
          <Button variant="contained" onClick={handleConfirm}>
            {t('confirmRide')}
          </Button>
      </Box>
      </Paper>
    </Box>
  );
}