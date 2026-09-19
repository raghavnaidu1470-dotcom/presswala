import { 
  GarmentType, 
  User, 
  Order, 
  OrderItem, 
  Payment, 
  DashboardMetrics, 
  CustomerSummary, 
  OrderStatus, 
  PaymentMethod, 
  VendorDrilldownCustomer, 
  VendorInvite, 
  Apartment, 
  ResidentJoinRequest,
  CustomerContact,
  BlockResidentSummary,
  BlockGroup,
  OrderChangeProposal,
  DeliverySlotAvailability
} from '../types';
import { 
  INITIAL_GARMENT_TYPES, 
  INITIAL_USERS, 
  INITIAL_ORDERS, 
  INITIAL_PAYMENTS,
  INITIAL_APARTMENTS,
  INITIAL_JOIN_REQUESTS,
  INITIAL_CUSTOMER_CONTACTS,
  OFFLINE_DEMO_CREDENTIALS
} from './seedData';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { validators } from '../utils/validators';
import { loginSecurity, joinRequestSecurity } from './loginSecurity';

export const STORAGE_KEYS = {
  GARMENTS: 'presswala_garments_v2',
  USERS: 'presswala_users_v2',
  ORDERS: 'presswala_orders_v2',
  PAYMENTS: 'presswala_payments_v2',
  INITIALIZED: 'presswala_initialized_v2',
  VENDOR_INVITES: 'presswala_vendor_invites_v1',
  APARTMENTS: 'presswala_apartments_v2',
  JOIN_REQUESTS: 'presswala_join_requests_v2',
  CUSTOMER_CONTACTS: 'presswala_customer_contacts_v1',
  ORDER_CHANGE_PROPOSALS: 'presswala_order_proposals_v1'
};

// ------------------------------------------------------------------------------
// Synthetic Auth Email Helper (Under-the-hood Supabase Auth)
// ------------------------------------------------------------------------------
export function formatAuthEmail(
  loginKey: string, 
  role: 'customer' | 'vendor' | 'owner' = 'customer'
): string {
  const cleanKey = loginKey.trim().toLowerCase().replace(/[^a-z0-9]/g, '-');
  if (role === 'owner' || cleanKey === 'super-owner-key' || cleanKey === '9800000001' || cleanKey === 'owner' || cleanKey === '9999999999') {
    return 'owner@presswala.internal';
  }
  const isDefaultVendor = cleanKey === 'vendor' || cleanKey === '9876543210';
  if (isDefaultVendor) {
    return 'vendor@presswala.internal';
  }
  if (role === 'vendor') {
    return `vendor-${cleanKey}@presswala.internal`;
  }
  return `flat-${cleanKey}@presswala.internal`;
}

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
    saveToStorage(STORAGE_KEYS.APARTMENTS, INITIAL_APARTMENTS);
    saveToStorage(STORAGE_KEYS.JOIN_REQUESTS, INITIAL_JOIN_REQUESTS);
    saveToStorage(STORAGE_KEYS.CUSTOMER_CONTACTS, INITIAL_CUSTOMER_CONTACTS);
    localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
    console.log('[PressWala DB] Seed data initialized successfully (v2)');
  } else {
    // Ensure apartments exist
    const existingApts = loadFromStorage<Apartment[]>(STORAGE_KEYS.APARTMENTS, []);
    if (existingApts.length === 0) {
      saveToStorage(STORAGE_KEYS.APARTMENTS, INITIAL_APARTMENTS);
    }
    // Ensure join requests storage exists
    const existingReqs = loadFromStorage<ResidentJoinRequest[]>(STORAGE_KEYS.JOIN_REQUESTS, []);
    if (!localStorage.getItem(STORAGE_KEYS.JOIN_REQUESTS)) {
      saveToStorage(STORAGE_KEYS.JOIN_REQUESTS, existingReqs);
    }

    // Ensure customer contacts exist
    const existingContacts = loadFromStorage<CustomerContact[]>(STORAGE_KEYS.CUSTOMER_CONTACTS, []);
    if (existingContacts.length === 0) {
      saveToStorage(STORAGE_KEYS.CUSTOMER_CONTACTS, INITIAL_CUSTOMER_CONTACTS);
    }

    // Ensure Phase A & B updates exist in localStorage (Owner, Vendor status, apartment_id, block)
    const existingUsers = loadFromStorage<User[]>(STORAGE_KEYS.USERS, []);
    let updated = false;
    if (!existingUsers.some(u => u.role === 'owner' || u.flat_number === 'SUPER_OWNER_KEY' || u.flat_number === 'OWNER')) {
      existingUsers.unshift(INITIAL_USERS[0]); // Operations Controller
      updated = true;
    }
    if (!existingUsers.some(u => u.flat_number === 'VENDOR-SURESH')) {
      existingUsers.splice(2, 0, INITIAL_USERS[2]); // Suresh Laundry (pending)
      updated = true;
    }
    const ramu = existingUsers.find(u => u.flat_number === 'VENDOR');
    if (ramu && (!ramu.status || !ramu.apartment_name || !ramu.apartment_id)) {
      ramu.status = 'active';
      ramu.apartment_name = 'Palm Heights Apartments';
      ramu.apartment_id = 'c1111111-0000-0000-0000-000000000001';
      ramu.approved_at = ramu.approved_at || new Date('2026-01-01T00:00:00Z').toISOString();
      updated = true;
    }

    // Backfill apartment_id and block for residents
    for (const u of existingUsers) {
      if (u.role === 'customer') {
        if (!u.apartment_id) {
          u.apartment_id = 'c1111111-0000-0000-0000-000000000001';
          u.apartment_name = u.apartment_name || 'Palm Heights Apartments';
          updated = true;
        }
        if (!u.block) {
          const letter = u.flat_number.charAt(0).toUpperCase();
          u.block = ['A', 'B', 'C', 'D', 'S'].includes(letter) ? letter : 'A';
          updated = true;
        }
        if (!u.status) {
          u.status = 'active';
          updated = true;
        }
      }
    }

    if (updated) {
      saveToStorage(STORAGE_KEYS.USERS, existingUsers);
    }

    // Backfill apartment_id on existing orders if missing
    const existingOrders = loadFromStorage<Order[]>(STORAGE_KEYS.ORDERS, []);
    let ordersUpdated = false;
    for (const o of existingOrders) {
      if (!o.apartment_id) {
        o.apartment_id = 'c1111111-0000-0000-0000-000000000001';
        o.block = o.block || o.flat_number.charAt(0).toUpperCase();
        ordersUpdated = true;
      }
    }
    if (ordersUpdated) {
      saveToStorage(STORAGE_KEYS.ORDERS, existingOrders);
    }
  }
}

// ------------------------------------------------------------------------------
// Database Service Interface
// ------------------------------------------------------------------------------
export const db = {
  // 1. Authentication & Users
  async authenticateUser(loginKey: string, password: string): Promise<User | null> {
    const trimmedKey = loginKey.trim().toUpperCase();
    const normalizedFlatKey = validators.normalizeFlatNumber(trimmedKey);

    // 1. Check brute force lockout
    const lockout = loginSecurity.checkLockout(trimmedKey);
    if (lockout.isLocked) {
      const mins = Math.ceil(lockout.remainingSeconds / 60);
      throw new Error(`Too many failed login attempts for ${trimmedKey}. Locked for ${mins} minute(s). Please try again later.`);
    }

    // 2. Authoritative Supabase Auth: When Supabase is configured, signInWithPassword is the SOLE authority
    if (isSupabaseConfigured && supabase) {
      try {
        let detectedRole: 'customer' | 'vendor' | 'owner' = 'customer';
        let authEmailKey = normalizedFlatKey;

        const isOwnerAttempt = trimmedKey === 'SUPER_OWNER_KEY' || trimmedKey === '9800000001' || trimmedKey === 'OWNER' || trimmedKey === '9999999999';
        const isVendorAttempt = trimmedKey === 'VENDOR' || trimmedKey === '9876543210' || trimmedKey.startsWith('VENDOR');

        if (isOwnerAttempt) {
          detectedRole = 'owner';
          authEmailKey = 'SUPER_OWNER_KEY';
        } else if (isVendorAttempt) {
          detectedRole = 'vendor';
          authEmailKey = trimmedKey;
        } else if (validators.isValidPhone(trimmedKey)) {
          // If logged in via phone, find the corresponding flat_number from users table
          const { data: phoneUser } = await supabase
            .from('users')
            .select('flat_number, role, status, apartment_name')
            .eq('phone', trimmedKey)
            .maybeSingle();

          if (phoneUser) {
            authEmailKey = phoneUser.flat_number;
            detectedRole = phoneUser.role as any;
          }
        }

        const email = formatAuthEmail(authEmailKey, detectedRole);

        // Authoritative sign-in call with direct user password
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password: password.trim()
        });

        if (signInError || !signInData.user) {
          // If authentication fails on Supabase, the login FAILS. No fallback to local data.
          const failedStatus = loginSecurity.recordFailedAttempt(trimmedKey);
          if (failedStatus.isLocked) {
            throw new Error(`Maximum login attempts exceeded. Account locked for 3 minutes.`);
          }
          console.warn('[PressWala Auth] Supabase authentication failed:', signInError?.message);
          return null;
        }

        // Login succeeded in Supabase Auth
        loginSecurity.clearLockout(trimmedKey);

        // Fetch clean non-secret user profile from database
        const { data: dbUser } = await supabase
          .from('users')
          .select('id, name, flat_number, phone, role, status, apartment_name, approved_at, notes, created_at')
          .or(`flat_number.ilike.${authEmailKey},phone.eq.${trimmedKey}`)
          .maybeSingle();

        if (dbUser) {
          if (dbUser.role === 'vendor') {
            if (dbUser.status === 'pending') {
              loginSecurity.recordFailedAttempt(trimmedKey);
              throw new Error(`Your vendor account for ${dbUser.apartment_name || 'your apartment'} is pending administrative approval. Access will be enabled once approved.`);
            }
            if (dbUser.status === 'revoked') {
              loginSecurity.recordFailedAttempt(trimmedKey);
              throw new Error('Your vendor account has been revoked. Administrative approval is required to regain access.');
            }
          }
          if (dbUser.role === 'customer') {
            if (dbUser.status === 'revoked') {
              loginSecurity.recordFailedAttempt(trimmedKey);
              throw new Error('Your resident access has been revoked. Please submit a new join request to request access again.');
            }
            if (dbUser.status === 'pending') {
              loginSecurity.recordFailedAttempt(trimmedKey);
              throw new Error(`Your join request for ${dbUser.apartment_name || 'your apartment'} is pending vendor approval. Access will be enabled once approved.`);
            }
          }
          return dbUser as User;
        }

        // Fallback construct from profile / auth session
        return {
          id: signInData.user.id,
          name: (signInData.user.user_metadata?.name as string) || (detectedRole === 'owner' ? 'Operations Administrator' : detectedRole === 'vendor' ? 'Ramu Dhobi (Vendor)' : `Resident ${authEmailKey}`),
          flat_number: authEmailKey,
          phone: (signInData.user.user_metadata?.phone as string) || trimmedKey,
          role: detectedRole,
          status: (signInData.user.user_metadata?.status as any) || 'active',
          apartment_name: signInData.user.user_metadata?.apartment_name,
          created_at: signInData.user.created_at || new Date().toISOString()
        };
      } catch (err: any) {
        if (err.message && (err.message.includes('locked') || err.message.includes('pending') || err.message.includes('revoked'))) {
          throw err;
        }
        console.error('[PressWala Auth] Supabase Auth Error:', err);
        return null;
      }
    }

    // 3. Pure Offline Demo Mode: ONLY runs when Supabase is NOT configured at all
    const users = loadFromStorage<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
    const matchingUsers = users.filter(u => 
      (u.flat_number.toUpperCase() === trimmedKey || 
       u.flat_number.toUpperCase() === normalizedFlatKey || 
       u.phone === trimmedKey)
    );

    if (matchingUsers.length === 0) {
      // Check join requests for this flat or phone
      const joinRequests = loadFromStorage<ResidentJoinRequest[]>(STORAGE_KEYS.JOIN_REQUESTS, []);
      const matchingReqs = joinRequests
        .filter(r => 
          r.flat_number.toUpperCase() === trimmedKey || 
          r.flat_number.toUpperCase() === normalizedFlatKey || 
          r.phone === trimmedKey
        )
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      if (matchingReqs.length > 0) {
        const latestReq = matchingReqs[0];
        if (latestReq.status === 'pending') {
          loginSecurity.recordFailedAttempt(trimmedKey);
          throw new Error(`Your join request for ${latestReq.apartment_name || 'your apartment'} is pending vendor approval. Access will be enabled once approved.`);
        }
        if (latestReq.status === 'rejected') {
          loginSecurity.recordFailedAttempt(trimmedKey);
          throw new Error(`Your access request for ${latestReq.apartment_name || 'your apartment'} was declined. You may submit a fresh request to try again.`);
        }
      }

      const failedStatus = loginSecurity.recordFailedAttempt(trimmedKey);
      if (failedStatus.isLocked) {
        throw new Error(`Maximum login attempts exceeded. Account locked for 3 minutes.`);
      }
      return null;
    }

    // If multiple accounts share a phone (e.g. older account was revoked and phone was recycled),
    // prioritize active/pending over revoked, and newest created_at over older.
    const user = matchingUsers.sort((a, b) => {
      if (a.status !== 'revoked' && b.status === 'revoked') return -1;
      if (a.status === 'revoked' && b.status !== 'revoked') return 1;
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    })[0];

    const expectedPassword = OFFLINE_DEMO_CREDENTIALS[user.flat_number.toUpperCase()] || 
                            OFFLINE_DEMO_CREDENTIALS[user.phone] || 
                            'Demo@1234';

    const inputPassword = password.trim();
    if (
      inputPassword !== expectedPassword && 
      inputPassword !== 'Demo@1234' && 
      inputPassword !== 'Demo@1010' && 
      inputPassword !== '1010'
    ) {
      const failedStatus = loginSecurity.recordFailedAttempt(trimmedKey);
      if (failedStatus.isLocked) {
        throw new Error(`Maximum login attempts exceeded. Account locked for 3 minutes.`);
      }
      return null;
    }

    // Check vendor / resident status
    if (user.role === 'vendor') {
      if (user.status === 'pending') {
        loginSecurity.recordFailedAttempt(trimmedKey);
        throw new Error(`Your vendor account for ${user.apartment_name || 'your apartment'} is pending administrative approval. Access will be enabled once approved.`);
      }
      if (user.status === 'revoked') {
        loginSecurity.recordFailedAttempt(trimmedKey);
        throw new Error('Your vendor account has been revoked. Administrative approval is required to regain access.');
      }
    }

    if (user.role === 'customer') {
      if (user.status === 'revoked') {
        loginSecurity.recordFailedAttempt(trimmedKey);
        throw new Error('Your resident access has been revoked. Please submit a new join request to request access again.');
      }
      if (user.status === 'pending') {
        loginSecurity.recordFailedAttempt(trimmedKey);
        throw new Error(`Your join request for ${user.apartment_name || 'your apartment'} is pending vendor approval. Access will be enabled once approved.`);
      }
    }

    loginSecurity.clearLockout(trimmedKey);
    return user;
  },

  async getUserByPhone(phone: string): Promise<User | null> {
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase
        .from('users')
        .select('id, name, flat_number, phone, role, notes, created_at, status')
        .eq('phone', phone.trim())
        .order('created_at', { ascending: false });
      if (data && data.length > 0) {
        return (data.find((u: any) => u.status !== 'revoked') || data[0]) as User;
      }
    }
    const users = loadFromStorage<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
    const trimmedPhone = phone.trim();
    const matching = users.filter(u => u.phone === trimmedPhone);
    if (!matching.length) return null;
    return matching.sort((a, b) => {
      if (a.status !== 'revoked' && b.status === 'revoked') return -1;
      if (a.status === 'revoked' && b.status !== 'revoked') return 1;
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    })[0];
  },

  async registerResident(name: string, flatNumber: string, phone: string, password: string): Promise<User> {
    const users = loadFromStorage<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
    const normalizedFlat = validators.normalizeFlatNumber(flatNumber.trim());
    const trimmedPhone = phone.trim();

    const existingFlat = users.find(u => u.flat_number.toUpperCase() === normalizedFlat.toUpperCase());
    if (existingFlat) {
      throw new Error(`Flat ${normalizedFlat} is already registered. Please login using your Password.`);
    }

    const existingPhone = users.find(u => u.phone === trimmedPhone && u.status !== 'revoked');
    if (existingPhone) {
      throw new Error(`Mobile number ${trimmedPhone} is already registered for flat ${existingPhone.flat_number}.`);
    }

    // Clean user object with NO password fields
    const newUser: User = {
      id: crypto.randomUUID ? crypto.randomUUID() : `usr-${Date.now()}`,
      name: name.trim(),
      flat_number: normalizedFlat,
      phone: trimmedPhone,
      role: 'customer',
      created_at: new Date().toISOString()
    };

    users.push(newUser);
    saveToStorage(STORAGE_KEYS.USERS, users);
    OFFLINE_DEMO_CREDENTIALS[normalizedFlat.toUpperCase()] = password.trim();

    // Sync to Supabase Auth & DB if configured
    if (isSupabaseConfigured && supabase) {
      try {
        const email = formatAuthEmail(normalizedFlat, 'customer');
        const { data: authData } = await supabase.auth.signUp({
          email,
          password: password.trim(),
          options: {
            data: {
              flat_number: normalizedFlat,
              role: 'customer',
              name: newUser.name,
              phone: newUser.phone
            }
          }
        });

        // Insert non-secret profile data into users table (NO PASSWORD)
        await supabase.from('users').insert({
          id: newUser.id,
          name: newUser.name,
          flat_number: newUser.flat_number,
          phone: newUser.phone,
          role: newUser.role,
          created_at: newUser.created_at
        });

        if (authData?.user) {
          await supabase.from('profiles').upsert({
            id: authData.user.id,
            flat_number: normalizedFlat,
            role: 'customer',
            user_id: newUser.id
          });
        }
      } catch (err) {
        console.warn('[PressWala] Error syncing new resident to Supabase:', err);
      }
    }

    return newUser;
  },

  // Secure Vendor-assisted Password Reset (Replaces fake OTP flow)
  async vendorResetResidentPassword(flatNumber: string, newPassword: string): Promise<boolean> {
    const normalizedFlat = validators.normalizeFlatNumber(flatNumber.trim());

    // Password complexity check in application service mirroring database policy
    if (!validators.isValidPassword(newPassword)) {
      throw new Error('Password does not meet complexity requirements: must be at least 6 characters and contain an uppercase letter, a lowercase letter, a digit, and a special character');
    }

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.rpc('vendor_reset_resident_password', {
        p_flat_number: normalizedFlat,
        p_new_password: newPassword.trim()
      });

      if (error) {
        throw new Error(error.message || `Failed to reset password for flat ${normalizedFlat}`);
      }
      return true;
    }

    // Pure offline demo fallback
    OFFLINE_DEMO_CREDENTIALS[normalizedFlat.toUpperCase()] = newPassword.trim();
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
  async getOrders(filters?: { flatNumber?: string; status?: string; paymentStatus?: string; apartmentId?: string }): Promise<Order[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase
          .from('orders')
          .select('*, items:order_items(*)');

        if (filters?.apartmentId) {
          query = query.eq('apartment_id', filters.apartmentId);
        }
        if (filters?.flatNumber) {
          query = query.ilike('flat_number', filters.flatNumber.trim());
        }
        if (filters?.status && filters.status !== 'all') {
          query = query.eq('status', filters.status);
        }
        if (filters?.paymentStatus && filters.paymentStatus !== 'all') {
          query = query.eq('payment_status', filters.paymentStatus);
        }

        const { data, error } = await query.order('created_at', { ascending: false });
        if (!error && data && data.length > 0) {
          return data as Order[];
        }
      } catch (err) {
        console.warn('[PressWala] Supabase getOrders note:', err);
      }
    }

    let orders = loadFromStorage<Order[]>(STORAGE_KEYS.ORDERS, INITIAL_ORDERS);

    if (filters?.apartmentId) {
      orders = orders.filter(o => o.apartment_id === filters.apartmentId);
    }
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

    // Attach active change proposal if any
    const proposals = loadFromStorage<OrderChangeProposal[]>(STORAGE_KEYS.ORDER_CHANGE_PROPOSALS, []);
    for (const o of orders) {
      o.active_change_proposal = proposals.find(p => p.order_id === o.id && p.status === 'pending') || null;
    }

    // Sort newest first
    return orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async getOrderById(orderId: string): Promise<Order | null> {
    const orders = loadFromStorage<Order[]>(STORAGE_KEYS.ORDERS, INITIAL_ORDERS);
    const order = orders.find(o => o.id === orderId) || null;
    if (order) {
      const proposals = loadFromStorage<OrderChangeProposal[]>(STORAGE_KEYS.ORDER_CHANGE_PROPOSALS, []);
      order.active_change_proposal = proposals.find(p => p.order_id === order.id && p.status === 'pending') || null;
    }
    return order;
  },

  async createOrder(
    user: User,
    items: { garmentTypeId: string; garmentName: string; unitPrice: number; quantity: number }[],
    specialInstructions?: string,
    deliverySlot?: { date: string; window: string }
  ): Promise<Order> {
    // 1. Due-Based Order Blocking: Check if customer has outstanding dues
    const balance = await this.getCustomerBalance(user.flat_number, user.apartment_id);
    if (balance.totalOutstanding > 0) {
      throw new Error(`Order creation blocked: You have an outstanding balance of ₹${balance.totalOutstanding}. Please clear previous dues before creating a new order.`);
    }

    const orders = loadFromStorage<Order[]>(STORAGE_KEYS.ORDERS, INITIAL_ORDERS);

    // 2. Delivery Slot Capacity Check (max 3 bookings per apartment per slot)
    if (deliverySlot && deliverySlot.date && deliverySlot.window) {
      const existingSlotBookings = orders.filter(
        o => o.apartment_id === user.apartment_id &&
             o.delivery_slot_date === deliverySlot.date &&
             o.delivery_slot_window === deliverySlot.window &&
             o.status !== 'delivered'
      );
      if (existingSlotBookings.length >= 3) {
        throw new Error(`Delivery slot full: The selected time window on ${deliverySlot.date} is at maximum capacity.`);
      }
    }

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
      apartment_id: user.apartment_id,
      block: user.block,
      status: 'created',
      payment_status: 'unpaid',
      total_amount: totalAmount,
      paid_amount: 0,
      special_instructions: specialInstructions,
      delivery_slot_date: deliverySlot?.date || null,
      delivery_slot_window: deliverySlot?.window || null,
      delivery_slot_booked_at: deliverySlot ? new Date().toISOString() : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: orderItems
    };

    orders.unshift(newOrder);
    saveToStorage(STORAGE_KEYS.ORDERS, orders);

    if (isSupabaseConfigured && supabase) {
      const { items: _, active_change_proposal: __, ...orderData } = newOrder;
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
        apartment_id: order.apartment_id,
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

  async getPayments(filters?: { apartmentId?: string; flatNumber?: string } | string): Promise<Payment[]> {
    let apartmentId: string | undefined;
    let flatNumber: string | undefined;

    if (typeof filters === 'string') {
      apartmentId = filters;
    } else if (filters) {
      apartmentId = filters.apartmentId;
      flatNumber = filters.flatNumber;
    }

    let payments = loadFromStorage<Payment[]>(STORAGE_KEYS.PAYMENTS, INITIAL_PAYMENTS);
    if (apartmentId) {
      payments = payments.filter(p => p.apartment_id === apartmentId);
    }
    if (flatNumber) {
      const flat = flatNumber.toUpperCase().trim();
      payments = payments.filter(p => p.flat_number.toUpperCase().trim() === flat);
    }
    return payments;
  },

  // 6. Metrics & Analytics (Apartment Scoped)
  async getDashboardMetrics(apartmentId?: string): Promise<DashboardMetrics> {
    let orders = loadFromStorage<Order[]>(STORAGE_KEYS.ORDERS, INITIAL_ORDERS);
    let payments = loadFromStorage<Payment[]>(STORAGE_KEYS.PAYMENTS, INITIAL_PAYMENTS);

    if (apartmentId) {
      orders = orders.filter(o => o.apartment_id === apartmentId);
      payments = payments.filter(p => p.apartment_id === apartmentId);
    }

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

  // 7. Customer Summaries (Per Flat Ledger, Apartment Scoped)
  async getCustomerSummaries(apartmentId?: string): Promise<CustomerSummary[]> {
    let orders = loadFromStorage<Order[]>(STORAGE_KEYS.ORDERS, INITIAL_ORDERS);
    let users = loadFromStorage<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS).filter(u => u.role === 'customer');
    const allContacts = loadFromStorage<CustomerContact[]>(STORAGE_KEYS.CUSTOMER_CONTACTS, INITIAL_CUSTOMER_CONTACTS);

    if (apartmentId) {
      users = users.filter(u => u.apartment_id === apartmentId);
      orders = orders.filter(o => o.apartment_id === apartmentId);
    }

    const flatMap = new Map<string, CustomerSummary>();

    // Initialize map with known customers
    for (const user of users) {
      const userContacts = allContacts
        .filter(c => c.customer_id === user.id)
        .sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0));

      flatMap.set(user.flat_number.toUpperCase(), {
        customer_id: user.id,
        flat_number: user.flat_number,
        customer_name: user.name,
        customer_phone: user.phone,
        apartment_id: user.apartment_id,
        block: user.block,
        status: user.status || 'active',
        contacts: userContacts.length > 0 ? userContacts : [{
          id: `primary-${user.id}`,
          customer_id: user.id,
          apartment_id: user.apartment_id,
          phone: user.phone,
          label: 'Primary',
          is_primary: true
        }],
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
        const orderUserContacts = allContacts
          .filter(c => c.customer_id === order.customer_id)
          .sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0));

        summary = {
          customer_id: order.customer_id,
          flat_number: order.flat_number,
          customer_name: order.customer_name,
          customer_phone: order.customer_phone,
          apartment_id: order.apartment_id,
          block: order.block,
          status: 'active',
          contacts: orderUserContacts.length > 0 ? orderUserContacts : [{
            id: `primary-${order.customer_id}`,
            customer_id: order.customer_id,
            apartment_id: order.apartment_id,
            phone: order.customer_phone,
            label: 'Primary',
            is_primary: true
          }],
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

  // 8. Resident Dues Summary (Apartment Aware)
  async getCustomerBalance(flatNumber: string, apartmentId?: string): Promise<{ totalPaid: number; totalOutstanding: number }> {
    const orders = await this.getOrders({ flatNumber, apartmentId });
    let totalPaid = 0;
    let totalOutstanding = 0;

    for (const order of orders) {
      totalPaid += order.paid_amount || 0;
      const due = Math.max(0, order.total_amount - (order.paid_amount || 0));
      totalOutstanding += due;
    }

    return { totalPaid, totalOutstanding };
  },

  // 9. Vendor Onboarding & Registration (Phase A)
  async registerVendor(
    name: string,
    phone: string,
    apartmentName: string,
    password: string
  ): Promise<User> {
    const users = loadFromStorage<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
    const trimmedPhone = phone.trim();
    const trimmedApt = apartmentName.trim();

    // Do not allow re-registration if an active or pending account exists with this phone
    const activeOrPendingUser = users.find(
      u => u.phone === trimmedPhone && u.status !== 'revoked'
    );
    if (activeOrPendingUser) {
      throw new Error(`Mobile number ${trimmedPhone} is already registered (${activeOrPendingUser.name}).`);
    }

    // If an existing account with this phone was revoked, do NOT mutate it.
    // Always create a brand-new vendor account with a new ID, in pending status,
    // with no data carried over from the old revoked account — the old revoked account
    // and its full history (past apartment link, past residents, past orders) must remain
    // completely untouched and separate.
    const newId = crypto.randomUUID ? crypto.randomUUID() : `vnd-${Date.now()}`;
    let vendorKey = `VENDOR-${trimmedPhone.slice(-4)}`;
    if (users.some(u => u.flat_number.toUpperCase() === vendorKey)) {
      const suffix = newId.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase() || `${Math.floor(1000 + Math.random() * 9000)}`;
      vendorKey = `VENDOR-${trimmedPhone.slice(-4)}-${suffix}`;
    }

    const newVendor: User = {
      id: newId,
      name: name.trim(),
      flat_number: vendorKey,
      phone: trimmedPhone,
      role: 'vendor',
      status: 'pending',
      apartment_name: trimmedApt,
      created_at: new Date().toISOString()
    };

    users.push(newVendor);
    saveToStorage(STORAGE_KEYS.USERS, users);
    OFFLINE_DEMO_CREDENTIALS[vendorKey] = password.trim();
    OFFLINE_DEMO_CREDENTIALS[trimmedPhone] = password.trim();

    if (isSupabaseConfigured && supabase) {
      try {
        const email = formatAuthEmail(vendorKey, 'vendor');
        const { data: authData } = await supabase.auth.signUp({
          email,
          password: password.trim(),
          options: {
            data: {
              flat_number: vendorKey,
              role: 'vendor',
              name: newVendor.name,
              phone: newVendor.phone,
              status: 'pending',
              apartment_name: trimmedApt
            }
          }
        });

        await supabase.from('users').insert({
          id: newVendor.id,
          name: newVendor.name,
          flat_number: newVendor.flat_number,
          phone: newVendor.phone,
          role: newVendor.role,
          status: 'pending',
          apartment_name: trimmedApt,
          created_at: newVendor.created_at
        });

        if (authData?.user) {
          await supabase.from('profiles').upsert({
            id: authData.user.id,
            flat_number: vendorKey,
            role: 'vendor',
            status: 'pending',
            apartment_name: trimmedApt,
            user_id: newVendor.id
          });
        }
      } catch (err) {
        console.warn('[PressWala] Error syncing new vendor to Supabase:', err);
      }
    }

    return newVendor;
  },

  // 10. Platform Owner: Get all vendors platform-wide
  async getVendors(): Promise<User[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, name, flat_number, phone, role, status, apartment_name, approved_at, notes, created_at')
          .eq('role', 'vendor')
          .order('created_at', { ascending: false });
        if (!error && data) {
          return data as User[];
        }
      } catch (err) {
        console.warn('[PressWala] Supabase getVendors note:', err);
      }
    }

    const users = loadFromStorage<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
    return users.filter(u => u.role === 'vendor');
  },

  // 11. Platform Owner: Approve, Reject, or Revoke Vendor
  async updateVendorStatus(
    vendorId: string, 
    status: 'active' | 'revoked' | 'pending'
  ): Promise<boolean> {
    const users = loadFromStorage<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
    const vendor = users.find(u => u.id === vendorId || u.flat_number === vendorId);
    if (vendor) {
      vendor.status = status;
      if (status === 'active') {
        vendor.approved_at = new Date().toISOString();
      }
      saveToStorage(STORAGE_KEYS.USERS, users);
    }

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.rpc('owner_update_vendor_status', {
          p_vendor_id: vendorId,
          p_status: status
        });
        if (error) {
          // Direct update fallback
          await supabase
            .from('users')
            .update({
              status,
              approved_at: status === 'active' ? new Date().toISOString() : undefined
            })
            .eq('id', vendorId);
        }
      } catch (err) {
        console.warn('[PressWala] Error updating vendor status on Supabase:', err);
      }
    }

    return true;
  },

  // 12. Platform Owner: Drill-down into residents under a vendor's apartment
  async getResidentsForVendorApartment(apartmentName: string): Promise<VendorDrilldownCustomer[]> {
    const orders = loadFromStorage<Order[]>(STORAGE_KEYS.ORDERS, INITIAL_ORDERS);
    const users = loadFromStorage<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS).filter(u => u.role === 'customer');

    // Filter customers: if specific apartment specified, match; else show Palm Heights defaults
    const filteredUsers = users.filter(u => 
      !u.apartment_name || 
      u.apartment_name.toLowerCase() === apartmentName.toLowerCase() || 
      (apartmentName.toLowerCase().includes('palm') && (!u.apartment_name || u.apartment_name.includes('Palm')))
    );

    const flatMap = new Map<string, VendorDrilldownCustomer>();
    for (const u of filteredUsers) {
      flatMap.set(u.flat_number.toUpperCase(), {
        customer_id: u.id,
        flat_number: u.flat_number,
        customer_name: u.name,
        customer_phone: u.phone,
        total_orders: 0,
        lifetime_spent: 0,
        outstanding_balance: 0
      });
    }

    for (const order of orders) {
      const item = flatMap.get(order.flat_number.toUpperCase());
      if (item) {
        item.total_orders += 1;
        item.lifetime_spent += order.total_amount;
        const due = Math.max(0, order.total_amount - (order.paid_amount || 0));
        item.outstanding_balance += due;
        if (!item.last_order_date || new Date(order.created_at) > new Date(item.last_order_date)) {
          item.last_order_date = order.created_at;
        }
      }
    }

    return Array.from(flatMap.values()).sort((a, b) => b.outstanding_balance - a.outstanding_balance);
  },

  // 13. Vendor Invites (Single-Use, Expirable)
  async createVendorInvite(
    vendorName: string,
    vendorPhone: string,
    apartmentName: string
  ): Promise<VendorInvite> {
    const invites = loadFromStorage<VendorInvite[]>(STORAGE_KEYS.VENDOR_INVITES, []);
    const randomSuffix = typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID().replace(/-/g, '') 
      : Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
    const token = 'vinv_' + randomSuffix;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

    const newInvite: VendorInvite = {
      id: crypto.randomUUID ? crypto.randomUUID() : `inv-${Date.now()}`,
      token,
      vendor_name: vendorName.trim(),
      vendor_phone: vendorPhone.trim(),
      apartment_name: apartmentName.trim(),
      expires_at: expiresAt,
      used_at: null,
      created_at: new Date().toISOString()
    };

    invites.unshift(newInvite);
    saveToStorage(STORAGE_KEYS.VENDOR_INVITES, invites);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('vendor_invites').insert(newInvite);
      } catch (err) {
        console.warn('[PressWala] Error inserting vendor invite to Supabase:', err);
      }
    }

    return newInvite;
  },

  async getVendorInvites(): Promise<VendorInvite[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('vendor_invites')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data) {
          return data as VendorInvite[];
        }
      } catch (err) {
        console.warn('[PressWala] Supabase getVendorInvites note:', err);
      }
    }
    return loadFromStorage<VendorInvite[]>(STORAGE_KEYS.VENDOR_INVITES, []);
  },

  async getVendorInviteByToken(token: string): Promise<{
    valid: boolean;
    reason?: 'not_found' | 'expired' | 'already_used';
    invite?: VendorInvite;
  }> {
    let invite: VendorInvite | undefined;
    if (isSupabaseConfigured && supabase) {
      try {
        // Use security-hardened RPC to safely fetch invite details without public table SELECT
        const { data, error } = await supabase
          .rpc('get_vendor_invite_by_token', { p_token: token.trim() });
        if (!error && data) {
          const row = Array.isArray(data) ? data[0] : data;
          if (row) {
            invite = row as VendorInvite;
          }
        } else {
          // Fallback to table query if RPC is not yet deployed in current environment
          const { data: tableData } = await supabase
            .from('vendor_invites')
            .select('*')
            .eq('token', token.trim())
            .maybeSingle();
          if (tableData) {
            invite = tableData as VendorInvite;
          }
        }
      } catch (err) {
        console.warn('[PressWala] Supabase getVendorInviteByToken note:', err);
      }
    }

    if (!invite) {
      const invites = loadFromStorage<VendorInvite[]>(STORAGE_KEYS.VENDOR_INVITES, []);
      invite = invites.find(i => i.token === token.trim());
    }

    if (!invite) {
      return { valid: false, reason: 'not_found' };
    }

    if (invite.used_at) {
      return { valid: false, reason: 'already_used', invite };
    }

    if (new Date() > new Date(invite.expires_at)) {
      return { valid: false, reason: 'expired', invite };
    }

    return { valid: true, invite };
  },

  async completeVendorInvite(
    token: string,
    password: string,
    overrideName?: string,
    overridePhone?: string,
    overrideApt?: string
  ): Promise<User> {
    const check = await this.getVendorInviteByToken(token);
    if (!check.valid || !check.invite) {
      throw new Error(
        check.reason === 'already_used'
          ? 'This invite link has already been used to create an account.'
          : check.reason === 'expired'
          ? 'This invite link has expired. Please request a new invitation.'
          : 'Invalid onboarding invitation link.'
      );
    }

    const finalName = overrideName?.trim() || check.invite.vendor_name;
    const finalPhone = overridePhone?.trim() || check.invite.vendor_phone;
    const finalApt = overrideApt?.trim() || check.invite.apartment_name;

    // Register vendor in pending status
    const newVendor = await this.registerVendor(finalName, finalPhone, finalApt, password);

    // Mark invite as used
    const nowIso = new Date().toISOString();
    const invites = loadFromStorage<VendorInvite[]>(STORAGE_KEYS.VENDOR_INVITES, []);
    const target = invites.find(i => i.token === token.trim());
    if (target) {
      target.used_at = nowIso;
      saveToStorage(STORAGE_KEYS.VENDOR_INVITES, invites);
    }

    if (isSupabaseConfigured && supabase) {
      try {
        // Use atomic SECURITY DEFINER RPC to bypass client-side RLS restriction
        const { data: redeemed } = await supabase
          .rpc('redeem_vendor_invite', { p_token: token.trim() });
        if (!redeemed) {
          await supabase
            .from('vendor_invites')
            .update({ used_at: nowIso })
            .eq('token', token.trim());
        }
      } catch (err) {
        console.warn('[PressWala] Error updating used_at on Supabase:', err);
      }
    }

    return newVendor;
  },

  // 15. Apartments Scoping (Phase B)
  async getApartments(): Promise<Apartment[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('apartments').select('*').order('name');
        if (!error && data && data.length > 0) return data as Apartment[];
      } catch (err) {
        console.warn('[PressWala] Supabase getApartments note:', err);
      }
    }
    return loadFromStorage<Apartment[]>(STORAGE_KEYS.APARTMENTS, INITIAL_APARTMENTS);
  },

  async getApartmentById(apartmentId: string): Promise<Apartment | null> {
    const apts = await this.getApartments();
    return apts.find(a => a.id === apartmentId || a.name.toLowerCase() === apartmentId.toLowerCase()) || null;
  },

  // 16. Resident Join Requests Lifecycle (Phase B)
  async createResidentJoinRequest(
    name: string,
    phone: string,
    block: string,
    flatNumber: string,
    apartmentId: string
  ): Promise<ResidentJoinRequest> {
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const trimmedBlock = block.trim().toUpperCase();
    const normalizedFlat = validators.normalizeFlatNumber(flatNumber.trim());

    if (trimmedName.length < 2 || trimmedName.length > 100 || !validators.isValidName(trimmedName)) {
      throw new Error('Name must be between 2 and 100 characters and contain only alphabets and spaces');
    }
    if (!validators.isValidPhone(trimmedPhone)) {
      throw new Error('Phone number must be exactly 10 digits');
    }
    if (trimmedBlock.length < 1 || trimmedBlock.length > 50) {
      throw new Error('Block/Tower must be between 1 and 50 characters (e.g. Block A, Tower 1)');
    }
    if (normalizedFlat.length < 2 || normalizedFlat.length > 20 || !validators.isValidFlatNumber(normalizedFlat)) {
      throw new Error('Flat number must be an alphabet, a hyphen, and 4 digits (e.g., S-3907 or A-1001)');
    }
    if (!apartmentId) {
      throw new Error('Please select an apartment complex');
    }

    // Rate limiting: Maximum 3 pending or rejected join requests per phone number within 24 hours
    const joinRequests = loadFromStorage<ResidentJoinRequest[]>(STORAGE_KEYS.JOIN_REQUESTS, []);
    const now = Date.now();
    const WINDOW_MS = 24 * 60 * 60 * 1000;
    const recentSubmissions = joinRequests.filter(r => 
      r.phone === trimmedPhone &&
      (r.status === 'pending' || r.status === 'rejected') &&
      now - new Date(r.created_at).getTime() < WINDOW_MS
    );
    const rateStatus = joinRequestSecurity.checkRateLimit(trimmedPhone);
    if (recentSubmissions.length >= 3 || !rateStatus.allowed) {
      throw new Error('Submission limit reached: Maximum 3 join requests allowed per phone number in 24 hours. Please try again later.');
    }

    // Check if flat is already registered & active in this apartment
    const users = loadFromStorage<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
    const existingActive = users.find(u => 
      u.flat_number.toUpperCase() === normalizedFlat && 
      (u.apartment_id === apartmentId || !u.apartment_id) && 
      u.status === 'active'
    );
    if (existingActive) {
      throw new Error(`Flat ${normalizedFlat} is already registered and active. Please sign in using your password.`);
    }

    // Check if there is already a pending join request for this flat in this apartment
    const existingPending = joinRequests.find(r => 
      r.flat_number.toUpperCase() === normalizedFlat && 
      r.apartment_id === apartmentId && 
      r.status === 'pending'
    );
    if (existingPending) {
      throw new Error(`A join request for Flat ${normalizedFlat} is already pending review by the vendor.`);
    }

    const apts = await this.getApartments();
    const apt = apts.find(a => a.id === apartmentId);
    const aptName = apt ? apt.name : 'Selected Apartment';

    const newRequest: ResidentJoinRequest = {
      id: crypto.randomUUID ? crypto.randomUUID() : `jr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: trimmedName,
      phone: trimmedPhone,
      block: trimmedBlock,
      flat_number: normalizedFlat,
      apartment_id: apartmentId,
      apartment_name: aptName,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    joinRequests.unshift(newRequest);
    saveToStorage(STORAGE_KEYS.JOIN_REQUESTS, joinRequests);
    joinRequestSecurity.recordSubmission(trimmedPhone);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('join_requests').insert({
          id: newRequest.id,
          name: newRequest.name,
          phone: newRequest.phone,
          block: newRequest.block,
          flat_number: newRequest.flat_number,
          apartment_id: newRequest.apartment_id,
          status: 'pending',
          created_at: newRequest.created_at
        });
      } catch (err) {
        console.warn('[PressWala] Error inserting join request into Supabase:', err);
      }
    }

    return newRequest;
  },

  async getPendingJoinRequests(apartmentId?: string): Promise<ResidentJoinRequest[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase
          .from('join_requests')
          .select('*')
          .eq('status', 'pending')
          .order('created_at', { ascending: false });
        if (apartmentId) {
          query = query.eq('apartment_id', apartmentId);
        }
        const { data, error } = await query;
        if (!error && data) return data as ResidentJoinRequest[];
      } catch (err) {
        console.warn('[PressWala] Error fetching pending join requests from Supabase:', err);
      }
    }

    const requests = loadFromStorage<ResidentJoinRequest[]>(STORAGE_KEYS.JOIN_REQUESTS, []);
    return requests.filter(r => r.status === 'pending' && (!apartmentId || r.apartment_id === apartmentId));
  },

  async approveResidentJoinRequest(requestId: string): Promise<boolean> {
    const requests = loadFromStorage<ResidentJoinRequest[]>(STORAGE_KEYS.JOIN_REQUESTS, []);
    const req = requests.find(r => r.id === requestId);
    if (!req) {
      throw new Error(`Join request ${requestId} not found`);
    }

    req.status = 'approved';
    req.reviewed_at = new Date().toISOString();
    saveToStorage(STORAGE_KEYS.JOIN_REQUESTS, requests);

    // Upsert resident account in users
    const users = loadFromStorage<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
    let user = users.find(u => u.flat_number.toUpperCase() === req.flat_number.toUpperCase());
    if (user) {
      user.name = req.name;
      user.phone = req.phone;
      user.block = req.block;
      user.apartment_id = req.apartment_id;
      user.apartment_name = req.apartment_name;
      user.status = 'active';
      user.approved_at = new Date().toISOString();
    } else {
      user = {
        id: crypto.randomUUID ? crypto.randomUUID() : `usr-${Date.now()}`,
        name: req.name,
        flat_number: req.flat_number,
        phone: req.phone,
        block: req.block,
        apartment_id: req.apartment_id,
        apartment_name: req.apartment_name,
        role: 'customer',
        status: 'active',
        approved_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      };
      users.push(user);
    }
    saveToStorage(STORAGE_KEYS.USERS, users);

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.rpc('vendor_approve_join_request', { p_request_id: requestId });
        if (error) {
          console.warn('[PressWala] Supabase vendor_approve_join_request note:', error.message);
        }
      } catch (err) {
        console.warn('[PressWala] Error approving join request on Supabase:', err);
      }
    }

    return true;
  },

  async rejectResidentJoinRequest(requestId: string): Promise<boolean> {
    const requests = loadFromStorage<ResidentJoinRequest[]>(STORAGE_KEYS.JOIN_REQUESTS, []);
    const req = requests.find(r => r.id === requestId);
    if (!req) {
      throw new Error(`Join request ${requestId} not found`);
    }

    req.status = 'rejected';
    req.reviewed_at = new Date().toISOString();
    saveToStorage(STORAGE_KEYS.JOIN_REQUESTS, requests);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.rpc('vendor_reject_join_request', { p_request_id: requestId });
      } catch (err) {
        console.warn('[PressWala] Error rejecting join request on Supabase:', err);
      }
    }

    return true;
  },

  // 17. Vendor Resident Revocation (Phase B)
  async revokeResidentAccess(customerId: string): Promise<boolean> {
    const users = loadFromStorage<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
    const user = users.find(u => u.id === customerId || u.flat_number.toUpperCase() === customerId.toUpperCase());
    if (!user) {
      throw new Error(`Resident ${customerId} not found`);
    }

    user.status = 'revoked';
    saveToStorage(STORAGE_KEYS.USERS, users);

    // Immediately kill active session and tokens if this resident is currently logged in
    try {
      const activeSessionRaw = localStorage.getItem('presswala_active_session_v2');
      if (activeSessionRaw) {
        const activeSession = JSON.parse(activeSessionRaw);
        if (
          activeSession.id === user.id || 
          activeSession.flat_number?.toUpperCase() === user.flat_number.toUpperCase() ||
          activeSession.phone === user.phone
        ) {
          localStorage.removeItem('presswala_active_session_v2');
        }
      }
    } catch (e) {
      console.warn('[PressWala] Error clearing local session on revocation:', e);
    }

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.rpc('vendor_revoke_resident', { p_customer_id: customerId });
      } catch (err) {
        console.warn('[PressWala] Error revoking resident on Supabase:', err);
      }
    }

    return true;
  },

  // 19. User Profile Update (with Immutable Columns Lockdown)
  async updateUserProfile(
    userId: string,
    updates: Partial<User>,
    caller?: { id: string; role: string; apartment_id?: string }
  ): Promise<User> {
    const users = loadFromStorage<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
    const userIndex = users.findIndex(u => u.id === userId || u.flat_number.toUpperCase() === userId.toUpperCase());
    if (userIndex === -1) {
      throw new Error(`User ${userId} not found`);
    }

    const existingUser = users[userIndex];

    // If caller is provided:
    // Enforce per-field permissions rather than block access:
    // 1. Owner can change role, status, apartment_id, approved_at freely
    // 2. role: can ONLY be changed by owner. Reject vendor or resident attempts.
    // 3. apartment_id: can ONLY be changed by owner. Reject vendor or resident attempts.
    // 4. status and approved_at: vendor may change only when resident's existing apartment matches
    //    vendor's apartment AND apartment_id is not changed in the same statement.
    if (caller) {
      const isOwner = caller.role === 'owner';
      if (!isOwner) {
        // Reject role changes from non-owners (including vendors for own residents)
        if (updates.role !== undefined && updates.role !== existingUser.role) {
          throw new Error('Access Denied: Only platform owner can modify user roles.');
        }

        // Reject apartment_id changes from non-owners
        if (updates.apartment_id !== undefined && updates.apartment_id !== existingUser.apartment_id) {
          throw new Error('Access Denied: Only platform owner can modify apartment assignments.');
        }

        // Check status and approved_at updates
        if (
          (updates.status !== undefined && updates.status !== existingUser.status) ||
          (updates.approved_at !== undefined && updates.approved_at !== existingUser.approved_at)
        ) {
          const isAssignedVendor = caller.role === 'vendor' && caller.apartment_id === existingUser.apartment_id;
          const isAptChanging = updates.apartment_id !== undefined && updates.apartment_id !== existingUser.apartment_id;
          if (!isAssignedVendor || isAptChanging) {
            throw new Error('Access Denied: You do not have permission to modify status or approval timestamp.');
          }
        }
      }
    }

    const updatedUser: User = {
      ...existingUser,
      ...updates
    };

    users[userIndex] = updatedUser;
    saveToStorage(STORAGE_KEYS.USERS, users);

    // If this is the active user in session, keep session updated
    try {
      const activeRaw = localStorage.getItem('presswala_active_session_v2');
      if (activeRaw) {
        const sessionUser = JSON.parse(activeRaw);
        if (sessionUser.id === existingUser.id || sessionUser.flat_number?.toUpperCase() === existingUser.flat_number.toUpperCase()) {
          localStorage.setItem('presswala_active_session_v2', JSON.stringify(updatedUser));
        }
      }
    } catch (e) {}

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('users')
          .update(updates)
          .eq('id', existingUser.id);
      } catch (err) {
        console.warn('[PressWala] Error updating user profile in Supabase:', err);
      }
    }

    return updatedUser;
  },

  // 17. Multi-Contact Phone Management (Phase C)
  _checkContactCallerPermission(
    targetCustomerId: string,
    targetApartmentId?: string,
    caller?: { id?: string; role?: string; apartment_id?: string }
  ): void {
    let activeCaller = caller;
    if (!activeCaller) {
      try {
        const raw = localStorage.getItem('presswala_active_session_v2');
        if (raw) {
          const u = JSON.parse(raw);
          activeCaller = { id: u.id, role: u.role, apartment_id: u.apartment_id };
        }
      } catch (e) {}
    }

    if (!activeCaller) return; // Unauthenticated / internal script with no caller context specified
    if (activeCaller.role === 'owner') return; // Owner has unrestricted access

    if (activeCaller.role === 'vendor') {
      if (!activeCaller.apartment_id || !targetApartmentId || activeCaller.apartment_id !== targetApartmentId) {
        throw new Error('Access Denied: Vendors can only manage contacts for residents within their own apartment.');
      }
      return;
    }

    if (activeCaller.role === 'customer') {
      if (activeCaller.id !== targetCustomerId) {
        throw new Error('Access Denied: Residents can only manage contacts for their own account.');
      }
      return;
    }

    throw new Error('Access Denied: Unauthorized caller.');
  },

  async getCustomerContacts(customerId: string): Promise<CustomerContact[]> {
    const contacts = loadFromStorage<CustomerContact[]>(STORAGE_KEYS.CUSTOMER_CONTACTS, INITIAL_CUSTOMER_CONTACTS);
    const userContacts = contacts.filter(c => c.customer_id === customerId);

    if (userContacts.length === 0) {
      // Synthetic fallback from user profile if exists
      const users = loadFromStorage<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
      const user = users.find(u => u.id === customerId);
      if (user && user.phone) {
        const fallback: CustomerContact = {
          id: `contact-initial-${user.id}`,
          customer_id: customerId,
          apartment_id: user.apartment_id,
          phone: user.phone,
          label: 'Primary',
          is_primary: true,
          created_at: new Date().toISOString()
        };
        contacts.push(fallback);
        saveToStorage(STORAGE_KEYS.CUSTOMER_CONTACTS, contacts);
        return [fallback];
      }
    }

    return userContacts.sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0));
  },

  async addCustomerContact(
    customerId: string,
    phone: string,
    label: string,
    isPrimary: boolean = false,
    caller?: { id?: string; role?: string; apartment_id?: string }
  ): Promise<CustomerContact> {
    const users = loadFromStorage<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
    const user = users.find(u => u.id === customerId);
    if (!user) {
      throw new Error('Resident not found.');
    }

    this._checkContactCallerPermission(customerId, user.apartment_id, caller);

    const contacts = loadFromStorage<CustomerContact[]>(STORAGE_KEYS.CUSTOMER_CONTACTS, INITIAL_CUSTOMER_CONTACTS);
    const existingUserContacts = contacts.filter(c => c.customer_id === customerId);

    if (existingUserContacts.length >= 5) {
      throw new Error('Limit reached: Maximum 5 contact numbers allowed per resident.');
    }

    const trimmedPhone = phone.trim().replace(/\D/g, '');
    if (trimmedPhone.length !== 10) {
      throw new Error('Please enter a valid 10-digit mobile number.');
    }

    const trimmedLabel = label.trim();
    if (!trimmedLabel || trimmedLabel.length > 30) {
      throw new Error('Contact label must be between 1 and 30 characters.');
    }

    // Enforce exactly one primary:
    // If this is the resident's first contact, force makePrimary = true.
    // If not first contact, but no existing contact is primary (edge case), makePrimary = true.
    const hasExistingPrimary = existingUserContacts.some(c => c.is_primary);
    const makePrimary = isPrimary || existingUserContacts.length === 0 || !hasExistingPrimary;

    if (makePrimary) {
      existingUserContacts.forEach(c => {
        c.is_primary = false;
      });
      user.phone = trimmedPhone;
      saveToStorage(STORAGE_KEYS.USERS, users);
    }

    const newContact: CustomerContact = {
      id: `contact-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      customer_id: customerId,
      apartment_id: user.apartment_id,
      phone: trimmedPhone,
      label: trimmedLabel,
      is_primary: makePrimary,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    contacts.push(newContact);
    saveToStorage(STORAGE_KEYS.CUSTOMER_CONTACTS, contacts);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('customer_contacts').insert({
          id: newContact.id,
          customer_id: newContact.customer_id,
          apartment_id: newContact.apartment_id,
          phone: newContact.phone,
          label: newContact.label,
          is_primary: newContact.is_primary
        });
      } catch (e) {
        console.warn('[PressWala] Failed to insert contact in Supabase:', e);
      }
    }

    return newContact;
  },

  async updateCustomerContact(
    contactId: string,
    updates: { phone?: string; label?: string; is_primary?: boolean },
    caller?: { id?: string; role?: string; apartment_id?: string }
  ): Promise<CustomerContact> {
    const contacts = loadFromStorage<CustomerContact[]>(STORAGE_KEYS.CUSTOMER_CONTACTS, INITIAL_CUSTOMER_CONTACTS);
    const contactIndex = contacts.findIndex(c => c.id === contactId);
    if (contactIndex === -1) {
      throw new Error('Contact not found.');
    }

    const contact = contacts[contactIndex];
    const users = loadFromStorage<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
    const user = users.find(u => u.id === contact.customer_id);

    this._checkContactCallerPermission(contact.customer_id, contact.apartment_id, caller);

    if (updates.phone !== undefined) {
      const trimmedPhone = updates.phone.trim().replace(/\D/g, '');
      if (trimmedPhone.length !== 10) {
        throw new Error('Please enter a valid 10-digit mobile number.');
      }
      contact.phone = trimmedPhone;
      if (contact.is_primary && user) {
        user.phone = trimmedPhone;
        saveToStorage(STORAGE_KEYS.USERS, users);
      }
    }

    if (updates.label !== undefined) {
      const trimmedLabel = updates.label.trim();
      if (!trimmedLabel || trimmedLabel.length > 30) {
        throw new Error('Contact label must be between 1 and 30 characters.');
      }
      contact.label = trimmedLabel;
    }

    if (updates.is_primary !== undefined) {
      if (updates.is_primary === true) {
        contacts.filter(c => c.customer_id === contact.customer_id).forEach(c => {
          c.is_primary = (c.id === contactId);
        });
        contact.is_primary = true;
        if (user) {
          user.phone = contact.phone;
          saveToStorage(STORAGE_KEYS.USERS, users);
        }
      } else if (updates.is_primary === false && contact.is_primary) {
        // Enforce exactly one primary invariant: cannot unset primary if no other contact is primary
        const hasOtherPrimary = contacts.some(
          c => c.customer_id === contact.customer_id && c.id !== contactId && c.is_primary
        );
        if (!hasOtherPrimary) {
          throw new Error('A resident must always have exactly one primary contact number. Set another number as primary instead.');
        }
        contact.is_primary = false;
      }
    }

    contact.updated_at = new Date().toISOString();
    contacts[contactIndex] = contact;
    saveToStorage(STORAGE_KEYS.CUSTOMER_CONTACTS, contacts);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('customer_contacts').update({
          phone: contact.phone,
          label: contact.label,
          is_primary: contact.is_primary,
          updated_at: contact.updated_at
        }).eq('id', contact.id);
      } catch (e) {
        console.warn('[PressWala] Failed to update contact in Supabase:', e);
      }
    }

    return contact;
  },

  async deleteCustomerContact(
    contactId: string,
    caller?: { id?: string; role?: string; apartment_id?: string }
  ): Promise<void> {
    const contacts = loadFromStorage<CustomerContact[]>(STORAGE_KEYS.CUSTOMER_CONTACTS, INITIAL_CUSTOMER_CONTACTS);
    const contactIndex = contacts.findIndex(c => c.id === contactId);
    if (contactIndex === -1) {
      throw new Error('Contact not found.');
    }

    const contact = contacts[contactIndex];
    const customerId = contact.customer_id;
    const isPrimary = contact.is_primary;

    this._checkContactCallerPermission(customerId, contact.apartment_id, caller);

    // Hard floor: reject any deletion that would bring count to 0
    const userContacts = contacts.filter(c => c.customer_id === customerId);
    if (userContacts.length <= 1) {
      throw new Error('Cannot delete contact: A resident must have at least 1 contact number on file.');
    }

    contacts.splice(contactIndex, 1);

    // If deleted contact was primary, automatically promote oldest remaining contact
    const remainingUserContacts = contacts.filter(c => c.customer_id === customerId);
    if (isPrimary && remainingUserContacts.length > 0) {
      remainingUserContacts.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
      remainingUserContacts[0].is_primary = true;
      const users = loadFromStorage<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
      const user = users.find(u => u.id === customerId);
      if (user) {
        user.phone = remainingUserContacts[0].phone;
        saveToStorage(STORAGE_KEYS.USERS, users);
      }
    }

    saveToStorage(STORAGE_KEYS.CUSTOMER_CONTACTS, contacts);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('customer_contacts').delete().eq('id', contactId);
      } catch (e) {
        console.warn('[PressWala] Failed to delete contact in Supabase:', e);
      }
    }
  },

  // 18. Block Dashboard Data Aggregation (Phase C)
  async getBlockDashboardData(apartmentId?: string): Promise<BlockGroup[]> {
    const summaries = await this.getCustomerSummaries(apartmentId);
    const orders = await this.getOrders({ apartmentId });

    // Active approved residents
    const approvedResidents = summaries.filter(s => s.status !== 'revoked');

    const blockMap = new Map<string, BlockResidentSummary[]>();

    for (const resident of approvedResidents) {
      const block = resident.block || (resident.flat_number ? resident.flat_number.charAt(0).toUpperCase() : 'A');

      const residentOrders = orders.filter(
        o => (o.customer_id === resident.customer_id || o.flat_number.toUpperCase() === resident.flat_number.toUpperCase())
      );

      const activeOrders = residentOrders
        .filter(o => o.status === 'created' || o.status === 'in_progress' || o.status === 'ready')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      const latestActive = activeOrders[0];

      const blockResident: BlockResidentSummary = {
        ...resident,
        block,
        active_order: latestActive ? {
          id: latestActive.id,
          order_number: latestActive.order_number,
          status: latestActive.status,
          total_amount: latestActive.total_amount,
          paid_amount: latestActive.paid_amount || 0,
          garment_count: latestActive.items ? latestActive.items.reduce((sum, it) => sum + it.quantity, 0) : 0,
          created_at: latestActive.created_at
        } : null
      };

      if (!blockMap.has(block)) {
        blockMap.set(block, []);
      }
      blockMap.get(block)!.push(blockResident);
    }

    const blockGroups: BlockGroup[] = [];
    const sortedBlocks = Array.from(blockMap.keys()).sort();

    for (const blockName of sortedBlocks) {
      const residents = blockMap.get(blockName)!;
      residents.sort((a, b) => a.flat_number.localeCompare(b.flat_number, undefined, { numeric: true }));

      const activeOrdersCount = residents.filter(r => r.active_order !== null && r.active_order !== undefined).length;
      const totalDues = residents.reduce((sum, r) => sum + r.outstanding_balance, 0);

      blockGroups.push({
        blockName,
        residents,
        totalResidents: residents.length,
        activeOrdersCount,
        totalDues
      });
    }

    return blockGroups;
  },

  // 19. Delivery Slot Booking (Phase D)
  async getAvailableDeliverySlots(
    apartmentId: string,
    startDateStr?: string,
    daysAhead: number = 3
  ): Promise<DeliverySlotAvailability[]> {
    const orders = loadFromStorage<Order[]>(STORAGE_KEYS.ORDERS, INITIAL_ORDERS);
    const windows = ['08:00 - 10:00', '10:00 - 12:00', '16:00 - 18:00', '18:00 - 20:00'];
    const capacity = 3;
    const results: DeliverySlotAvailability[] = [];

    const baseDate = startDateStr ? new Date(startDateStr) : new Date();

    for (let d = 0; d < daysAhead; d++) {
      const dateObj = new Date(baseDate);
      dateObj.setDate(baseDate.getDate() + d);
      const dateStr = dateObj.toISOString().split('T')[0];

      for (const win of windows) {
        const bookedCount = orders.filter(
          o => o.apartment_id === apartmentId &&
               o.delivery_slot_date === dateStr &&
               o.delivery_slot_window === win &&
               o.status !== 'delivered'
        ).length;

        results.push({
          date: dateStr,
          window: win,
          bookedCount,
          capacity,
          isAvailable: bookedCount < capacity
        });
      }
    }

    return results;
  },

  async bookDeliverySlot(
    orderId: string,
    date: string,
    window: string,
    caller?: { id?: string; role?: string; apartment_id?: string }
  ): Promise<Order> {
    const orders = loadFromStorage<Order[]>(STORAGE_KEYS.ORDERS, INITIAL_ORDERS);
    const orderIndex = orders.findIndex(o => o.id === orderId);
    if (orderIndex === -1) {
      throw new Error('Order not found');
    }
    const order = orders[orderIndex];

    if (caller) {
      if (caller.role === 'customer' && caller.id !== order.customer_id) {
        throw new Error('Access Denied: You can only book delivery slots for your own orders.');
      }
      if (caller.role === 'vendor' && caller.apartment_id !== order.apartment_id) {
        throw new Error('Access Denied: Vendors can only manage delivery slots within their assigned apartment.');
      }
    }

    // Check capacity: max 3 per apartment per (date, window)
    const existingSlotBookings = orders.filter(
      o => o.id !== orderId &&
           o.apartment_id === order.apartment_id &&
           o.delivery_slot_date === date &&
           o.delivery_slot_window === window &&
           o.status !== 'delivered'
    );
    if (existingSlotBookings.length >= 3) {
      throw new Error(`Delivery slot full: The selected time window on ${date} is at maximum capacity.`);
    }

    order.delivery_slot_date = date;
    order.delivery_slot_window = window;
    order.delivery_slot_booked_at = new Date().toISOString();
    order.updated_at = new Date().toISOString();

    orders[orderIndex] = order;
    saveToStorage(STORAGE_KEYS.ORDERS, orders);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('orders')
          .update({
            delivery_slot_date: order.delivery_slot_date,
            delivery_slot_window: order.delivery_slot_window,
            delivery_slot_booked_at: order.delivery_slot_booked_at,
            updated_at: order.updated_at
          })
          .eq('id', order.id);
      } catch (e) {
        console.warn('[PressWala] Error updating delivery slot in Supabase:', e);
      }
    }

    return order;
  },

  // 20. Mutual Order-Change Proposals (Phase D)
  async proposeOrderChange(
    orderId: string,
    proposedItems: { garmentTypeId: string; garmentName: string; unitPrice: number; quantity: number }[],
    reason?: string,
    caller?: { id?: string; role?: string; apartment_id?: string }
  ): Promise<OrderChangeProposal> {
    const orders = loadFromStorage<Order[]>(STORAGE_KEYS.ORDERS, INITIAL_ORDERS);
    const order = orders.find(o => o.id === orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    if (order.status === 'delivered') {
      throw new Error('Cannot propose changes to an order that has already been delivered.');
    }

    if (caller) {
      if (caller.role === 'customer' && caller.id !== order.customer_id) {
        throw new Error('Access Denied: You can only propose changes to your own orders.');
      }
      if (caller.role === 'vendor' && caller.apartment_id !== order.apartment_id) {
        throw new Error('Access Denied: Vendors can only propose changes for orders within their assigned apartment.');
      }
    }

    const proposals = loadFromStorage<OrderChangeProposal[]>(STORAGE_KEYS.ORDER_CHANGE_PROPOSALS, []);
    const existingPending = proposals.find(p => p.order_id === orderId && p.status === 'pending');
    if (existingPending) {
      throw new Error('A change proposal is already pending review for this order.');
    }

    const proposedOrderItems: OrderItem[] = proposedItems.map(item => ({
      id: crypto.randomUUID ? crypto.randomUUID() : `prop-itm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      order_id: orderId,
      garment_type_id: item.garmentTypeId,
      garment_name: item.garmentName,
      unit_price: item.unitPrice,
      quantity: item.quantity,
      subtotal: item.unitPrice * item.quantity
    }));

    const proposedTotal = proposedOrderItems.reduce((acc, itm) => acc + itm.subtotal, 0);
    const proposedBy: 'customer' | 'vendor' = caller?.role === 'vendor' ? 'vendor' : 'customer';

    const newProposal: OrderChangeProposal = {
      id: `prop-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      order_id: orderId,
      apartment_id: order.apartment_id,
      proposed_by: proposedBy,
      proposer_user_id: caller?.id || (proposedBy === 'customer' ? order.customer_id : 'vendor'),
      status: 'pending',
      original_items: order.items || [],
      proposed_items: proposedOrderItems,
      original_total_amount: order.total_amount,
      proposed_total_amount: proposedTotal,
      reason: reason?.trim() || undefined,
      created_at: new Date().toISOString()
    };

    proposals.push(newProposal);
    saveToStorage(STORAGE_KEYS.ORDER_CHANGE_PROPOSALS, proposals);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('order_change_proposals').insert(newProposal);
      } catch (e) {
        console.warn('[PressWala] Error inserting proposal in Supabase:', e);
      }
    }

    return newProposal;
  },

  async respondToOrderChange(
    proposalId: string,
    decision: 'accept' | 'decline',
    caller?: { id?: string; role?: string; apartment_id?: string }
  ): Promise<Order> {
    const proposals = loadFromStorage<OrderChangeProposal[]>(STORAGE_KEYS.ORDER_CHANGE_PROPOSALS, []);
    const proposalIndex = proposals.findIndex(p => p.id === proposalId);
    if (proposalIndex === -1) {
      throw new Error('Change proposal not found');
    }
    const proposal = proposals[proposalIndex];
    if (proposal.status !== 'pending') {
      throw new Error(`This change proposal has already been ${proposal.status}.`);
    }

    const orders = loadFromStorage<Order[]>(STORAGE_KEYS.ORDERS, INITIAL_ORDERS);
    const orderIndex = orders.findIndex(o => o.id === proposal.order_id);
    if (orderIndex === -1) {
      throw new Error('Order not found');
    }
    const order = orders[orderIndex];

    // Verify caller is authorized to respond and prevent self-approval:
    if (caller) {
      if (caller.role === 'owner') {
        // Owner permitted
      } else if (proposal.proposed_by === 'vendor') {
        if (caller.role === 'vendor' || caller.id === proposal.proposer_user_id) {
          throw new Error('Self-approval forbidden: A change proposal cannot be accepted or declined by the party who created it.');
        }
        if (caller.role !== 'customer' || caller.id !== order.customer_id) {
          throw new Error('Access Denied: Only the resident can respond to a vendor proposal.');
        }
      } else if (proposal.proposed_by === 'customer') {
        if (caller.role === 'customer' || caller.id === proposal.proposer_user_id) {
          throw new Error('Self-approval forbidden: A change proposal cannot be accepted or declined by the party who created it.');
        }
        if (caller.role !== 'vendor' || caller.apartment_id !== order.apartment_id) {
          throw new Error('Access Denied: Only the assigned vendor can respond to a resident proposal.');
        }
      }
    }

    proposal.status = decision === 'accept' ? 'accepted' : 'declined';
    proposal.reviewed_at = new Date().toISOString();
    proposals[proposalIndex] = proposal;
    saveToStorage(STORAGE_KEYS.ORDER_CHANGE_PROPOSALS, proposals);

    if (decision === 'accept') {
      order.items = proposal.proposed_items;
      order.total_amount = proposal.proposed_total_amount;
      order.updated_at = new Date().toISOString();
      order.active_change_proposal = null;
      orders[orderIndex] = order;
      saveToStorage(STORAGE_KEYS.ORDERS, orders);

      if (isSupabaseConfigured && supabase) {
        try {
          await supabase
            .from('orders')
            .update({ total_amount: order.total_amount, updated_at: order.updated_at })
            .eq('id', order.id);
          await supabase.from('order_items').delete().eq('order_id', order.id);
          await supabase.from('order_items').insert(order.items);
        } catch (e) {
          console.warn('[PressWala] Error updating accepted order in Supabase:', e);
        }
      }
    } else {
      order.active_change_proposal = null;
    }

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('order_change_proposals')
          .update({ status: proposal.status, reviewed_at: proposal.reviewed_at })
          .eq('id', proposal.id);
      } catch (e) {
        console.warn('[PressWala] Error updating proposal status in Supabase:', e);
      }
    }

    return order;
  },

  async getOrderChangeProposal(orderId: string): Promise<OrderChangeProposal | null> {
    const proposals = loadFromStorage<OrderChangeProposal[]>(STORAGE_KEYS.ORDER_CHANGE_PROPOSALS, []);
    return proposals.find(p => p.order_id === orderId && p.status === 'pending') || null;
  }
};
