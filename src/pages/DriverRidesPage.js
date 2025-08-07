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

import { db } from "../lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";


/**
 * Rides page – pending, active, completed.
 * Replace the stub arrays with live Firestore selectors.
 */
export default function DriverRidesPage() {
  const [tab, setTab] = useState(0);
  const [pendingRides, setPendingRides] = useState([]);
  const [activeRides, setActiveRides] = useState([]);
  const [completedRides, setCompletedRides] = useState([]);

  useEffect(() => {
    const fetchPending = async () => {
      const q = query(
        collection(db, "rideRequests"),
        where("status", "==", "pending")
      );
      const snapshot = await getDocs(q);
      setPendingRides(
        snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
      );
    };
    fetchPending();
  }, []);

  useEffect(() => {
    const fetchActive = async () => {
      const q = query(
        collection(db, "rideRequests"),
        where("status", "in", ["accepted", "en-route"])
      );
      const snapshot = await getDocs(q);
      setActiveRides(
        snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
      );
    };
    fetchActive();
  }, []);

  useEffect(() => {
    const fetchCompleted = async () => {
      const q = query(
        collection(db, "rideRequests"),
        where("status", "==", "completed")
      );
      const snapshot = await getDocs(q);
      setCompletedRides(
        snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
      );
    };
    fetchCompleted();
  }, []);


  const handleAccept = (rideId) => {
    logger.info("Accept ride", rideId);
    // Firestore update here

  const handleAccept = async (rideId) => {
    try {
      const ref = doc(db, "rideRequests", rideId);
      await updateDoc(ref, { status: "accepted" });
      setPendingRides((prev) => prev.filter((r) => r.id !== rideId));
      const acceptedRide = pendingRides.find((r) => r.id === rideId);
      if (acceptedRide) {
        setActiveRides((prev) => [
          ...prev,
          { ...acceptedRide, status: "accepted" },
        ]);
      }
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