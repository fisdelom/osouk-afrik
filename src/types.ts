export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  in_stock?: boolean;
  promo_price?: number;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface OrderData {
  customer_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  total: number;
  items: CartItem[];
  payment_method: 'online' | 'cash';
}
