import {Product} from '../viewmodels/useMenuViewModel';

export interface OrderItem {
  id: string;
  product: Product;
  quantity: number;
  selectedOptions: Record<string, string[]>;
  unitPrice: number;
}

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  totalAmount: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  createdAt: number; // timestamp
  orderMode: 'pickup' | 'delivery';
  branchId?: string;
  addressId?: string;
}
