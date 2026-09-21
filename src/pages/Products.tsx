
import React, { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  Package,
  Plus,
  Search,
  DollarSign,
  Percent,
  Edit,
  Trash2,
  ShoppingBag,
  Archive,
  AlertTriangle,
  BarChart3,
  FileText,
  CalendarIcon,
  Filter,
} from 'lucide-react';

const Products = () => {
  const { products, addProduct, updateProduct, deleteProduct, sales, crediarioVendas, clients } = useData();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [stockSearchTerm, setStockSearchTerm] = useState('');
  const [analyticsSearchTerm, setAnalyticsSearchTerm] = useState('');
  const [salesSearchTerm, setSalesSearchTerm] = useState('');
  
  // Estados dos filtros para relatório analítico
  const [analyticsStartDate, setAnalyticsStartDate] = useState<Date>();
  const [analyticsEndDate, setAnalyticsEndDate] = useState<Date>();
  const [analyticsSelectedPeriod, setAnalyticsSelectedPeriod] = useState<string>('thisMonth');
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    unit_price: '',
    commission: '',
    estoque: '',
  });

  const canAddProduct = user?.plan === 'premium' || products.length < 5;

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const productData = {
      name: formData.name,
      unit_price: parseFloat(formData.unit_price),
      commission: formData.commission ? parseFloat(formData.commission) : 0,
      estoque: parseInt(formData.estoque) || 0,
    };
    
    if (editingProduct) {
      updateProduct(editingProduct.id, productData);
    } else {
      if (!canAddProduct) {
        alert('Limite de produtos atingido. Faça upgrade para o plano Premium!');
        return;
      }
      addProduct(productData);
    }
    
    resetForm();
  };

  const resetForm = () => {
    setFormData({ name: '', unit_price: '', commission: '', estoque: '' });
    setEditingProduct(null);
    setDialogOpen(false);
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      unit_price: product.unit_price.toString(),
      commission: product.commission.toString(),
      estoque: product.estoque?.toString() || '0',
    });
    setDialogOpen(true);
  };

  const handleDelete = (productId) => {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
      deleteProduct(productId);
    }
  };

  // Função para filtrar vendas por período no relatório analítico
  const getFilteredSalesByPeriod = (salesData) => {
    if (analyticsSelectedPeriod === 'all') return salesData;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthMap = {
      'january': 0, 'february': 1, 'march': 2, 'april': 3, 'may': 4, 'june': 5,
      'july': 6, 'august': 7, 'september': 8, 'october': 9, 'november': 10, 'december': 11
    };

    switch (analyticsSelectedPeriod) {
      case 'thisMonth':
        return salesData.filter(sale => {
          const saleDate = new Date(sale.sale_date + 'T00:00:00');
          return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear;
        });
      case 'lastMonth':
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        return salesData.filter(sale => {
          const saleDate = new Date(sale.sale_date + 'T00:00:00');
          return saleDate.getMonth() === lastMonth && saleDate.getFullYear() === lastMonthYear;
        });
      case 'last3Months':
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        return salesData.filter(sale => new Date(sale.sale_date + 'T00:00:00') >= threeMonthsAgo);
      case 'thisYear':
        return salesData.filter(sale => new Date(sale.sale_date + 'T00:00:00').getFullYear() === currentYear);
      case 'january':
      case 'february':
      case 'march':
      case 'april':
      case 'may':
      case 'june':
      case 'july':
      case 'august':
      case 'september':
      case 'october':
      case 'november':
      case 'december':
        const targetMonth = monthMap[analyticsSelectedPeriod];
        return salesData.filter(sale => {
          const saleDate = new Date(sale.sale_date + 'T00:00:00');
          return saleDate.getMonth() === targetMonth && saleDate.getFullYear() === currentYear;
        });
      default:
        return salesData;
    }
  };

  const getProductSales = (productId) => {
    const regularSales = sales.filter(sale => sale.product_id === productId);
    
    // Buscar vendas do crediário que contêm este produto
    const crediarioSalesForProduct = [];
    
    crediarioVendas.forEach(venda => {
      // Verificar se tem o array produtos (novo formato)
      if (venda.produtos && Array.isArray(venda.produtos)) {
        const produtos = venda.produtos as Array<{
          id: string;
          nome: string;
          quantidade: number;
          preco: number;
          comissao?: number;
        }>;
        
        const produtoEncontrado = produtos.find(p => p.id === productId);
        if (produtoEncontrado) {
          // Calcular valor proporcional baseado na quantidade do produto específico
          const totalQuantidadeProdutos = produtos.reduce((sum, p) => sum + (p.quantidade || 1), 0);
          const quantidadeProduto = produtoEncontrado.quantidade || 1;
          const valorProporcional = (venda.valor_total * quantidadeProduto) / totalQuantidadeProdutos;
          
          crediarioSalesForProduct.push({
            id: `${venda.id}-${productId}`,
            product_id: productId,
            client_id: venda.client_id,
            quantity: quantidadeProduto,
            unit_price: produtoEncontrado.preco || 0,
            total_value: valorProporcional,
            commission: (produtoEncontrado.comissao || 0) * quantidadeProduto,
            sale_date: venda.data_venda,
            created_at: venda.created_at,
            user_id: venda.user_id,
            payment_method: 'crediario'
          });
        }
      }
      // Verificar sistema legado (produto_id) apenas se não há produtos array ou está vazio
      else if (venda.produto_id === productId && (!venda.produtos || (Array.isArray(venda.produtos) && venda.produtos.length === 0))) {
        crediarioSalesForProduct.push({
          id: venda.id,
          product_id: venda.produto_id,
          client_id: venda.client_id,
          quantity: 1,
          unit_price: venda.valor_total,
          total_value: venda.valor_total,
          commission: 0,
          sale_date: venda.data_venda,
          created_at: venda.created_at,
          user_id: venda.user_id,
          payment_method: 'crediario'
        });
      }
    });
    
    const allSales = [...regularSales, ...crediarioSalesForProduct];
    
    // Aplicar filtros de data se estamos no relatório analítico
    let filteredSales = allSales;
    
    // Filtro por período
    filteredSales = getFilteredSalesByPeriod(filteredSales);
    
    // Filtro por data específica
    if (analyticsStartDate && analyticsEndDate) {
      filteredSales = filteredSales.filter(sale => {
        const saleDate = new Date(sale.sale_date);
        return saleDate >= analyticsStartDate && saleDate <= analyticsEndDate;
      });
    }
    
    return filteredSales;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Produtos</h1>
          <p className="text-gray-600">
            Gerencie seus produtos e comissões
          </p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="bg-blue-600 hover:bg-blue-700"
              disabled={!canAddProduct}
              onClick={() => setEditingProduct(null)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo Produto
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? 'Editar Produto' : 'Novo Produto'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do produto</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="unit_price">Preço unitário (R$)</Label>
                <Input
                  id="unit_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.unit_price}
                  onChange={(e) => setFormData({...formData, unit_price: e.target.value})}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="commission">Comissão por unidade (R$) - Opcional</Label>
                <Input
                  id="commission"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.commission}
                  onChange={(e) => setFormData({...formData, commission: e.target.value})}
                  placeholder="0.00"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="estoque">Quantidade em estoque</Label>
                <Input
                  id="estoque"
                  type="number"
                  min="0"
                  value={formData.estoque}
                  onChange={(e) => setFormData({...formData, estoque: e.target.value})}
                  placeholder="0"
                  required
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  {editingProduct ? 'Salvar' : 'Criar Produto'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Plan Limit Warning */}
      {user?.plan === 'free' && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-orange-800">
              <Package className="h-5 w-5" />
              <span className="font-medium">
                Plano Gratuito: {products.length}/5 produtos
              </span>
            </div>
            {products.length >= 4 && (
              <p className="text-sm text-orange-700 mt-2">
                Você está próximo do limite. Considere fazer upgrade para o plano Premium!
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="products" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="products">Produtos</TabsTrigger>
          <TabsTrigger value="stock">Estoque</TabsTrigger>
          <TabsTrigger value="analytics">Relatório Analítico</TabsTrigger>
          <TabsTrigger value="sales">Relatório de Vendas</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-6">
          {/* Search */}
          <Card>
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar produtos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Products List */}
          {filteredProducts.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <ShoppingBag className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {searchTerm ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado'}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {searchTerm 
                      ? 'Tente buscar com outros termos'
                      : 'Comece adicionando seu primeiro produto!'
                    }
                  </p>
                  {!searchTerm && canAddProduct && (
                    <Button 
                      onClick={() => setDialogOpen(true)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Adicionar Produto
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => {
                const productSales = getProductSales(product.id);
                
                // Calcular vendidos corretamente para cada produto individual
                const totalSold = (() => {
                  let soldUnits = 0;
                  
                  // Vendas regulares
                  sales.filter(sale => sale.product_id === product.id).forEach(sale => {
                    soldUnits += sale.quantity;
                  });
                  
                  // Vendas do crediário
                  crediarioVendas.forEach(venda => {
                    if (venda.produtos && Array.isArray(venda.produtos)) {
                      const produtos = venda.produtos as Array<{id: string; nome: string; quantidade: number; preco: number;}>;
                      const produtoEncontrado = produtos.find(p => p.id === product.id);
                      if (produtoEncontrado) {
                        soldUnits += produtoEncontrado.quantidade;
                      }
                    } else if (venda.produto_id === product.id && (!venda.produtos || (Array.isArray(venda.produtos) && venda.produtos.length === 0))) {
                      soldUnits += 1; // Produtos do crediário antigo sempre têm quantidade 1
                    }
                  });
                  
                  return soldUnits;
                })();
                const totalRevenue = productSales.reduce((sum, sale) => sum + Number(sale.total_value), 0);
                const totalCommission = productSales.reduce((sum, sale) => sum + Number(sale.commission), 0);
                const commissionPercentage = Number(product.unit_price) > 0 ? (Number(product.commission) / Number(product.unit_price)) * 100 : 0;
                
                return (
                  <Card key={product.id} className={`hover:shadow-lg transition-shadow ${(product.estoque || 0) <= 5 && (product.estoque || 0) > 0 ? 'border-orange-300' : (product.estoque || 0) === 0 ? 'border-red-300' : ''}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <CardTitle className="text-lg">{product.name}</CardTitle>
                          {(product.estoque || 0) <= 5 && (product.estoque || 0) > 0 && (
                            <div className="flex items-center text-orange-600">
                              <AlertTriangle className="h-4 w-4" />
                            </div>
                          )}
                          {(product.estoque || 0) === 0 && (
                            <div className="flex items-center text-red-600">
                              <AlertTriangle className="h-4 w-4" />
                            </div>
                          )}
                        </div>
                        <div className="flex space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(product)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(product.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          <span className="font-medium">
                            R$ {Number(product.unit_price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <Badge variant="outline">
                          Unitário
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Percent className="h-4 w-4 text-blue-600" />
                          <span className="font-medium">
                            R$ {Number(product.commission).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <Badge variant="secondary">
                          {commissionPercentage.toFixed(1)}%
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Archive className="h-4 w-4 text-orange-600" />
                          <span className="font-medium">
                            {Number(product.estoque || 0)} unidades
                          </span>
                        </div>
                        <Badge variant={Number(product.estoque || 0) > 0 ? "default" : "destructive"}>
                          {Number(product.estoque || 0) > 0 ? "Em estoque" : "Sem estoque"}
                        </Badge>
                      </div>
                      
                      <div className="pt-2 border-t">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="text-center">
                            <div className="font-semibold text-gray-900">{totalSold}</div>
                            <div className="text-gray-600">Vendidos</div>
                          </div>
                          <div className="text-center">
                            <div className="font-semibold text-gray-900">{(() => {
                              // Contar vendas únicas para evitar duplicação em vendas com múltiplos produtos
                              const uniqueSalesIds = new Set();
                              
                              // Vendas regulares - usar sale_group_id ou venda_id para agrupar
                              sales.filter(sale => sale.product_id === product.id).forEach(sale => {
                                const groupId = sale.sale_group_id || sale.numero_venda || sale.id;
                                uniqueSalesIds.add(groupId);
                              });
                              
                              // Vendas do crediário - usar venda_id para agrupar  
                              crediarioVendas.forEach(venda => {
                                if (venda.produtos && Array.isArray(venda.produtos)) {
                                  const produtos = venda.produtos as Array<{id: string; nome: string; quantidade: number; preco: number;}>;
                                  if (produtos.find(p => p.id === product.id)) {
                                    uniqueSalesIds.add(venda.id);
                                  }
                                } else if (venda.produto_id === product.id && (!venda.produtos || (Array.isArray(venda.produtos) && venda.produtos.length === 0))) {
                                  uniqueSalesIds.add(venda.id);
                                }
                              });
                              
                              return uniqueSalesIds.size;
                            })()}</div>
                            <div className="text-gray-600">Vendas</div>
                          </div>
                        </div>
                      </div>
                      
                       {totalRevenue > 0 && (
                         <div className="pt-2 border-t">
                           <div className="flex justify-between text-sm">
                             <span className="text-gray-600">Faturamento:</span>
                             <span className="font-medium">
                               R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                             </span>
                           </div>
                           {totalCommission > 0 && (
                             <div className="flex justify-between text-sm">
                               <span className="text-gray-600">Comissão total:</span>
                               <span className="font-medium text-green-600">
                                 R$ {totalCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                               </span>
                             </div>
                           )}
                         </div>
                       )}
                      
                      <div className="text-xs text-gray-500">
                        Criado em {new Date(product.created_at).toLocaleDateString('pt-BR')}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="stock" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Archive className="h-5 w-5" />
                <span>Controle de Estoque</span>
              </CardTitle>
              <div className="flex items-center space-x-2 mt-4">
                <Search className="h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Pesquisar produtos no estoque..."
                  value={stockSearchTerm}
                  onChange={(e) => setStockSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Preço Unitário</TableHead>
                    <TableHead>Estoque Atual</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Valor em Estoque</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                 <TableBody>
                   {products.filter(product => 
                     product.name.toLowerCase().includes(stockSearchTerm.toLowerCase())
                   ).map((product) => {
                     const stock = Number(product.estoque || 0);
                     const stockValue = stock * Number(product.unit_price);
                    
                    return (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>
                          R$ {Number(product.unit_price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <span>{stock} unidades</span>
                            {stock <= 5 && stock > 0 && (
                              <AlertTriangle className="h-4 w-4 text-orange-500" />
                            )}
                            {stock === 0 && (
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={stock > 5 ? "default" : stock > 0 ? "secondary" : "destructive"}>
                            {stock > 5 ? "Normal" : stock > 0 ? "Baixo" : "Esgotado"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          R$ {stockValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(product)}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(product.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              
              {products.length === 0 && (
                <div className="text-center py-8">
                  <Archive className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">Nenhum produto cadastrado para controle de estoque.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {/* Filtros */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Filter className="h-5 w-5" />
                <span>Filtros</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Período */}
                <div className="flex flex-col space-y-2">
                  <label className="text-sm font-medium text-gray-700">Período</label>
                  <Select value={analyticsSelectedPeriod} onValueChange={setAnalyticsSelectedPeriod}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="thisMonth">Este mês</SelectItem>
                      <SelectItem value="lastMonth">Mês passado</SelectItem>
                      <SelectItem value="last3Months">Últimos 3 meses</SelectItem>
                      <SelectItem value="thisYear">Este ano</SelectItem>
                      <SelectItem value="january">Janeiro</SelectItem>
                      <SelectItem value="february">Fevereiro</SelectItem>
                      <SelectItem value="march">Março</SelectItem>
                      <SelectItem value="april">Abril</SelectItem>
                      <SelectItem value="may">Maio</SelectItem>
                      <SelectItem value="june">Junho</SelectItem>
                      <SelectItem value="july">Julho</SelectItem>
                      <SelectItem value="august">Agosto</SelectItem>
                      <SelectItem value="september">Setembro</SelectItem>
                      <SelectItem value="october">Outubro</SelectItem>
                      <SelectItem value="november">Novembro</SelectItem>
                      <SelectItem value="december">Dezembro</SelectItem>
                      <SelectItem value="all">Todo período</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Data Inicial */}
                <div className="flex flex-col space-y-2">
                  <label className="text-sm font-medium text-gray-700">Data Inicial</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("justify-start text-left font-normal", !analyticsStartDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {analyticsStartDate ? format(analyticsStartDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={analyticsStartDate} onSelect={setAnalyticsStartDate} initialFocus className="pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Data Final */}
                <div className="flex flex-col space-y-2">
                  <label className="text-sm font-medium text-gray-700">Data Final</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("justify-start text-left font-normal", !analyticsEndDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {analyticsEndDate ? format(analyticsEndDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={analyticsEndDate} onSelect={setAnalyticsEndDate} initialFocus className="pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Pesquisa */}
                <div className="flex flex-col space-y-2">
                  <label className="text-sm font-medium text-gray-700">Pesquisar</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Nome do produto..."
                      value={analyticsSearchTerm}
                      onChange={(e) => setAnalyticsSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              {/* Botão Limpar Filtros */}
              <div className="mt-4">
                <Button variant="outline" onClick={() => {
                  setAnalyticsStartDate(undefined);
                  setAnalyticsEndDate(undefined);
                  setAnalyticsSelectedPeriod('thisMonth');
                  setAnalyticsSearchTerm('');
                }}>
                  Limpar Filtros
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Relatório Analítico de Produtos</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Qtd. Vendida</TableHead>
                    <TableHead>Faturamento</TableHead>
                    <TableHead>Comissão Total</TableHead>
                    <TableHead>Nº de Vendas</TableHead>
                    <TableHead>Margem (%)</TableHead>
                  </TableRow>
                </TableHeader>
                 <TableBody>
                   {products.filter(product => 
                     product.name.toLowerCase().includes(analyticsSearchTerm.toLowerCase())
                   ).map((product) => {
                     const productSales = getProductSales(product.id);
                     const totalSold = productSales.reduce((sum, sale) => sum + sale.quantity, 0);
                     const totalRevenue = productSales.reduce((sum, sale) => sum + Number(sale.total_value), 0);
                     const totalCommission = productSales.reduce((sum, sale) => sum + Number(sale.commission), 0);
                     const margin = totalRevenue > 0 ? ((totalCommission / totalRevenue) * 100) : 0;
                    
                    return (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>{totalSold} unidades</TableCell>
                        <TableCell>
                          R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-green-600 font-medium">
                          R$ {totalCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>{productSales.length}</TableCell>
                        <TableCell>
                          <Badge variant={margin > 20 ? "default" : margin > 10 ? "secondary" : "outline"}>
                            {margin.toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              
              {products.length === 0 && (
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">Nenhum produto cadastrado para análise.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Relatório de Vendas por Produto</span>
              </CardTitle>
              <div className="flex items-center space-x-2 mt-4">
                <Search className="h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Pesquisar no relatório de vendas..."
                  value={salesSearchTerm}
                  onChange={(e) => setSalesSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {products.filter(product => 
                  product.name.toLowerCase().includes(salesSearchTerm.toLowerCase())
                ).map((product) => {
                  const productSales = getProductSales(product.id);
                  const totalSold = productSales.reduce((sum, sale) => sum + sale.quantity, 0);
                  const totalRevenue = productSales.reduce((sum, sale) => sum + Number(sale.total_value), 0);
                  
                  if (productSales.length === 0) return null;
                  
                  return (
                    <Card key={product.id} className="border-l-4 border-l-blue-500">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">{product.name}</CardTitle>
                        <div className="flex space-x-4 text-sm text-gray-600">
                          <span>Total vendido: {totalSold} unidades</span>
                          <span>Faturamento: R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          <span>Vendas: {productSales.length}</span>
                        </div>
                      </CardHeader>
                      <CardContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Data</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Quantidade</TableHead>
                                <TableHead>Valor Total</TableHead>
                                <TableHead>Comissão</TableHead>
                                <TableHead>Forma de Pagamento</TableHead>
                              </TableRow>
                            </TableHeader>
                          <TableBody>
                            {productSales.map((sale) => {
                              const client = sale.client_id ? clients.find(c => c.id === sale.client_id) : null;
                              const clientName = client ? client.name : 'Venda avulsa';
                              
                              return (
                                <TableRow key={sale.id}>
                                  <TableCell>
                                    {new Date(new Date(sale.sale_date).getTime() + 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')}
                                  </TableCell>
                                  <TableCell>{clientName}</TableCell>
                                  <TableCell>{sale.quantity}</TableCell>
                                  <TableCell>
                                    R$ {Number(sale.total_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </TableCell>
                                  <TableCell className="text-green-600">
                                    R$ {Number(sale.commission).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </TableCell>
                                  <TableCell>
                                    {sale.payment_method || 'Não informado'}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  );
                })}
                
                {products.every(product => getProductSales(product.id).length === 0) && (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">Nenhuma venda registrada para gerar relatório.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Products;
