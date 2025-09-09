import React, { useMemo, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  MenuItem,
  Button,
  Stack,
  Alert,
  CircularProgress,
} from "@mui/material";
import { useAuth } from "../context/AuthContext";
import { db } from "../lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useSnackbar } from "../components/SnackbarProvider";

const CATEGORIES = ["rider", "driver", "payments", "app", "other"];
const SEVERITIES = ["low", "normal", "high", "urgent"];

export default function SupportPage() {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [form, setForm] = useState({
    email: user?.email || "",
    category: "rider",
    severity: "normal",
    subject: "",
    message: "",
  });
  const isValid = useMemo(
    () =>
      form.email?.includes("@") &&
      form.subject.trim().length >= 3 &&
      form.message.trim().length >= 10,
    [form]
  );
  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    setErr("");
    if (!isValid) {
      setErr(
        "Enter a valid email, subject (≥ 3 chars) and message (≥ 10 chars)."
      );
      return;
    }
    setSaving(true);
    try {
      await addDoc(collection(db, "supportTickets"), {
        ...form,
        uid: user?.uid || null,
        createdAt: serverTimestamp(),
        status: "open",
        app: "usvi-explorer",
      });
      enqueueSnackbar("Ticket submitted — we’ll get back to you shortly.", {
        variant: "success",
      });
      setForm((f) => ({ ...f, subject: "", message: "" }));
    } catch (e) {
      setErr("Could not submit ticket. Please try again.");
      enqueueSnackbar("Submit failed", { variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box p={{ xs: 2, md: 4 }}>
      <Paper sx={{ p: 3, maxWidth: 720, mx: "auto" }}>
        <Typography variant="h5" fontWeight={800} gutterBottom>
          Support
        </Typography>
        {!!err && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {err}
          </Alert>
        )}
        <Stack spacing={2}>
          <TextField
            label="Email"
            value={form.email}
            onChange={update("email")}
            type="email"
          />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label="Category"
              select
              value={form.category}
              onChange={update("category")}
              sx={{ minWidth: 220 }}
            >
              {CATEGORIES.map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Severity"
              select
              value={form.severity}
              onChange={update("severity")}
              sx={{ minWidth: 220 }}
            >
              {SEVERITIES.map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
          <TextField
            label="Subject"
            value={form.subject}
            onChange={update("subject")}
          />
          <TextField
            label="Message"
            value={form.message}
            onChange={update("message")}
            multiline
            minRows={5}
          />
          <Box>
            <Button variant="contained" onClick={submit} disabled={saving}>
              {saving ? <CircularProgress size={22} /> : "Submit ticket"}
            </Button>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
}
