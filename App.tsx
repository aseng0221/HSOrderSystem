import React from 'react';
import {StatusBar} from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import {CartProvider} from './src/context/CartContext';
import {OrderProvider} from './src/context/OrderContext';
// import {StripeProvider} from '@stripe/stripe-react-native';
// import {KEYS} from './src/config/keys';

function App(): React.JSX.Element {
  return (
    // <StripeProvider publishableKey={KEYS.STRIPE.PUBLISHABLE_KEY}>
    <OrderProvider>
      <CartProvider>
        <StatusBar barStyle="dark-content" />
        <AppNavigator />
      </CartProvider>
    </OrderProvider>
    // </StripeProvider>
  );
}

export default App;
