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
          navigationRef.navigate(
            remoteMessage.data.screen as any,
            remoteMessage.data.params,
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
    const unsubscribeAuth = auth().onAuthStateChanged(user => {
      if (unsubscribeOrders) {
        unsubscribeOrders();
        unsubscribeOrders = undefined;
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
                      [{text: 'OK'}],
                    );
                  } else if (currentStatus === 'completed') {
                    Alert.alert(
                      'Order Completed! 🎉',
                      'Enjoy your drink! Thank you for ordering from NextDoor.',
                      [{text: 'OK'}],
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
      }
    });

    return () => {
      unsubscribeForeground();
      unsubscribeBackground();
      if (unsubscribeOrders) {
        unsubscribeOrders();
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
