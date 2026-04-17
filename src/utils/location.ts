import {PermissionsAndroid, Platform} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import DeviceInfo from 'react-native-device-info';

/**
 * Calculates the distance between two points in kilometers using the Haversine formula.
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
};

// Also export as getDistance for compatibility
export const getDistance = calculateDistance;

const deg2rad = (deg: number): number => {
  return deg * (Math.PI / 180);
};

export const getCurrentLocation = (): Promise<{
  latitude: number;
  longitude: number;
}> => {
  return new Promise(async (resolve, reject) => {
    try {
      const isEmulator = await DeviceInfo.isEmulator();
      if (isEmulator) {
        // Hardcoded Miri location for simulators/emulators
        console.log('Running on emulator, using hardcoded location.');
        return resolve({latitude: 4.3995, longitude: 113.9914});
      }

      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          // Fallback to Miri location or reject
          return resolve({latitude: 4.3995, longitude: 113.9914});
        }
      }

      Geolocation.getCurrentPosition(
        position => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        error => {
          console.warn('Geolocation error:', error);
          // Fallback to Miri center
          resolve({latitude: 4.3995, longitude: 113.9914});
        },
        {enableHighAccuracy: true, timeout: 15000, maximumAge: 10000},
      );
    } catch (e) {
      console.warn('Error checking emulator status:', e);
      resolve({latitude: 4.3995, longitude: 113.9914});
    }
  });
};
