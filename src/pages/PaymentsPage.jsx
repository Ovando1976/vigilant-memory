import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Stack,
  Button,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Skeleton,
  Alert,
} from "@mui/material";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AddCardIcon from "@mui/icons-material/AddCard";
import { useAuth } from "../context/AuthContext";
import { useSnackbar } from "../components/SnackbarProvider";
import StripeCheckoutForm from "../components/StripeCheckoutForm";

/**
 * Notes:
 * - Replace stubs (fetchPaymentMethods, detachPaymentMethod, setDefaultPaymentMethod)
 *   with real calls to your backend where you integrate with Stripe customers.
 * - We optimistically update UI and show toasts via SnackbarProvider.
 */

export default function PaymentsPage() {
  const { user } = useAuth();
  const { showSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [pm, setPm] = useState([]); // payment methods
  const [defaultPm, setDefaultPm] = useState(null);
  const [adding, setAdding] = useState(false);
  const [err, setErr] = useState("");

  const authed = !!user;
  const uid = user?.uid ?? null;

  // ---- stubs to be replaced with real backend calls ----
  const fetchPaymentMethods = async () => {
    // TODO: GET /api/stripe/payment-methods
    return { methods: [], defaultId: null };
  };
  const detachPaymentMethod = async (paymentMethodId) => {
    // TODO: POST /api/stripe/detach-payment-method
    return true;
  };
  const setDefaultPaymentMethod = async (paymentMethodId) => {
    // TODO: POST /api/stripe/set-default-payment-method
    return true;
  };
  // ------------------------------------------------------

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        if (!authed) throw new Error("Not signed in");
        const res = await fetchPaymentMethods();
        if (!alive) return;
        setPm(res.methods || []);
        setDefaultPm(res.defaultId || null);
      } catch (e) {
        if (!alive) return;
        setErr(e.message || "Failed to load payment methods");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [authed]);

  const onDetach = async (id) => {
    try {
      const prev = pm;
      setPm((x) => x.filter((m) => m.id !== id));
      if (defaultPm === id) setDefaultPm(null);
      const ok = await detachPaymentMethod(id);
      if (!ok) throw new Error("Detach failed");
      showSnackbar("Card removed.", "success");
    } catch (e) {
      setErr(e.message || "Could not remove card.");
      // Optional: refetch to restore server truth
    }
  };

  const onMakeDefault = async (id) => {
    try {
      const prev = defaultPm;
      setDefaultPm(id);
      const ok = await setDefaultPaymentMethod(id);
      if (!ok) throw new Error("Default change failed");
      showSnackbar("Default card updated.", "success");
    } catch (e) {
      setErr(e.message || "Could not set default card.");
    }
  };

  return (
    <Box p={{ xs: 2, md: 3 }}>
      <Typography variant="h5" fontWeight={800} gutterBottom>
        Payments
      </Typography>
      {!!err && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {err}
        </Alert>
      )}

      <Paper sx={{ p: 2, mb: 2 }} variant="outlined">
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Typography variant="subtitle1" fontWeight={700}>
            Saved cards
          </Typography>
          <Button
            startIcon={<AddCardIcon />}
            variant={adding ? "outlined" : "contained"}
            onClick={() => setAdding((v) => !v)}
          >
            {adding ? "Cancel" : "Add card"}
          </Button>
        </Stack>

        {adding && (
          <Box mt={2}>
            {/* Your Stripe elements form; expects your publishable key & clientSecret (handled in the component) */}
            <StripeCheckoutForm
              onSuccess={() => {
                setAdding(false);
                // After a successful attach, refresh list:
                (async () => {
                  setLoading(true);
                  const res = await fetchPaymentMethods();
                  setPm(res.methods || []);
                  setDefaultPm(res.defaultId || null);
                  setLoading(false);
                })();
                showSnackbar("Card added.", "success");
              }}
            />
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        {loading ? (
          <List dense>
            {Array.from({ length: 3 }).map((_, i) => (
              <ListItem key={i}>
                <ListItemIcon>
                  <Skeleton variant="circular" width={24} height={24} />
                </ListItemIcon>
                <ListItemText
                  primary={<Skeleton width="40%" />}
                  secondary={<Skeleton width="25%" />}
                />
              </ListItem>
            ))}
          </List>
        ) : pm.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No saved cards yet. Add a payment method to speed up checkout.
          </Typography>
        ) : (
          <List dense>
            {pm.map((m) => (
              <ListItem
                key={m.id}
                secondaryAction={
                  <Stack direction="row" spacing={0.5}>
                    {defaultPm === m.id ? (
                      <Chip
                        size="small"
                        color="success"
                        icon={<CheckCircleIcon />}
                        label="Default"
                      />
                    ) : (
                      <Button size="small" onClick={() => onMakeDefault(m.id)}>
                        Make default
                      </Button>
                    )}
                    <IconButton
                      edge="end"
                      aria-label="remove"
                      onClick={() => onDetach(m.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Stack>
                }
              >
                <ListItemIcon>
                  <CreditCardIcon />
                </ListItemIcon>
                <ListItemText
                  primary={`${m.brand?.toUpperCase() || "CARD"} •••• ${
                    m.last4 || "••••"
                  }`}
                  secondary={`exp ${m.exp_month || "••"}/${m.exp_year || "••"}`}
                />
              </ListItem>
            ))}
          </List>
        )}
      </Paper>

      <Paper sx={{ p: 2 }} variant="outlined">
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          Receipts
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Coming soon — download receipts for each completed trip here.
        </Typography>
      </Paper>
    </Box>
  );
}
