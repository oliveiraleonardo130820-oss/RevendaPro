
-- Adicionar campo de juros na tabela sales
ALTER TABLE public.sales 
ADD COLUMN juros_parcelamento NUMERIC DEFAULT 0;
