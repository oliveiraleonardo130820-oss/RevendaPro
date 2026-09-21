-- Adicionar campo numero_venda à tabela sales
ALTER TABLE public.sales ADD COLUMN numero_venda text;

-- Adicionar campo numero_venda às tabelas relacionadas
ALTER TABLE public.parcelas_venda ADD COLUMN numero_venda text;
ALTER TABLE public.sale_items ADD COLUMN numero_venda text;

-- Criar função para gerar próximo número de venda
CREATE OR REPLACE FUNCTION public.generate_next_sale_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Atualizar vendas existentes com números sequenciais
DO $$
DECLARE
    sale_record RECORD;
    counter integer := 1;
    sale_number text;
BEGIN
    FOR sale_record IN 
        SELECT id, sale_group_id FROM public.sales 
        WHERE numero_venda IS NULL 
        ORDER BY created_at ASC
    LOOP
        sale_number := '#' || LPAD(counter::text, 4, '0');
        
        -- Atualizar todas as vendas do mesmo grupo
        UPDATE public.sales 
        SET numero_venda = sale_number 
        WHERE (sale_group_id IS NOT NULL AND sale_group_id = sale_record.sale_group_id)
           OR (sale_group_id IS NULL AND id = sale_record.id);
           
        -- Atualizar parcelas relacionadas
        UPDATE public.parcelas_venda 
        SET numero_venda = sale_number 
        WHERE venda_id IN (
            SELECT id FROM public.sales 
            WHERE (sale_group_id IS NOT NULL AND sale_group_id = sale_record.sale_group_id)
               OR (sale_group_id IS NULL AND id = sale_record.id)
        );
        
        -- Atualizar itens relacionados
        UPDATE public.sale_items 
        SET numero_venda = sale_number 
        WHERE sale_id IN (
            SELECT id FROM public.sales 
            WHERE (sale_group_id IS NOT NULL AND sale_group_id = sale_record.sale_group_id)
               OR (sale_group_id IS NULL AND id = sale_record.id)
        );
        
        -- Incrementar apenas se processamos um grupo novo
        IF sale_record.sale_group_id IS NULL OR 
           NOT EXISTS (
               SELECT 1 FROM public.sales 
               WHERE sale_group_id = sale_record.sale_group_id 
               AND numero_venda IS NOT NULL 
               AND id != sale_record.id
           ) THEN
            counter := counter + 1;
        END IF;
    END LOOP;
END;
$$;