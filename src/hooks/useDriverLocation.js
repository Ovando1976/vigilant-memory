// src/pages/TrackRidePage.js
import React from 'react';
import { useParams } from 'react-router-dom';
import useTrackRide from '../hooks/useTrackRide';
import useDriverLocation from '../hooks/useDriverLocation'; // you'll create this too
import TrackMap from '../components/TrackMap';
import { Box, Typography, Paper, CircularProgress } from '@mui/material';

export default function TrackRidePage() {
  const { rideId } = useParams();
  const ride = useTrackRide(rideId);
  const driver = useDriverLocation(ride?.driverId);

  if (!ride) return <CircularProgress />;

  return (
    <Box sx={{ p: 2 }}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Ride to {ride.dropoff}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Status: {ride.status} | ETA: {ride.etaMin} min
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Fare: ${ride.fare.toFixed(2)}
        </Typography>
      </Paper>

      <Box sx={{ height: '400px', borderRadius: 2, overflow: 'hidden' }}>
        <TrackMap
          pickupCoords={ride.pickupCoords}
          dropoffCoords={ride.dropoffCoords}
          driverCoords={driver?.location}
        />
      </Box>
    </Box>
  );
}