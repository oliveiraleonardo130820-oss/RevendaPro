-- Criar tabela para vendas no crediário
CREATE TABLE public.crediario_vendas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID REFERENCES public.clients(id),
  valor_total NUMERIC NOT NULL,
  valor_entrada NUMERIC NOT NULL DEFAULT 0,
  valor_restante NUMERIC NOT NULL,
  numero_parcelas INTEGER NOT NULL,
  dia_vencimento INTEGER NOT NULL CHECK (dia_vencimento >= 1 AND dia_vencimento <= 31),
  data_venda DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'ativo',
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para parcelas do crediário
CREATE TABLE public.parcelas_crediario (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  crediario_venda_id UUID NOT NULL REFERENCES public.crediario_vendas(id) ON DELETE CASCADE,
  numero_parcela INTEGER NOT NULL,
  valor_parcela NUMERIC NOT NULL,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'vencido')),
  tipo TEXT NOT NULL DEFAULT 'parcela' CHECK (tipo IN ('entrada', 'parcela')),
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS nas tabelas
ALTER TABLE public.crediario_vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parcelas_crediario ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para crediario_vendas
CREATE POLICY "Users can view their own crediario sales" 
ON public.crediario_vendas 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own crediario sales" 
ON public.crediario_vendas 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own crediario sales" 
ON public.crediario_vendas 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own crediario sales" 
ON public.crediario_vendas 
FOR DELETE 
USING (auth.uid() = user_id);

-- Políticas RLS para parcelas_crediario
CREATE POLICY "Users can view their own crediario installments" 
ON public.parcelas_crediario 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own crediario installments" 
ON public.parcelas_crediario 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own crediario installments" 
ON public.parcelas_crediario 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own crediario installments" 
ON public.parcelas_crediario 
FOR DELETE 
USING (auth.uid() = user_id);

-- Criar índices para melhor performance
CREATE INDEX idx_crediario_vendas_user_id ON public.crediario_vendas(user_id);
CREATE INDEX idx_crediario_vendas_client_id ON public.crediario_vendas(client_id);
CREATE INDEX idx_crediario_vendas_data_venda ON public.crediario_vendas(data_venda);

CREATE INDEX idx_parcelas_crediario_user_id ON public.parcelas_crediario(user_id);
CREATE INDEX idx_parcelas_crediario_venda_id ON public.parcelas_crediario(crediario_venda_id);
CREATE INDEX idx_parcelas_crediario_vencimento ON public.parcelas_crediario(data_vencimento);
CREATE INDEX idx_parcelas_crediario_status ON public.parcelas_crediario(status);

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language plpgsql;

-- Triggers para atualizar updated_at
CREATE TRIGGER update_crediario_vendas_updated_at 
BEFORE UPDATE ON public.crediario_vendas 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parcelas_crediario_updated_at 
BEFORE UPDATE ON public.parcelas_crediario 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();