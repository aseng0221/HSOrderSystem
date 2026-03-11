import React from 'react';
import {StatusBar} from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import {CartProvider} from './src/context/CartContext';
import {OrderProvider} from './src/context/OrderContext';
import {StripeProvider} from '@stripe/stripe-react-native';

function App(): React.JSX.Element {
  return (
    <StripeProvider publishableKey="pk_test_123456789">
      <OrderProvider>
        <CartProvider>
          <StatusBar barStyle="dark-content" />
          <AppNavigator />
        </CartProvider>
      </OrderProvider>
    </StripeProvider>
  );
}

export default App;
