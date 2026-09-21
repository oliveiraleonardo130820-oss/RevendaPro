-- Criar função para sincronizar status ativo entre profiles e funcionarios
CREATE OR REPLACE FUNCTION public.sync_funcionario_ativo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  -- Verificar se é um funcionário e se o campo ativo foi alterado
  IF NEW.tipo_usuario = 'funcionario' AND OLD.ativo IS DISTINCT FROM NEW.ativo THEN
    -- Atualizar a tabela funcionarios
    UPDATE public.funcionarios 
    SET ativo = NEW.ativo,
        updated_at = now()
    WHERE user_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para executar a função quando profiles for atualizado
CREATE TRIGGER sync_funcionario_ativo_trigger
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_funcionario_ativo();