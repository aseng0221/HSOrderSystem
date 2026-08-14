import {useState, useEffect} from 'react';
import {
  doc,
  onSnapshot,
  setDoc,
  collection,
  runTransaction,
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
      await runTransaction(db, async transaction => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists) {
          throw new Error('User does not exist!');
        }

        const previousPoints = userDoc.data()?.points || 0;
        const newPoints = previousPoints + 10;

        transaction.update(userRef, {
          points: newPoints,
          lastCheckInDate: new Date().getTime(),
        });

        const txRef = doc(collection(db, 'points_transactions'));
        transaction.set(txRef, {
          userId: user.uid,
          amount: 10,
          previousPoints,
          newPoints,
          description: 'Daily Check-In',
          createdAt: serverTimestamp(),
        });
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
      await runTransaction(db, async transaction => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists) {
          throw new Error('User does not exist!');
        }

        const previousPoints = userDoc.data()?.points || 0;
        const newPoints = previousPoints + pointsEarned;

        transaction.update(userRef, {
          points: newPoints,
        });

        const txRef = doc(collection(db, 'points_transactions'));
        transaction.set(txRef, {
          userId: user.uid,
          amount: pointsEarned,
          previousPoints,
          newPoints,
          description: 'Order Purchase',
          createdAt: serverTimestamp(),
        });
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
