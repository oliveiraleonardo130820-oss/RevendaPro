
-- Corrigir as políticas RLS para usar loja_id em vez de dono_id
DROP POLICY IF EXISTS "Donos podem ver funcionários de sua loja" ON public.funcionarios;
DROP POLICY IF EXISTS "Donos podem criar funcionários" ON public.funcionarios;
DROP POLICY IF EXISTS "Donos podem atualizar funcionários de sua loja" ON public.funcionarios;
DROP POLICY IF EXISTS "Donos podem deletar funcionários de sua loja" ON public.funcionarios;

-- Recriar as políticas com o campo correto (loja_id)
CREATE POLICY "Donos podem ver funcionários de sua loja" 
  ON public.funcionarios 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.tipo_usuario = 'dono'
      AND profiles.id = funcionarios.loja_id
    )
  );

CREATE POLICY "Donos podem criar funcionários" 
  ON public.funcionarios 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.tipo_usuario = 'dono'
      AND profiles.id = funcionarios.loja_id
    )
  );

CREATE POLICY "Donos podem atualizar funcionários de sua loja" 
  ON public.funcionarios 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.tipo_usuario = 'dono'
      AND profiles.id = funcionarios.loja_id
    )
  );

CREATE POLICY "Donos podem deletar funcionários de sua loja" 
  ON public.funcionarios 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.tipo_usuario = 'dono'
      AND profiles.id = funcionarios.loja_id
    )
  );
