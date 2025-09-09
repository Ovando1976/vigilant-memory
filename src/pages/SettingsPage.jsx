import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  FormControlLabel,
  Switch,
  Divider,
  MenuItem,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Stack,
} from "@mui/material";
import { useAuth } from "../context/AuthContext";
import { db } from "../lib/firebase";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { useSnackbar } from "../components/SnackbarProvider";

export default function SettingsPage() {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [settings, setSettings] = useState({
    theme: "system",
    units: "imperial",
    language: "en",
    notifications: true,
    marketingEmails: false,
    diagnostics: false,
  });

  const ref = useMemo(
    () =>
      user?.uid ? doc(db, "users", user.uid, "private", "settings") : null,
    [user]
  );

  useEffect(() => {
    if (!ref) {
      setLoading(false);
      return;
    }
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) setSettings((s) => ({ ...s, ...snap.data() }));
        setLoading(false);
      },
      (e) => {
        setErr("Failed to load settings");
        setLoading(false);
      }
    );
    return unsub;
  }, [ref]);

  const update = (k) => (e) =>
    setSettings((s) => ({
      ...s,
      [k]: e?.target?.type === "checkbox" ? e.target.checked : e.target.value,
    }));

  const save = async () => {
    if (!ref) return;
    setSaving(true);
    setErr("");
    try {
      await setDoc(ref, settings, { merge: true });
      enqueueSnackbar("Settings saved", { variant: "success" });
    } catch (e) {
      setErr("Could not save settings");
      enqueueSnackbar("Save failed", { variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box p={{ xs: 2, md: 4 }}>
      <Paper sx={{ p: 3, maxWidth: 820, mx: "auto" }}>
        <Typography variant="h5" fontWeight={800} gutterBottom>
          Settings
        </Typography>
        {!!err && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {err}
          </Alert>
        )}

        <Stack spacing={3}>
          <Box>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              Appearance
            </Typography>
            <TextField
              label="Theme"
              select
              value={settings.theme}
              onChange={update("theme")}
              sx={{ width: 260 }}
              disabled={loading}
            >
              <MenuItem value="system">System</MenuItem>
              <MenuItem value="light">Light</MenuItem>
              <MenuItem value="dark">Dark</MenuItem>
            </TextField>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              Localization
            </Typography>
            <TextField
              label="Language"
              select
              value={settings.language}
              onChange={update("language")}
              sx={{ width: 260 }}
              disabled={loading}
            >
              <MenuItem value="en">EN</MenuItem>
              <MenuItem value="es">ES</MenuItem>
              <MenuItem value="fr">FR</MenuItem>
            </TextField>
            <TextField
              label="Units"
              select
              value={settings.units}
              onChange={update("units")}
              sx={{ width: 260, ml: { md: 2 }, mt: { xs: 2, md: 0 } }}
              disabled={loading}
            >
              <MenuItem value="imperial">Imperial (mi, ft)</MenuItem>
              <MenuItem value="metric">Metric (km, m)</MenuItem>
            </TextField>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              Notifications
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.notifications}
                  onChange={update("notifications")}
                />
              }
              label="Trip updates & receipts"
              disabled={loading}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={settings.marketingEmails}
                  onChange={update("marketingEmails")}
                />
              }
              label="Marketing emails"
              disabled={loading}
            />
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              Privacy
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.diagnostics}
                  onChange={update("diagnostics")}
                />
              }
              label="Share anonymous diagnostics"
              disabled={loading}
            />
          </Box>

          <Box>
            <Button
              variant="contained"
              onClick={save}
              disabled={saving || loading}
            >
              {saving ? <CircularProgress size={22} /> : "Save"}
            </Button>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
}
