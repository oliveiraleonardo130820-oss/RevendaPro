-- Adicionar coluna de estoque na tabela products
ALTER TABLE public.products 
ADD COLUMN estoque integer NOT NULL DEFAULT 0;