-- ==============================================================================
-- PressWala - Phase D: Order Workflows, Delivery Slots & Payment Timing
-- Database Schema Migration: 007_phase_d_order_workflow.sql
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Add Delivery Slot Columns to Orders
-- ------------------------------------------------------------------------------
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS delivery_slot_date DATE,
ADD COLUMN IF NOT EXISTS delivery_slot_window TEXT,
ADD COLUMN IF NOT EXISTS delivery_slot_booked_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_orders_delivery_slot 
ON public.orders(apartment_id, delivery_slot_date, delivery_slot_window);

-- ------------------------------------------------------------------------------
-- 2. Create Order Change Proposals Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_change_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    apartment_id UUID REFERENCES public.apartments(id) ON DELETE CASCADE,
    proposed_by TEXT NOT NULL CHECK (proposed_by IN ('customer', 'vendor')),
    proposer_user_id UUID REFERENCES public.users(id),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
    original_items JSONB NOT NULL,
    proposed_items JSONB NOT NULL,
    original_total_amount NUMERIC(10, 2) NOT NULL,
    proposed_total_amount NUMERIC(10, 2) NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_order_change_proposals_order_id ON public.order_change_proposals(order_id);
CREATE INDEX IF NOT EXISTS idx_order_change_proposals_apartment_id ON public.order_change_proposals(apartment_id);

-- Enforce at most ONE pending proposal per order at any given time
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_pending_proposal_per_order 
ON public.order_change_proposals(order_id) 
WHERE status = 'pending';

-- ------------------------------------------------------------------------------
-- 3. Row Level Security for Order Change Proposals
-- ------------------------------------------------------------------------------
ALTER TABLE public.order_change_proposals ENABLE ROW LEVEL SECURITY;

-- SELECT: Owner, Vendor of that apartment, or Customer who owns the order
DROP POLICY IF EXISTS "order_proposals_select" ON public.order_change_proposals;
CREATE POLICY "order_proposals_select" ON public.order_change_proposals
    FOR SELECT TO authenticated
    USING (
        public.is_owner() OR
        (
            public.is_vendor() AND 
            apartment_id = (SELECT apartment_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid())
        ) OR
        order_id IN (
            SELECT id FROM public.orders 
            WHERE customer_id IN (SELECT public.get_auth_customer_ids())
        )
    );

-- INSERT: Proposer must be authorized for this order and correctly tag proposed_by
DROP POLICY IF EXISTS "order_proposals_insert" ON public.order_change_proposals;
CREATE POLICY "order_proposals_insert" ON public.order_change_proposals
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_owner() OR
        (
            public.is_vendor() AND 
            apartment_id = (SELECT apartment_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid()) AND
            proposed_by = 'vendor' AND
            proposer_user_id = auth.uid()
        ) OR
        (
            order_id IN (
                SELECT id FROM public.orders 
                WHERE customer_id IN (SELECT public.get_auth_customer_ids())
            ) AND
            proposed_by = 'customer' AND
            proposer_user_id = auth.uid()
        )
    );

-- UPDATE: Counterparty can accept/decline; Proposer can only cancel their own proposal
-- Disallows self-approval at RLS level
DROP POLICY IF EXISTS "order_proposals_update" ON public.order_change_proposals;
CREATE POLICY "order_proposals_update" ON public.order_change_proposals
    FOR UPDATE TO authenticated
    USING (
        public.is_owner() OR
        -- Assigned vendor can update if proposed_by is customer (review/decision), or cancel own vendor proposal
        (
            public.is_vendor() AND 
            apartment_id = (SELECT apartment_id FROM public.profiles WHERE id = auth.uid() OR user_id = auth.uid()) AND
            (proposed_by = 'customer' OR (proposed_by = 'vendor' AND status = 'pending'))
        ) OR
        -- Customer can update if proposed_by is vendor (review/decision), or cancel own customer proposal
        (
            order_id IN (
                SELECT id FROM public.orders 
                WHERE customer_id IN (SELECT public.get_auth_customer_ids())
            ) AND
            (proposed_by = 'vendor' OR (proposed_by = 'customer' AND status = 'pending'))
        )
    );

-- ------------------------------------------------------------------------------
-- 4. Trigger: Prevent Self-Approval on Order Change Proposals
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_proposal_self_approval()
RETURNS TRIGGER AS $$
BEGIN
    -- Only evaluate when a proposal is being decided (accepted or declined)
    IF NEW.status IN ('accepted', 'declined') AND OLD.status = 'pending' THEN
        -- 1. Proposer user ID cannot decide their own proposal
        IF auth.uid() IS NOT NULL AND auth.uid() = OLD.proposer_user_id THEN
            RAISE EXCEPTION 'Self-approval forbidden: A change proposal cannot be accepted or declined by the party who created it.';
        END IF;

        -- 2. Vendor cannot approve or decline a vendor-initiated proposal
        IF OLD.proposed_by = 'vendor' AND public.is_vendor() AND NOT public.is_owner() THEN
            RAISE EXCEPTION 'Self-approval forbidden: Vendor cannot accept or decline their own change proposal.';
        END IF;

        -- 3. Customer cannot approve or decline a customer-initiated proposal
        IF OLD.proposed_by = 'customer' AND NOT public.is_vendor() AND NOT public.is_owner() THEN
            RAISE EXCEPTION 'Self-approval forbidden: Resident cannot accept or decline their own change proposal.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_prevent_proposal_self_approval ON public.order_change_proposals;
CREATE TRIGGER trg_prevent_proposal_self_approval
    BEFORE UPDATE ON public.order_change_proposals
    FOR EACH ROW
    EXECUTE FUNCTION public.check_proposal_self_approval();

-- ------------------------------------------------------------------------------
-- 5. Trigger: Due-Based Order Blocking (Cannot create order with outstanding dues)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_due_based_order_block()
RETURNS TRIGGER AS $$
DECLARE
    v_total_outstanding NUMERIC(10, 2) := 0;
BEGIN
    -- Calculate outstanding balance for this flat/customer in this apartment
    SELECT COALESCE(SUM(total_amount - COALESCE(paid_amount, 0)), 0)
    INTO v_total_outstanding
    FROM public.orders
    WHERE customer_id = NEW.customer_id
      AND apartment_id = NEW.apartment_id
      AND payment_status IN ('unpaid', 'partial');

    IF v_total_outstanding > 0 THEN
        RAISE EXCEPTION 'Order creation blocked: Resident has an outstanding balance of ₹%. Settle existing dues before creating a new order.', v_total_outstanding;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_due_based_order_block ON public.orders;
CREATE TRIGGER trg_due_based_order_block
    BEFORE INSERT ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.check_due_based_order_block();

-- ------------------------------------------------------------------------------
-- 6. Trigger / Function: Race-Safe Delivery Slot Double-Booking Prevention (Max 3 per window)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_delivery_slot_capacity()
RETURNS TRIGGER AS $$
DECLARE
    v_slot_count INT := 0;
    c_max_capacity CONSTANT INT := 3;
    v_lock_key BIGINT;
BEGIN
    IF NEW.delivery_slot_date IS NOT NULL AND NEW.delivery_slot_window IS NOT NULL THEN
        -- Only check if slot is new or being changed
        IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (
            NEW.delivery_slot_date IS DISTINCT FROM OLD.delivery_slot_date OR 
            NEW.delivery_slot_window IS DISTINCT FROM OLD.delivery_slot_window
        )) THEN
            -- RACE-SAFETY: Acquire an exclusive advisory transaction lock on the exact (apartment_id, date, window) tuple.
            -- Any concurrent transaction attempting to book the same window for this apartment is serialized.
            -- The lock automatically releases when the transaction commits or rolls back.
            v_lock_key := ('x' || substr(md5(NEW.apartment_id::text || ':' || NEW.delivery_slot_date::text || ':' || NEW.delivery_slot_window::text), 1, 16))::bit(64)::bigint;
            PERFORM pg_advisory_xact_lock(v_lock_key);

            SELECT COUNT(*) INTO v_slot_count
            FROM public.orders
            WHERE apartment_id = NEW.apartment_id
              AND delivery_slot_date = NEW.delivery_slot_date
              AND delivery_slot_window = NEW.delivery_slot_window
              AND status <> 'delivered'
              AND (TG_OP = 'INSERT' OR id <> OLD.id);

            IF v_slot_count >= c_max_capacity THEN
                RAISE EXCEPTION 'Delivery slot full: The selected time window (%) on % has reached its maximum capacity of % deliveries.',
                    NEW.delivery_slot_window, NEW.delivery_slot_date, c_max_capacity;
            END IF;

            NEW.delivery_slot_booked_at := COALESCE(NEW.delivery_slot_booked_at, NOW());
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_delivery_slot_capacity ON public.orders;
CREATE TRIGGER trg_delivery_slot_capacity
    BEFORE INSERT OR UPDATE OF delivery_slot_date, delivery_slot_window ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.check_delivery_slot_capacity();
