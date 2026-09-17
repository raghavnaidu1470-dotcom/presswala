// ==============================================================================
// PressWala - Domain Types & Data Models
// ==============================================================================

export type UserRole = 'customer' | 'vendor';

export interface User {
  id: string;
  name: string;
  flat_number: string;
  phone: string;
  role: UserRole;
  pin_hash: string;
  notes?: string;
  created_at: string;
}

export interface GarmentType {
  id: string;
  name: string;
  category: string;
  icon: string;
  price: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export type OrderStatus = 'created' | 'in_progress' | 'ready' | 'delivered';

export type PaymentStatus = 'unpaid' | 'paid' | 'partial';

export type PaymentMethod = 'cash' | 'upi';

export interface OrderItem {
  id: string;
  order_id: string;
  garment_type_id: string;
  garment_name: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
}

export interface Order {
  id: string;
  order_number: string; // e.g. 'PW-1001'
  customer_id: string;
  flat_number: string;
  customer_name: string;
  customer_phone: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  total_amount: number;
  paid_amount: number;
  special_instructions?: string;
  created_at: string;
  updated_at: string;
  delivered_at?: string | null;
  items?: OrderItem[];
}

export interface Payment {
  id: string;
  order_id?: string | null;
  customer_id: string;
  flat_number: string;
  amount: number;
  payment_method: PaymentMethod;
  reference_id?: string;
  notes?: string;
  recorded_at: string;
}

export interface DashboardMetrics {
  newOrdersCount: number;
  inProgressCount: number;
  completedTodayCount: number;
  totalOutstandingAmount: number;
  totalRevenueCollected: number;
  totalOrdersCount: number;
}

export interface CustomerSummary {
  customer_id: string;
  flat_number: string;
  customer_name: string;
  customer_phone: string;
  total_orders: number;
  lifetime_spent: number;
  outstanding_balance: number;
  last_order_date?: string;
}
