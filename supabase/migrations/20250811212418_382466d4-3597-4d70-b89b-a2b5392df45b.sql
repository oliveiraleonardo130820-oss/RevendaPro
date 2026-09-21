-- Harden RLS policies on subscribers to prevent unauthorized access via email matching
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

-- Remove permissive policies
DROP POLICY IF EXISTS "select_own_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "update_own_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "insert_subscription" ON public.subscribers;

-- Restrictive SELECT: only the authenticated user may read their own row
CREATE POLICY "Users can view their own subscription"
ON public.subscribers
FOR SELECT
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Intentionally no INSERT/UPDATE policies so regular clients cannot write.
-- Edge functions should use the service role key which bypasses RLS for secure writes.
