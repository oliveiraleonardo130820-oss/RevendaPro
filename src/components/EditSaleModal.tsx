
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useData } from '@/contexts/DataContext';
import ClientSearchModal from '@/components/ClientSearchModal';
import { toast } from 'sonner';
import { User, Search } from 'lucide-react';

interface Sale {
  id: string;
  client_id: string | null;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_value: number;
  payment_method: string | null;
  sale_date: string;
  commission: number;
  juros_parcelamento: number;
  observacoes?: string | null;
}

interface EditSaleModalProps {
  open: boolean;
  onClose: () => void;
  sale: Sale;
}

const EditSaleModal = ({ open, onClose, sale }: EditSaleModalProps) => {
  const { products, clients, updateSale } = useData();
  const [formData, setFormData] = useState({
    client_id: sale.client_id,
    product_id: sale.product_id,
    quantity: sale.quantity,
    unit_price: sale.unit_price,
    total_value: sale.total_value,
    payment_method: sale.payment_method || 'Dinheiro',
    juros_parcelamento: sale.juros_parcelamento,
    sale_date: sale.sale_date,
    observacoes: sale.observacoes || '',
    desconto: 0,
  });
  const [loading, setLoading] = useState(false);
  const [clientSearchOpen, setClientSearchOpen] = useState(false);

  const selectedProduct = products.find(p => p.id === formData.product_id);
  const selectedClient = clients.find(c => c.id === formData.client_id);

  // Recalculate total when quantity, unit price, payment method, interest or discount changes
  useEffect(() => {
    if (selectedProduct) {
      const baseTotal = formData.quantity * formData.unit_price;
      let finalTotal = baseTotal;

      // Apply discount
      if (formData.desconto > 0) {
        finalTotal = baseTotal * (1 - (formData.desconto / 100));
      }

      // Apply interest
      if (formData.juros_parcelamento > 0) {
        finalTotal = finalTotal * (1 + (formData.juros_parcelamento / 100));
      }

      setFormData(prev => ({ ...prev, total_value: finalTotal }));
    }
  }, [formData.quantity, formData.unit_price, formData.payment_method, formData.juros_parcelamento, formData.desconto, selectedProduct]);

  const handleProductChange = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      setFormData(prev => ({
        ...prev,
        product_id: productId,
        unit_price: product.unit_price,
      }));
    }
  };

  const handleClientSelect = (client: any) => {
    setFormData(prev => ({
      ...prev,
      client_id: client.id,
    }));
  };

  const handleRemoveClient = () => {
    setFormData(prev => ({
      ...prev,
      client_id: null,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updatedSale = {
        ...sale,
        ...formData,
        commission: selectedProduct ? selectedProduct.commission * formData.quantity : 0,
      };

      await updateSale(sale.id, updatedSale);
      toast.success('Venda atualizada com sucesso!');
      onClose();
    } catch (error) {
      console.error('Erro ao atualizar venda:', error);
      toast.error('Erro ao atualizar venda');
    } finally {
      setLoading(false);
    }
  };

  const paymentOptions = [
    'Dinheiro',
    'Cartão de Débito',
    'Cartão de Crédito',
    'PIX'
  ];

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Venda</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Campo de seleção de cliente */}
            <div className="space-y-2">
              <Label>Cliente</Label>
              {selectedClient ? (
                <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <div>
                      <div className="font-medium text-sm">{selectedClient.name}</div>
                      <div className="text-xs text-gray-600">{selectedClient.phone}</div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveClient}
                    className="text-red-600 hover:text-red-700"
                  >
                    Remover
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="p-3 border rounded-lg bg-orange-50 border-orange-200">
                    <div className="text-sm text-orange-800">Venda sem cliente cadastrado</div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setClientSearchOpen(true)}
                    className="w-full"
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Selecionar Cliente
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="product">Produto</Label>
              <Select value={formData.product_id} onValueChange={handleProductChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um produto" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} - R$ {product.unit_price.toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantidade</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit_price">Preço unitário</Label>
              <Input
                id="unit_price"
                type="number"
                step="0.01"
                min="0"
                value={formData.unit_price}
                onChange={(e) => setFormData(prev => ({ ...prev, unit_price: parseFloat(e.target.value) || 0 }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_method">Forma de pagamento</Label>
              <Select value={formData.payment_method} onValueChange={(value) => setFormData(prev => ({ ...prev, payment_method: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="juros_parcelamento">Juros (%)</Label>
                <Input
                  id="juros_parcelamento"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.juros_parcelamento}
                  onChange={(e) => setFormData(prev => ({ ...prev, juros_parcelamento: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desconto">Desconto (%)</Label>
                <Input
                  id="desconto"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.desconto || 0}
                  onChange={(e) => setFormData(prev => ({ ...prev, desconto: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sale_date">Data da venda</Label>
              <Input
                id="sale_date"
                type="date"
                value={formData.sale_date}
                onChange={(e) => setFormData(prev => ({ ...prev, sale_date: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                placeholder="Observações sobre a venda..."
                value={formData.observacoes}
                onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                className="min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label>Valor total</Label>
              <div className="text-lg font-semibold text-green-600">
                R$ {formData.total_value.toFixed(2)}
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de busca de cliente */}
      <ClientSearchModal
        open={clientSearchOpen}
        onClose={() => setClientSearchOpen(false)}
        clients={clients}
        onSelectClient={handleClientSelect}
      />
    </>
  );
};

export default EditSaleModal;
