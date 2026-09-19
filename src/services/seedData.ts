import { GarmentType, User, Order, Payment, Apartment, ResidentJoinRequest, CustomerContact } from '../types';

export const INITIAL_GARMENT_TYPES: GarmentType[] = [
  {
    id: 'a1111111-0000-0000-0000-000000000001',
    name: 'Shirt / T-Shirt',
    category: 'Daily Wear',
    icon: 'shirt',
    price: 10,
    is_active: true,
    sort_order: 1,
    created_at: new Date('2026-01-01T00:00:00Z').toISOString()
  },
  {
    id: 'a1111111-0000-0000-0000-000000000002',
    name: 'Pant / Trousers / Jeans',
    category: 'Daily Wear',
    icon: 'trousers',
    price: 12,
    is_active: true,
    sort_order: 2,
    created_at: new Date('2026-01-01T00:00:00Z').toISOString()
  },
  {
    id: 'a1111111-0000-0000-0000-000000000003',
    name: 'Kurta / Salwar / Top',
    category: 'Ethnic Wear',
    icon: 'sparkles',
    price: 15,
    is_active: true,
    sort_order: 3,
    created_at: new Date('2026-01-01T00:00:00Z').toISOString()
  },
  {
    id: 'a1111111-0000-0000-0000-000000000004',
    name: 'Saree (Daily / Cotton)',
    category: 'Ethnic Wear',
    icon: 'palette',
    price: 40,
    is_active: true,
    sort_order: 4,
    created_at: new Date('2026-01-01T00:00:00Z').toISOString()
  },
  {
    id: 'a1111111-0000-0000-0000-000000000005',
    name: 'Saree (Silk / Heavy Embroidery)',
    category: 'Ethnic Wear',
    icon: 'crown',
    price: 70,
    is_active: true,
    sort_order: 5,
    created_at: new Date('2026-01-01T00:00:00Z').toISOString()
  },
  {
    id: 'a1111111-0000-0000-0000-000000000006',
    name: 'Bed Sheet (Single)',
    category: 'Household',
    icon: 'bed',
    price: 20,
    is_active: true,
    sort_order: 6,
    created_at: new Date('2026-01-01T00:00:00Z').toISOString()
  },
  {
    id: 'a1111111-0000-0000-0000-000000000007',
    name: 'Bed Sheet (Double / King)',
    category: 'Household',
    icon: 'bed-double',
    price: 35,
    is_active: true,
    sort_order: 7,
    created_at: new Date('2026-01-01T00:00:00Z').toISOString()
  },
  {
    id: 'a1111111-0000-0000-0000-000000000008',
    name: 'Suit / Blazer / Coat',
    category: 'Formal',
    icon: 'briefcase',
    price: 60,
    is_active: true,
    sort_order: 8,
    created_at: new Date('2026-01-01T00:00:00Z').toISOString()
  },
  {
    id: 'a1111111-0000-0000-0000-000000000009',
    name: 'Curtain / Drapes',
    category: 'Household',
    icon: 'layers',
    price: 45,
    is_active: true,
    sort_order: 9,
    created_at: new Date('2026-01-01T00:00:00Z').toISOString()
  }
];

export const INITIAL_APARTMENTS: Apartment[] = [
  {
    id: 'c1111111-0000-0000-0000-000000000001',
    name: 'Palm Heights Apartments',
    address: 'Sarjapur Main Road, Bellandur, Bengaluru, Karnataka 560103',
    created_at: new Date('2026-01-01T00:00:00Z').toISOString()
  },
  {
    id: 'c1111111-0000-0000-0000-000000000002',
    name: 'Royal Palms Residency',
    address: 'Hennur Bagalur Main Road, Bengaluru, Karnataka 560077',
    created_at: new Date('2026-01-01T00:00:00Z').toISOString()
  },
  {
    id: 'c1111111-0000-0000-0000-000000000003',
    name: 'Green Glen Villas',
    address: 'Outer Ring Road, Green Glen Layout, Bengaluru, Karnataka 560103',
    created_at: new Date('2026-01-01T00:00:00Z').toISOString()
  }
];

export const INITIAL_USERS: User[] = [
  {
    id: 'b1111111-0000-0000-0000-000000000000',
    name: 'System Administrator',
    flat_number: 'SUPER_OWNER_KEY',
    phone: '9800000001',
    role: 'owner',
    status: 'active',
    apartment_name: 'Platform Operations',
    approved_at: new Date('2026-01-01T00:00:00Z').toISOString(),
    created_at: new Date('2026-01-01T00:00:00Z').toISOString()
  },
  {
    id: 'b1111111-0000-0000-0000-000000000001',
    name: 'Ramu Dhobi (Vendor)',
    flat_number: 'VENDOR',
    phone: '9876543210',
    role: 'vendor',
    status: 'active',
    apartment_id: 'c1111111-0000-0000-0000-000000000001',
    apartment_name: 'Palm Heights Apartments',
    approved_at: new Date('2026-01-01T00:00:00Z').toISOString(),
    created_at: new Date('2026-01-01T00:00:00Z').toISOString()
  },
  {
    id: 'b1111111-0000-0000-0000-000000000099',
    name: 'Suresh Laundry',
    flat_number: 'VENDOR-SURESH',
    phone: '9876500001',
    role: 'vendor',
    status: 'pending',
    apartment_id: 'c1111111-0000-0000-0000-000000000003',
    apartment_name: 'Green Glen Villas',
    created_at: new Date(Date.now() - 3600000 * 5).toISOString()
  },
  {
    id: 'b1111111-0000-0000-0000-000000000002',
    name: 'Sharma Ji',
    flat_number: 'A-1001',
    phone: '9810011111',
    role: 'customer',
    status: 'active',
    block: 'A',
    apartment_id: 'c1111111-0000-0000-0000-000000000001',
    apartment_name: 'Palm Heights Apartments',
    approved_at: new Date('2026-01-01T00:00:00Z').toISOString(),
    created_at: new Date('2026-01-01T00:00:00Z').toISOString()
  },
  {
    id: 'b1111111-0000-0000-0000-000000000003',
    name: 'Pooja Verma',
    flat_number: 'A-2004',
    phone: '9810022222',
    role: 'customer',
    status: 'active',
    block: 'A',
    apartment_id: 'c1111111-0000-0000-0000-000000000001',
    apartment_name: 'Palm Heights Apartments',
    approved_at: new Date('2026-01-01T00:00:00Z').toISOString(),
    created_at: new Date('2026-01-01T00:00:00Z').toISOString()
  },
  {
    id: 'b1111111-0000-0000-0000-000000000004',
    name: 'Karthik Raja',
    flat_number: 'B-3002',
    phone: '9810033333',
    role: 'customer',
    status: 'active',
    block: 'B',
    apartment_id: 'c1111111-0000-0000-0000-000000000001',
    apartment_name: 'Palm Heights Apartments',
    approved_at: new Date('2026-01-01T00:00:00Z').toISOString(),
    created_at: new Date('2026-01-01T00:00:00Z').toISOString()
  },
  {
    id: 'b1111111-0000-0000-0000-000000000005',
    name: 'Ananya Patel',
    flat_number: 'C-4005',
    phone: '9810044444',
    role: 'customer',
    status: 'active',
    block: 'C',
    apartment_id: 'c1111111-0000-0000-0000-000000000001',
    apartment_name: 'Palm Heights Apartments',
    approved_at: new Date('2026-01-01T00:00:00Z').toISOString(),
    created_at: new Date('2026-01-01T00:00:00Z').toISOString()
  }
];

export const INITIAL_JOIN_REQUESTS: ResidentJoinRequest[] = [];

// Fallback lookup ONLY used in pure offline demo mode with no Supabase project configured
export const OFFLINE_DEMO_CREDENTIALS: Record<string, string> = {
  'SUPER_OWNER_KEY': 'PressWala!Ops#2026',
  '9800000001': 'PressWala!Ops#2026',
  'VENDOR': 'Demo@1234',
  '9876543210': 'Demo@1234',
  'VENDOR-SURESH': 'Demo@1234',
  '9876500001': 'Demo@1234',
  'A-1001': 'Demo@1010',
  'A-2004': 'Demo@2040',
  'B-3002': 'Demo@3020',
  'C-4005': 'Demo@4050'
};

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'c1111111-0000-0000-0000-000000000001',
    order_number: 'PW-1001',
    customer_id: 'b1111111-0000-0000-0000-000000000002',
    flat_number: 'A-1001',
    customer_name: 'Sharma Ji',
    customer_phone: '9810011111',
    apartment_id: 'c1111111-0000-0000-0000-000000000001',
    block: 'A',
    status: 'created',
    payment_status: 'unpaid',
    total_amount: 54,
    paid_amount: 0,
    special_instructions: 'Please pick up from door hook outside A-1001',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    items: [
      {
        id: 'd1111111-0000-0000-0000-000000000001',
        order_id: 'c1111111-0000-0000-0000-000000000001',
        garment_type_id: 'a1111111-0000-0000-0000-000000000001',
        garment_name: 'Shirt / T-Shirt',
        unit_price: 10,
        quantity: 3,
        subtotal: 30
      },
      {
        id: 'd1111111-0000-0000-0000-000000000002',
        order_id: 'c1111111-0000-0000-0000-000000000001',
        garment_type_id: 'a1111111-0000-0000-0000-000000000002',
        garment_name: 'Pant / Trousers / Jeans',
        unit_price: 12,
        quantity: 2,
        subtotal: 24
      }
    ]
  },
  {
    id: 'c1111111-0000-0000-0000-000000000002',
    order_number: 'PW-1002',
    customer_id: 'b1111111-0000-0000-0000-000000000003',
    flat_number: 'A-2004',
    customer_name: 'Pooja Verma',
    customer_phone: '9810022222',
    apartment_id: 'c1111111-0000-0000-0000-000000000001',
    block: 'A',
    status: 'delivered',
    payment_status: 'unpaid', // Delivered without collecting payment!
    total_amount: 110,
    paid_amount: 0,
    special_instructions: 'Delivered yesterday evening. Payment promised via UPI later.',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    delivered_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    items: [
      {
        id: 'd1111111-0000-0000-0000-000000000003',
        order_id: 'c1111111-0000-0000-0000-000000000002',
        garment_type_id: 'a1111111-0000-0000-0000-000000000004',
        garment_name: 'Saree (Daily / Cotton)',
        unit_price: 40,
        quantity: 1,
        subtotal: 40
      },
      {
        id: 'd1111111-0000-0000-0000-000000000005',
        order_id: 'c1111111-0000-0000-0000-000000000002',
        garment_type_id: 'a1111111-0000-0000-0000-000000000005',
        garment_name: 'Saree (Silk / Heavy Embroidery)',
        unit_price: 70,
        quantity: 1,
        subtotal: 70
      }
    ]
  },
  {
    id: 'c1111111-0000-0000-0000-000000000003',
    order_number: 'PW-1003',
    customer_id: 'b1111111-0000-0000-0000-000000000004',
    flat_number: 'B-3002',
    customer_name: 'Karthik Raja',
    customer_phone: '9810033333',
    apartment_id: 'c1111111-0000-0000-0000-000000000001',
    block: 'B',
    status: 'delivered',
    payment_status: 'paid',
    total_amount: 80,
    paid_amount: 80,
    special_instructions: 'White shirts starched as requested.',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 1.5).toISOString(),
    delivered_at: new Date(Date.now() - 86400000 * 1.5).toISOString(),
    items: [
      {
        id: 'd1111111-0000-0000-0000-000000000006',
        order_id: 'c1111111-0000-0000-0000-000000000003',
        garment_type_id: 'a1111111-0000-0000-0000-000000000001',
        garment_name: 'Shirt / T-Shirt',
        unit_price: 10,
        quantity: 2,
        subtotal: 20
      },
      {
        id: 'd1111111-0000-0000-0000-000000000008',
        order_id: 'c1111111-0000-0000-0000-000000000003',
        garment_type_id: 'a1111111-0000-0000-0000-000000000008',
        garment_name: 'Suit / Blazer / Coat',
        unit_price: 60,
        quantity: 1,
        subtotal: 60
      }
    ]
  }
];

export const INITIAL_PAYMENTS: Payment[] = [
  {
    id: 'e1111111-0000-0000-0000-000000000001',
    order_id: 'c1111111-0000-0000-0000-000000000003',
    customer_id: 'b1111111-0000-0000-0000-000000000004',
    flat_number: 'B-3002',
    apartment_id: 'c1111111-0000-0000-0000-000000000001',
    amount: 80,
    payment_method: 'upi',
    reference_id: 'UPI/729182749182',
    notes: 'Received via PhonePe',
    recorded_at: new Date(Date.now() - 86400000 * 1.5).toISOString()
  }
];

export const INITIAL_CUSTOMER_CONTACTS: CustomerContact[] = [
  // Sharma Ji (Flat A-1001, Palm Heights) - Has 3 numbers (multi-number picker demonstration)
  {
    id: 'cc-1001-1',
    customer_id: 'b1111111-0000-0000-0000-000000000002',
    apartment_id: 'c1111111-0000-0000-0000-000000000001',
    phone: '9810011111',
    label: 'Primary',
    is_primary: true,
    created_at: new Date('2026-01-01T00:00:00Z').toISOString()
  },
  {
    id: 'cc-1001-2',
    customer_id: 'b1111111-0000-0000-0000-000000000002',
    apartment_id: 'c1111111-0000-0000-0000-000000000001',
    phone: '9810011112',
    label: 'Spouse',
    is_primary: false,
    created_at: new Date('2026-01-02T00:00:00Z').toISOString()
  },
  {
    id: 'cc-1001-3',
    customer_id: 'b1111111-0000-0000-0000-000000000002',
    apartment_id: 'c1111111-0000-0000-0000-000000000001',
    phone: '9810011113',
    label: 'Alternate',
    is_primary: false,
    created_at: new Date('2026-01-03T00:00:00Z').toISOString()
  },
  // Pooja Verma (Flat A-2004, Palm Heights) - Has 2 numbers (multi-number picker demonstration)
  {
    id: 'cc-2004-1',
    customer_id: 'b1111111-0000-0000-0000-000000000003',
    apartment_id: 'c1111111-0000-0000-0000-000000000001',
    phone: '9810022222',
    label: 'Primary',
    is_primary: true,
    created_at: new Date('2026-01-01T00:00:00Z').toISOString()
  },
  {
    id: 'cc-2004-2',
    customer_id: 'b1111111-0000-0000-0000-000000000003',
    apartment_id: 'c1111111-0000-0000-0000-000000000001',
    phone: '9810022223',
    label: 'Home',
    is_primary: false,
    created_at: new Date('2026-01-02T00:00:00Z').toISOString()
  },
  // Karthik Raja (Flat B-3002, Palm Heights) - Has 1 number (direct WhatsApp demonstration)
  {
    id: 'cc-3002-1',
    customer_id: 'b1111111-0000-0000-0000-000000000004',
    apartment_id: 'c1111111-0000-0000-0000-000000000001',
    phone: '9810033333',
    label: 'Primary',
    is_primary: true,
    created_at: new Date('2026-01-01T00:00:00Z').toISOString()
  },
  // Ananya Patel (Flat C-4005, Palm Heights) - Has 1 number (direct WhatsApp demonstration)
  {
    id: 'cc-4005-1',
    customer_id: 'b1111111-0000-0000-0000-000000000005',
    apartment_id: 'c1111111-0000-0000-0000-000000000001',
    phone: '9810044444',
    label: 'Primary',
    is_primary: true,
    created_at: new Date('2026-01-01T00:00:00Z').toISOString()
  }
];

