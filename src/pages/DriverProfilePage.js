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
  TextField,
  Button,
} from "@mui/material";
import { auth, db } from "../lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import logger from "../logger";

export default function DriverProfilePage() {
  const [user, setUser] = useState(null);
  const [driver, setDriver] = useState(null);
  const [rides, setRides] = useState([]);
  const [isAvailable, setIsAvailable] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => setUser(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    const fetchDriver = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const ref = doc(db, "drivers", user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setDriver(data);
          setIsAvailable(data.isAvailable ?? false);
        } else {
          setDriver(null);
        }
      } catch (err) {
        logger.error("Load driver profile", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDriver();
  }, [user]);

  const handleInputChange = (e) => {
    setDriver({ ...driver, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    if (!user || !driver) return;
    try {
      const ref = doc(db, "drivers", user.uid);
      await updateDoc(ref, {
        name: driver.name || "",
        phone: driver.phone || "",
        vehicleMake: driver.vehicleMake || "",
        vehicleModel: driver.vehicleModel || "",
        plateNumber: driver.plateNumber || "",
      });
      logger.info("Driver profile updated");
    } catch (err) {
      logger.error("Save profile", err);
    }
  };

  const handleAvailabilityToggle = async (event) => {
    const available = event.target.checked;
    setIsAvailable(available);
    if (!user) return;
    try {
      const ref = doc(db, "drivers", user.uid);
      await updateDoc(ref, { isAvailable: available });
      logger.info("Availability updated:", available);
    } catch (err) {
      logger.error("Availability update failed", err);
    }
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
            {driver.name ? driver.name.charAt(0) : "?"}
          </Avatar>
          <Box flexGrow={1}>
            <TextField
              label="Name"
              name="name"
              value={driver.name || ""}
              onChange={handleInputChange}
              fullWidth
              margin="dense"
            />
            <TextField
              label="Email"
              name="email"
              value={driver.email || ""}
              onChange={handleInputChange}
              fullWidth
              margin="dense"
              disabled
            />
            <TextField
              label="Phone"
              name="phone"
              value={driver.phone || ""}
              onChange={handleInputChange}
              fullWidth
              margin="dense"
            />
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle1" gutterBottom>
          Vehicle Information
        </Typography>
        <TextField
          label="Make"
          name="vehicleMake"
          value={driver.vehicleMake || ""}
          onChange={handleInputChange}
          fullWidth
          margin="dense"
        />
        <TextField
          label="Model"
          name="vehicleModel"
          value={driver.vehicleModel || ""}
          onChange={handleInputChange}
          fullWidth
          margin="dense"
        />
        <TextField
          label="Plate Number"
          name="plateNumber"
          value={driver.plateNumber || ""}
          onChange={handleInputChange}
          fullWidth
          margin="dense"
        />

        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mt={3}
        >
          <Typography>Available for rides</Typography>
          <Switch checked={isAvailable} onChange={handleAvailabilityToggle} />
        </Box>

        <Button variant="contained" sx={{ mt: 2 }} onClick={handleSave}>
          Save Changes
        </Button>
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

