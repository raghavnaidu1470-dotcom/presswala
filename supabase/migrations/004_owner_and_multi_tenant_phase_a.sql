-- ==============================================================================
-- PressWala - Multi-Tenant Expansion
-- Database Schema Migration: 004_owner_and_multi_tenant_phase_a.sql
-- Description: Adds 'owner' role, vendor onboarding status lifecycle,
--              cross-apartment owner access policies, and vendor status RPC.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Extend Users Table with 'owner' Role, Status, and Apartment
-- ------------------------------------------------------------------------------
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check 
    CHECK (role IN ('customer', 'vendor', 'owner'));

ALTER TABLE public.users 
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' 
    CHECK (status IN ('pending', 'active', 'revoked'));

ALTER TABLE public.users 
    ADD COLUMN IF NOT EXISTS apartment_name TEXT;

ALTER TABLE public.users 
    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- ------------------------------------------------------------------------------
-- 2. Extend Profiles Table with 'owner' Role, Status, and Apartment
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
    CHECK (role IN ('customer', 'vendor', 'owner'));

ALTER TABLE public.profiles 
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' 
    CHECK (status IN ('pending', 'active', 'revoked'));

ALTER TABLE public.profiles 
    ADD COLUMN IF NOT EXISTS apartment_name TEXT;

ALTER TABLE public.profiles 
    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);

-- ------------------------------------------------------------------------------
-- 3. Security Helper Functions
-- ------------------------------------------------------------------------------

-- Check if current authenticated session belongs to the platform owner
CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.profiles 
        WHERE id = auth.uid() AND role = 'owner'
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth;

-- Check if current authenticated session belongs to an ACTIVE vendor
-- Pending or revoked vendors cannot access vendor operations
CREATE OR REPLACE FUNCTION public.is_vendor()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.profiles 
        WHERE id = auth.uid() AND role = 'vendor' AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth;

-- ------------------------------------------------------------------------------
-- 4. Automatic Profile Provisioning Trigger Update
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
    detected_flat TEXT;
    detected_role TEXT;
    detected_status TEXT;
    detected_apt TEXT;
    matched_user_id UUID;
BEGIN
    detected_role := COALESCE(
        NEW.raw_user_meta_data->>'role',
        CASE 
            WHEN NEW.email LIKE 'owner%' THEN 'owner'
            WHEN NEW.email LIKE 'vendor%' THEN 'vendor'
            ELSE 'customer'
        END
    );

    detected_flat := COALESCE(
        NEW.raw_user_meta_data->>'flat_number',
        CASE 
            WHEN detected_role = 'owner' THEN 'OWNER'
            WHEN detected_role = 'vendor' THEN 'VENDOR'
            WHEN NEW.email LIKE 'flat-%@presswala.internal' THEN 
                UPPER(REPLACE(REPLACE(NEW.email, 'flat-', ''), '@presswala.internal', ''))
            ELSE 'UNKNOWN'
        END
    );

    detected_status := COALESCE(
        NEW.raw_user_meta_data->>'status',
        CASE 
            WHEN detected_role = 'vendor' AND NEW.email NOT LIKE 'vendor@presswala.internal' THEN 'pending'
            ELSE 'active'
        END
    );

    detected_apt := NEW.raw_user_meta_data->>'apartment_name';

    -- Find matching user record if exists
    SELECT id INTO matched_user_id 
    FROM public.users 
    WHERE UPPER(flat_number) = UPPER(detected_flat) 
    LIMIT 1;

    INSERT INTO public.profiles (id, flat_number, role, user_id, status, apartment_name, approved_at)
    VALUES (
        NEW.id, 
        detected_flat, 
        detected_role, 
        matched_user_id, 
        detected_status, 
        detected_apt, 
        CASE WHEN detected_status = 'active' THEN NOW() ELSE NULL END
    )
    ON CONFLICT (id) DO UPDATE 
    SET 
        flat_number = EXCLUDED.flat_number,
        role = EXCLUDED.role,
        user_id = COALESCE(public.profiles.user_id, EXCLUDED.user_id),
        status = EXCLUDED.status,
        apartment_name = COALESCE(public.profiles.apartment_name, EXCLUDED.apartment_name),
        approved_at = COALESCE(public.profiles.approved_at, EXCLUDED.approved_at);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- ------------------------------------------------------------------------------
-- 5. Owner Cross-Apartment Row Level Security Policies
-- ------------------------------------------------------------------------------

-- Owner can read and update all profiles
DROP POLICY IF EXISTS "profiles_owner_select" ON public.profiles;
CREATE POLICY "profiles_owner_select" ON public.profiles
    FOR SELECT
    USING (public.is_owner());

DROP POLICY IF EXISTS "profiles_owner_update" ON public.profiles;
CREATE POLICY "profiles_owner_update" ON public.profiles
    FOR UPDATE
    USING (public.is_owner())
    WITH CHECK (public.is_owner());

-- Owner can read and update all users
DROP POLICY IF EXISTS "users_owner_select" ON public.users;
CREATE POLICY "users_owner_select" ON public.users
    FOR SELECT
    USING (public.is_owner());

DROP POLICY IF EXISTS "users_owner_update" ON public.users;
CREATE POLICY "users_owner_update" ON public.users
    FOR UPDATE
    USING (public.is_owner())
    WITH CHECK (public.is_owner());

-- Owner can read all orders, order_items, and payments platform-wide
DROP POLICY IF EXISTS "orders_owner_select" ON public.orders;
CREATE POLICY "orders_owner_select" ON public.orders
    FOR SELECT
    USING (public.is_owner());

DROP POLICY IF EXISTS "order_items_owner_select" ON public.order_items;
CREATE POLICY "order_items_owner_select" ON public.order_items
    FOR SELECT
    USING (public.is_owner());

DROP POLICY IF EXISTS "payments_owner_select" ON public.payments;
CREATE POLICY "payments_owner_select" ON public.payments
    FOR SELECT
    USING (public.is_owner());

-- ------------------------------------------------------------------------------
-- 6. Vendor Approval / Rejection / Revocation RPC
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.owner_update_vendor_status(
    p_vendor_id UUID,
    p_status TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_auth_id UUID;
BEGIN
    -- Security verification: Only platform owner can manage vendors
    IF NOT public.is_owner() THEN
        RAISE EXCEPTION 'Unauthorized: Only the platform owner can update vendor status';
    END IF;

    IF p_status NOT IN ('active', 'revoked', 'pending') THEN
        RAISE EXCEPTION 'Invalid status: must be active, revoked, or pending';
    END IF;

    -- Update users table record
    UPDATE public.users
    SET 
        status = p_status,
        approved_at = CASE WHEN p_status = 'active' THEN NOW() ELSE approved_at END
    WHERE id = p_vendor_id;

    -- Update profiles table record
    UPDATE public.profiles
    SET 
        status = p_status,
        approved_at = CASE WHEN p_status = 'active' THEN NOW() ELSE approved_at END
    WHERE user_id = p_vendor_id OR id = p_vendor_id;

    -- If revoking vendor access, immediately kill their active sessions and tokens
    IF p_status = 'revoked' THEN
        SELECT id INTO v_auth_id 
        FROM public.profiles 
        WHERE user_id = p_vendor_id OR id = p_vendor_id 
        LIMIT 1;

        IF v_auth_id IS NOT NULL THEN
            DELETE FROM auth.refresh_tokens 
            WHERE session_id IN (SELECT id FROM auth.sessions WHERE user_id = v_auth_id)
               OR user_id::text = v_auth_id::text;

            DELETE FROM auth.sessions 
            WHERE user_id = v_auth_id;
        END IF;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

GRANT EXECUTE ON FUNCTION public.owner_update_vendor_status(UUID, TEXT) TO authenticated;

-- ------------------------------------------------------------------------------
-- 7. Seed Initial Platform Owner & Update Seed Vendor
-- ------------------------------------------------------------------------------
INSERT INTO public.users (id, name, flat_number, phone, role, status, apartment_name, approved_at)
VALUES 
    ('b1111111-0000-0000-0000-000000000000', 'Platform Operations Controller', 'SUPER_OWNER_KEY', '9800000001', 'owner', 'active', 'Platform Operations', NOW())
ON CONFLICT (flat_number) DO NOTHING;

UPDATE public.users 
SET 
    apartment_name = COALESCE(apartment_name, 'Palm Heights Apartments'),
    status = 'active',
    approved_at = COALESCE(approved_at, NOW())
WHERE flat_number = 'VENDOR';

-- ------------------------------------------------------------------------------
-- 8. Vendor Invites Table & Policies (Single-Use, Expirable)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vendor_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token TEXT NOT NULL UNIQUE,
    vendor_name TEXT NOT NULL,
    vendor_phone TEXT NOT NULL,
    apartment_name TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.vendor_invites ENABLE ROW LEVEL SECURITY;

-- Owner can manage all vendor invites
DROP POLICY IF EXISTS "vendor_invites_owner_all" ON public.vendor_invites;
CREATE POLICY "vendor_invites_owner_all" ON public.vendor_invites
    FOR ALL
    USING (public.is_owner())
    WITH CHECK (public.is_owner());

-- Prospective vendors can read invite details by token during onboarding
DROP POLICY IF EXISTS "vendor_invites_public_select" ON public.vendor_invites;
CREATE POLICY "vendor_invites_public_select" ON public.vendor_invites
    FOR SELECT
    USING (TRUE);

