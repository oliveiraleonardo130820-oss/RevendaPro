import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toLocalISODate } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  unit_price: number;
  commission: number;
  estoque: number;
}

interface Client {
  id: string;
  name: string;
  phone: string;
}

export default function LojaNovaVenda() {
  const { id: lojaId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [paymentMethod, setPaymentMethod] = useState<string>('dinheiro');
  const [installments, setInstallments] = useState<number>(2);
  const [interestRate, setInterestRate] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchClients();
  }, [lojaId]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('loja_id', lojaId)
        .order('name');
      
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
    }
  };

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('loja_id', lojaId)
        .order('name');
      
      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProduct) {
      toast({
        title: "Erro",
        description: "Selecione um produto",
        variant: "destructive"
      });
      return;
    }

    const product = products.find(p => p.id === selectedProduct);
    if (!product) return;

    if (quantity > product.estoque) {
      toast({
        title: "Erro",
        description: "Quantidade indisponível em estoque",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const totalValue = product.unit_price * quantity;
      
      const finalTotalValue = paymentMethod === 'parcelado' 
        ? totalValue * (1 + (interestRate / 100))
        : totalValue;

      // Gerar número da venda
      const { data: numeroVenda } = await supabase.rpc('generate_next_sale_number', { p_user_id: user.id });
      if (!numeroVenda) {
        toast({
          title: "Erro",
          description: "Erro ao gerar número da venda",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase.from('sales').insert([{
        user_id: user?.id,
        loja_id: lojaId,
        product_id: selectedProduct,
        client_id: selectedClient || null,
        quantity,
        unit_price: product.unit_price,
        total_value: finalTotalValue,
        commission: product.commission,
        payment_method: paymentMethod === 'parcelado' ? `${installments}x` : paymentMethod,
        juros_parcelamento: paymentMethod === 'parcelado' ? interestRate : 0,
        sale_date: toLocalISODate(),
        numero_venda: numeroVenda
      }]);

      if (error) throw error;

      // Atualizar estoque
      await supabase
        .from('products')
        .update({ estoque: product.estoque - quantity })
        .eq('id', selectedProduct);

      toast({
        title: "Sucesso",
        description: "Venda registrada com sucesso!"
      });

      // Reset form
      setSelectedProduct('');
      setSelectedClient('');
      setQuantity(1);
      setPaymentMethod('dinheiro');
      setInstallments(2);
      setInterestRate(0);
      fetchProducts(); // Refresh products to update stock
    } catch (error) {
      console.error('Erro ao registrar venda:', error);
      toast({
        title: "Erro",
        description: "Não foi possível registrar a venda",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedProductData = products.find(p => p.id === selectedProduct);
  const totalValue = selectedProductData ? selectedProductData.unit_price * quantity : 0;
  const finalTotalValue = paymentMethod === 'parcelado' 
    ? totalValue * (1 + (interestRate / 100))
    : totalValue;
  const installmentValue = paymentMethod === 'parcelado' ? finalTotalValue / installments : 0;

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={() => navigate(`/lojas/${lojaId}`)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ShoppingCart className="w-8 h-8" />
            Nova Venda
          </h1>
          <p className="text-muted-foreground">Registrar uma nova venda</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados da Venda</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="produto">Produto *</Label>
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map(product => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} - R$ {product.unit_price.toFixed(2)} (Estoque: {product.estoque})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cliente">Cliente</Label>
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name} - {client.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantidade">Quantidade *</Label>
                <Input
                  id="quantidade"
                  type="number"
                  min="1"
                  max={selectedProductData?.estoque || 1}
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  required
                />
                {selectedProductData && (
                  <p className="text-sm text-muted-foreground">
                    Estoque disponível: {selectedProductData.estoque}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="pagamento">Forma de Pagamento *</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                    <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="parcelado">Parcelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {paymentMethod === 'parcelado' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="parcelas">Número de Parcelas *</Label>
                  <Select value={installments.toString()} onValueChange={(value) => setInstallments(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 11 }, (_, i) => i + 2).map(num => (
                        <SelectItem key={num} value={num.toString()}>
                          {num}x
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="juros">Taxa de Juros (%)</Label>
                  <Input
                    id="juros"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={interestRate}
                    onChange={(e) => setInterestRate(parseFloat(e.target.value) || 0)}
                    placeholder="0.0"
                  />
                </div>
              </div>
            )}

            {selectedProductData && (
              <div className="bg-muted p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Resumo da Venda</h3>
                <div className="space-y-1 text-sm">
                  <p>Produto: {selectedProductData.name}</p>
                  <p>Preço unitário: R$ {selectedProductData.unit_price.toFixed(2)}</p>
                  <p>Quantidade: {quantity}</p>
                  {paymentMethod === 'parcelado' && (
                    <>
                      <p>Subtotal: R$ {totalValue.toFixed(2)}</p>
                      <p>Taxa de juros: {interestRate}%</p>
                      <p>Número de parcelas: {installments}x</p>
                      <p>Valor da parcela: R$ {installmentValue.toFixed(2)}</p>
                    </>
                  )}
                  <p className="font-semibold text-lg">
                    Total: R$ {(paymentMethod === 'parcelado' ? finalTotalValue : totalValue).toFixed(2)}
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <Button type="submit" disabled={loading || !selectedProduct}>
                {loading ? 'Registrando...' : 'Registrar Venda'}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => navigate(`/lojas/${lojaId}`)}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}