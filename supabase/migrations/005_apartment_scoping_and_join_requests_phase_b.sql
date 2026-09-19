-- ==============================================================================
-- PressWala - Phase B: Apartment Scoping & Resident Join Requests
-- Database Schema Migration: 005_apartment_scoping_and_join_requests_phase_b.sql
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Create Apartments Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.apartments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    address TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_apartments_name ON public.apartments(name);

-- ------------------------------------------------------------------------------
-- 2. Extend Users & Profiles with apartment_id and block
-- ------------------------------------------------------------------------------
ALTER TABLE public.users 
    ADD COLUMN IF NOT EXISTS apartment_id UUID REFERENCES public.apartments(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS block TEXT;

CREATE INDEX IF NOT EXISTS idx_users_apartment_id ON public.users(apartment_id);
CREATE INDEX IF NOT EXISTS idx_users_block ON public.users(block);

ALTER TABLE public.profiles 
    ADD COLUMN IF NOT EXISTS apartment_id UUID REFERENCES public.apartments(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS block TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_apartment_id ON public.profiles(apartment_id);
CREATE INDEX IF NOT EXISTS idx_profiles_block ON public.profiles(block);

-- ------------------------------------------------------------------------------
-- 3. Extend Orders & Payments with apartment_id and block
-- ------------------------------------------------------------------------------
ALTER TABLE public.orders 
    ADD COLUMN IF NOT EXISTS apartment_id UUID REFERENCES public.apartments(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS block TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_apartment_id ON public.orders(apartment_id);

ALTER TABLE public.payments 
    ADD COLUMN IF NOT EXISTS apartment_id UUID REFERENCES public.apartments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_payments_apartment_id ON public.payments(apartment_id);

-- ------------------------------------------------------------------------------
-- 4. Create Resident Join Requests Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.join_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    block TEXT NOT NULL,
    flat_number TEXT NOT NULL,
    apartment_id UUID NOT NULL REFERENCES public.apartments(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    password_hash TEXT,
    reviewed_by UUID REFERENCES public.users(id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_join_requests_apartment_id ON public.join_requests(apartment_id);
CREATE INDEX IF NOT EXISTS idx_join_requests_status ON public.join_requests(status);
CREATE INDEX IF NOT EXISTS idx_join_requests_phone ON public.join_requests(phone);

-- ------------------------------------------------------------------------------
-- 5. Seed Core Platform Apartments
-- ------------------------------------------------------------------------------
INSERT INTO public.apartments (id, name, address)
VALUES 
    ('c1111111-0000-0000-0000-000000000001', 'Palm Heights Apartments', 'Sarjapur Main Road, Bellandur, Bengaluru, Karnataka 560103'),
    ('c1111111-0000-0000-0000-000000000002', 'Royal Palms Residency', 'Hennur Bagalur Main Road, Bengaluru, Karnataka 560077'),
    ('c1111111-0000-0000-0000-000000000003', 'Green Glen Villas', 'Outer Ring Road, Green Glen Layout, Bengaluru, Karnataka 560103')
ON CONFLICT (name) DO UPDATE SET address = EXCLUDED.address;

-- Backfill existing Palm Heights records with apartment_id
UPDATE public.users 
SET apartment_id = 'c1111111-0000-0000-0000-000000000001'
WHERE apartment_name = 'Palm Heights Apartments' AND apartment_id IS NULL;

UPDATE public.profiles 
SET apartment_id = 'c1111111-0000-0000-0000-000000000001'
WHERE apartment_name = 'Palm Heights Apartments' AND apartment_id IS NULL;

UPDATE public.orders 
SET apartment_id = 'c1111111-0000-0000-0000-000000000001'
WHERE apartment_id IS NULL;

UPDATE public.payments 
SET apartment_id = 'c1111111-0000-0000-0000-000000000001'
WHERE apartment_id IS NULL;

-- ------------------------------------------------------------------------------
-- 6. Helper Functions: Scoped Auth Resolution
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_auth_apartment_id()
RETURNS UUID AS $$
DECLARE
    v_apt UUID;
BEGIN
    SELECT apartment_id INTO v_apt
    FROM public.profiles
    WHERE user_id = auth.uid() OR id = auth.uid()
    LIMIT 1;
    RETURN v_apt;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Redefine get_auth_flat() ensuring session profile resolution
CREATE OR REPLACE FUNCTION public.get_auth_flat()
RETURNS TEXT AS $$
DECLARE
    v_flat TEXT;
BEGIN
    SELECT flat_number INTO v_flat
    FROM public.profiles
    WHERE user_id = auth.uid() OR id = auth.uid()
    LIMIT 1;

    RETURN COALESCE(v_flat, '');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth;

-- Redefine get_auth_customer_ids() with strict apartment scoping
-- Eliminates cross-apartment ID leakage for apartments sharing identical flat numbers
CREATE OR REPLACE FUNCTION public.get_auth_customer_ids()
RETURNS SETOF UUID AS $$
DECLARE
    v_apt UUID;
BEGIN
    SELECT apartment_id INTO v_apt
    FROM public.profiles 
    WHERE user_id = auth.uid() OR id = auth.uid()
    LIMIT 1;

    RETURN QUERY
    SELECT user_id 
    FROM public.profiles 
    WHERE (id = auth.uid() OR user_id = auth.uid()) AND user_id IS NOT NULL
    UNION
    SELECT id 
    FROM public.users 
    WHERE UPPER(flat_number) = UPPER(public.get_auth_flat())
      AND (v_apt IS NULL OR apartment_id IS NOT DISTINCT FROM v_apt)
    UNION
    SELECT auth.uid();
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth;

-- ------------------------------------------------------------------------------
-- 7. Row Level Security Policies (Enforcing Strict Apartment-Scoping)
-- ------------------------------------------------------------------------------
ALTER TABLE public.apartments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- A. Apartments Table
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view apartments" ON public.apartments;
CREATE POLICY "Public can view apartments" ON public.apartments
    FOR SELECT TO public, anon, authenticated
    USING (true);

-- ------------------------------------------------------------------------------
-- B. Join Requests Table (Validation & Rate Limiting Guardrails)
-- ------------------------------------------------------------------------------

-- Helper function: Rate-limit join requests per phone number (max 3 pending/rejected within 24h)
CREATE OR REPLACE FUNCTION public.check_join_request_rate_limit(p_phone TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_recent_count INT;
BEGIN
    SELECT COUNT(*) INTO v_recent_count
    FROM public.join_requests
    WHERE phone = trim(p_phone)
      AND created_at > (NOW() - INTERVAL '24 hours')
      AND status IN ('pending', 'rejected');

    RETURN v_recent_count < 3;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Anonymous/Public join request insertion with sanity checks and rate limit
DROP POLICY IF EXISTS "Anyone can submit join request" ON public.join_requests;
CREATE POLICY "Anyone can submit join request" ON public.join_requests
    FOR INSERT TO anon, authenticated
    WITH CHECK (
        length(trim(name)) >= 2 AND length(name) <= 100 AND
        trim(phone) ~ '^[0-9]{10}$' AND
        length(trim(block)) >= 1 AND length(block) <= 50 AND
        length(trim(flat_number)) >= 2 AND length(flat_number) <= 20 AND
        apartment_id IS NOT NULL AND
        public.check_join_request_rate_limit(phone)
    );

-- BEFORE INSERT trigger on join_requests for clear descriptive feedback
CREATE OR REPLACE FUNCTION public.trg_enforce_join_request_guardrails()
RETURNS TRIGGER AS $$
DECLARE
    v_recent_count INT;
BEGIN
    IF length(trim(NEW.name)) < 2 OR length(NEW.name) > 100 THEN
        RAISE EXCEPTION 'Invalid name: Must be between 2 and 100 characters.';
    END IF;

    IF trim(NEW.phone) !~ '^[0-9]{10}$' THEN
        RAISE EXCEPTION 'Invalid phone number: Must be exactly 10 digits.';
    END IF;

    IF length(trim(NEW.block)) < 1 OR length(NEW.block) > 50 THEN
        RAISE EXCEPTION 'Invalid block: Must be between 1 and 50 characters.';
    END IF;

    IF length(trim(NEW.flat_number)) < 2 OR length(NEW.flat_number) > 20 THEN
        RAISE EXCEPTION 'Invalid flat number: Must be between 2 and 20 characters.';
    END IF;

    IF NEW.apartment_id IS NULL THEN
        RAISE EXCEPTION 'Apartment selection is required.';
    END IF;

    SELECT COUNT(*) INTO v_recent_count
    FROM public.join_requests
    WHERE phone = trim(NEW.phone)
      AND created_at > (NOW() - INTERVAL '24 hours')
      AND status IN ('pending', 'rejected');

    IF v_recent_count >= 3 THEN
        RAISE EXCEPTION 'Submission limit reached: Maximum 3 join requests allowed per phone number in 24 hours. Please try again later.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_join_requests_guardrails ON public.join_requests;
CREATE TRIGGER trg_join_requests_guardrails
    BEFORE INSERT ON public.join_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_enforce_join_request_guardrails();

-- Vendors see requests for their own apartment; Owners see all
DROP POLICY IF EXISTS "Vendors and owners can view join requests" ON public.join_requests;
CREATE POLICY "Vendors and owners can view join requests" ON public.join_requests
    FOR SELECT TO authenticated
    USING (
        public.is_owner() OR 
        (public.is_vendor() AND apartment_id = (SELECT apartment_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid()))
    );

-- Vendors can update requests for their own apartment; Owners can update all
DROP POLICY IF EXISTS "Vendors and owners can update join requests" ON public.join_requests;
CREATE POLICY "Vendors and owners can update join requests" ON public.join_requests
    FOR UPDATE TO authenticated
    USING (
        public.is_owner() OR 
        (public.is_vendor() AND apartment_id = (SELECT apartment_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid()))
    );

-- ------------------------------------------------------------------------------
-- C. Orders Table (Apartment-Aware Flat Number & Scoping Everywhere)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "orders_select" ON public.orders;
DROP POLICY IF EXISTS "Vendors can view apartment scoped orders" ON public.orders;
CREATE POLICY "orders_select" ON public.orders
    FOR SELECT TO authenticated
    USING (
        public.is_owner() OR
        (public.is_vendor() AND apartment_id = (SELECT apartment_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid())) OR
        (
            (customer_id IN (SELECT public.get_auth_customer_ids()) OR UPPER(flat_number) = UPPER(public.get_auth_flat()))
            AND (apartment_id IS NOT DISTINCT FROM (SELECT apartment_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid()))
        )
    );

DROP POLICY IF EXISTS "orders_insert" ON public.orders;
CREATE POLICY "orders_insert" ON public.orders
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_owner() OR
        (public.is_vendor() AND apartment_id = (SELECT apartment_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid())) OR
        (
            (customer_id IN (SELECT public.get_auth_customer_ids()) OR UPPER(flat_number) = UPPER(public.get_auth_flat()))
            AND (apartment_id IS NOT DISTINCT FROM (SELECT apartment_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid()))
        )
    );

DROP POLICY IF EXISTS "orders_vendor_update" ON public.orders;
CREATE POLICY "orders_vendor_update" ON public.orders
    FOR UPDATE TO authenticated
    USING (
        public.is_owner() OR
        (public.is_vendor() AND apartment_id = (SELECT apartment_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid()))
    )
    WITH CHECK (
        public.is_owner() OR
        (public.is_vendor() AND apartment_id = (SELECT apartment_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid()))
    );

DROP POLICY IF EXISTS "orders_vendor_delete" ON public.orders;
CREATE POLICY "orders_vendor_delete" ON public.orders
    FOR DELETE TO authenticated
    USING (
        public.is_owner() OR
        (public.is_vendor() AND apartment_id = (SELECT apartment_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid()))
    );

-- ------------------------------------------------------------------------------
-- D. Payments Table (Apartment-Aware Flat Number & Scoping Everywhere)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "payments_select" ON public.payments;
CREATE POLICY "payments_select" ON public.payments
    FOR SELECT TO authenticated
    USING (
        public.is_owner() OR
        (public.is_vendor() AND apartment_id = (SELECT apartment_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid())) OR
        (
            UPPER(flat_number) = UPPER(public.get_auth_flat())
            AND (apartment_id IS NOT DISTINCT FROM (SELECT apartment_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid()))
        )
    );

DROP POLICY IF EXISTS "payments_vendor_insert" ON public.payments;
CREATE POLICY "payments_vendor_insert" ON public.payments
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_owner() OR
        (public.is_vendor() AND apartment_id = (SELECT apartment_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid()))
    );

DROP POLICY IF EXISTS "payments_vendor_update" ON public.payments;
CREATE POLICY "payments_vendor_update" ON public.payments
    FOR UPDATE TO authenticated
    USING (
        public.is_owner() OR
        (public.is_vendor() AND apartment_id = (SELECT apartment_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid()))
    );

DROP POLICY IF EXISTS "payments_vendor_delete" ON public.payments;
CREATE POLICY "payments_vendor_delete" ON public.payments
    FOR DELETE TO authenticated
    USING (
        public.is_owner() OR
        (public.is_vendor() AND apartment_id = (SELECT apartment_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid()))
    );

-- ------------------------------------------------------------------------------
-- E. Users Table (Apartment-Aware Flat Number, Protected Fields Trigger)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "users_select" ON public.users;
CREATE POLICY "users_select" ON public.users
    FOR SELECT TO authenticated
    USING (
        public.is_owner() OR
        (public.is_vendor() AND role = 'customer' AND apartment_id = (SELECT apartment_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid())) OR
        id IN (SELECT public.get_auth_customer_ids()) OR
        (
            UPPER(flat_number) = UPPER(public.get_auth_flat())
            AND (apartment_id IS NOT DISTINCT FROM (SELECT apartment_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid()))
        )
    );

DROP POLICY IF EXISTS "users_update" ON public.users;
CREATE POLICY "users_update" ON public.users
    FOR UPDATE TO authenticated
    USING (
        public.is_owner() OR
        (public.is_vendor() AND role = 'customer' AND apartment_id = (SELECT apartment_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid())) OR
        id IN (SELECT public.get_auth_customer_ids())
    )
    WITH CHECK (
        public.is_owner() OR
        (public.is_vendor() AND role = 'customer' AND apartment_id = (SELECT apartment_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid())) OR
        id IN (SELECT public.get_auth_customer_ids())
    );

-- Trigger to prevent unauthorized modification of protected fields:
-- Permissions are split by field rather than granted as a block:
-- 1. Owner can change role, status, apartment_id, approved_at freely.
-- 2. role: can ONLY be changed by is_owner(). Vendor or customer cannot change role.
-- 3. apartment_id: can ONLY be changed by is_owner(). Vendor or customer cannot move residents between apartments.
-- 4. status and approved_at: vendor may change only when resident's OLD.apartment_id matches vendor's own apartment
--    AND the update does not also change apartment_id in the same statement (NEW.apartment_id IS NOT DISTINCT FROM OLD.apartment_id).
CREATE OR REPLACE FUNCTION public.check_users_immutable_fields()
RETURNS TRIGGER AS $$
DECLARE
    v_caller_role TEXT;
    v_caller_apt UUID;
    v_is_owner BOOLEAN := FALSE;
BEGIN
    -- If role, status, apartment_id, and approved_at are untouched, permit update
    IF (NEW.role IS NOT DISTINCT FROM OLD.role) AND
       (NEW.status IS NOT DISTINCT FROM OLD.status) AND
       (NEW.apartment_id IS NOT DISTINCT FROM OLD.apartment_id) AND
       (NEW.approved_at IS NOT DISTINCT FROM OLD.approved_at) THEN
        RETURN NEW;
    END IF;

    -- When auth.uid() is present (authenticated API / client call)
    IF auth.uid() IS NOT NULL THEN
        -- Check if caller is platform owner via is_owner() or profiles
        IF public.is_owner() THEN
            v_is_owner := TRUE;
        ELSE
            SELECT role, apartment_id INTO v_caller_role, v_caller_apt
            FROM public.profiles
            WHERE id = auth.uid() OR user_id = auth.uid()
            LIMIT 1;

            IF v_caller_role = 'owner' THEN
                v_is_owner := TRUE;
            END IF;
        END IF;

        -- 1. Owner can change any of these four fields freely
        IF v_is_owner THEN
            RETURN NEW;
        END IF;

        -- 2. role: can ONLY be changed by is_owner().
        -- Reject vendor or resident attempts to modify role.
        IF NEW.role IS DISTINCT FROM OLD.role THEN
            RAISE EXCEPTION 'Access Denied: Only platform owner can modify user roles.';
        END IF;

        -- 3. apartment_id: can ONLY be changed by is_owner().
        -- Reject vendor or resident attempts to modify apartment_id.
        IF NEW.apartment_id IS DISTINCT FROM OLD.apartment_id THEN
            RAISE EXCEPTION 'Access Denied: Only platform owner can modify apartment assignments.';
        END IF;

        -- 4. status and approved_at: vendor may change these ONLY when:
        --    - resident's OLD.apartment_id matches the vendor's own apartment
        --    - AND the update does not also change apartment_id (NEW.apartment_id IS NOT DISTINCT FROM OLD.apartment_id)
        IF (NEW.status IS DISTINCT FROM OLD.status) OR (NEW.approved_at IS DISTINCT FROM OLD.approved_at) THEN
            IF v_caller_role = 'vendor' AND
               (v_caller_apt IS NOT NULL AND v_caller_apt = OLD.apartment_id) AND
               (NEW.apartment_id IS NOT DISTINCT FROM OLD.apartment_id) THEN
                RETURN NEW;
            ELSE
                RAISE EXCEPTION 'Access Denied: You do not have permission to modify status or approval timestamp.';
            END IF;
        END IF;

        -- Any other unauthorized mutation
        RAISE EXCEPTION 'Access Denied: Unauthorized modification of protected fields.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

DROP TRIGGER IF EXISTS trg_protect_users_immutable_fields ON public.users;
CREATE TRIGGER trg_protect_users_immutable_fields
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.check_users_immutable_fields();

-- ------------------------------------------------------------------------------
-- 8. Stored Procedures: Vendor Join Request Approval / Rejection / Revocation
-- ------------------------------------------------------------------------------

-- Approve a resident join request
CREATE OR REPLACE FUNCTION public.vendor_approve_join_request(p_request_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_req RECORD;
    v_caller_role TEXT;
    v_caller_apt UUID;
BEGIN
    SELECT role, apartment_id INTO v_caller_role, v_caller_apt
    FROM public.profiles
    WHERE user_id = auth.uid() OR id = auth.uid()
    LIMIT 1;

    IF v_caller_role IS DISTINCT FROM 'vendor' AND v_caller_role IS DISTINCT FROM 'owner' THEN
        RAISE EXCEPTION 'Access Denied: Only assigned vendor or platform owner can approve join requests.';
    END IF;

    SELECT * INTO v_req FROM public.join_requests WHERE id = p_request_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Join request not found.';
    END IF;

    IF v_caller_role = 'vendor' AND v_caller_apt IS DISTINCT FROM v_req.apartment_id THEN
        RAISE EXCEPTION 'Access Denied: You cannot approve requests for other apartments.';
    END IF;

    -- Update request status
    UPDATE public.join_requests
    SET status = 'approved',
        reviewed_by = auth.uid(),
        reviewed_at = NOW()
    WHERE id = p_request_id;

    -- Upsert resident user profile
    INSERT INTO public.users (
        name, flat_number, phone, role, status, apartment_id, block, approved_at
    ) VALUES (
        v_req.name,
        UPPER(v_req.flat_number),
        v_req.phone,
        'customer',
        'active',
        v_req.apartment_id,
        v_req.block,
        NOW()
    )
    ON CONFLICT (flat_number) DO UPDATE SET
        name = EXCLUDED.name,
        phone = EXCLUDED.phone,
        status = 'active',
        apartment_id = EXCLUDED.apartment_id,
        block = EXCLUDED.block,
        approved_at = NOW();

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

GRANT EXECUTE ON FUNCTION public.vendor_approve_join_request(UUID) TO authenticated;

-- Reject a resident join request
CREATE OR REPLACE FUNCTION public.vendor_reject_join_request(p_request_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_req RECORD;
    v_caller_role TEXT;
    v_caller_apt UUID;
BEGIN
    SELECT role, apartment_id INTO v_caller_role, v_caller_apt
    FROM public.profiles
    WHERE user_id = auth.uid() OR id = auth.uid()
    LIMIT 1;

    IF v_caller_role IS DISTINCT FROM 'vendor' AND v_caller_role IS DISTINCT FROM 'owner' THEN
        RAISE EXCEPTION 'Access Denied: Only assigned vendor or platform owner can reject join requests.';
    END IF;

    SELECT * INTO v_req FROM public.join_requests WHERE id = p_request_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Join request not found.';
    END IF;

    IF v_caller_role = 'vendor' AND v_caller_apt IS DISTINCT FROM v_req.apartment_id THEN
        RAISE EXCEPTION 'Access Denied: You cannot reject requests for other apartments.';
    END IF;

    UPDATE public.join_requests
    SET status = 'rejected',
        reviewed_by = auth.uid(),
        reviewed_at = NOW()
    WHERE id = p_request_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

GRANT EXECUTE ON FUNCTION public.vendor_reject_join_request(UUID) TO authenticated;

-- Revoke resident access
CREATE OR REPLACE FUNCTION public.vendor_revoke_resident(p_customer_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_caller_role TEXT;
    v_caller_apt UUID;
    v_resident RECORD;
    v_auth_id UUID;
BEGIN
    SELECT role, apartment_id INTO v_caller_role, v_caller_apt
    FROM public.profiles
    WHERE user_id = auth.uid() OR id = auth.uid()
    LIMIT 1;

    IF v_caller_role IS DISTINCT FROM 'vendor' AND v_caller_role IS DISTINCT FROM 'owner' THEN
        RAISE EXCEPTION 'Access Denied: Only vendor or owner can revoke resident access.';
    END IF;

    SELECT * INTO v_resident FROM public.users WHERE id = p_customer_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Resident user not found.';
    END IF;

    IF v_caller_role = 'vendor' AND v_caller_apt IS DISTINCT FROM v_resident.apartment_id THEN
        RAISE EXCEPTION 'Access Denied: You cannot revoke residents from other apartments.';
    END IF;

    -- Update database status
    UPDATE public.users SET status = 'revoked' WHERE id = p_customer_id;
    UPDATE public.profiles SET status = 'revoked' WHERE id = p_customer_id OR user_id = p_customer_id;

    -- Immediately invalidate active sessions and refresh tokens for the revoked resident
    SELECT id INTO v_auth_id 
    FROM public.profiles 
    WHERE user_id = p_customer_id OR id = p_customer_id 
    LIMIT 1;

    IF v_auth_id IS NOT NULL THEN
        DELETE FROM auth.refresh_tokens 
        WHERE session_id IN (SELECT id FROM auth.sessions WHERE user_id = v_auth_id)
           OR user_id::text = v_auth_id::text;

        DELETE FROM auth.sessions 
        WHERE user_id = v_auth_id;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

GRANT EXECUTE ON FUNCTION public.vendor_revoke_resident(UUID) TO authenticated;
