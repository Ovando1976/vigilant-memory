import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { BottomNav } from '../components/driver/BottomNav';
import EarningsChart from '../components/driver/EarningsChart';
import KpiCard from '../components/driver/KpiCard';
import KpiRow from '../components/driver/KpiRow';
import LiveMap from '../components/driver/LiveMap';
import RideCard from '../components/driver/RideCard';
import { RideQueue } from '../components/driver/RideQueue';
import Sidebar from '../components/driver/Sidebar';

jest.mock('../hooks/useGoogleMaps', () => jest.fn());
const useGoogleMaps = require('../hooks/useGoogleMaps');
useGoogleMaps.mockReturnValue({ isLoaded: false, loadError: false });

jest.mock('../context/ArgonControllerContext', () => ({
  useArgonController: () => [{ darkMode: false, gtaMode: false }, jest.fn()],
}));

jest.mock('@react-google-maps/api', () => ({
  GoogleMap: ({ children }) => <div data-testid="google-map">{children}</div>,
  Marker: () => <div data-testid="marker" />,
  Polyline: () => <div data-testid="polyline" />,
}));

describe('driver components', () => {
  test('BottomNav renders nav items', () => {
    render(<BottomNav />);
    expect(screen.getByText('Requests')).toBeInTheDocument();
    expect(screen.getByText('Earnings')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  test('EarningsChart renders placeholder', () => {
    render(<EarningsChart />);
    expect(screen.getByText(/Earnings Chart/)).toBeInTheDocument();
  });

  test('KpiCard shows delta styling', () => {
    const { container: neg } = render(
      <KpiCard title="Trips" value="10" delta="-5%" />
    );
    expect(neg.querySelector('p.text-red-500')).toHaveTextContent('-5%');

    const { container: pos } = render(
      <KpiCard title="Trips" value="10" delta="5%" />
    );
    expect(pos.querySelector('p.text-emerald-500')).toHaveTextContent('5%');
  });

  test('KpiRow lists three KPIs', () => {
    render(<KpiRow />);
    expect(screen.getByText(/Today.?s Rides/)).toBeInTheDocument();
    expect(screen.getByText(/Earnings/)).toBeInTheDocument();
    expect(screen.getByText(/Rating/)).toBeInTheDocument();
  });

  test('LiveMap shows loader when not loaded', () => {
    render(<LiveMap />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  test('RideCard triggers accept', () => {
    const ride = {
      id: '1',
      pickupText: 'A',
      dropoffText: 'B',
      passengers: 2,
      fare: 10,
    };
    const onAccept = jest.fn();
    const { getByRole, rerender } = render(
      <RideCard ride={ride} onAccept={onAccept} />
    );
    fireEvent.click(getByRole('button'));
    expect(onAccept).toHaveBeenCalledWith('1');

    rerender(<RideCard ride={ride} onAccept={onAccept} accepting />);
    expect(getByRole('button')).toHaveTextContent('Accepting');
  });

  test('RideQueue handles empty and populated lists', () => {
    const onAccept = jest.fn();
    const { rerender } = render(<RideQueue rides={[]} onAccept={onAccept} />);
    expect(screen.getByText(/No pending rides/)).toBeInTheDocument();

    const rides = [
      { id: '1', pickup: 'A', dropoff: 'B', passengerCount: 2 },
    ];
    rerender(<RideQueue rides={rides} onAccept={onAccept} />);
    fireEvent.click(screen.getByText('A → B'));
    expect(onAccept).toHaveBeenCalledWith('1');
  });

  test('Sidebar renders brand and toggle', () => {
    render(
      <MemoryRouter initialEntries={['/driver']}>
        <Sidebar pendingRides={3} />
      </MemoryRouter>
    );
    expect(screen.getByText(/Driver\s*Hub/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Open sidebar/i })).toBeInTheDocument();
  });
});
