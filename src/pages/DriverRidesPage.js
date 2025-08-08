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

import { subscribeToRidesByStatus, updateRide } from "../lib/rideService";




import { db } from "../lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import useDriverRides from "../hooks/useDriverRides";

/**
 * Rides page – pending, active, completed.
 */
export default function DriverRidesPage() {
  const [tab, setTab] = useState(0);

  const [pendingRides, setPendingRides] = useState([]);
  const [activeRides, setActiveRides] = useState([]);
  const [completedRides, setCompletedRides] = useState([]);
  const [isAvailable, setIsAvailable] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (u) {
        try {
          const snap = await getDoc(doc(db, "drivers", u.uid));
          setIsAvailable(snap.data()?.isAvailable ?? false);
        } catch (err) {
          setIsAvailable(false);
        }
      } else {
        setIsAvailable(false);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!isAvailable) {
      setPendingRides([]);
      return;
    }
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
  }, [isAvailable]);

  useEffect(() => {
    if (!isAvailable) {
      setActiveRides([]);
      return;
    }
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
  }, [isAvailable]);

  useEffect(() => {
    if (!isAvailable) {
      setCompletedRides([]);
      return;
    }
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
  }, [isAvailable]);


    const fetchRides = async () => {
      try {
        const q = query(
          collection(db, "rideRequests"),
          where("status", "in", ["pending", "accepted", "en-route", "completed"])
        );
        const snapshot = await getDocs(q);

        const pending = [];
        const active = [];
        const completed = [];

        snapshot.forEach((docSnap) => {
          const ride = { id: docSnap.id, ...docSnap.data() };
          if (ride.status === "pending") {
            pending.push(ride);
          } else if (ride.status === "accepted" || ride.status === "en-route") {
            active.push(ride);
          } else if (ride.status === "completed") {
            completed.push(ride);
          }
        });

        setPendingRides(pending);
        setActiveRides(active);
        setCompletedRides(completed);
      } catch (err) {
        logger.error("Fetch rides", err);
      }
    };

    fetchRides();
  }, []);


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


  const { pendingRides, activeRides, completedRides, loading } = useDriverRides();


  const handleAccept = async (rideId) => {
    logger.info("Accept ride", rideId);
    try {

      await updateRide(rideId, { status: "accepted" });
      logger.info("Accept ride", rideId);
      const ref = doc(db, "rideRequests", rideId);
      await updateDoc(ref, { status: "accepted" });
    } catch (err) {
      console.error("Accept ride", err);
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

      {loading ? (
        <Typography color="text.secondary">Loading rides...</Typography>
      ) : (
        <>
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
            <Typography color="text.secondary">
              No completed rides yet.
            </Typography>


          {tab === 2 && (
            <List dense disablePadding>
              {completedRides.length === 0 && (
                <Typography color="text.secondary">
                  No completed rides yet.
                </Typography>
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
        </>

      )}
    </Box>
  );
}
