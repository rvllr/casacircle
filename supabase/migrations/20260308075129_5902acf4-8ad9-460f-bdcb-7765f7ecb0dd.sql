
-- Notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  house_id uuid REFERENCES public.houses(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can delete own notifications"
ON public.notifications FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Index for fast queries
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, is_read) WHERE is_read = false;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Function to notify house members on booking changes
CREATE OR REPLACE FUNCTION public.notify_booking_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _house_name text;
  _booker_name text;
  _member record;
  _title text;
  _body text;
  _type text;
BEGIN
  -- Get house name
  SELECT name INTO _house_name FROM public.houses WHERE id = NEW.house_id;

  -- Get booker name
  SELECT COALESCE(first_name || ' ' || last_name, email, 'Un membre')
  INTO _booker_name
  FROM public.users_profiles WHERE user_id = NEW.user_id
  LIMIT 1;

  -- Determine notification type and content
  IF TG_OP = 'INSERT' THEN
    _type := 'booking_new';
    _title := 'Nouvelle réservation';
    _body := _booker_name || ' a demandé une réservation pour ' || _house_name
             || ' du ' || to_char(NEW.start_date, 'DD/MM/YYYY') || ' au ' || to_char(NEW.end_date, 'DD/MM/YYYY');

    -- Notify all house members except the booker
    FOR _member IN
      SELECT user_id FROM public.house_members WHERE house_id = NEW.house_id AND user_id != NEW.user_id
      UNION
      SELECT fm.user_id FROM public.family_members fm
        JOIN public.houses h ON h.family_id = fm.family_id
        WHERE h.id = NEW.house_id AND fm.user_id != NEW.user_id AND h.family_id IS NOT NULL
    LOOP
      INSERT INTO public.notifications (user_id, house_id, type, title, body, metadata)
      VALUES (_member.user_id, NEW.house_id, _type, _title, _body, jsonb_build_object('booking_id', NEW.id));
    END LOOP;

  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'approved' THEN
      _type := 'booking_approved';
      _title := 'Réservation confirmée';
      _body := 'Votre réservation pour ' || _house_name
               || ' du ' || to_char(NEW.start_date, 'DD/MM/YYYY') || ' au ' || to_char(NEW.end_date, 'DD/MM/YYYY') || ' a été confirmée.';
    ELSIF NEW.status = 'refused' THEN
      _type := 'booking_refused';
      _title := 'Réservation refusée';
      _body := 'Votre réservation pour ' || _house_name
               || ' du ' || to_char(NEW.start_date, 'DD/MM/YYYY') || ' au ' || to_char(NEW.end_date, 'DD/MM/YYYY') || ' a été refusée.';
    ELSIF NEW.status = 'cancelled' THEN
      _type := 'booking_cancelled';
      _title := 'Réservation annulée';
      _body := _booker_name || ' a annulé sa réservation pour ' || _house_name
               || ' du ' || to_char(NEW.start_date, 'DD/MM/YYYY') || ' au ' || to_char(NEW.end_date, 'DD/MM/YYYY') || '.';
    ELSE
      RETURN NEW;
    END IF;

    IF NEW.status = 'cancelled' THEN
      -- Notify house admins
      FOR _member IN
        SELECT user_id FROM public.house_members WHERE house_id = NEW.house_id AND role IN ('admin', 'owner') AND user_id != NEW.user_id
      LOOP
        INSERT INTO public.notifications (user_id, house_id, type, title, body, metadata)
        VALUES (_member.user_id, NEW.house_id, _type, _title, _body, jsonb_build_object('booking_id', NEW.id));
      END LOOP;
    ELSE
      -- Notify the booker
      INSERT INTO public.notifications (user_id, house_id, type, title, body, metadata)
      VALUES (NEW.user_id, NEW.house_id, _type, _title, _body, jsonb_build_object('booking_id', NEW.id));
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger
CREATE TRIGGER on_booking_change
  AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_booking_change();
