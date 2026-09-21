-- Adicionar campo de desconto na tabela crediario_vendas
ALTER TABLE public.crediario_vendas 
ADD COLUMN desconto numeric DEFAULT 0;