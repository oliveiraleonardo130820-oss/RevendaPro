
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Trash2, Edit, Filter, CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn, toLocalISODate } from '@/lib/utils';

interface Despesa {
  id: string;
  nome: string;
  valor: number;
  data: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

const Despesas = () => {
  const { session } = useAuth();
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Filter states
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [selectedPeriod, setSelectedPeriod] = useState<string>('thisMonth');
  
  // Form state
  const [nome, setNome] = useState('');
  const [valor, setValor] = useState<number | ''>('');
  const [data, setData] = useState(() => {
    const today = new Date();
    return toLocalISODate(today);
  });

  // Load despesas
  const loadDespesas = async () => {
    if (!session?.user) return;

    try {
      const { data: despesasData, error } = await supabase
        .from('despesas')
        .select('*')
        .order('data', { ascending: false });

      if (error) {
        console.error('Erro ao carregar despesas:', error);
        toast.error('Erro ao carregar despesas');
        return;
      }

      setDespesas(despesasData || []);
    } catch (error) {
      console.error('Erro ao carregar despesas:', error);
      toast.error('Erro ao carregar despesas');
    }
  };

  useEffect(() => {
    loadDespesas();
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session?.user) {
      toast.error('Usuário não autenticado');
      return;
    }

    if (!nome.trim() || !valor || valor <= 0) {
      toast.error('Por favor, preencha todos os campos corretamente');
      return;
    }

    setLoading(true);

    try {
      if (editingId) {
        // Update existing despesa
        const { error } = await supabase
          .from('despesas')
          .update({
            nome: nome.trim(),
            valor: Number(valor),
            data,
          })
          .eq('id', editingId);

        if (error) throw error;
        
        toast.success('Despesa atualizada com sucesso!');
        setEditingId(null);
      } else {
        // Create new despesa
        const { error } = await supabase
          .from('despesas')
          .insert({
            nome: nome.trim(),
            valor: Number(valor),
            data,
            user_id: session.user.id,
          });

        if (error) throw error;
        
        toast.success('Despesa adicionada com sucesso!');
      }

      // Reset form
      setNome('');
      setValor('');
      setData(() => {
        const today = new Date();
        return toLocalISODate(today);
      });

      // Reload despesas
      await loadDespesas();
    } catch (error) {
      console.error('Erro ao salvar despesa:', error);
      toast.error('Erro ao salvar despesa');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (despesa: Despesa) => {
    console.log('Editando despesa:', despesa);
    setEditingId(despesa.id);
    setNome(despesa.nome);
    setValor(despesa.valor);
    setData(despesa.data);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setNome('');
    setValor('');
    setData(() => {
      const today = new Date();
      return toLocalISODate(today);
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta despesa?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('despesas')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Despesa excluída com sucesso!');
      await loadDespesas();
    } catch (error) {
      console.error('Erro ao excluir despesa:', error);
      toast.error('Erro ao excluir despesa');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString + 'T00:00:00').toLocaleDateString('pt-BR');
  };

  // Filter functions
  const getFilteredDespesasByPeriod = (despesasData: Despesa[]) => {
    if (selectedPeriod === 'all') return despesasData;
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const monthMap: { [key: string]: number } = {
      'january': 0, 'february': 1, 'march': 2, 'april': 3,
      'may': 4, 'june': 5, 'july': 6, 'august': 7,
      'september': 8, 'october': 9, 'november': 10, 'december': 11
    };

    switch (selectedPeriod) {
      case 'thisMonth':
        return despesasData.filter(despesa => {
          const despesaDate = new Date(despesa.data + 'T00:00:00');
          return despesaDate.getMonth() === currentMonth && despesaDate.getFullYear() === currentYear;
        });
      case 'lastMonth':
        return despesasData.filter(despesa => {
          const despesaDate = new Date(despesa.data + 'T00:00:00');
          const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
          const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
          return despesaDate.getMonth() === lastMonth && despesaDate.getFullYear() === lastMonthYear;
        });
      case 'last3Months': {
        const threeMonthsAgo = new Date(currentYear, currentMonth - 3, 1);
        return despesasData.filter(despesa => new Date(despesa.data + 'T00:00:00') >= threeMonthsAgo);
      }
      case 'thisYear':
        return despesasData.filter(despesa => new Date(despesa.data + 'T00:00:00').getFullYear() === currentYear);
      default:
        // Handle individual months
        if (Object.prototype.hasOwnProperty.call(monthMap, selectedPeriod)) {
          const targetMonth = monthMap[selectedPeriod];
          return despesasData.filter(despesa => {
            const despesaDate = new Date(despesa.data + 'T00:00:00');
            return despesaDate.getMonth() === targetMonth && despesaDate.getFullYear() === currentYear;
          });
        }
        return despesasData;
    }
  };

  const filteredDespesas = getFilteredDespesasByPeriod(despesas).filter(despesa => {
    // Date range filter
    if (startDate && endDate) {
      const despesaDate = new Date(despesa.data + 'T00:00:00');
      if (despesaDate < startDate || despesaDate > endDate) return false;
    }
    
    return true;
  });

  const totalDespesas = filteredDespesas.reduce((sum, despesa) => sum + despesa.valor, 0);

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Despesas</h1>
        <p className="text-sm sm:text-base text-gray-600">Gerencie os gastos da sua loja</p>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">
            {editingId ? 'Editar Despesa' : 'Registrar Nova Despesa'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="sm:col-span-2 lg:col-span-1">
              <Label htmlFor="nome">Nome da Despesa</Label>
              <Input
                id="nome"
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Aluguel, Marketing, Transporte..."
                required
              />
            </div>
            
            <div>
              <Label htmlFor="valor">Valor (R$)</Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                min="0.01"
                value={valor}
                onChange={(e) => setValor(e.target.value ? Number(e.target.value) : '')}
                placeholder="0,00"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="data">Data da Despesa</Label>
              <Input
                id="data"
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                required
              />
            </div>
            
            <div className="sm:col-span-2 lg:col-span-3 flex flex-col sm:flex-row gap-2">
              <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                {loading 
                  ? (editingId ? 'Atualizando...' : 'Adicionando...') 
                  : (editingId ? 'Atualizar Despesa' : 'Adicionar Despesa')
                }
              </Button>
              
              {editingId && (
                <Button type="button" variant="outline" onClick={handleCancelEdit} className="w-full sm:w-auto">
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Total */}
      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <div className="text-center">
            <p className="text-base sm:text-lg font-semibold text-gray-900">
              Total de Despesas: {formatCurrency(totalDespesas)}
            </p>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
          </div>
          
          {/* Botão Limpar Filtros */}
          <div className="mt-4 flex justify-center">
            <Button 
              variant="outline" 
              onClick={() => {
                setSelectedPeriod('thisMonth');
                setStartDate(undefined);
                setEndDate(undefined);
              }}
              className="w-full sm:w-auto"
            >
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Lista de Despesas</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {filteredDespesas.length === 0 ? (
            <div className="text-center py-8 text-gray-500 px-4">
              Nenhuma despesa encontrada para o período selecionado.
            </div>
          ) : (
            <div className="block sm:hidden">
              {/* Mobile Card Layout */}
              <div className="space-y-3 p-4">
                {filteredDespesas.map((despesa) => (
                  <Card key={despesa.id} className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{despesa.nome}</p>
                        <p className="text-xs text-gray-500">{formatDate(despesa.data)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm">{formatCurrency(despesa.valor)}</p>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(despesa)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(despesa.id)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
          
          {/* Desktop Table Layout */}
          <div className="hidden sm:block overflow-x-auto">
            {filteredDespesas.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Nome da Despesa</TableHead>
                    <TableHead className="text-right">Valor (R$)</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDespesas.map((despesa) => (
                    <TableRow key={despesa.id}>
                      <TableCell className="text-sm">{formatDate(despesa.data)}</TableCell>
                      <TableCell className="font-medium text-sm">{despesa.nome}</TableCell>
                      <TableCell className="text-right font-medium text-sm">
                        {formatCurrency(despesa.valor)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(despesa)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(despesa.id)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Despesas;
