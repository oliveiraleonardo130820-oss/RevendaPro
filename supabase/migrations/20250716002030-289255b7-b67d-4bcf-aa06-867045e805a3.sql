-- Recriar trigger handle_new_user para garantir que funcione corretamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recriar a função handle_new_user com melhor tratamento de erros
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  codigo_gerado TEXT;
BEGIN
  -- Gerar código de convite apenas para donos
  IF COALESCE(NEW.raw_user_meta_data->>'tipo_usuario', 'dono') = 'dono' THEN
    codigo_gerado := public.generate_referral_code(COALESCE(NEW.raw_user_meta_data->>'name', NEW.email));
  ELSE
    codigo_gerado := NULL;
  END IF;

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
    ativo,
    codigo_convite,
    convidado_por
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
    true,
    codigo_gerado,
    NEW.raw_user_meta_data->>'convidado_por'
  );
  RETURN NEW;
END;
$$;

-- Recriar o trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();