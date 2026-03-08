
-- Fix houses INSERT policy: drop restrictive, recreate as permissive
DROP POLICY IF EXISTS "Users can create houses" ON public.houses;
DROP POLICY IF EXISTS "Members can view houses" ON public.houses;
DROP POLICY IF EXISTS "Admins can update houses" ON public.houses;
DROP POLICY IF EXISTS "Admins can delete houses" ON public.houses;

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

-- Fix house_members policies too
DROP POLICY IF EXISTS "House members can view members" ON public.house_members;
DROP POLICY IF EXISTS "House owner can add members" ON public.house_members;
DROP POLICY IF EXISTS "House owner can remove members" ON public.house_members;

CREATE POLICY "House members can view members"
ON public.house_members FOR SELECT TO authenticated
USING (is_house_member(auth.uid(), house_id));

CREATE POLICY "House owner can add members"
ON public.house_members FOR INSERT TO authenticated
WITH CHECK (is_house_admin(auth.uid(), house_id) OR (auth.uid() = user_id AND role = 'owner'));

CREATE POLICY "House owner can remove members"
ON public.house_members FOR DELETE TO authenticated
USING (is_house_admin(auth.uid(), house_id));

-- Fix house_units policies
DROP POLICY IF EXISTS "Members can view units" ON public.house_units;
DROP POLICY IF EXISTS "Admins can create units" ON public.house_units;
DROP POLICY IF EXISTS "Admins can update units" ON public.house_units;
DROP POLICY IF EXISTS "Admins can delete units" ON public.house_units;

CREATE POLICY "Members can view units"
ON public.house_units FOR SELECT TO authenticated
USING (is_house_member(auth.uid(), house_id));

CREATE POLICY "Admins can create units"
ON public.house_units FOR INSERT TO authenticated
WITH CHECK (is_house_admin(auth.uid(), house_id));

CREATE POLICY "Admins can update units"
ON public.house_units FOR UPDATE TO authenticated
USING (is_house_admin(auth.uid(), house_id));

CREATE POLICY "Admins can delete units"
ON public.house_units FOR DELETE TO authenticated
USING (is_house_admin(auth.uid(), house_id));

-- Fix all remaining tables that still have restrictive policies
-- bookings
DROP POLICY IF EXISTS "Members can view bookings" ON public.bookings;
DROP POLICY IF EXISTS "Members can create bookings" ON public.bookings;
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

-- expenses
DROP POLICY IF EXISTS "Members can view expenses" ON public.expenses;
DROP POLICY IF EXISTS "Members can create expenses" ON public.expenses;
DROP POLICY IF EXISTS "Expense creator can update" ON public.expenses;
DROP POLICY IF EXISTS "Expense creator can delete" ON public.expenses;

CREATE POLICY "Members can view expenses"
ON public.expenses FOR SELECT TO authenticated
USING (is_house_member(auth.uid(), house_id));

CREATE POLICY "Members can create expenses"
ON public.expenses FOR INSERT TO authenticated
WITH CHECK (auth.uid() = paid_by AND is_house_member(auth.uid(), house_id));

CREATE POLICY "Expense creator can update"
ON public.expenses FOR UPDATE TO authenticated
USING (auth.uid() = paid_by);

CREATE POLICY "Expense creator can delete"
ON public.expenses FOR DELETE TO authenticated
USING (auth.uid() = paid_by);

-- expense_shares
DROP POLICY IF EXISTS "Members can view expense shares" ON public.expense_shares;
DROP POLICY IF EXISTS "Expense creator can manage shares" ON public.expense_shares;
DROP POLICY IF EXISTS "Expense creator can delete shares" ON public.expense_shares;

CREATE POLICY "Members can view expense shares"
ON public.expense_shares FOR SELECT TO authenticated
USING (is_house_member(auth.uid(), get_house_id_from_expense(expense_id)));

CREATE POLICY "Expense creator can manage shares"
ON public.expense_shares FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM expenses WHERE expenses.id = expense_shares.expense_id AND expenses.paid_by = auth.uid()));

CREATE POLICY "Expense creator can delete shares"
ON public.expense_shares FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM expenses WHERE expenses.id = expense_shares.expense_id AND expenses.paid_by = auth.uid()));

-- house_memories
DROP POLICY IF EXISTS "Members can view memories" ON public.house_memories;
DROP POLICY IF EXISTS "Members can create memories" ON public.house_memories;

CREATE POLICY "Members can view memories"
ON public.house_memories FOR SELECT TO authenticated
USING (is_house_member(auth.uid(), house_id));

CREATE POLICY "Members can create memories"
ON public.house_memories FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by AND is_house_member(auth.uid(), house_id));

-- memory_photos
DROP POLICY IF EXISTS "Members can view memory photos" ON public.memory_photos;
DROP POLICY IF EXISTS "Members can add photos" ON public.memory_photos;

CREATE POLICY "Members can view memory photos"
ON public.memory_photos FOR SELECT TO authenticated
USING (is_house_member(auth.uid(), get_house_id_from_memory(memory_id)));

CREATE POLICY "Members can add photos"
ON public.memory_photos FOR INSERT TO authenticated
WITH CHECK (is_house_member(auth.uid(), get_house_id_from_memory(memory_id)));

-- house_news
DROP POLICY IF EXISTS "Members can view news" ON public.house_news;
DROP POLICY IF EXISTS "Members can create news" ON public.house_news;

CREATE POLICY "Members can view news"
ON public.house_news FOR SELECT TO authenticated
USING (is_house_member(auth.uid(), house_id));

CREATE POLICY "Members can create news"
ON public.house_news FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by AND is_house_member(auth.uid(), house_id));

-- booking_guests
DROP POLICY IF EXISTS "Members can view booking guests" ON public.booking_guests;
DROP POLICY IF EXISTS "Booking owner can manage guests" ON public.booking_guests;
DROP POLICY IF EXISTS "Booking owner can delete guests" ON public.booking_guests;

CREATE POLICY "Members can view booking guests"
ON public.booking_guests FOR SELECT TO authenticated
USING (is_house_member(auth.uid(), get_house_id_from_booking(booking_id)));

CREATE POLICY "Booking owner can manage guests"
ON public.booking_guests FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM bookings WHERE bookings.id = booking_guests.booking_id AND bookings.user_id = auth.uid()));

CREATE POLICY "Booking owner can delete guests"
ON public.booking_guests FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM bookings WHERE bookings.id = booking_guests.booking_id AND bookings.user_id = auth.uid()));

-- documents
DROP POLICY IF EXISTS "Members can view documents" ON public.documents;
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

-- house_guides
DROP POLICY IF EXISTS "Members can view guides" ON public.house_guides;
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

-- maintenance_tickets
DROP POLICY IF EXISTS "Members can view tickets" ON public.maintenance_tickets;
DROP POLICY IF EXISTS "Members can create tickets" ON public.maintenance_tickets;
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

-- votes
DROP POLICY IF EXISTS "Members can view votes" ON public.votes;
DROP POLICY IF EXISTS "Members can create votes" ON public.votes;

CREATE POLICY "Members can view votes"
ON public.votes FOR SELECT TO authenticated
USING (is_house_member(auth.uid(), house_id));

CREATE POLICY "Members can create votes"
ON public.votes FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by AND is_house_member(auth.uid(), house_id));

-- vote_responses
DROP POLICY IF EXISTS "Members can view responses" ON public.vote_responses;
DROP POLICY IF EXISTS "Members can vote" ON public.vote_responses;
DROP POLICY IF EXISTS "Members can update own vote" ON public.vote_responses;

CREATE POLICY "Members can view responses"
ON public.vote_responses FOR SELECT TO authenticated
USING (is_house_member(auth.uid(), get_house_id_from_vote(vote_id)));

CREATE POLICY "Members can vote"
ON public.vote_responses FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND is_house_member(auth.uid(), get_house_id_from_vote(vote_id)));

CREATE POLICY "Members can update own vote"
ON public.vote_responses FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

-- families
DROP POLICY IF EXISTS "Authenticated users can create families" ON public.families;
DROP POLICY IF EXISTS "Members can view their families" ON public.families;
DROP POLICY IF EXISTS "Admins can update their families" ON public.families;

CREATE POLICY "Authenticated users can create families"
ON public.families FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Members can view their families"
ON public.families FOR SELECT TO authenticated
USING (is_family_member(auth.uid(), id));

CREATE POLICY "Admins can update their families"
ON public.families FOR UPDATE TO authenticated
USING (is_family_admin(auth.uid(), id));

-- family_members
DROP POLICY IF EXISTS "Admins can add family members" ON public.family_members;
DROP POLICY IF EXISTS "Creator can add self as member" ON public.family_members;
DROP POLICY IF EXISTS "Members can view family members" ON public.family_members;
DROP POLICY IF EXISTS "Admins can remove family members" ON public.family_members;

CREATE POLICY "Admins can add family members"
ON public.family_members FOR INSERT TO authenticated
WITH CHECK (is_family_admin(auth.uid(), family_id));

CREATE POLICY "Creator can add self as member"
ON public.family_members FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND role = 'admin'::family_role);

CREATE POLICY "Members can view family members"
ON public.family_members FOR SELECT TO authenticated
USING (is_family_member(auth.uid(), family_id));

CREATE POLICY "Admins can remove family members"
ON public.family_members FOR DELETE TO authenticated
USING (is_family_admin(auth.uid(), family_id));

-- users_profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.users_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users_profiles;

CREATE POLICY "Users can view all profiles"
ON public.users_profiles FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users can insert own profile"
ON public.users_profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
ON public.users_profiles FOR UPDATE TO authenticated
USING (auth.uid() = user_id);
