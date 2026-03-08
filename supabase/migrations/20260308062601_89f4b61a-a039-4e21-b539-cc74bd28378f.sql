
-- Booking guests
CREATE TYPE public.guest_type AS ENUM ('family', 'friend');

CREATE TABLE public.booking_guests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type guest_type NOT NULL DEFAULT 'family',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.booking_guests ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.get_house_id_from_booking(_booking_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT house_id FROM public.bookings WHERE id = _booking_id
$$;

CREATE POLICY "Family members can view booking guests" ON public.booking_guests
FOR SELECT TO authenticated USING (
  public.is_family_member(auth.uid(), public.get_family_id_from_house(public.get_house_id_from_booking(booking_id)))
);

CREATE POLICY "Booking owner can manage guests" ON public.booking_guests
FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.bookings WHERE id = booking_id AND user_id = auth.uid())
);

CREATE POLICY "Booking owner can delete guests" ON public.booking_guests
FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.bookings WHERE id = booking_id AND user_id = auth.uid())
);

-- House guides
CREATE TYPE public.guide_type AS ENUM ('arrival', 'departure', 'rules', 'practical_info');

CREATE TABLE public.house_guides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  house_id UUID NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  type guide_type NOT NULL DEFAULT 'practical_info',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.house_guides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view guides" ON public.house_guides
FOR SELECT TO authenticated USING (public.is_family_member(auth.uid(), public.get_family_id_from_house(house_id)));

CREATE POLICY "Admins can create guides" ON public.house_guides
FOR INSERT TO authenticated WITH CHECK (public.is_family_admin(auth.uid(), public.get_family_id_from_house(house_id)));

CREATE POLICY "Admins can update guides" ON public.house_guides
FOR UPDATE TO authenticated USING (public.is_family_admin(auth.uid(), public.get_family_id_from_house(house_id)));

CREATE POLICY "Admins can delete guides" ON public.house_guides
FOR DELETE TO authenticated USING (public.is_family_admin(auth.uid(), public.get_family_id_from_house(house_id)));

CREATE TRIGGER update_house_guides_updated_at BEFORE UPDATE ON public.house_guides
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Expenses
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  house_id UUID NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  paid_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view expenses" ON public.expenses
FOR SELECT TO authenticated USING (public.is_family_member(auth.uid(), public.get_family_id_from_house(house_id)));

CREATE POLICY "Family members can create expenses" ON public.expenses
FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = paid_by AND
  public.is_family_member(auth.uid(), public.get_family_id_from_house(house_id))
);

CREATE POLICY "Expense creator can update" ON public.expenses
FOR UPDATE TO authenticated USING (auth.uid() = paid_by);

CREATE POLICY "Expense creator can delete" ON public.expenses
FOR DELETE TO authenticated USING (auth.uid() = paid_by);

-- Expense shares
CREATE TABLE public.expense_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  UNIQUE (expense_id, user_id)
);

ALTER TABLE public.expense_shares ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.get_house_id_from_expense(_expense_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT house_id FROM public.expenses WHERE id = _expense_id
$$;

CREATE POLICY "Family members can view expense shares" ON public.expense_shares
FOR SELECT TO authenticated USING (
  public.is_family_member(auth.uid(), public.get_family_id_from_house(public.get_house_id_from_expense(expense_id)))
);

CREATE POLICY "Expense creator can manage shares" ON public.expense_shares
FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.expenses WHERE id = expense_id AND paid_by = auth.uid())
);

CREATE POLICY "Expense creator can delete shares" ON public.expense_shares
FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.expenses WHERE id = expense_id AND paid_by = auth.uid())
);

-- Votes
CREATE TABLE public.votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  house_id UUID NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deadline TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view votes" ON public.votes
FOR SELECT TO authenticated USING (public.is_family_member(auth.uid(), public.get_family_id_from_house(house_id)));

CREATE POLICY "Family members can create votes" ON public.votes
FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = created_by AND
  public.is_family_member(auth.uid(), public.get_family_id_from_house(house_id))
);

-- Vote responses
CREATE TYPE public.vote_response AS ENUM ('yes', 'no', 'abstain');

CREATE TABLE public.vote_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vote_id UUID NOT NULL REFERENCES public.votes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  response vote_response NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (vote_id, user_id)
);

ALTER TABLE public.vote_responses ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.get_house_id_from_vote(_vote_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT house_id FROM public.votes WHERE id = _vote_id
$$;

CREATE POLICY "Family members can view responses" ON public.vote_responses
FOR SELECT TO authenticated USING (
  public.is_family_member(auth.uid(), public.get_family_id_from_house(public.get_house_id_from_vote(vote_id)))
);

CREATE POLICY "Members can vote" ON public.vote_responses
FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = user_id AND
  public.is_family_member(auth.uid(), public.get_family_id_from_house(public.get_house_id_from_vote(vote_id)))
);

CREATE POLICY "Members can update own vote" ON public.vote_responses
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Maintenance tickets
CREATE TYPE public.ticket_status AS ENUM ('open', 'in_progress', 'resolved');

CREATE TABLE public.maintenance_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  house_id UUID NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status ticket_status NOT NULL DEFAULT 'open',
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.maintenance_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view tickets" ON public.maintenance_tickets
FOR SELECT TO authenticated USING (public.is_family_member(auth.uid(), public.get_family_id_from_house(house_id)));

CREATE POLICY "Family members can create tickets" ON public.maintenance_tickets
FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = created_by AND
  public.is_family_member(auth.uid(), public.get_family_id_from_house(house_id))
);

CREATE POLICY "Admins can update tickets" ON public.maintenance_tickets
FOR UPDATE TO authenticated USING (public.is_family_admin(auth.uid(), public.get_family_id_from_house(house_id)));

CREATE TRIGGER update_maintenance_tickets_updated_at BEFORE UPDATE ON public.maintenance_tickets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Documents
CREATE TYPE public.document_type AS ENUM ('legal', 'insurance', 'invoice', 'other');

CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  house_id UUID NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  type document_type NOT NULL DEFAULT 'other',
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view documents" ON public.documents
FOR SELECT TO authenticated USING (public.is_family_member(auth.uid(), public.get_family_id_from_house(house_id)));

CREATE POLICY "Admins can upload documents" ON public.documents
FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = uploaded_by AND
  public.is_family_admin(auth.uid(), public.get_family_id_from_house(house_id))
);

CREATE POLICY "Admins can delete documents" ON public.documents
FOR DELETE TO authenticated USING (public.is_family_admin(auth.uid(), public.get_family_id_from_house(house_id)));
