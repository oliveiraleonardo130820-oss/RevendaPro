
-- Criar tabela para parcelas de venda
CREATE TABLE public.parcelas_venda (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venda_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  numero_da_parcela INTEGER NOT NULL,
  valor_da_parcela NUMERIC NOT NULL,
  data_de_vencimento DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar RLS (Row Level Security)
ALTER TABLE public.parcelas_venda ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para parcelas_venda
CREATE POLICY "Users can view their own installments" 
  ON public.parcelas_venda 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own installments" 
  ON public.parcelas_venda 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own installments" 
  ON public.parcelas_venda 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own installments" 
  ON public.parcelas_venda 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Criar índice para melhor performance
CREATE INDEX idx_parcelas_venda_venda_id ON public.parcelas_venda(venda_id);
CREATE INDEX idx_parcelas_venda_user_id ON public.parcelas_venda(user_id);
