import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  PlusIcon, 
  CalendarIcon, 
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
import { useCrediario } from '@/contexts/CrediarioContext';
import { useData } from '@/contexts/DataContext';
import { format, parseISO, isBefore, isToday, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import CrediarioDetalhesModal from '@/components/CrediarioDetalhesModal';
import EditCrediarioModal from '@/components/EditCrediarioModal';

export default function Crediario() {
  const navigate = useNavigate();
  const { vendas, parcelas, loading, loadVendas, loadParcelas, atualizarStatusParcela, editarVendaCrediario, deletarVendaCrediario } = useCrediario();
  const { clients, products } = useData();
  
  
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('vendas');
  const [selectedVenda, setSelectedVenda] = useState<any>(null);
  const [detalhesModalOpen, setDetalhesModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    loadVendas();
    loadParcelas();
  }, []);

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client?.name || 'Cliente não encontrado';
  };

  const getProductName = (productId: string) => {
    const product = products.find(p => p.id === productId);
    return product?.name || 'Produto não encontrado';
  };

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

  const getDateFilter = () => {
    const today = new Date();
    
    switch (selectedPeriod) {
      case 'today':
        return {
          start: startOfDay(today),
          end: endOfDay(today)
        };
      case 'week':
        return {
          start: startOfWeek(today, { locale: ptBR }),
          end: endOfWeek(today, { locale: ptBR })
        };
      case 'month':
        return {
          start: startOfMonth(today),
          end: endOfMonth(today)
        };
      case 'custom':
        if (startDate && endDate) {
          return {
            start: startOfDay(new Date(startDate)),
            end: endOfDay(new Date(endDate))
          };
        }
        return null;
      default:
        return null;
    }
  };

  const filteredVendas = vendas.filter(venda => {
    // Filtro por nome do cliente
    if (searchTerm) {
      const clientName = getClientName(venda.client_id || '').toLowerCase();
      if (!clientName.includes(searchTerm.toLowerCase())) {
        return false;
      }
    }

    // Filtro por data
    const dateFilter = getDateFilter();
    if (dateFilter) {
      const vendaDate = parseISO(venda.data_venda);
      if (!isWithinInterval(vendaDate, dateFilter)) {
        return false;
      }
    }

    return true;
  });

  const filteredParcelas = parcelas.filter(parcela => {
    const venda = vendas.find(v => v.id === parcela.crediario_venda_id);
    if (!venda) return false;

    // Filtro por nome do cliente
    if (searchTerm) {
      const clientName = getClientName(venda.client_id || '').toLowerCase();
      if (!clientName.includes(searchTerm.toLowerCase())) {
        return false;
      }
    }

    // Filtro por data da venda (não da parcela)
    const dateFilter = getDateFilter();
    if (dateFilter) {
      const vendaDate = parseISO(venda.data_venda);
      if (!isWithinInterval(vendaDate, dateFilter)) {
        return false;
      }
    }

    return true;
  });

  const handleMarcarParcela = async (parcela: any, isPago: boolean) => {
    const status = isPago ? 'pago' : 'pendente';
    // Usar data local do Brasil para evitar problemas de fuso horário
    const today = new Date();
    const brasiliaDate = new Date(today.getTime() - (today.getTimezoneOffset() * 60000));
    const dataPagamento = isPago ? brasiliaDate.toISOString().split('T')[0] : undefined;
    await atualizarStatusParcela(parcela.id, status, dataPagamento);
  };

  const handleVerDetalhes = (venda: any) => {
    setSelectedVenda(venda);
    setDetalhesModalOpen(true);
  };

  const handleCloseModal = () => {
    setDetalhesModalOpen(false);
    setSelectedVenda(null);
  };

  const handleEditVenda = (venda: any) => {
    setSelectedVenda(venda);
    setEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setSelectedVenda(null);
  };

  const handleSaveEdit = async (vendaId: string, data: any) => {
    await editarVendaCrediario(vendaId, data);
  };

  const handleDeleteVenda = async (venda: any) => {
    if (window.confirm(`Tem certeza que deseja deletar a venda de ${getClientName(venda.client_id || '')}?`)) {
      await deletarVendaCrediario(venda.id);
    }
  };

  const handleClearFilters = () => {
    setSelectedPeriod('all');
    setStartDate('');
    setEndDate('');
    setSearchTerm('');
  };

  const parcelasPendentes = parcelas.filter(p => p.status === 'pendente').length;
  const parcelasPagas = parcelas.filter(p => p.status === 'pago').length;
  const vendasAtivas = vendas.filter(v => v.status === 'ativo').length;
  const valorTotalPendente = parcelas
    .filter(p => p.status === 'pendente')
    .reduce((acc, p) => acc + p.valor_parcela, 0);

  return (
    <div className="container mx-auto p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Crediário</h1>
          <p className="text-muted-foreground">Gerencie suas vendas parceladas</p>
        </div>
        <Button onClick={() => navigate('/nova-venda-crediario')}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Nova Venda
        </Button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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

      {/* Filtros */}
      <div className="mb-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Período</label>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="week">Esta Semana</SelectItem>
                <SelectItem value="month">Este Mês</SelectItem>
                <SelectItem value="custom">Período Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedPeriod === 'custom' && (
            <>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Data Início</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Data Final</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </>
          )}

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Buscar Cliente</label>
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Nome do cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={handleClearFilters}>
            Limpar Filtros
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="vendas">Vendas</TabsTrigger>
          <TabsTrigger value="parcelas">Parcelas</TabsTrigger>
        </TabsList>

        <TabsContent value="vendas" className="mt-6">
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
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : filteredVendas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center">
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
                        <TableCell>{getStatusBadge(venda.status)}</TableCell>
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

        <TabsContent value="parcelas" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Parcelas do Crediário</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Parcela</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : filteredParcelas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center">
                        Nenhuma parcela encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredParcelas.map((parcela) => {
                      const venda = vendas.find(v => v.id === parcela.crediario_venda_id);
                      return (
                        <TableRow key={parcela.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <UserIcon className="h-4 w-4" />
                              {getClientName(venda?.client_id || '')}
                            </div>
                          </TableCell>
                          <TableCell>
                            {parcela.tipo === 'entrada' ? 'Entrada' : `${parcela.numero_parcela}º parcela`}
                          </TableCell>
                          <TableCell>R$ {parcela.valor_parcela.toFixed(2)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <CalendarIcon className="h-4 w-4" />
                              {format(parseISO(parcela.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })}
                            </div>
                          </TableCell>
                          <TableCell>{getParcelaStatusBadge(parcela)}</TableCell>
                          <TableCell>
                            <Badge variant={parcela.tipo === 'entrada' ? 'default' : 'outline'}>
                              {parcela.tipo === 'entrada' ? 'Entrada' : 'Parcela'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {parcela.status === 'pendente' ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleMarcarParcela(parcela, true)}
                                >
                                  <CheckIcon className="h-3 w-3 mr-1" />
                                  Marcar Pago
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleMarcarParcela(parcela, false)}
                                >
                                  <XIcon className="h-3 w-3 mr-1" />
                                  Marcar Pendente
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de Detalhes */}
      <CrediarioDetalhesModal
        open={detalhesModalOpen}
        onClose={handleCloseModal}
        venda={selectedVenda}
        parcelas={parcelas}
      />

      {/* Modal de Edição */}
      <EditCrediarioModal
        open={editModalOpen}
        onClose={handleCloseEditModal}
        venda={selectedVenda}
        onSave={handleSaveEdit}
      />
    </div>
  );
}