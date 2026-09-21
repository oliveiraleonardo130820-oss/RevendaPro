
-- Adicionar colunas na tabela profiles para suportar o sistema de funcionários
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS tipo_usuario TEXT DEFAULT 'dono',
ADD COLUMN IF NOT EXISTS dono_id UUID REFERENCES public.profiles(id);

-- Criar tabela para funcionários se não existir
CREATE TABLE IF NOT EXISTS public.funcionarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  dono_id UUID NOT NULL REFERENCES public.profiles(id),
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS na tabela funcionários
ALTER TABLE public.funcionarios ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para funcionários - apenas donos podem gerenciar
CREATE POLICY IF NOT EXISTS "Donos podem ver funcionários de sua loja" 
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

CREATE POLICY IF NOT EXISTS "Donos podem criar funcionários" 
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

CREATE POLICY IF NOT EXISTS "Donos podem atualizar funcionários" 
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

CREATE POLICY IF NOT EXISTS "Donos podem deletar funcionários" 
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

-- Atualizar a função handle_new_user para suportar o campo tipo_usuario
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
    dono_id
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
