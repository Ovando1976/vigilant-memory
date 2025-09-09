import { Elements, AddressElement } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

export default function DonatePage() {
  return (
    <Elements stripe={stripePromise}>
      <AddressElement
        options={{
          mode: "shipping", // or "billing"
          fields: { phone: "auto" }, // 'auto' | 'always' | 'never'
          // You can add allowedCountries, validation, etc., but keep it minimal if unsure
        }}
        onChange={(e) => {
          // e.complete, e.value, etc.
        }}
      />
    </Elements>
  );
}
