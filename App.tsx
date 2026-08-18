import React, {useEffect} from 'react';
import {StatusBar} from 'react-native';
import AppNavigator, {navigationRef} from './src/navigation/AppNavigator';
import {CartProvider} from './src/context/CartContext';
import {OrderProvider} from './src/context/OrderContext';
import {notificationService} from './src/services/NotificationService';

import {SafeAreaProvider} from 'react-native-safe-area-context';

function App(): React.JSX.Element {
  useEffect(() => {
    // 1. Request Permission & Get Token
    notificationService.requestUserPermission();

    // 2. Setup Redirection Handler
    const handleNavigation = (remoteMessage: any) => {
      if (remoteMessage?.data?.screen) {
        const performNavigate = () => {
          if (navigationRef.isReady()) {
            let params = remoteMessage.data.params;
            if (typeof params === 'string') {
              try {
                params = JSON.parse(params);
              } catch (e) {
                console.error('Error parsing remote message params:', e);
              }
            }

            const currentRouteName = navigationRef.getCurrentRoute()?.name;
            if (currentRouteName === 'Splash') {
              // Reset stack: MainTabs at root, detail screen on top (wipes Splash & cancels its timer)
              navigationRef.reset({
                index: 1,
                routes: [
                  { name: 'MainTabs' },
                  { name: remoteMessage.data.screen, params: params }
                ]
              });
            } else {
              // If already logged in / on main tabs, just navigate normally
              (navigationRef as any).navigate(
                remoteMessage.data.screen,
                params,
              );
            }
          } else {
            // If navigation container is not ready yet, retry in 100ms
            setTimeout(performNavigate, 100);
          }
        };
        performNavigate();
      }
    };

    // 3. Listeners
    const unsubscribeForeground = notificationService.setupForegroundListener();
    const unsubscribeForegroundTap =
      notificationService.setupForegroundTapListener(handleNavigation);
    const unsubscribeBackground =
      notificationService.setupBackgroundTapListener(handleNavigation);
    notificationService.checkInitialNotification(handleNavigation);
    notificationService.checkInitialNotifeeNotification(handleNavigation);

    return () => {
      unsubscribeForeground();
      unsubscribeForegroundTap();
      unsubscribeBackground();
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
