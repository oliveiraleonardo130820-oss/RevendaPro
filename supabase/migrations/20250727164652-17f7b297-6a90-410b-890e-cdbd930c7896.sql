-- Adicionar campo valor_pago na tabela parcelas_venda
ALTER TABLE public.parcelas_venda 
ADD COLUMN valor_pago NUMERIC DEFAULT 0;