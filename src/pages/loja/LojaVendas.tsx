import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, DollarSign, Search, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseLocalDate } from '@/lib/utils';

interface Sale {
  id: string;
  sale_date: string;
  total_value: number;
  payment_method: string;
  quantity: number;
  unit_price: number;
  commission: number;
  clients?: { name: string };
  products: { name: string };
  created_at: string;
}

export default function LojaVendas() {
  const { id: lojaId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [sales, setSales] = useState<Sale[]>([]);
  const [filteredSales, setFilteredSales] = useState<Sale[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSales();
  }, [lojaId]);

  useEffect(() => {
    const filtered = sales.filter(sale =>
      sale.products.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sale.clients?.name && sale.clients.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      sale.payment_method.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredSales(filtered);
  }, [sales, searchTerm]);

  const fetchSales = async () => {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          clients (name),
          products (name)
        `)
        .eq('loja_id', lojaId)
        .order('sale_date', { ascending: false });
      
      if (error) throw error;
      setSales(data || []);
    } catch (error) {
      console.error('Erro ao buscar vendas:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as vendas",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const totalSales = filteredSales.reduce((sum, sale) => sum + sale.total_value, 0);
  const totalCommission = filteredSales.reduce((sum, sale) => sum + sale.commission, 0);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Carregando vendas...</div>
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
            <DollarSign className="w-8 h-8" />
            Vendas da Loja
          </h1>
          <p className="text-muted-foreground">Histórico de vendas da loja</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total de Vendas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {totalSales.toFixed(2)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total em Comissões</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {totalCommission.toFixed(2)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Número de Vendas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredSales.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Buscar vendas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-80"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Vendas ({filteredSales.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredSales.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? 'Nenhuma venda encontrada' : 'Nenhuma venda registrada'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Qtd</TableHead>
                  <TableHead>Valor Unit.</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead>Comissão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell>
                      {format(parseLocalDate(sale.sale_date), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell className="font-medium">{sale.products.name}</TableCell>
                    <TableCell>{sale.clients?.name || 'Cliente não informado'}</TableCell>
                    <TableCell>{sale.quantity}</TableCell>
                    <TableCell>R$ {sale.unit_price.toFixed(2)}</TableCell>
                    <TableCell className="font-semibold">R$ {sale.total_value.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {sale.payment_method.charAt(0).toUpperCase() + sale.payment_method.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>R$ {sale.commission.toFixed(2)}</TableCell>
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