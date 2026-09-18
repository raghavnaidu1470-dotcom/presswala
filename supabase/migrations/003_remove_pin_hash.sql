-- ==============================================================================
-- PressWala - Ironing Vendor Order & Payment Tracker
-- Database Schema Migration: 003_remove_pin_hash.sql
-- Description: Drops plaintext/pin_hash from users table;
--              Implements secure vendor password reset RPC via auth.users.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Drop pin_hash from users table
-- ------------------------------------------------------------------------------
ALTER TABLE public.users DROP COLUMN IF EXISTS pin_hash;

-- ------------------------------------------------------------------------------
-- 2. Vendor Password Reset RPC (SECURITY DEFINER)
-- Allows an authenticated vendor to reset a resident's password securely
-- without exposing any service_role keys to the client.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.vendor_reset_resident_password(
    p_flat_number TEXT,
    p_new_password TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_auth_user_id UUID;
BEGIN
    -- Security verification: Only authenticated vendor sessions can execute
    IF NOT public.is_vendor() THEN
        RAISE EXCEPTION 'Unauthorized: Only an authenticated vendor can reset resident passwords';
    END IF;

    -- Look up auth user id from profiles table
    SELECT id INTO v_auth_user_id
    FROM public.profiles
    WHERE UPPER(flat_number) = UPPER(p_flat_number)
    LIMIT 1;

    IF v_auth_user_id IS NULL THEN
        RAISE EXCEPTION 'No active profile found for flat %', p_flat_number;
    END IF;

    -- Update the encrypted password directly in auth.users using pgcrypto
    UPDATE auth.users
    SET 
        encrypted_password = crypt(p_new_password, gen_salt('bf')),
        updated_at = NOW()
    WHERE id = v_auth_user_id;

    -- Log the administrative reset action
    INSERT INTO public.login_attempts (login_key, success, user_agent)
    VALUES (UPPER(p_flat_number), TRUE, 'Vendor Password Reset via RPC');

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, extensions;

-- Grant execution to authenticated users (internal is_vendor() check protects it)
GRANT EXECUTE ON FUNCTION public.vendor_reset_resident_password(TEXT, TEXT) TO authenticated;

-- ==============================================================================
-- Migration 003 Applied Successfully
-- ==============================================================================
