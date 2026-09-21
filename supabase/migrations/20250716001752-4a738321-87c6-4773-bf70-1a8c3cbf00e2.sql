-- Criar a função generate_referral_code se não existir
CREATE OR REPLACE FUNCTION public.generate_referral_code(user_name text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    code TEXT;
    exists_check INTEGER;
BEGIN
    LOOP
        -- Gerar código baseado no nome (primeiras 3 letras) + 6 caracteres aleatórios
        code := 'rev-' || UPPER(LEFT(REGEXP_REPLACE(user_name, '[^a-zA-Z]', '', 'g'), 3)) || 
                UPPER(substring(md5(random()::text), 1, 6));
        
        -- Verificar se o código já existe
        SELECT COUNT(*) INTO exists_check 
        FROM public.profiles 
        WHERE codigo_convite = code;
        
        -- Se não existe, sair do loop
        IF exists_check = 0 THEN
            EXIT;
        END IF;
    END LOOP;
    
    RETURN code;
END;
$$;