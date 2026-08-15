import React, {useEffect} from 'react';
import {StatusBar, Alert} from 'react-native';
import AppNavigator, {navigationRef} from './src/navigation/AppNavigator';
import {CartProvider} from './src/context/CartContext';
import {OrderProvider} from './src/context/OrderContext';
import {notificationService} from './src/services/NotificationService';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

import {SafeAreaProvider} from 'react-native-safe-area-context';

function App(): React.JSX.Element {
  useEffect(() => {
    // 1. Request Permission & Get Token
    notificationService.requestUserPermission();

    // 2. Setup Redirection Handler
    const handleNavigation = (remoteMessage: any) => {
      if (remoteMessage?.data?.screen) {
        // Wait for navigation container to be ready
        if (navigationRef.isReady()) {
          let params = remoteMessage.data.params;
          if (typeof params === 'string') {
            try {
              params = JSON.parse(params);
            } catch (e) {
              console.error('Error parsing remote message params:', e);
            }
          }
          (navigationRef as any).navigate(
            remoteMessage.data.screen,
            params,
          );
        }
      }
    };

    // 3. Listeners
    const unsubscribeForeground = notificationService.setupForegroundListener();
    const unsubscribeBackground =
      notificationService.setupBackgroundTapListener(handleNavigation);
    notificationService.checkInitialNotification(handleNavigation);

    // 4. Listen to user active orders transitioning to 'ready_to_pickup'
    let unsubscribeOrders: (() => void) | undefined;
    let unsubscribeTopups: (() => void) | undefined;
    const unsubscribeAuth = auth().onAuthStateChanged(user => {
      if (unsubscribeOrders) {
        unsubscribeOrders();
        unsubscribeOrders = undefined;
      }
      if (unsubscribeTopups) {
        unsubscribeTopups();
        unsubscribeTopups = undefined;
      }

      if (user) {
        const notifiedOrderIds = new Set<string>();
        let isFirstLoad = true;

        unsubscribeOrders = firestore()
          .collection('orders')
          .where('userId', '==', user.uid)
          .where('status', 'in', ['ready_to_pickup', 'completed'])
          .onSnapshot(
            snapshot => {
              if (!snapshot) return;

              snapshot.docs.forEach(doc => {
                const orderId = doc.id;
                const orderData = doc.data();
                const currentStatus = orderData.status;
                const notifiedKey = `${orderId}_${currentStatus}`;

                if (isFirstLoad) {
                  notifiedOrderIds.add(notifiedKey);
                } else if (!notifiedOrderIds.has(notifiedKey)) {
                  notifiedOrderIds.add(notifiedKey);

                  if (currentStatus === 'ready_to_pickup') {
                    const totalText = orderData.totalAmount
                      ? ` (RM ${orderData.totalAmount.toFixed(2)})`
                      : '';
                    Alert.alert(
                      'Order Ready! ☕️',
                      `Your order ${orderId}${totalText} is ready for pickup at the counter!`,
                      [
                        {text: 'Cancel', style: 'cancel'},
                        {
                          text: 'View Detail',
                          onPress: () => {
                            if (navigationRef.isReady()) {
                              navigationRef.navigate('OrderHistoryDetail' as never, {
                                order: { id: orderId, ...orderData }
                              } as never);
                            }
                          }
                        }
                      ],
                    );
                  } else if (currentStatus === 'completed') {
                    Alert.alert(
                      'Order Completed! 🎉',
                      'Enjoy your drink! Thank you for ordering from NextDoor.',
                      [
                        {text: 'Cancel', style: 'cancel'},
                        {
                          text: 'View Detail',
                          onPress: () => {
                            if (navigationRef.isReady()) {
                              navigationRef.navigate('OrderHistoryDetail' as never, {
                                order: { id: orderId, ...orderData }
                              } as never);
                            }
                          }
                        }
                      ],
                    );
                  }
                }
              });

              isFirstLoad = false;
            },
            err => {
              console.error('Error listening to active orders ready/completed states:', err);
            },
          );

        // 5. Listen to user top-ups transitioning status
        const notifiedTopupIds = new Set<string>();
        let isFirstTopupLoad = true;

        unsubscribeTopups = firestore()
          .collection('topups')
          .where('userId', '==', user.uid)
          .onSnapshot(
            snapshot => {
              if (!snapshot) return;

              snapshot.docs.forEach(doc => {
                const topupId = doc.id;
                const topupData = doc.data();
                const status = topupData.status;
                const notifiedKey = `${topupId}_${status}`;

                if (isFirstTopupLoad) {
                  notifiedTopupIds.add(notifiedKey);
                } else if (!notifiedTopupIds.has(notifiedKey)) {
                  notifiedTopupIds.add(notifiedKey);

                  if (status === 'approved') {
                    Alert.alert(
                      'Top Up Approved! 💰',
                      `Your top-up of RM ${(topupData.amount || 0).toFixed(2)} has been verified and approved successfully.`,
                      [
                        {text: 'Cancel', style: 'cancel'},
                        {
                          text: 'View Detail',
                          onPress: () => {
                            if (navigationRef.isReady()) {
                              navigationRef.navigate('WalletTransactionDetail' as never, {
                                id: topupId,
                                type: 'topup',
                              } as never);
                            }
                          },
                        },
                      ],
                    );
                  } else if (status === 'rejected') {
                    Alert.alert(
                      'Top Up Rejected ⚠️',
                      `Your top-up receipt of RM ${(topupData.amount || 0).toFixed(2)} verification failed. Tap to view and re-upload.`,
                      [
                        {text: 'Cancel', style: 'cancel'},
                        {
                          text: 'View Detail',
                          onPress: () => {
                            if (navigationRef.isReady()) {
                              navigationRef.navigate('WalletTransactionDetail' as never, {
                                id: topupId,
                                type: 'topup',
                              } as never);
                            }
                          },
                        },
                      ],
                    );
                  }
                }
              });

              isFirstTopupLoad = false;
            },
            err => {
              console.error('Error listening to topups:', err);
            },
          );
      }
    });

    return () => {
      unsubscribeForeground();
      unsubscribeBackground();
      if (unsubscribeOrders) {
        unsubscribeOrders();
      }
      if (unsubscribeTopups) {
        unsubscribeTopups();
      }
      unsubscribeAuth();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <OrderProvider>
        <CartProvider>
          <StatusBar barStyle="dark-content" />
          <AppNavigator />
        </CartProvider>
      </OrderProvider>
    </SafeAreaProvider>
  );
}

export default App;
