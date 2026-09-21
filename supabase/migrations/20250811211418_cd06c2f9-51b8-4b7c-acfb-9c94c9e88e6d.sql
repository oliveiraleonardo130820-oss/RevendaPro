-- Tighten RLS on clients to minimize exposure of PII while preserving functionality
-- Ensure RLS is enabled
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Drop overly permissive SELECT policy allowing employees to view all shop clients
DROP POLICY IF EXISTS "Users can view their own clients or employees can view shop cli" ON public.clients;

-- Keep existing INSERT/UPDATE/DELETE policies (unchanged)

-- 1) Users can view their own clients (covers owners and employees for rows they created)
CREATE POLICY "Users can select their own clients"
ON public.clients
FOR SELECT
USING (auth.uid() = user_id);

-- 2) Shop owners can view all clients of their shop (rows created by themselves or any employee linked to their shop)
CREATE POLICY "Owners can select all shop clients"
ON public.clients
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles owner
    WHERE owner.id = auth.uid()
      AND owner.tipo_usuario = 'dono'
      AND (
        clients.user_id = owner.id
        OR EXISTS (
          SELECT 1
          FROM public.funcionarios f
          WHERE f.user_id = clients.user_id
            AND f.loja_id = owner.id
        )
      )
  )
);
