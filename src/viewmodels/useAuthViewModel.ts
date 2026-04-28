import {useState, useEffect} from 'react';
import {
  onAuthStateChanged,
  signOut,
  FirebaseAuthTypes,
} from '@react-native-firebase/auth';
import {firebaseAuth} from '../services/firebase';
import {getFirestore, serverTimestamp, increment} from '@react-native-firebase/firestore';

export const useAuthViewModel = () => {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: () => void;

    const subscriber = onAuthStateChanged(firebaseAuth, async userState => {
      setUser(userState);

      if (userState) {
        // Synchronize user profile to Firestore whenever auth state is detected
        try {
          await getFirestore().collection('users').doc(userState.uid).set(
            {
              phoneNumber: userState.phoneNumber,
              lastLogin: serverTimestamp(),
              // Only set createdAt if it doesn't exist
              createdAt: serverTimestamp(),
            },
            {merge: true},
          );

          // Listen to wallet balance updates
          unsubscribeProfile = getFirestore()
            .collection('users')
            .doc(userState.uid)
            .onSnapshot(doc => {
              if (doc.exists) {
                const data = doc.data();
                setWalletBalance(data?.walletBalance || 0);
              }
            });
        } catch (error) {
          console.error('Error syncing user to Firestore:', error);
        }
      } else {
        setWalletBalance(0);
      }
      setLoading(false);
    });

    return () => {
      subscriber();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, []);

  const logout = async () => {
    try {
      await signOut(firebaseAuth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const updateWalletBalance = async (amount: number) => {
    if (!user) {
      return;
    }
    try {
      await getFirestore()
        .collection('users')
        .doc(user.uid)
        .update({
          walletBalance: increment(amount),
        });
    } catch (error) {
      console.error('Error updating wallet balance:', error);
      throw error;
    }
  };

  return {
    user,
    walletBalance,
    loading,
    isAuthenticated: !!user,
    logout,
    updateWalletBalance,
  };
};
