-- Criar tabela para itens da venda
CREATE TABLE public.sale_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID NOT NULL,
  product_id UUID NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own sale items"
ON public.sale_items
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sale items"
ON public.sale_items
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sale items"
ON public.sale_items
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sale items"
ON public.sale_items
FOR DELETE
USING (auth.uid() = user_id);

-- Adicionar campo para identificar se uma venda é de múltiplos produtos
ALTER TABLE public.sales ADD COLUMN is_multi_product BOOLEAN DEFAULT false;
ALTER TABLE public.sales ADD COLUMN sale_group_id UUID;

-- Create trigger for updated_at
CREATE TRIGGER update_sale_items_updated_at
BEFORE UPDATE ON public.sale_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();