-- ==============================================================================
-- PressWala - Phase C: Block Dashboard & Multi-Contact Numbers
-- Database Schema Migration: 006_block_dashboard_and_contacts_phase_c.sql
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Create Customer Contacts Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customer_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    apartment_id UUID REFERENCES public.apartments(id) ON DELETE CASCADE,
    phone TEXT NOT NULL,
    label TEXT NOT NULL DEFAULT 'Primary',
    is_primary BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_contacts_customer_id ON public.customer_contacts(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_contacts_apartment_id ON public.customer_contacts(apartment_id);
CREATE INDEX IF NOT EXISTS idx_customer_contacts_phone ON public.customer_contacts(phone);

-- Enforce that at most ONE contact per resident can be primary at any time
CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_contacts_one_primary 
ON public.customer_contacts(customer_id) 
WHERE is_primary = true;

-- ------------------------------------------------------------------------------
-- 2. Trigger: Enforce Maximum 5 Contacts per Resident & Field Validations
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_customer_contacts_limit()
RETURNS TRIGGER AS $$
DECLARE
    v_count INT;
BEGIN
    -- Only check on INSERT or when customer_id changes
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.customer_id IS DISTINCT FROM OLD.customer_id) THEN
        SELECT COUNT(*) INTO v_count
        FROM public.customer_contacts
        WHERE customer_id = NEW.customer_id;

        IF v_count >= 5 THEN
            RAISE EXCEPTION 'Maximum limit reached: A resident profile cannot have more than 5 contact numbers.';
        END IF;
    END IF;

    -- Validate phone number format (10 digits)
    IF trim(NEW.phone) !~ '^[0-9]{10}$' THEN
        RAISE EXCEPTION 'Invalid contact phone number: Must be exactly 10 digits.';
    END IF;

    -- Sane label length validation
    IF length(trim(NEW.label)) < 1 OR length(NEW.label) > 30 THEN
        RAISE EXCEPTION 'Contact label must be between 1 and 30 characters (e.g. Primary, Alternate, Spouse).';
    END IF;

    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_enforce_customer_contacts_limit ON public.customer_contacts;
CREATE TRIGGER trg_enforce_customer_contacts_limit
    BEFORE INSERT OR UPDATE ON public.customer_contacts
    FOR EACH ROW
    EXECUTE FUNCTION public.check_customer_contacts_limit();

-- ------------------------------------------------------------------------------
-- 3. Triggers: Enforce Exactly One Primary Contact & Hard Floor on Delete
-- ------------------------------------------------------------------------------

-- (a) Hard floor on delete: Resident must keep at least 1 contact
CREATE OR REPLACE FUNCTION public.check_customer_contacts_delete_floor()
RETURNS TRIGGER AS $$
DECLARE
    v_remaining INT;
BEGIN
    SELECT COUNT(*) INTO v_remaining
    FROM public.customer_contacts
    WHERE customer_id = OLD.customer_id;

    IF v_remaining <= 1 THEN
        RAISE EXCEPTION 'Cannot delete contact: A resident must have at least 1 contact number on file.';
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_customer_contacts_delete_floor ON public.customer_contacts;
CREATE TRIGGER trg_customer_contacts_delete_floor
    BEFORE DELETE ON public.customer_contacts
    FOR EACH ROW
    EXECUTE FUNCTION public.check_customer_contacts_delete_floor();

-- (b) Auto-promote oldest remaining contact if primary is deleted
CREATE OR REPLACE FUNCTION public.auto_promote_primary_on_delete()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_primary THEN
        UPDATE public.customer_contacts
        SET is_primary = true, updated_at = NOW()
        WHERE id = (
            SELECT id FROM public.customer_contacts
            WHERE customer_id = OLD.customer_id
            ORDER BY created_at ASC
            LIMIT 1
        );
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_customer_contacts_promote_primary ON public.customer_contacts;
CREATE TRIGGER trg_customer_contacts_promote_primary
    AFTER DELETE ON public.customer_contacts
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_promote_primary_on_delete();

-- (c) Maintain exactly one primary on INSERT and UPDATE
CREATE OR REPLACE FUNCTION public.maintain_customer_contacts_primary()
RETURNS TRIGGER AS $$
DECLARE
    v_has_other_primary BOOLEAN;
    v_contact_count INT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        SELECT COUNT(*) INTO v_contact_count
        FROM public.customer_contacts
        WHERE customer_id = NEW.customer_id;

        -- If first contact, force is_primary to true
        IF v_contact_count = 0 THEN
            NEW.is_primary := true;
        ELSIF NEW.is_primary THEN
            -- Unset any existing primary for this customer
            UPDATE public.customer_contacts
            SET is_primary = false, updated_at = NOW()
            WHERE customer_id = NEW.customer_id AND is_primary = true;
        END IF;

        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- If setting to primary, unset all other primaries for this customer
        IF NEW.is_primary AND NOT OLD.is_primary THEN
            UPDATE public.customer_contacts
            SET is_primary = false, updated_at = NOW()
            WHERE customer_id = NEW.customer_id AND id <> NEW.id AND is_primary = true;
        -- If attempting to unset primary, ensure another primary already exists
        ELSIF OLD.is_primary AND NOT NEW.is_primary THEN
            SELECT EXISTS (
                SELECT 1 FROM public.customer_contacts
                WHERE customer_id = NEW.customer_id AND id <> NEW.id AND is_primary = true
            ) INTO v_has_other_primary;

            IF NOT v_has_other_primary THEN
                RAISE EXCEPTION 'A resident must always have exactly one primary contact number. Set another number as primary instead.';
            END IF;
        END IF;

        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_customer_contacts_maintain_primary ON public.customer_contacts;
CREATE TRIGGER trg_customer_contacts_maintain_primary
    BEFORE INSERT OR UPDATE ON public.customer_contacts
    FOR EACH ROW
    EXECUTE FUNCTION public.maintain_customer_contacts_primary();

-- ------------------------------------------------------------------------------
-- 4. Row Level Security Policies
-- ------------------------------------------------------------------------------
ALTER TABLE public.customer_contacts ENABLE ROW LEVEL SECURITY;

-- SELECT:
-- 1. Owner: unrestricted across all apartments
-- 2. Vendor: contacts of residents in the vendor's assigned apartment
-- 3. Resident: ONLY contacts where customer_id matches their own profile (not any resident in their apartment)
DROP POLICY IF EXISTS "customer_contacts_select" ON public.customer_contacts;
CREATE POLICY "customer_contacts_select" ON public.customer_contacts
    FOR SELECT TO authenticated
    USING (
        public.is_owner() OR
        (
            public.is_vendor() AND 
            apartment_id = (SELECT apartment_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid())
        ) OR
        customer_id IN (SELECT public.get_auth_customer_ids())
    );

-- INSERT:
-- 1. Owner: unrestricted across all apartments
-- 2. Vendor: can ONLY insert contacts for residents belonging to the vendor's own assigned apartment
-- 3. Resident: can ONLY insert contacts for their OWN profile (customer_id matches own account)
DROP POLICY IF EXISTS "customer_contacts_insert" ON public.customer_contacts;
CREATE POLICY "customer_contacts_insert" ON public.customer_contacts
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_owner() OR
        (
            public.is_vendor() AND 
            apartment_id = (SELECT apartment_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid()) AND
            customer_id IN (SELECT id FROM public.users WHERE apartment_id = (SELECT apartment_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid()))
        ) OR
        (
            customer_id IN (SELECT public.get_auth_customer_ids()) AND
            (apartment_id IS NULL OR apartment_id = (SELECT apartment_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid()))
        )
    );

-- UPDATE:
-- 1. Owner: unrestricted
-- 2. Vendor: can ONLY update contacts for residents belonging to the vendor's own assigned apartment
-- 3. Resident: can ONLY update contacts for their OWN profile
DROP POLICY IF EXISTS "customer_contacts_update" ON public.customer_contacts;
CREATE POLICY "customer_contacts_update" ON public.customer_contacts
    FOR UPDATE TO authenticated
    USING (
        public.is_owner() OR
        (
            public.is_vendor() AND 
            apartment_id = (SELECT apartment_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid()) AND
            customer_id IN (SELECT id FROM public.users WHERE apartment_id = (SELECT apartment_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid()))
        ) OR
        customer_id IN (SELECT public.get_auth_customer_ids())
    )
    WITH CHECK (
        public.is_owner() OR
        (
            public.is_vendor() AND 
            apartment_id = (SELECT apartment_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid()) AND
            customer_id IN (SELECT id FROM public.users WHERE apartment_id = (SELECT apartment_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid()))
        ) OR
        (
            customer_id IN (SELECT public.get_auth_customer_ids()) AND
            (apartment_id IS NULL OR apartment_id = (SELECT apartment_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid()))
        )
    );

-- DELETE:
-- 1. Owner: unrestricted
-- 2. Vendor: can ONLY delete contacts for residents belonging to the vendor's own assigned apartment
-- 3. Resident: can ONLY delete contacts for their OWN profile
DROP POLICY IF EXISTS "customer_contacts_delete" ON public.customer_contacts;
CREATE POLICY "customer_contacts_delete" ON public.customer_contacts
    FOR DELETE TO authenticated
    USING (
        public.is_owner() OR
        (
            public.is_vendor() AND 
            apartment_id = (SELECT apartment_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid()) AND
            customer_id IN (SELECT id FROM public.users WHERE apartment_id = (SELECT apartment_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid()))
        ) OR
        customer_id IN (SELECT public.get_auth_customer_ids())
    );

-- ------------------------------------------------------------------------------
-- 5. Backfill Initial Primary Contacts from Existing Users
-- ------------------------------------------------------------------------------
INSERT INTO public.customer_contacts (customer_id, apartment_id, phone, label, is_primary)
SELECT id, apartment_id, phone, 'Primary', true
FROM public.users
WHERE role = 'customer' AND phone IS NOT NULL AND trim(phone) ~ '^[0-9]{10}$'
ON CONFLICT (customer_id) WHERE is_primary = true DO NOTHING;
