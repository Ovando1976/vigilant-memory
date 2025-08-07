import { useState, useEffect } from "react";
import { db, auth } from "../lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

export default function useDriverRides() {
  const [pendingRides, setPendingRides] = useState([]);
  const [activeRides, setActiveRides] = useState([]);
  const [completedRides, setCompletedRides] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    let pendingLoaded = false;
    let activeLoaded = !uid;
    let completedLoaded = !uid;

    const checkLoaded = () => {
      if (pendingLoaded && activeLoaded && completedLoaded) {
        setLoading(false);
      }
    };

    const pendingQuery = query(
      collection(db, "rideRequests"),
      where("status", "==", "pending")
    );
    const unsubPending = onSnapshot(pendingQuery, (snapshot) => {
      setPendingRides(
        snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      );
      pendingLoaded = true;
      checkLoaded();
    });

    let unsubActive = () => {};
    let unsubCompleted = () => {};

    if (uid) {
      const activeQuery = query(
        collection(db, "rideRequests"),
        where("driverId", "==", uid),
        where("status", "in", ["accepted", "en-route"])
      );
      unsubActive = onSnapshot(activeQuery, (snapshot) => {
        setActiveRides(
          snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        );
        activeLoaded = true;
        checkLoaded();
      });

      const completedQuery = query(
        collection(db, "rideRequests"),
        where("driverId", "==", uid),
        where("status", "==", "completed")
      );
      unsubCompleted = onSnapshot(completedQuery, (snapshot) => {
        setCompletedRides(
          snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        );
        completedLoaded = true;
        checkLoaded();
      });
    } else {
      setActiveRides([]);
      setCompletedRides([]);
    }

    return () => {
      unsubPending();
      unsubActive();
      unsubCompleted();
    };
  }, []);

  return { pendingRides, activeRides, completedRides, loading };
}
