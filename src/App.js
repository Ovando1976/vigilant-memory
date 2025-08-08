import React, { useMemo } from "react";
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  IconButton,
  Tooltip,
  Box,
} from "@mui/material";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import { Routes, Route, Navigate } from "react-router-dom";

import {
  ArgonControllerProvider,
  useArgonController,
} from "./context/ArgonControllerContext";
import { AuthProvider } from "./context/AuthContext";

/* ─────── pages ─────── */
import HomePage from "./pages/HomePage";
import RideRequestPage from "./pages/RideRequestPage";
import RideReviewPage from "./pages/RideReviewPage";
import RideConfirmedPage from "./pages/RideConfirmedPage";
import RideTrackingPage from "./pages/RideTrackingPage";
import Ridesharing from "./pages/Ridesharing";
import DriverDashboard from "./pages/DriverDashboard";
import DriverProfilePage from "./pages/DriverProfilePage";
import DriverRidesPage from "./pages/DriverRidesPage";
import DriverEarningsPage from "./pages/DriverEarningsPage";
import DriverSettingsPage from "./pages/DriverSettingsPage";
import TestMap from "./pages/TestMap";
import UserRideHistory from "./pages/UserRideHistory";
import SignInPage from "./pages/SignInPage";
import SignUpPage from "./pages/SignUpPage";
import PrivateRoute from "./components/PrivateRoute";

/* ─────── themes ─────── */
const gtaDarkTheme = createTheme({
  palette: {
    mode: "dark",
    background: { default: "#0c0c0c", paper: "#1a1a1a" },
    primary: { main: "#00FF00" },
    secondary: { main: "#FFD700" },
    text: { primary: "#F2F2F2", secondary: "#AAAAAA" },
  },
  typography: { fontFamily: "Arial Black, sans-serif" },
});

const lightBlueTheme = createTheme({
  palette: {
    mode: "light",
    background: { default: "#e0f7fa", paper: "#ffffff" },
    primary: { main: "#0288d1" },
    secondary: { main: "#ffb300" },
    text: { primary: "#0d47a1", secondary: "#546e7a" },
  },
  typography: { fontFamily: "Helvetica, sans-serif" },
});

/* ────────────────────── shell ────────────────────── */
function AppShell() {
  const [{ darkMode, gtaMode }, dispatch] = useArgonController();

  /* pick the right MUI palette */
  const theme = useMemo(
    () => (darkMode || gtaMode ? gtaDarkTheme : lightBlueTheme),
    [darkMode, gtaMode]
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      {/* theme toggles */}
      <Box sx={{ p: 1, position: "fixed", top: 0, right: 0, zIndex: 9999 }}>
        <Tooltip title={darkMode ? "Switch to Light Theme" : "Switch to Dark Theme"}>
          <IconButton
            color="inherit"
            onClick={() => dispatch({ type: "TOGGLE_DARK" })}
          >
            {darkMode ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
        </Tooltip>

        <Tooltip title={gtaMode ? "Disable GTA Mode" : "Enable GTA Mode"}>
          <IconButton
            color="inherit"
            onClick={() => dispatch({ type: "TOGGLE_GTA" })}
          >
            <LocalFireDepartmentIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* routes */}
      <Routes>
        {/* Public */}
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/signup" element={<SignUpPage />} />

        {/* Rider workflow */}
        <Route path="/ridesharing" element={<Ridesharing />}>
          <Route index element={<Navigate to="request" replace />} />
          <Route path="request" element={<RideRequestPage />} />
          <Route path="review/:rideId" element={<RideReviewPage />} />
          <Route path="confirmed/:rideId" element={<RideConfirmedPage />} />
          <Route path="track/:rideId" element={<RideTrackingPage />} />
        </Route>

        {/* Driver workflow */}
        <Route path="/driver" element={<PrivateRoute><DriverDashboard /></PrivateRoute>}>
          <Route index element={<Navigate to="profile" replace />} />
          <Route path="profile" element={<DriverProfilePage />} />
          <Route path="requests" element={<DriverRidesPage />} />
          <Route path="earnings" element={<DriverEarningsPage />} />
          <Route path="settings" element={<DriverSettingsPage />} />
        </Route>

        {/* Misc */}
        <Route path="/profile/rides" element={<PrivateRoute><UserRideHistory /></PrivateRoute>} />
        <Route path="/test-map" element={<TestMap />} />

        {/* 404 */}
        <Route
          path="*"
          element={<p style={{ padding: "2rem" }}>404 – Page not found</p>}
        />
      </Routes>
    </ThemeProvider>
  );
}

/* ───────────────── root export ───────────────── */
export default function App() {
  return (
    <ArgonControllerProvider>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </ArgonControllerProvider>
  );
}