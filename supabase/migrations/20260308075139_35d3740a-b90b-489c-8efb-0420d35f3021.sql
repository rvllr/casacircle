
-- Fix: restrict insert to only allow system/trigger inserts via security definer
DROP POLICY "System can insert notifications" ON public.notifications;

-- Only allow insert where user_id matches auth.uid (for self-notifications) or via security definer functions
CREATE POLICY "Insert own notifications"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);
