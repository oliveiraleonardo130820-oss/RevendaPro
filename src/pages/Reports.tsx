import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useData } from '@/contexts/DataContext';
import { useCrediario } from '@/contexts/CrediarioContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FileText, TrendingUp, Users, Package, Calendar, CalendarIcon, DollarSign, Percent, Award, TrendingDown, Download, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { cn, parseLocalDate } from '@/lib/utils';
interface ProductSaleData {
  quantity: number;
  revenue: number;
  commission: number;
  salesCount: number;
}
interface ClientSaleData {
  totalSpent: number;
  purchaseCount: number;
  commission: number;
}
interface MonthlyData {
  month: string;
  vendas: number;
  comissao: number;
}
interface Despesa {
  id: string;
  nome: string;
  valor: number;
  data: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}
const Reports = () => {
  const {
    sales,
    clients,
    products,
    installments
  } = useData();
  const {
    parcelas: parcelasCrediario
  } = useCrediario();
  const {
    session,
    user
  } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState('thisMonth');
  const [despesas, setDespesas] = useState<Despesa[]>([]);

  // Funções de filtro primeiro para que possam ser usadas no useEffect
  const getFilteredSales = () => {
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
        return sales.filter(sale => {
          const saleDate = new Date(sale.sale_date + 'T00:00:00');
          return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear;
        });
      case 'lastMonth': {
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        return sales.filter(sale => {
          const saleDate = new Date(sale.sale_date + 'T00:00:00');
          return saleDate.getMonth() === lastMonth && saleDate.getFullYear() === lastMonthYear;
        });
      }
      case 'last3Months': {
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        return sales.filter(sale => new Date(sale.sale_date + 'T00:00:00') >= threeMonthsAgo);
      }
      case 'thisYear':
        return sales.filter(sale => new Date(sale.sale_date + 'T00:00:00').getFullYear() === currentYear);
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
      case 'december': {
        const targetMonth = monthMap[selectedPeriod];
        return sales.filter(sale => {
          const saleDate = new Date(sale.sale_date + 'T00:00:00');
          return saleDate.getMonth() === targetMonth && saleDate.getFullYear() === currentYear;
        });
      }
      default:
        return sales;
    }
  };

  const getFilteredDespesas = () => {
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
        return despesas.filter(despesa => {
          const despesaDate = new Date(despesa.data + 'T00:00:00');
          return despesaDate.getMonth() === currentMonth && despesaDate.getFullYear() === currentYear;
        });
      case 'lastMonth': {
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        return despesas.filter(despesa => {
          const despesaDate = new Date(despesa.data + 'T00:00:00');
          return despesaDate.getMonth() === lastMonth && despesaDate.getFullYear() === lastMonthYear;
        });
      }
      case 'last3Months': {
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        return despesas.filter(despesa => new Date(despesa.data + 'T00:00:00') >= threeMonthsAgo);
      }
      case 'thisYear':
        return despesas.filter(despesa => new Date(despesa.data + 'T00:00:00').getFullYear() === currentYear);
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
      case 'december': {
        const targetMonth = monthMap[selectedPeriod];
        return despesas.filter(despesa => {
          const despesaDate = new Date(despesa.data + 'T00:00:00');
          return despesaDate.getMonth() === targetMonth && despesaDate.getFullYear() === currentYear;
        });
      }
      default:
        return despesas;
    }
  };

  // Debug log para verificar mudanças no filtro
  useEffect(() => {
    console.log('Período selecionado mudou para:', selectedPeriod);
    console.log('Vendas filtradas:', getFilteredSales().length);
    console.log('Despesas filtradas:', getFilteredDespesas().length);
  }, [selectedPeriod, sales, despesas]);

  // Estados para o relatório de vendas
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [funcionarios, setFuncionarios] = useState<any[]>([]);

  // Load despesas
  const loadDespesas = async () => {
    if (!session?.user) return;
    try {
      const {
        data: despesasData,
        error
      } = await supabase.from('despesas').select('*').order('data', {
        ascending: false
      });
      if (error) {
        console.error('Erro ao carregar despesas:', error);
        return;
      }
      setDespesas(despesasData || []);
    } catch (error) {
      console.error('Erro ao carregar despesas:', error);
    }
  };
  useEffect(() => {
    loadDespesas();
    if (user?.tipo_usuario === 'dono') {
      loadFuncionarios();
    }
  }, [session, user]);

  // Carregar funcionários para o relatório de vendas
  const loadFuncionarios = async () => {
    if (!user) return;
    try {
      const {
        data,
        error
      } = await supabase.from('funcionarios').select('*').eq('loja_id', user.id);
      if (error) {
        console.error('Erro ao carregar funcionários:', error);
      } else {
        setFuncionarios(data || []);
      }
    } catch (error) {
      console.error('Erro inesperado:', error);
    }
  };

  // Helper functions
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy', {
      locale: ptBR
    });
  };
  const getClientName = (clientId: string | null) => {
    if (!clientId) return 'Cliente não identificado';
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : 'Cliente não encontrado';
  };
  const getProductName = (productId: string | null) => {
    if (!productId) return 'Produto não identificado';
    const product = products.find(p => p.id === productId);
    return product ? product.name : 'Produto não encontrado';
  };
  const getFuncionarioName = (userId: string) => {
    const funcionario = funcionarios.find(f => f.user_id === userId);
    return funcionario ? funcionario.nome : 'Funcionário não encontrado';
  };

  const filteredSales = getFilteredSales();
  const filteredDespesas = getFilteredDespesas();

  // Função para calcular faturamento real usando a mesma lógica do dashboard
  const calculateRealRevenue = () => {
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

    // Função para filtrar por período selecionado
    const getDateFilter = () => {
      switch (selectedPeriod) {
        case 'thisMonth':
          return (date: Date) => date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        case 'lastMonth': {
          const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
          const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
          return (date: Date) => date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear;
        }
        case 'last3Months': {
          const threeMonthsAgo = new Date();
          threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
          return (date: Date) => date >= threeMonthsAgo;
        }
        case 'thisYear':
          return (date: Date) => date.getFullYear() === currentYear;
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
        case 'december': {
          const targetMonth = monthMap[selectedPeriod];
          return (date: Date) => date.getMonth() === targetMonth && date.getFullYear() === currentYear;
        }
        default:
          return () => true;
      }
    };

    const dateFilter = getDateFilter();

    // Métodos de pagamento à vista
    const paymentMethodsAvista = ['Dinheiro', 'Cartão de Débito', 'Cartão de Crédito', 'PIX'];

    // 1. Vendas à vista do período
    const vendasAvista = sales.filter(sale => {
      const saleDate = new Date(sale.sale_date + 'T00:00:00');
      return dateFilter(saleDate) && paymentMethodsAvista.includes(sale.payment_method || '');
    });

    // 2. Parcelas com status 'pago' no período selecionado
    const parcelasVendaPagas = installments.filter(installment => {
      if (installment.status !== 'pago' || !installment.data_pagamento) return false;
      const paymentDate = parseLocalDate(installment.data_pagamento);
      return dateFilter(paymentDate);
    });

  // 3. Parcelas do crediário com status 'pago' no período selecionado
    const parcelasCrediarioPagas = parcelasCrediario.filter(parcela => {
      if (parcela.status !== 'pago' || !parcela.data_pagamento) return false;
      const paymentDate = parseLocalDate(parcela.data_pagamento);
      return dateFilter(paymentDate);
    });

    // 3.1. Parcelas do crediário pendentes (para mostrar no relatório)
    const parcelasCrediarioPendentes = parcelasCrediario.filter(parcela => {
      return parcela.status === 'pendente';
    });

    // 4. Parcelas com valor pago (parciais) no período selecionado
    const parcelasVendaComValorPago = installments.filter(installment => {
      if (Number(installment.valor_pago || 0) <= 0) return false;
      
      // Filtrar por data_pagamento se existir
      const paymentDate = installment.data_pagamento 
        ? parseLocalDate(installment.data_pagamento)
        : null;
      
      if (!paymentDate) return false;
      return dateFilter(paymentDate);
    });

    const parcelasCrediarioComValorPago = parcelasCrediario.filter(parcela => {
      if (Number((parcela as any).valor_pago || 0) <= 0) return false;
      
      // Filtrar por data_pagamento se existir
      const paymentDate = parcela.data_pagamento 
        ? parseLocalDate(parcela.data_pagamento)
        : null;
      
      if (!paymentDate) return false;
      return dateFilter(paymentDate);
    });

    // 4.1. Parcelas de venda pendentes (para mostrar no relatório)
    const parcelasVendaPendentes = installments.filter(installment => {
      return installment.status === 'pendente';
    });

    // Calcular totais
    const totalVendasAvista = vendasAvista.reduce((sum, sale) => {
      return sum + Number(sale.total_value);
    }, 0);
    
    const totalParcelasVenda = parcelasVendaPagas.reduce((sum, parcela) => sum + Number(parcela.valor_da_parcela), 0);
    const totalParcelasCrediario = parcelasCrediarioPagas.reduce((sum, parcela) => sum + Number(parcela.valor_parcela), 0);
    
    // Adicionar valores pagos das parcelas (incluindo parciais)
    const totalValoresPagosVenda = parcelasVendaComValorPago.reduce((sum, parcela) => {
      // Se o status é 'pago', usar o valor total da parcela
      if (parcela.status === 'pago') return sum;
      // Se tem valor_pago mas não está com status 'pago', usar o valor_pago
      return sum + Number(parcela.valor_pago || 0);
    }, 0);
    
    const totalValoresPagosCrediario = parcelasCrediarioComValorPago.reduce((sum, parcela) => {
      // Se o status é 'pago', não contar aqui pois já foi contado em totalParcelasCrediario
      if (parcela.status === 'pago') return sum;
      // Se tem valor_pago mas não está com status 'pago', usar o valor_pago
      return sum + Number((parcela as any).valor_pago || 0);
    }, 0);

    // Total usando a mesma lógica do dashboard
    const totalRevenue = totalVendasAvista + totalParcelasVenda + totalParcelasCrediario + totalValoresPagosVenda + totalValoresPagosCrediario;

    // Comissão das vendas à vista
    const comissaoVendasAvista = vendasAvista.reduce((sum, sale) => sum + Number(sale.commission || 0), 0);

    // Comissão das parcelas pagas (proporcional)
    const comissaoParcelasPagas = parcelasVendaPagas.reduce((sum, parcela) => {
      const sale = sales.find(s => s.id === parcela.venda_id);
      if (sale) {
        const proporção = Number(parcela.valor_da_parcela) / Number(sale.total_value);
        return sum + Number(sale.commission || 0) * proporção;
      }
      return sum;
    }, 0);

    // Comissão do crediário (sem comissão automática)
    const comissaoCrediario = 0;
    const totalCommission = comissaoVendasAvista + comissaoParcelasPagas + comissaoCrediario;

    return {
      totalRevenue,
      totalCommission,
      parcelasCrediarioPendentes,
      parcelasVendaPendentes
    };
  };

  // Estatísticas gerais
  const {
    totalRevenue,
    totalCommission,
    parcelasCrediarioPendentes,
    parcelasVendaPendentes
  } = calculateRealRevenue();
  const totalDespesas = filteredDespesas.reduce((sum, despesa) => sum + despesa.valor, 0);
  const valorLiquido = totalRevenue - totalDespesas;

  // Calcular dados para o relatório de vendas
  const filteredSalesReport = startDate && endDate ? sales.filter(sale => {
    const saleDate = parseLocalDate(sale.sale_date);
    return saleDate >= startDate && saleDate <= endDate;
  }) : [];

  // Filtrar vendas de crediário por período - apenas vendas quitadas
  const { vendas: crediarioVendas } = useCrediario();
  const filteredCrediarioReport = startDate && endDate ? crediarioVendas.filter(venda => {
    const vendaDate = parseLocalDate(venda.data_venda);
    const isInPeriod = vendaDate >= startDate && vendaDate <= endDate;
    const isQuitada = venda.status === 'quitado';
    return isInPeriod && isQuitada;
  }) : [];

  const totalSalesReport = filteredSalesReport.length + filteredCrediarioReport.length;
  const totalValueReport = filteredSalesReport.reduce((sum, sale) => sum + Number(sale.total_value), 0) + 
                           filteredCrediarioReport.reduce((sum, venda) => sum + Number(venda.valor_total), 0);
  const totalCommissionReport = filteredSalesReport.reduce((sum, sale) => sum + Number(sale.commission || 0), 0) + 
                                filteredCrediarioReport.reduce((sum, venda) => {
                                  const produto = products.find(p => p.id === venda.produto_id);
                                  return sum + Number(produto?.commission || 0);
                                }, 0);
  const ownerSales = filteredSalesReport.filter(sale => sale.user_id === user?.id);
  const employeeSales = filteredSalesReport.filter(sale => sale.user_id !== user?.id);

  // Processar dados para os gráficos
  const productSales: Record<string, ProductSaleData> = {};
  const clientSales: Record<string, ClientSaleData> = {};
  filteredSales.forEach(sale => {
    // Dados dos produtos
    if (sale.product_id) {
      if (!productSales[sale.product_id]) {
        productSales[sale.product_id] = {
          quantity: 0,
          revenue: 0,
          commission: 0,
          salesCount: 0
        };
      }
      productSales[sale.product_id].quantity += Number(sale.quantity || 1);
      productSales[sale.product_id].revenue += Number(sale.total_value);
      productSales[sale.product_id].commission += Number(sale.commission || 0);
      productSales[sale.product_id].salesCount += 1;
    }

    // Dados dos clientes
    if (sale.client_id) {
      if (!clientSales[sale.client_id]) {
        clientSales[sale.client_id] = {
          totalSpent: 0,
          purchaseCount: 0,
          commission: 0
        };
      }
      clientSales[sale.client_id].totalSpent += Number(sale.total_value);
      clientSales[sale.client_id].purchaseCount += 1;
      clientSales[sale.client_id].commission += Number(sale.commission || 0);
    }
  });

  // Dados mensais para o gráfico
  const monthlySalesData: MonthlyData[] = [];
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  for (let i = 0; i < 12; i++) {
    const monthSales = sales.filter(sale => {
      const saleDate = new Date(sale.sale_date + 'T00:00:00');
      return saleDate.getMonth() === i && saleDate.getFullYear() === new Date().getFullYear();
    });
    
    // Parcelas pagas do mês
    const monthInstallments = installments.filter(installment => {
      if (installment.status !== 'pago' || !installment.data_pagamento) return false;
      const paymentDate = new Date(installment.data_pagamento + 'T00:00:00');
      return paymentDate.getMonth() === i && paymentDate.getFullYear() === new Date().getFullYear();
    });

    // Parcelas crediário pagas do mês
    const monthCrediarioInstallments = parcelasCrediario.filter(parcela => {
      if (parcela.status !== 'pago' || !parcela.data_pagamento) return false;
      const paymentDate = new Date(parcela.data_pagamento + 'T00:00:00');
      return paymentDate.getMonth() === i && paymentDate.getFullYear() === new Date().getFullYear();
    });
    
    const monthRevenue = monthSales.reduce((sum, sale) => sum + Number(sale.total_value), 0);
    const monthInstallmentRevenue = monthInstallments.reduce((sum, installment) => sum + Number(installment.valor_pago || installment.valor_da_parcela), 0);
    const monthCrediarioRevenue = monthCrediarioInstallments.reduce((sum, parcela) => sum + Number(parcela.valor_parcela), 0);
    const totalMonthRevenue = monthRevenue + monthInstallmentRevenue + monthCrediarioRevenue;
    
    const monthCommission = monthSales.reduce((sum, sale) => sum + Number(sale.commission || 0), 0);
    monthlySalesData.push({
      month: monthNames[i],
      vendas: totalMonthRevenue,
      comissao: monthCommission
    });
  }

  // Dados para o gráfico de pizza
  const pieData = Object.entries(productSales).map(([productId, data], index) => {
    const product = products.find(p => p.id === productId);
    const blueShades = [
      'hsl(210, 70%, 50%)',  // Azul padrão
      'hsl(210, 70%, 60%)',  // Azul mais claro
      'hsl(210, 70%, 40%)',  // Azul mais escuro
      'hsl(210, 70%, 70%)',  // Azul claro
      'hsl(210, 70%, 30%)'   // Azul escuro
    ];
    return {
      name: product?.name || 'Produto não encontrado',
      value: data.quantity,
      color: blueShades[index % blueShades.length]
    };
  }).sort((a, b) => b.value - a.value).slice(0, 5);

  // Top produtos
  const topProducts = Object.entries(productSales).map(([productId, data]) => {
    const product = products.find(p => p.id === productId);
    return {
      id: productId,
      name: product?.name || 'Produto não encontrado',
      ...data
    };
  }).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  // Top clientes
  const topClients = Object.entries(clientSales).map(([clientId, data]) => {
    const client = clients.find(c => c.id === clientId);
    return {
      id: clientId,
      name: client?.name || 'Cliente não encontrado',
      phone: client?.phone || '',
      ...data
    };
  }).sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5);

  // Função para formatar valores monetários
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };
  const getPeriodName = () => {
    switch (selectedPeriod) {
      case 'thisMonth':
        return 'Este mês';
      case 'lastMonth':
        return 'Mês passado';
      case 'last3Months':
        return 'Últimos 3 meses';
      case 'thisYear':
        return 'Este ano';
      case 'january':
        return 'Janeiro';
      case 'february':
        return 'Fevereiro';
      case 'march':
        return 'Março';
      case 'april':
        return 'Abril';
      case 'may':
        return 'Maio';
      case 'june':
        return 'Junho';
      case 'july':
        return 'Julho';
      case 'august':
        return 'Agosto';
      case 'september':
        return 'Setembro';
      case 'october':
        return 'Outubro';
      case 'november':
        return 'Novembro';
      case 'december':
        return 'Dezembro';
      default:
        return 'Todo período';
    }
  };
  const exportFinancialReportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('Relatório Financeiro', 20, 20);
    doc.setFontSize(12);
    doc.text(`Período: ${getPeriodName()}`, 20, 35);
    const data = [['Faturamento Total', formatCurrency(totalRevenue)], ['Total de Despesas', formatCurrency(totalDespesas)], ['Valor Líquido', formatCurrency(valorLiquido)], ['Total de Vendas', filteredSales.length.toString()], ['Comissão Total', formatCurrency(totalCommission)]];
    autoTable(doc, {
      head: [['Descrição', 'Valor']],
      body: data,
      startY: 45,
      styles: {
        fontSize: 12
      },
      headStyles: {
        fillColor: [66, 139, 202]
      }
    });
    doc.save(`relatorio-financeiro-${getPeriodName().toLowerCase().replace(/\s+/g, '-')}.pdf`);
  };
  const exportSalesReportToPDF = () => {
    if (filteredSalesReport.length === 0) {
      alert('Não há dados para exportar');
      return;
    }
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('Relatório de Vendas', 20, 20);
    if (startDate && endDate) {
      doc.setFontSize(12);
      const periodText = `Período: ${format(startDate, 'dd/MM/yyyy', {
        locale: ptBR
      })} até ${format(endDate, 'dd/MM/yyyy', {
        locale: ptBR
      })}`;
      doc.text(periodText, 20, 35);
    }
    const tableData = filteredSalesReport.map(sale => [getClientName(sale.client_id), getProductName(sale.product_id), formatCurrency(Number(sale.total_value)), sale.payment_method || 'À vista', formatDate(sale.sale_date), sale.user_id === user?.id ? 'Loja' : getFuncionarioName(sale.user_id)]);
    autoTable(doc, {
      head: [['Cliente', 'Produto', 'Valor Total', 'Forma de Pagamento', 'Data da Venda', 'Vendedor']],
      body: tableData,
      startY: 45,
      styles: {
        fontSize: 10,
        cellPadding: 3
      },
      headStyles: {
        fillColor: [66, 139, 202],
        textColor: [255, 255, 255]
      }
    });
    const finalY = (doc as any).lastAutoTable.finalY || 100;
    let startY: number;
    if (doc.internal.pageSize.height - finalY < 60) {
      doc.addPage();
      startY = 20;
    } else {
      startY = finalY + 20;
    }
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('RESUMO DO PERÍODO', 20, startY);
    doc.setLineWidth(0.5);
    doc.line(20, startY + 5, 190, startY + 5);
    const paymentMethods = ['Dinheiro', 'Cartão de Débito', 'Cartão de Crédito', 'PIX'];
    const paymentTotals = paymentMethods.reduce((acc, method) => {
      const methodSales = filteredSalesReport.filter(sale => sale.payment_method === method);
      acc[method] = methodSales.reduce((sum, sale) => sum + Number(sale.total_value), 0);
      return acc;
    }, {} as Record<string, number>);
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    const summaryStartY = startY + 15;
    doc.text(`Total de vendas: ${totalSalesReport}`, 20, summaryStartY);
    doc.text(`Valor total vendido: ${formatCurrency(totalValueReport)}`, 20, summaryStartY + 10);
    doc.text(`Comissão estimada: ${formatCurrency(totalCommissionReport)}`, 20, summaryStartY + 20);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('Vendas por Forma de Pagamento:', 20, summaryStartY + 35);
    doc.setFont(undefined, 'normal');
    const paymentStartY = summaryStartY + 45;
    paymentMethods.forEach((method, index) => {
      const total = paymentTotals[method];
      if (total > 0) {
        doc.text(`${method}: ${formatCurrency(total)}`, 20, paymentStartY + index * 8);
      }
    });
    const fileName = `relatorio-vendas-${getPeriodName().toLowerCase().replace(/\s+/g, '-')}-${format(new Date(), 'dd-MM-yyyy', {
      locale: ptBR
    })}.pdf`;
    doc.save(fileName);
  };
  return <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Relatórios</h1>
          <p className="text-sm sm:text-base text-gray-600">Análise detalhada do seu desempenho</p>
        </div>
      </div>

      <Tabs defaultValue="analytics" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="analytics">Relatório Analítico</TabsTrigger>
          <TabsTrigger value="sales">Relatório de Vendas</TabsTrigger>
        </TabsList>
        
        <TabsContent value="analytics" className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-full sm:w-48">
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
            
            <Button onClick={exportFinancialReportToPDF} variant="outline" className="flex items-center space-x-2">
              <Download className="h-4 w-4" />
              <span>📄 Exportar PDF</span>
            </Button>
          </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">
              Faturamento Total
            </CardTitle>
            <DollarSign className="h-4 w-4 opacity-90" />
          </CardHeader>
           <CardContent>
            <div className="text-xl sm:text-2xl font-bold">
              R$ {totalRevenue.toLocaleString('pt-BR', {
                  minimumFractionDigits: 2
                })}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">
              Total de Despesas
            </CardTitle>
            <TrendingUp className="h-4 w-4 opacity-90" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">
              R$ {totalDespesas.toLocaleString('pt-BR', {
                  minimumFractionDigits: 2
                })}
            </div>
            <p className="text-xs opacity-90">
              {filteredDespesas.length} despesas no período
            </p>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-r ${valorLiquido >= 0 ? 'from-green-500 to-green-600' : 'from-red-500 to-red-600'} text-white`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">
              Valor Líquido
            </CardTitle>
            {valorLiquido >= 0 ? <TrendingUp className="h-4 w-4 opacity-90" /> : <TrendingDown className="h-4 w-4 opacity-90" />}
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">
              R$ {valorLiquido.toLocaleString('pt-BR', {
                  minimumFractionDigits: 2
                })}
            </div>
            <p className="text-xs opacity-90">
              Faturamento - Despesas
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">
              Clientes Ativos
            </CardTitle>
            <Users className="h-4 w-4 opacity-90" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{Object.keys(clientSales).length}</div>
            <p className="text-xs opacity-90">
              Com compras no período
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Monthly Sales Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              <span>Vendas por Período</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlySalesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" fontSize={12} className="text-xs" />
                  <YAxis fontSize={12} />
                  <Tooltip formatter={(value, name) => [`R$ ${Number(value).toLocaleString('pt-BR', {
                      minimumFractionDigits: 2
                    })}`, name === 'vendas' ? 'Vendas' : 'Comissão']} />
                  <Bar dataKey="vendas" fill="#3B82F6" />
                  <Bar dataKey="comissao" fill="#10B981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Product Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
              <Package className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
              <span>Distribuição de Produtos</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={window.innerWidth < 640 ? 60 : 80} dataKey="value" label={({
                      name,
                      percent
                    }) => `${name} ${(percent * 100).toFixed(0)}%`} fontSize={12}>
                    {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={value => [`${value} unidades`, 'Vendidas']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
              <Award className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600" />
              <span>Produtos Mais Vendidos</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 sm:space-y-4">
              {topProducts.length === 0 ? <div className="text-center py-8 text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">Nenhuma venda no período selecionado</p>
                </div> : topProducts.map((product, index) => <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 rounded-full">
                        <span className="text-xs sm:text-sm font-bold text-blue-600">#{index + 1}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 text-sm sm:text-base truncate">{product.name}</p>
                        <p className="text-xs sm:text-sm text-gray-600">
                          {product.salesCount} vendas • {product.quantity} unidades
                        </p>
                      </div>
                    </div>
                    <div className="text-right ml-2">
                      <p className="font-semibold text-gray-900 text-sm sm:text-base">
                        R$ {product.revenue.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2
                      })}
                      </p>
                      <p className="text-xs sm:text-sm text-green-600">
                        +R$ {product.commission.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2
                      })}
                      </p>
                    </div>
                  </div>)}
            </div>
          </CardContent>
        </Card>

        {/* Top Clients */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
              <span>Clientes Mais Ativos</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 sm:space-y-4">
              {topClients.length === 0 ? <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">Nenhuma venda no período selecionado</p>
                </div> : topClients.map((client, index) => <div key={client.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 bg-green-100 rounded-full">
                        <span className="text-xs sm:text-sm font-bold text-green-600">#{index + 1}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 text-sm sm:text-base truncate">{client.name}</p>
                        <p className="text-xs sm:text-sm text-gray-600 truncate">
                          {client.phone} • {client.purchaseCount} compras
                        </p>
                      </div>
                    </div>
                    <div className="text-right ml-2">
                      <p className="font-semibold text-gray-900 text-sm sm:text-base">
                        R$ {client.totalSpent.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2
                      })}
                      </p>
                      <Badge variant="secondary" className="text-xs">
                        Top Client
                      </Badge>
                    </div>
                  </div>)}
            </div>
          </CardContent>
        </Card>
      </div>
        </TabsContent>
        
        <TabsContent value="sales" className="space-y-6">
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
                      <Button variant="outline" className={cn("w-[240px] justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "dd/MM/yyyy", {
                        locale: ptBR
                      }) : "Selecione a data inicial"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent mode="single" selected={startDate} onSelect={setStartDate} initialFocus className="pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Data Final */}
                <div className="flex flex-col space-y-2">
                  <label className="text-sm font-medium text-gray-700">Data Final</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-[240px] justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "dd/MM/yyyy", {
                        locale: ptBR
                      }) : "Selecione a data final"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent mode="single" selected={endDate} onSelect={setEndDate} initialFocus className="pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {startDate && endDate && <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    🗓️ Período selecionado: {format(startDate, "dd/MM/yyyy", {
                  locale: ptBR
                })} até {format(endDate, "dd/MM/yyyy", {
                  locale: ptBR
                })}
                  </p>
                </div>}
            </CardContent>
          </Card>

          {/* Relatório de Vendas */}
          {startDate && endDate && <div className="space-y-6">
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
                  {filteredSalesReport.length > 0 ? <div className="space-y-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Vendedor</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Produto</TableHead>
                            <TableHead>Valor Total</TableHead>
                            <TableHead>Desconto</TableHead>
                            <TableHead>Forma de Pagamento</TableHead>
                            <TableHead>Data da Venda</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredSalesReport.map(sale => <TableRow key={sale.id}>
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
                              <TableCell className="text-red-600">
                                {formatCurrency(Number(sale.desconto || 0))}
                              </TableCell>
                              <TableCell>
                                {sale.payment_method || 'À vista'}
                              </TableCell>
                              <TableCell>
                                {formatDate(sale.sale_date)}
                              </TableCell>
                            </TableRow>)}
                          {filteredCrediarioReport.map(venda => <TableRow key={`crediario-${venda.id}`}>
                              <TableCell className="font-medium">
                                <span className="text-orange-600">
                                  Loja
                                </span>
                              </TableCell>
                              <TableCell>
                                {getClientName(venda.client_id)}
                              </TableCell>
                              <TableCell>
                                {getProductName(venda.produto_id)}
                              </TableCell>
                              <TableCell className="font-semibold text-green-600">
                                {formatCurrency(Number(venda.valor_total))}
                              </TableCell>
                              <TableCell className="text-red-600">
                                {formatCurrency(Number(venda.desconto || 0))}
                              </TableCell>
                              <TableCell>
                                Crediário
                              </TableCell>
                              <TableCell>
                                {formatDate(venda.data_venda)}
                              </TableCell>
                            </TableRow>)}
                        </TableBody>
                      </Table>

                      {/* Botão de Exportação */}
                      <div className="flex pt-4 border-t">
                        <Button onClick={exportSalesReportToPDF} variant="outline" className="flex items-center space-x-2">
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
                                {formatCurrency(totalValueReport)}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <span className="text-2xl">📈</span>
                            <div>
                              <p className="text-sm text-gray-600">Quantidade de Vendas</p>
                              <p className="text-xl font-bold text-blue-600">
                                {totalSalesReport}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <span className="text-2xl">💰</span>
                            <div>
                              <p className="text-sm text-gray-600">Comissão Estimada</p>
                              <p className="text-xl font-bold text-purple-600">
                                {formatCurrency(totalCommissionReport)}
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

                        {/* Seção de Parcelas Pendentes */}
                        <div className="mt-6">
                          <h4 className="font-semibold text-gray-900 mb-3">Parcelas Pendentes</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-3 bg-orange-50 rounded">
                              <h5 className="font-medium text-orange-800">Parcelas de Vendas</h5>
                              <p className="text-sm text-orange-600">
                                {parcelasVendaPendentes.length} parcelas pendentes
                              </p>
                              <p className="text-lg font-bold text-orange-600">
                                {formatCurrency(parcelasVendaPendentes.reduce((sum, parcela) => sum + Number(parcela.valor_da_parcela), 0))}
                              </p>
                            </div>
                            <div className="p-3 bg-yellow-50 rounded">
                              <h5 className="font-medium text-yellow-800">Parcelas do Crediário</h5>
                              <p className="text-sm text-yellow-600">
                                {parcelasCrediarioPendentes.length} parcelas pendentes
                              </p>
                              <p className="text-lg font-bold text-yellow-600">
                                {formatCurrency(parcelasCrediarioPendentes.reduce((sum, parcela) => sum + Number(parcela.valor_parcela), 0))}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 p-2 bg-blue-100 rounded">
                          <p className="text-sm text-blue-800">
                            ℹ️ Este relatório inclui todas as vendas da loja, incluindo vendas feitas pelos funcionários, 
                            somadas ao faturamento total da loja.
                          </p>
                        </div>
                      </div>
                    </div> : <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-500">Nenhuma venda encontrada no período selecionado.</p>
                    </div>}
                </CardContent>
              </Card>
            </div>}

          {/* Mensagem quando não há período selecionado */}
          {(!startDate || !endDate) && <Card>
              <CardContent className="text-center py-8">
                <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">Selecione o período inicial e final para visualizar o relatório de vendas.</p>
              </CardContent>
            </Card>}
        </TabsContent>
      </Tabs>
    </div>;
};
export default Reports;