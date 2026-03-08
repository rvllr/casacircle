
-- Add booking_auto_approve column to houses (default false = requires admin validation)
ALTER TABLE public.houses ADD COLUMN IF NOT EXISTS booking_auto_approve boolean NOT NULL DEFAULT false;
