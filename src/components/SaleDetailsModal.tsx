import React, { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { X, Edit } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useData } from '@/contexts/DataContext';
import EditPaymentModal from './EditPaymentModal';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { toLocalISODate } from '@/lib/utils';
interface SaleDetailsModalProps {
  open: boolean;
  onClose: () => void;
  sale: any;
}
const SaleDetailsModal = ({
  open,
  onClose,
  sale
}: SaleDetailsModalProps) => {
  const {
    clients,
    products,
    installments,
    parcelasCrediario,
    crediarioVendas
  } = useData();
  const [editingInstallment, setEditingInstallment] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [saleItems, setSaleItems] = useState<any[]>([]);

  // Buscar itens da venda se for multi-produto
  React.useEffect(() => {
    const fetchSaleItems = async () => {
      if (sale?.is_multi_product) {
        const { data, error } = await supabase
          .from('sale_items')
          .select('*')
          .eq('sale_id', sale.id);
          
        if (!error && data) {
          setSaleItems(data);
        }
      } else {
        setSaleItems([]);
      }
    };
    
    if (sale?.id) {
      fetchSaleItems();
    }
  }, [sale]);

  // Função para editar pagamento da parcela
  const handleEditPayment = (installment: any) => {
    setEditingInstallment(installment);
    setIsEditModalOpen(true);
  };

  // Função para salvar pagamento editado
  const handleSavePayment = async (id: string, valorPago: number, observacoes: string, dataValorPago: string) => {
    try {
      if (sale.payment_method === 'Crediário') {
        // Atualizar parcela de crediário
        await supabase.from('parcelas_crediario').update({
          valor_pago: valorPago,
          observacoes: observacoes,
          data_valor_pago: dataValorPago || null,
          status: valorPago > 0 ? 'pago' : 'pendente',
          data_pagamento: valorPago > 0 ? toLocalISODate() : null,
          updated_at: new Date().toISOString()
        }).eq('id', id);
      } else {
        // Atualizar parcela de venda normal
        await supabase.from('parcelas_venda').update({
          valor_pago: valorPago,
          status: valorPago > 0 ? 'pago' : 'pendente',
          data_pagamento: valorPago > 0 ? toLocalISODate() : null,
          updated_at: new Date().toISOString()
        }).eq('id', id);
      }
      toast.success('Pagamento atualizado com sucesso!');

      // Recarregar dados
      window.location.reload();
    } catch (error) {
      console.error('Erro ao atualizar pagamento:', error);
      toast.error('Erro ao atualizar pagamento');
    }
  };
  if (!sale) return null;

  // Função para obter nome do cliente
  const getClientName = (clientId: string | null) => {
    if (!clientId) return 'Sem cadastro';
    const client = clients.find(c => c.id === clientId);
    return client?.name || 'Cliente não encontrado';
  };

  // Função para obter nome do produto
  const getProductName = (productId: string) => {
    const product = products.find(p => p.id === productId);
    return product?.name || 'Produto não encontrado';
  };

  // Função para formatar valor
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Função para formatar data
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';

    // Se já está no formato dd/MM/yyyy, retorna direto
    if (dateString.includes('/')) {
      return dateString;
    }

    // Para formato YYYY-MM-DD
    const [year, month, day] = dateString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const correctedDay = date.getDate().toString().padStart(2, '0');
    const correctedMonth = (date.getMonth() + 1).toString().padStart(2, '0');
    const correctedYear = date.getFullYear();
    return `${correctedDay}/${correctedMonth}/${correctedYear}`;
  };

  // Função para obter quantidade de parcelas
  const getInstallmentCount = () => {
    if (sale.payment_method === 'À vista') return 1;

    // Se for parcela de crediário, buscar pela venda original
    if (sale.payment_method === 'Crediário') {
      const vendaOriginalId = sale.isParcelaCrediario ? sale.parcelaInfo?.vendaOriginalId : sale.id;
      const crediarioVenda = crediarioVendas.find(v => v.id === vendaOriginalId);
      return crediarioVenda?.numero_parcelas || 1;
    }
    const match = sale.payment_method?.match(/(\d+)x/);
    return match ? parseInt(match[1]) : 1;
  };

  // Função para obter status da venda
  const getSaleStatus = () => {
    if (['Dinheiro', 'Cartão de Débito', 'Cartão de Crédito', 'PIX'].includes(sale.payment_method || '')) {
      return 'Pago';
    }

    // Se for venda de crediário, verificar parcelas de crediário
    if (sale.payment_method === 'Crediário') {
      const vendaOriginalId = sale.isParcelaCrediario ? sale.parcelaInfo?.vendaOriginalId : sale.id;
      const crediarioInstallments = parcelasCrediario.filter(p => p.crediario_venda_id === vendaOriginalId);
      if (crediarioInstallments.length === 0) return 'Pago';
      const hasPending = crediarioInstallments.some(p => p.status === 'pendente');
      return hasPending ? 'Pendente' : 'Pago';
    }
    const saleInstallments = installments.filter(i => i.venda_id === sale.id);
    if (saleInstallments.length === 0) return 'Pago';
    const hasPending = saleInstallments.some(i => i.status === 'pendente');
    return hasPending ? 'Pendente' : 'Pago';
  };

  // Obter parcelas para mostrar se status for pendente
  const getSaleInstallments = () => {
    if (sale.payment_method === 'Crediário') {
      const vendaOriginalId = sale.isParcelaCrediario ? sale.parcelaInfo?.vendaOriginalId : sale.id;
      return parcelasCrediario.filter(p => p.crediario_venda_id === vendaOriginalId);
    }
    return installments.filter(i => i.venda_id === sale.id);
  };
  const status = getSaleStatus();
  const installmentCount = getInstallmentCount();
  const saleInstallments = getSaleInstallments();

  // Calcular juros
  const getJuros = () => {
    if (sale.juros_parcelamento) {
      return sale.juros_parcelamento;
    }
    return 0;
  };

  // Função para obter informações do cliente
  const getClientInfo = () => {
    if (!sale.client_id) return {
      name: 'Sem cadastro',
      phone: '-'
    };
    const client = clients.find(c => c.id === sale.client_id);
    return {
      name: client?.name || 'Cliente não encontrado',
      phone: client?.phone || '-'
    };
  };

  // Calcular valores financeiros
  const getFinancialSummary = () => {
    // Se for parcela de crediário, buscar dados da venda original
    if (sale.isParcelaCrediario && sale.parcelaInfo) {
      const vendaOriginal = crediarioVendas.find(v => v.id === sale.parcelaInfo.vendaOriginalId);
      if (vendaOriginal) {
        const totalValue = vendaOriginal.valor_total;
        const discount = vendaOriginal.desconto || 0;
        const downPayment = vendaOriginal.valor_entrada || 0;
        const interest = getJuros();
        let paidAmount = 0;
        let pendingAmount = totalValue;
        if (status === 'Pago') {
          paidAmount = totalValue;
          pendingAmount = 0;
        } else if (saleInstallments.length > 0) {
          paidAmount = saleInstallments.reduce((sum, i) => {
            return sum + ((i as any).valor_pago || 0);
          }, 0);
          pendingAmount = totalValue - paidAmount;
        }
        return {
          totalValue,
          discount,
          downPayment,
          interest,
          paidAmount,
          pendingAmount
        };
      }
    }

    // Lógica original para vendas normais
    const totalValue = sale.total_value;
    const discount = sale.desconto || 0;
    const downPayment = 0; // Vendas regulares não têm entrada
    const interest = getJuros();
    let paidAmount = 0;
    let pendingAmount = totalValue;
    if (status === 'Pago') {
      paidAmount = totalValue;
      pendingAmount = 0;
    } else if (saleInstallments.length > 0) {
      paidAmount = saleInstallments.reduce((sum, i) => {
        return sum + ((i as any).valor_pago || 0);
      }, 0);
      pendingAmount = totalValue - paidAmount;
    }
    return {
      totalValue,
      discount,
      downPayment,
      interest,
      paidAmount,
      pendingAmount
    };
  };
  const clientInfo = getClientInfo();
  const financialSummary = getFinancialSummary();
  const progressPercentage = financialSummary.totalValue > 0 ? financialSummary.paidAmount / financialSummary.totalValue * 100 : 0;
  return <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between text-xl font-semibold">
            📋 Detalhes da Venda
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Seção: Informações do Cliente e Venda */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Informações do Cliente */}
            <div className="border rounded-lg p-4 space-y-3">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-blue-600">
                👤 Informações do Cliente
              </h3>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Nome:</label>
                <p className="text-lg font-medium">{clientInfo.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Telefone:</label>
                <p className="text-lg">{clientInfo.phone}</p>
              </div>
            </div>

            {/* Informações da Venda */}
            <div className="border rounded-lg p-4 space-y-3">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-blue-600">
                📊 Informações da Venda
              </h3>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Data da Venda:</label>
                <p className="text-lg">{formatDate(sale.sale_date)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status:</label>
                <div className="mt-1">
                  <Badge variant={status === 'Pago' ? 'default' : 'secondary'} className={status === 'Pago' ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'}>
                    {status === 'Pago' ? 'PAGO' : 'ATIVO'}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Forma de Pagamento:</label>
                <p className="text-lg">{sale.payment_method || 'Não informado'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Desconto:</label>
                <p className="text-lg">{formatCurrency(sale.desconto || 0)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Juros:</label>
                <p className="text-lg">{formatCurrency(sale.juros_parcelamento || 0)}</p>
              </div>
            </div>
          </div>

          {/* Resumo Financeiro */}
          <div className="border rounded-lg p-4">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-blue-600 mb-4">
              💰 Resumo Financeiro
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <label className="text-sm font-medium text-blue-600">Valor Total</label>
                <p className="text-xl font-bold text-blue-600">{formatCurrency(financialSummary.totalValue)}</p>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <label className="text-sm font-medium text-green-600">Valor da Entrada</label>
                <p className="text-xl font-bold text-green-600">{formatCurrency(financialSummary.downPayment)}</p>
              </div>
              
              <div className="bg-orange-50 p-4 rounded-lg text-center">
                <label className="text-sm font-medium text-orange-600">Valor Pago</label>
                <p className="text-xl font-bold text-orange-600">{formatCurrency(financialSummary.paidAmount)}</p>
              </div>
              
              <div className="bg-red-50 p-4 rounded-lg text-center">
                <label className="text-sm font-medium text-red-600">Valor Pendente</label>
                <p className="text-xl font-bold text-red-600">{formatCurrency(financialSummary.pendingAmount)}</p>
              </div>
            </div>

            {/* Barra de Progresso */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Progresso do Pagamento:</span>
                <span className="text-sm font-bold">{progressPercentage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className="bg-green-500 h-3 rounded-full transition-all duration-300" style={{
                width: `${progressPercentage}%`
              }} />
              </div>
              {saleInstallments.length > 0 && <p className="text-sm text-muted-foreground text-center">
                  {saleInstallments.filter(i => i.status === 'pago').length} de {installmentCount} parcelas pagas
                </p>}
            </div>
          </div>

          {/* Seção de Produtos */}
          <div className="border rounded-lg p-4">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-blue-600 mb-4">
              📦 {sale.is_multi_product ? 'Produtos da Venda' : 'Produto da Venda'}
            </h3>
            {sale.is_multi_product ? (
              <div className="space-y-3">
                {saleItems.map((item, index) => (
                  <div key={index} className="border-l-4 border-blue-500 pl-4 py-2 bg-blue-50 rounded-r-lg">
                    <p className="text-lg font-medium">{getProductName(item.product_id)}</p>
                    <div className="grid grid-cols-3 gap-4 mt-2 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Quantidade:</span> {item.quantity}
                      </div>
                      <div>
                        <span className="font-medium">Preço Unit.:</span> {formatCurrency(item.unit_price)}
                      </div>
                      <div>
                        <span className="font-medium">Total:</span> {formatCurrency(item.total_price)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border-l-4 border-blue-500 pl-4 py-2 bg-blue-50 rounded-r-lg">
                <p className="text-lg font-medium">{getProductName(sale.product_id)}</p>
                <div className="grid grid-cols-3 gap-4 mt-2 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Quantidade:</span> {sale.quantity}
                  </div>
                  <div>
                    <span className="font-medium">Preço Unit.:</span> {formatCurrency(sale.unit_price)}
                  </div>
                  <div>
                    <span className="font-medium">Total:</span> {formatCurrency(sale.total_value)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Observações */}
          {sale.observacoes && <div className="border rounded-lg p-4">
              <label className="text-sm font-medium text-muted-foreground">Observações:</label>
              <p className="text-lg mt-2 p-3 bg-muted rounded-md">{sale.observacoes}</p>
            </div>}

          {/* Detalhes das Parcelas - Mostrar apenas se houver parcelas */}
          {saleInstallments.length > 0 && <div className="border rounded-lg p-4">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-blue-600 mb-4">
                📅 Detalhes das Parcelas
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Parcela</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Valor Pago</TableHead>
                    <TableHead>Valor Restante</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Data Pagamento</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {saleInstallments.map((installment, index) => {
                const valorParcela = sale.payment_method === 'Crediário' ? (installment as any).valor_parcela : (installment as any).valor_da_parcela;
                const valorPago = (installment as any).valor_pago || 0;
                const valorRestante = valorPago > 0 ? Math.max(0, valorParcela - valorPago) : 0;
                return <TableRow key={installment.id}>
                        <TableCell>
                          {sale.payment_method === 'Crediário' ? 
                            ((installment as any).numero_parcela === 0 ? 'Entrada' : `${(installment as any).numero_parcela}° parcela`) : 
                            `${(installment as any).numero_da_parcela || index + 1}° parcela`}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
                            Parcela
                          </Badge>
                        </TableCell>
                        <TableCell className="bg-transparent">
                          {formatCurrency(valorParcela)}
                        </TableCell>
                        <TableCell className="bg-transparent">
                          {formatCurrency(valorPago)}
                        </TableCell>
                        <TableCell className="bg-transparent">
                          {formatCurrency(valorRestante)}
                        </TableCell>
                        <TableCell>
                          {sale.payment_method === 'Crediário' ? formatDate((installment as any).data_vencimento) : (installment as any).data_de_vencimento}
                        </TableCell>
                        <TableCell>
                          {installment.data_pagamento ? formatDate(installment.data_pagamento) : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={installment.status === 'pago' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-yellow-50 text-yellow-600 border-yellow-200'}>
                            {installment.status === 'pago' ? 'pago' : 'pendente'}
                          </Badge>
                        </TableCell>
                      </TableRow>;
              })}
                </TableBody>
              </Table>
            </div>}
        </div>
      </DialogContent>
      
      {/* Modal de Edição de Pagamento */}
      <EditPaymentModal isOpen={isEditModalOpen} onClose={() => {
      setIsEditModalOpen(false);
      setEditingInstallment(null);
    }} installment={editingInstallment} onSave={handleSavePayment} />
    </Dialog>;
};
export default SaleDetailsModal;