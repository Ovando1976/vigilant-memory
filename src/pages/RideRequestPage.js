// src/pages/RideRequestPage.js

import React, { useState } from "react";
import {
  Box,
  Button,
  MenuItem,
  TextField,
  Typography,
  Paper,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { taxiRates } from "../data/taxiRates";
import { getLocalTaxiRate } from "../lib/getLocalTaxiRate";

export default function RideRequestPage() {
  const navigate = useNavigate();
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [passengerCount, setPassengerCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [farePreview, setFarePreview] = useState(null);

  const pickupOptions = [...new Set(taxiRates.map((r) => r.from))].sort();
  const dropoffOptions = [...new Set(taxiRates.map((r) => r.to))].sort();

  const handleFarePreview = () => {
    if (!pickup || !dropoff || pickup === dropoff) return;

    try {
      const summary = getLocalTaxiRate(pickup, dropoff, passengerCount);
      setFarePreview(summary);
    } catch (err) {
      console.error("Fare preview failed:", err);
      setFarePreview(null);
    }
  };

  const handleSubmit = () => {
    if (!pickup || !dropoff || pickup === dropoff) {
      alert("Please select valid locations.");
      return;
    }

    setLoading(true);
    try {
      const summary = getLocalTaxiRate(pickup, dropoff, passengerCount);

      navigate("/ridesharing/review", {
        state: {
          pickup,
          dropoff,
          passengerCount,
          fareSummary: summary,
        },
      });
    } catch (error) {
      console.error("Failed to preview ride:", error);
      alert("Could not continue to review page.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box p={4}>
      <Paper elevation={3} sx={{ maxWidth: 500, mx: "auto", p: 4 }}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          Request a Ride
        </Typography>

        <TextField
          fullWidth
          select
          label="Pickup Location"
          value={pickup}
          onChange={(e) => setPickup(e.target.value)}
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
          label="Dropoff Location"
          value={dropoff}
          onChange={(e) => setDropoff(e.target.value)}
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
          label="Passengers"
          value={passengerCount}
          onChange={(e) => setPassengerCount(parseInt(e.target.value))}
          inputProps={{ min: 1, max: 10 }}
          sx={{ mb: 2 }}
        />

        <Button
          variant="outlined"
          fullWidth
          sx={{ mb: 2 }}
          onClick={handleFarePreview}
        >
          Preview Fare
        </Button>

        {farePreview && (
          <Typography variant="body1" color="primary" gutterBottom>
            💰 Estimated Fare: ${farePreview?.fare?.toFixed(2) ?? "N/A"} <br />
            ⏱ ETA: ~{farePreview?.durationMin ?? "?"} min
          </Typography>
        )}

        <Button
          variant="contained"
          fullWidth
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? "Loading..." : "Review Ride"}
        </Button>
      </Paper>
    </Box>
  );
}