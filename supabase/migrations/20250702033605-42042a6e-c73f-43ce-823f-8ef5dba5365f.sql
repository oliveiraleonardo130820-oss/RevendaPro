
-- Adicionar novos campos à tabela sales
ALTER TABLE public.sales 
ADD COLUMN payment_method TEXT,
ADD COLUMN due_date DATE;

-- Atualizar vendas existentes com valores padrão
UPDATE public.sales 
SET payment_method = 'À vista' 
WHERE payment_method IS NULL;
