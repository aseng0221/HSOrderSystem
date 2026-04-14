jest.mock('react-native-geolocation-service', () => ({
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
  clearWatch: jest.fn(),
  stopObserving: jest.fn(),
}));

jest.mock('react-native-device-info', () => ({
  isEmulator: jest.fn().mockResolvedValue(true),
}));

jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: jest.fn(objs => objs.ios),
  },
  PermissionsAndroid: {
    request: jest.fn(),
    RESULTS: {
      GRANTED: 'granted',
    },
    PERMISSIONS: {
      ACCESS_FINE_LOCATION: 'ACCESS_FINE_LOCATION',
    },
  },
}));

import {calculateDistance} from './location';

describe('location utilities', () => {
  describe('calculateDistance', () => {
    it('calculates the distance between Miri Airport and City Fan (approx 10km)', () => {
      // Miri Airport: 4.3220, 113.9870
      // Miri City Fan: 4.4100, 113.9930
      const distance = calculateDistance(4.322, 113.987, 4.41, 113.993);

      // Expected distance is roughly 9.8km
      expect(distance).toBeGreaterThan(9.5);
      expect(distance).toBeLessThan(10.5);
    });

    it('returns 0 for the same coordinates', () => {
      const distance = calculateDistance(4.41, 113.993, 4.41, 113.993);
      expect(distance).toBe(0);
    });

    it('calculates short distances correctly', () => {
      // Two points very close to each other
      const distance = calculateDistance(4.41, 113.993, 4.4101, 113.9931);
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(0.1);
    });
  });
});
