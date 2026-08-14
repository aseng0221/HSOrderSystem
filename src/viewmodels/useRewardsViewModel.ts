import {useState, useEffect} from 'react';
import {
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  increment,
  collection,
  addDoc,
  serverTimestamp,
} from '@react-native-firebase/firestore';
import {db} from '../services/firebase';
import {useAuthViewModel} from './useAuthViewModel';
import {UserProfile} from '../types/user';

export const useRewardsViewModel = () => {
  const {user} = useAuthViewModel();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, snapshot => {
      if (snapshot.exists) {
        setProfile({id: snapshot.id, ...snapshot.data()} as UserProfile);
      } else {
        // Initialize user profile if it doesn't exist
        const initialProfile: Omit<UserProfile, 'id'> = {
          points: 0,
        };
        setDoc(userRef, initialProfile, {merge: true});
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const checkIn = async () => {
    if (!user) {
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today

    if (
      profile?.lastCheckInDate &&
      profile.lastCheckInDate >= today.getTime()
    ) {
      return false; // Already checked in today
    }

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        points: increment(10), // Example: 10 points for check-in
        lastCheckInDate: new Date().getTime(),
      });

      // Add points history record
      const historyRef = collection(db, 'users', user.uid, 'point_history');
      await addDoc(historyRef, {
        amount: 10,
        description: 'daily check-in',
        createdAt: serverTimestamp(),
      });

      return true;
    } catch (error) {
      console.error('Error during check-in:', error);
      return false;
    }
  };

  const addPointsForPurchase = async (amount: number) => {
    if (!user) {
      return;
    }

    const pointsEarned = Math.floor(amount); // 1 point per RM1, round down
    if (pointsEarned <= 0) {
      return;
    }

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        points: increment(pointsEarned),
      });
    } catch (error) {
      console.error('Error adding points for purchase:', error);
    }
  };

  return {
    profile,
    loading,
    checkIn,
    addPointsForPurchase,
  };
};
