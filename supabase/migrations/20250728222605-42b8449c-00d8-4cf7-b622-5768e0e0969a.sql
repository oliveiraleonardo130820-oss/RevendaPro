-- Adicionar campo desconto na tabela sales
ALTER TABLE public.sales 
ADD COLUMN desconto numeric DEFAULT 0;