-- Adicionar campo valor_pago na tabela parcelas_crediario
ALTER TABLE public.parcelas_crediario 
ADD COLUMN valor_pago NUMERIC DEFAULT 0;