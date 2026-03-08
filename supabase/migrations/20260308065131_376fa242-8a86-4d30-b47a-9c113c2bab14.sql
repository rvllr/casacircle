
-- 1. Create house_members table
CREATE TABLE public.house_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id uuid NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (house_id, user_id)
);

ALTER TABLE public.house_members ENABLE ROW LEVEL SECURITY;

-- 2. Make family_id nullable on houses
ALTER TABLE public.houses ALTER COLUMN family_id DROP NOT NULL;

-- 3. Add owner_id to houses for direct ownership
ALTER TABLE public.houses ADD COLUMN owner_id uuid;

-- 4. Create is_house_member function (checks direct membership OR family membership)
CREATE OR REPLACE FUNCTION public.is_house_member(_user_id uuid, _house_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.house_members
    WHERE user_id = _user_id AND house_id = _house_id
  )
  OR EXISTS (
    SELECT 1 FROM public.houses h
    JOIN public.family_members fm ON fm.family_id = h.family_id
    WHERE h.id = _house_id AND fm.user_id = _user_id AND h.family_id IS NOT NULL
  )
$$;

-- 5. Create is_house_admin function
CREATE OR REPLACE FUNCTION public.is_house_admin(_user_id uuid, _house_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.house_members
    WHERE user_id = _user_id AND house_id = _house_id AND role = 'owner'
  )
  OR EXISTS (
    SELECT 1 FROM public.houses h
    JOIN public.family_members fm ON fm.family_id = h.family_id
    WHERE h.id = _house_id AND fm.user_id = _user_id AND fm.role = 'admin' AND h.family_id IS NOT NULL
  )
$$;

-- 6. RLS policies for house_members
CREATE POLICY "House members can view members"
ON public.house_members FOR SELECT TO authenticated
USING (is_house_member(auth.uid(), house_id));

CREATE POLICY "House owner can add members"
ON public.house_members FOR INSERT TO authenticated
WITH CHECK (is_house_admin(auth.uid(), house_id) OR (auth.uid() = user_id AND role = 'owner'));

CREATE POLICY "House owner can remove members"
ON public.house_members FOR DELETE TO authenticated
USING (is_house_admin(auth.uid(), house_id));

-- 7. Update houses RLS: allow creating without family
DROP POLICY IF EXISTS "Family admins can create houses" ON public.houses;
DROP POLICY IF EXISTS "Family admins can update houses" ON public.houses;
DROP POLICY IF EXISTS "Family admins can delete houses" ON public.houses;
DROP POLICY IF EXISTS "Family members can view houses" ON public.houses;

CREATE POLICY "Users can create houses"
ON public.houses FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = owner_id
  OR (family_id IS NOT NULL AND is_family_admin(auth.uid(), family_id))
);

CREATE POLICY "Members can view houses"
ON public.houses FOR SELECT TO authenticated
USING (is_house_member(auth.uid(), id));

CREATE POLICY "Admins can update houses"
ON public.houses FOR UPDATE TO authenticated
USING (is_house_admin(auth.uid(), id));

CREATE POLICY "Admins can delete houses"
ON public.houses FOR DELETE TO authenticated
USING (is_house_admin(auth.uid(), id));

-- 8. Update other tables RLS to use is_house_member instead of family-only check
DROP POLICY IF EXISTS "Family members can view bookings" ON public.bookings;
DROP POLICY IF EXISTS "Family members can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can update bookings" ON public.bookings;

CREATE POLICY "Members can view bookings"
ON public.bookings FOR SELECT TO authenticated
USING (is_house_member(auth.uid(), house_id));

CREATE POLICY "Members can create bookings"
ON public.bookings FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND is_house_member(auth.uid(), house_id));

CREATE POLICY "Admins can update bookings"
ON public.bookings FOR UPDATE TO authenticated
USING (is_house_admin(auth.uid(), house_id) OR auth.uid() = user_id);

-- Expenses
DROP POLICY IF EXISTS "Family members can view expenses" ON public.expenses;
DROP POLICY IF EXISTS "Family members can create expenses" ON public.expenses;

CREATE POLICY "Members can view expenses"
ON public.expenses FOR SELECT TO authenticated
USING (is_house_member(auth.uid(), house_id));

CREATE POLICY "Members can create expenses"
ON public.expenses FOR INSERT TO authenticated
WITH CHECK (auth.uid() = paid_by AND is_house_member(auth.uid(), house_id));

-- Expense shares
DROP POLICY IF EXISTS "Family members can view expense shares" ON public.expense_shares;

CREATE POLICY "Members can view expense shares"
ON public.expense_shares FOR SELECT TO authenticated
USING (is_house_member(auth.uid(), get_house_id_from_expense(expense_id)));

-- Memories
DROP POLICY IF EXISTS "Family members can view memories" ON public.house_memories;
DROP POLICY IF EXISTS "Family members can create memories" ON public.house_memories;

CREATE POLICY "Members can view memories"
ON public.house_memories FOR SELECT TO authenticated
USING (is_house_member(auth.uid(), house_id));

CREATE POLICY "Members can create memories"
ON public.house_memories FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by AND is_house_member(auth.uid(), house_id));

-- Memory photos
DROP POLICY IF EXISTS "Family members can view memory photos" ON public.memory_photos;
DROP POLICY IF EXISTS "Memory creator can add photos" ON public.memory_photos;

CREATE POLICY "Members can view memory photos"
ON public.memory_photos FOR SELECT TO authenticated
USING (is_house_member(auth.uid(), get_house_id_from_memory(memory_id)));

CREATE POLICY "Members can add photos"
ON public.memory_photos FOR INSERT TO authenticated
WITH CHECK (is_house_member(auth.uid(), get_house_id_from_memory(memory_id)));

-- News
DROP POLICY IF EXISTS "Family members can view news" ON public.house_news;
DROP POLICY IF EXISTS "Family members can create news" ON public.house_news;

CREATE POLICY "Members can view news"
ON public.house_news FOR SELECT TO authenticated
USING (is_house_member(auth.uid(), house_id));

CREATE POLICY "Members can create news"
ON public.house_news FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by AND is_house_member(auth.uid(), house_id));

-- Booking guests
DROP POLICY IF EXISTS "Family members can view booking guests" ON public.booking_guests;

CREATE POLICY "Members can view booking guests"
ON public.booking_guests FOR SELECT TO authenticated
USING (is_house_member(auth.uid(), get_house_id_from_booking(booking_id)));

-- Guides
DROP POLICY IF EXISTS "Family members can view guides" ON public.house_guides;
DROP POLICY IF EXISTS "Admins can create guides" ON public.house_guides;
DROP POLICY IF EXISTS "Admins can update guides" ON public.house_guides;
DROP POLICY IF EXISTS "Admins can delete guides" ON public.house_guides;

CREATE POLICY "Members can view guides"
ON public.house_guides FOR SELECT TO authenticated
USING (is_house_member(auth.uid(), house_id));

CREATE POLICY "Admins can create guides"
ON public.house_guides FOR INSERT TO authenticated
WITH CHECK (is_house_admin(auth.uid(), house_id));

CREATE POLICY "Admins can update guides"
ON public.house_guides FOR UPDATE TO authenticated
USING (is_house_admin(auth.uid(), house_id));

CREATE POLICY "Admins can delete guides"
ON public.house_guides FOR DELETE TO authenticated
USING (is_house_admin(auth.uid(), house_id));

-- Tickets
DROP POLICY IF EXISTS "Family members can view tickets" ON public.maintenance_tickets;
DROP POLICY IF EXISTS "Family members can create tickets" ON public.maintenance_tickets;
DROP POLICY IF EXISTS "Admins can update tickets" ON public.maintenance_tickets;

CREATE POLICY "Members can view tickets"
ON public.maintenance_tickets FOR SELECT TO authenticated
USING (is_house_member(auth.uid(), house_id));

CREATE POLICY "Members can create tickets"
ON public.maintenance_tickets FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by AND is_house_member(auth.uid(), house_id));

CREATE POLICY "Admins can update tickets"
ON public.maintenance_tickets FOR UPDATE TO authenticated
USING (is_house_admin(auth.uid(), house_id));

-- Documents
DROP POLICY IF EXISTS "Family members can view documents" ON public.documents;
DROP POLICY IF EXISTS "Admins can upload documents" ON public.documents;
DROP POLICY IF EXISTS "Admins can delete documents" ON public.documents;

CREATE POLICY "Members can view documents"
ON public.documents FOR SELECT TO authenticated
USING (is_house_member(auth.uid(), house_id));

CREATE POLICY "Admins can upload documents"
ON public.documents FOR INSERT TO authenticated
WITH CHECK (auth.uid() = uploaded_by AND is_house_admin(auth.uid(), house_id));

CREATE POLICY "Admins can delete documents"
ON public.documents FOR DELETE TO authenticated
USING (is_house_admin(auth.uid(), house_id));

-- Votes
DROP POLICY IF EXISTS "Family members can view votes" ON public.votes;
DROP POLICY IF EXISTS "Family members can create votes" ON public.votes;

CREATE POLICY "Members can view votes"
ON public.votes FOR SELECT TO authenticated
USING (is_house_member(auth.uid(), house_id));

CREATE POLICY "Members can create votes"
ON public.votes FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by AND is_house_member(auth.uid(), house_id));

-- Vote responses
DROP POLICY IF EXISTS "Family members can view responses" ON public.vote_responses;
DROP POLICY IF EXISTS "Members can vote" ON public.vote_responses;

CREATE POLICY "Members can view responses"
ON public.vote_responses FOR SELECT TO authenticated
USING (is_house_member(auth.uid(), get_house_id_from_vote(vote_id)));

CREATE POLICY "Members can vote"
ON public.vote_responses FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND is_house_member(auth.uid(), get_house_id_from_vote(vote_id)));
