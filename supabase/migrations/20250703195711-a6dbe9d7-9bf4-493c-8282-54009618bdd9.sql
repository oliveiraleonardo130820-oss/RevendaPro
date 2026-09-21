
-- Adicionar o campo ramo_atividade à tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS ramo_atividade TEXT;

-- Atualizar a função handle_new_user para incluir o novo campo
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
    nome_loja,
    ramo_atividade
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
    NEW.raw_user_meta_data->>'nome_loja',
    NEW.raw_user_meta_data->>'ramo_atividade'
  );
  RETURN NEW;
END;
$function$;
