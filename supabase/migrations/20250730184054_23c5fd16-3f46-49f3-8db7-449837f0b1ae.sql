-- Adicionar campo data_expiracao_assinatura na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN data_expiracao_assinatura DATE;

-- Criar função para verificar e atualizar assinaturas expiradas
CREATE OR REPLACE FUNCTION public.check_expired_subscriptions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Atualizar planos expirados para 'grátis'
  UPDATE public.profiles 
  SET plan = 'free',
      updated_at = now()
  WHERE data_expiracao_assinatura IS NOT NULL 
    AND data_expiracao_assinatura <= CURRENT_DATE 
    AND plan != 'free';
    
  -- Log para debug
  RAISE NOTICE 'Verificação de assinaturas expiradas executada em %', now();
END;
$function$;