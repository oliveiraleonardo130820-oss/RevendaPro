
-- Adicionar campo stripe_customer_id na tabela profiles
ALTER TABLE public.profiles ADD COLUMN stripe_customer_id TEXT;

-- Criar índice para melhor performance nas consultas
CREATE INDEX idx_profiles_stripe_customer_id ON public.profiles(stripe_customer_id);
