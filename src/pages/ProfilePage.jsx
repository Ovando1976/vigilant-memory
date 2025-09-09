import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Stack,
  Avatar,
  Alert,
  CircularProgress,
} from "@mui/material";
import { useAuth } from "../context/AuthContext";
import { db } from "../lib/firebase";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { useSnackbar } from "../components/SnackbarProvider";

const sanitizePhone = (s = "") => s.replace(/[^\d+]/g, "").slice(0, 20);

export default function ProfilePage() {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const ref = useMemo(
    () => (user?.uid ? doc(db, "users", user.uid) : null),
    [user]
  );

  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!ref) {
      setLoading(false);
      return;
    }
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const base = {
          name: user?.displayName || "",
          email: user?.email || "",
          phone: "",
        };
        const data = snap.exists() ? { ...base, ...snap.data() } : base;
        setForm({
          name: data.name || "",
          email: data.email || "",
          phone: data.phone || "",
        });
        setLoading(false);
      },
      (e) => {
        setErr("Failed to load profile");
        setLoading(false);
      }
    );
    return unsub;
  }, [ref, user]);

  const update = (k) => (e) =>
    setForm((f) => ({
      ...f,
      [k]: k === "phone" ? sanitizePhone(e.target.value) : e.target.value,
    }));

  const save = async () => {
    if (!ref) return;
    setSaving(true);
    setErr("");
    try {
      await setDoc(
        ref,
        { name: form.name, phone: form.phone, email: form.email },
        { merge: true }
      );
      if (user && form.name && user.displayName !== form.name) {
        await updateProfile(user, { displayName: form.name }).catch(() => {});
      }
      enqueueSnackbar("Profile saved", { variant: "success" });
    } catch (e) {
      setErr("Could not save profile");
      enqueueSnackbar("Save failed", { variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box p={{ xs: 2, md: 4 }}>
      <Paper sx={{ p: 3, maxWidth: 720, mx: "auto" }}>
        <Typography variant="h5" fontWeight={800} gutterBottom>
          Profile
        </Typography>
        {!!err && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {err}
          </Alert>
        )}
        <Stack spacing={2} sx={{ maxWidth: 520 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar sx={{ width: 56, height: 56 }}>
              {(form.name || form.email || "?").charAt(0).toUpperCase()}
            </Avatar>
            <Typography variant="body2" color="text.secondary">
              {form.email || "No email"}
            </Typography>
          </Stack>
          <TextField
            label="Display name"
            value={form.name}
            onChange={update("name")}
            disabled={loading}
          />
          <TextField
            label="Phone"
            value={form.phone}
            onChange={update("phone")}
            disabled={loading}
          />
          <Box>
            <Button
              variant="contained"
              onClick={save}
              disabled={saving || loading}
            >
              {saving ? <CircularProgress size={22} /> : "Save changes"}
            </Button>
            <Button onClick={() => window.location.reload()} sx={{ ml: 1 }}>
              Reset
            </Button>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
}
