-- Corrigir warning de segurança para função generate_next_sale_number
CREATE OR REPLACE FUNCTION public.generate_next_sale_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    next_number integer;
    formatted_number text;
BEGIN
    -- Buscar o maior número existente
    SELECT COALESCE(
        MAX(CAST(SUBSTRING(numero_venda FROM '#(\d+)') AS integer)), 
        0
    ) + 1 INTO next_number
    FROM public.sales 
    WHERE numero_venda IS NOT NULL;
    
    -- Formatar como #0001, #0002, etc
    formatted_number := '#' || LPAD(next_number::text, 4, '0');
    
    RETURN formatted_number;
END;
$$;