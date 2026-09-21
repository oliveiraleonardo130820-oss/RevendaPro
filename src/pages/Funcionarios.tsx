import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { Users, Plus, Mail, User, Eye, EyeOff, Trash2, TrendingUp, ShoppingCart, Edit, ChevronDown, ChevronUp, History, UserX, Lock, AlertTriangle } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

// Usando o tipo correto da tabela funcionarios
type Funcionario = {
  id: string;
  nome: string;
  email: string;
  loja_id: string;
  user_id: string | null;
  created_at: string;
  updated_at: string;
  ativo: boolean;
};

type FuncionarioVenda = {
  funcionario_id: string;
  funcionario_nome: string;
  funcionario_email: string;
  total_vendas: number;
  valor_total: number;
  vendas_detalhadas: Array<{
    id: string;
    sale_date: string;
    total_value: number;
    product_name: string;
    client_name: string | null;
    commission: number;
    payment_method: string | null;
  }>;
};

const Funcionarios = () => {
  const { user, registerEmployee } = useAuth();
  const { sales, products, clients } = useData();
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [funcionarioVendas, setFuncionarioVendas] = useState<FuncionarioVenda[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingFuncionarios, setLoadingFuncionarios] = useState(true);
  const [loadingVendas, setLoadingVendas] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editingFuncionario, setEditingFuncionario] = useState<Funcionario | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    password: '',
  });
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [allSalesHistoryOpen, setAllSalesHistoryOpen] = useState(false);
  const [allEmployeeSales, setAllEmployeeSales] = useState<Array<{
    id: string;
    sale_date: string;
    total_value: number;
    product_name: string;
    client_name: string | null;
    commission: number;
    funcionario_nome: string;
    payment_method: string | null;
  }>>([]);
  const [deactivatingUser, setDeactivatingUser] = useState<Funcionario | null>(null);
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (user?.tipo_usuario === 'dono') {
      loadFuncionarios();
    }
  }, [user]);

  useEffect(() => {
    if (funcionarios.length > 0) {
      loadFuncionarioVendas();
    }
  }, [funcionarios, sales, products, clients]);

  const loadFuncionarios = async () => {
    if (!user) return;

    console.log('=== CARREGANDO FUNCIONÁRIOS ===');
    console.log('Usuário atual:', { id: user.id, tipo: user.tipo_usuario, email: user.email });
    
    setLoadingFuncionarios(true);

    try {
      const { data, error } = await supabase
        .from('funcionarios')
        .select('*')
        .eq('loja_id', user.id)
        .eq('ativo', true)
        .order('created_at', { ascending: false });

      console.log('📊 Resultado da consulta:', {
        data,
        error,
        filtro_usado: `loja_id = ${user.id}`,
        total_registros: data?.length || 0
      });

      if (error) {
        console.error('❌ Erro na consulta:', error);
        toast.error('Erro ao carregar funcionários: ' + error.message);
      } else {
        console.log('✅ Funcionários carregados:', data?.length || 0);
        setFuncionarios(data || []);
      }
    } catch (error) {
      console.error('❌ Erro inesperado:', error);
      toast.error('Erro inesperado ao carregar funcionários');
    } finally {
      setLoadingFuncionarios(false);
    }
  };

  const loadFuncionarioVendas = async () => {
    if (!funcionarios.length) return;

    console.log('=== CARREGANDO VENDAS DOS FUNCIONÁRIOS ===');
    setLoadingVendas(true);

    try {
      const funcionarioVendasData: FuncionarioVenda[] = [];

      for (const funcionario of funcionarios) {
        if (!funcionario.user_id) continue;

        // Buscar vendas do funcionário
        const vendasFuncionario = sales.filter(sale => sale.user_id === funcionario.user_id);
        
        console.log(`Vendas do funcionário ${funcionario.nome}:`, vendasFuncionario);

        const vendas_detalhadas = vendasFuncionario.map(sale => {
          const produto = products.find(p => p.id === sale.product_id);
          const cliente = sale.client_id ? clients.find(c => c.id === sale.client_id) : null;

          return {
            id: sale.id,
            sale_date: sale.sale_date,
            total_value: Number(sale.total_value),
            product_name: produto?.name || 'Produto não encontrado',
            client_name: cliente?.name || null,
            commission: Number(sale.commission),
            payment_method: sale.payment_method
          };
        });

        funcionarioVendasData.push({
          funcionario_id: funcionario.id,
          funcionario_nome: funcionario.nome,
          funcionario_email: funcionario.email,
          total_vendas: vendasFuncionario.length,
          valor_total: vendasFuncionario.reduce((sum, sale) => sum + Number(sale.total_value), 0),
          vendas_detalhadas
        });
      }

      console.log('📊 Dados consolidados das vendas:', funcionarioVendasData);
      setFuncionarioVendas(funcionarioVendasData);
    } catch (error) {
      console.error('❌ Erro ao carregar vendas dos funcionários:', error);
      toast.error('Erro ao carregar vendas dos funcionários');
    } finally {
      setLoadingVendas(false);
    }
  };

  const loadAllEmployeeSales = () => {
    const allSales: Array<{
      id: string;
      sale_date: string;
      total_value: number;
      product_name: string;
      client_name: string | null;
      commission: number;
      funcionario_nome: string;
      payment_method: string | null;
    }> = [];

    funcionarioVendas.forEach(funcionarioVenda => {
      funcionarioVenda.vendas_detalhadas.forEach(venda => {
        allSales.push({
          ...venda,
          funcionario_nome: funcionarioVenda.funcionario_nome
        });
      });
    });

    // Ordenar por data (mais recente primeiro)
    allSales.sort((a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime());
    
    setAllEmployeeSales(allSales);
  };

  const openAllSalesHistory = () => {
    loadAllEmployeeSales();
    setAllSalesHistoryOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome.trim() || !formData.email.trim() || !formData.password.trim()) {
      toast.error('Todos os campos são obrigatórios');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      console.log('🚀 Iniciando cadastro via handleSubmit...');
      await registerEmployee(formData.nome, formData.email, formData.password);
      toast.success('Funcionário cadastrado com sucesso!');
      setFormData({ nome: '', email: '', password: '' });
      setShowForm(false);
      
      // Recarregar lista após cadastro
      console.log('🔄 Recarregando lista de funcionários...');
      setTimeout(() => {
        loadFuncionarios();
      }, 1000);
      
    } catch (error: any) {
      console.error('❌ Erro no handleSubmit:', error);
      if (error.message?.includes('User already registered')) {
        toast.error('Este e-mail já está cadastrado');
      } else {
        toast.error(error.message || 'Erro ao cadastrar funcionário');
      }
    } finally {
      setLoading(false);
    }
  };

  const deleteFuncionario = async (funcionario: Funcionario) => {
    if (!window.confirm(`Tem certeza que deseja desativar ${funcionario.nome}?`)) {
      return;
    }

    try {
      // Desativar na tabela funcionarios
      const { error } = await supabase
        .from('funcionarios')
        .update({ ativo: false })
        .eq('id', funcionario.id);

      if (error) {
        console.error('Erro ao desativar funcionário:', error);
        toast.error('Erro ao desativar funcionário');
        return;
      }

      // Desativar na tabela profiles se user_id existir
      if (funcionario.user_id) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ ativo: false })
          .eq('id', funcionario.user_id);

        if (profileError) {
          console.error('Erro ao desativar perfil:', profileError);
          // Continua mesmo com erro no profile, pois o funcionário já foi desativado
        }
      }

      toast.success('Funcionário desativado com sucesso');
      loadFuncionarios();
    } catch (error) {
      console.error('Erro ao desativar funcionário:', error);
      toast.error('Erro inesperado');
    }
  };

  const deactivateUser = async () => {
    console.log('🔍 Iniciando desativação de usuário:', {
      deactivatingUser,
      confirmPassword,
      expectedPassword: "revenda@123"
    });

    if (!deactivatingUser) {
      console.log('❌ Nenhum usuário selecionado para desativação');
      return;
    }

    // Verificar senha
    if (confirmPassword !== "revenda@123") {
      console.log('❌ Senha incorreta:', { provided: confirmPassword, expected: "revenda@123" });
      toast.error("Senha incorreta. Ação cancelada.");
      return;
    }

    console.log('✅ Senha correta, procedendo com desativação...');

    try {
      if (deactivatingUser.user_id) {
        console.log('🔄 Atualizando tabela profiles para user_id:', deactivatingUser.user_id);
        
        const { error, data } = await supabase
          .from('profiles')
          .update({ ativo: false })
          .eq('id', deactivatingUser.user_id)
          .select();

        console.log('📊 Resultado da atualização profiles:', { error, data });

        if (error) {
          console.error('❌ Erro ao desativar usuário na tabela profiles:', error);
          toast.error('Erro ao desativar usuário');
          return;
        }
      } else {
        console.log('⚠️ Funcionário não tem user_id associado');
      }

      console.log('✅ Usuário desativado com sucesso');
      toast.success('Usuário desativado com sucesso.');
      setDeactivatingUser(null);
      setConfirmPassword('');
      loadFuncionarios();
    } catch (error) {
      console.error('❌ Erro inesperado ao desativar usuário:', error);
      toast.error('Erro inesperado');
    }
  };

  const editFuncionario = async (funcionario: Funcionario, updatedData: { nome: string; email: string }) => {
    try {
      const { error } = await supabase
        .from('funcionarios')
        .update({
          nome: updatedData.nome,
          email: updatedData.email,
          updated_at: new Date().toISOString()
        })
        .eq('id', funcionario.id);

      if (error) {
        console.error('Erro ao editar funcionário:', error);
        toast.error('Erro ao editar funcionário');
        return;
      }

      toast.success('Funcionário editado com sucesso');
      setEditingFuncionario(null);
      loadFuncionarios();
    } catch (error) {
      console.error('Erro ao editar funcionário:', error);
      toast.error('Erro inesperado');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    // Corrigir formatação da data para evitar problemas de fuso horário
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const toggleSection = (funcionarioId: string) => {
    setOpenSections(prev => ({
      ...prev,
      [funcionarioId]: !prev[funcionarioId]
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestão de Funcionários</h1>
          <p className="text-muted-foreground">
            Gerencie funcionários e acompanhe suas vendas
          </p>
        </div>
      </div>

      <Tabs defaultValue="funcionarios" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="funcionarios">Funcionários</TabsTrigger>
          <TabsTrigger value="vendas">Vendas por Funcionário</TabsTrigger>
        </TabsList>

        <TabsContent value="funcionarios">
          <div className="space-y-6">
            <div className="flex justify-end">
              <Button onClick={() => setShowForm(!showForm)}>
                <Plus className="h-4 w-4 mr-2" />
                Cadastrar Funcionário
              </Button>
            </div>

            {/* Formulário de Cadastro */}
            {showForm && (
              <Card>
                <CardHeader>
                  <CardTitle>Cadastrar Novo Funcionário</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="nome">Nome completo *</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="nome"
                          value={formData.nome}
                          onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                          className="pl-10"
                          placeholder="Nome do funcionário"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail *</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                          className="pl-10"
                          placeholder="email@exemplo.com"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Senha *</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          value={formData.password}
                          onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                          className="pr-10"
                          placeholder="Senha do funcionário"
                          required
                          minLength={6}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <Button type="submit" disabled={loading}>
                        {loading ? 'Cadastrando...' : 'Cadastrar'}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                        Cancelar
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Lista de Funcionários */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Funcionários Cadastrados ({funcionarios.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingFuncionarios ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-gray-600">Carregando funcionários...</p>
                  </div>
                ) : funcionarios.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Nenhum funcionário cadastrado
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Cadastre funcionários para que possam acessar o sistema da sua loja.
                    </p>
                    <Button onClick={() => setShowForm(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Cadastrar Primeiro Funcionário
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>E-mail</TableHead>
                        <TableHead>Data de Cadastro</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Aviso</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {funcionarios.map((funcionario) => (
                        <TableRow key={funcionario.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center">
                              <User className="h-4 w-4 mr-2 text-gray-400" />
                              {funcionario.nome}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Mail className="h-4 w-4 mr-2 text-gray-400" />
                              {funcionario.email}
                            </div>
                          </TableCell>
                          <TableCell>
                            {new Date(funcionario.created_at).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              funcionario.user_id ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {funcionario.user_id ? 'Ativo' : 'Pendente'}
                            </span>
                          </TableCell>
                           <TableCell className="text-right">
                             <div className="flex justify-end items-center">
                               <Dialog>
                                 <DialogTrigger asChild>
                                   <Button
                                     variant="ghost"
                                     size="sm"
                                     className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                   >
                                     <AlertTriangle className="h-4 w-4" />
                                   </Button>
                                 </DialogTrigger>
                                 <DialogContent>
                                   <DialogHeader>
                                     <DialogTitle className="flex items-center gap-2">
                                       <AlertTriangle className="h-5 w-5 text-amber-600" />
                                       Gerenciamento de Funcionário
                                     </DialogTitle>
                                   </DialogHeader>
                                   <div className="py-4">
                                     <p className="text-muted-foreground">
                                       Para desative a conta do funcionário, entre na conta dele vá ate o perfil e desative o funcionário.
                                     </p>
                                   </div>
                                 </DialogContent>
                               </Dialog>
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
        </TabsContent>

        <TabsContent value="vendas">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Vendas por Funcionário
                </CardTitle>
                <Button
                  onClick={openAllSalesHistory}
                  variant="outline"
                  className="flex items-center gap-2"
                  disabled={funcionarioVendas.length === 0}
                >
                  <History className="h-4 w-4" />
                  Histórico Geral
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingVendas ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-gray-600">Carregando vendas...</p>
                </div>
              ) : funcionarioVendas.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Nenhuma venda registrada
                  </h3>
                  <p className="text-gray-600">
                    As vendas feitas pelos funcionários aparecerão aqui.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Resumo Geral */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center">
                          <Users className="h-8 w-8 text-blue-600" />
                          <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Funcionários Ativos</p>
                            <p className="text-2xl font-bold text-gray-900">
                              {funcionarioVendas.filter(f => f.total_vendas > 0).length}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center">
                          <ShoppingCart className="h-8 w-8 text-green-600" />
                          <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Total de Vendas</p>
                            <p className="text-2xl font-bold text-gray-900">
                              {funcionarioVendas.reduce((sum, f) => sum + f.total_vendas, 0)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center">
                          <TrendingUp className="h-8 w-8 text-purple-600" />
                          <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Faturamento Total</p>
                            <p className="text-2xl font-bold text-gray-900">
                              {formatCurrency(funcionarioVendas.reduce((sum, f) => sum + f.valor_total, 0))}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Vendas por Funcionário - Collapsible */}
                  {funcionarioVendas.map((funcionarioVenda) => (
                    <Collapsible
                      key={funcionarioVenda.funcionario_id}
                      open={openSections[funcionarioVenda.funcionario_id]}
                      onOpenChange={() => toggleSection(funcionarioVenda.funcionario_id)}
                    >
                      <Card>
                        <CollapsibleTrigger asChild>
                          <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                            <CardTitle className="flex items-center justify-between">
                              <div className="flex items-center">
                                <User className="h-5 w-5 mr-2" />
                                {funcionarioVenda.funcionario_nome}
                              </div>
                              <div className="flex items-center space-x-4">
                                <div className="text-right">
                                  <p className="text-sm text-gray-600">{funcionarioVenda.total_vendas} vendas</p>
                                  <p className="text-lg font-bold text-green-600">
                                    {formatCurrency(funcionarioVenda.valor_total)}
                                  </p>
                                </div>
                                {openSections[funcionarioVenda.funcionario_id] ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </div>
                            </CardTitle>
                          </CardHeader>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <CardContent>
                            {funcionarioVenda.vendas_detalhadas.length === 0 ? (
                              <p className="text-gray-500 text-center py-4">
                                Nenhuma venda registrada para este funcionário
                              </p>
                            ) : (
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Data</TableHead>
                                    <TableHead>Produto</TableHead>
                                    <TableHead>Cliente</TableHead>
                                    <TableHead>Valor</TableHead>
                                    <TableHead>Comissão</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {funcionarioVenda.vendas_detalhadas.map((venda) => (
                                    <TableRow key={venda.id}>
                                      <TableCell>
                                        {formatDate(venda.sale_date)}
                                      </TableCell>
                                      <TableCell>{venda.product_name}</TableCell>
                                      <TableCell>{venda.client_name || 'Cliente avulso'}</TableCell>
                                      <TableCell className="font-medium">
                                        {formatCurrency(venda.total_value)}
                                      </TableCell>
                                      <TableCell className="text-green-600">
                                        {formatCurrency(venda.commission)}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            )}
                          </CardContent>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de Histórico Geral */}
      <Dialog open={allSalesHistoryOpen} onOpenChange={setAllSalesHistoryOpen}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Histórico Geral de Vendas dos Funcionários
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Resumo */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <p className="text-sm text-gray-600">Total de Vendas</p>
                <p className="text-lg font-bold">{allEmployeeSales.length}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Valor Total</p>
                <p className="text-lg font-bold text-green-600">
                  {formatCurrency(allEmployeeSales.reduce((sum, venda) => sum + venda.total_value, 0))}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Comissão Total</p>
                <p className="text-lg font-bold text-blue-600">
                  {formatCurrency(allEmployeeSales.reduce((sum, venda) => sum + venda.commission, 0))}
                </p>
              </div>
            </div>

            {/* Tabela de Vendas */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Funcionário</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Forma de Pagamento</TableHead>
                    <TableHead>Comissão</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allEmployeeSales.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                        Nenhuma venda encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    allEmployeeSales.map((venda) => (
                      <TableRow key={venda.id}>
                        <TableCell className="font-medium text-blue-600">
                          {venda.funcionario_nome}
                        </TableCell>
                        <TableCell>{formatDate(venda.sale_date)}</TableCell>
                        <TableCell>{venda.product_name}</TableCell>
                        <TableCell>{venda.client_name || 'Cliente avulso'}</TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(venda.total_value)}
                        </TableCell>
                        <TableCell>{venda.payment_method || 'N/A'}</TableCell>
                        <TableCell className="text-green-600">
                          {formatCurrency(venda.commission)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Funcionarios;
