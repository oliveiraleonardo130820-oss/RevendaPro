import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';
import { useCrediario } from '@/contexts/CrediarioContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { Search, Calendar, Edit } from 'lucide-react';
import EditPaymentModal from '@/components/EditPaymentModal';
import { supabase } from '@/integrations/supabase/client';

type FilterType = 'overdue' | 'pending' | 'paid' | 'partial' | 'all';

const InstallmentsControl = () => {
  const { installments, clients, sales, products, updateInstallmentStatus, refreshData } = useData();
  const { parcelas: parcelasCrediario, vendas: vendasCrediario, atualizarStatusParcela, loadVendas, loadParcelas } = useCrediario();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState<any>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Reload data when component mounts to ensure fresh data
  useEffect(() => {
    refreshData?.();
    loadVendas?.();
    loadParcelas?.();
  }, []);

  const getClientName = (saleId: string, isCrediario: boolean = false) => {
    if (isCrediario) {
      const venda = vendasCrediario.find(v => v.id === saleId);
      if (!venda) return 'Cliente não encontrado';
      
      const client = clients.find(c => c.id === venda.client_id);
      return client?.name || 'Cliente não encontrado';
    } else {
      const sale = sales.find(s => s.id === saleId);
      if (!sale) return 'Cliente não encontrado';
      
      const client = clients.find(c => c.id === sale.client_id);
      return client?.name || 'Cliente não encontrado';
    }
  };

  const getProductName = (saleId: string, isCrediario: boolean = false) => {
    if (isCrediario) {
      const venda = vendasCrediario.find(v => v.id === saleId);
      if (!venda || !venda.produto_id) return 'Crediário';
      
      const product = products.find(p => p.id === venda.produto_id);
      return product?.name || 'Produto não encontrado';
    } else {
      const sale = sales.find(s => s.id === saleId);
      if (!sale) return 'Produto não encontrado';
      
      const product = products.find(p => p.id === sale.product_id);
      return product?.name || 'Produto não encontrado';
    }
  };

  // Combinar parcelas normais e de crediário
  const allInstallments = useMemo(() => {
    const normalInstallments = installments.map(installment => ({
      ...installment,
      isCrediario: false,
      data_vencimento: installment.data_de_vencimento,
      valor_parcela: installment.valor_da_parcela,
      numero_parcela: installment.numero_da_parcela,
      valor_pago: installment.valor_pago || 0
    }));

    const crediarioInstallments = parcelasCrediario.map(parcela => ({
      ...parcela,
      isCrediario: true,
      venda_id: parcela.crediario_venda_id,
      data_vencimento: parcela.data_vencimento,
      valor_parcela: parcela.valor_parcela,
      numero_parcela: parcela.numero_parcela,
      valor_pago: (parcela as any).valor_pago || 0
    }));

    return [...normalInstallments, ...crediarioInstallments];
  }, [installments, parcelasCrediario]);

  // Helper function to determine if an installment is overdue
  const isInstallmentOverdue = (installment: any) => {
    return installment.status === 'pendente' && new Date(installment.data_vencimento) < today;
  };

  // Helper function to determine if an installment is partial
  const isInstallmentPartial = (installment: any) => {
    const valorPago = Number(installment.valor_pago) || 0;
    const valorParcela = Number(installment.valor_parcela);
    return valorPago > 0 && valorPago < valorParcela;
  };

  const filteredInstallments = useMemo(() => {
    let filtered = allInstallments;

    // Apply status filter
    switch (activeFilter) {
      case 'overdue':
        filtered = allInstallments.filter(installment => isInstallmentOverdue(installment));
        break;
      case 'pending':
        filtered = allInstallments.filter(installment => 
          installment.status === 'pendente' && 
          new Date(installment.data_vencimento) >= today
        );
        break;
      case 'paid':
        filtered = allInstallments.filter(installment => 
          installment.status === 'pago' || 
          (Number(installment.valor_pago) || 0) >= Number(installment.valor_parcela)
        );
        break;
      case 'partial':
        filtered = allInstallments.filter(installment => 
          isInstallmentPartial(installment) && 
          installment.status !== 'pago' && 
          (Number(installment.valor_pago) || 0) < Number(installment.valor_parcela)
        );
        break;
      default:
        filtered = allInstallments;
    }

    // Apply date range filter
    if (startDate || endDate) {
      filtered = filtered.filter(installment => {
        const installmentDate = new Date(installment.data_vencimento);
        
        if (startDate && endDate) {
          const start = new Date(startDate);
          const end = new Date(endDate);
          return installmentDate >= start && installmentDate <= end;
        } else if (startDate) {
          const start = new Date(startDate);
          return installmentDate >= start;
        } else if (endDate) {
          const end = new Date(endDate);
          return installmentDate <= end;
        }
        
        return true;
      });
    }

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(installment => {
        const clientName = getClientName(installment.venda_id, installment.isCrediario).toLowerCase();
        const productName = getProductName(installment.venda_id, installment.isCrediario).toLowerCase();
        return clientName.includes(searchLower) || productName.includes(searchLower);
      });
    }

    // Ordenar: primeiro por status (pendentes primeiro, pagos no final),
    // depois por nome do cliente em ordem alfabética,
    // e finalmente por número da parcela
    return filtered.sort((a, b) => {
      // Primeiro critério: status (pendentes primeiro, pagos por último)
      const statusA = a.status === 'pago' || (Number(a.valor_pago) || 0) >= Number(a.valor_parcela) ? 1 : 0;
      const statusB = b.status === 'pago' || (Number(b.valor_pago) || 0) >= Number(b.valor_parcela) ? 1 : 0;
      
      if (statusA !== statusB) {
        return statusA - statusB;
      }
      
      // Segundo critério: nome do cliente em ordem alfabética
      const clientNameA = getClientName(a.venda_id, a.isCrediario).toLowerCase();
      const clientNameB = getClientName(b.venda_id, b.isCrediario).toLowerCase();
      
      if (clientNameA !== clientNameB) {
        return clientNameA.localeCompare(clientNameB);
      }
      
      // Terceiro critério: número da parcela em ordem numérica
      return (a.numero_parcela || 0) - (b.numero_parcela || 0);
    });
  }, [allInstallments, activeFilter, searchTerm, startDate, endDate, today, sales, clients, products, vendasCrediario]);

  const getStatusBadge = (installment: any) => {
    if (installment.status === 'pago') {
      return <Badge variant="default" className="bg-green-500 text-white">Pago</Badge>;
    }
    
    // Verificar se é pagamento parcial
    if (isInstallmentPartial(installment)) {
      return <Badge variant="default" className="bg-yellow-500 text-white">Parcial</Badge>;
    }
    
    // Se o status é pendente, verificar se está vencida
    if (installment.status === 'pendente') {
      const isOverdue = isInstallmentOverdue(installment);
      return (
        <Badge variant={isOverdue ? "destructive" : "secondary"}>
          {isOverdue ? 'Vencida' : 'Pendente'}
        </Badge>
      );
    }
    
    // Fallback para outros status
    return <Badge variant="secondary">Pendente</Badge>;
  };

  const handleStatusChange = async (installmentId: string, newStatus: string) => {
    try {
      // Verificar se é uma parcela de crediário ou normal
      const installment = allInstallments.find(i => i.id === installmentId);
      if (!installment) {
        toast.error('Parcela não encontrada');
        return;
      }

      // Usar data atual do sistema local
      const today = new Date();
      // Forçar uso da data atual sem conversões de fuso horário
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const localDateString = `${year}-${month}-${day}`;
      
      console.log('Data sendo definida para pagamento:', localDateString, 'Data atual:', today);

      const updateData = {
        status: newStatus,
        updated_at: new Date().toISOString(),
        ...(newStatus === 'pago' && { data_pagamento: localDateString })
      };

      if (installment.isCrediario) {
        const { error } = await supabase
          .from('parcelas_crediario')
          .update(updateData)
          .eq('id', installmentId);
        
        if (error) throw error;
        await atualizarStatusParcela(installmentId, newStatus as 'pago' | 'pendente', newStatus === 'pago' ? localDateString : undefined);
      } else {
        const { error } = await supabase
          .from('parcelas_venda')
          .update(updateData)
          .eq('id', installmentId);
        
        if (error) throw error;
        await updateInstallmentStatus(installmentId, newStatus);
      }
      
      toast.success('Status da parcela atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status da parcela');
    }
  };

  const handleEditPayment = (installment: any) => {
    setSelectedInstallment(installment);
    setEditModalOpen(true);
  };

  const handleSavePayment = async (installmentId: string, valorPago: number, observacoes: string, dataValorPago: string) => {
    try {
      const installment = allInstallments.find(i => i.id === installmentId);
      if (!installment) {
        toast.error('Parcela não encontrada');
        return;
      }

      const valorParcela = Number(installment.valor_parcela);
      let newStatus = 'pendente';
      
      if (valorPago >= valorParcela) {
        newStatus = 'pago';
      } else if (valorPago > 0) {
        newStatus = 'pendente'; // parcial será detectado pela função isInstallmentPartial
      }

      if (installment.isCrediario) {
        // Para crediário, atualizar na tabela parcelas_crediario
        const { error } = await supabase
          .from('parcelas_crediario')
          .update({
            valor_pago: valorPago,
            observacoes,
            data_valor_pago: dataValorPago || null,
            status: newStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', installmentId);

        if (error) throw error;
        await atualizarStatusParcela(installmentId, newStatus as 'pago' | 'pendente');
      } else {
        // Para vendas normais, atualizar na tabela parcelas_venda
        const { error } = await supabase
          .from('parcelas_venda')
          .update({
            valor_pago: valorPago,
            observacoes,
            data_pagamento: dataValorPago || null,
            status: newStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', installmentId);

        if (error) throw error;
        await updateInstallmentStatus(installmentId, newStatus);
      }

      toast.success('Pagamento atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar pagamento:', error);
      toast.error('Erro ao salvar pagamento');
    }
  };

  const getFilterCounts = () => {
    const overdue = allInstallments.filter(i => isInstallmentOverdue(i)).length;
    
    const pending = allInstallments.filter(i => 
      i.status === 'pendente' && new Date(i.data_vencimento) >= today && !isInstallmentPartial(i)
    ).length;
    
    const paid = allInstallments.filter(i => 
      i.status === 'pago' || 
      (Number(i.valor_pago) || 0) >= Number(i.valor_parcela)
    ).length;
    const partial = allInstallments.filter(i => 
      isInstallmentPartial(i) && 
      i.status !== 'pago' && 
      (Number(i.valor_pago) || 0) < Number(i.valor_parcela)
    ).length;
    
    return { overdue, pending, paid, partial };
  };

  const { overdue, pending, paid, partial } = getFilterCounts();

  const clearDateFilters = () => {
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Controle de Parcelas</h1>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-4 flex-wrap">
        <Button
          variant={activeFilter === 'all' ? 'default' : 'outline'}
          onClick={() => setActiveFilter('all')}
        >
          Todas ({allInstallments.length})
        </Button>
        <Button
          variant={activeFilter === 'overdue' ? 'default' : 'outline'}
          onClick={() => setActiveFilter('overdue')}
          className={activeFilter === 'overdue' ? 'bg-red-500 hover:bg-red-600' : 'text-red-500 border-red-500 hover:bg-red-50'}
        >
          🔴 Vencidas ({overdue})
        </Button>
        <Button
          variant={activeFilter === 'pending' ? 'default' : 'outline'}
          onClick={() => setActiveFilter('pending')}
          className={activeFilter === 'pending' ? 'bg-yellow-500 hover:bg-yellow-600' : 'text-yellow-600 border-yellow-500 hover:bg-yellow-50'}
        >
          🟡 Pendentes ({pending})
        </Button>
        <Button
          variant={activeFilter === 'paid' ? 'default' : 'outline'}
          onClick={() => setActiveFilter('paid')}
          className={activeFilter === 'paid' ? 'bg-green-500 hover:bg-green-600' : 'text-green-600 border-green-500 hover:bg-green-50'}
        >
          🟢 Pagas ({paid})
        </Button>
        <Button
          variant={activeFilter === 'partial' ? 'default' : 'outline'}
          onClick={() => setActiveFilter('partial')}
          className={activeFilter === 'partial' ? 'bg-orange-500 hover:bg-orange-600' : 'text-orange-600 border-orange-500 hover:bg-orange-50'}
        >
          🟠 Parciais ({partial})
        </Button>
      </div>

      {/* Date Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
        {/* Date Range Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="space-y-2">
            <Label htmlFor="start-date" className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Data Inicial
            </Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full sm:w-40"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="end-date" className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Data Final
            </Label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full sm:w-40"
            />
          </div>

          {(startDate || endDate) && (
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={clearDateFilters}
                className="h-10"
              >
                Limpar Datas
              </Button>
            </div>
          )}
        </div>

        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Pesquisar por cliente ou produto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Active Filters Display */}
      {(startDate || endDate || searchTerm) && (
        <div className="flex flex-wrap gap-2 items-center text-sm text-gray-600">
          <span>Filtros ativos:</span>
          {startDate && (
            <Badge variant="secondary">
              A partir de: {format(new Date(startDate), 'dd/MM/yyyy', { locale: ptBR })}
            </Badge>
          )}
          {endDate && (
            <Badge variant="secondary">
              Até: {format(new Date(endDate), 'dd/MM/yyyy', { locale: ptBR })}
            </Badge>
          )}
          {searchTerm && (
            <Badge variant="secondary">
              Busca: "{searchTerm}"
            </Badge>
          )}
        </div>
      )}

      {/* Installments Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {activeFilter === 'all' && 'Todas as Parcelas'}
            {activeFilter === 'overdue' && 'Parcelas Vencidas'}
            {activeFilter === 'pending' && 'Parcelas Pendentes'}
            {activeFilter === 'paid' && 'Parcelas Pagas'}
            {(startDate || endDate || searchTerm) && ' - Filtrado'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredInstallments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm || startDate || endDate ? 
                'Nenhuma parcela encontrada para os filtros aplicados.' :
                'Nenhuma parcela encontrada para o filtro selecionado.'
              }
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Parcela</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data Pago</TableHead>
                  <TableHead>Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInstallments.map((installment) => (
                  <TableRow key={installment.id}>
                     <TableCell className="font-medium">
                       {getClientName(installment.venda_id, installment.isCrediario)}
                     </TableCell>
                     <TableCell>
                       {getProductName(installment.venda_id, installment.isCrediario)}
                     </TableCell>
                     <TableCell>
                       {installment.numero_parcela === 0 ? "entrada" : `${installment.numero_parcela}ª parcela`}
                     </TableCell>
                      <TableCell>
                        {(() => {
                          const valorPago = Number(installment.valor_pago) || 0;
                          const valorParcela = Number(installment.valor_parcela);
                          const valorRestante = valorParcela - valorPago;
                          
                          if (valorPago > 0 && valorPago < valorParcela) {
                            return (
                              <div className="text-sm">
                                <div className="font-medium text-green-600">
                                  R$ {valorPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} pagos
                                </div>
                                <div className="text-orange-600">
                                  R$ {valorRestante.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} restante
                                </div>
                                <div className="text-xs text-gray-500">
                                  de R$ {valorParcela.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </div>
                              </div>
                            );
                          }
                          
                          return (
                            <div>
                              R$ {valorParcela.toLocaleString('pt-BR', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              })}
                              {valorPago > 0 && (
                                <div className="text-xs text-green-600">
                                  (R$ {valorPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} pagos)
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </TableCell>
                     <TableCell>
                       {format(new Date(installment.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })}
                     </TableCell>
                     <TableCell>
                        {getStatusBadge(installment)}
                      </TableCell>
                       <TableCell>
                         {(installment as any).data_pagamento ? (
                           <span className="text-sm text-green-600">
                             {format(new Date((installment as any).data_pagamento), 'dd/MM/yyyy', { locale: ptBR })}
                           </span>
                         ) : (
                           <span className="text-gray-400 text-sm">-</span>
                         )}
                       </TableCell>
                       <TableCell>
                        <div className="flex gap-2">
                         <Button
                           size="sm"
                           variant="outline"
                           onClick={() => handleEditPayment(installment)}
                           className="flex items-center gap-1"
                         >
                           <Edit className="h-3 w-3" />
                           Editar pagamento
                         </Button>
                         {installment.status === 'pendente' ? (
                           <Button
                             size="sm"
                             onClick={() => handleStatusChange(installment.id, 'pago')}
                             className="bg-green-500 hover:bg-green-600"
                           >
                             Marcar como Pago
                           </Button>
                         ) : (
                           <Button
                             size="sm"
                             variant="outline"
                             onClick={() => handleStatusChange(installment.id, 'pendente')}
                           >
                             Marcar como Pendente
                           </Button>
                         )}
                       </div>
                     </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Payment Modal */}
      <EditPaymentModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        installment={selectedInstallment}
        onSave={handleSavePayment}
      />
    </div>
  );
};

export default InstallmentsControl;
