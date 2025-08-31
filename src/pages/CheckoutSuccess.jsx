import React from "react";
import { Box, Container, Paper, Stack, Typography, Button } from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { Link } from "react-router-dom";

export default function CheckoutSuccess() {
  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper sx={{ p: 4, textAlign: "center" }}>
        <Stack spacing={2} alignItems="center">
          <CheckCircleOutlineIcon sx={{ fontSize: 64, color: "success.main" }} />
          <Typography variant="h4" fontWeight={900}>Payment successful</Typography>
          <Typography color="text.secondary">
            We’ve emailed your receipt. You can close this tab or continue exploring.
          </Typography>
          <Box>
            <Button component={Link} to="/home" variant="contained" sx={{ mr: 1 }}>
              Back to Home
            </Button>
            <Button component={Link} to="/profile/rides" variant="outlined">
              View Rides
            </Button>
          </Box>
        </Stack>
      </Paper>
    </Container>
  );
}