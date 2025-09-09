// src/App.js
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
import { SnackbarProvider } from "./components/SnackbarProvider";

/* ─────── global nav ─────── */
import NavigationBar from "./components/NavigationBar";

/* ─────── pages (existing) ─────── */
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
import ChatPage from "./pages/ChatPage";
import { useAuth } from "./context/AuthContext";

/* ─────── extra pages you already have in repo ─────── */
import ExplorePage from "./pages/ExplorePage";
import RoutePlannerPage from "./pages/RoutePlannerPage";
import CheckoutPage from "./pages/CheckoutPage";
import CheckoutSuccess from "./pages/CheckoutSuccess";
import PaymentsPage from "./pages/PaymentsPage";
import SupportPage from "./pages/SupportPage";
import SettingsPage from "./pages/SettingsPage";
import ProfilePage from "./pages/ProfilePage";
import AdminRoute from "./components/AdminRoute";
import AdminDashboard from "./pages/admin/AdminDashboard";
import SupportInbox from "./pages/admin/SupportInbox";
import BeachesPage from "./pages/BeachesPage";
import EventsPage from "./pages/EventsPage";
import FoodPage from "./pages/FoodPage";
import StaysPage from "./pages/StaysPage";
import ShopsPage from "./pages/ShopsPage";
/** FIX: include .jsx extension to match filesystem (case/extension sensitive) */
import PlaceShowPage from "./pages/PlaceShowPage.jsx";
import BeachShowPage from "./pages/BeachShowPage.jsx";
import BeachPinEditor from "./pages/admin/BeachPinEditor";
import SiteShowPage from "./pages/SiteShowPage";
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

  // If you later need a boolean, derive it from auth state here.
  const auth = useAuth();
  const isDriver = auth?.user?.role === "driver";

  /* pick the right MUI palette */
  const theme = useMemo(
    () => (darkMode || gtaMode ? gtaDarkTheme : lightBlueTheme),
    [darkMode, gtaMode]
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      {/* global nav (desktop + drawer) */}
      <NavigationBar isDriver={isDriver} />

      {/* theme toggles */}
      <Box sx={{ p: 1, position: "fixed", top: 8, right: 8, zIndex: 1300 }}>
        <Tooltip
          title={darkMode ? "Switch to Light Theme" : "Switch to Dark Theme"}
        >
          <IconButton
            color="inherit"
            onClick={() => dispatch({ type: "TOGGLE_DARK" })}
            sx={{ mr: 1 }}
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
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/routes" element={<RoutePlannerPage />} />
        <Route path="/events" element={<EventsPage />} />
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
        {/* Checkout */}
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/checkout/success" element={<CheckoutSuccess />} />
        {/* Driver workflow */}
        <Route
          path="/driver"
          element={
            <PrivateRoute>
              <DriverDashboard />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="profile" replace />} />
          <Route path="profile" element={<DriverProfilePage />} />
          <Route path="requests" element={<DriverRidesPage />} />
          <Route path="earnings" element={<DriverEarningsPage />} />
          <Route path="settings" element={<DriverSettingsPage />} />
        </Route>
        {/* Misc */}
        <Route
          path="/profile/rides"
          element={
            <PrivateRoute>
              <UserRideHistory />
            </PrivateRoute>
          }
        />
        <Route path="/test-map" element={<TestMap />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route
          path="/payments"
          element={
            <PrivateRoute>
              <PaymentsPage />
            </PrivateRoute>
          }
        />
        <Route path="/support" element={<SupportPage />} />
        <Route
          path="/settings"
          element={
            <PrivateRoute>
              <SettingsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <ProfilePage />
            </PrivateRoute>
          }
        />
        <Route path="/beaches" element={<BeachesPage />} />
        <Route path="/food" element={<FoodPage />} />
        <Route path="/stays" element={<StaysPage />} />
        <Route path="/shops" element={<ShopsPage />} />
        {/* Place details */}
        <Route path="/places/:id" element={<PlaceShowPage />} />
        <Route path="/beaches/:id" element={<BeachShowPage />} />
        <Route path="/sites" element={<SiteShowPage />} />
        <Route
          path="*"
          element={<p style={{ padding: "2rem" }}>404 – Page not found</p>}
        />
        {/* Admin */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/support"
          element={
            <AdminRoute>
              <SupportInbox />
            </AdminRoute>
          }
        />
        +{" "}
        <Route
          path="/admin/beaches/pin-editor"
          element={
            <AdminRoute>
              <BeachPinEditor />
            </AdminRoute>
          }
        />
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
        <SnackbarProvider>
          <AppShell />
        </SnackbarProvider>
      </AuthProvider>
    </ArgonControllerProvider>
  );
}
