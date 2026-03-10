import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  SAVED_PHONE_NUMBER: 'saved_phone_number',
  BIOMETRIC_ENABLED: 'biometric_enabled',
};

export const saveUserPhone = async (phoneNumber: string) => {
  try {
    await AsyncStorage.setItem(KEYS.SAVED_PHONE_NUMBER, phoneNumber);
  } catch (error) {
    console.error('Error saving phone number:', error);
  }
};

export const getSavedPhone = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(KEYS.SAVED_PHONE_NUMBER);
  } catch (error) {
    console.error('Error getting phone number:', error);
    return null;
  }
};

export const setBiometricEnabled = async (enabled: boolean) => {
  try {
    await AsyncStorage.setItem(KEYS.BIOMETRIC_ENABLED, JSON.stringify(enabled));
  } catch (error) {
    console.error('Error setting biometric status:', error);
  }
};

export const isBiometricEnabled = async (): Promise<boolean> => {
  try {
    const value = await AsyncStorage.getItem(KEYS.BIOMETRIC_ENABLED);
    return value ? JSON.parse(value) : false;
  } catch (error) {
    console.error('Error getting biometric status:', error);
    return false;
  }
};

export const clearStoredData = async () => {
    try {
        await AsyncStorage.removeItem(KEYS.SAVED_PHONE_NUMBER);
        await AsyncStorage.removeItem(KEYS.BIOMETRIC_ENABLED);
    } catch (e) {
        console.error('Error clearing stored data:', e);
    }
};
