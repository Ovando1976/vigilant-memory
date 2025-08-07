// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock Stripe so tests remain deterministic
jest.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }) => <div>{children}</div>,
  CardElement: () => <div />,
  useStripe: () => ({}),
  useElements: () => ({ getElement: () => ({}) }),
}));

jest.mock('@stripe/stripe-js', () => ({
  loadStripe: () => Promise.resolve({}),
}));
