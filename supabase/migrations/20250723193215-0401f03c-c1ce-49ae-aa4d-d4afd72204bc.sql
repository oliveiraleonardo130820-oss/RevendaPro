-- Atualizar status do usuário para Premium
UPDATE public.subscribers 
SET 
  subscribed = true,
  subscription_tier = 'Premium',
  subscription_end = '2025-12-31 23:59:59'::timestamptz,
  updated_at = now()
WHERE email = 'teste@gmail.com';