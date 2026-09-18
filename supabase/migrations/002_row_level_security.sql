-- ==============================================================================
-- PressWala - Ironing Vendor Order & Payment Tracker
-- Database Schema Migration: 002_row_level_security.sql
-- Description: Enforces Row Level Security (RLS), Profiles, and Lockout Tracking
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Profiles Table (Binds Supabase auth.users to App Identity)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    flat_number TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('customer', 'vendor')),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_flat_number ON public.profiles(flat_number);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);

-- ------------------------------------------------------------------------------
-- 2. Login Attempts Table (For Rate Limiting & PIN Brute-Force Lockout)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    login_key TEXT NOT NULL, -- Normalized Flat Number or 'VENDOR'
    attempt_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    success BOOLEAN NOT NULL DEFAULT FALSE,
    ip_address TEXT,
    user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_key_time ON public.login_attempts(login_key, attempt_time DESC);

-- ------------------------------------------------------------------------------
-- 3. Automatic Profile Provisioning Trigger
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
    detected_flat TEXT;
    detected_role TEXT;
    matched_user_id UUID;
BEGIN
    -- Extract flat number and role from user metadata or synthetic email pattern
    detected_flat := COALESCE(
        NEW.raw_user_meta_data->>'flat_number',
        CASE 
            WHEN NEW.email LIKE 'vendor%' THEN 'VENDOR'
            WHEN NEW.email LIKE 'flat-%@presswala.internal' THEN 
                UPPER(REPLACE(REPLACE(NEW.email, 'flat-', ''), '@presswala.internal', ''))
            ELSE 'UNKNOWN'
        END
    );

    detected_role := COALESCE(
        NEW.raw_user_meta_data->>'role',
        CASE 
            WHEN detected_flat = 'VENDOR' OR NEW.email LIKE 'vendor%' THEN 'vendor'
            ELSE 'customer'
        END
    );

    -- Find matching legacy or seeded users record if exists
    SELECT id INTO matched_user_id 
    FROM public.users 
    WHERE UPPER(flat_number) = UPPER(detected_flat) 
    LIMIT 1;

    INSERT INTO public.profiles (id, flat_number, role, user_id)
    VALUES (NEW.id, detected_flat, detected_role, matched_user_id)
    ON CONFLICT (id) DO UPDATE 
    SET 
        flat_number = EXCLUDED.flat_number,
        role = EXCLUDED.role,
        user_id = COALESCE(public.profiles.user_id, EXCLUDED.user_id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ------------------------------------------------------------------------------
-- 4. Helper Security Functions (Used in RLS Policies)
-- ------------------------------------------------------------------------------

-- Check if current authenticated session belongs to a vendor
CREATE OR REPLACE FUNCTION public.is_vendor()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.profiles 
        WHERE id = auth.uid() AND role = 'vendor'
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth;

-- Get the flat number associated with the current session
CREATE OR REPLACE FUNCTION public.get_auth_flat()
RETURNS TEXT AS $$
DECLARE
    v_flat TEXT;
BEGIN
    SELECT flat_number INTO v_flat
    FROM public.profiles
    WHERE id = auth.uid()
    LIMIT 1;

    RETURN COALESCE(v_flat, '');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth;

-- Get list of all customer UUIDs tied to this authenticated session
CREATE OR REPLACE FUNCTION public.get_auth_customer_ids()
RETURNS SETOF UUID AS $$
BEGIN
    RETURN QUERY
    SELECT user_id 
    FROM public.profiles 
    WHERE id = auth.uid() AND user_id IS NOT NULL
    UNION
    SELECT id 
    FROM public.users 
    WHERE UPPER(flat_number) = UPPER(public.get_auth_flat())
    UNION
    SELECT auth.uid();
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth;

-- ------------------------------------------------------------------------------
-- 5. Row Level Security Policies
-- ------------------------------------------------------------------------------

-- A. Table: garment_types (Public price list catalog)
ALTER TABLE public.garment_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "garment_types_read_public" ON public.garment_types;
CREATE POLICY "garment_types_read_public" ON public.garment_types
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "garment_types_vendor_insert" ON public.garment_types;
CREATE POLICY "garment_types_vendor_insert" ON public.garment_types
    FOR INSERT
    WITH CHECK (public.is_vendor());

DROP POLICY IF EXISTS "garment_types_vendor_update" ON public.garment_types;
CREATE POLICY "garment_types_vendor_update" ON public.garment_types
    FOR UPDATE
    USING (public.is_vendor())
    WITH CHECK (public.is_vendor());

DROP POLICY IF EXISTS "garment_types_vendor_delete" ON public.garment_types;
CREATE POLICY "garment_types_vendor_delete" ON public.garment_types
    FOR DELETE
    USING (public.is_vendor());


-- B. Table: profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles
    FOR SELECT
    USING (
        public.is_vendor() OR 
        id = auth.uid()
    );

DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
CREATE POLICY "profiles_insert" ON public.profiles
    FOR INSERT
    WITH CHECK (
        id = auth.uid() OR 
        public.is_vendor()
    );

DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_update" ON public.profiles
    FOR UPDATE
    USING (id = auth.uid() OR public.is_vendor())
    WITH CHECK (id = auth.uid() OR public.is_vendor());


-- C. Table: users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select" ON public.users;
CREATE POLICY "users_select" ON public.users
    FOR SELECT
    USING (
        public.is_vendor() OR
        id IN (SELECT public.get_auth_customer_ids()) OR
        UPPER(flat_number) = UPPER(public.get_auth_flat())
    );

DROP POLICY IF EXISTS "users_insert" ON public.users;
CREATE POLICY "users_insert" ON public.users
    FOR INSERT
    WITH CHECK (true); -- Allow registration of new residents

DROP POLICY IF EXISTS "users_update" ON public.users;
CREATE POLICY "users_update" ON public.users
    FOR UPDATE
    USING (
        public.is_vendor() OR 
        id IN (SELECT public.get_auth_customer_ids())
    )
    WITH CHECK (
        public.is_vendor() OR 
        id IN (SELECT public.get_auth_customer_ids())
    );


-- D. Table: orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_select" ON public.orders;
CREATE POLICY "orders_select" ON public.orders
    FOR SELECT
    USING (
        public.is_vendor() OR
        customer_id IN (SELECT public.get_auth_customer_ids()) OR
        UPPER(flat_number) = UPPER(public.get_auth_flat())
    );

DROP POLICY IF EXISTS "orders_insert" ON public.orders;
CREATE POLICY "orders_insert" ON public.orders
    FOR INSERT
    WITH CHECK (
        public.is_vendor() OR
        customer_id IN (SELECT public.get_auth_customer_ids()) OR
        UPPER(flat_number) = UPPER(public.get_auth_flat())
    );

DROP POLICY IF EXISTS "orders_vendor_update" ON public.orders;
CREATE POLICY "orders_vendor_update" ON public.orders
    FOR UPDATE
    USING (public.is_vendor())
    WITH CHECK (public.is_vendor());

DROP POLICY IF EXISTS "orders_vendor_delete" ON public.orders;
CREATE POLICY "orders_vendor_delete" ON public.orders
    FOR DELETE
    USING (public.is_vendor());


-- E. Table: order_items
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "order_items_select" ON public.order_items;
CREATE POLICY "order_items_select" ON public.order_items
    FOR SELECT
    USING (
        public.is_vendor() OR
        EXISTS (
            SELECT 1 FROM public.orders 
            WHERE public.orders.id = public.order_items.order_id 
              AND (
                  public.orders.customer_id IN (SELECT public.get_auth_customer_ids()) OR
                  UPPER(public.orders.flat_number) = UPPER(public.get_auth_flat())
              )
        )
    );

DROP POLICY IF EXISTS "order_items_insert" ON public.order_items;
CREATE POLICY "order_items_insert" ON public.order_items
    FOR INSERT
    WITH CHECK (
        public.is_vendor() OR
        EXISTS (
            SELECT 1 FROM public.orders 
            WHERE public.orders.id = public.order_items.order_id 
              AND (
                  public.orders.customer_id IN (SELECT public.get_auth_customer_ids()) OR
                  UPPER(public.orders.flat_number) = UPPER(public.get_auth_flat())
              )
        )
    );

DROP POLICY IF EXISTS "order_items_vendor_update" ON public.order_items;
CREATE POLICY "order_items_vendor_update" ON public.order_items
    FOR UPDATE
    USING (public.is_vendor())
    WITH CHECK (public.is_vendor());

DROP POLICY IF EXISTS "order_items_vendor_delete" ON public.order_items;
CREATE POLICY "order_items_vendor_delete" ON public.order_items
    FOR DELETE
    USING (public.is_vendor());


-- F. Table: payments (Vendor records; resident reads own)
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payments_select" ON public.payments;
CREATE POLICY "payments_select" ON public.payments
    FOR SELECT
    USING (
        public.is_vendor() OR
        customer_id IN (SELECT public.get_auth_customer_ids()) OR
        UPPER(flat_number) = UPPER(public.get_auth_flat()) OR
        EXISTS (
            SELECT 1 FROM public.orders 
            WHERE public.orders.id = public.payments.order_id
              AND (
                  public.orders.customer_id IN (SELECT public.get_auth_customer_ids()) OR
                  UPPER(public.orders.flat_number) = UPPER(public.get_auth_flat())
              )
        )
    );

DROP POLICY IF EXISTS "payments_vendor_insert" ON public.payments;
CREATE POLICY "payments_vendor_insert" ON public.payments
    FOR INSERT
    WITH CHECK (public.is_vendor());

DROP POLICY IF EXISTS "payments_vendor_update" ON public.payments;
CREATE POLICY "payments_vendor_update" ON public.payments
    FOR UPDATE
    USING (public.is_vendor())
    WITH CHECK (public.is_vendor());

DROP POLICY IF EXISTS "payments_vendor_delete" ON public.payments;
CREATE POLICY "payments_vendor_delete" ON public.payments
    FOR DELETE
    USING (public.is_vendor());


-- G. Table: login_attempts (Security audit & rate limiting)
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "login_attempts_insert" ON public.login_attempts;
CREATE POLICY "login_attempts_insert" ON public.login_attempts
    FOR INSERT
    WITH CHECK (true); -- Allow clients to record attempts

DROP POLICY IF EXISTS "login_attempts_vendor_select" ON public.login_attempts;
CREATE POLICY "login_attempts_vendor_select" ON public.login_attempts
    FOR SELECT
    USING (public.is_vendor());

-- ==============================================================================
-- Migration 002 Applied Successfully
-- ==============================================================================
