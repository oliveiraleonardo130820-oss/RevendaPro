-- Correção de segurança: escalada de privilégio no cadastro
--
-- Problema: handle_new_user() lia plan, tipo_usuario e loja_id direto de
-- raw_user_meta_data, que é controlado pelo próprio cliente no signUp().
-- Qualquer pessoa podia se cadastrar como plano 'premium' ou como funcionário
-- de outra loja (e assim ler clientes/produtos dela).
--
-- Correção:
--  1) O plano de um novo usuário é sempre 'free' (upgrade só via webhook de pagamento).
--  2) Um novo usuário nunca nasce vinculado a uma loja. O vínculo é feito quando o
--     DONO insere a linha em public.funcionarios (protegida por RLS), via trigger.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  codigo_gerado TEXT;
  tipo TEXT;
BEGIN
  tipo := CASE
    WHEN NEW.raw_user_meta_data->>'tipo_usuario' = 'funcionario' THEN 'funcionario'
    ELSE 'dono'
  END;

  IF tipo = 'dono' THEN
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
    'free',
    NEW.raw_user_meta_data->>'telefone',
    NEW.raw_user_meta_data->>'cidade',
    NEW.raw_user_meta_data->>'bairro',
    NEW.raw_user_meta_data->>'rua',
    NEW.raw_user_meta_data->>'numero',
    NEW.raw_user_meta_data->>'nome_loja',
    NEW.raw_user_meta_data->>'ramo_atividade',
    tipo,
    NULL,
    true,
    codigo_gerado,
    NEW.raw_user_meta_data->>'convidado_por'
  );
  RETURN NEW;
END;
$$;

-- Vincula o funcionário à loja quando o dono cria o registro em funcionarios.
-- A RLS de funcionarios garante que só o dono da loja (loja_id = auth.uid()) insere.
CREATE OR REPLACE FUNCTION public.bind_funcionario_to_loja()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    UPDATE public.profiles
    SET loja_id = NEW.loja_id,
        updated_at = now()
    WHERE id = NEW.user_id
      AND tipo_usuario = 'funcionario'
      AND loja_id IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bind_funcionario_to_loja ON public.funcionarios;
CREATE TRIGGER trg_bind_funcionario_to_loja
AFTER INSERT ON public.funcionarios
FOR EACH ROW
EXECUTE FUNCTION public.bind_funcionario_to_loja();

-- O trigger de restrição de profiles precisa aceitar a atualização feita pelo trigger
-- acima (pg_trigger_depth() > 1). Um UPDATE direto do cliente tem profundidade 1.
CREATE OR REPLACE FUNCTION public.enforce_profiles_update_restrictions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  is_self boolean := (current_user_id IS NOT NULL AND current_user_id = NEW.id);
  is_owner_of_employee boolean := EXISTS (
    SELECT 1
    FROM public.funcionarios f
    JOIN public.profiles owner ON owner.id = current_user_id AND owner.tipo_usuario = 'dono'
    WHERE f.user_id = NEW.id AND f.loja_id = owner.id
  );
  target_is_employee boolean := (NEW.tipo_usuario = 'funcionario');
BEGIN
  -- Atualização feita por outro trigger do sistema (ex.: bind_funcionario_to_loja)
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  -- Service role / contextos administrativos (sem JWT => auth.uid() IS NULL)
  IF current_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Dono atualizando funcionário: só pode alterar "ativo"
  IF is_owner_of_employee AND target_is_employee AND current_user_id <> NEW.id THEN
    IF NEW.ativo IS DISTINCT FROM OLD.ativo THEN
      IF NEW.name IS DISTINCT FROM OLD.name OR
         NEW.email IS DISTINCT FROM OLD.email OR
         NEW.telefone IS DISTINCT FROM OLD.telefone OR
         NEW.cidade IS DISTINCT FROM OLD.cidade OR
         NEW.bairro IS DISTINCT FROM OLD.bairro OR
         NEW.rua IS DISTINCT FROM OLD.rua OR
         NEW.numero IS DISTINCT FROM OLD.numero OR
         NEW.nome_loja IS DISTINCT FROM OLD.nome_loja OR
         NEW.ramo_atividade IS DISTINCT FROM OLD.ramo_atividade OR
         NEW.plan IS DISTINCT FROM OLD.plan OR
         NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id OR
         NEW.tipo_usuario IS DISTINCT FROM OLD.tipo_usuario OR
         NEW.loja_id IS DISTINCT FROM OLD.loja_id OR
         NEW.data_assinatura IS DISTINCT FROM OLD.data_assinatura OR
         NEW.data_expiracao_assinatura IS DISTINCT FROM OLD.data_expiracao_assinatura OR
         NEW.codigo_convite IS DISTINCT FROM OLD.codigo_convite OR
         NEW.convidado_por IS DISTINCT FROM OLD.convidado_por
      THEN
        RAISE EXCEPTION 'Owners can only update the ativo status of employee profiles';
      END IF;
      RETURN NEW;
    ELSE
      IF ROW(NEW.*) IS DISTINCT FROM ROW(OLD.*) THEN
        RAISE EXCEPTION 'Owners can only update the ativo status of employee profiles';
      END IF;
      RETURN NEW;
    END IF;
  END IF;

  -- Usuário atualizando o próprio perfil: bloqueia campos sensíveis
  IF is_self THEN
    IF NEW.plan IS DISTINCT FROM OLD.plan
       OR NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id
       OR NEW.tipo_usuario IS DISTINCT FROM OLD.tipo_usuario
       OR NEW.loja_id IS DISTINCT FROM OLD.loja_id
       OR NEW.ativo IS DISTINCT FROM OLD.ativo
       OR NEW.data_assinatura IS DISTINCT FROM OLD.data_assinatura
       OR NEW.data_expiracao_assinatura IS DISTINCT FROM OLD.data_expiracao_assinatura
       OR NEW.codigo_convite IS DISTINCT FROM OLD.codigo_convite
       OR NEW.convidado_por IS DISTINCT FROM OLD.convidado_por THEN
      RAISE EXCEPTION 'You cannot modify restricted profile fields';
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

-- Funções internas: não precisam ser chamáveis via API por clientes.
-- (a edge function check-subscription-expiry usa a service role, que continua com acesso)
REVOKE EXECUTE ON FUNCTION public.check_expired_subscriptions() FROM PUBLIC, anon, authenticated;
