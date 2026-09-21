

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Search, Package } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  unit_price: number;
  commission: number;
}

interface ProductSearchModalProps {
  open: boolean;
  onClose: () => void;
  products: Product[];
  onSelectProduct: (product: Product) => void;
}

const ProductSearchModal = ({ open, onClose, products, onSelectProduct }: ProductSearchModalProps) => {
  const [searchTerm, setSearchTerm] = useState('');

  console.log('ProductSearchModal rendered, open:', open);

  // Resetar o termo de busca quando o modal é aberto
  useEffect(() => {
    console.log('ProductSearchModal useEffect, open changed to:', open);
    if (open) {
      setSearchTerm('');
    }
  }, [open]);

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectProduct = (product: Product) => {
    console.log('Product selected in modal:', product);
    onSelectProduct(product);
    setSearchTerm('');
    onClose();
  };

  const handleClose = () => {
    console.log('Modal close triggered');
    setSearchTerm('');
    onClose();
  };

  const handleOpenChange = (newOpen: boolean) => {
    console.log('Modal onOpenChange called with:', newOpen);
    if (!newOpen) {
      handleClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5" />
            <span>Buscar Produto</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="search">Pesquisar produto</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="search"
                placeholder="Digite o nome do produto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-2">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => handleSelectProduct(product)}
                >
                  <div className="font-medium text-gray-900">{product.name}</div>
                  <div className="text-sm text-gray-600">
                    Preço: R$ {Number(product.unit_price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-sm text-gray-500">
                    Comissão: R$ {Number(product.commission).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                {searchTerm ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado'}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductSearchModal;

