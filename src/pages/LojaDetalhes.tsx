import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Users, DollarSign, FileText, Eye, EyeOff, Trash2, ShoppingCart, Package, CreditCard, BarChart3, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}
interface Loja {
  id: string;
  nome: string;
  cidade?: string;
  bairro?: string;
  rua?: string;
  numero?: string;
  plano: string;
}
interface Funcionario {
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
  created_at: string;
}
interface Despesa {
  id: string;
  nome: string;
  valor: number;
  data: string;
  observacoes?: string;
}
export default function LojaDetalhes() {
  const {
    id
  } = useParams<{
    id: string;
  }>();
  const navigate = useNavigate();
  const {
    user
  } = useAuth();
  const {
    toast
  } = useToast();
  const [loja, setLoja] = useState<Loja | null>(null);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialogs state
  const [isFuncionarioDialogOpen, setIsFuncionarioDialogOpen] = useState(false);
  const [isDespesaDialogOpen, setIsDespesaDialogOpen] = useState(false);

  // Form data
  const [funcionarioData, setFuncionarioData] = useState({
    nome: '',
    email: ''
  });
  const [despesaData, setDespesaData] = useState({
    nome: '',
    valor: '',
    data: new Date().toISOString().split('T')[0],
    observacoes: ''
  });
  const fetchLoja = async () => {
    if (!id) return;
    try {
      const {
        data,
        error
      } = await supabase.from('lojas').select('*').eq('id', id).single();
      if (error) throw error;
      setLoja(data);
    } catch (error) {
      console.error('Erro ao buscar loja:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados da loja.",
        variant: "destructive"
      });
    }
  };
  const fetchFuncionarios = async () => {
    if (!id) return;
    try {
      const {
        data,
        error
      } = await supabase.from('funcionarios').select('*').eq('loja_id', id).order('created_at', {
        ascending: false
      });
      if (error) throw error;
      setFuncionarios(data || []);
    } catch (error) {
      console.error('Erro ao buscar funcionários:', error);
    }
  };
  const fetchDespesas = async () => {
    if (!id) return;
    try {
      const {
        data,
        error
      } = await supabase.from('despesas').select('*').eq('loja_id', id).order('data', {
        ascending: false
      });
      if (error) throw error;
      setDespesas(data || []);
    } catch (error) {
      console.error('Erro ao buscar despesas:', error);
    }
  };
  const handleCreateFuncionario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!funcionarioData.nome.trim() || !funcionarioData.email.trim()) {
      toast({
        title: "Erro",
        description: "Nome e email são obrigatórios.",
        variant: "destructive"
      });
      return;
    }
    try {
      const {
        error
      } = await supabase.from('funcionarios').insert([{
        nome: funcionarioData.nome,
        email: funcionarioData.email,
        loja_id: id,
        ativo: true
      }]);
      if (error) throw error;
      toast({
        title: "Sucesso",
        description: "Funcionário criado com sucesso!"
      });
      setFuncionarioData({
        nome: '',
        email: ''
      });
      setIsFuncionarioDialogOpen(false);
      fetchFuncionarios();
    } catch (error) {
      console.error('Erro ao criar funcionário:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar o funcionário.",
        variant: "destructive"
      });
    }
  };
  const handleToggleFuncionario = async (funcionarioId: string, ativo: boolean) => {
    try {
      const {
        error
      } = await supabase.from('funcionarios').update({
        ativo: !ativo
      }).eq('id', funcionarioId);
      if (error) throw error;
      toast({
        title: "Sucesso",
        description: `Funcionário ${!ativo ? 'ativado' : 'desativado'} com sucesso!`
      });
      fetchFuncionarios();
    } catch (error) {
      console.error('Erro ao alterar status do funcionário:', error);
      toast({
        title: "Erro",
        description: "Não foi possível alterar o status do funcionário.",
        variant: "destructive"
      });
    }
  };
  const handleCreateDespesa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!despesaData.nome.trim() || !despesaData.valor) {
      toast({
        title: "Erro",
        description: "Nome e valor são obrigatórios.",
        variant: "destructive"
      });
      return;
    }
    try {
      const {
        error
      } = await supabase.from('despesas').insert([{
        nome: despesaData.nome,
        valor: parseFloat(despesaData.valor),
        data: despesaData.data,
        observacoes: despesaData.observacoes || null,
        user_id: user?.id,
        loja_id: id
      }]);
      if (error) throw error;
      toast({
        title: "Sucesso",
        description: "Despesa criada com sucesso!"
      });
      setDespesaData({
        nome: '',
        valor: '',
        data: new Date().toISOString().split('T')[0],
        observacoes: ''
      });
      setIsDespesaDialogOpen(false);
      fetchDespesas();
    } catch (error) {
      console.error('Erro ao criar despesa:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar a despesa.",
        variant: "destructive"
      });
    }
  };
  const handleDeleteDespesa = async (despesaId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta despesa?')) return;
    try {
      const {
        error
      } = await supabase.from('despesas').delete().eq('id', despesaId);
      if (error) throw error;
      toast({
        title: "Sucesso",
        description: "Despesa excluída com sucesso!"
      });
      fetchDespesas();
    } catch (error) {
      console.error('Erro ao excluir despesa:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a despesa.",
        variant: "destructive"
      });
    }
  };
  const generatePDF = async () => {
    if (!loja) return;
    try {
      // Buscar dados para o relatório
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();

      // Buscar vendas do mês atual
      const {
        data: vendas,
        error: vendasError
      } = await supabase.from('sales').select('total_value').eq('loja_id', id).gte('sale_date', `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`).lt('sale_date', `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-01`);
      if (vendasError) throw vendasError;
      const totalVendas = vendas?.reduce((sum, venda) => sum + Number(venda.total_value), 0) || 0;
      const totalDespesas = despesas.reduce((sum, despesa) => sum + Number(despesa.valor), 0);
      const lucroEstimado = totalVendas - totalDespesas;

      // Criar PDF
      const doc = new jsPDF();

      // Título
      doc.setFontSize(20);
      doc.text(`Relatório - ${loja.nome}`, 20, 20);

      // Período
      doc.setFontSize(12);
      doc.text(`Período: ${format(currentDate, 'MMMM yyyy', {
        locale: ptBR
      })}`, 20, 35);

      // Informações da loja
      let yPosition = 50;
      doc.text('Informações da Loja:', 20, yPosition);
      yPosition += 10;
      if (loja.cidade) {
        doc.text(`Cidade: ${loja.cidade}`, 25, yPosition);
        yPosition += 7;
      }
      if (loja.bairro) {
        doc.text(`Bairro: ${loja.bairro}`, 25, yPosition);
        yPosition += 7;
      }
      yPosition += 10;

      // Resumo financeiro
      doc.text('Resumo Financeiro:', 20, yPosition);
      yPosition += 10;
      doc.text(`Total de Vendas: R$ ${totalVendas.toFixed(2)}`, 25, yPosition);
      yPosition += 7;
      doc.text(`Total de Despesas: R$ ${totalDespesas.toFixed(2)}`, 25, yPosition);
      yPosition += 7;
      doc.text(`Lucro Estimado: R$ ${lucroEstimado.toFixed(2)}`, 25, yPosition);
      yPosition += 20;

      // Funcionários
      doc.text('Funcionários Ativos:', 20, yPosition);
      yPosition += 10;
      const funcionariosAtivos = funcionarios.filter(f => f.ativo);
      funcionariosAtivos.forEach(funcionario => {
        doc.text(`• ${funcionario.nome} (${funcionario.email})`, 25, yPosition);
        yPosition += 7;
      });

      // Salvar PDF
      doc.save(`relatorio-${loja.nome}-${format(currentDate, 'yyyy-MM')}.pdf`);
      toast({
        title: "Sucesso",
        description: "Relatório PDF gerado com sucesso!"
      });
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar o relatório.",
        variant: "destructive"
      });
    }
  };
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await Promise.all([fetchLoja(), fetchFuncionarios(), fetchDespesas()]);
      setLoading(false);
    };
    fetchData();
  }, [id]);
  if (loading) {
    return <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Carregando dados da loja...</div>
        </div>
      </div>;
  }
  if (!loja) {
    return <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loja não encontrada</div>
        </div>
      </div>;
  }
  const totalDespesas = despesas.reduce((sum, despesa) => sum + Number(despesa.valor), 0);
  return <div className="container mx-auto p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={() => navigate('/lojas')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{loja.nome}</h1>
          <p className="text-muted-foreground">
            {[loja.cidade, loja.bairro].filter(Boolean).join(', ')}
          </p>
        </div>
      </div>

      {/* Menu de navegação da loja */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
        <Button 
          variant="outline" 
          className="flex flex-col items-center gap-2 h-20"
          onClick={() => navigate(`/loja/${id}/nova-venda`)}
        >
          <ShoppingCart className="w-6 h-6" />
          <span className="text-sm">Nova Venda</span>
        </Button>
        
        <Button 
          variant="outline" 
          className="flex flex-col items-center gap-2 h-20"
          onClick={() => navigate(`/loja/${id}/clientes`)}
        >
          <Users className="w-6 h-6" />
          <span className="text-sm">Clientes</span>
        </Button>
        
        <Button 
          variant="outline" 
          className="flex flex-col items-center gap-2 h-20"
          onClick={() => navigate(`/loja/${id}/produtos`)}
        >
          <Package className="w-6 h-6" />
          <span className="text-sm">Produtos</span>
        </Button>
        
        <Button 
          variant="outline" 
          className="flex flex-col items-center gap-2 h-20"
          onClick={() => navigate(`/loja/${id}/vendas`)}
        >
          <DollarSign className="w-6 h-6" />
          <span className="text-sm">Vendas</span>
        </Button>
        
        <Button 
          variant="outline" 
          className="flex flex-col items-center gap-2 h-20"
          onClick={() => navigate(`/loja/${id}/crediario`)}
        >
          <CreditCard className="w-6 h-6" />
          <span className="text-sm">Crediário</span>
        </Button>
        
        <Button 
          variant="outline" 
          className="flex flex-col items-center gap-2 h-20"
          onClick={() => navigate(`/loja/${id}/relatorios`)}
        >
          <BarChart3 className="w-6 h-6" />
          <span className="text-sm">Relatórios</span>
        </Button>
        
        <Button 
          variant="outline" 
          className="flex flex-col items-center gap-2 h-20"
          onClick={() => navigate(`/loja/${id}/controle-parcelas`)}
        >
          <Calendar className="w-6 h-6" />
          <span className="text-sm">Controle de Parcelas</span>
        </Button>
      </div>

      <Tabs defaultValue="funcionarios" className="space-y-6">
        <TabsList>
          <TabsTrigger value="funcionarios">
            <Users className="w-4 h-4 mr-2" />
            Funcionários
          </TabsTrigger>
          <TabsTrigger value="despesas">
            <DollarSign className="w-4 h-4 mr-2" />
            Despesas
          </TabsTrigger>
          <TabsTrigger value="relatorio">
            <FileText className="w-4 h-4 mr-2" />
            Relatório
          </TabsTrigger>
        </TabsList>

        <TabsContent value="funcionarios">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Funcionários da Loja</CardTitle>
                <Dialog open={isFuncionarioDialogOpen} onOpenChange={setIsFuncionarioDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-primary">
                      <Plus className="w-4 h-4 mr-2" />
                      Novo Funcionário
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Cadastrar Funcionário</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateFuncionario} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="funcionario-nome">Nome *</Label>
                        <Input id="funcionario-nome" value={funcionarioData.nome} onChange={e => setFuncionarioData({
                        ...funcionarioData,
                        nome: e.target.value
                      })} required />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="funcionario-email">E-mail *</Label>
                        <Input id="funcionario-email" type="email" value={funcionarioData.email} onChange={e => setFuncionarioData({
                        ...funcionarioData,
                        email: e.target.value
                      })} required />
                      </div>
                      
                      <div className="flex gap-2">
                        <Button type="submit" className="bg-primary">Cadastrar</Button>
                        <Button type="button" variant="outline" onClick={() => setIsFuncionarioDialogOpen(false)}>
                          Cancelar
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {funcionarios.length === 0 ? <div className="text-center py-8">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhum funcionário cadastrado</p>
                </div> : <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data Cadastro</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {funcionarios.map(funcionario => <TableRow key={funcionario.id}>
                        <TableCell>{funcionario.nome}</TableCell>
                        <TableCell>{funcionario.email}</TableCell>
                        <TableCell>
                          <Badge variant={funcionario.ativo ? 'default' : 'secondary'}>
                            {funcionario.ativo ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(funcionario.created_at), 'dd/MM/yyyy', {
                      locale: ptBR
                    })}
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" onClick={() => handleToggleFuncionario(funcionario.id, funcionario.ativo)}>
                            {funcionario.ativo ? <>
                                <EyeOff className="w-4 h-4 mr-2" />
                                Desativar
                              </> : <>
                                <Eye className="w-4 h-4 mr-2" />
                                Ativar
                              </>}
                          </Button>
                        </TableCell>
                      </TableRow>)}
                  </TableBody>
                </Table>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="despesas">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Despesas da Loja</CardTitle>
                  <p className="text-sm text-muted-foreground my-[10px]">
                    Total: R$ {totalDespesas.toFixed(2)}
                  </p>
                </div>
                <Dialog open={isDespesaDialogOpen} onOpenChange={setIsDespesaDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-primary">
                      <Plus className="w-4 h-4 mr-2" />
                      Nova Despesa
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Adicionar Despesa</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateDespesa} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="despesa-nome">Nome da Despesa *</Label>
                        <Input id="despesa-nome" value={despesaData.nome} onChange={e => setDespesaData({
                        ...despesaData,
                        nome: e.target.value
                      })} required />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="despesa-valor">Valor *</Label>
                        <Input id="despesa-valor" type="number" step="0.01" value={despesaData.valor} onChange={e => setDespesaData({
                        ...despesaData,
                        valor: e.target.value
                      })} required />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="despesa-data">Data</Label>
                        <Input id="despesa-data" type="date" value={despesaData.data} onChange={e => setDespesaData({
                        ...despesaData,
                        data: e.target.value
                      })} />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="despesa-observacoes">Observações</Label>
                        <Textarea id="despesa-observacoes" value={despesaData.observacoes} onChange={e => setDespesaData({
                        ...despesaData,
                        observacoes: e.target.value
                      })} />
                      </div>
                      
                      <div className="flex gap-2">
                        <Button type="submit" className="bg-primary">Adicionar</Button>
                        <Button type="button" variant="outline" onClick={() => setIsDespesaDialogOpen(false)}>
                          Cancelar
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {despesas.length === 0 ? <div className="text-center py-8">
                  <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhuma despesa registrada</p>
                </div> : <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Observações</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {despesas.map(despesa => <TableRow key={despesa.id}>
                        <TableCell>{despesa.nome}</TableCell>
                        <TableCell>R$ {Number(despesa.valor).toFixed(2)}</TableCell>
                        <TableCell>
                          {format(new Date(despesa.data), 'dd/MM/yyyy', {
                      locale: ptBR
                    })}
                        </TableCell>
                        <TableCell>{despesa.observacoes || '-'}</TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" onClick={() => handleDeleteDespesa(despesa.id)} className="text-destructive hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>)}
                  </TableBody>
                </Table>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="relatorio">
          <Card>
            <CardHeader>
              <CardTitle>Relatório da Loja</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  Gere um relatório completo com dados da loja, incluindo vendas, despesas e funcionários.
                </p>
                
                <Button onClick={generatePDF} className="bg-primary">
                  <FileText className="w-4 h-4 mr-2" />
                  Baixar Relatório em PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>;
}