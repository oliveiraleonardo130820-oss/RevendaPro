-- Adicionar campo ativo na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN ativo boolean NOT NULL DEFAULT true;

-- Atualizar a função handle_new_user para definir ativo = true por padrão
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
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
    loja_id,
    ativo
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
    (NEW.raw_user_meta_data->>'loja_id')::UUID,
    true
  );
  RETURN NEW;
END;
$$;