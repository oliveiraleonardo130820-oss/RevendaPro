-- Add data_valor_pago column to parcelas_crediario table
ALTER TABLE public.parcelas_crediario 
ADD COLUMN data_valor_pago DATE;