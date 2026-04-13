import {useState, useEffect, useCallback} from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  addDoc,
  serverTimestamp,
  QueryDocumentSnapshot,
  DocumentData,
} from '@react-native-firebase/firestore';
import {db} from '../services/firebase';
import {Order} from '../types/order';
import {useAuthViewModel} from './useAuthViewModel';

export const useOrderHistoryViewModel = () => {
  const {user} = useAuthViewModel();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchingMore, setFetchingMore] = useState<boolean>(false);
  const [lastVisible, setLastVisible] =
    useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(true);

  const fetchOrders = useCallback(
    async (isLoadMore = false) => {
      if (!user) {
        setOrders([]);
        setLoading(false);
        return;
      }

      if (isLoadMore) {
        if (!hasMore || fetchingMore) {
          return;
        }
        setFetchingMore(true);
      } else {
        setLoading(true);
        setHasMore(true);
        setLastVisible(null);
      }

      try {
        const ordersRef = collection(db, 'orders');
        let q = query(
          ordersRef,
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc'),
          limit(10),
        );

        if (isLoadMore && lastVisible) {
          q = query(
            ordersRef,
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc'),
            startAfter(lastVisible),
            limit(10),
          );
        }

        const snapshot = await getDocs(q);
        const fetchedOrders: Order[] = [];

        snapshot.forEach(doc => {
          fetchedOrders.push({
            id: doc.id,
            ...(doc.data() as Omit<Order, 'id'>),
          });
        });

        if (isLoadMore) {
          setOrders(prev => [...prev, ...fetchedOrders]);
        } else {
          setOrders(fetchedOrders);
        }

        if (snapshot.docs.length > 0) {
          setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
        }

        if (snapshot.docs.length < 10) {
          setHasMore(false);
        }
      } catch (error) {
        console.error('Error fetching orders:', error);
      } finally {
        setLoading(false);
        setFetchingMore(false);
      }
    },
    [user, hasMore, fetchingMore, lastVisible],
  );

  useEffect(() => {
    fetchOrders(false);
  }, [user]); // We only trigger on user change to load initial

  const createOrder = async (orderData: Omit<Order, 'id' | 'createdAt'>) => {
    try {
      const ordersRef = collection(db, 'orders');
      const newOrder = {
        ...orderData,
        createdAt: serverTimestamp(),
      };
      const docRef = await addDoc(ordersRef, newOrder);

      // Optionally re-fetch to include the new order at the top
      // We could also just let the user see it when they refresh
      // but doing a fresh fetch keeps it simple.
      fetchOrders(false);

      return docRef.id;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  };

  return {
    orders,
    loading,
    fetchingMore,
    hasMore,
    fetchOrders,
    createOrder,
  };
};
