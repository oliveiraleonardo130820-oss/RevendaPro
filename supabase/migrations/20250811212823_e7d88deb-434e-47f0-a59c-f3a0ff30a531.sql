-- Strengthen profiles table security without breaking existing flows
-- 1) Remove risky INSERT policy (profiles are created by trigger on auth.users)
DROP POLICY IF EXISTS "Donos podem inserir funcionários" ON public.profiles;

-- 2) Keep existing SELECT policy (self only) and UPDATE (self) as-is
--    Keep owner UPDATE policy but enforce allowed columns via trigger

-- 3) Create a trigger function to restrict which columns can be changed
--    - Users updating their own profile cannot change sensitive fields
--    - Shop owners updating employees can only toggle "ativo"
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
  -- Allow service role / admin contexts (no JWT => auth.uid() IS NULL)
  IF current_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Owner updating employee: only allow changing "ativo"
  IF is_owner_of_employee AND target_is_employee AND current_user_id <> NEW.id THEN
    IF NEW.ativo IS DISTINCT FROM OLD.ativo THEN
      -- ensure no other fields changed
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
      -- ativo not changed but something else attempted
      IF ROW(NEW.*) IS DISTINCT FROM ROW(OLD.*) THEN
        RAISE EXCEPTION 'Owners can only update the ativo status of employee profiles';
      END IF;
      RETURN NEW;
    END IF;
  END IF;

  -- User updating own profile: block sensitive fields from being changed
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

  -- Other cases rely on RLS policies; do not block here
  RETURN NEW;
END;
$$;

-- 4) Attach trigger to profiles table
DROP TRIGGER IF EXISTS trg_enforce_profiles_update_restrictions ON public.profiles;
CREATE TRIGGER trg_enforce_profiles_update_restrictions
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_profiles_update_restrictions();
