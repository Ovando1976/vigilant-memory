import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import DriverRequestPage from '../pages/DriverRequestPage';
import { MemoryRouter } from 'react-router-dom';

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (str) => str }) }));

jest.mock('../lib/getTaxiRouteSummaryFromFirestore');
import { getTaxiRouteSummaryFromFirestore } from '../lib/getTaxiRouteSummaryFromFirestore';

jest.mock('../lib/firebase', () => ({
  auth: {
    onAuthStateChanged: (cb) => {
      cb({ email: 'driver@example.com' });
      return jest.fn();
    },
  },
}));

jest.mock('../components/RoutePreviewMap', () => ({
  RoutePreviewMap: () => <div data-testid="route-preview-map" />,
}));

describe('DriverRequestPage', () => {
  it('shows route summary and user email', async () => {
    getTaxiRouteSummaryFromFirestore.mockResolvedValue({ fare: 25, durationMin: 15 });

    render(
      <MemoryRouter initialEntries={["/driver-request?pickup=Adelphi&dropoff=Bolongo&passengers=2"]}>
        <DriverRequestPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Track Ride')).toBeInTheDocument();
    expect(screen.getByText('driver@example.com')).toBeInTheDocument();

    await waitFor(() => expect(getTaxiRouteSummaryFromFirestore).toHaveBeenCalled());

    expect(screen.getByText(/ETA:/)).toHaveTextContent('15 min');
    expect(screen.getByText(/Estimated Fare:/)).toHaveTextContent('$25.00');
    expect(screen.getByTestId('route-preview-map')).toBeInTheDocument();
  });
});
