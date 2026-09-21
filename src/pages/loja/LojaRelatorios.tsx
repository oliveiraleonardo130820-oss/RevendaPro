import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3, Download, Calendar, DollarSign, Package, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

interface ReportData {
  totalVendas: number;
  totalDespesas: number;
  lucroLiquido: number;
  vendasCount: number;
  clientesCount: number;
  produtosCount: number;
  vendasCrediario: number;
  parcelasPendentes: number;
}

export default function LojaRelatorios() {
  const { id: lojaId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [reportData, setReportData] = useState<ReportData>({
    totalVendas: 0,
    totalDespesas: 0,
    lucroLiquido: 0,
    vendasCount: 0,
    clientesCount: 0,
    produtosCount: 0,
    vendasCrediario: 0,
    parcelasPendentes: 0
  });

  const [selectedPeriod, setSelectedPeriod] = useState<string>('current-month');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReportData();
  }, [lojaId, selectedPeriod]);

  const getPeriodDates = () => {
    const now = new Date();
    
    switch (selectedPeriod) {
      case 'current-month':
        return {
          start: startOfMonth(now),
          end: endOfMonth(now)
        };
      case 'last-month':
        const lastMonth = subMonths(now, 1);
        return {
          start: startOfMonth(lastMonth),
          end: endOfMonth(lastMonth)
        };
      case 'last-3-months':
        return {
          start: subMonths(startOfMonth(now), 2),
          end: endOfMonth(now)
        };
      default:
        return {
          start: startOfMonth(now),
          end: endOfMonth(now)
        };
    }
  };

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const { start, end } = getPeriodDates();
      const startDate = format(start, 'yyyy-MM-dd');
      const endDate = format(end, 'yyyy-MM-dd');

      // Buscar vendas do período
      const { data: vendas, error: vendasError } = await supabase
        .from('sales')
        .select('total_value, payment_method, id')
        .eq('loja_id', lojaId)
        .gte('sale_date', startDate)
        .lte('sale_date', endDate);

      // Buscar parcelas pagas no período (baseado na data_pagamento)
      const { data: parcelasPagas, error: parcelasVendasError } = await supabase
        .from('parcelas_venda')
        .select('valor_pago, valor_da_parcela, venda_id, data_pagamento, status')
        .eq('loja_id', lojaId)
        .gte('data_pagamento', startDate)
        .lte('data_pagamento', endDate)
        .eq('status', 'pago');

      // Buscar parcelas crediário pagas no período (baseado na data_pagamento)
      const { data: parcelasCrediarioPagas, error: parcelasCrediarioError } = await supabase
        .from('parcelas_crediario')
        .select('valor_parcela, valor_pago, data_pagamento, status')
        .eq('loja_id', lojaId)
        .gte('data_pagamento', startDate)
        .lte('data_pagamento', endDate)
        .eq('status', 'pago');

      if (vendasError) throw vendasError;
      if (parcelasVendasError) throw parcelasVendasError;
      if (parcelasCrediarioError) throw parcelasCrediarioError;

      // Buscar despesas do período
      const { data: despesas, error: despesasError } = await supabase
        .from('despesas')
        .select('valor')
        .eq('loja_id', lojaId)
        .gte('data', startDate)
        .lte('data', endDate);

      if (despesasError) throw despesasError;

      // Buscar vendas crediário do período
      const { data: vendasCrediario, error: crediarioError } = await supabase
        .from('crediario_vendas')
        .select('valor_total')
        .eq('loja_id', lojaId)
        .gte('data_venda', startDate)
        .lte('data_venda', endDate);

      if (crediarioError) throw crediarioError;

      // Buscar parcelas pendentes
      const { data: parcelasPendentes, error: parcelasError } = await supabase
        .from('parcelas_crediario')
        .select('valor_parcela')
        .eq('loja_id', lojaId)
        .eq('status', 'pendente');

      if (parcelasError) throw parcelasError;

      // Contar clientes da loja
      const { count: clientesCount, error: clientesError } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('loja_id', lojaId);

      if (clientesError) throw clientesError;

      // Contar produtos da loja
      const { count: produtosCount, error: produtosError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('loja_id', lojaId);

      if (produtosError) throw produtosError;

      // Calcular vendas à vista do período
      const vendasAvista = vendas?.filter(v => ['Dinheiro', 'Cartão de Débito', 'Cartão de Crédito', 'PIX'].includes(v.payment_method || '')) || [];
      const totalVendasAvista = vendasAvista.reduce((sum, venda) => sum + Number(venda.total_value), 0);
      
      // Calcular valor das parcelas pagas no período (baseado na data de pagamento)
      const totalParcelasPagasVendas = parcelasPagas?.reduce((sum, parcela) => {
        return sum + Number(parcela.valor_pago || parcela.valor_da_parcela);
      }, 0) || 0;
      
      const totalParcelasPagasCrediario = parcelasCrediarioPagas?.reduce((sum, parcela) => {
        return sum + Number((parcela as any).valor_pago || parcela.valor_parcela);
      }, 0) || 0;

      const totalVendas = totalVendasAvista + totalParcelasPagasVendas + totalParcelasPagasCrediario;
      const totalDespesas = despesas?.reduce((sum, despesa) => sum + Number(despesa.valor), 0) || 0;
      const totalCrediario = vendasCrediario?.reduce((sum, venda) => sum + Number(venda.valor_total), 0) || 0;
      const totalParcelasPendentes = parcelasPendentes?.reduce((sum, parcela) => sum + Number(parcela.valor_parcela), 0) || 0;

      setReportData({
        totalVendas,
        totalDespesas,
        lucroLiquido: totalVendas - totalDespesas,
        vendasCount: vendas?.length || 0,
        clientesCount: clientesCount || 0,
        produtosCount: produtosCount || 0,
        vendasCrediario: totalCrediario,
        parcelasPendentes: totalParcelasPendentes
      });

    } catch (error) {
      console.error('Erro ao buscar dados do relatório:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados do relatório",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = async () => {
    try {
      const { start, end } = getPeriodDates();
      const doc = new jsPDF();

      // Título
      doc.setFontSize(20);
      doc.text('Relatório da Loja', 20, 20);

      // Período
      doc.setFontSize(12);
      doc.text(`Período: ${format(start, 'dd/MM/yyyy')} a ${format(end, 'dd/MM/yyyy')}`, 20, 35);

      // Dados principais
      let yPosition = 55;
      doc.setFontSize(14);
      doc.text('Resumo Financeiro:', 20, yPosition);
      yPosition += 15;

      doc.setFontSize(11);
      doc.text(`Total em Vendas: R$ ${reportData.totalVendas.toFixed(2)}`, 25, yPosition);
      yPosition += 8;
      doc.text(`Total em Despesas: R$ ${reportData.totalDespesas.toFixed(2)}`, 25, yPosition);
      yPosition += 8;
      doc.text(`Lucro Líquido: R$ ${reportData.lucroLiquido.toFixed(2)}`, 25, yPosition);
      yPosition += 8;
      doc.text(`Vendas Crediário: R$ ${reportData.vendasCrediario.toFixed(2)}`, 25, yPosition);
      yPosition += 8;
      doc.text(`Parcelas Pendentes: R$ ${reportData.parcelasPendentes.toFixed(2)}`, 25, yPosition);
      yPosition += 20;

      // Estatísticas gerais
      doc.setFontSize(14);
      doc.text('Estatísticas Gerais:', 20, yPosition);
      yPosition += 15;

      doc.setFontSize(11);
      doc.text(`Número de Vendas: ${reportData.vendasCount}`, 25, yPosition);
      yPosition += 8;
      doc.text(`Total de Clientes: ${reportData.clientesCount}`, 25, yPosition);
      yPosition += 8;
      doc.text(`Total de Produtos: ${reportData.produtosCount}`, 25, yPosition);

      // Salvar PDF
      doc.save(`relatorio-loja-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      
      toast({
        title: "Sucesso",
        description: "Relatório PDF gerado com sucesso!"
      });
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar o relatório PDF",
        variant: "destructive"
      });
    }
  };

  const getPeriodLabel = () => {
    const { start, end } = getPeriodDates();
    return `${format(start, 'dd/MM/yyyy')} a ${format(end, 'dd/MM/yyyy')}`;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Carregando relatórios...</div>
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
            <BarChart3 className="w-8 h-8" />
            Relatórios da Loja
          </h1>
          <p className="text-muted-foreground">Análise financeira e estatísticas</p>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current-month">Mês Atual</SelectItem>
              <SelectItem value="last-month">Mês Passado</SelectItem>
              <SelectItem value="last-3-months">Últimos 3 Meses</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Período: {getPeriodLabel()}
          </p>
        </div>
        
        <Button onClick={generatePDF}>
          <Download className="w-4 h-4 mr-2" />
          Gerar PDF
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Total Vendas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              R$ {reportData.totalVendas.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {reportData.vendasCount} vendas realizadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Total Despesas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              R$ {reportData.totalDespesas.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Lucro Líquido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${reportData.lucroLiquido >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              R$ {reportData.lucroLiquido.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="w-4 h-4" />
              Clientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reportData.clientesCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Total cadastrados
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Crediário</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Vendido no Crediário</p>
                <p className="text-2xl font-bold">R$ {reportData.vendasCrediario.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Parcelas Pendentes</p>
                <p className="text-2xl font-bold text-orange-600">R$ {reportData.parcelasPendentes.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Produtos</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <p className="text-sm text-muted-foreground">Total de Produtos Cadastrados</p>
              <p className="text-2xl font-bold">{reportData.produtosCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}