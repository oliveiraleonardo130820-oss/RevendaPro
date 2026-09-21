import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Search, Check, X, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Parcela {
  id: string;
  numero_parcela: number;
  valor_parcela: number;
  data_vencimento: string;
  data_pagamento?: string;
  status: string;
  tipo: string;
  observacoes?: string;
  crediario_venda_id: string;
  crediario_vendas?: {
    clients?: { name: string };
  };
}

export default function LojaControleParcelas() {
  const { id: lojaId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [filteredParcelas, setFilteredParcelas] = useState<Parcela[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchParcelas();
  }, [lojaId]);

  useEffect(() => {
    let filtered = parcelas;

    // Filtro por status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(parcela => parcela.status === statusFilter);
    }

    // Filtro por termo de busca
    if (searchTerm) {
      filtered = filtered.filter(parcela =>
        (parcela.crediario_vendas?.clients?.name && 
         parcela.crediario_vendas.clients.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        parcela.numero_parcela.toString().includes(searchTerm) ||
        parcela.valor_parcela.toString().includes(searchTerm)
      );
    }

    setFilteredParcelas(filtered);
  }, [parcelas, searchTerm, statusFilter]);

  const fetchParcelas = async () => {
    if (!lojaId) {
      console.error('LojaId não encontrado');
      setLoading(false);
      return;
    }

    try {
      console.log('Buscando parcelas para loja:', lojaId);
      const { data, error } = await supabase
        .from('parcelas_crediario')
        .select(`
          *,
          crediario_vendas (
            clients (name)
          )
        `)
        .eq('loja_id', lojaId)
        .order('data_vencimento', { ascending: true });
      
      if (error) throw error;
      console.log('Parcelas encontradas:', data);
      setParcelas(data || []);
    } catch (error) {
      console.error('Erro ao buscar parcelas:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as parcelas",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePayParcela = async (parcelaId: string) => {
    try {
      const { error } = await supabase
        .from('parcelas_crediario')
        .update({
          status: 'pago',
          data_pagamento: new Date().toISOString().split('T')[0]
        })
        .eq('id', parcelaId);

      if (error) throw error;
      
      toast({
        title: "Sucesso",
        description: "Parcela marcada como paga!"
      });
      
      fetchParcelas();
    } catch (error) {
      console.error('Erro ao marcar parcela como paga:', error);
      toast({
        title: "Erro",
        description: "Não foi possível marcar a parcela como paga",
        variant: "destructive"
      });
    }
  };

  const handleCancelParcela = async (parcelaId: string) => {
    if (!confirm('Tem certeza que deseja cancelar esta parcela?')) return;

    try {
      const { error } = await supabase
        .from('parcelas_crediario')
        .update({
          status: 'cancelado'
        })
        .eq('id', parcelaId);

      if (error) throw error;
      
      toast({
        title: "Sucesso",
        description: "Parcela cancelada!"
      });
      
      fetchParcelas();
    } catch (error) {
      console.error('Erro ao cancelar parcela:', error);
      toast({
        title: "Erro",
        description: "Não foi possível cancelar a parcela",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendente':
        return <Badge variant="outline">Pendente</Badge>;
      case 'pago':
        return <Badge className="bg-green-500">Pago</Badge>;
      case 'atrasado':
        return <Badge variant="destructive">Atrasado</Badge>;
      case 'cancelado':
        return <Badge variant="secondary">Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const isVencida = (dataVencimento: string) => {
    const hoje = new Date();
    const vencimento = parseISO(dataVencimento);
    return vencimento < hoje;
  };

  const totalPendente = filteredParcelas
    .filter(p => p.status === 'pendente')
    .reduce((sum, p) => sum + p.valor_parcela, 0);

  const totalAtrasado = filteredParcelas
    .filter(p => p.status === 'pendente' && isVencida(p.data_vencimento))
    .reduce((sum, p) => sum + p.valor_parcela, 0);

  const totalPago = filteredParcelas
    .filter(p => p.status === 'pago')
    .reduce((sum, p) => sum + p.valor_parcela, 0);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Carregando parcelas...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={() => navigate(`/lojas/${lojaId}`)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="w-8 h-8" />
            Controle de Parcelas
          </h1>
          <p className="text-muted-foreground">Gerenciar parcelas do crediário</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Pendente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">R$ {totalPendente.toFixed(2)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Atrasado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">R$ {totalAtrasado.toFixed(2)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Pago</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">R$ {totalPago.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Buscar por cliente, número da parcela..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="pago">Pago</SelectItem>
            <SelectItem value="atrasado">Atrasado</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Parcelas ({filteredParcelas.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredParcelas.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== 'all' ? 'Nenhuma parcela encontrada' : 'Nenhuma parcela registrada'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Parcela</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredParcelas.map((parcela) => (
                  <TableRow 
                    key={parcela.id}
                    className={
                      parcela.status === 'pendente' && isVencida(parcela.data_vencimento) 
                        ? 'bg-red-50 dark:bg-red-950/20' 
                        : ''
                    }
                  >
                    <TableCell className="font-medium">
                      {parcela.crediario_vendas?.clients?.name || 'Cliente não informado'}
                    </TableCell>
                    <TableCell>{parcela.numero_parcela}</TableCell>
                    <TableCell className="font-semibold">R$ {parcela.valor_parcela.toFixed(2)}</TableCell>
                    <TableCell>
                      {format(parseISO(parcela.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })}
                      {parcela.status === 'pendente' && isVencida(parcela.data_vencimento) && (
                        <Badge variant="destructive" className="ml-2 text-xs">
                          Vencida
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {parcela.data_pagamento 
                        ? format(parseISO(parcela.data_pagamento), 'dd/MM/yyyy', { locale: ptBR })
                        : '-'
                      }
                    </TableCell>
                    <TableCell>{getStatusBadge(parcela.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {parcela.status === 'pendente' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePayParcela(parcela.id)}
                              className="text-green-600 hover:text-green-700"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCancelParcela(parcela.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
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
    </div>
  );
}