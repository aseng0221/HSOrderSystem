import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, FirebaseAuthTypes } from '@react-native-firebase/auth';
import { firebaseAuth } from '../services/firebase';
import firestore from '@react-native-firebase/firestore';

export const useAuthViewModel = () => {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const subscriber = onAuthStateChanged(firebaseAuth, async (userState) => {
      setUser(userState);
      setLoading(false);

      if (userState) {
        // Synchronize user profile to Firestore whenever auth state is detected
        try {
          await firestore().collection('users').doc(userState.uid).set({
            phoneNumber: userState.phoneNumber,
            lastLogin: firestore.FieldValue.serverTimestamp(),
            // Only set createdAt if it doesn't exist
            createdAt: firestore.FieldValue.serverTimestamp(),
          }, { merge: true });
        } catch (error) {
          console.error('Error syncing user to Firestore:', error);
        }
      }
    });
    return subscriber;
  }, []);

  const logout = async () => {
    try {
      await signOut(firebaseAuth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return {
    user,
    loading,
    isAuthenticated: !!user,
    logout,
  };
};
