import { render, screen, fireEvent } from '@testing-library/react';
import ChatPage from '../pages/ChatPage';

test('user can send a message', () => {
  render(<ChatPage />);
  const input = screen.getByPlaceholderText(/type a message/i);
  fireEvent.change(input, { target: { value: 'Hello' } });
  fireEvent.click(screen.getByText(/send/i));
  expect(screen.getByText('Hello')).toBeInTheDocument();
});
