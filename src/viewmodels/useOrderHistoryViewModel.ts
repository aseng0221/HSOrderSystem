import {useState, useEffect} from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from '@react-native-firebase/firestore';
import {db} from '../services/firebase';
import {Order} from '../types/order';
import {useAuthViewModel} from './useAuthViewModel';

export const useOrderHistoryViewModel = () => {
  const {user} = useAuthViewModel();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!user) {
      setOrders([]);
      setLoading(false);
      return;
    }

    const ordersRef = collection(db, 'orders');
    const q = query(
      ordersRef,
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
    );

    const unsubscribe = onSnapshot(
      q,
      snapshot => {
        const fetchedOrders: Order[] = [];
        snapshot.forEach(doc => {
          fetchedOrders.push({
            id: doc.id,
            ...(doc.data() as Omit<Order, 'id'>),
          });
        });
        setOrders(fetchedOrders);
        setLoading(false);
      },
      error => {
        console.error('Error fetching orders:', error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [user]);

  const createOrder = async (orderData: Omit<Order, 'id' | 'createdAt'>) => {
    try {
      const ordersRef = collection(db, 'orders');
      const newOrder = {
        ...orderData,
        createdAt: serverTimestamp(),
      };
      const docRef = await addDoc(ordersRef, newOrder);
      return docRef.id;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  };

  return {
    orders,
    loading,
    createOrder,
  };
};
