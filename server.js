require('dotenv').config();
console.log('Stripe secret key loaded:', process.env.STRIPE_SECRET_KEY ? '✅ YES' : '❌ MISSING');
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const app = express();
const PORT = 5001;

const BASE_CLIENT_URL = process.env.BASE_CLIENT_URL || 'http://localhost:3000';

app.use(express.json());

// Optional health check route
app.get('/api/health', (req, res) => {
  res.send('API is healthy');
});

app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { rideId, amountCents, pickup, dropoff } = req.body;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: amountCents < 50 ? 50 : amountCents, // Stripe minimum
            product_data: {
              name: 'Taxi ride',
              description: `${pickup} → ${dropoff}`,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${BASE_CLIENT_URL}/ridesharing/track/${rideId}`,
      cancel_url: `${BASE_CLIENT_URL}/ridesharing/confirmed/${rideId}`,
      metadata: { rideId },
    });

    res.json({ sessionId: session.id });
  } catch (err) {
    console.error('Stripe error:', err);
    res.status(500).json({ error: 'stripe_error' });
  }
});

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});