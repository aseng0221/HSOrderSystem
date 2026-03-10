import { getAuth } from '@react-native-firebase/auth';
import { getFirestore, collection } from '@react-native-firebase/firestore';

export const firebaseAuth = getAuth();
export const db = getFirestore();

// Helper to get collection reference (Modular convenience)
export const collections = {
  users: () => collection(db, 'users'),
  menu: () => collection(db, 'menu'),
  orders: () => collection(db, 'orders'),
  branches: () => collection(db, 'branches'),
};
