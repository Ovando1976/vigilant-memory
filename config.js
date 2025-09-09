function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not defined`);
  }
  return value;
}

function validateStripeKey(key) {
  if (!/^sk_(test|live)_/.test(key)) {
    throw new Error(
      `STRIPE_SECRET_KEY must start with sk_test_ or sk_live_. Got: ${key.slice(0, 8)}…`
    );
  }
  return key;
}

function loadConfig() {
  const PORT = Number(process.env.PORT || 5001);
  const BASE_CLIENT_URL = process.env.BASE_CLIENT_URL || 'http://localhost:3000';
  const STRIPE_SECRET_KEY = validateStripeKey(required('STRIPE_SECRET_KEY'));
  return {
    PORT,
    BASE_CLIENT_URL,
    STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || null,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || null,
  };
}

module.exports = { loadConfig };
