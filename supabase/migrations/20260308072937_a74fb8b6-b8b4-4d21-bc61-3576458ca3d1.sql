
-- Function to check booking conflicts
CREATE OR REPLACE FUNCTION public.check_booking_conflict()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  -- Skip cancelled/refused bookings
  IF NEW.status IN ('cancelled', 'refused') THEN
    RETURN NEW;
  END IF;

  -- Check for overlapping bookings on the same house (approved or pending)
  IF EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.house_id = NEW.house_id
      AND b.id IS DISTINCT FROM NEW.id
      AND b.status IN ('pending', 'approved')
      AND b.start_date < NEW.end_date
      AND b.end_date > NEW.start_date
      AND (
        -- Both are whole-house bookings
        (b.unit_id IS NULL AND NEW.unit_id IS NULL)
        -- One is whole-house, the other is a unit
        OR b.unit_id IS NULL
        OR NEW.unit_id IS NULL
        -- Same unit
        OR b.unit_id = NEW.unit_id
      )
  ) THEN
    RAISE EXCEPTION 'Conflit de réservation : cet espace est déjà réservé sur ces dates.';
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger
DROP TRIGGER IF EXISTS trg_check_booking_conflict ON public.bookings;
CREATE TRIGGER trg_check_booking_conflict
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.check_booking_conflict();
