-- Update the function to start each user from #0001
CREATE OR REPLACE FUNCTION public.generate_next_sale_number(p_user_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    next_number integer;
    formatted_number text;
BEGIN
    -- Buscar o maior número existente APENAS para o usuário específico
    SELECT COALESCE(
        MAX(CAST(SUBSTRING(numero_venda FROM '#(\d+)') AS integer)), 
        0
    ) + 1 INTO next_number
    FROM public.sales 
    WHERE numero_venda IS NOT NULL AND user_id = p_user_id;
    
    -- Formatar como #0001, #0002, etc
    formatted_number := '#' || LPAD(next_number::text, 4, '0');
    
    RETURN formatted_number;
END;
$function$;