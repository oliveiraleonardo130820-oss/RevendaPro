
-- Alterar a coluna client_id para permitir valores nulos
ALTER TABLE public.sales ALTER COLUMN client_id DROP NOT NULL;

-- Atualizar a política de RLS para permitir vendas sem cliente
DROP POLICY IF EXISTS "Users can insert their own sales" ON public.sales;

CREATE POLICY "Users can insert their own sales" 
  ON public.sales 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own sales" ON public.sales;

CREATE POLICY "Users can view their own sales" 
  ON public.sales 
  FOR SELECT 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own sales" ON public.sales;

CREATE POLICY "Users can update their own sales" 
  ON public.sales 
  FOR UPDATE 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own sales" ON public.sales;

CREATE POLICY "Users can delete their own sales" 
  ON public.sales 
  FOR DELETE 
  USING (auth.uid() = user_id);
