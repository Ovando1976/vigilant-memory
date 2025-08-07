import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import {
  Box,
  Container,
  Drawer,
  IconButton,
  Badge,
  Paper,
  Typography,
  Stack,
  Fab,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import ListAltIcon from "@mui/icons-material/ListAlt";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";

import Sidebar from "../components/driver/Sidebar";
import { BottomNav } from "../components/driver/BottomNav";
import KpiRow from "../components/driver/KpiRow";
import { RideQueue } from "../components/driver/RideQueue";
import EarningsChart from "../components/driver/EarningsChart";
import LiveMap from "../components/driver/LiveMap";
import DriverEarnings from "../components/driver/DriverEarnings";
import ErrorBoundary from "../components/ErrorBoundary";
import logger from "../logger";

import { useTranslation } from "react-i18next";

import { db } from "../lib/firebase";
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";


export default function DriverDashboard() {
  const theme = useTheme();
  const upMd = useMediaQuery(theme.breakpoints.up("md"));
  const { t } = useTranslation();

  /* UI state */
  const [queueOpen, setQueueOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false); // sidebar on mobile
  const [mini, setMini] = useState(false);             // collapsed sidebar
  const [earningsOpen, setEarningsOpen] = useState(false); // earnings drawer

  /* Ride queue state */
  const [rideRequests, setRideRequests] = useState([]);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const pendingCount = rideRequests.length;

  useEffect(() => {
    const q = query(
      collection(db, "rideRequests"),
      where("status", "==", "pending")
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setRideRequests(
        snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
      );
      setLoadingQueue(false);
    });
    return () => unsub();
  }, []);

  const handleAcceptRide = async (rideId) => {
    logger.info("Accepted ride ID:", rideId);
    try {
      const ref = doc(db, "rideRequests", rideId);
      await updateDoc(ref, { status: "accepted" });
    } catch (err) {
      logger.error("Accept ride", err);
    }
  };

  /* Widths */
  const SIDEBAR_FULL = 260;
  const SIDEBAR_MINI = 72;
  const sidebarWidth = mini && upMd ? SIDEBAR_MINI : SIDEBAR_FULL;

  return (
    <ErrorBoundary>
      <Box sx={{ display: "flex", height: "100vh", overflow: "hidden" }}>
        {/* =========== Permanent / temporary sidebar =========== */}
        {upMd ? (
          <Drawer
            variant="permanent"
            open
            sx={{
              width: sidebarWidth,
              [`& .MuiDrawer-paper`]: {
                width: sidebarWidth,
                borderRight: `2px solid ${theme.palette.primary.main}`,
              },
            }}
          >
            <Sidebar mini={mini} onToggleMini={setMini} />
          </Drawer>
        ) : (
          <Drawer
            variant="temporary"
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            ModalProps={{ keepMounted: true }}
            PaperProps={{ sx: { width: SIDEBAR_FULL } }}
          >
            <Sidebar />
          </Drawer>
        )}

        {/* =========== MAP CANVAS =========== */}
        <Box sx={{ flexGrow: 1, position: "relative" }}>
          <LiveMap />

          {/* ----- Floating KPI bar (top‑left) ----- */}
          <Paper
            elevation={4}
            sx={{
              position: "absolute",
              top: theme.spacing(1.5),
              left: theme.spacing(1.5),
              width: { xs: "calc(100% - 24px)", md: 360 },
              p: 1.5,
              border: 1,
              borderColor: "primary.main",
              bgcolor: "background.paper",
              zIndex: 1101,
            }}
          >
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 700, color: "primary.main", mb: 1, textTransform: "uppercase" }}
            >
              {t("driverCommandCenter")}
            </Typography>
            <KpiRow dense />
          </Paper>

          {/* ----- Mini sidebar toggle (mobile) ----- */}
          {!upMd && (
            <IconButton
              onClick={() => setDrawerOpen(true)}
              sx={{ position: "absolute", top: 8, left: 8, zIndex: 1102 }}
              size="large"
              color="inherit"
            >
              <MenuIcon />
            </IconButton>
          )}

          {/* ----- Floating FABs ----- */}
          <Stack
            direction="column"
            spacing={2}
            sx={{
              position: "absolute",
              right: theme.spacing(2),
              bottom: theme.spacing(10),
              zIndex: 1101,
            }}
          >
            {/* Ride queue / dispatcher */}
            <Badge badgeContent={pendingCount} color="error">
              <Fab
                size="medium"
                color="primary"
                onClick={() => setQueueOpen(true)}
                aria-label={t("rideQueue")}
              >
                <ListAltIcon />
              </Fab>
            </Badge>

            {/* Earnings panel  (placeholder) */}
            <Fab
              size="medium"
              color="secondary"

              onClick={() => alert(t("earningsComingSoon"))}
              aria-label={t("earnings")}

              onClick={() => setEarningsOpen(true)}
              aria-label="Earnings"

            >
              <MonetizationOnIcon />
            </Fab>
          </Stack>
        </Box>

        {/* =========== Slide‑over Ride Queue =========== */}
        <Drawer
          anchor="right"
          open={queueOpen}
          onClose={() => setQueueOpen(false)}
          PaperProps={{
            sx: {
              width: { xs: "100%", md: 420 },
              p: 2,
              display: "flex",
              flexDirection: "column",
              gap: 2,
            },
          }}
        >
          <Typography variant="h6" color="primary.main">
            {t("rideRequests")}
          </Typography>

          <RideQueue
            rides={rideRequests}
            onAccept={handleAcceptRide}
            loading={loadingQueue}
          />

          <Typography variant="h6" color="warning.main" mt={3}>
            {t("earningsChartComingSoon")}
          </Typography>
          <EarningsChart />
        </Drawer>

        {/* =========== Slide‑over Earnings =========== */}
        <Drawer
          anchor="right"
          open={earningsOpen}
          onClose={() => setEarningsOpen(false)}
          PaperProps={{
            sx: {
              width: { xs: "100%", md: 420 },
              p: 2,
              display: "flex",
              flexDirection: "column",
              gap: 2,
            },
          }}
        >
          <DriverEarnings />
        </Drawer>

        {/* =========== Bottom nav (mobile) =========== */}
        <Box
          sx={{
            display: { xs: "block", md: "none" },
            position: "fixed",
            bottom: 0,
            left: 0,
            width: "100%",
            zIndex: theme.zIndex.appBar,
          }}
        >
          <BottomNav />
        </Box>

        {/* Nested routes (rarely used here) */}
        <Outlet />
      </Box>
    </ErrorBoundary>
  );
}