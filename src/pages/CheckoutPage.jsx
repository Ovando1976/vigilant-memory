import React from "react";
import {
  Container,
  Grid,
  Paper,
  Typography,
  Stack,
  Divider,
  Button,
  Chip,
  Alert,
  CircularProgress,
} from "@mui/material";
import { Elements } from "@stripe/react-stripe-js";

import CheckoutForm from "../components/StripeCheckoutForm";
import { useSearchParams } from "react-router-dom";

import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

function useOrderFromQuery() {
  const [params] = useSearchParams();
  const amount = Number(params.get("amount") || 0) || 1000; // cents
  const label = params.get("label") || "USVI Explorer Ride";
  const currency = (params.get("currency") || "usd").toLowerCase();
  return { amount, label, currency };
}

export default function CheckoutPage() {
  const { amount, label, currency } = useOrderFromQuery();
  const [clientSecret, setClientSecret] = React.useState(null);
  const [error, setError] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;
    async function createPI() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/create-payment-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            currency,
            amount, // or pass items: [{ name: label, amount, quantity: 1 }]
            metadata: { label },
          }),
        });
        const json = await res.json();
        if (!res.ok)
          throw new Error(json.error || "Failed to create payment intent");
        if (mounted) setClientSecret(json.clientSecret);
      } catch (e) {
        if (mounted) setError(e.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    createPI();
    return () => {
      mounted = false;
    };
  }, [amount, currency, label]);

  const appearance = React.useMemo(
    () => ({
      theme: "stripe",
      variables: {
        colorPrimary: "#0288d1", // harmonize with your light theme
        colorText: "var(--mui-palette-text-primary, #111)",
        borderRadius: "8px",
        spacingUnit: "6px",
      },
      rules: {
        ".Input": { borderRadius: "8px" },
        ".Block": { borderRadius: "10px" },
      },
    }),
    []
  );

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Grid container spacing={4}>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Typography variant="h5" fontWeight={800}>
                Checkout
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Pay securely with Stripe. We support Apple Pay / Google Pay,
                Link, cards, ACH, and more.
              </Typography>

              {error && <Alert severity="error">{error}</Alert>}

              {loading && (
                <Stack alignItems="center" sx={{ py: 6 }}>
                  <CircularProgress />
                </Stack>
              )}

              {!loading && clientSecret && (
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret,
                    appearance,
                    locale: "en",
                  }}
                >
                  <CheckoutForm
                    amount={amount}
                    currency={currency}
                    label={label}
                  />
                </Elements>
              )}
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={800}>
              Order summary
            </Typography>
            <Stack spacing={1.5} sx={{ mt: 2 }}>
              <Stack direction="row" justifyContent="space-between">
                <Typography>{label}</Typography>
                <Typography>
                  {(amount / 100).toLocaleString(undefined, {
                    style: "currency",
                    currency,
                  })}
                </Typography>
              </Stack>

              <Divider sx={{ my: 1.5 }} />

              <Stack direction="row" spacing={1} alignItems="center">
                <Chip label="Secure • PCI‑DSS" size="small" />
                <Chip label="3D Secure" size="small" />
                <Chip label="Link" size="small" />
              </Stack>

              <Alert severity="info" sx={{ mt: 2 }}>
                Use Stripe test cards like <strong>4242 4242 4242 4242</strong>{" "}
                in test mode.
              </Alert>

              {/* Optional: a “Pay with hosted Checkout” fallback */}
              <Button
                variant="text"
                onClick={async () => {
                  const res = await fetch("/api/create-checkout-session", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      mode: "payment",
                      price_data: {
                        currency,
                        unit_amount: amount,
                        product_data: { name: label },
                      },
                      success_url: `${window.location.origin}/checkout/success`,
                      cancel_url: `${window.location.origin}/checkout`,
                    }),
                  });
                  const json = await res.json();
                  if (json?.url) window.location.href = json.url;
                }}
              >
                Prefer Stripe‑hosted Checkout instead?
              </Button>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}
