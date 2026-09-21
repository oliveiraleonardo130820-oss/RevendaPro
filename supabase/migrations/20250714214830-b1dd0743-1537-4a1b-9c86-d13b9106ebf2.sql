-- Criar tabela lojas
CREATE TABLE public.lojas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  cidade TEXT,
  bairro TEXT,
  rua TEXT,
  numero TEXT,
  plano TEXT NOT NULL DEFAULT 'gratuito',
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lojas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para lojas
CREATE POLICY "Donos podem ver suas lojas" 
ON public.lojas 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Donos podem criar lojas" 
ON public.lojas 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Donos podem atualizar suas lojas" 
ON public.lojas 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Donos podem deletar suas lojas" 
ON public.lojas 
FOR DELETE 
USING (auth.uid() = user_id);

-- Adicionar loja_id nas tabelas existentes que ainda não têm
ALTER TABLE public.despesas ADD COLUMN loja_id UUID;
ALTER TABLE public.sales ADD COLUMN loja_id UUID;
ALTER TABLE public.products ADD COLUMN loja_id UUID;
ALTER TABLE public.clients ADD COLUMN loja_id UUID;
ALTER TABLE public.crediario_vendas ADD COLUMN loja_id UUID;
ALTER TABLE public.parcelas_crediario ADD COLUMN loja_id UUID;
ALTER TABLE public.parcelas_venda ADD COLUMN loja_id UUID;
ALTER TABLE public.monthly_goals ADD COLUMN loja_id UUID;

-- Criar trigger para updated_at na tabela lojas
CREATE TRIGGER update_lojas_updated_at
BEFORE UPDATE ON public.lojas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();