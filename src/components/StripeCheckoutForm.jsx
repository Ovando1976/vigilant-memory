import React from "react";
import {
  Alert, Box, Button, Stack, Typography, LinearProgress
} from "@mui/material";
import {
  PaymentElement,
  LinkAuthenticationElement,
  AddressElement,
  useStripe,
  useElements,
  PaymentRequestButtonElement,
} from "@stripe/react-stripe-js";

export default function CheckoutForm({ amount, currency, label }) {
  const stripe = useStripe();
  const elements = useElements();

  const [email, setEmail] = React.useState("");
  const [message, setMessage] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [paymentRequest, setPaymentRequest] = React.useState(null);

  // Apple Pay / Google Pay via Payment Request API
  React.useEffect(() => {
    if (!stripe) return;
    const pr = stripe.paymentRequest({
      country: "US",
      currency,
      total: {
        label,
        amount, // cents
      },
      requestPayerName: true,
      requestPayerEmail: true,
      requestShipping: false,
    });

    pr.canMakePayment().then((result) => {
      if (result) setPaymentRequest(pr);
    });
  }, [stripe, amount, currency, label]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);

    if (!stripe || !elements) return;

    setLoading(true);
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/success`,
        receipt_email: email || undefined,
      },
    });

    if (error) {
      // Immediate errors (validation, card declines without 3DS)
      setMessage(error.message || "Payment failed. Please try another method.");
      setLoading(false);
    } else {
      // 3DS or next_action will redirect to return_url automatically
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Stack spacing={2}>
        {paymentRequest && (
          <Box sx={{ mb: 1 }}>
            <PaymentRequestButtonElement
              options={{ paymentRequest }}
              style={{ paymentRequestButton: { type: "default", theme: "dark", height: "44px" } }}
            />
            <Typography variant="caption" color="text.secondary">
              Fast checkout with Apple Pay or Google Pay
            </Typography>
          </Box>
        )}

        <LinkAuthenticationElement
          onChange={(e) => setEmail(e.value.email)}
          options={{ defaultValues: { email } }}
        />

        {/* Optional address capture (remove if not needed) */}
        <AddressElement
          options={{ mode: "billing", fields: { phone: "optional" }, validation: { phone: "auto" } }}
        />

        <PaymentElement options={{ layout: "tabs" }} />

        {message && <Alert severity="error">{message}</Alert>}

        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={!stripe || !elements || loading}
        >
          {loading ? "Processing…" : `Pay ${(amount / 100).toLocaleString(undefined, {
            style: "currency",
            currency
          })}`}
        </Button>

        {loading && <LinearProgress />}
      </Stack>
    </Box>
  );
}