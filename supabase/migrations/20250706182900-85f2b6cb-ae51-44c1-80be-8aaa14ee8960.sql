
-- Atualizar políticas RLS para permitir que funcionários vejam clientes da loja onde trabalham
DROP POLICY IF EXISTS "Users can view their own clients" ON public.clients;
CREATE POLICY "Users can view their own clients or employees can view shop clients" 
  ON public.clients 
  FOR SELECT 
  USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.tipo_usuario = 'funcionario' 
      AND profiles.loja_id = clients.user_id
    )
  );

-- Atualizar políticas RLS para permitir que funcionários vejam produtos da loja onde trabalham
DROP POLICY IF EXISTS "Users can view their own products" ON public.products;
CREATE POLICY "Users can view their own products or employees can view shop products" 
  ON public.products 
  FOR SELECT 
  USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.tipo_usuario = 'funcionario' 
      AND profiles.loja_id = products.user_id
    )
  );
