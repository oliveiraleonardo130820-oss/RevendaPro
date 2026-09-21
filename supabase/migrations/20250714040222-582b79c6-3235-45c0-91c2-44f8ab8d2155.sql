-- Add new fields to clients table
ALTER TABLE public.clients 
ADD COLUMN rua text,
ADD COLUMN bairro text,
ADD COLUMN numero text,
ADD COLUMN cpf text;