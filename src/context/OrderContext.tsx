import React, {createContext, useContext, useState, ReactNode} from 'react';
import {Branch} from '../types/branch';
import {Address} from '../types/address';

export type OrderMode = 'pickup' | 'delivery';

interface OrderContextType {
  orderMode: OrderMode | null;
  setOrderMode: (mode: OrderMode | null) => void;
  selectedBranch: Branch | null;
  setSelectedBranch: (branch: Branch | null) => void;
  selectedAddress: Address | null;
  setSelectedAddress: (address: Address | null) => void;
  resetOrder: () => void;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const OrderProvider: React.FC<{children: ReactNode}> = ({children}) => {
  const [orderMode, setOrderMode] = useState<OrderMode | null>('pickup');
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);

  const resetOrder = () => {
    setOrderMode(null);
    setSelectedBranch(null);
    setSelectedAddress(null);
  };

  return (
    <OrderContext.Provider
      value={{
        orderMode,
        setOrderMode,
        selectedBranch,
        setSelectedBranch,
        selectedAddress,
        setSelectedAddress,
        resetOrder,
      }}>
      {children}
    </OrderContext.Provider>
  );
};

export const useOrder = () => {
  const context = useContext(OrderContext);
  if (context === undefined) {
    throw new Error('useOrder must be used within an OrderProvider');
  }
  return context;
};
