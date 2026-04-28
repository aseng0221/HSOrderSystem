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
        // Wait for navigation container to be ready
        if (navigationRef.isReady()) {
          navigationRef.navigate(remoteMessage.data.screen as any, remoteMessage.data.params);
        }
      }
    };

    // 3. Listeners
    const unsubscribeForeground = notificationService.setupForegroundListener();
    const unsubscribeBackground = notificationService.setupBackgroundTapListener(handleNavigation);
    notificationService.checkInitialNotification(handleNavigation);

    return () => {
      unsubscribeForeground();
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
