require('dotenv').config();
const logger = require('./logger');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  logger.error('STRIPE_SECRET_KEY environment variable is missing');
  process.exit(1);
}

const stripe = require('stripe')(stripeSecretKey);

const app = express();
const PORT = process.env.PORT || 5001;

const BASE_CLIENT_URL = process.env.BASE_CLIENT_URL || 'http://localhost:3000';
const MIN_CHARGE_CENTS = 50;

// Attempt to initialise Firestore via firebase-admin if available
let db = null;
try {
  const admin = require('firebase-admin');
  if (!admin.apps.length) {
    admin.initializeApp();
  }
  db = admin.firestore();
} catch (err) {
  logger.warn('⚠️  Firebase Admin not initialised:', err.message);
}

app.use(cors({ origin: BASE_CLIENT_URL }));
app.use(helmet());
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use(limiter);

app.use(express.json());

// Optional health check route
app.get('/api/health', (req, res) => {
  res.send('API is healthy');
});

app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { rideId, amountCents, pickup, dropoff } = req.body;

    // --------- Basic validation ---------
    if (typeof rideId !== 'string' || !rideId.trim()) {
      return res.status(400).json({
        error: 'invalid_ride_id',
        message: 'rideId must be a non-empty string',
      });
    }
    if (!Number.isInteger(amountCents)) {
      return res.status(400).json({
        error: 'invalid_amount',
        message: 'amountCents must be an integer',
      });
    }
    if (typeof pickup !== 'string' || !pickup.trim()) {
      return res.status(400).json({
        error: 'invalid_pickup',
        message: 'pickup must be provided',
      });
    }
    if (typeof dropoff !== 'string' || !dropoff.trim()) {
      return res.status(400).json({
        error: 'invalid_dropoff',
        message: 'dropoff must be provided',
      });
    }

    // --------- Firestore validation ---------
    if (!db) {
      return res.status(500).json({
        error: 'firestore_unavailable',
        message: 'Firestore not initialised',
      });
    }

    const rideSnap = await db.collection('rides').doc(rideId).get();
    if (!rideSnap.exists) {
      return res.status(404).json({
        error: 'ride_not_found',
        message: 'Ride not found',
      });
    }
    const rideData = rideSnap.data();
    const expectedAmount =
      typeof rideData.amountCents === 'number'
        ? rideData.amountCents
        : Math.round((rideData.fare || 0) * 100);

    if (amountCents !== expectedAmount) {
      return res.status(400).json({
        error: 'amount_mismatch',
        message: 'amountCents does not match ride record',
      });
    }

    if (amountCents < MIN_CHARGE_CENTS) {
      return res.status(400).json({
        error: 'amount_below_minimum',
        message: `Minimum charge is ${MIN_CHARGE_CENTS} cents`,
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: amountCents,
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
    logger.error('Stripe error:', err);
    res.status(500).json({ error: 'stripe_error' });
  }
});

app.listen(PORT, () => {
  logger.info(`API listening on http://localhost:${PORT}`);
});
