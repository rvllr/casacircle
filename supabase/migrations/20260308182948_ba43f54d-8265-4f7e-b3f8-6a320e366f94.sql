
-- Create payment status enum
CREATE TYPE public.payment_status AS ENUM ('not_applicable', 'unpaid', 'partial', 'paid');

-- Add payment_status column to bookings
ALTER TABLE public.bookings 
ADD COLUMN payment_status public.payment_status NOT NULL DEFAULT 'not_applicable';

-- Add payment_amount (what was actually paid)
ALTER TABLE public.bookings
ADD COLUMN amount_paid numeric DEFAULT 0;

-- Add total_price (calculated price for the booking)
ALTER TABLE public.bookings
ADD COLUMN total_price numeric DEFAULT NULL;
