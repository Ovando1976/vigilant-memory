// src/pages/DriverProfilePage.js

import React, { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Avatar,
  Switch,
  Divider,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
} from "@mui/material";

export default function DriverProfilePage() {
  const [driver, setDriver] = useState(null);
  const [rides, setRides] = useState([]);
  const [isAvailable, setIsAvailable] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call with mock data
    setTimeout(() => {
      const mockDriver = {
        name: "Alex Thompson",
        email: "alex@usvishuttle.com",
        phone: "340-123-4567",
        vehicleMake: "Hyundai",
        vehicleModel: "Tucson",
        plateNumber: "STT-9972",
        isAvailable: true,
      };

      const mockRides = [
        {
          id: "ride1",
          pickup: "Cyril E. King Airport",
          dropoff: "Bolongo Bay",
          fare: 12.0,
          status: "completed",
        },
        {
          id: "ride2",
          pickup: "Charlotte Amalie",
          dropoff: "Compass Point",
          fare: 14.0,
          status: "canceled",
        },
      ];

      setDriver(mockDriver);
      setRides(mockRides);
      setIsAvailable(mockDriver.isAvailable);
      setLoading(false);
    }, 1000);
  }, []);

  const handleAvailabilityToggle = (event) => {
    const available = event.target.checked;
    setIsAvailable(available);
    console.log("Availability updated:", available);
    // You can send this to an API here if needed
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={8}>
        <CircularProgress />
      </Box>
    );
  }

  if (!driver) {
    return (
      <Box textAlign="center" mt={6}>
        <Typography variant="h6">Driver profile not found.</Typography>
      </Box>
    );
  }

  return (
    <Box maxWidth="600px" mx="auto" mt={4} px={2}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Box display="flex" alignItems="center" mb={2}>
          <Avatar sx={{ width: 64, height: 64, mr: 2 }}>
            {driver.name.charAt(0)}
          </Avatar>
          <Box>
            <Typography variant="h6">{driver.name}</Typography>
            <Typography color="textSecondary">{driver.email}</Typography>
            <Typography color="textSecondary">{driver.phone}</Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle1" gutterBottom>
          Vehicle Information
        </Typography>
        <Typography>
          {driver.vehicleMake} {driver.vehicleModel} ({driver.plateNumber})
        </Typography>

        <Box display="flex" justifyContent="space-between" alignItems="center" mt={3}>
          <Typography>Available for rides</Typography>
          <Switch checked={isAvailable} onChange={handleAvailabilityToggle} />
        </Box>
      </Paper>

      <Paper elevation={2} sx={{ mt: 4, p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Ride History
        </Typography>
        {rides.length === 0 ? (
          <Typography color="textSecondary">No rides yet.</Typography>
        ) : (
          <List>
            {rides.map((ride) => (
              <ListItem key={ride.id}>
                <ListItemText
                  primary={`${ride.pickup} → ${ride.dropoff}`}
                  secondary={`Fare: $${ride.fare} | Status: ${ride.status}`}
                />
              </ListItem>
            ))}
          </List>
        )}
      </Paper>
    </Box>
  );
}