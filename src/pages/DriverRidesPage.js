import React, { useState } from "react";
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

/**
 * Rides page – pending, active, completed.
 * Replace the stub arrays with live Firestore selectors.
 */
export default function DriverRidesPage() {
  const [tab, setTab] = useState(0);

  /* TODO: replace with real data */
  const pendingRides = [];      // status === "pending"
  const activeRides = [];       // status === "accepted" | "en‑route"
  const completedRides = [];    // status === "completed"

  const handleAccept = (rideId) => {
    console.log("Accept ride", rideId);
    // Firestore update here
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
                primary={`${r.pickupLabel} ➜ ${r.dropoffLabel}`}
                secondary={`Started ${new Date(
                  r.startedAt
                ).toLocaleTimeString()}`}
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
                primary={`${r.pickupLabel} ➜ ${r.dropoffLabel}`}
                secondary={`Fare $${r.fare.toFixed(2)}`}
              />
              <Chip label="Done" color="success" size="small" />
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
}