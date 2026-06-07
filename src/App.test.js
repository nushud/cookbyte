import { render, screen } from '@testing-library/react';
import App from './App';

test('renders CookByte header', () => {
  render(<App />);
  const heading = screen.getByRole('heading', { name: /CookByte/i });
  expect(heading).toBeInTheDocument();
});
