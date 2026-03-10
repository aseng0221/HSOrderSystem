import React, {createContext, useContext, useState, ReactNode} from 'react';
import {Product} from '../viewmodels/useMenuViewModel';

export interface CartItem {
  id: string; // Unique ID for this specific cart entry (includes customizations)
  product: Product;
  quantity: number;
  selectedOptions: Record<string, string[]>; // groupId -> optionIds[]
  unitPrice: number;
}

interface CartContextType {
  cart: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, delta: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({children}: {children: ReactNode}) => {
  const [cart, setCart] = useState<CartItem[]>([]);

  const addItem = (newItem: CartItem) => {
    setCart(prev => {
      // Check if exact same item (same product + same options) already exists
      const existingIndex = prev.findIndex(
        item =>
          item.product.id === newItem.product.id &&
          JSON.stringify(item.selectedOptions) ===
            JSON.stringify(newItem.selectedOptions),
      );

      if (existingIndex !== -1) {
        const updated = [...prev];
        updated[existingIndex].quantity += newItem.quantity;
        return updated;
      }
      return [...prev, newItem];
    });
  };

  const removeItem = (itemId: string) => {
    setCart(prev => prev.filter(item => item.id !== itemId));
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart(prev =>
      prev
        .map(item => {
          if (item.id === itemId) {
            const newQty = Math.max(0, item.quantity + delta);
            return {...item, quantity: newQty};
          }
          return item;
        })
        .filter(item => item.quantity > 0),
    );
  };

  const clearCart = () => setCart([]);

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  );

  return (
    <CartContext.Provider
      value={{
        cart,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
      }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
