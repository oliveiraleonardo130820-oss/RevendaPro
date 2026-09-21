
-- Corrigir a tabela funcionarios para usar dono_id em vez de loja_id
ALTER TABLE public.funcionarios 
ADD COLUMN IF NOT EXISTS dono_id UUID REFERENCES public.profiles(id);

-- Copiar dados de loja_id para dono_id se houver dados existentes
UPDATE public.funcionarios 
SET dono_id = loja_id 
WHERE dono_id IS NULL AND loja_id IS NOT NULL;

-- Remover a coluna loja_id após migrar os dados
ALTER TABLE public.funcionarios 
DROP COLUMN IF EXISTS loja_id;

-- Recriar as políticas RLS para usar dono_id
DROP POLICY IF EXISTS "Donos podem ver funcionários de sua loja" ON public.funcionarios;
DROP POLICY IF EXISTS "Donos podem criar funcionários" ON public.funcionarios;
DROP POLICY IF EXISTS "Donos podem atualizar funcionários de sua loja" ON public.funcionarios;
DROP POLICY IF EXISTS "Donos podem deletar funcionários de sua loja" ON public.funcionarios;

CREATE POLICY "Donos podem ver funcionários de sua loja" 
  ON public.funcionarios 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.tipo_usuario = 'dono'
      AND profiles.id = funcionarios.dono_id
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
      AND profiles.id = funcionarios.dono_id
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
      AND profiles.id = funcionarios.dono_id
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
      AND profiles.id = funcionarios.dono_id
    )
  );

-- Atualizar a função handle_new_user para usar dono_id em vez de loja_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    name, 
    email, 
    plan,
    telefone,
    cidade,
    bairro,
    rua,
    numero,
    nome_loja,
    ramo_atividade,
    tipo_usuario,
    loja_id
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'plan', 'free'),
    NEW.raw_user_meta_data->>'telefone',
    NEW.raw_user_meta_data->>'cidade',
    NEW.raw_user_meta_data->>'bairro',
    NEW.raw_user_meta_data->>'rua',
    NEW.raw_user_meta_data->>'numero',
    NEW.raw_user_meta_data->>'nome_loja',
    NEW.raw_user_meta_data->>'ramo_atividade',
    COALESCE(NEW.raw_user_meta_data->>'tipo_usuario', 'dono'),
    (NEW.raw_user_meta_data->>'dono_id')::UUID
  );
  RETURN NEW;
END;
$$;
