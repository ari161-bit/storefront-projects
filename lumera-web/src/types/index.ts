export type ProductCategory = 'candle' | 'diffuser' | 'tealight';

export type Mood = 'floral' | 'fruity' | 'fresh' | 'spicy' | 'cozy' | 'calming';

export interface ScentNotes {
  top: string;
  mid: string;
  base: string;
}

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  categoryLabel: string;
  moods: Mood[];
  price: number;
  salePrice: number | null;
  burn: string;
  notes: ScentNotes;
  blurb: string;
  description: string;
  color: string;
  stock: number;
  sku: string | null;
  featured: boolean;
  waxType: string;
  size: string;
  rating: number;
  ratingCount: number;
  createdAt: string;
  imageUrl: string | null;
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'customer' | 'admin';
}

export interface Address {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  addressLine: string;
  city: string;
  postcode: string;
  isDefault: boolean;
}

export interface Review {
  id: string;
  productId: string;
  userId: string | null;
  name: string;
  rating: number;
  comment: string;
  verifiedPurchase: boolean;
  createdAt: string;
}

export type OrderStatus = 'Pending' | 'Confirmed' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';

export interface OrderPayment {
  method: 'card' | 'paypal' | 'cod';
  status: string;
  note?: string;
  cardLast4?: string;
  cardBrand?: string;
}

export interface AdminStats {
  totalSales: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  lowStockProducts: { id: string; name: string; stock: number }[];
  recentOrders: Order[];
  salesOverTime: { date: string; sales: number; orders: number }[];
  bestSelling: { id: string; name: string; qty: number }[];
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  active: boolean;
  orderCount: number;
  totalSpent: number;
}

export interface Discount {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  expiresAt: string | null;
  usageLimit: number | null;
  usedCount: number;
  active: boolean;
}

export interface Order {
  id: string;
  createdAt: string;
  status: OrderStatus;
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    postcode: string;
    notes: string;
  };
  items: CartItem[];
  subtotal: number;
  discountCode: string | null;
  discountAmount: number;
  deliveryFee: number;
  total: number;
  payment: OrderPayment;
}
