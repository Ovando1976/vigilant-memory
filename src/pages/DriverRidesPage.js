import React, { useState, useEffect } from "react";
import {
  Box,
  Tabs,
  Tab,
  Typography,
  List,
  ListItem,
  ListItemText,
  Chip,
} from "@mui/material";
import { RideQueue } from "../components/driver/RideQueue";
import logger from "../logger";
import { subscribeToRidesByStatus, updateRide } from "../lib/rideService";

/**
 * Rides page – pending, active, completed.
 */
export default function DriverRidesPage() {
  const [tab, setTab] = useState(0);
  const [pendingRides, setPendingRides] = useState([]);
  const [activeRides, setActiveRides] = useState([]);
  const [completedRides, setCompletedRides] = useState([]);

  useEffect(() => {
    const unsub = subscribeToRidesByStatus("confirmed", setPendingRides);
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = subscribeToRidesByStatus(["accepted", "en-route"], setActiveRides);
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = subscribeToRidesByStatus("completed", setCompletedRides);
    return unsub;
  }, []);

  const handleAccept = async (rideId) => {
    try {
      await updateRide(rideId, { status: "accepted" });
      logger.info("Accept ride", rideId);
    } catch (err) {
      console.error("Accept ride", err);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h5" fontWeight={700} mb={2}>
        My Rides
      </Typography>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 2 }}
        textColor="primary"
        indicatorColor="primary"
      >
        <Tab label={`Pending (${pendingRides.length})`} />
        <Tab label={`Active (${activeRides.length})`} />
        <Tab label={`Completed (${completedRides.length})`} />
      </Tabs>

      {tab === 0 && (
        <RideQueue
          rides={pendingRides}
          acceptingId={null}
          onAccept={handleAccept}
          dense
        />
      )}

      {tab === 1 && (
        <List dense disablePadding>
          {activeRides.length === 0 && (
            <Typography color="text.secondary">No active rides.</Typography>
          )}
          {activeRides.map((r) => (
            <ListItem key={r.id}>
              <ListItemText
                primary={`${r.pickup} ➜ ${r.dropoff}`}
                secondary={`Passengers: ${r.passengerCount || 1}`}
              />
              <Chip label={r.status} color="warning" size="small" />
            </ListItem>
          ))}
        </List>
      )}

      {tab === 2 && (
        <List dense disablePadding>
          {completedRides.length === 0 && (
            <Typography color="text.secondary">No completed rides yet.</Typography>
          )}
          {completedRides.map((r) => (
            <ListItem key={r.id}>
              <ListItemText
                primary={`${r.pickup} ➜ ${r.dropoff}`}
                secondary={`Fare $${r.fare?.toFixed(2) || 0}`}
              />
              <Chip label="Done" color="success" size="small" />
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
}
