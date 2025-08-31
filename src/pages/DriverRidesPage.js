import React, { useEffect, useState } from "react";
import {
  Box,
  Tabs,
  Tab,
  Typography,
  List,
  ListItem,
  ListItemText,
  Chip,
  CircularProgress,
} from "@mui/material";
import { RideQueue } from "../components/driver/RideQueue";
import logger from "../logger";

import { db, auth } from "../lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  getDoc,
} from "firebase/firestore";

// If you want realtime later, reintroduce subscribeToRidesByStatus carefully
// import { subscribeToRidesByStatus, updateRide } from "../lib/rideService";

export default function DriverRidesPage() {
  const [tab, setTab] = useState(0);
  const [pendingRides, setPendingRides] = useState([]);
  const [activeRides, setActiveRides] = useState([]);
  const [completedRides, setCompletedRides] = useState([]);
  const [isAvailable, setIsAvailable] = useState(null);
  const [user, setUser] = useState(null);

  // Auth + availability
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (u) {
        try {
          const snap = await getDoc(doc(db, "drivers", u.uid));
          setIsAvailable(snap.data()?.isAvailable ?? false);
        } catch (err) {
          logger.error("load availability", err);
          setIsAvailable(false);
        }
      } else {
        setIsAvailable(false);
      }
    });
    return () => unsub();
  }, []);

  // Fetch lists (simple polling-once; can refactor to realtime later)
  useEffect(() => {
    if (!isAvailable) {
      setPendingRides([]);
      setActiveRides([]);
      setCompletedRides([]);
      return;
    }

    const fetchAll = async () => {
      try {
        const q = query(
          collection(db, "rideRequests"),
          where("status", "in", ["pending", "accepted", "en-route", "completed"])
        );
        const snap = await getDocs(q);

        const pend = [];
        const act = [];
        const comp = [];

        snap.forEach((docSnap) => {
          const ride = { id: docSnap.id, ...docSnap.data() };
          if (ride.status === "pending") pend.push(ride);
          else if (ride.status === "accepted" || ride.status === "en-route") act.push(ride);
          else if (ride.status === "completed") comp.push(ride);
        });

        setPendingRides(pend);
        setActiveRides(act);
        setCompletedRides(comp);
      } catch (e) {
        logger.error("fetch rides", e);
      }
    };

    fetchAll();
  }, [isAvailable]);

  const handleAccept = async (rideId) => {
    try {
      const ref = doc(db, "rideRequests", rideId);
      await updateDoc(ref, { status: "accepted", driverId: user?.uid || null });
      // Optional: optimistic UI
      setPendingRides((prev) => prev.filter((r) => r.id !== rideId));
    } catch (err) {
      logger.error("accept ride", err);
    }
  };

  if (isAvailable === null) {
    return (
      <Box sx={{ p: 2, textAlign: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAvailable) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="text.secondary">
          You are currently offline. Enable availability in your profile to
          receive ride requests.
        </Typography>
      </Box>
    );
  }

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
        <RideQueue rides={pendingRides} onAccept={handleAccept} dense />
      )}

      {tab === 1 && (
        <List dense disablePadding>
          {activeRides.length === 0 && (
            <Typography color="text.secondary">No active rides.</Typography>
          )}
          {activeRides.map((r) => (
            <ListItem key={r.id}>
              <ListItemText
                primary={`${r.pickup || r.pickupLabel} ➜ ${r.dropoff || r.dropoffLabel}`}
                secondary={
                  r.startedAt
                    ? `Started ${new Date(r.startedAt).toLocaleTimeString()}`
                    : `Passengers: ${r.passengerCount || 1}`
                }
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
                primary={`${r.pickup || r.pickupLabel} ➜ ${r.dropoff || r.dropoffLabel}`}
                secondary={`Fare $${Number(r.fare || 0).toFixed(2)}`}
              />
              <Chip label="Done" color="success" size="small" />
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
}