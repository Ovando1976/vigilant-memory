// src/pages/HomePage.js
import React, { useState } from 'react';
import {
  Box,
  Button,
  Container,
  Typography,
  TextField,
  MenuItem,
  Grid,
  Paper,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { taxiRates, allLocations } from '../data/taxiRates';
import { getLocalTaxiRate } from '../lib/getLocalTaxiRate';
import { createRideRequest } from '../lib/createRideRequest';
import { auth } from '../lib/firebase';
import HomeMap from '../components/HomeMap';
import { locationCoords } from '../data/locationCoords';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import logger from '../logger';

export default function HomePage() {
  const navigate = useNavigate();

  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [fareInfo, setFareInfo] = useState(null);
  const [bookingBusy, setBookingBusy] = useState(false);

  const handleEstimate = () => {
    if (!pickup || !dropoff || pickup === dropoff) {
      alert('Please select valid locations.');
      return;
    }
    try {
      const summary = getLocalTaxiRate(pickup, dropoff, 1);
      setFareInfo(summary);
    } catch (err) {
      alert(err.message);
      setFareInfo(null);
    }
  };

  const handleBookRide = async () => {
    if (!fareInfo) {
      alert('Please estimate your fare first.');
      return;
    }
    setBookingBusy(true);
    try {
      const rideId = await createRideRequest({
        pickup,
        dropoff,
        pickupCoords: locationCoords[pickup],
        dropoffCoords: locationCoords[dropoff],
        fare: fareInfo.fare,
        durationMin: fareInfo.durationMin,
        passengerCount: 1,
        ownerId: auth.currentUser ? auth.currentUser.uid : undefined,
      });
      navigate(`/ridesharing/review/${rideId}`);
    } catch (err) {
      logger.error('🔥 handleBookRide error:', err);
      alert('Could not create ride. Please try again.');
    } finally {
      setBookingBusy(false);
    }
  };

  return (
    <Box>
      <Box
        sx={{
          backgroundColor: '#e6f4fa',
          py: { xs: 6, md: 10 },
          textAlign: 'center',
          color: '#113f67',
        }}
      >
        <Typography variant="h2" fontWeight={900} color="#144272">
          USVI EXPLORER
        </Typography>
        <Typography variant="h6" sx={{ mt: 2 }}>
          Book trusted rides across the U.S. Virgin Islands in seconds.
        </Typography>
        <Button
          variant="contained"
          size="large"
          sx={{
            mt: 4,
            px: 4,
            py: 1.5,
            fontWeight: 800,
            fontSize: '1.2rem',
            backgroundColor: '#ffe569',
            color: '#113f67',
            '&:hover': {
              backgroundColor: '#ffdf2b',
            },
          }}
          onClick={() => navigate('/ridesharing/request')}
        >
          START BOOKING
        </Button>
      </Box>

      <Container maxWidth="md" sx={{ mt: -10 }}>
        <Paper
          elevation={3}
          sx={{
            borderRadius: 3,
            p: 4,
            boxShadow: 4,
            backgroundColor: '#f4fbfe',
            border: '2px solid #bbe1fa',
          }}
        >
          <Typography variant="h5" fontWeight="bold" color="#144272" gutterBottom>
            EXPLORE THE ISLAND
          </Typography>
          <Typography variant="body2" color="#555" mb={2}>
            Select locations and preview your route.
          </Typography>
          <Box
            sx={{
              height: { xs: 280, md: 400 },
              borderRadius: 2,
              overflow: 'hidden',
              border: '2px solid #64aef2',
            }}
          >
            <HomeMap 
              pickupCoords={locationCoords[pickup]}
              dropoffCoords={locationCoords[dropoff]}
            />
          </Box>
        </Paper>
      </Container>

      <Container maxWidth="md" sx={{ mt: 6 }}>
        <Paper
          elevation={3}
          sx={{
            p: 4,
            borderRadius: 3,
            backgroundColor: '#f4fbfe',
            border: '2px solid #bbe1fa',
          }}
        >
          <Typography variant="h5" fontWeight="bold" color="#144272" gutterBottom>
            ESTIMATE YOUR FARE
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                select
                label="Pickup"
                fullWidth
                value={pickup}
                onChange={(e) => setPickup(e.target.value)}
              >
                {allLocations.map((loc) => (
                  <MenuItem key={loc} value={loc}>
                    {loc}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                select
                label="Dropoff"
                fullWidth
                value={dropoff}
                onChange={(e) => setDropoff(e.target.value)}
              >
                {allLocations.map((loc) => (
                  <MenuItem key={loc} value={loc}>
                    {loc}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} md={4}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={handleEstimate}
                    disabled={!pickup || !dropoff || pickup === dropoff}
                    sx={{ height: '100%' }}
                  >
                    Get Fare
                  </Button>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <Button
                    variant="contained"
                    fullWidth
                    disabled={!fareInfo || bookingBusy}
                    onClick={handleBookRide}
                    sx={{
                      height: '100%',
                      backgroundColor: '#ffe569',
                      color: '#113f67',
                      fontWeight: 'bold',
                      '&:hover': {
                        backgroundColor: '#ffdf2b',
                      },
                    }}
                  >
                    {bookingBusy ? 'Booking…' : 'Book a Ride'}
                  </Button>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={() => navigate('/driver/profile')}
                    sx={{
                      height: '100%',
                      borderColor: '#0077b6',
                      color: '#0077b6',
                      fontWeight: 'bold',
                      '&:hover': {
                        backgroundColor: '#d2f0ff',
                      },
                    }}
                  >
                    I'm a Driver
                  </Button>
                </Grid>
              </Grid>
            </Grid>
          </Grid>

          {fareInfo && (
            <Box mt={3}>
              <Typography>
                💰 Estimated Fare: <strong>${fareInfo.fare.toFixed(2)}</strong>
              </Typography>
              <Typography>
                ⏱️ ETA: <strong>{fareInfo.durationMin} min</strong>
              </Typography>
            </Box>
          )}
        </Paper>

        <Box mt={10} mb={6}>
          <Typography
            variant="h4"
            fontWeight="bold"
            align="center"
            gutterBottom
            color="#144272"
          >
            WHY RIDE WITH US?
          </Typography>
          <Grid container spacing={4} mt={2}>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3, textAlign: 'center', borderRadius: 2, backgroundColor: '#e3f6fc' }}>
                <VerifiedUserIcon fontSize="large" color="primary" />
                <Typography variant="h6" fontWeight="bold" mt={1} color="#144272">
                  TRUSTED DRIVERS
                </Typography>
                <Typography variant="body2" color="#444">
                  Licensed, vetted.
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3, textAlign: 'center', borderRadius: 2, backgroundColor: '#e3f6fc' }}>
                <DirectionsCarIcon fontSize="large" color="primary" />
                <Typography variant="h6" fontWeight="bold" mt={1} color="#144272">
                  RELIABLE RIDES
                </Typography>
                <Typography variant="body2" color="#444">
                  Clean, comfortable.
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3, textAlign: 'center', borderRadius: 2, backgroundColor: '#e3f6fc' }}>
                <SupportAgentIcon fontSize="large" color="primary" />
                <Typography variant="h6" fontWeight="bold" mt={1} color="#144272">
                  24/7 SUPPORT
                </Typography>
                <Typography variant="body2" color="#444">
                  Help at any time.
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Box>

        <Box mt={10} py={4} textAlign="center" bgcolor="#e6f4fa">
          <Typography variant="body2" color="text.secondary">
            © {new Date().getFullYear()} VIBER. All rights reserved.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Terms · Privacy · Contact
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}