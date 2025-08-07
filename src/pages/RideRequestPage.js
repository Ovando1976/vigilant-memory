// src/pages/RideRequestPage.js

import React, { useState } from "react";
import { Box, Button, MenuItem, TextField, Typography, Paper } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { taxiRates } from "../data/taxiRates";
import { locationCoords } from "../data/locationCoords";
import { getLocalTaxiRate } from "../lib/getLocalTaxiRate";
import { createRideRequest } from "../lib/createRideRequest";

import logger from "../logger";

import useSnackbar from "../hooks/useSnackbar";

import { auth } from "../lib/firebase";



export default function RideRequestPage() {
  const navigate = useNavigate();

  const { showSnackbar, SnackbarComponent } = useSnackbar();

  const { t } = useTranslation();

  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [passengerCount, setPassengerCount] = useState("1");
  const [loading, setLoading] = useState(false);
  const [farePreview, setFarePreview] = useState(null);
  const [errors, setErrors] = useState({});

  const pickupOptions = [...new Set(taxiRates.map((r) => r.from))].sort();
  const dropoffOptions = [...new Set(taxiRates.map((r) => r.to))].sort();

  const sanitizePassengers = (value) => {
    const num = parseInt(value, 10);
    return Number.isInteger(num) && num >= 1 ? num : null;
  };

  const handleFarePreview = () => {
    const validationErrors = {};
    const passengers = sanitizePassengers(passengerCount);

    if (!pickup) validationErrors.pickup = "Pickup is required";
    if (!dropoff) validationErrors.dropoff = "Dropoff is required";
    if (pickup && dropoff && pickup === dropoff)
      validationErrors.dropoff = "Pickup and dropoff cannot be the same";
    if (passengers === null)
      validationErrors.passengers = "Passenger count must be at least 1";

    setErrors(validationErrors);
    if (Object.keys(validationErrors).length) {
      setFarePreview(null);
      return;
    }

    try {
      const summary = getLocalTaxiRate(pickup, dropoff, passengers);
      setFarePreview(summary);
    } catch (err) {
      logger.error("Fare preview failed:", err);
      setErrors({ form: err.message });
      setFarePreview(null);
    }
  };


  const handleSubmit = async () => {
    if (!pickup || !dropoff || pickup === dropoff) {

      showSnackbar("Please select valid locations.", "warning");

      alert(t("selectValidLocations"));

      return;
    }

  const handleSubmit = () => {
    const validationErrors = {};
    const passengers = sanitizePassengers(passengerCount);

    if (!pickup) validationErrors.pickup = "Pickup is required";
    if (!dropoff) validationErrors.dropoff = "Dropoff is required";
    if (pickup && dropoff && pickup === dropoff)
      validationErrors.dropoff = "Pickup and dropoff cannot be the same";
    if (passengers === null)
      validationErrors.passengers = "Passenger count must be at least 1";

    setErrors(validationErrors);
    if (Object.keys(validationErrors).length) return;


    setLoading(true);
    try {
      const summary = getLocalTaxiRate(pickup, dropoff, passengers);

      const rideId = await createRideRequest({
        pickup,
        dropoff,
        pickupCoords: locationCoords[pickup],
        dropoffCoords: locationCoords[dropoff],
        fare: summary.fare,
        durationMin: summary.durationMin,
        passengerCount,
        ownerId: auth.currentUser ? auth.currentUser.uid : undefined,
      });

      navigate(`/ridesharing/review/${rideId}`);
    } catch (error) {
      logger.error("Failed to preview ride:", error);

      showSnackbar("Could not continue to review page.", "error");


      alert(t("couldNotContinue"));

      setErrors({ form: "Could not continue to review page." });


    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SnackbarComponent />
      <Box p={4}>
      <Paper elevation={3} sx={{ maxWidth: 500, mx: "auto", p: 4 }}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          {t("requestRide")}
        </Typography>

        <TextField
          fullWidth
          select
          label={t("pickupLocation")}
          value={pickup}
          onChange={(e) => setPickup(e.target.value)}
          error={!!errors.pickup}
          helperText={errors.pickup}
          sx={{ my: 2 }}
        >
          {pickupOptions.map((loc) => (
            <MenuItem key={loc} value={loc}>
              {loc}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          fullWidth
          select
          label={t("dropoffLocation")}
          value={dropoff}
          onChange={(e) => setDropoff(e.target.value)}
          error={!!errors.dropoff}
          helperText={errors.dropoff}
          sx={{ mb: 2 }}
        >
          {dropoffOptions.map((loc) => (
            <MenuItem key={loc} value={loc}>
              {loc}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          fullWidth
          type="number"
          label={t("passengers")}
          value={passengerCount}
          onChange={(e) => setPassengerCount(e.target.value)}
          inputProps={{ min: 1, max: 10 }}
          error={!!errors.passengers}
          helperText={errors.passengers}
          sx={{ mb: 2 }}
        />

        <Button
          variant="outlined"
          fullWidth
          sx={{ mb: 2 }}
          onClick={handleFarePreview}
        >
          {t("previewFare")}
        </Button>

        {farePreview && (
          <Typography variant="body1" color="primary" gutterBottom>
            💰 {t("estimatedFare")}: ${
              farePreview?.fare?.toFixed(2) ?? t("notAvailable")
            } <br />
            ⏱ {t("eta")}: ~{farePreview?.durationMin ?? "?"} {t("minutesShort")}
          </Typography>
        )}

        {errors.form && (
          <Typography color="error" sx={{ mb: 2 }}>
            {errors.form}
          </Typography>
        )}

        <Button
          variant="contained"
          fullWidth
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? t("loading") : t("reviewRide")}
        </Button>
      </Paper>
      </Box>
    </>
  );
}
