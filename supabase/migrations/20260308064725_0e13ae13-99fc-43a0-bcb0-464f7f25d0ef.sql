
-- Fix families policies: drop RESTRICTIVE, recreate as PERMISSIVE
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

-- Fix family_members policies: drop RESTRICTIVE, recreate as PERMISSIVE
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

-- Fix houses policies
DROP POLICY IF EXISTS "Family members can view houses" ON public.houses;
DROP POLICY IF EXISTS "Family admins can create houses" ON public.houses;
DROP POLICY IF EXISTS "Family admins can update houses" ON public.houses;
DROP POLICY IF EXISTS "Family admins can delete houses" ON public.houses;

CREATE POLICY "Family members can view houses"
ON public.houses FOR SELECT TO authenticated
USING (is_family_member(auth.uid(), family_id));

CREATE POLICY "Family admins can create houses"
ON public.houses FOR INSERT TO authenticated
WITH CHECK (is_family_admin(auth.uid(), family_id));

CREATE POLICY "Family admins can update houses"
ON public.houses FOR UPDATE TO authenticated
USING (is_family_admin(auth.uid(), family_id));

CREATE POLICY "Family admins can delete houses"
ON public.houses FOR DELETE TO authenticated
USING (is_family_admin(auth.uid(), family_id));

-- Fix bookings policies
DROP POLICY IF EXISTS "Family members can view bookings" ON public.bookings;
DROP POLICY IF EXISTS "Family members can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can update bookings" ON public.bookings;

CREATE POLICY "Family members can view bookings"
ON public.bookings FOR SELECT TO authenticated
USING (is_family_member(auth.uid(), get_family_id_from_house(house_id)));

CREATE POLICY "Family members can create bookings"
ON public.bookings FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND is_family_member(auth.uid(), get_family_id_from_house(house_id)));

CREATE POLICY "Admins can update bookings"
ON public.bookings FOR UPDATE TO authenticated
USING (is_family_admin(auth.uid(), get_family_id_from_house(house_id)) OR auth.uid() = user_id);

-- Fix expenses policies
DROP POLICY IF EXISTS "Family members can view expenses" ON public.expenses;
DROP POLICY IF EXISTS "Family members can create expenses" ON public.expenses;
DROP POLICY IF EXISTS "Expense creator can update" ON public.expenses;
DROP POLICY IF EXISTS "Expense creator can delete" ON public.expenses;

CREATE POLICY "Family members can view expenses"
ON public.expenses FOR SELECT TO authenticated
USING (is_family_member(auth.uid(), get_family_id_from_house(house_id)));

CREATE POLICY "Family members can create expenses"
ON public.expenses FOR INSERT TO authenticated
WITH CHECK (auth.uid() = paid_by AND is_family_member(auth.uid(), get_family_id_from_house(house_id)));

CREATE POLICY "Expense creator can update"
ON public.expenses FOR UPDATE TO authenticated
USING (auth.uid() = paid_by);

CREATE POLICY "Expense creator can delete"
ON public.expenses FOR DELETE TO authenticated
USING (auth.uid() = paid_by);

-- Fix expense_shares policies
DROP POLICY IF EXISTS "Family members can view expense shares" ON public.expense_shares;
DROP POLICY IF EXISTS "Expense creator can manage shares" ON public.expense_shares;
DROP POLICY IF EXISTS "Expense creator can delete shares" ON public.expense_shares;

CREATE POLICY "Family members can view expense shares"
ON public.expense_shares FOR SELECT TO authenticated
USING (is_family_member(auth.uid(), get_family_id_from_house(get_house_id_from_expense(expense_id))));

CREATE POLICY "Expense creator can manage shares"
ON public.expense_shares FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM expenses WHERE expenses.id = expense_shares.expense_id AND expenses.paid_by = auth.uid()));

CREATE POLICY "Expense creator can delete shares"
ON public.expense_shares FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM expenses WHERE expenses.id = expense_shares.expense_id AND expenses.paid_by = auth.uid()));

-- Fix house_memories policies
DROP POLICY IF EXISTS "Family members can view memories" ON public.house_memories;
DROP POLICY IF EXISTS "Family members can create memories" ON public.house_memories;

CREATE POLICY "Family members can view memories"
ON public.house_memories FOR SELECT TO authenticated
USING (is_family_member(auth.uid(), get_family_id_from_house(house_id)));

CREATE POLICY "Family members can create memories"
ON public.house_memories FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by AND is_family_member(auth.uid(), get_family_id_from_house(house_id)));

-- Fix memory_photos policies
DROP POLICY IF EXISTS "Family members can view memory photos" ON public.memory_photos;
DROP POLICY IF EXISTS "Memory creator can add photos" ON public.memory_photos;

CREATE POLICY "Family members can view memory photos"
ON public.memory_photos FOR SELECT TO authenticated
USING (is_family_member(auth.uid(), get_family_id_from_house(get_house_id_from_memory(memory_id))));

CREATE POLICY "Memory creator can add photos"
ON public.memory_photos FOR INSERT TO authenticated
WITH CHECK (is_family_member(auth.uid(), get_family_id_from_house(get_house_id_from_memory(memory_id))));

-- Fix house_news policies
DROP POLICY IF EXISTS "Family members can view news" ON public.house_news;
DROP POLICY IF EXISTS "Family members can create news" ON public.house_news;

CREATE POLICY "Family members can view news"
ON public.house_news FOR SELECT TO authenticated
USING (is_family_member(auth.uid(), get_family_id_from_house(house_id)));

CREATE POLICY "Family members can create news"
ON public.house_news FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by AND is_family_member(auth.uid(), get_family_id_from_house(house_id)));

-- Fix booking_guests policies
DROP POLICY IF EXISTS "Family members can view booking guests" ON public.booking_guests;
DROP POLICY IF EXISTS "Booking owner can manage guests" ON public.booking_guests;
DROP POLICY IF EXISTS "Booking owner can delete guests" ON public.booking_guests;

CREATE POLICY "Family members can view booking guests"
ON public.booking_guests FOR SELECT TO authenticated
USING (is_family_member(auth.uid(), get_family_id_from_house(get_house_id_from_booking(booking_id))));

CREATE POLICY "Booking owner can manage guests"
ON public.booking_guests FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM bookings WHERE bookings.id = booking_guests.booking_id AND bookings.user_id = auth.uid()));

CREATE POLICY "Booking owner can delete guests"
ON public.booking_guests FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM bookings WHERE bookings.id = booking_guests.booking_id AND bookings.user_id = auth.uid()));

-- Fix users_profiles policies
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

-- Fix remaining tables
DROP POLICY IF EXISTS "Family members can view documents" ON public.documents;
DROP POLICY IF EXISTS "Admins can upload documents" ON public.documents;
DROP POLICY IF EXISTS "Admins can delete documents" ON public.documents;

CREATE POLICY "Family members can view documents"
ON public.documents FOR SELECT TO authenticated
USING (is_family_member(auth.uid(), get_family_id_from_house(house_id)));

CREATE POLICY "Admins can upload documents"
ON public.documents FOR INSERT TO authenticated
WITH CHECK (auth.uid() = uploaded_by AND is_family_admin(auth.uid(), get_family_id_from_house(house_id)));

CREATE POLICY "Admins can delete documents"
ON public.documents FOR DELETE TO authenticated
USING (is_family_admin(auth.uid(), get_family_id_from_house(house_id)));

DROP POLICY IF EXISTS "Family members can view guides" ON public.house_guides;
DROP POLICY IF EXISTS "Admins can create guides" ON public.house_guides;
DROP POLICY IF EXISTS "Admins can update guides" ON public.house_guides;
DROP POLICY IF EXISTS "Admins can delete guides" ON public.house_guides;

CREATE POLICY "Family members can view guides"
ON public.house_guides FOR SELECT TO authenticated
USING (is_family_member(auth.uid(), get_family_id_from_house(house_id)));

CREATE POLICY "Admins can create guides"
ON public.house_guides FOR INSERT TO authenticated
WITH CHECK (is_family_admin(auth.uid(), get_family_id_from_house(house_id)));

CREATE POLICY "Admins can update guides"
ON public.house_guides FOR UPDATE TO authenticated
USING (is_family_admin(auth.uid(), get_family_id_from_house(house_id)));

CREATE POLICY "Admins can delete guides"
ON public.house_guides FOR DELETE TO authenticated
USING (is_family_admin(auth.uid(), get_family_id_from_house(house_id)));

DROP POLICY IF EXISTS "Family members can view tickets" ON public.maintenance_tickets;
DROP POLICY IF EXISTS "Family members can create tickets" ON public.maintenance_tickets;
DROP POLICY IF EXISTS "Admins can update tickets" ON public.maintenance_tickets;

CREATE POLICY "Family members can view tickets"
ON public.maintenance_tickets FOR SELECT TO authenticated
USING (is_family_member(auth.uid(), get_family_id_from_house(house_id)));

CREATE POLICY "Family members can create tickets"
ON public.maintenance_tickets FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by AND is_family_member(auth.uid(), get_family_id_from_house(house_id)));

CREATE POLICY "Admins can update tickets"
ON public.maintenance_tickets FOR UPDATE TO authenticated
USING (is_family_admin(auth.uid(), get_family_id_from_house(house_id)));

DROP POLICY IF EXISTS "Family members can view votes" ON public.votes;
DROP POLICY IF EXISTS "Family members can create votes" ON public.votes;

CREATE POLICY "Family members can view votes"
ON public.votes FOR SELECT TO authenticated
USING (is_family_member(auth.uid(), get_family_id_from_house(house_id)));

CREATE POLICY "Family members can create votes"
ON public.votes FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by AND is_family_member(auth.uid(), get_family_id_from_house(house_id)));

DROP POLICY IF EXISTS "Family members can view responses" ON public.vote_responses;
DROP POLICY IF EXISTS "Members can vote" ON public.vote_responses;
DROP POLICY IF EXISTS "Members can update own vote" ON public.vote_responses;

CREATE POLICY "Family members can view responses"
ON public.vote_responses FOR SELECT TO authenticated
USING (is_family_member(auth.uid(), get_family_id_from_house(get_house_id_from_vote(vote_id))));

CREATE POLICY "Members can vote"
ON public.vote_responses FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND is_family_member(auth.uid(), get_family_id_from_house(get_house_id_from_vote(vote_id))));

CREATE POLICY "Members can update own vote"
ON public.vote_responses FOR UPDATE TO authenticated
USING (auth.uid() = user_id);
