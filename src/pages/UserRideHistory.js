// src/pages/UserRideHistory.js

import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Button,
  CircularProgress,
} from '@mui/material';
import { getAuth } from 'firebase/auth';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import jsPDF from 'jspdf';

export default function UserRideHistory() {
  const [user, setUser] = useState(null);
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = getAuth().onAuthStateChanged((authUser) => {
      setUser(authUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'rideRequests'),
      where('createdBy', '==', user.uid),
    );

    getDocs(q).then((snapshot) => {
      const results = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setRides(results);
      setLoading(false);
    });
  }, [user]);

  const handleDownload = (ride) => {
    const pdf = new jsPDF();
    pdf.setFontSize(18);
    pdf.text('Ride Receipt', 20, 20);

    const rideDate = ride.createdAt?.seconds
      ? new Date(ride.createdAt.seconds * 1000).toLocaleString()
      : 'Unknown date';

    pdf.setFontSize(12);
    pdf.text(`Date: ${rideDate}`, 20, 40);
    pdf.text(`Pickup: ${ride.pickup}`, 20, 50);
    pdf.text(`Dropoff: ${ride.dropoff}`, 20, 60);
    pdf.text(`Fare: $${ride.fare?.toFixed(2) ?? '0.00'}`, 20, 70);
    pdf.text(`Passengers: ${ride.passengerCount ?? 'N/A'}`, 20, 80);
    pdf.text(`Ride ID: ${ride.id}`, 20, 90);

    pdf.save(`RideReceipt-${ride.id}.pdf`);
  };

  if (!user) {
    return <Typography p={4}>Please sign in to view ride history.</Typography>;
  }

  if (loading) {
    return (
      <Box p={4} textAlign="center">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={4}>
      <Typography variant="h5" gutterBottom>
        My Ride History
      </Typography>

      {rides.length === 0 ? (
        <Typography>No rides found.</Typography>
      ) : (
        <List>
          {rides.map((ride) => {
            const rideDate = ride.createdAt?.seconds
              ? new Date(ride.createdAt.seconds * 1000).toLocaleString()
              : 'Unknown date';

            return (
              <ListItem key={ride.id} divider>
                <ListItemText
                  primary={`${ride.pickup} → ${ride.dropoff}`}
                  secondary={`Fare: $${ride.fare?.toFixed(2) ?? '0.00'} | ${rideDate}`}
                />
                <Button onClick={() => handleDownload(ride)}>
                  Download Receipt
                </Button>
              </ListItem>
            );
          })}
        </List>
      )}
    </Box>
  );
}
