// src/stripe.js
import { loadStripe } from "@stripe/stripe-js";

/**
 * IMPORTANT:
 * - Must be created at module scope (not inside a component),
 *   so React Elements receives a stable Promise instance.
 * - Never pass a raw string or a Stripe instance to <Elements>.
 */
const pk = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || "";

if (!pk) {
  // In dev you may prefer to warn rather than throw
  /* eslint-disable no-console */
  console.warn(
    "[Stripe] Missing REACT_APP_STRIPE_PUBLISHABLE_KEY. " +
      "Elements will render without Stripe until you provide one."
  );
}

export const stripePromise = pk ? loadStripe(pk /*, { apiVersion: "2024-06-20" } */) : Promise.resolve(null);