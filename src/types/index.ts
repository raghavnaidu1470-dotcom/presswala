// ==============================================================================
// PressWala - Domain Types & Data Models
// ==============================================================================

export type UserRole = 'customer' | 'vendor' | 'owner';

export type VendorStatus = 'pending' | 'active' | 'revoked';

export interface Apartment {
  id: string;
  name: string;
  address: string;
  created_at: string;
}

export type JoinRequestStatus = 'pending' | 'approved' | 'rejected';

export interface ResidentJoinRequest {
  id: string;
  name: string;
  phone: string;
  block: string;
  flat_number: string;
  apartment_id: string;
  apartment_name?: string;
  status: JoinRequestStatus;
  created_at: string;
  reviewed_at?: string | null;
}

export interface CustomerContact {
  id: string;
  customer_id: string;
  apartment_id?: string;
  phone: string;
  label: string; // 'Primary' | 'Alternate' | 'Spouse' | 'Work' | 'Family'
  is_primary: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface User {
  id: string;
  name: string;
  flat_number: string;
  phone: string;
  role: UserRole;
  status?: VendorStatus;
  apartment_id?: string;
  apartment_name?: string;
  block?: string;
  approved_at?: string | null;
  notes?: string;
  contacts?: CustomerContact[];
  created_at: string;
}

export interface VendorDrilldownCustomer {
  customer_id: string;
  flat_number: string;
  customer_name: string;
  customer_phone: string;
  total_orders: number;
  lifetime_spent: number;
  outstanding_balance: number;
  last_order_date?: string;
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

export type ProposalStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';

export interface OrderChangeProposal {
  id: string;
  order_id: string;
  apartment_id?: string;
  proposed_by: 'customer' | 'vendor';
  proposer_user_id: string;
  status: ProposalStatus;
  original_items: OrderItem[];
  proposed_items: OrderItem[];
  original_total_amount: number;
  proposed_total_amount: number;
  reason?: string;
  created_at: string;
  reviewed_at?: string | null;
}

export interface DeliverySlotAvailability {
  date: string; // YYYY-MM-DD
  window: string; // e.g. '08:00 - 10:00'
  bookedCount: number;
  capacity: number;
  isAvailable: boolean;
}

export interface Order {
  id: string;
  order_number: string; // e.g. 'PW-1001'
  customer_id: string;
  flat_number: string;
  customer_name: string;
  customer_phone: string;
  apartment_id?: string;
  block?: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  total_amount: number;
  paid_amount: number;
  special_instructions?: string;
  delivery_slot_date?: string | null;
  delivery_slot_window?: string | null;
  delivery_slot_booked_at?: string | null;
  active_change_proposal?: OrderChangeProposal | null;
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
  apartment_id?: string;
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
  apartment_id?: string;
  block?: string;
  status?: VendorStatus;
  contacts?: CustomerContact[];
  total_orders: number;
  lifetime_spent: number;
  outstanding_balance: number;
  last_order_date?: string;
}

export interface BlockResidentSummary extends CustomerSummary {
  active_order?: {
    id: string;
    order_number: string;
    status: OrderStatus;
    total_amount: number;
    paid_amount: number;
    garment_count: number;
    created_at: string;
  } | null;
}

export interface BlockGroup {
  blockName: string;
  residents: BlockResidentSummary[];
  totalResidents: number;
  activeOrdersCount: number;
  totalDues: number;
}

export interface VendorInvite {
  id: string;
  token: string;
  vendor_name: string;
  vendor_phone: string;
  apartment_name: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}
