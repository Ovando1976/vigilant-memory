// src/pages/RideConfirmedPage.js
import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  CircularProgress,
} from "@mui/material";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { useTranslation } from "react-i18next";
import logger from "../logger";

import useSnackbar from "../hooks/useSnackbar";
import { loadStripe } from "@stripe/stripe-js";

/* ------------- Stripe initialisation (CRA uses process.env) ------------- */
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

export default function RideConfirmedPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { rideId } = useParams();

  const { showSnackbar, SnackbarComponent } = useSnackbar();
  const { t } = useTranslation();

  const [ride, setRide] = useState(() => location.state?.ride || null);
  const [paying, setPaying] = useState(false);

  /* --------------------------- Cancel ride handler --------------------------- */
  const handleCancelRide = () => {
    try {
      const store = JSON.parse(localStorage.getItem("rideRequests") || "{}");
      if (store[rideId]) {
        store[rideId] = { ...store[rideId], status: "cancelled" };
        localStorage.setItem("rideRequests", JSON.stringify(store));
      }
    } catch (err) {
      logger.warn("Failed to cancel ride", err);
    }
    navigate("/home");
  };

  /* ---------------------- Sync via Firestore subscription -------------------- */
  useEffect(() => {
    const unsubscribe = subscribeToRide(rideId, setRide);
    return unsubscribe;
  }, [rideId]);

  if (!ride) {
    return (
      <Box p={4}>
        <Typography variant="h6">
          {t("noRideData") || "No ride data available."}
        </Typography>
        <Button variant="outlined" onClick={() => navigate("/home")}>
          {t("returnHome") || "Return home"}
        </Button>
      </Box>
    );
  }

  /* ----------------------- Stripe Checkout handler ----------------------- */
  const handlePayNow = async () => {
    try {
      setPaying(true);

      // 1) Ensure we have a server-trusted amountCents
      let cents = Number.isInteger(ride?.amountCents) ? ride.amountCents : null;
      if (cents == null) {
        const priceResp = await fetch("/api/rides/price", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ rideId, force: true }),
        });
        if (!priceResp.ok) {
          const j = await priceResp.json().catch(() => null);
          if (priceResp.status === 404 && j?.error === "rate_not_found") {
            throw new Error("No published rate for this route.");
          }
          throw new Error("Could not calculate price.");
        }
        const priced = await priceResp.json();
        cents = priced.amountCents;
      }

      // 2) Create checkout session using verified amount
      const resp = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          rideId,
          amountCents: cents,
          pickup: ride.pickup,
          dropoff: ride.dropoff,
        }),
      });
      if (!resp.ok) throw new Error(`Server responded ${resp.status}`);
      const { sessionId } = await resp.json();
      if (!sessionId) throw new Error("Missing sessionId");

      // 3) Redirect to Stripe
      const stripe = await stripePromise;
      if (!stripe) throw new Error("Stripe failed to load");
      const { error } = await stripe.redirectToCheckout({ sessionId });
      if (error) throw error;
    } catch (err) {
      logger.error("Stripe Checkout error", err);
      showSnackbar(
        err.message || "Unable to start payment. Please try again.",
        "error"
      );
    } finally {
      setPaying(false);
    }
  };

  /* --------------------------------- UI ---------------------------------- */
  return (
    <>
      <SnackbarComponent />
      <Box p={4}>
        <Paper sx={{ p: 4, mb: 3 }}>
          <Typography
            variant="h4"
            fontWeight={600}
            color="primary"
            gutterBottom
          >
            {t("rideConfirmed") || "Ride confirmed"}
          </Typography>
          <Typography variant="subtitle1" gutterBottom>
            {t("rideDispatched") || "Your ride has been dispatched."}
          </Typography>

          <Box mt={3}>
            <Typography variant="h6">
              {t("tripSummary") || "Trip summary"}
            </Typography>
            <Typography>
              📍 {t("pickup") || "Pickup"}: <strong>{ride.pickup}</strong>
            </Typography>
            <Typography>
              🏁 {t("dropoff") || "Dropoff"}: <strong>{ride.dropoff}</strong>
            </Typography>
            <Typography>
              👥 {t("passengers") || "Passengers"}: {ride.passengerCount || 1}
            </Typography>
            <Typography>
              💰 {t("estimatedFare") || "Estimated fare"}:{" "}
              {ride.fare != null ? `$${ride.fare.toFixed(2)}` : "—"}
            </Typography>
            <Typography>
              ⏱️ {t("eta") || "ETA"}:{" "}
              {ride.durationMin != null
                ? `${ride.durationMin} ${t("minutesShort") || "min"}`
                : "—"}
            </Typography>
          </Box>
        </Paper>

        <Box display="flex" flexWrap="wrap" gap={2}>
          <Button
            variant="contained"
            onClick={() => navigate(`../track/${rideId}`)}
          >
            {t("trackRide") || "Track ride"}
          </Button>

          <Button variant="outlined" onClick={() => navigate("/home")}>
            {t("returnHome") || "Return home"}
          </Button>

          <Button variant="outlined" color="error" onClick={handleCancelRide}>
            {t("cancelRide") || "Cancel ride"}
          </Button>

          <Button
            variant="contained"
            color="secondary"
            disabled={paying}
            onClick={handlePayNow}
          >
            {paying ? <CircularProgress size={22} /> : t("payNow") || "Pay now"}
          </Button>
        </Box>
      </Box>
    </>
  );
}
