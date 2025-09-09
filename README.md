# USVI Explorer

Full-stack demo for exploring the U.S. Virgin Islands. The project uses a React front end with an Express/Node back end and includes optional Stripe payments and OpenAI powered chat.

## Development

```bash
npm install
npm start
```

The `start` script runs both the API server and the React dev server.

### Environment Variables

Create a `.env` file or set variables in your shell:

- `STRIPE_SECRET_KEY` – required for Stripe integration (begins with `sk_test_` or `sk_live_`).
- `STRIPE_WEBHOOK_SECRET` – optional; enables verification of incoming Stripe webhooks.
- `OPENAI_API_KEY` – optional; enables `/api/chat` routes.

### Testing

```bash
npm test
```

Runs the React testing suite.
