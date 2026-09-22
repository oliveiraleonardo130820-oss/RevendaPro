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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Calendar, DollarSign, Edit, Trash2, Filter } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import EditSaleModal from './EditSaleModal';
import { toast } from 'sonner';
import { parseLocalDate } from '@/lib/utils';

interface Client {
  id: string;
  name: string;
}

interface Sale {
  id: string;
  client_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_value: number;
  payment_method: string | null;
  sale_date: string;
  commission: number;
  juros_parcelamento: number;
}

interface ClientHistoryModalProps {
  open: boolean;
  onClose: () => void;
  client: Client;
}

const ClientHistoryModal = ({ open, onClose, client }: ClientHistoryModalProps) => {
  const { sales, products, getClientInstallments, getClientCrediarioSales, getClientCrediarioInstallments, deleteSale } = useData();
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: ''
  });

  const clientSales = sales.filter(sale => sale.client_id === client.id);
  const clientInstallments = getClientInstallments(client.id);
  const clientCrediarioSales = getClientCrediarioSales(client.id);
  const clientCrediarioInstallments = getClientCrediarioInstallments(client.id);

  // Filter sales by date if filters are applied
  const filteredSales = clientSales.filter(sale => {
    if (!dateFilter.startDate && !dateFilter.endDate) return true;
    
    const saleDate = parseLocalDate(sale.sale_date);
    const start = dateFilter.startDate ? parseLocalDate(dateFilter.startDate) : null;
    const end = dateFilter.endDate ? parseLocalDate(dateFilter.endDate) : null;

    if (start && saleDate < start) return false;
    if (end && saleDate > end) return false;
    
    return true;
  });

  // Calculate totals
  const totalPurchases = clientSales.reduce((sum, sale) => sum + Number(sale.total_value), 0) + 
                        clientCrediarioSales.reduce((sum, venda) => sum + Number(venda.valor_total), 0);
  
  const totalPaid = clientInstallments
    .filter(installment => installment.status === 'pago')
    .reduce((sum, installment) => sum + Number(installment.valor_da_parcela), 0);
  
  const totalCrediarioPaid = clientCrediarioInstallments
    .filter(installment => installment.status === 'pago')
    .reduce((sum, installment) => sum + Number(installment.valor_parcela), 0);

  // Add cash sales (À vista) to total paid
  const cashSales = clientSales
    .filter(sale => !sale.payment_method || sale.payment_method === 'À vista')
    .reduce((sum, sale) => sum + Number(sale.total_value), 0);

  const actualTotalPaid = totalPaid + cashSales + totalCrediarioPaid;

  const getProductName = (productId: string) => {
    const product = products.find(p => p.id === productId);
    return product ? product.name : 'Produto não encontrado';
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    date.setDate(date.getDate() + 1); // Add 1 day to correct timezone
    return date.toLocaleDateString('pt-BR');
  };

  const getInstallmentCount = (paymentMethod: string | null) => {
    if (!paymentMethod || paymentMethod === 'À vista') return 1;
    const match = paymentMethod.match(/(\d+)x/);
    return match ? parseInt(match[1]) : 1;
  };

  const getSaleStatus = (sale: Sale) => {
    // Métodos de pagamento à vista (já pagos)
    const cashPaymentMethods = ['À vista', 'PIX', 'pix', 'Dinheiro', 'dinheiro', 'Cartão de Débito', 'cartao de debito', 'Cartão de Crédito', 'cartao de credito'];
    
    if (!sale.payment_method || cashPaymentMethods.includes(sale.payment_method)) {
      return 'Pago';
    }

    // Apenas vendas parceladas precisam verificar o status das parcelas
    const saleInstallments = clientInstallments.filter(inst => inst.venda_id === sale.id);
    const paidInstallments = saleInstallments.filter(inst => inst.status === 'pago');
    
    if (paidInstallments.length === 0) return 'Pendente';
    if (paidInstallments.length === saleInstallments.length) return 'Pago';
    return 'Parcial';
  };

  const handleDeleteSale = async (saleId: string) => {
    if (confirm('Tem certeza que deseja excluir esta venda? Esta ação não pode ser desfeita.')) {
      try {
        await deleteSale(saleId);
        toast.success('Venda excluída com sucesso!');
      } catch (error) {
        console.error('Erro ao excluir venda:', error);
        toast.error('Erro ao excluir venda');
      }
    }
  };

  const clearFilters = () => {
    setDateFilter({ startDate: '', endDate: '' });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              Histórico de Compras - {client.name}
            </DialogTitle>
          </DialogHeader>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Total de Compras
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                  <span className="text-2xl font-bold text-blue-600">
                    {formatCurrency(totalPurchases)}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {clientSales.length} venda{clientSales.length !== 1 ? 's' : ''} + {clientCrediarioSales.length} crediário{clientCrediarioSales.length !== 1 ? 's' : ''}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Total Já Pago
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <span className="text-2xl font-bold text-green-600">
                    {formatCurrency(actualTotalPaid)}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Incluindo parcelas pagas
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Date Filter */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <Filter className="h-5 w-5" />
                <span>Filtros</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Data inicial</Label>
                  <Input 
                    id="startDate"
                    type="date" 
                    value={dateFilter.startDate}
                    onChange={(e) => setDateFilter(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">Data final</Label>
                  <Input 
                    id="endDate"
                    type="date" 
                    value={dateFilter.endDate}
                    onChange={(e) => setDateFilter(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
                <Button 
                  variant="outline" 
                  onClick={clearFilters}
                  className="h-10"
                >
                  Limpar Filtros
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Sales List */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">
              Histórico de Vendas ({filteredSales.length + clientCrediarioSales.length})
            </h3>
            
            {(filteredSales.length === 0 && clientCrediarioSales.length === 0) ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8 text-gray-500">
                    {dateFilter.startDate || dateFilter.endDate 
                      ? 'Nenhuma venda encontrada no período selecionado'
                      : 'Nenhuma venda registrada para este cliente'
                    }
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Vendas Normais */}
                {filteredSales
                  .sort((a, b) => parseLocalDate(b.sale_date).getTime() - parseLocalDate(a.sale_date).getTime())
                  .map((sale) => {
                  const status = getSaleStatus(sale);
                  const installmentCount = getInstallmentCount(sale.payment_method);
                  
                  return (
                    <Card key={sale.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-4 mb-3">
                              <div className="flex items-center space-x-2">
                                <Calendar className="h-4 w-4 text-gray-500" />
                                <span className="font-medium">
                                  {formatDate(sale.sale_date)}
                                </span>
                              </div>
                              <Badge
                                variant={status === 'Pago' ? 'default' : status === 'Parcial' ? 'secondary' : 'outline'}
                                className={
                                  status === 'Pago' 
                                    ? 'bg-green-100 text-green-800' 
                                    : status === 'Parcial'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                                }
                              >
                                {status}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-gray-600">Produto:</p>
                                <p className="font-medium">{getProductName(sale.product_id)}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Quantidade:</p>
                                <p className="font-medium">{sale.quantity}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Valor Total:</p>
                                <p className="font-medium text-green-600">
                                  {formatCurrency(Number(sale.total_value))}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-600">Desconto:</p>
                                <p className="font-medium text-red-600">
                                  {(() => {
                                    const originalValue = Number(sale.unit_price) * Number(sale.quantity);
                                    const discount = originalValue - Number(sale.total_value);
                                    return discount > 0 ? formatCurrency(discount) : 'R$ 0,00';
                                  })()}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-600">Pagamento:</p>
                                <p className="font-medium">
                                  {sale.payment_method || 'À vista'}
                                  {installmentCount > 1 && (
                                    <span className="text-gray-500">
                                      {' '}({installmentCount} parcelas)
                                    </span>
                                  )}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-600">Juros:</p>
                                <p className="font-medium">{sale.juros_parcelamento || 0}%</p>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col space-y-2 ml-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingSale(sale)}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Editar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteSale(sale.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Excluir
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                  })}
                
                {/* Vendas de Crediário */}
                {clientCrediarioSales
                  .sort((a, b) => parseLocalDate(b.data_venda).getTime() - parseLocalDate(a.data_venda).getTime())
                  .map((crediarioVenda) => {
                    const crediarioInstallments = clientCrediarioInstallments.filter(
                      parcela => parcela.crediario_venda_id === crediarioVenda.id
                    );
                    
                    return (
                      <Card key={`crediario-${crediarioVenda.id}`} className="bg-purple-50">
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-4 mb-3">
                                <div className="flex items-center space-x-2">
                                  <Calendar className="h-4 w-4 text-gray-500" />
                                  <span className="font-medium">
                                    {formatDate(crediarioVenda.data_venda)}
                                  </span>
                                </div>
                                <Badge
                                  variant="outline"
                                  className="border-purple-200 text-purple-700"
                                >
                                  Crediário
                                </Badge>
                                <Badge
                                  variant={crediarioVenda.status === 'concluido' ? 'default' : 'secondary'}
                                  className={
                                    crediarioVenda.status === 'concluido' 
                                      ? 'bg-green-100 text-green-800' 
                                      : 'bg-yellow-100 text-yellow-800'
                                  }
                                >
                                  {crediarioVenda.status === 'concluido' ? 'Concluído' : 'Ativo'}
                                </Badge>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div>
                                  <p className="text-gray-600">Tipo:</p>
                                  <p className="font-medium">Venda a Crediário</p>
                                </div>
                                <div>
                                  <p className="text-gray-600">Parcelas:</p>
                                  <p className="font-medium">{crediarioVenda.numero_parcelas}x</p>
                                </div>
                                <div>
                                  <p className="text-gray-600">Valor Total:</p>
                                  <p className="font-medium text-purple-600">
                                    {formatCurrency(Number(crediarioVenda.valor_total))}
                                  </p>
                                </div>
                                {crediarioVenda.desconto > 0 && (
                                  <div>
                                    <p className="text-gray-600">Desconto:</p>
                                    <p className="font-medium text-red-600">
                                      {formatCurrency(Number(crediarioVenda.desconto))}
                                    </p>
                                  </div>
                                )}
                                <div>
                                  <p className="text-gray-600">Entrada:</p>
                                  <p className="font-medium">
                                    {formatCurrency(Number(crediarioVenda.valor_entrada))}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-gray-600">Valor Restante:</p>
                                  <p className="font-medium text-orange-600">
                                    {formatCurrency(Number(crediarioVenda.valor_restante))}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-gray-600">Dia Vencimento:</p>
                                  <p className="font-medium">{crediarioVenda.dia_vencimento}</p>
                                </div>
                              </div>
                              
                              {crediarioVenda.observacoes && (
                                <div className="mt-3 p-2 bg-purple-100 border border-purple-200 rounded text-sm">
                                  <span className="font-medium text-purple-800">Observações: </span>
                                  <span className="text-purple-700">{crediarioVenda.observacoes}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Sale Modal */}
      {editingSale && (
        <EditSaleModal
          open={!!editingSale}
          onClose={() => setEditingSale(null)}
          sale={editingSale}
        />
      )}
    </>
  );
};

export default ClientHistoryModal;
