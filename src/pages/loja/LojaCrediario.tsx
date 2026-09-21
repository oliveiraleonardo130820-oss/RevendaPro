import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, Plus, Search, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CrediarioVenda {
  id: string;
  data_venda: string;
  valor_total: number;
  valor_entrada: number;
  valor_restante: number;
  numero_parcelas: number;
  dia_vencimento: number;
  status: string;
  observacoes?: string;
  clients?: { name: string };
  created_at: string;
}

export default function LojaCrediario() {
  const { id: lojaId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [vendas, setVendas] = useState<CrediarioVenda[]>([]);
  const [filteredVendas, setFilteredVendas] = useState<CrediarioVenda[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVendas();
  }, [lojaId]);

  useEffect(() => {
    const filtered = vendas.filter(venda =>
      (venda.clients?.name && venda.clients.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      venda.status.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredVendas(filtered);
  }, [vendas, searchTerm]);

  const fetchVendas = async () => {
    try {
      const { data, error } = await supabase
        .from('crediario_vendas')
        .select(`
          *,
          clients (name)
        `)
        .eq('loja_id', lojaId)
        .order('data_venda', { ascending: false });
      
      if (error) throw error;
      setVendas(data || []);
    } catch (error) {
      console.error('Erro ao buscar vendas do crediário:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as vendas do crediário",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const totalVendas = filteredVendas.reduce((sum, venda) => sum + venda.valor_total, 0);
  const totalRestante = filteredVendas.reduce((sum, venda) => sum + venda.valor_restante, 0);
  const vendasAtivas = filteredVendas.filter(v => v.status === 'ativo').length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ativo':
        return <Badge variant="default">Ativo</Badge>;
      case 'pago':
        return <Badge className="bg-green-500">Pago</Badge>;
      case 'cancelado':
        return <Badge variant="destructive">Cancelado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Carregando crediário...</div>
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
            <CreditCard className="w-8 h-8" />
            Crediário da Loja
          </h1>
          <p className="text-muted-foreground">Vendas a prazo da loja</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Vendido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {totalVendas.toFixed(2)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total a Receber</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {totalRestante.toFixed(2)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Vendas Ativas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vendasAtivas}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total de Vendas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredVendas.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Buscar vendas do crediário..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-80"
          />
        </div>
        
        <Button onClick={() => navigate(`/loja/${lojaId}/nova-venda-crediario`)}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Venda Crediário
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vendas do Crediário ({filteredVendas.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredVendas.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? 'Nenhuma venda encontrada' : 'Nenhuma venda do crediário registrada'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data Venda</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Valor Total</TableHead>
                  <TableHead>Entrada</TableHead>
                  <TableHead>Restante</TableHead>
                  <TableHead>Parcelas</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVendas.map((venda) => (
                  <TableRow key={venda.id}>
                    <TableCell>
                      {format(new Date(venda.data_venda), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell className="font-medium">
                      {venda.clients?.name || 'Cliente não informado'}
                    </TableCell>
                    <TableCell className="font-semibold">R$ {venda.valor_total.toFixed(2)}</TableCell>
                    <TableCell>R$ {venda.valor_entrada.toFixed(2)}</TableCell>
                    <TableCell>R$ {venda.valor_restante.toFixed(2)}</TableCell>
                    <TableCell>{venda.numero_parcelas}x</TableCell>
                    <TableCell>Dia {venda.dia_vencimento}</TableCell>
                    <TableCell>{getStatusBadge(venda.status)}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/loja/${lojaId}/crediario/${venda.id}`)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
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