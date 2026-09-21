import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useData } from '@/contexts/DataContext';
import { CrediarioVenda } from '@/contexts/CrediarioContext';

interface EditCrediarioModalProps {
  open: boolean;
  onClose: () => void;
  venda: CrediarioVenda | null;
  onSave: (vendaId: string, data: any) => Promise<void>;
}

export default function EditCrediarioModal({ open, onClose, venda, onSave }: EditCrediarioModalProps) {
  const { clients, products } = useData();
  const [formData, setFormData] = useState({
    client_id: '',
    produtos: [] as Array<{id: string, quantity: number}>,
    valor_total: '',
    numero_parcelas: '',
    dia_vencimento: '',
    data_venda: '',
    observacoes: ''
  });
  const [selectedProductId, setSelectedProductId] = useState('');

  useEffect(() => {
    if (venda && open) {
      // Load all products from venda.produtos array or fallback to single produto_id
      let produtos = [];
      const vendaData = venda as any;
      if (vendaData.produtos && vendaData.produtos.length > 0) {
        produtos = vendaData.produtos.map((produto: any) => ({
          id: produto.produto_id,
          quantity: produto.quantidade
        }));
      } else if (venda.produto_id) {
        produtos = [{id: venda.produto_id, quantity: 1}];
      }

      setFormData({
        client_id: venda.client_id || '',
        produtos: produtos,
        valor_total: venda.valor_total.toString(),
        numero_parcelas: venda.numero_parcelas.toString(),
        dia_vencimento: (venda.dia_vencimento - 1).toString(),
        data_venda: venda.data_venda,
        observacoes: venda.observacoes || ''
      });
    }
  }, [venda, open]);

  // Auto-calculate valor_total when products change
  useEffect(() => {
    if (formData.produtos.length > 0 && products) {
      let total = 0;
      formData.produtos.forEach(produto => {
        const selectedProduct = products.find(p => p.id === produto.id);
        if (selectedProduct) {
          total += selectedProduct.unit_price * produto.quantity;
        }
      });
      setFormData(prev => ({ ...prev, valor_total: total.toString() }));
    }
  }, [formData.produtos, products]);

  const addProduct = () => {
    if (selectedProductId) {
      const existingProduct = formData.produtos.find(p => p.id === selectedProductId);
      if (existingProduct) {
        setFormData(prev => ({
          ...prev,
          produtos: prev.produtos.map(p => 
            p.id === selectedProductId ? { ...p, quantity: p.quantity + 1 } : p
          )
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          produtos: [...prev.produtos, { id: selectedProductId, quantity: 1 }]
        }));
      }
      setSelectedProductId('');
    }
  };

  const removeProduct = (productId: string) => {
    setFormData(prev => ({
      ...prev,
      produtos: prev.produtos.filter(p => p.id !== productId)
    }));
  };

  const updateProductQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeProduct(productId);
      return;
    }
    setFormData(prev => ({
      ...prev,
      produtos: prev.produtos.map(p => 
        p.id === productId ? { ...p, quantity } : p
      )
    }));
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!venda) return;

    // Preparar array de produtos com suas quantidades e preços
    const produtosArray = formData.produtos.map(produto => {
      const productData = products?.find(p => p.id === produto.id);
      return {
        produto_id: produto.id,
        quantidade: produto.quantity,
        preco_unitario: productData?.unit_price || 0
      };
    });

    const data = {
      client_id: formData.client_id,
      produto_id: formData.produtos.length > 0 ? formData.produtos[0].id : null, // Manter compatibilidade
      produtos: produtosArray, // Array de múltiplos produtos
      valor_total: parseFloat(formData.valor_total),
      valor_entrada: 0,
      numero_parcelas: parseInt(formData.numero_parcelas),
      dia_vencimento: parseInt(formData.dia_vencimento) + 1,
      data_venda: formData.data_venda,
      observacoes: formData.observacoes
    };

    await onSave(venda.id, data);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar Venda Crediário</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client">Cliente</Label>
              <Select value={formData.client_id} onValueChange={(value) => handleInputChange('client_id', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
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
              
              {formData.produtos.length > 0 && (
                <div className="space-y-2 mt-3">
                  <Label>Produtos Selecionados:</Label>
                  {formData.produtos.map((produto) => {
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

            <div className="space-y-2">
              <Label htmlFor="data_venda">Data da Venda</Label>
              <Input
                id="data_venda"
                type="date"
                value={formData.data_venda}
                onChange={(e) => handleInputChange('data_venda', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="valor_total">Valor Total (R$)</Label>
              <Input
                id="valor_total"
                type="number"
                step="0.01"
                value={formData.valor_total}
                onChange={(e) => handleInputChange('valor_total', e.target.value)}
                required
              />
            </div>


            <div className="space-y-2">
              <Label htmlFor="numero_parcelas">Número de Parcelas</Label>
              <Input
                id="numero_parcelas"
                type="number"
                min="1"
                value={formData.numero_parcelas}
                onChange={(e) => handleInputChange('numero_parcelas', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dia_vencimento">Dia do Vencimento</Label>
              <Input
                id="dia_vencimento"
                type="number"
                min="1"
                max="31"
                value={formData.dia_vencimento}
                onChange={(e) => handleInputChange('dia_vencimento', e.target.value)}
                required
                placeholder="Dia do mês (1-31)"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) => handleInputChange('observacoes', e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">
              Salvar Alterações
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}