import { Elements, AddressElement } from "@stripe/react-stripe-js";
import { stripePromise } from "../lib/stripe";

export default function DonatePage() {
  return (
    <Elements stripe={stripePromise}>
      <AddressElement
        options={{
          mode: "shipping",                    // or "billing"
          fields: { phone: "auto" },           // 'auto' | 'always' | 'never'
          // You can add allowedCountries, validation, etc., but keep it minimal if unsure
        }}
        onChange={(e) => {
          // e.complete, e.value, etc.
        }}
      />
    </Elements>
  );
}