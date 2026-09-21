import React, { useState, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCrediario } from '@/contexts/CrediarioContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, Target, Percent, Users, TrendingUp, Calendar, Edit } from 'lucide-react';

const Dashboard = () => {
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [goalValue, setGoalValue] = useState('10000');
  const [currentGoal, setCurrentGoal] = useState(10000);
  const [showCelebration, setShowCelebration] = useState(false);
  
  const {
    sales,
    clients,
    products,
    installments,
    getMonthlyStats,
    setMonthlyGoal,
    getMonthlyGoal
  } = useData();
  const {
    user
  } = useAuth();
  const {
    parcelas: parcelasCrediario
  } = useCrediario();

  // Carregar meta atual ao montar o componente
  React.useEffect(() => {
    const loadCurrentGoal = async () => {
      const goal = await getMonthlyGoal();
      setCurrentGoal(goal);
      setGoalValue(goal.toString());
    };
    
    if (user?.id) {
      loadCurrentGoal();
    }
  }, [user?.id, getMonthlyGoal]);

  // Calcular estatísticas do mês considerando APENAS vendas e parcelas do mês atual
  const calculateMonthlyStats = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Métodos de pagamento à vista
    const paymentMethodsAvista = ['Dinheiro', 'Cartão de Débito', 'Cartão de Crédito', 'PIX'];

    // 1. Todas as vendas do mês atual
    const vendasDoMes = sales.filter(sale => {
      const saleDate = new Date(sale.sale_date + 'T00:00:00');
      return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear;
    });

    // 2. Vendas à vista (usar valor total da venda)
    const vendasAvistaDoMes = vendasDoMes.filter(sale => 
      paymentMethodsAvista.includes(sale.payment_method || '')
    );

    // 3. Parcelas com status 'pago' de vendas parceladas do mês atual (filtrar por data_pagamento)
    const parcelasVendaPagas = installments.filter(installment => {
      if (installment.status !== 'pago') return false;
      const sale = sales.find(s => s.id === installment.venda_id);
      if (!sale || paymentMethodsAvista.includes(sale.payment_method || '')) return false;
      
      // Filtrar por data_pagamento
      const paymentDate = installment.data_pagamento 
        ? new Date(installment.data_pagamento + 'T00:00:00')
        : null;
      
      if (!paymentDate) return false;
      return paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear;
    });

    // 3. Parcelas do crediário com status 'pago' do mês atual (filtrar por data_pagamento)
    const parcelasCrediarioPagas = parcelasCrediario.filter(parcela => {
      if (parcela.status !== 'pago') return false;
      
      // Filtrar por data_pagamento
      const paymentDate = parcela.data_pagamento 
        ? new Date(parcela.data_pagamento + 'T00:00:00')
        : null;
      
      if (!paymentDate) return false;
      return paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear;
    });

    // 4. Parcelas com valor pago (parciais) do mês atual (filtrar por data_pagamento)
    const parcelasVendaComValorPago = installments.filter(installment => {
      if (Number(installment.valor_pago || 0) <= 0) return false;
      
      // Filtrar por data_pagamento se existir
      const paymentDate = installment.data_pagamento 
        ? new Date(installment.data_pagamento + 'T00:00:00')
        : null;
      
      if (!paymentDate) return false;
      return paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear;
    });

    const parcelasCrediarioComValorPago = parcelasCrediario.filter(parcela => {
      if (Number((parcela as any).valor_pago || 0) <= 0) return false;
      
      // Filtrar por data_pagamento se existir
      const paymentDate = parcela.data_pagamento 
        ? new Date(parcela.data_pagamento + 'T00:00:00')
        : null;
      
      if (!paymentDate) return false;
      return paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear;
    });

    // Calcular totais
    const totalVendasAvista = vendasAvistaDoMes.reduce((sum, sale) => sum + Number(sale.total_value), 0);
    const totalParcelasVenda = parcelasVendaPagas.reduce((sum, parcela) => sum + Number(parcela.valor_da_parcela), 0);
    const totalParcelasCrediario = parcelasCrediarioPagas.reduce((sum, parcela) => sum + Number(parcela.valor_parcela), 0);
    
    // Adicionar valores pagos das parcelas (incluindo parciais)
    const totalValoresPagosVenda = parcelasVendaComValorPago.reduce((sum, parcela) => {
      // Se já foi contada como paga, não contar novamente
      if (parcela.status === 'pago') return sum;
      return sum + Number(parcela.valor_pago || 0);
    }, 0);
    
    const totalValoresPagosCrediario = parcelasCrediarioComValorPago.reduce((sum, parcela) => {
      // Se já foi contada como paga, não contar novamente
      if (parcela.status === 'pago') return sum;
      return sum + Number((parcela as any).valor_pago || 0);
    }, 0);

    // Total de vendas do mês (incluindo TODAS as parcelas pagas + valores pagos)
    const totalSales = totalVendasAvista + totalParcelasVenda + totalParcelasCrediario + totalValoresPagosVenda + totalValoresPagosCrediario;

    // Contar vendas reais (vendas à vista + vendas parceladas únicas + vendas de crediário únicas)
    const vendasParceladasUnicas = [...new Set(parcelasVendaPagas.map(p => p.venda_id))];
    const vendasCrediarioUnicas = [...new Set(parcelasCrediarioPagas.map(p => p.crediario_venda_id))];
    const salesCount = vendasAvistaDoMes.length + vendasParceladasUnicas.length + vendasCrediarioUnicas.length;

    // Calcular comissão (apenas se existe comissão definida)
    const comissaoVendasAvista = vendasAvistaDoMes.reduce((sum, sale) => {
      if (sale.commission && Number(sale.commission) > 0) {
        return sum + Number(sale.commission);
      }
      return sum;
    }, 0);

    // Comissão das parcelas de vendas (proporcional e apenas se existe comissão)
    const comissaoParcelasVenda = parcelasVendaPagas.reduce((sum, parcela) => {
      const sale = sales.find(s => s.id === parcela.venda_id);
      if (sale && sale.commission && Number(sale.commission) > 0) {
        const proporção = Number(parcela.valor_da_parcela) / Number(sale.total_value);
        return sum + Number(sale.commission) * proporção;
      }
      return sum;
    }, 0);

    // Remover comissão automática do crediário
    const comissaoCrediario = 0; // Não assumir comissão padrão
    const totalCommission = comissaoVendasAvista + comissaoParcelasVenda + comissaoCrediario;

    // Meta do mês
    const goalAmount = currentGoal;
    const goalProgress = Math.min(totalSales / goalAmount * 100, 100);
    return {
      totalSales,
      salesCount,
      totalCommission,
      goalProgress
    };
  };

  const stats = calculateMonthlyStats();

  // Verificar se a meta foi atingida e mostrar comemoração
  useEffect(() => {
    if (stats.totalSales >= currentGoal && currentGoal > 0 && user?.name) {
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      const celebrationKey = `celebration_${user.id}_${currentMonth}_${currentYear}`;
      
      const hasShownThisMonth = localStorage.getItem(celebrationKey);
      
      if (!hasShownThisMonth) {
        setShowCelebration(true);
        localStorage.setItem(celebrationKey, 'true');
        
        // Ocultar após 6 segundos
        setTimeout(() => {
          setShowCelebration(false);
        }, 6000);
      }
    }
  }, [stats.totalSales, currentGoal, user?.name, user?.id]);

  // Função para formatar data corretamente
  const formatDate = (dateString: string) => {
    // Criar a data tratando como data local (não UTC)
    const [year, month, day] = dateString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.toLocaleDateString('pt-BR');
  };

  // Dados para o gráfico de vendas por semana
  const getWeeklyData = () => {
    const weeks = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'];
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    return weeks.map((week, index) => {
      const weekStart = new Date(currentYear, currentMonth, index * 7 + 1);
      const weekEnd = new Date(currentYear, currentMonth, index * 7 + 7);
      
      const weekSales = sales.filter(sale => {
        const saleDate = new Date(sale.sale_date + 'T00:00:00');
        return saleDate >= weekStart && saleDate <= weekEnd;
      });

      // Parcelas pagas da semana (usar data_pagamento)
      const weekInstallments = installments.filter(installment => {
        if (installment.status !== 'pago' || !installment.data_pagamento) return false;
        const paymentDate = new Date(installment.data_pagamento + 'T00:00:00');
        return paymentDate >= weekStart && paymentDate <= weekEnd;
      });

      // Parcelas crediário pagas da semana (usar data_pagamento)
      const weekCrediarioInstallments = parcelasCrediario.filter(parcela => {
        if (parcela.status !== 'pago' || !parcela.data_pagamento) return false;
        const paymentDate = new Date(parcela.data_pagamento + 'T00:00:00');
        return paymentDate >= weekStart && paymentDate <= weekEnd;
      });
      
      const salesValue = weekSales.reduce((sum, sale) => sum + Number(sale.total_value), 0);
      const installmentsValue = weekInstallments.reduce((sum, installment) => sum + Number(installment.valor_pago || installment.valor_da_parcela), 0);
      const crediarioValue = weekCrediarioInstallments.reduce((sum, parcela) => sum + Number(parcela.valor_parcela), 0);
      const totalValue = salesValue + installmentsValue + crediarioValue;
      
      return {
        name: week,
        vendas: totalValue
      };
    });
  };
  const weeklyData = getWeeklyData();

  // Vendas recentes - apenas do mês atual
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const recentSales = sales
    .filter(sale => {
      const saleDate = new Date(sale.sale_date + 'T00:00:00');
      return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear;
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return <div className="space-y-6">
      {/* Celebration Message */}
      {showCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
          <div className="relative max-w-md mx-4 bg-gradient-to-r from-yellow-400 via-pink-400 to-green-400 text-white px-8 py-6 rounded-xl shadow-2xl border-2 border-white animate-scale-in">
            {/* Confetti Animation */}
            <div className="absolute inset-0 overflow-hidden rounded-xl">
              {[...Array(30)].map((_, i) => (
                <div
                  key={i}
                  className="absolute animate-bounce"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 2}s`,
                    animationDuration: `${1 + Math.random()}s`
                  }}
                >
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: ['#FFD700', '#FF69B4', '#00FF7F', '#87CEEB', '#FF6347'][Math.floor(Math.random() * 5)]
                    }}
                  />
                </div>
              ))}
            </div>
            
            {/* Message Content */}
            <div className="relative z-10 text-center">
              <div className="text-2xl font-bold mb-4">
                🎉 PARABÉNS! 🎉
              </div>
              <div className="text-lg font-semibold mb-2">
                {user?.name}, você bateu a meta do mês!
              </div>
              <div className="text-base mb-2">
                Total de vendas: <span className="font-bold">R$ {stats.totalSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="text-base mb-4">
                Meta: <span className="font-bold">R$ {currentGoal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="text-lg font-bold">
                Continue assim! 🚀
              </div>
              <Button 
                variant="outline" 
                className="mt-4 bg-white text-purple-600 hover:bg-gray-100"
                onClick={() => setShowCelebration(false)}
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-600">Visão geral do seu negócio</p>
        </div>
        <div className="text-right">
          <div className="text-xs md:text-sm text-gray-500">
            {new Date().toLocaleDateString('pt-BR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
            <CardTitle className="text-sm font-medium opacity-90">
              Vendas do Mês
            </CardTitle>
            <DollarSign className="h-4 w-4 opacity-90" />
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-xl md:text-2xl font-bold my-0">
              R$ {stats.totalSales.toLocaleString('pt-BR', {
              minimumFractionDigits: 2
            })}
            </div>
            
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
            <CardTitle className="text-sm font-medium opacity-90">
              Meta do Mês
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Dialog open={isGoalModalOpen} onOpenChange={(open) => {
                setIsGoalModalOpen(open);
                if (open) setGoalValue(currentGoal.toString());
              }}>
                <DialogTrigger asChild>
                  <Edit className="h-4 w-4 opacity-90 cursor-pointer hover:opacity-100" />
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] bg-white">
                  <DialogHeader>
                    <DialogTitle>Editar Meta do Mês</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="goal" className="text-right">
                        Meta (R$)
                      </Label>
                      <Input
                        id="goal"
                        type="number"
                        value={goalValue}
                        onChange={(e) => setGoalValue(e.target.value)}
                        className="col-span-3"
                        placeholder="Digite a meta do mês"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsGoalModalOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={async () => {
                      try {
                        console.log('Tentando salvar meta:', goalValue);
                        await setMonthlyGoal(Number(goalValue));
                        console.log('Meta salva com sucesso');
                        setCurrentGoal(Number(goalValue));
                        setIsGoalModalOpen(false);
                      } catch (error) {
                        console.error('Erro ao salvar meta:', error);
                      }
                    }}>
                      Salvar Meta
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Target className="h-4 w-4 opacity-90" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-xl md:text-2xl font-bold">
              {stats.goalProgress.toFixed(1)}%
            </div>
            <Progress value={stats.goalProgress} className="mt-2 bg-green-400" />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
            <CardTitle className="text-sm font-medium opacity-90">
              Comissão Acumulada
            </CardTitle>
            <Percent className="h-4 w-4 opacity-90" />
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-xl md:text-2xl font-bold">
              R$ {stats.totalCommission.toLocaleString('pt-BR', {
              minimumFractionDigits: 2
            })}
            </div>
            <p className="text-xs opacity-90">
              Este mês
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
            <CardTitle className="text-sm font-medium opacity-90">
              Total de Clientes
            </CardTitle>
            <Users className="h-4 w-4 opacity-90" />
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-xl md:text-2xl font-bold">{clients.length}</div>
            <p className="text-xs opacity-90">
              {user?.plan === 'free' ? `${clients.length}/10 clientes` : 'Ilimitado'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Chart */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <span>Vendas por Semana</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-4 pb-4">
            <div className="h-64 md:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={value => [`R$ ${Number(value).toLocaleString('pt-BR', {
                  minimumFractionDigits: 2
                })}`, 'Vendas']} />
                  <Bar dataKey="vendas" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Sales */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <Calendar className="h-5 w-5 text-green-600" />
              <span>Vendas Recentes</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-4 pb-4">
            <div className="space-y-2">
              {recentSales.length === 0 ? <div className="text-center py-6 text-gray-500">
                  <DollarSign className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Nenhuma venda registrada ainda</p>
                  <p className="text-xs">Comece registrando sua primeira venda!</p>
                </div> : recentSales.map(sale => {
              const client = clients.find(c => c.id === sale.client_id);
              const product = products.find(p => p.id === sale.product_id);
              return <div key={sale.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 text-sm">
                          {product?.name || 'Produto removido'}
                        </p>
                        <p className="text-xs text-gray-600">
                          {client?.name || 'Cliente removido'} • Qtd: {sale.quantity}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(sale.sale_date)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900 text-sm">
                          R$ {Number(sale.total_value).toLocaleString('pt-BR', {
                      minimumFractionDigits: 2
                    })}
                        </p>
                         {sale.commission && Number(sale.commission) > 0 && (
                           <p className="text-xs text-green-600">
                             +R$ {Number(sale.commission).toLocaleString('pt-BR', {
                         minimumFractionDigits: 2
                       })}
                           </p>
                         )}
                         {['Dinheiro', 'Cartão de Débito', 'Cartão de Crédito', 'PIX'].includes(sale.payment_method || '') && <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-1">
                             Pago
                           </span>}
                      </div>
                    </div>;
            })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-lg">Resumo Rápido</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 px-4 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-xl md:text-2xl font-bold text-blue-600">{products.length}</div>
              <div className="text-xs text-gray-600">
                Produtos cadastrados
                {user?.plan === 'free' && <span className="block text-xs">({products.length}/5)</span>}
              </div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-xl md:text-2xl font-bold text-green-600">{stats.salesCount}</div>
              <div className="text-xs text-gray-600">Vendas recebidas do mês</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-xl md:text-2xl font-bold text-purple-600">
                R$ {sales.reduce((sum, sale) => {
                  if (sale.commission && Number(sale.commission) > 0) {
                    return sum + Number(sale.commission);
                  }
                  return sum;
                }, 0).toLocaleString('pt-BR', {
                minimumFractionDigits: 2
              })}
              </div>
              <div className="text-xs text-gray-600">Comissão total</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>;
};
export default Dashboard;
