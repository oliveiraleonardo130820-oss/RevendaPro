-- Adicionar coluna ativo na tabela funcionarios
ALTER TABLE public.funcionarios 
ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true NOT NULL;

-- Atualizar todos os registros existentes para ativo = true
UPDATE public.funcionarios SET ativo = true WHERE ativo IS NULL;