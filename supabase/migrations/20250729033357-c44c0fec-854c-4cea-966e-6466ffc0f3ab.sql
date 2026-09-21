-- Add data_pagamento column to parcelas_crediario table
ALTER TABLE public.parcelas_crediario 
ADD COLUMN data_pagamento date;