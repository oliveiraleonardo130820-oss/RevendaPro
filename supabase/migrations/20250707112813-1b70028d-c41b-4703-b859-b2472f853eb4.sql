
-- Atualizar a política RLS para permitir que donos vejam vendas dos funcionários
DROP POLICY IF EXISTS "Users can view their own sales" ON sales;

CREATE POLICY "Users can view their own sales or shop owners can view employee sales" 
  ON sales 
  FOR SELECT 
  USING (
    auth.uid() = user_id 
    OR 
    EXISTS (
      SELECT 1 
      FROM profiles 
      WHERE profiles.id = auth.uid() 
        AND profiles.tipo_usuario = 'dono' 
        AND (
          -- Vendas do próprio dono
          sales.user_id = profiles.id 
          OR 
          -- Vendas de funcionários da loja
          EXISTS (
            SELECT 1 
            FROM funcionarios 
            WHERE funcionarios.user_id = sales.user_id 
              AND funcionarios.loja_id = profiles.id
          )
        )
    )
  );
