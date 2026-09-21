
import React, { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, FileText, User } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/integrations/supabase/client';

const SalesReport = () => {
  const { sales, clients, products } = useData();
  const { user } = useAuth();
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [funcionarios, setFuncionarios] = useState<any[]>([]);

  // Carregar funcionários quando o componente monta
  React.useEffect(() => {
    if (user?.tipo_usuario === 'dono') {
      loadFuncionarios();
    }
  }, [user]);

  const loadFuncionarios = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('funcionarios')
        .select('*')
        .eq('loja_id', user.id);

      if (error) {
        console.error('Erro ao carregar funcionários:', error);
      } else {
        setFuncionarios(data || []);
      }
    } catch (error) {
      console.error('Erro inesperado:', error);
    }
  };

  // Filtrar vendas por período (incluindo vendas de funcionários)
  const filteredSales = sales.filter(sale => {
    if (!startDate || !endDate) return false;
    
    // Corrigir processamento da data para evitar problemas de fuso horário
    const saleDate = new Date(sale.sale_date + 'T00:00:00');
    const startDateLocal = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const endDateLocal = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    
    return saleDate >= startDateLocal && saleDate <= endDateLocal;
  });

  // Calcular totais (incluindo vendas de funcionários)
  const totalValue = filteredSales.reduce((sum, sale) => sum + Number(sale.total_value), 0);
  const totalSales = filteredSales.length;
  const totalCommission = filteredSales.reduce((sum, sale) => sum + Number(sale.commission), 0);

  // Separar vendas por vendedor
  const ownerSales = filteredSales.filter(sale => sale.user_id === user?.id);
  const employeeSales = filteredSales.filter(sale => sale.user_id !== user?.id);

  // Função para obter nome do funcionário
  const getFuncionarioName = (userId: string) => {
    const funcionario = funcionarios.find(f => f.user_id === userId);
    return funcionario?.nome || 'Funcionário';
  };

  // Função para obter nome do cliente
  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client?.name || 'Cadastro sem nome';
  };

  const getProductName = (productId: string) => {
    const product = products.find(p => p.id === productId);
    return product?.name || 'Produto não encontrado';
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    return format(date, 'dd/MM/yyyy', { locale: ptBR });
  };

  const generateFileName = (extension: string) => {
    if (!startDate || !endDate) return `relatorio-vendas.${extension}`;
    
    const startFormatted = format(startDate, 'dd-MM-yyyy', { locale: ptBR });
    const endFormatted = format(endDate, 'dd-MM-yyyy', { locale: ptBR });
    
    return `relatorio-vendas-${startFormatted}-a-${endFormatted}.${extension}`;
  };

  const exportToPDF = () => {
    if (filteredSales.length === 0) {
      alert('Não há dados para exportar');
      return;
    }

    console.log('Iniciando exportação PDF...');
    console.log('Total de vendas:', totalSales);
    console.log('Valor total:', totalValue);
    console.log('Comissão total:', totalCommission);

    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(20);
    doc.text('Relatório de Vendas', 20, 20);
    
    // Período
    if (startDate && endDate) {
      doc.setFontSize(12);
      const periodText = `Período: ${format(startDate, 'dd/MM/yyyy', { locale: ptBR })} até ${format(endDate, 'dd/MM/yyyy', { locale: ptBR })}`;
      doc.text(periodText, 20, 35);
    }

    // Preparar dados da tabela
    const tableData = filteredSales.map(sale => [
      getClientName(sale.client_id),
      getProductName(sale.product_id),
      formatCurrency(Number(sale.total_value)),
      sale.payment_method || 'À vista',
      formatDate(sale.sale_date),
      sale.user_id === user?.id ? 'Loja' : getFuncionarioName(sale.user_id)
    ]);

    // Adicionar tabela usando autoTable
    autoTable(doc, {
      head: [['Cliente', 'Produto', 'Valor Total', 'Forma de Pagamento', 'Data da Venda', 'Vendedor']],
      body: tableData,
      startY: 45,
      styles: {
        fontSize: 10,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [66, 139, 202],
        textColor: [255, 255, 255],
      },
      didDrawPage: function (data) {
        console.log('Tabela desenhada, finalY:', data.cursor?.y);
      }
    });

    // Obter a posição Y final da tabela
    const finalY = (doc as any).lastAutoTable.finalY || 100;
    console.log('Final Y da tabela:', finalY);
    
    // Verificar se há espaço suficiente na página
    const pageHeight = doc.internal.pageSize.height;
    const remainingSpace = pageHeight - finalY;
    console.log('Espaço restante na página:', remainingSpace);
    
    // Declarar startY com tipo correto
    let startY: number;
    
    // Se não há espaço suficiente, adicionar nova página
    if (remainingSpace < 60) {
      doc.addPage();
      startY = 20;
    } else {
      startY = finalY + 20;
    }

    // Adicionar título do resumo
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('RESUMO DO PERÍODO', 20, startY);
    
    // Adicionar linha separadora
    doc.setLineWidth(0.5);
    doc.line(20, startY + 5, 190, startY + 5);

    // Calcular totais por forma de pagamento
    const paymentMethods = ['Dinheiro', 'Cartão de Débito', 'Cartão de Crédito', 'PIX'];
    const paymentTotals = paymentMethods.reduce((acc, method) => {
      const methodSales = filteredSales.filter(sale => sale.payment_method === method);
      acc[method] = methodSales.reduce((sum, sale) => sum + Number(sale.total_value), 0);
      return acc;
    }, {} as Record<string, number>);

    // Adicionar totais
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    
    const summaryStartY = startY + 15;
    doc.text(`Total de vendas: ${totalSales}`, 20, summaryStartY);
    doc.text(`Valor total vendido: ${formatCurrency(totalValue)}`, 20, summaryStartY + 10);
    doc.text(`Comissão estimada: ${formatCurrency(totalCommission)}`, 20, summaryStartY + 20);

    // Adicionar totais por forma de pagamento
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('Vendas por Forma de Pagamento:', 20, summaryStartY + 35);
    
    doc.setFont(undefined, 'normal');
    let paymentStartY = summaryStartY + 45;
    paymentMethods.forEach((method, index) => {
      const total = paymentTotals[method];
      if (total > 0) {
        doc.text(`${method}: ${formatCurrency(total)}`, 20, paymentStartY + (index * 8));
      }
    });

    console.log('Resumo adicionado no PDF');

    // Salvar arquivo
    const fileName = generateFileName('pdf');
    console.log('Salvando arquivo:', fileName);
    doc.save(fileName);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-2">
        <FileText className="h-6 w-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">Relatório de Vendas</h1>
      </div>

      {/* Filtros de Data */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Período para Análise</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Data Inicial */}
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium text-gray-700">Data Inicial</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[240px] justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data inicial"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Data Final */}
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium text-gray-700">Data Final</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[240px] justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data final"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {startDate && endDate && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                🗓️ Período selecionado: {format(startDate, "dd/MM/yyyy", { locale: ptBR })} até {format(endDate, "dd/MM/yyyy", { locale: ptBR })}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabela de Vendas */}
      {startDate && endDate && (
        <div className="space-y-6">
          {/* Vendas da Loja */}
          {ownerSales.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Vendas da Loja ({ownerSales.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>Valor Total</TableHead>
                      <TableHead>Forma de Pagamento</TableHead>
                      <TableHead>Data da Venda</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ownerSales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell className="font-medium">
                          {getClientName(sale.client_id)}
                        </TableCell>
                        <TableCell>
                          {getProductName(sale.product_id)}
                        </TableCell>
                        <TableCell className="font-semibold text-green-600">
                          {formatCurrency(Number(sale.total_value))}
                        </TableCell>
                        <TableCell>
                          {sale.payment_method || 'À vista'}
                        </TableCell>
                         <TableCell>
                           {formatDate(sale.sale_date)}
                         </TableCell>
                         <TableCell>
                           {['Dinheiro', 'Cartão de Débito', 'Cartão de Crédito', 'PIX'].includes(sale.payment_method || '') ? (
                             <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                               Pago
                             </span>
                           ) : (
                             <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                               Parcelado
                             </span>
                           )}
                         </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Vendas dos Funcionários */}
          {employeeSales.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Vendas dos Funcionários ({employeeSales.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Funcionário</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>Valor Total</TableHead>
                      <TableHead>Forma de Pagamento</TableHead>
                      <TableHead>Data da Venda</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employeeSales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell className="font-medium text-blue-600">
                          {getFuncionarioName(sale.user_id)}
                        </TableCell>
                        <TableCell>
                          {getClientName(sale.client_id)}
                        </TableCell>
                        <TableCell>
                          {getProductName(sale.product_id)}
                        </TableCell>
                        <TableCell className="font-semibold text-green-600">
                          {formatCurrency(Number(sale.total_value))}
                        </TableCell>
                        <TableCell>
                          {sale.payment_method || 'À vista'}
                        </TableCell>
                         <TableCell>
                           {formatDate(sale.sale_date)}
                         </TableCell>
                         <TableCell>
                           {['Dinheiro', 'Cartão de Débito', 'Cartão de Crédito', 'PIX'].includes(sale.payment_method || '') ? (
                             <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                               Pago
                             </span>
                           ) : (
                             <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                               Parcelado
                             </span>
                           )}
                         </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Tabela Unificada */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Todas as Vendas no Período 
                <span className="text-sm font-normal text-gray-600 ml-2">
                  (Loja + Funcionários)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredSales.length > 0 ? (
                <div className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Vendedor</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead>Valor Total</TableHead>
                        <TableHead>Forma de Pagamento</TableHead>
                        <TableHead>Data da Venda</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSales.map((sale) => (
                        <TableRow key={sale.id}>
                          <TableCell className="font-medium">
                            <span className={sale.user_id === user?.id ? "text-purple-600" : "text-blue-600"}>
                              {sale.user_id === user?.id ? "Loja" : getFuncionarioName(sale.user_id)}
                            </span>
                          </TableCell>
                          <TableCell>
                            {getClientName(sale.client_id)}
                          </TableCell>
                          <TableCell>
                            {getProductName(sale.product_id)}
                          </TableCell>
                          <TableCell className="font-semibold text-green-600">
                            {formatCurrency(Number(sale.total_value))}
                          </TableCell>
                          <TableCell>
                            {sale.payment_method || 'À vista'}
                          </TableCell>
                          <TableCell>
                            {formatDate(sale.sale_date)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Botão de Exportação - apenas PDF */}
                  <div className="flex pt-4 border-t">
                    <Button
                      onClick={exportToPDF}
                      variant="outline"
                      className="flex items-center space-x-2"
                    >
                      <FileText className="h-4 w-4" />
                      <span>📄 Exportar PDF</span>
                    </Button>
                  </div>

                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      Resumo do Período - Faturamento Total da Loja
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl">📊</span>
                        <div>
                          <p className="text-sm text-gray-600">Total Vendido</p>
                          <p className="text-xl font-bold text-green-600">
                            {formatCurrency(totalValue)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl">📈</span>
                        <div>
                          <p className="text-sm text-gray-600">Quantidade de Vendas</p>
                          <p className="text-xl font-bold text-blue-600">
                            {totalSales}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="text-2xl">💰</span>
                        <div>
                          <p className="text-sm text-gray-600">Comissão Estimada</p>
                          <p className="text-xl font-bold text-purple-600">
                            {formatCurrency(totalCommission)}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Detalhamento por vendedor */}
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-3 bg-purple-50 rounded">
                        <h4 className="font-medium text-purple-800">Vendas da Loja</h4>
                        <p className="text-sm text-purple-600">
                          {ownerSales.length} vendas • {formatCurrency(ownerSales.reduce((sum, sale) => sum + Number(sale.total_value), 0))}
                        </p>
                      </div>
                      <div className="p-3 bg-blue-50 rounded">
                        <h4 className="font-medium text-blue-800">Vendas dos Funcionários</h4>
                        <p className="text-sm text-blue-600">
                          {employeeSales.length} vendas • {formatCurrency(employeeSales.reduce((sum, sale) => sum + Number(sale.total_value), 0))}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 p-2 bg-blue-100 rounded">
                      <p className="text-sm text-blue-800">
                        ℹ️ Este relatório inclui todas as vendas da loja, incluindo vendas feitas pelos funcionários, 
                        somadas ao faturamento total da loja.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">Nenhuma venda encontrada no período selecionado.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Mensagem quando não há período selecionado */}
      {(!startDate || !endDate) && (
        <Card>
          <CardContent className="text-center py-8">
            <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">Selecione o período inicial e final para visualizar o relatório de vendas.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SalesReport;
