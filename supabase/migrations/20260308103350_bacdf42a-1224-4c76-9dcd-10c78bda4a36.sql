
-- Add missing fields to bookings
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS guest_count integer;

-- Add expense category enum and fields
CREATE TYPE public.expense_category AS ENUM ('courses', 'travaux', 'entretien', 'energie', 'assurance', 'taxes', 'menage', 'autre');
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS category public.expense_category NOT NULL DEFAULT 'autre';
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS expense_date date;

-- Add priority to maintenance tickets
CREATE TYPE public.ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');
ALTER TABLE public.maintenance_tickets ADD COLUMN IF NOT EXISTS priority public.ticket_priority NOT NULL DEFAULT 'medium';

-- Add practical info fields to houses
ALTER TABLE public.houses ADD COLUMN IF NOT EXISTS wifi_name text;
ALTER TABLE public.houses ADD COLUMN IF NOT EXISTS wifi_password text;
ALTER TABLE public.houses ADD COLUMN IF NOT EXISTS access_code text;
ALTER TABLE public.houses ADD COLUMN IF NOT EXISTS emergency_contact text;
