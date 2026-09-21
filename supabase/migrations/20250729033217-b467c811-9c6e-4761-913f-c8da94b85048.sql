-- Add data_pagamento column to parcelas_venda table
ALTER TABLE public.parcelas_venda 
ADD COLUMN data_pagamento date;