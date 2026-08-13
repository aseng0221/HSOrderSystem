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
  const [profile, setProfile] = useState<any>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [profileCompleted, setProfileCompleted] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: () => void;

    const subscriber = onAuthStateChanged(firebaseAuth, async (userState: FirebaseAuthTypes.User | null) => {
      setUser(userState);

      if (userState) {
        // Synchronize user profile to Firestore whenever auth state is detected
        try {
          const userRef = getFirestore().collection('users').doc(userState.uid);
          const docSnap = await userRef.get();

          if (!docSnap.exists) {
            // Document does not exist: Initialize the profile with default values
            await userRef.set({
              email: userState.email || null,
              phoneNumber: userState.phoneNumber || null,
              points: 0,
              walletBalance: 0,
              createdAt: serverTimestamp(),
              lastLogin: serverTimestamp(),
            });
          } else {
            // Document exists: Update timestamps and conditionally add present fields
            const updateData: {
              lastLogin: ReturnType<typeof serverTimestamp>;
              email?: string | null;
              phoneNumber?: string | null;
            } = {
              lastLogin: serverTimestamp(),
            };
            if (userState.email) {
              updateData.email = userState.email;
            }
            if (userState.phoneNumber) {
              updateData.phoneNumber = userState.phoneNumber;
            }
            await userRef.update(updateData);
          }

          // Listen to wallet balance updates
          unsubscribeProfile = getFirestore()
            .collection('users')
            .doc(userState.uid)
            .onSnapshot(doc => {
              if (doc.exists) {
                const data = doc.data();
                setProfile(data);
                setWalletBalance(data?.walletBalance || 0);
                setProfileCompleted(!!data?.displayName && !!data?.phoneNumber);
              }
            });
        } catch (error) {
          console.error('Error syncing user to Firestore:', error);
        }
      } else {
        setProfile(null);
        setWalletBalance(0);
        setProfileCompleted(false);
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
    profile,
    walletBalance,
    profileCompleted,
    loading,
    isAuthenticated: !!user && user.emailVerified && profileCompleted,
    logout,
    updateWalletBalance,
  };
};
