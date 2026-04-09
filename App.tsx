import React from 'react';
import {StatusBar} from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import {CartProvider} from './src/context/CartContext';
import {OrderProvider} from './src/context/OrderContext';

function App(): React.JSX.Element {
  return (
    <OrderProvider>
      <CartProvider>
        <StatusBar barStyle="dark-content" />
        <AppNavigator />
      </CartProvider>
    </OrderProvider>
  );
}

export default App;
