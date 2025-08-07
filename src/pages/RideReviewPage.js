// src/pages/RideReviewPage.js
import React, { useEffect, useState } from 'react';
import { Box, Button, Paper, Typography, Grid } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MyMapView from '../components/RoutePreviewMap';
import { subscribeToRide, updateRide } from '../lib/rideService';

export default function RideReviewPage() {
  const { rideId } = useParams();
  const navigate   = useNavigate();
  const { t } = useTranslation();

  const [ride, setRide] = useState(null);

  useEffect(() => {
    const unsubscribe = subscribeToRide(rideId, setRide);
    return unsubscribe;
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
  const handleConfirm = async () => {
    await updateRide(rideId, { status: 'confirmed' });
    navigate(
      `/ridesharing/confirmed/${rideId}`,
      { state: { ride: { ...ride, status: 'confirmed', id: rideId } }, replace: true }
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