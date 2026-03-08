
-- Create payment method enum
CREATE TYPE public.payment_method AS ENUM ('declarative', 'stripe', 'both');

-- Add payment method and declarative payment details to house_pricing
ALTER TABLE public.house_pricing 
  ADD COLUMN payment_method public.payment_method NOT NULL DEFAULT 'declarative',
  ADD COLUMN accepted_payments text[] NOT NULL DEFAULT ARRAY['virement', 'cheque', 'liquide']::text[],
  ADD COLUMN payment_instructions text DEFAULT NULL;
