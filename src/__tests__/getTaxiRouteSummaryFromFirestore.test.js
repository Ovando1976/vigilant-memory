import { getTaxiRouteSummaryFromFirestore } from '../lib/getTaxiRouteSummaryFromFirestore';

jest.mock('../lib/firebase', () => ({ db: {} }));
const mockGetDocs = jest.fn();
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: (...args) => mockGetDocs(...args),
}));

jest.mock('../data/coords', () => ({
  locationCoords: {
    A: { lat: 0, lng: 0 },
    B: { lat: 0, lng: 1 },
  },
}));

describe('getTaxiRouteSummaryFromFirestore', () => {
  beforeEach(() => {
    mockGetDocs.mockReset();
  });

  it('returns null for invalid input', async () => {
    const result = await getTaxiRouteSummaryFromFirestore('', 'B');
    expect(result).toBeNull();
  });

  it('returns firestore result when snapshot found', async () => {
    mockGetDocs.mockResolvedValue({
      empty: false,
      docs: [{ data: () => ({ onePerson: 10, twoPlus: 2, durationMin: 20 }) }],
    });
    const result = await getTaxiRouteSummaryFromFirestore('A', 'B', 2);
    expect(result).toEqual({ fare: 12, durationMin: 20, source: 'firestore' });
  });

  it('falls back to Haversine when no firestore data', async () => {
    mockGetDocs.mockResolvedValue({ empty: true, docs: [] });
    const result = await getTaxiRouteSummaryFromFirestore('A', 'B', 1);

    const R = 6371;
    const dLat = 0;
    const dLng = (1 * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(0) * Math.cos(0) * Math.sin(dLng / 2) ** 2;
    const distance = R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
    const expectedFare = Math.round((5 + distance * 3) * 100) / 100;
    const expectedDuration = Math.round((distance / 25) * 60);

    expect(result).toEqual({
      fare: expectedFare,
      durationMin: expectedDuration,
      source: 'fallback',
    });
  });
});
