-- Adicionar coluna produtos para suportar múltiplos produtos nas vendas do crediário
ALTER TABLE public.crediario_vendas 
ADD COLUMN produtos JSONB DEFAULT '[]'::jsonb;