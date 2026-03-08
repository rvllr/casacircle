
-- Add cleaning fee config to house_pricing
CREATE TYPE public.cleaning_mode AS ENUM ('included', 'optional', 'mandatory');

ALTER TABLE public.house_pricing
  ADD COLUMN cleaning_fee numeric DEFAULT NULL,
  ADD COLUMN cleaning_mode public.cleaning_mode NOT NULL DEFAULT 'included';

-- Track cleaning fee on bookings
ALTER TABLE public.bookings
  ADD COLUMN cleaning_fee numeric DEFAULT NULL,
  ADD COLUMN cleaning_fee_paid boolean NOT NULL DEFAULT false;
