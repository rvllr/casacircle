
-- House history events for intergenerational timeline
CREATE TABLE public.house_history_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id uuid NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  title text NOT NULL,
  description text,
  event_date date NOT NULL,
  event_type text NOT NULL DEFAULT 'other',
  photo_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.house_history_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view history events" ON public.house_history_events
  FOR SELECT TO authenticated
  USING (is_house_member(auth.uid(), house_id));

CREATE POLICY "Active members can create events" ON public.house_history_events
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by AND is_house_active_member(auth.uid(), house_id));

CREATE POLICY "Creator can update events" ON public.house_history_events
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Creator or admin can delete events" ON public.house_history_events
  FOR DELETE TO authenticated
  USING (auth.uid() = created_by OR is_house_admin(auth.uid(), house_id));

-- Family tree nodes
CREATE TABLE public.family_tree_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  user_id uuid,
  parent_node_id uuid REFERENCES public.family_tree_nodes(id) ON DELETE SET NULL,
  name text NOT NULL,
  birth_year integer,
  death_year integer,
  photo_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.family_tree_nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view tree" ON public.family_tree_nodes
  FOR SELECT TO authenticated
  USING (is_family_member(auth.uid(), family_id));

CREATE POLICY "Family admins can create nodes" ON public.family_tree_nodes
  FOR INSERT TO authenticated
  WITH CHECK (is_family_admin(auth.uid(), family_id));

CREATE POLICY "Family admins can update nodes" ON public.family_tree_nodes
  FOR UPDATE TO authenticated
  USING (is_family_admin(auth.uid(), family_id));

CREATE POLICY "Family admins can delete nodes" ON public.family_tree_nodes
  FOR DELETE TO authenticated
  USING (is_family_admin(auth.uid(), family_id));
