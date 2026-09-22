import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, UserIcon, CreditCardIcon, Calculator } from 'lucide-react';
import { useCrediario } from '@/contexts/CrediarioContext';
import { useData } from '@/contexts/DataContext';
import ClientSearchModal from '@/components/ClientSearchModal';
import ProductSearchModal from '@/components/ProductSearchModal';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseLocalDate, dateWithDayClamped } from '@/lib/utils';

export default function NovaVendaCrediario() {
  const navigate = useNavigate();
  const { criarVendaCrediario, loading } = useCrediario();
  const { clients, products } = useData();
  
  const [showClientModal, setShowClientModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [selectedProducts, setSelectedProducts] = useState<Array<{id: string, quantity: number}>>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  
  const [formData, setFormData] = useState({
    valor_total: '',
    valor_entrada: '',
    desconto: '',
    numero_parcelas: '1',
    dia_vencimento: '10',
    data_venda: format(new Date(), 'yyyy-MM-dd'),
    observacoes: ''
  });

  // Auto-calculate valor_total when products change
  useEffect(() => {
    if (selectedProducts.length > 0 && products) {
      let total = 0;
      selectedProducts.forEach(produto => {
        const selectedProduct = products.find(p => p.id === produto.id);
        if (selectedProduct) {
          total += selectedProduct.unit_price * produto.quantity;
        }
      });
      setFormData(prev => ({ ...prev, valor_total: total.toString() }));
    }
  }, [selectedProducts, products]);

  const valorTotal = parseFloat(formData.valor_total) || 0;
  const desconto = parseFloat(formData.desconto) || 0;
  const valorFinal = valorTotal - desconto;
  const valorEntrada = parseFloat(formData.valor_entrada) || 0;
  const valorRestante = valorFinal - valorEntrada;
  const numeroParcelas = parseInt(formData.numero_parcelas) || 1;
  const valorParcela = valorRestante / numeroParcelas;

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSelectClient = (client: any) => {
    setSelectedClient(client);
    setShowClientModal(false);
  };

  const handleSelectProduct = (product: any) => {
    const existingProduct = selectedProducts.find(p => p.id === product.id);
    if (existingProduct) {
      setSelectedProducts(prev => prev.map(p => 
        p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p
      ));
    } else {
      setSelectedProducts(prev => [...prev, { id: product.id, quantity: 1 }]);
    }
    setSelectedProductId('');
    setShowProductModal(false);
  };

  const addProduct = () => {
    if (selectedProductId) {
      const existingProduct = selectedProducts.find(p => p.id === selectedProductId);
      if (existingProduct) {
        setSelectedProducts(prev => prev.map(p => 
          p.id === selectedProductId ? { ...p, quantity: p.quantity + 1 } : p
        ));
      } else {
        setSelectedProducts(prev => [...prev, { id: selectedProductId, quantity: 1 }]);
      }
      setSelectedProductId('');
    }
  };

  const removeProduct = (productId: string) => {
    setSelectedProducts(prev => prev.filter(p => p.id !== productId));
  };

  const updateProductQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeProduct(productId);
      return;
    }
    setSelectedProducts(prev => prev.map(p => 
      p.id === productId ? { ...p, quantity } : p
    ));
  };

  const handleRemoveClient = () => {
    setSelectedClient(null);
  };

  const calcularVencimentos = () => {
    const vencimentos = [];
    const dataVendaObj = parseLocalDate(formData.data_venda);
    const diaVencimento = parseInt(formData.dia_vencimento);
    
    // Calcular primeira data de vencimento baseada no dia escolhido
    const anoVenda = dataVendaObj.getFullYear();
    const mesVenda = dataVendaObj.getMonth();
    
    // Mesma regra usada ao gravar as parcelas (CrediarioContext.calcularParcelas):
    // a primeira parcela sempre vence no mês seguinte à venda.
    const primeiraDataVencimento = dateWithDayClamped(anoVenda, mesVenda + 1, diaVencimento);

    for (let i = 0; i < numeroParcelas; i++) {
      const vencimento = dateWithDayClamped(
        primeiraDataVencimento.getFullYear(),
        primeiraDataVencimento.getMonth() + i,
        diaVencimento
      );
      vencimentos.push(vencimento);
    }

    return vencimentos;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedClient) {
      alert('Selecione um cliente');
      return;
    }

    if (valorTotal <= 0) {
      alert('Valor total deve ser maior que zero');
      return;
    }

    if (valorEntrada < 0) {
      alert('Valor de entrada não pode ser negativo');
      return;
    }

    if (valorEntrada >= valorFinal) {
      alert('Valor de entrada deve ser menor que o valor final');
      return;
    }

    if (numeroParcelas < 1 || numeroParcelas > 60) {
      alert('Número de parcelas deve estar entre 1 e 60');
      return;
    }

    try {
      console.log('=== DADOS DO FORM ===', formData);
      console.log('=== VALOR TOTAL ===', valorTotal);
      console.log('=== DESCONTO ===', desconto);
      console.log('=== VALOR FINAL ===', valorFinal);
      
      // Preparar array de produtos com suas quantidades e preços
      const produtosArray = selectedProducts.map(produto => {
        const productData = products?.find(p => p.id === produto.id);
        return {
          id: produto.id,
          nome: productData?.name || '',
          quantidade: produto.quantity,
          preco: productData?.unit_price || 0,
          comissao: productData?.commission || 0
        };
      });

      await criarVendaCrediario({
        client_id: selectedClient.id,
        produto_id: selectedProducts.length > 0 ? selectedProducts[0].id : null, // Manter compatibilidade
        produtos: produtosArray, // Array de múltiplos produtos
        valor_total: valorTotal,
        desconto: desconto,
        valor_entrada: valorEntrada,
        numero_parcelas: numeroParcelas,
        dia_vencimento: parseInt(formData.dia_vencimento),
        data_venda: formData.data_venda,
        observacoes: formData.observacoes
      });

      navigate('/crediario');
    } catch (error) {
      console.error('Erro ao criar venda:', error);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Nova Venda no Crediário</h1>
        <p className="text-muted-foreground">Registre uma nova venda parcelada</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Dados da Venda */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCardIcon className="h-5 w-5" />
                Dados da Venda
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Cliente */}
              <div className="space-y-2">
                <Label>Cliente *</Label>
                {selectedClient ? (
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-muted">
                    <div className="flex items-center gap-2">
                      <UserIcon className="h-4 w-4" />
                      <div>
                        <p className="font-medium">{selectedClient.name}</p>
                        <p className="text-sm text-muted-foreground">{selectedClient.phone}</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveClient}
                    >
                      Alterar
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setShowClientModal(true)}
                  >
                    <UserIcon className="h-4 w-4 mr-2" />
                    Selecionar Cliente
                  </Button>
                )}
              </div>

              {/* Produtos */}
              <div className="space-y-2">
                <Label>Produtos</Label>
                <div className="flex gap-2">
                  <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Selecione um produto" />
                    </SelectTrigger>
                    <SelectContent>
                      {products?.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} - R$ {product.unit_price.toFixed(2)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" onClick={addProduct} disabled={!selectedProductId}>
                    Adicionar
                  </Button>
                </div>
                
                {selectedProducts.length > 0 && (
                  <div className="space-y-2 mt-3">
                    <Label>Produtos Selecionados:</Label>
                    {selectedProducts.map((produto) => {
                      const productData = products?.find(p => p.id === produto.id);
                      return (
                        <div key={produto.id} className="flex items-center gap-2 p-2 border rounded">
                          <span className="flex-1">{productData?.name}</span>
                          <Input
                            type="number"
                            min="1"
                            value={produto.quantity}
                            onChange={(e) => updateProductQuantity(produto.id, parseInt(e.target.value))}
                            className="w-20"
                          />
                          <span>x R$ {productData?.unit_price.toFixed(2)}</span>
                          <Button type="button" variant="destructive" size="sm" onClick={() => removeProduct(produto.id)}>
                            Remover
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Valores */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="valor_total">Valor Total *</Label>
                  <Input
                    id="valor_total"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={formData.valor_total}
                    onChange={(e) => handleInputChange('valor_total', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="desconto">Desconto</Label>
                  <Input
                    id="desconto"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={formData.desconto}
                    onChange={(e) => handleInputChange('desconto', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="valor_entrada">Valor de Entrada</Label>
                  <Input
                    id="valor_entrada"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={formData.valor_entrada}
                    onChange={(e) => handleInputChange('valor_entrada', e.target.value)}
                  />
                </div>
              </div>

              {/* Parcelas e Vencimento */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="numero_parcelas">Número de Parcelas *</Label>
                  <Select
                    value={formData.numero_parcelas}
                    onValueChange={(value) => handleInputChange('numero_parcelas', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => i + 1).map(num => (
                        <SelectItem key={num} value={num.toString()}>
                          {num}x
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dia_vencimento">Dia do Vencimento *</Label>
                  <Select
                    value={formData.dia_vencimento}
                    onValueChange={(value) => handleInputChange('dia_vencimento', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(dia => (
                        <SelectItem key={dia} value={dia.toString()}>
                          Dia {dia}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Data da Venda */}
              <div className="space-y-2">
                <Label htmlFor="data_venda">Data da Venda *</Label>
                <Input
                  id="data_venda"
                  type="date"
                  value={formData.data_venda}
                  onChange={(e) => handleInputChange('data_venda', e.target.value)}
                  required
                />
              </div>

              {/* Observações */}
              <div className="space-y-2">
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  placeholder="Observações sobre a venda..."
                  value={formData.observacoes}
                  onChange={(e) => handleInputChange('observacoes', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Resumo da Venda */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Resumo da Venda
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Valores Calculados */}
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Valor Total:</span>
                  <span className="font-bold">R$ {valorTotal.toFixed(2)}</span>
                </div>
                {desconto > 0 && (
                  <div className="flex justify-between">
                    <span>Desconto:</span>
                    <span className="font-medium text-red-600">- R$ {desconto.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Valor Final:</span>
                  <span className="font-bold text-green-600">R$ {valorFinal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Valor de Entrada:</span>
                  <span>R$ {valorEntrada.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span>Valor Restante:</span>
                  <span className="font-semibold">R$ {valorRestante.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Número de Parcelas:</span>
                  <span>{numeroParcelas}x</span>
                </div>
                <div className="flex justify-between">
                  <span>Valor por Parcela:</span>
                  <span className="font-semibold">R$ {valorParcela.toFixed(2)}</span>
                </div>
              </div>

              {/* Cronograma de Vencimentos */}
              {valorRestante > 0 && (
                <div className="space-y-2">
                  <Separator />
                  <h4 className="font-semibold flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    Cronograma de Vencimentos
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {valorEntrada > 0 && (
                      <div className="flex justify-between items-center text-sm">
                        <span>Entrada:</span>
                        <div className="flex items-center gap-2">
                          <span>R$ {valorEntrada.toFixed(2)}</span>
                          <Badge variant="default">Pago</Badge>
                        </div>
                      </div>
                    )}
                    {calcularVencimentos().map((vencimento, index) => (
                      <div key={index} className="flex justify-between items-center text-sm">
                        <span>Parcela {index + 1}:</span>
                        <div className="flex items-center gap-2">
                          <span>R$ {valorParcela.toFixed(2)}</span>
                          <span className="text-muted-foreground">
                            {format(vencimento, 'dd/MM/yyyy', { locale: ptBR })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Botões */}
        <div className="flex gap-4 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/crediario')}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={loading || !selectedClient || valorTotal <= 0}
          >
            {loading ? 'Salvando...' : 'Criar Venda no Crediário'}
          </Button>
        </div>
      </form>

      {/* Modal de Seleção de Cliente */}
      <ClientSearchModal
        open={showClientModal}
        onClose={() => setShowClientModal(false)}
        onSelectClient={handleSelectClient}
        clients={clients}
      />

      {/* Modal de Seleção de Produto */}
      <ProductSearchModal
        open={showProductModal}
        onClose={() => setShowProductModal(false)}
        onSelectProduct={handleSelectProduct}
        products={products}
      />
    </div>
  );
}