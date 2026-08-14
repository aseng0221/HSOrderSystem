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
  doc,
  updateDoc,
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
        const now = new Date().getTime();

        for (const docSnap of snapshot.docs) {
          const data = docSnap.data();
          const orderId = docSnap.id;
          let status = data.status;

          if (data.paymentStatus === 'unpaid' && status !== 'cancelled' && data.createdAt) {
            const createdAtDate = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
            const diffMins = (now - createdAtDate.getTime()) / 1000 / 60;
            if (diffMins > 15) {
              status = 'cancelled';
              try {
                const orderDocRef = doc(db, 'orders', orderId);
                await updateDoc(orderDocRef, {status: 'cancelled'});
              } catch (e) {
                console.error(`Failed to auto-cancel expired order ${orderId}:`, e);
              }
            }
          }

          fetchedOrders.push({
            id: orderId,
            ...(data as Omit<Order, 'id'>),
            status,
          });
        }

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

  const updateOrderPaymentStatus = async (
    orderId: string,
    paymentStatus: 'paid' | 'unpaid',
  ) => {
    try {
      const orderDocRef = doc(db, 'orders', orderId);
      await updateDoc(orderDocRef, {paymentStatus});
      // Refresh the orders list to reflect the update
      fetchOrders(false);
    } catch (error) {
      console.error('Error updating order payment status:', error);
      throw error;
    }
  };

  const cancelOrder = async (orderId: string) => {
    try {
      const orderDocRef = doc(db, 'orders', orderId);
      await updateDoc(orderDocRef, {status: 'cancelled'});
      // Refresh the orders list to reflect the update
      fetchOrders(false);
    } catch (error) {
      console.error('Error cancelling order:', error);
      throw error;
    }
  };

  const updateOrderDetails = async (
    orderId: string,
    updates: Partial<Omit<Order, 'id' | 'createdAt'>>,
  ) => {
    try {
      const orderDocRef = doc(db, 'orders', orderId);
      await updateDoc(orderDocRef, updates);
      // Refresh the orders list to reflect the update
      fetchOrders(false);
    } catch (error) {
      console.error('Error updating order details:', error);
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
    updateOrderPaymentStatus,
    cancelOrder,
    updateOrderDetails,
  };
};
