-- ==============================================================================
-- PressWala - Ironing Vendor Order & Payment Tracker
-- Database Schema Migration: 001_initial_schema.sql
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. Garment Types Catalog
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS garment_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Daily Wear',
    icon TEXT NOT NULL DEFAULT 'shirt',
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 2. Users / Profiles (Residents & Vendor Staff)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    flat_number TEXT NOT NULL UNIQUE, -- e.g. 'A-402' or 'VENDOR'
    phone TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('customer', 'vendor')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 3. Orders
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT NOT NULL UNIQUE, -- Human-readable identifier e.g. 'PW-1001'
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    flat_number TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('created', 'in_progress', 'ready', 'delivered')) DEFAULT 'created',
    payment_status TEXT NOT NULL CHECK (payment_status IN ('unpaid', 'paid', 'partial')) DEFAULT 'unpaid',
    total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    paid_amount NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
    special_instructions TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    delivered_at TIMESTAMPTZ
);

-- ------------------------------------------------------------------------------
-- 4. Order Items (Line Items)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    garment_type_id UUID REFERENCES garment_types(id) ON DELETE SET NULL,
    garment_name TEXT NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0)
);

-- ------------------------------------------------------------------------------
-- 5. Payment Ledger (Audit trail of every cash / UPI payment)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    flat_number TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'upi')) DEFAULT 'cash',
    reference_id TEXT, -- UPI UTR or notes
    notes TEXT,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 6. Indexes for Performance & Instant Querying
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_flat_number ON orders(flat_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_recorded_at ON payments(recorded_at DESC);

-- ------------------------------------------------------------------------------
-- 7. Automated updated_at Trigger
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_order_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_order_timestamp ON orders;
CREATE TRIGGER trigger_update_order_timestamp
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_order_timestamp();

-- ------------------------------------------------------------------------------
-- 8. Seed Initial Garment Price Catalog
-- ------------------------------------------------------------------------------
INSERT INTO garment_types (id, name, category, icon, price, sort_order)
VALUES
    ('a1111111-0000-0000-0000-000000000001', 'Shirt / T-Shirt', 'Daily Wear', 'shirt', 10.00, 1),
    ('a1111111-0000-0000-0000-000000000002', 'Pant / Trousers / Jeans', 'Daily Wear', 'trousers', 12.00, 2),
    ('a1111111-0000-0000-0000-000000000003', 'Kurta / Salwar / Top', 'Ethnic Wear', 'sparkles', 15.00, 3),
    ('a1111111-0000-0000-0000-000000000004', 'Saree (Daily / Cotton)', 'Ethnic Wear', 'palette', 40.00, 4),
    ('a1111111-0000-0000-0000-000000000005', 'Saree (Silk / Heavy Embroidery)', 'Ethnic Wear', 'crown', 70.00, 5),
    ('a1111111-0000-0000-0000-000000000006', 'Bed Sheet (Single)', 'Household', 'bed', 20.00, 6),
    ('a1111111-0000-0000-0000-000000000007', 'Bed Sheet (Double / King)', 'Household', 'bed-double', 35.00, 7),
    ('a1111111-0000-0000-0000-000000000008', 'Suit / Blazer / Coat', 'Formal', 'briefcase', 60.00, 8),
    ('a1111111-0000-0000-0000-000000000009', 'Curtain / Drapes', 'Household', 'layers', 45.00, 9)
ON CONFLICT (id) DO UPDATE 
SET price = EXCLUDED.price, name = EXCLUDED.name, category = EXCLUDED.category;

-- ------------------------------------------------------------------------------
-- 9. Seed Initial Users (Vendor & Residents)
-- ------------------------------------------------------------------------------
INSERT INTO users (id, name, flat_number, phone, role)
VALUES
    ('b1111111-0000-0000-0000-000000000001', 'Ramu Dhobi (Vendor)', 'VENDOR', '9876543210', 'vendor'),
    ('b1111111-0000-0000-0000-000000000002', 'Sharma Ji', 'A-1001', '9810011111', 'customer'),
    ('b1111111-0000-0000-0000-000000000003', 'Pooja Verma', 'A-2004', '9810022222', 'customer'),
    ('b1111111-0000-0000-0000-000000000004', 'Karthik Raja', 'B-3002', '9810033333', 'customer'),
    ('b1111111-0000-0000-0000-000000000005', 'Ananya Patel', 'C-4005', '9810044444', 'customer')
ON CONFLICT (flat_number) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 10. Seed Demo Orders (Active, Completed & Outstanding Unpaid)
-- ------------------------------------------------------------------------------
-- Order 1: New order placed by A-1001 (Ready for pickup)
INSERT INTO orders (id, order_number, customer_id, flat_number, customer_name, customer_phone, status, payment_status, total_amount, paid_amount, special_instructions)
VALUES (
    'c1111111-0000-0000-0000-000000000001',
    'PW-1001',
    'b1111111-0000-0000-0000-000000000002',
    'A-1001',
    'Sharma Ji',
    '9810011111',
    'created',
    'unpaid',
    54.00,
    0.00,
    'Please pick up from door hook outside A-1001'
) ON CONFLICT (order_number) DO NOTHING;

INSERT INTO order_items (order_id, garment_type_id, garment_name, unit_price, quantity, subtotal)
VALUES
    ('c1111111-0000-0000-0000-000000000001', 'a1111111-0000-0000-0000-000000000001', 'Shirt / T-Shirt', 10.00, 3, 30.00),
    ('c1111111-0000-0000-0000-000000000001', 'a1111111-0000-0000-0000-000000000002', 'Pant / Trousers / Jeans', 12.00, 2, 24.00)
ON CONFLICT DO NOTHING;

-- Order 2: Delivered but UNPAID for A-2004 (Demonstrates the critical problem: pending revenue!)
INSERT INTO orders (id, order_number, customer_id, flat_number, customer_name, customer_phone, status, payment_status, total_amount, paid_amount, special_instructions, delivered_at)
VALUES (
    'c1111111-0000-0000-0000-000000000002',
    'PW-1002',
    'b1111111-0000-0000-0000-000000000003',
    'A-2004',
    'Pooja Verma',
    '9810022222',
    'delivered',
    'unpaid',
    110.00,
    0.00,
    'Delivered yesterday evening. Payment promised via UPI later.',
    NOW() - INTERVAL '1 DAY'
) ON CONFLICT (order_number) DO NOTHING;

INSERT INTO order_items (order_id, garment_type_id, garment_name, unit_price, quantity, subtotal)
VALUES
    ('c1111111-0000-0000-0000-000000000002', 'a1111111-0000-0000-0000-000000000004', 'Saree (Daily / Cotton)', 40.00, 1, 40.00),
    ('c1111111-0000-0000-0000-000000000002', 'a1111111-0000-0000-0000-000000000005', 'Saree (Silk / Heavy Embroidery)', 70.00, 1, 70.00)
ON CONFLICT DO NOTHING;

-- Order 3: Completed & PAID order for B-3002
INSERT INTO orders (id, order_number, customer_id, flat_number, customer_name, customer_phone, status, payment_status, total_amount, paid_amount, special_instructions, delivered_at)
VALUES (
    'c1111111-0000-0000-0000-000000000003',
    'PW-1003',
    'b1111111-0000-0000-0000-000000000004',
    'B-3002',
    'Karthik Raja',
    '9810033333',
    'delivered',
    'paid',
    80.00,
    80.00,
    'White shirts starched as requested.',
    NOW() - INTERVAL '2 DAYS'
) ON CONFLICT (order_number) DO NOTHING;

INSERT INTO order_items (order_id, garment_type_id, garment_name, unit_price, quantity, subtotal)
VALUES
    ('c1111111-0000-0000-0000-000000000003', 'a1111111-0000-0000-0000-000000000001', 'Shirt / T-Shirt', 10.00, 2, 20.00),
    ('c1111111-0000-0000-0000-000000000003', 'a1111111-0000-0000-0000-000000000008', 'Suit / Blazer / Coat', 60.00, 1, 60.00)
ON CONFLICT DO NOTHING;

INSERT INTO payments (order_id, customer_id, flat_number, amount, payment_method, reference_id, notes)
VALUES (
    'c1111111-0000-0000-0000-000000000003',
    'b1111111-0000-0000-0000-000000000004',
    'B-3002',
    80.00,
    'upi',
    'UPI/729182749182',
    'Received via PhonePe'
) ON CONFLICT DO NOTHING;
