import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  ShoppingCart, 
  CalendarIcon, 
  Filter, 
  Edit, 
  Trash2, 
  Eye,
  PlusIcon,
  UserIcon,
  CreditCardIcon,
  SearchIcon,
  CheckIcon,
  XIcon,
  ClockIcon,
  EyeIcon,
  EditIcon,
  TrashIcon
} from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import EditSaleModal from '@/components/EditSaleModal';
import SaleDetailsModal from '@/components/SaleDetailsModal';
import CrediarioDetalhesModal from '@/components/CrediarioDetalhesModal';
import EditCrediarioModal from '@/components/EditCrediarioModal';
import { useCrediario } from '@/contexts/CrediarioContext';
import { toast } from 'sonner';
import { parseISO, isBefore, isToday } from 'date-fns';
const Sales = () => {
  const {
    sales,
    clients,
    products,
    deleteSale,
    installments,
    crediarioVendas,
    parcelasCrediario
  } = useData();
  const { vendas, parcelas, loading, loadVendas, loadParcelas, atualizarStatusParcela, editarVendaCrediario, deletarVendaCrediario } = useCrediario();
  
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('thisMonth');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('vendas');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVenda, setSelectedVenda] = useState<any>(null);
  const [crediarioDetalhesModalOpen, setCrediarioDetalhesModalOpen] = useState(false);
  const [crediarioEditModalOpen, setCrediarioEditModalOpen] = useState(false);
  // Filtros específicos para crediário
  const [crediarioStartDate, setCrediarioStartDate] = useState<Date>();
  const [crediarioEndDate, setCrediarioEndDate] = useState<Date>();
  const [crediarioSelectedPeriod, setCrediarioSelectedPeriod] = useState<string>('thisMonth');

  useEffect(() => {
    loadVendas();
    loadParcelas();
  }, []);

  // Converter parcelas de crediário PAGAS e PARCIAIS para aparecerem como vendas
  const crediarioSalesAsNormalSales = parcelasCrediario.filter(parcela => 
    parcela.status === 'pago' || (parcela.valor_pago > 0 && parcela.status === 'pendente') // Incluir parciais
  )
  .map(parcela => {
    const vendaOriginal = crediarioVendas.find(v => v.id === parcela.crediario_venda_id);
    if (!vendaOriginal) return null;
    
    // Usar data_valor_pago se disponível, senão usar data_pagamento ou data da venda
    const dataParaMostrar = parcela.data_valor_pago || parcela.data_pagamento || vendaOriginal.data_venda;
    
    return {
      id: `${parcela.crediario_venda_id}-parcela-${parcela.numero_parcela}`,
      product_id: vendaOriginal.produto_id || '',
      client_id: vendaOriginal.client_id,
      total_value: vendaOriginal.valor_total, // Mostrar valor total original do produto
      sale_date: dataParaMostrar, // Usar data_valor_pago para filtros de período
      sale_date_original: vendaOriginal.data_venda,
      payment_method: 'Crediário',
      quantity: 1,
      unit_price: vendaOriginal.valor_total, // Mostrar preço original do produto
      commission: 0,
      user_id: vendaOriginal.user_id,
      created_at: vendaOriginal.created_at,
      juros_parcelamento: null,
      loja_id: vendaOriginal.loja_id,
      due_date: parcela.data_vencimento,
      observacoes: vendaOriginal.observacoes,
      desconto: 0,
      isCrediario: true,
      isParcelaCrediario: true,
      parcelaInfo: {
        numero: parcela.numero_parcela,
        vendaOriginalId: parcela.crediario_venda_id,
        status: parcela.status,
        dataVenda: vendaOriginal.data_venda,
        dataVencimento: parcela.data_vencimento,
        valorPago: parcela.valor_pago,
        valorParcela: parcela.valor_parcela,
        dataValorPago: parcela.data_valor_pago
      }
    };
  }).filter(Boolean);

  // Processar vendas normais para usar a data correta para filtros
  const processedNormalSales = sales.map(sale => {
    // Para pagamentos à vista, usar sempre a data da venda
    if (['Dinheiro', 'Cartão de Débito', 'Cartão de Crédito', 'PIX'].includes(sale.payment_method || '')) {
      return {
        ...sale,
        sale_date: sale.sale_date // Manter a data da venda para filtros de período
      };
    }
    return sale;
  });

  // Combinar vendas normais processadas e de crediário
  const allSales = [...processedNormalSales, ...crediarioSalesAsNormalSales];

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

  // Função para obter quantidade de parcelas
  const getInstallmentCount = (sale: any) => {
    if (sale.payment_method === 'À vista') return 1;

    // Se for parcela de crediário, mostrar informação da parcela
    if (sale.isParcelaCrediario && sale.parcelaInfo) {
      return sale.parcelaInfo.numero === 0 ? 'Entrada' : `${sale.parcelaInfo.numero}ª parcela`;
    }

    // Se for venda de crediário, buscar na tabela crediario_vendas
    if (sale.payment_method === 'Crediário') {
      const crediarioVenda = crediarioVendas.find(v => v.id === sale.id);
      return crediarioVenda?.numero_parcelas || 1;
    }
    const match = sale.payment_method?.match(/(\d+)x/);
    return match ? parseInt(match[1]) : 1;
  };

  // Função para obter status da venda
  const getSaleStatus = (saleId: string) => {
    const sale = allSales.find(s => s.id === saleId);
    if (sale && ['Dinheiro', 'Cartão de Débito', 'Cartão de Crédito', 'PIX'].includes(sale.payment_method || '')) {
      return 'Pago';
    }

    // Se for parcela de crediário, retornar status da parcela
    if (sale && (sale as any).isParcelaCrediario && (sale as any).parcelaInfo) {
      return (sale as any).parcelaInfo.status === 'pago' ? 'Pago' : 'Pendente';
    }

    // Se for venda de crediário, verificar parcelas de crediário
    if (sale && sale.payment_method === 'Crediário') {
      const crediarioInstallments = parcelasCrediario.filter(p => p.crediario_venda_id === saleId);
      if (crediarioInstallments.length === 0) return 'Pago';
      const hasPending = crediarioInstallments.some(p => p.status === 'pendente');
      return hasPending ? 'Pendente' : 'Pago';
    }
    const saleInstallments = installments.filter(i => i.venda_id === saleId);
    if (saleInstallments.length === 0) return 'Pago'; // À vista antigo

    const hasPending = saleInstallments.some(i => i.status === 'pendente');
    return hasPending ? 'Pendente' : 'Pago';
  };

  // Função para filtrar por período
  const getFilteredSalesByPeriod = (salesData: any[]) => {
    if (selectedPeriod === 'all') return salesData;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Map de meses para números
    const monthMap: Record<string, number> = {
      'january': 0,
      'february': 1,
      'march': 2,
      'april': 3,
      'may': 4,
      'june': 5,
      'july': 6,
      'august': 7,
      'september': 8,
      'october': 9,
      'november': 10,
      'december': 11
    };
    switch (selectedPeriod) {
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
        const targetMonth = monthMap[selectedPeriod];
        return salesData.filter(sale => {
          const saleDate = new Date(sale.sale_date + 'T00:00:00');
          return saleDate.getMonth() === targetMonth && saleDate.getFullYear() === currentYear;
        });
      default:
        return salesData;
    }
  };

  // Aplicar filtros e ordenação em todas as vendas
  const filteredSales = getFilteredSalesByPeriod(allSales).filter(sale => {
    // Filtro de período
    if (startDate && endDate) {
      const saleDate = new Date(sale.sale_date);
      if (saleDate < startDate || saleDate > endDate) return false;
    }

    // Filtro de forma de pagamento
    if (paymentMethodFilter !== 'all') {
      if (paymentMethodFilter === 'dinheiro' && sale.payment_method !== 'Dinheiro') return false;
      if (paymentMethodFilter === 'cartao' && !['Cartão de Débito', 'Cartão de Crédito'].includes(sale.payment_method || '')) return false;
      if (paymentMethodFilter === 'pix' && sale.payment_method !== 'PIX') return false;
      if (paymentMethodFilter === 'parcelado' && !sale.payment_method?.includes('x')) return false;
      if (paymentMethodFilter === 'crediario' && sale.payment_method !== 'Crediário') return false;
    }

    // Filtro de status
    if (statusFilter !== 'all') {
      const currentStatus = getSaleStatus(sale.id);
      if (statusFilter === 'pago' && currentStatus !== 'Pago') return false;
      if (statusFilter === 'pendente' && currentStatus !== 'Pendente') return false;
    }
    return true;
  }).sort((a, b) => {
    // Ordenar por data em ordem decrescente (mais recente primeiro)
    const dateComparison = new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime();
    if (dateComparison !== 0) return dateComparison;

    // Se as datas são iguais, ordenar por cliente alfabeticamente
    const clientA = getClientName(a.client_id).toLowerCase();
    const clientB = getClientName(b.client_id).toLowerCase();
    const clientComparison = clientA.localeCompare(clientB);
    if (clientComparison !== 0) return clientComparison;

    // Se cliente é igual, ordenar por produto alfabeticamente
    const productA = getProductName(a.product_id).toLowerCase();
    const productB = getProductName(b.product_id).toLowerCase();
    return productA.localeCompare(productB);
  });

  // Calcular total das vendas (somar cada venda apenas uma vez)
  const seen = new Set<string>();
  const totalSales = filteredSales.reduce((sum, sale: any) => {
    const key = sale?.isParcelaCrediario && sale?.parcelaInfo?.vendaOriginalId
      ? `crediario-${sale.parcelaInfo.vendaOriginalId}`
      : sale.id;
    if (seen.has(key)) return sum;
    seen.add(key);
    return sum + Number(sale.total_value || 0);
  }, 0);

  // Total pago no período (somente valores efetivamente pagos)
  const totalPaid = filteredSales.reduce((sum, sale: any) => {
    // Parcelas de crediário entram com o valor efetivamente pago
    if (sale?.isParcelaCrediario && sale?.parcelaInfo) {
      return sum + Number(sale.parcelaInfo.valorPago || 0);
    }
    // A venda "mãe" de crediário não soma aqui para evitar duplicidade; os pagamentos já vêm pelas parcelas
    if (sale?.payment_method === 'Crediário') {
      return sum;
    }
    // Vendas normais parceladas: somar o que foi pago nas parcelas_venda
    const saleInstallments = installments.filter((inst: any) => inst.venda_id === sale.id);
    if (saleInstallments.length > 0) {
      const pago = saleInstallments.reduce((acc: number, inst: any) => acc + Number(inst.valor_pago || 0), 0);
      return sum + pago;
    }
    // À vista: valor pago é o total
    return sum + Number(sale.total_value || 0);
  }, 0);

  // Função para formatar valor
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Função para formatar data
  const formatDate = (dateString: string) => {
    // Criar a data tratando como data local (não UTC)
    const [year, month, day] = dateString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return format(date, 'dd/MM/yyyy', {
      locale: ptBR
    });
  };

  // Função para ver detalhes da venda
  const handleViewSaleDetails = (sale: any) => {
    setSelectedSale(sale);
    setDetailsModalOpen(true);
  };

  // Função para editar venda
  const handleEditSale = (sale: any) => {
    setSelectedSale(sale);
    setEditModalOpen(true);
  };

  // Função para excluir venda
  const handleDeleteSale = async (saleId: string) => {
    if (confirm('Tem certeza que deseja excluir esta venda?')) {
      try {
        await deleteSale(saleId);
        toast.success('Venda excluída com sucesso!');
      } catch (error) {
        toast.error('Erro ao excluir venda');
        console.error('Erro ao excluir venda:', error);
      }
    }
  };

  // Função para fechar modais
  const handleCloseModal = () => {
    setEditModalOpen(false);
    setDetailsModalOpen(false);
    setSelectedSale(null);
  };

  // Funções do Crediário usando as mesmas funções já existentes

  const getStatusBadge = (status: string) => {
    const variants = {
      'ativo': 'default',
      'finalizado': 'secondary',
      'cancelado': 'destructive'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const getParcelaStatusBadge = (parcela: any) => {
    const hoje = new Date();
    const vencimento = parseISO(parcela.data_vencimento);
    
    if (parcela.status === 'pago') {
      return <Badge variant="default" className="bg-green-500"><CheckIcon className="h-3 w-3 mr-1" />Pago</Badge>;
    }
    
    if (isBefore(vencimento, hoje) && !isToday(vencimento)) {
      return <Badge variant="destructive"><XIcon className="h-3 w-3 mr-1" />Vencido</Badge>;
    }
    
    if (isToday(vencimento)) {
      return <Badge variant="secondary"><ClockIcon className="h-3 w-3 mr-1" />Vence Hoje</Badge>;
    }
    
    return <Badge variant="outline"><ClockIcon className="h-3 w-3 mr-1" />Pendente</Badge>;
  };

  // Função para filtrar vendas de crediário por período
  const getFilteredCrediarioByPeriod = (vendasData: any[]) => {
    if (crediarioSelectedPeriod === 'all') return vendasData;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Map de meses para números
    const monthMap: Record<string, number> = {
      'january': 0,
      'february': 1,
      'march': 2,
      'april': 3,
      'may': 4,
      'june': 5,
      'july': 6,
      'august': 7,
      'september': 8,
      'october': 9,
      'november': 10,
      'december': 11
    };

    switch (crediarioSelectedPeriod) {
      case 'thisMonth':
        return vendasData.filter(venda => {
          const vendaDate = new Date(venda.data_venda + 'T00:00:00');
          return vendaDate.getMonth() === currentMonth && vendaDate.getFullYear() === currentYear;
        });
      case 'lastMonth':
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        return vendasData.filter(venda => {
          const vendaDate = new Date(venda.data_venda + 'T00:00:00');
          return vendaDate.getMonth() === lastMonth && vendaDate.getFullYear() === lastMonthYear;
        });
      case 'last3Months':
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        return vendasData.filter(venda => new Date(venda.data_venda + 'T00:00:00') >= threeMonthsAgo);
      case 'thisYear':
        return vendasData.filter(venda => new Date(venda.data_venda + 'T00:00:00').getFullYear() === currentYear);
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
        const targetMonth = monthMap[crediarioSelectedPeriod];
        return vendasData.filter(venda => {
          const vendaDate = new Date(venda.data_venda + 'T00:00:00');
          return vendaDate.getMonth() === targetMonth && vendaDate.getFullYear() === currentYear;
        });
      default:
        return vendasData;
    }
  };

  const filteredVendas = getFilteredCrediarioByPeriod(vendas).filter(venda => {
    // Filtro de busca por cliente
    if (searchTerm) {
      const clientName = getClientName(venda.client_id || '').toLowerCase();
      if (!clientName.includes(searchTerm.toLowerCase())) return false;
    }

    // Filtro de data de início e fim
    if (crediarioStartDate && crediarioEndDate) {
      const vendaDate = new Date(venda.data_venda);
      if (vendaDate < crediarioStartDate || vendaDate > crediarioEndDate) return false;
    }

    return true;
  });

  const filteredParcelas = parcelas.filter(parcela => {
    if (!searchTerm) return true;
    const venda = vendas.find(v => v.id === parcela.crediario_venda_id);
    if (!venda) return false;
    const clientName = getClientName(venda.client_id || '').toLowerCase();
    return clientName.includes(searchTerm.toLowerCase());
  });

  const handleMarcarParcela = async (parcela: any, isPago: boolean) => {
    const status = isPago ? 'pago' : 'pendente';
    const today = new Date();
    const brasiliaDate = new Date(today.getTime() - (today.getTimezoneOffset() * 60000));
    const dataPagamento = isPago ? brasiliaDate.toISOString().split('T')[0] : undefined;
    await atualizarStatusParcela(parcela.id, status, dataPagamento);
  };

  const handleVerDetalhes = (venda: any) => {
    setSelectedVenda(venda);
    setCrediarioDetalhesModalOpen(true);
  };

  const handleCloseCrediarioModal = () => {
    setCrediarioDetalhesModalOpen(false);
    setSelectedVenda(null);
  };

  const handleEditVenda = (venda: any) => {
    setSelectedVenda(venda);
    setCrediarioEditModalOpen(true);
  };

  const handleCloseCrediarioEditModal = () => {
    setCrediarioEditModalOpen(false);
    setSelectedVenda(null);
  };

  const handleSaveEdit = async (vendaId: string, data: any) => {
    await editarVendaCrediario(vendaId, data);
  };

  const handleDeleteVenda = async (venda: any) => {
    if (window.confirm(`Tem certeza que deseja deletar a venda de ${(clients.find(c => c.id === venda.client_id)?.name || 'Cliente não encontrado')}?`)) {
      await deletarVendaCrediario(venda.id);
    }
  };

  const parcelasPendentes = parcelas.filter(p => p.status === 'pendente').length;
  const parcelasPagas = parcelas.filter(p => p.status === 'pago').length;
  const vendasAtivas = vendas.filter(v => v.status === 'ativo').length;
  const valorTotalPendente = parcelas
    .filter(p => p.status === 'pendente')
    .reduce((acc, p) => acc + p.valor_parcela, 0);
  return <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-2">
        <ShoppingCart className="h-6 w-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">Vendas</h1>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="vendas">Vendas Regulares</TabsTrigger>
          <TabsTrigger value="crediario">Crediário</TabsTrigger>
        </TabsList>

        <TabsContent value="vendas" className="space-y-6">

      {/* Total de vendas */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <ShoppingCart className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total de vendas</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(totalPaid)}
              </p>
              <p className="text-sm text-gray-500">
                {filteredSales.length} {filteredSales.length === 1 ? 'venda' : 'vendas'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filtros</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Período */}
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium text-gray-700">Período</label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
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
                  <Button variant="outline" className={cn("justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "dd/MM/yyyy", {
                    locale: ptBR
                  }) : "Selecionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus className="pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>

            {/* Data Final */}
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium text-gray-700">Data Final</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "dd/MM/yyyy", {
                    locale: ptBR
                  }) : "Selecionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus className="pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>

            {/* Forma de Pagamento */}
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium text-gray-700">Forma de Pagamento</label>
              <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="cartao">Cartão</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="crediario">Crediário</SelectItem>
                  </SelectContent>
              </Select>
            </div>

            {/* Status */}
            
          </div>

          {/* Botão Limpar Filtros */}
          <div className="mt-4">
            <Button variant="outline" onClick={() => {
            setStartDate(undefined);
            setEndDate(undefined);
            setPaymentMethodFilter('all');
            setStatusFilter('all');
            setSelectedPeriod('all');
          }}>
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Vendas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Vendas</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredSales.length > 0 ? <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Número da Venda</TableHead>
                  <TableHead>Data da Venda</TableHead>
                  <TableHead>Data Paga</TableHead>
                  <TableHead>Valor Total</TableHead>
                  <TableHead>Valor Pago</TableHead>
                  <TableHead>Forma de Pagamento</TableHead>
                  <TableHead>Qtd. Parcelas</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.map(sale => <TableRow key={sale.id}>
                    <TableCell className="font-medium">
                      <span className={cn(sale.client_id ? "text-blue-600" : "text-orange-600")}>
                        {getClientName(sale.client_id)}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">
                      <span className="text-sm font-mono text-blue-600">
                        {sale.numero_venda || '#0000'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {sale.isParcelaCrediario ? formatDate(sale.sale_date_original || sale.sale_date) : formatDate(sale.sale_date)}
                    </TableCell>
                    <TableCell>
                      {formatDate(sale.sale_date)}
                    </TableCell>
                    <TableCell className="font-semibold text-green-600">
                      {(() => {
                  // Se for parcela de crediário, mostrar valor da parcela
                  if (sale.isParcelaCrediario && sale.parcelaInfo) {
                    return formatCurrency(Number(sale.parcelaInfo.valorParcela));
                  }

                  // Se for venda de crediário, mostrar o valor total da venda
                  if (sale.payment_method === 'Crediário') {
                    const crediarioVenda = crediarioVendas.find(v => v.id === sale.id);
                    return formatCurrency(Number(crediarioVenda?.valor_total || sale.total_value));
                  }

                  // Para vendas normais parceladas, mostrar valor da parcela individual
                  const saleInstallments = installments.filter(inst => inst.venda_id === sale.id);
                  if (saleInstallments.length > 0) {
                    return formatCurrency(Number(sale.total_value) / saleInstallments.length);
                  }

                  // Para vendas à vista, mostrar o valor total
                  return formatCurrency(Number(sale.total_value));
                })()}
                    </TableCell>
                    <TableCell className="font-semibold text-green-600">
                      {(() => {
                        // Se for parcela de crediário, mostrar o valor efetivamente pago na parcela
                        if ((sale as any).isParcelaCrediario && (sale as any).parcelaInfo) {
                          const pago = Number((sale as any).parcelaInfo.valorPago || 0);
                          return formatCurrency(pago);
                        }

                        // Se for uma venda de crediário (fallback), somar o que foi pago nas parcelas
                        if (sale.payment_method === 'Crediário') {
                          const related = parcelasCrediario.filter(p => p.crediario_venda_id === sale.id);
                          const pago = related.reduce((acc, p) => acc + Number(p.valor_pago || 0), 0);
                          return formatCurrency(pago);
                        }

                        // Para vendas normais parceladas, somar o que foi pago nas parcelas_venda
                        const saleInstallments = installments.filter(inst => inst.venda_id === sale.id);
                        if (saleInstallments.length > 0) {
                          const pago = saleInstallments.reduce((acc, inst) => acc + Number(inst.valor_pago || 0), 0);
                          return formatCurrency(pago);
                        }

                        // Para vendas à vista, o valor pago é o total
                        return formatCurrency(Number(sale.total_value));
                      })()}
                    </TableCell>
                    <TableCell>
                      {sale.payment_method || 'À vista'}
                    </TableCell>
                    <TableCell>
                      {sale.isParcelaCrediario ? getInstallmentCount(sale) : `${getInstallmentCount(sale)}x`}
                    </TableCell>
                    <TableCell>
                      <span className={cn("px-2 py-1 rounded-full text-xs font-medium", getSaleStatus(sale.id) === 'Pago' ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800")}>
                        {getSaleStatus(sale.id)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="ghost" onClick={() => handleViewSaleDetails(sale)} className="h-8 w-8 p-0 text-green-600 hover:text-green-700">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => {
                          if (sale.isParcelaCrediario || sale.payment_method === 'Crediário') {
                            setActiveTab('crediario');
                          } else {
                            handleEditSale(sale);
                          }
                        }} className="h-8 w-8 p-0">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => {
                          if (sale.isParcelaCrediario || sale.payment_method === 'Crediário') {
                            setActiveTab('crediario');
                          } else {
                            handleDeleteSale(sale.id);
                          }
                        }} className="h-8 w-8 p-0 text-red-600 hover:text-red-700">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>)}
              </TableBody>
            </Table> : <div className="text-center py-8">
              <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">
                Nenhuma venda encontrada com os filtros aplicados.
              </p>
            </div>}
        </CardContent>
      </Card>

        </TabsContent>

        <TabsContent value="crediario" className="space-y-6">
          {/* Cards de Resumo do Crediário */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Vendas Ativas</p>
                    <p className="text-2xl font-bold">{vendasAtivas}</p>
                  </div>
                  <CreditCardIcon className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Parcelas Pendentes</p>
                    <p className="text-2xl font-bold">{parcelasPendentes}</p>
                  </div>
                  <ClockIcon className="h-8 w-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Parcelas Pagas</p>
                    <p className="text-2xl font-bold">{parcelasPagas}</p>
                  </div>
                  <CheckIcon className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Valor Pendente</p>
                    <p className="text-2xl font-bold">R$ {valorTotalPendente.toFixed(2)}</p>
                  </div>
                  <XIcon className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filtros do Crediário */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <Filter className="h-5 w-5" />
                <span>Filtros</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Período */}
                <div className="flex flex-col space-y-2">
                  <label className="text-sm font-medium text-gray-700">Período</label>
                  <Select value={crediarioSelectedPeriod} onValueChange={setCrediarioSelectedPeriod}>
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
                      <Button variant="outline" className={cn("justify-start text-left font-normal", !crediarioStartDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {crediarioStartDate ? format(crediarioStartDate, "dd/MM/yyyy", {
                          locale: ptBR
                        }) : "Selecionar"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={crediarioStartDate} onSelect={setCrediarioStartDate} initialFocus className="pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Data Final */}
                <div className="flex flex-col space-y-2">
                  <label className="text-sm font-medium text-gray-700">Data Final</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("justify-start text-left font-normal", !crediarioEndDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {crediarioEndDate ? format(crediarioEndDate, "dd/MM/yyyy", {
                          locale: ptBR
                        }) : "Selecionar"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={crediarioEndDate} onSelect={setCrediarioEndDate} initialFocus className="pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Busca por Cliente */}
                <div className="flex flex-col space-y-2">
                  <label className="text-sm font-medium text-gray-700">Buscar Cliente</label>
                  <div className="relative">
                    <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por cliente..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              {/* Botão Limpar Filtros */}
              <div className="mt-4">
                <Button variant="outline" onClick={() => {
                  setCrediarioStartDate(undefined);
                  setCrediarioEndDate(undefined);
                  setCrediarioSelectedPeriod('thisMonth');
                  setSearchTerm('');
                }}>
                  Limpar Filtros
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Busca do Crediário - removendo pois agora está nos filtros */}

          {/* Tabs do Crediário */}
          <Card>
            <CardHeader>
              <CardTitle>Vendas no Crediário</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Data da Venda</TableHead>
                    <TableHead>Valor Total</TableHead>
                    <TableHead>Desconto</TableHead>
                    <TableHead>Entrada</TableHead>
                    <TableHead>Restante</TableHead>
                    <TableHead>Parcelas</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                       <TableCell colSpan={9} className="text-center">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : filteredVendas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center">
                        Nenhuma venda encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredVendas.map((venda) => (
                      <TableRow key={venda.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <UserIcon className="h-4 w-4" />
                            {getClientName(venda.client_id || '')}
                          </div>
                        </TableCell>
                        <TableCell>
                          {venda.produto_id ? getProductName(venda.produto_id) : '-'}
                        </TableCell>
                        <TableCell>
                          {format(parseISO(venda.data_venda), 'dd/MM/yyyy', { locale: ptBR })}
                        </TableCell>
                        <TableCell>R$ {venda.valor_total.toFixed(2)}</TableCell>
                        <TableCell className="text-red-600">
                          {venda.desconto > 0 ? `R$ ${venda.desconto.toFixed(2)}` : '-'}
                        </TableCell>
                        <TableCell>R$ {venda.valor_entrada.toFixed(2)}</TableCell>
                        <TableCell>R$ {venda.valor_restante.toFixed(2)}</TableCell>
                        <TableCell>{venda.numero_parcelas}x</TableCell>
                        
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleVerDetalhes(venda)}
                            >
                              <EyeIcon className="h-3 w-3 mr-1" />
                              Ver Detalhes
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleEditVenda(venda)}
                            >
                              <EditIcon className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleDeleteVenda(venda)}
                            >
                              <TrashIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modais */}
      {selectedSale && (
        <>
          <EditSaleModal open={editModalOpen} onClose={handleCloseModal} sale={selectedSale} />
          <SaleDetailsModal open={detailsModalOpen} onClose={handleCloseModal} sale={selectedSale} />
        </>
      )}

      {/* Modais do Crediário */}
      <CrediarioDetalhesModal
        open={crediarioDetalhesModalOpen}
        onClose={handleCloseCrediarioModal}
        venda={selectedVenda}
        parcelas={parcelas}
      />

      <EditCrediarioModal
        open={crediarioEditModalOpen}
        onClose={handleCloseCrediarioEditModal}
        venda={selectedVenda}
        onSave={handleSaveEdit}
      />
    </div>;
};
export default Sales;