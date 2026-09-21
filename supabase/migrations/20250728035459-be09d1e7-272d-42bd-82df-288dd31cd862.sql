-- Adicionar campo produto_id na tabela crediario_vendas
ALTER TABLE public.crediario_vendas 
ADD COLUMN produto_id UUID REFERENCES public.products(id);