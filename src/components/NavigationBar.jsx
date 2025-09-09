// src/components/NavigationBar.jsx
import React, { useState, useMemo } from "react";
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Button,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Divider,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import DirectionsCarFilledRoundedIcon from "@mui/icons-material/DirectionsCarFilledRounded";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import HistoryIcon from "@mui/icons-material/History";
import MapIcon from "@mui/icons-material/Map";
import AltRouteIcon from "@mui/icons-material/AltRoute";
import TravelExploreIcon from "@mui/icons-material/TravelExplore";
import ChatIcon from "@mui/icons-material/Chat";
import PaymentsIcon from "@mui/icons-material/Payments";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/Logout";
import LocalDiningIcon from "@mui/icons-material/LocalDining";
import HotelIcon from "@mui/icons-material/Hotel";
import StorefrontIcon from "@mui/icons-material/Storefront";
import { Link as RouterLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/* ------------------------- link definitions ------------------------- */
const riderLinks = [
  { label: "Home", to: "/home", icon: <MapIcon fontSize="small" /> },
  {
    label: "Explore",
    to: "/explore",
    icon: <TravelExploreIcon fontSize="small" />,
  },
  {
    label: "Route Planner",
    to: "/routes",
    icon: <AltRouteIcon fontSize="small" />,
  },
  {
    label: "Ride History",
    to: "/profile/rides",
    icon: <HistoryIcon fontSize="small" />,
  },
  {
    label: "Payments",
    to: "/payments",
    icon: <PaymentsIcon fontSize="small" />,
  },
  {
    label: "Support",
    to: "/support",
    icon: <SupportAgentIcon fontSize="small" />,
  },
  {
    label: "Settings",
    to: "/settings",
    icon: <SettingsIcon fontSize="small" />,
  },
  {
    label: "Profile",
    to: "/profile",
    icon: <PersonOutlineIcon fontSize="small" />,
  },
  { label: "Chat", to: "/chat", icon: <ChatIcon fontSize="small" /> },
];

const categoryLinks = [
  { label: "Food", to: "/food", icon: <LocalDiningIcon fontSize="small" /> },
  { label: "Stays", to: "/stays", icon: <HotelIcon fontSize="small" /> },
  {
    label: "Shopping",
    to: "/shops",
    icon: <StorefrontIcon fontSize="small" />,
  },
  {
    label: "Beaches",
    to: "/beaches",
    icon: <TravelExploreIcon fontSize="small" />,
  },
];

const driverLinks = [
  {
    label: "Driver Home",
    to: "/driver",
    icon: <DirectionsCarFilledRoundedIcon fontSize="small" />,
  },
  {
    label: "Rides Queue",
    to: "/driver/requests",
    icon: <HistoryIcon fontSize="small" />,
  },
  {
    label: "Earnings",
    to: "/driver/earnings",
    icon: <PaymentsIcon fontSize="small" />,
  },
  {
    label: "Settings",
    to: "/driver/settings",
    icon: <SettingsIcon fontSize="small" />,
  },
  {
    label: "Profile",
    to: "/driver/profile",
    icon: <PersonOutlineIcon fontSize="small" />,
  },
];

const adminLinks = [
  {
    label: "Admin Dashboard",
    to: "/admin",
    icon: <SettingsIcon fontSize="small" />,
  },
];

/* ----------------------------- subcomponents ----------------------------- */
function NavButton({ to, label, icon, active }) {
  return (
    <Button
      component={RouterLink}
      to={to}
      color="inherit"
      startIcon={icon}
      sx={{
        fontWeight: 700,
        opacity: active ? 1 : 0.85,
        borderBottom: active
          ? "2px solid currentColor"
          : "2px solid transparent",
        borderRadius: 0,
        px: 1.25,
      }}
    >
      {label}
    </Button>
  );
}

/* --------------------------------- main --------------------------------- */
export default function NavigationBar() {
  const { pathname } = useLocation();
  const { user, isDriver, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);

  const topRider = useMemo(() => riderLinks.slice(0, 3), []);
  const active = (to) => pathname === to || pathname.startsWith(to + "/");
  const handleToggleDrawer = () => setOpen((v) => !v);

  return (
    <AppBar
      position="sticky"
      color="transparent"
      elevation={0}
      sx={{
        backdropFilter: "blur(10px)",
        borderBottom: (t) => `1px solid ${t.palette.divider}`,
      }}
    >
      <Toolbar sx={{ gap: 1 }}>
        {/* mobile: menu toggle */}
        <IconButton
          edge="start"
          color="inherit"
          onClick={handleToggleDrawer}
          aria-label="Open navigation"
          sx={{ mr: 1 }}
        >
          <MenuIcon />
        </IconButton>

        {/* brand */}
        <RouterLink
          to="/home"
          style={{
            display: "inline-flex",
            alignItems: "center",
            textDecoration: "none",
            color: "inherit",
          }}
        >
          <img
            src="/openai-logomark.svg"
            width={26}
            height={26}
            alt="App logo"
            style={{ borderRadius: 6, marginRight: 8 }}
          />
          <Typography variant="h6" sx={{ fontWeight: 900, letterSpacing: 1 }}>
            USVI EXPLORER
          </Typography>
        </RouterLink>

        {/* desktop: quick links */}
        <Box sx={{ ml: "auto", display: { xs: "none", md: "flex" }, gap: 1 }}>
          {topRider.map((l) => (
            <NavButton key={l.to} {...l} active={active(l.to)} />
          ))}
          {/* categories */}
          {categoryLinks.map((l) => (
            <NavButton key={l.to} {...l} active={active(l.to)} />
          ))}
          {isDriver && (
            <NavButton
              to="/driver"
              label="Driver"
              icon={<DirectionsCarFilledRoundedIcon fontSize="small" />}
              active={active("/driver")}
            />
          )}
          {isAdmin && (
            <NavButton
              to="/admin"
              label="Admin"
              icon={<SettingsIcon fontSize="small" />}
              active={active("/admin")}
            />
          )}
        </Box>
      </Toolbar>

      {/* mobile drawer */}
      <Drawer
        anchor="left"
        open={open}
        onClose={handleToggleDrawer}
        PaperProps={{ sx: { width: 300 } }}
      >
        <Box sx={{ px: 2, py: 2 }}>
          <Typography variant="subtitle2" sx={{ opacity: 0.7, mb: 1 }}>
            Rider
          </Typography>
          <List>
            {riderLinks.concat(categoryLinks).map((l) => (
              <ListItemButton
                key={l.to}
                component={RouterLink}
                to={l.to}
                selected={active(l.to)}
                onClick={handleToggleDrawer}
              >
                {l.icon}
                <ListItemText sx={{ ml: 1 }} primary={l.label} />
              </ListItemButton>
            ))}
          </List>

          {isDriver && (
            <>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" sx={{ opacity: 0.7, mb: 1 }}>
                Driver
              </Typography>
              <List>
                {driverLinks.map((l) => (
                  <ListItemButton
                    key={l.to}
                    component={RouterLink}
                    to={l.to}
                    selected={active(l.to)}
                    onClick={handleToggleDrawer}
                  >
                    {l.icon}
                    <ListItemText sx={{ ml: 1 }} primary={l.label} />
                  </ListItemButton>
                ))}
              </List>
            </>
          )}

          {isAdmin && (
            <>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" sx={{ opacity: 0.7, mb: 1 }}>
                Admin
              </Typography>
              <List>
                {adminLinks.map((l) => (
                  <ListItemButton
                    key={l.to}
                    component={RouterLink}
                    to={l.to}
                    selected={active(l.to)}
                    onClick={handleToggleDrawer}
                  >
                    {l.icon}
                    <ListItemText sx={{ ml: 1 }} primary={l.label} />
                  </ListItemButton>
                ))}
              </List>
            </>
          )}

          <Divider sx={{ my: 1 }} />
          <Box
            sx={{
              px: 1,
              py: 0.5,
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            {user ? (
              <>
                <Typography variant="caption" sx={{ opacity: 0.8, flex: 1 }}>
                  Signed in as <strong>{user.email || user.uid}</strong>
                </Typography>
                {/* TODO: wire sign out handler from your AuthContext */}
                <IconButton size="small" title="Sign out" disabled>
                  <LogoutIcon fontSize="small" />
                </IconButton>
              </>
            ) : (
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  component={RouterLink}
                  to="/signin"
                  variant="outlined"
                  size="small"
                >
                  Sign in
                </Button>
                <Button
                  component={RouterLink}
                  to="/signup"
                  variant="contained"
                  size="small"
                >
                  Sign up
                </Button>
              </Box>
            )}
          </Box>
        </Box>
      </Drawer>
    </AppBar>
  );
}
