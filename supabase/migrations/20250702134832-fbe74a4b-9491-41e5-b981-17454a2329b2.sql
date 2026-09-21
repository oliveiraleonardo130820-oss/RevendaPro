
-- Alterar o campo due_date da tabela sales para text
ALTER TABLE public.sales 
ALTER COLUMN due_date TYPE text;

-- Alterar o campo data_de_vencimento da tabela parcelas_venda para text
ALTER TABLE public.parcelas_venda 
ALTER COLUMN data_de_vencimento TYPE text;
