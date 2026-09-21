
-- Adicionar novos campos à tabela profiles para armazenar informações completas do usuário
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS telefone TEXT,
ADD COLUMN IF NOT EXISTS cidade TEXT,
ADD COLUMN IF NOT EXISTS bairro TEXT,
ADD COLUMN IF NOT EXISTS rua TEXT,
ADD COLUMN IF NOT EXISTS numero TEXT,
ADD COLUMN IF NOT EXISTS nome_loja TEXT;

-- Atualizar a função handle_new_user para incluir os novos campos
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
    nome_loja
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email,
    'free',
    NEW.raw_user_meta_data->>'telefone',
    NEW.raw_user_meta_data->>'cidade',
    NEW.raw_user_meta_data->>'bairro',
    NEW.raw_user_meta_data->>'rua',
    NEW.raw_user_meta_data->>'numero',
    NEW.raw_user_meta_data->>'nome_loja'
  );
  RETURN NEW;
END;
$function$;
