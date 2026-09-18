import { 
  GarmentType, 
  User, 
  Order, 
  OrderItem, 
  Payment, 
  DashboardMetrics, 
  CustomerSummary, 
  OrderStatus, 
  PaymentMethod 
} from '../types';
import { 
  INITIAL_GARMENT_TYPES, 
  INITIAL_USERS, 
  INITIAL_ORDERS, 
  INITIAL_PAYMENTS 
} from './seedData';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { validators } from '../utils/validators';

const STORAGE_KEYS = {
  GARMENTS: 'presswala_garments_v2',
  USERS: 'presswala_users_v2',
  ORDERS: 'presswala_orders_v2',
  PAYMENTS: 'presswala_payments_v2',
  INITIALIZED: 'presswala_initialized_v2'
};

// ------------------------------------------------------------------------------
// Local Storage Helpers
// ------------------------------------------------------------------------------
function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (err) {
    console.warn(`[PressWala DB] Failed to read ${key} from storage:`, err);
    return fallback;
  }
}

function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error(`[PressWala DB] Failed to write ${key} to storage:`, err);
  }
}

// ------------------------------------------------------------------------------
// Initialize Seed Data
// ------------------------------------------------------------------------------
export function initializeDatabase(): void {
  const isInitialized = localStorage.getItem(STORAGE_KEYS.INITIALIZED);
  if (!isInitialized) {
    saveToStorage(STORAGE_KEYS.GARMENTS, INITIAL_GARMENT_TYPES);
    saveToStorage(STORAGE_KEYS.USERS, INITIAL_USERS);
    saveToStorage(STORAGE_KEYS.ORDERS, INITIAL_ORDERS);
    saveToStorage(STORAGE_KEYS.PAYMENTS, INITIAL_PAYMENTS);
    localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
    console.log('[PressWala DB] Seed data initialized successfully (v2)');
  }
}

// ------------------------------------------------------------------------------
// Database Service Interface
// ------------------------------------------------------------------------------
export const db = {
  // 1. Authentication & Users
  async authenticateUser(loginKey: string, pin: string): Promise<User | null> {
    const trimmedKey = loginKey.trim().toUpperCase();
    const normalizedFlatKey = validators.normalizeFlatNumber(trimmedKey);
    const users = loadFromStorage<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);

    const user = users.find(u => 
      (u.flat_number.toUpperCase() === trimmedKey || 
       u.flat_number.toUpperCase() === normalizedFlatKey || 
       u.phone === trimmedKey) && 
      u.pin_hash === pin.trim()
    );

    return user || null;
  },

  async getUserByPhone(phone: string): Promise<User | null> {
    const users = loadFromStorage<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
    const trimmedPhone = phone.trim();
    return users.find(u => u.phone === trimmedPhone) || null;
  },

  async registerResident(name: string, flatNumber: string, phone: string, pin: string): Promise<User> {
    const users = loadFromStorage<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
    const normalizedFlat = validators.normalizeFlatNumber(flatNumber.trim());
    const trimmedPhone = phone.trim();

    const existingFlat = users.find(u => u.flat_number.toUpperCase() === normalizedFlat.toUpperCase());
    if (existingFlat) {
      throw new Error(`Flat ${normalizedFlat} is already registered. Please login using your Password.`);
    }

    const existingPhone = users.find(u => u.phone === trimmedPhone);
    if (existingPhone) {
      throw new Error(`Mobile number ${trimmedPhone} is already registered for flat ${existingPhone.flat_number}.`);
    }

    const newUser: User = {
      id: crypto.randomUUID ? crypto.randomUUID() : `usr-${Date.now()}`,
      name: name.trim(),
      flat_number: normalizedFlat,
      phone: trimmedPhone,
      role: 'customer',
      pin_hash: pin.trim(),
      created_at: new Date().toISOString()
    };

    users.push(newUser);
    saveToStorage(STORAGE_KEYS.USERS, users);

    // Sync to Supabase if configured
    if (isSupabaseConfigured && supabase) {
      supabase.from('users').insert(newUser).then();
    }

    return newUser;
  },

  async resetPassword(phone: string, newPin: string): Promise<boolean> {
    const users = loadFromStorage<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
    const trimmedPhone = phone.trim();

    const userIndex = users.findIndex(u => u.phone === trimmedPhone);
    if (userIndex === -1) {
      throw new Error(`No account found with phone number ${trimmedPhone}`);
    }

    users[userIndex].pin_hash = newPin.trim();
    saveToStorage(STORAGE_KEYS.USERS, users);

    // Sync to Supabase if configured
    if (isSupabaseConfigured && supabase) {
      await supabase.from('users').update({ pin_hash: newPin.trim() }).eq('phone', trimmedPhone);
    }

    return true;
  },

  // 2. Garment Catalog
  async getGarmentTypes(): Promise<GarmentType[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('garment_types')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (!error && data && data.length > 0) return data;
    }
    const items = loadFromStorage<GarmentType[]>(STORAGE_KEYS.GARMENTS, INITIAL_GARMENT_TYPES);
    return items.filter(g => g.is_active).sort((a, b) => a.sort_order - b.sort_order);
  },

  async updateGarmentPrice(id: string, newPrice: number): Promise<void> {
    const items = loadFromStorage<GarmentType[]>(STORAGE_KEYS.GARMENTS, INITIAL_GARMENT_TYPES);
    const item = items.find(g => g.id === id);
    if (item) {
      item.price = newPrice;
      saveToStorage(STORAGE_KEYS.GARMENTS, items);
    }
    if (isSupabaseConfigured && supabase) {
      await supabase.from('garment_types').update({ price: newPrice }).eq('id', id);
    }
  },

  async addGarmentType(name: string, category: string, price: number, icon = 'shirt'): Promise<GarmentType> {
    const items = loadFromStorage<GarmentType[]>(STORAGE_KEYS.GARMENTS, INITIAL_GARMENT_TYPES);
    const newItem: GarmentType = {
      id: crypto.randomUUID ? crypto.randomUUID() : `grm-${Date.now()}`,
      name,
      category,
      icon,
      price,
      is_active: true,
      sort_order: items.length + 1,
      created_at: new Date().toISOString()
    };
    items.push(newItem);
    saveToStorage(STORAGE_KEYS.GARMENTS, items);

    if (isSupabaseConfigured && supabase) {
      await supabase.from('garment_types').insert(newItem);
    }
    return newItem;
  },

  // 3. Orders
  async getOrders(filters?: { flatNumber?: string; status?: string; paymentStatus?: string }): Promise<Order[]> {
    let orders = loadFromStorage<Order[]>(STORAGE_KEYS.ORDERS, INITIAL_ORDERS);

    if (filters?.flatNumber) {
      const flat = filters.flatNumber.toUpperCase();
      orders = orders.filter(o => o.flat_number.toUpperCase() === flat);
    }
    if (filters?.status && filters.status !== 'all') {
      orders = orders.filter(o => o.status === filters.status);
    }
    if (filters?.paymentStatus && filters.paymentStatus !== 'all') {
      orders = orders.filter(o => o.payment_status === filters.paymentStatus);
    }

    // Sort newest first
    return orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async getOrderById(orderId: string): Promise<Order | null> {
    const orders = loadFromStorage<Order[]>(STORAGE_KEYS.ORDERS, INITIAL_ORDERS);
    return orders.find(o => o.id === orderId) || null;
  },

  async createOrder(
    user: User,
    items: { garmentTypeId: string; garmentName: string; unitPrice: number; quantity: number }[],
    specialInstructions?: string
  ): Promise<Order> {
    const orders = loadFromStorage<Order[]>(STORAGE_KEYS.ORDERS, INITIAL_ORDERS);

    // Calculate sequential order number
    const orderNumber = `PW-${1000 + orders.length + 1}`;
    const orderId = crypto.randomUUID ? crypto.randomUUID() : `ord-${Date.now()}`;

    const orderItems: OrderItem[] = items.map(item => ({
      id: crypto.randomUUID ? crypto.randomUUID() : `itm-${Date.now()}-${Math.random()}`,
      order_id: orderId,
      garment_type_id: item.garmentTypeId,
      garment_name: item.garmentName,
      unit_price: item.unitPrice,
      quantity: item.quantity,
      subtotal: item.unitPrice * item.quantity
    }));

    const totalAmount = orderItems.reduce((acc, itm) => acc + itm.subtotal, 0);

    const newOrder: Order = {
      id: orderId,
      order_number: orderNumber,
      customer_id: user.id,
      flat_number: user.flat_number,
      customer_name: user.name,
      customer_phone: user.phone,
      status: 'created',
      payment_status: 'unpaid',
      total_amount: totalAmount,
      paid_amount: 0,
      special_instructions: specialInstructions,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: orderItems
    };

    orders.unshift(newOrder);
    saveToStorage(STORAGE_KEYS.ORDERS, orders);

    if (isSupabaseConfigured && supabase) {
      const { items: _, ...orderData } = newOrder;
      await supabase.from('orders').insert(orderData);
      await supabase.from('order_items').insert(orderItems);
    }

    return newOrder;
  },

  async updateOrderStatus(orderId: string, newStatus: OrderStatus): Promise<Order> {
    const orders = loadFromStorage<Order[]>(STORAGE_KEYS.ORDERS, INITIAL_ORDERS);
    const order = orders.find(o => o.id === orderId);
    if (!order) throw new Error(`Order ${orderId} not found`);

    order.status = newStatus;
    order.updated_at = new Date().toISOString();
    if (newStatus === 'delivered' && !order.delivered_at) {
      order.delivered_at = new Date().toISOString();
    }

    saveToStorage(STORAGE_KEYS.ORDERS, orders);

    if (isSupabaseConfigured && supabase) {
      await supabase
        .from('orders')
        .update({ status: newStatus, updated_at: order.updated_at, delivered_at: order.delivered_at })
        .eq('id', orderId);
    }

    return order;
  },

  // 4. Critical Delivery & Payment Gate: Cannot deliver without choosing Paid / Unpaid
  async markOrderDeliveredWithPayment(
    orderId: string,
    paymentOption: {
      isPaid: boolean;
      method?: PaymentMethod;
      collectedAmount?: number;
      referenceId?: string;
      notes?: string;
    }
  ): Promise<Order> {
    const orders = loadFromStorage<Order[]>(STORAGE_KEYS.ORDERS, INITIAL_ORDERS);
    const order = orders.find(o => o.id === orderId);
    if (!order) throw new Error(`Order ${orderId} not found`);

    order.status = 'delivered';
    order.delivered_at = new Date().toISOString();
    order.updated_at = new Date().toISOString();

    if (paymentOption.isPaid) {
      const amount = paymentOption.collectedAmount ?? (order.total_amount - order.paid_amount);
      const newPaidAmount = order.paid_amount + amount;
      order.paid_amount = newPaidAmount;
      order.payment_status = newPaidAmount >= order.total_amount ? 'paid' : 'partial';

      // Record in Payment Ledger
      await this.recordPayment({
        order_id: order.id,
        customer_id: order.customer_id,
        flat_number: order.flat_number,
        amount,
        payment_method: paymentOption.method || 'cash',
        reference_id: paymentOption.referenceId,
        notes: paymentOption.notes || 'Payment collected at delivery'
      });
    } else {
      // Delivered but UNPAID: strictly flagged!
      order.payment_status = 'unpaid';
    }

    saveToStorage(STORAGE_KEYS.ORDERS, orders);

    if (isSupabaseConfigured && supabase) {
      await supabase
        .from('orders')
        .update({
          status: 'delivered',
          payment_status: order.payment_status,
          paid_amount: order.paid_amount,
          delivered_at: order.delivered_at,
          updated_at: order.updated_at
        })
        .eq('id', orderId);
    }

    return order;
  },

  // 5. Payment Ledger
  async recordPayment(paymentData: Omit<Payment, 'id' | 'recorded_at'>): Promise<Payment> {
    const payments = loadFromStorage<Payment[]>(STORAGE_KEYS.PAYMENTS, INITIAL_PAYMENTS);
    const newPayment: Payment = {
      id: crypto.randomUUID ? crypto.randomUUID() : `pay-${Date.now()}`,
      ...paymentData,
      recorded_at: new Date().toISOString()
    };

    payments.push(newPayment);
    saveToStorage(STORAGE_KEYS.PAYMENTS, payments);

    // If attached to an order, update order paid_amount
    if (paymentData.order_id) {
      const orders = loadFromStorage<Order[]>(STORAGE_KEYS.ORDERS, INITIAL_ORDERS);
      const order = orders.find(o => o.id === paymentData.order_id);
      if (order) {
        order.paid_amount = (order.paid_amount || 0) + paymentData.amount;
        order.payment_status = order.paid_amount >= order.total_amount ? 'paid' : 'partial';
        order.updated_at = new Date().toISOString();
        saveToStorage(STORAGE_KEYS.ORDERS, orders);

        if (isSupabaseConfigured && supabase) {
          await supabase
            .from('orders')
            .update({ paid_amount: order.paid_amount, payment_status: order.payment_status })
            .eq('id', order.id);
        }
      }
    }

    if (isSupabaseConfigured && supabase) {
      await supabase.from('payments').insert(newPayment);
    }

    return newPayment;
  },

  // 6. Metrics & Analytics
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const orders = loadFromStorage<Order[]>(STORAGE_KEYS.ORDERS, INITIAL_ORDERS);
    const payments = loadFromStorage<Payment[]>(STORAGE_KEYS.PAYMENTS, INITIAL_PAYMENTS);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    let newOrdersCount = 0;
    let inProgressCount = 0;
    let completedTodayCount = 0;
    let totalOutstandingAmount = 0;

    for (const order of orders) {
      if (order.status === 'created') newOrdersCount++;
      if (order.status === 'in_progress') inProgressCount++;
      if (order.status === 'delivered') {
        const deliveredTime = order.delivered_at ? new Date(order.delivered_at).getTime() : 0;
        if (deliveredTime >= todayStart) {
          completedTodayCount++;
        }
      }
      // Calculate unpaid balance across all orders
      const balance = Math.max(0, order.total_amount - (order.paid_amount || 0));
      if (balance > 0) {
        totalOutstandingAmount += balance;
      }
    }

    const totalRevenueCollected = payments.reduce((acc, p) => acc + p.amount, 0);

    return {
      newOrdersCount,
      inProgressCount,
      completedTodayCount,
      totalOutstandingAmount,
      totalRevenueCollected,
      totalOrdersCount: orders.length
    };
  },

  // 7. Customer Summaries (Per Flat Ledger)
  async getCustomerSummaries(): Promise<CustomerSummary[]> {
    const orders = loadFromStorage<Order[]>(STORAGE_KEYS.ORDERS, INITIAL_ORDERS);
    const users = loadFromStorage<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS).filter(u => u.role === 'customer');

    const flatMap = new Map<string, CustomerSummary>();

    // Initialize map with known customers
    for (const user of users) {
      flatMap.set(user.flat_number.toUpperCase(), {
        customer_id: user.id,
        flat_number: user.flat_number,
        customer_name: user.name,
        customer_phone: user.phone,
        total_orders: 0,
        lifetime_spent: 0,
        outstanding_balance: 0
      });
    }

    // Aggregate from orders
    for (const order of orders) {
      const flatKey = order.flat_number.toUpperCase();
      let summary = flatMap.get(flatKey);

      if (!summary) {
        summary = {
          customer_id: order.customer_id,
          flat_number: order.flat_number,
          customer_name: order.customer_name,
          customer_phone: order.customer_phone,
          total_orders: 0,
          lifetime_spent: 0,
          outstanding_balance: 0
        };
        flatMap.set(flatKey, summary);
      }

      summary.total_orders += 1;
      summary.lifetime_spent += order.total_amount;
      const due = Math.max(0, order.total_amount - (order.paid_amount || 0));
      summary.outstanding_balance += due;

      if (!summary.last_order_date || new Date(order.created_at) > new Date(summary.last_order_date)) {
        summary.last_order_date = order.created_at;
      }
    }

    return Array.from(flatMap.values()).sort((a, b) => b.outstanding_balance - a.outstanding_balance);
  },

  // 8. Resident Dues Summary
  async getCustomerBalance(flatNumber: string): Promise<{ totalPaid: number; totalOutstanding: number }> {
    const orders = await this.getOrders({ flatNumber });
    let totalPaid = 0;
    let totalOutstanding = 0;

    for (const order of orders) {
      totalPaid += order.paid_amount || 0;
      const due = Math.max(0, order.total_amount - (order.paid_amount || 0));
      totalOutstanding += due;
    }

    return { totalPaid, totalOutstanding };
  }
};
