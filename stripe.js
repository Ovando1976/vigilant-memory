const Stripe = require('stripe');
const logger = (() => {
  try {
    // eslint-disable-next-line global-require
    return require('./logger');
  } catch {
    return console;
  }
})();

function initStripe(secretKey) {
  return new Stripe(secretKey);
}

function handleEvent(event) {
  switch (event.type) {
    case 'payment_intent.succeeded': {
      const pi = event.data.object;
      logger.info(`PaymentIntent ${pi.id} succeeded`);
      break;
    }
    case 'checkout.session.completed': {
      const session = event.data.object;
      logger.info(`Checkout session ${session.id} completed`);
      break;
    }
    default:
      logger.info(`Unhandled Stripe event: ${event.type}`);
  }
}

module.exports = { initStripe, handleEvent };
