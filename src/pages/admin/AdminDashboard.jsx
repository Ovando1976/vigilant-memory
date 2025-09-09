import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardActionArea,
  CardContent,
  Stack,
  Button,
  CircularProgress,
} from "@mui/material";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import ArchiveIcon from "@mui/icons-material/Archive";
import { db } from "../../lib/firebase";
import {
  collection,
  query,
  where,
  getCountFromServer,
  Timestamp,
} from "firebase/firestore";
import { Link as RouterLink } from "react-router-dom";

function StatCard({ title, count, icon, to, color }) {
  return (
    <Card sx={{ height: "100%" }}>
      <CardActionArea component={RouterLink} to={to} sx={{ height: "100%" }}>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={1}>
            {icon}
            <Typography variant="h6" fontWeight={800}>
              {title}
            </Typography>
          </Stack>
          <Typography
            variant="h3"
            fontWeight={900}
            color={color}
            sx={{ mt: 1 }}
          >
            {count ?? "—"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            View in Support Inbox
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export default function AdminDashboard() {
  const base = useMemo(() => collection(db, "supportTickets"), []);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    open: 0,
    in_progress: 0,
    resolved: 0,
    closed: 0,
    today: 0,
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [open, inprog, reso, closed, today] = await Promise.all([
          getCountFromServer(query(base, where("status", "==", "open"))),
          getCountFromServer(query(base, where("status", "==", "in_progress"))),
          getCountFromServer(query(base, where("status", "==", "resolved"))),
          getCountFromServer(query(base, where("status", "==", "closed"))),
          getCountFromServer(
            query(
              base,
              where(
                "createdAt",
                ">=",
                Timestamp.fromDate(new Date(new Date().setHours(0, 0, 0, 0)))
              )
            )
          ),
        ]);
        if (mounted) {
          setStats({
            open: open.data().count,
            in_progress: inprog.data().count,
            resolved: reso.data().count,
            closed: closed.data().count,
            today: today.data().count,
          });
        }
      } catch (e) {
        // non-blocking; leave zeros
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [base]);

  return (
    <Box p={{ xs: 2, md: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems="center"
          spacing={2}
        >
          <Typography variant="h5" fontWeight={800}>
            Admin • Dashboard
          </Typography>
          <Button
            component={RouterLink}
            to="/admin/support"
            variant="contained"
            startIcon={<SupportAgentIcon />}
          >
            Open Support Inbox
          </Button>
        </Stack>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 1, mb: 2 }}
        >
          High-level overview of support tickets. Click any card to triage.
        </Typography>

        {loading ? (
          <Box p={2}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Open"
                count={stats.open}
                to="/admin/support?status=open"
                icon={<SupportAgentIcon color="error" />}
                color="error.main"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="In Progress"
                count={stats.in_progress}
                to="/admin/support?status=in_progress"
                icon={<AssignmentTurnedInIcon color="warning" />}
                color="warning.main"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Resolved"
                count={stats.resolved}
                to="/admin/support?status=resolved"
                icon={<DoneAllIcon color="success" />}
                color="success.main"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Closed"
                count={stats.closed}
                to="/admin/support?status=closed"
                icon={<ArchiveIcon color="info" />}
                color="info.main"
              />
            </Grid>
          </Grid>
        )}

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mt: 2, display: "block" }}
        >
          Counts use Firestore aggregate queries (getCountFromServer). Requires
          the new query aggregation indexes.
        </Typography>
      </Paper>
    </Box>
  );
}
