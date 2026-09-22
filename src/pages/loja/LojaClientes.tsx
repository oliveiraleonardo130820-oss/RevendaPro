import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Users, Search, Phone, Mail, DollarSign, Edit, Trash2, UserPlus, FileText, ShoppingBag, Calendar, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import ClientHistoryModal from '@/components/ClientHistoryModal';
import { parseLocalDate } from '@/lib/utils';

interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
  cpf?: string;
  rua?: string;
  numero?: string;
  bairro?: string;
  total_purchases: number;
  created_at: string;
}

interface Sale {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_value: number;
  payment_method?: string;
  sale_date: string;
  observacoes?: string;
  client_id: string;
  commission: number;
}

interface Product {
  id: string;
  name: string;
  unit_price: number;
}

interface Installment {
  id: string;
  venda_id: string;
  numero_da_parcela: number;
  valor_da_parcela: number;
  data_de_vencimento: string;
  status: string;
}

interface CrediarioVenda {
  id: string;
  client_id: string;
  valor_total: number;
  valor_entrada: number;
  valor_restante: number;
  numero_parcelas: number;
  dia_vencimento: number;
  data_venda: string;
  status: string;
}

interface CrediarioInstallment {
  id: string;
  crediario_venda_id: string;
  numero_parcela: number;
  valor_parcela: number;
  data_vencimento: string;
  data_pagamento?: string;
  status: string;
  tipo: string;
}

export default function LojaClientes() {
  const { id: lojaId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [clients, setClients] = useState<Client[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [crediarioVendas, setCrediarioVendas] = useState<CrediarioVenda[]>([]);
  const [crediarioInstallments, setCrediarioInstallments] = useState<CrediarioInstallment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedClientForHistory, setSelectedClientForHistory] = useState<Client | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    cpf: '',
    rua: '',
    numero: '',
    bairro: ''
  });

  useEffect(() => {
    fetchData();
  }, [lojaId]);

  const fetchData = async () => {
    try {
      // Buscar clientes
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .eq('loja_id', lojaId)
        .order('name');
      
      if (clientsError) throw clientsError;
      setClients(clientsData || []);

      // Buscar vendas
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('*')
        .eq('loja_id', lojaId);
      
      if (salesError) throw salesError;
      setSales(salesData || []);

      // Buscar produtos
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('loja_id', lojaId);
      
      if (productsError) throw productsError;
      setProducts(productsData || []);

      // Buscar parcelas (mudança: usar user_id ao invés de loja_id)
      const { data: installmentsData, error: installmentsError } = await supabase
        .from('parcelas_venda')
        .select('*')
        .eq('user_id', user?.id);
      
      console.log('Debug - parcelas encontradas para user_id:', user?.id, installmentsData);
      
      if (installmentsError) throw installmentsError;
      setInstallments(installmentsData || []);

      // Buscar crediário vendas
      const { data: crediarioData, error: crediarioError } = await supabase
        .from('crediario_vendas')
        .select('*')
        .eq('loja_id', lojaId);
      
      if (crediarioError) throw crediarioError;
      setCrediarioVendas(crediarioData || []);

      // Buscar parcelas crediário
      const { data: crediarioInstallmentsData, error: crediarioInstallmentsError } = await supabase
        .from('parcelas_crediario')
        .select('*')
        .eq('loja_id', lojaId);
      
      if (crediarioInstallmentsError) throw crediarioInstallmentsError;
      setCrediarioInstallments(crediarioInstallmentsData || []);

    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone.includes(searchTerm) ||
    (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.phone.trim()) {
      toast({
        title: "Erro",
        description: "Nome e telefone são obrigatórios",
        variant: "destructive"
      });
      return;
    }

    try {
      if (editingClient) {
        const { error } = await supabase
          .from('clients')
          .update({
            name: formData.name,
            phone: formData.phone,
            email: formData.email || null,
            cpf: formData.cpf || null,
            rua: formData.rua || null,
            numero: formData.numero || null,
            bairro: formData.bairro || null
          })
          .eq('id', editingClient.id);

        if (error) throw error;
        toast({
          title: "Sucesso",
          description: "Cliente atualizado com sucesso!"
        });
      } else {
        const { error } = await supabase
          .from('clients')
          .insert([{
            ...formData,
            user_id: user?.id,
            loja_id: lojaId,
            email: formData.email || null,
            cpf: formData.cpf || null,
            rua: formData.rua || null,
            numero: formData.numero || null,
            bairro: formData.bairro || null
          }]);

        if (error) throw error;
        toast({
          title: "Sucesso",
          description: "Cliente cadastrado com sucesso!"
        });
      }

      resetForm();
      fetchData();
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o cliente",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      phone: client.phone,
      email: client.email || '',
      cpf: client.cpf || '',
      rua: client.rua || '',
      numero: client.numero || '',
      bairro: client.bairro || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async (clientId: string) => {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return;

    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId);

      if (error) throw error;
      
      toast({
        title: "Sucesso",
        description: "Cliente excluído com sucesso!"
      });
      fetchData();
    } catch (error) {
      console.error('Erro ao excluir cliente:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o cliente",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      cpf: '',
      rua: '',
      numero: '',
      bairro: ''
    });
    setEditingClient(null);
    setDialogOpen(false);
  };

  const handleShowHistory = (client: Client) => {
    setSelectedClientForHistory(client);
    setHistoryModalOpen(true);
  };

  const getClientSales = (clientId: string) => {
    return sales.filter(sale => sale.client_id === clientId);
  };

  const getClientCrediarioSales = (clientId: string) => {
    return crediarioVendas.filter(venda => venda.client_id === clientId);
  };

  const getClientInstallments = (clientId: string) => {
    // Mesmo que no DataContext: filtra vendas do cliente primeiro
    const clientSales = sales.filter(sale => sale.client_id === clientId);
    const clientSalesIds = clientSales.map(sale => sale.id);
    
    console.log('Cliente:', clientId);
    console.log('Vendas do cliente:', clientSales);
    console.log('IDs das vendas:', clientSalesIds);
    console.log('Todas as parcelas:', installments);
    
    return installments
      .filter(installment => clientSalesIds.includes(installment.venda_id))
      .sort((a, b) => {
        // Get product names for comparison
        const saleA = clientSales.find(sale => sale.id === a.venda_id);
        const saleB = clientSales.find(sale => sale.id === b.venda_id);
        
        if (saleA && saleB) {
          const productA = products.find(product => product.id === saleA.product_id);
          const productB = products.find(product => product.id === saleB.product_id);
          
          if (productA && productB) {
            // Sort alphabetically by product name
            const nameComparison = productA.name.localeCompare(productB.name, 'pt-BR');
            if (nameComparison !== 0) {
              return nameComparison;
            }
          }
        }
        
        // If same product name, sort by installment number
        return a.numero_da_parcela - b.numero_da_parcela;
      });
  };

  const getClientCrediarioInstallments = (clientId: string) => {
    const clientCrediarioSales = getClientCrediarioSales(clientId);
    const clientCrediarioIds = clientCrediarioSales.map(venda => venda.id);
    return crediarioInstallments.filter(installment => clientCrediarioIds.includes(installment.crediario_venda_id));
  };

  const getProductName = (productId: string) => {
    const product = products.find(p => p.id === productId);
    return product ? product.name : 'Produto não encontrado';
  };

  const getSaleInstallments = (saleId: string) => {
    return installments.filter(installment => installment.venda_id === saleId);
  };

  const getTotalInstallmentsForSale = (paymentMethod?: string) => {
    if (!paymentMethod || paymentMethod === 'À vista') return 1;
    const match = paymentMethod.match(/(\d+)x/);
    return match ? parseInt(match[1]) : 1;
  };

  const formatRecentPurchaseDate = (dateString: string) => {
    const date = new Date(dateString);
    date.setDate(date.getDate() + 1);
    return date.toLocaleDateString('pt-BR');
  };

  const formatNormalDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handleInstallmentStatusChange = async (installmentId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'pendente' ? 'pago' : 'pendente';
    try {
      const { error } = await supabase
        .from('parcelas_venda')
        .update({ status: newStatus })
        .eq('id', installmentId);

      if (error) throw error;
      
      toast({
        title: "Sucesso",
        description: `Parcela marcada como ${newStatus}`
      });
      
      fetchData();
    } catch (error) {
      console.error('Erro ao atualizar status da parcela:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status da parcela",
        variant: "destructive"
      });
    }
  };

  const exportClientToPDF = (client: Client) => {
    const clientSales = getClientSales(client.id);
    const clientCrediarioSales = getClientCrediarioSales(client.id);
    const clientInstallments = getClientInstallments(client.id);
    const clientCrediarioInstallments = getClientCrediarioInstallments(client.id);
    
    if (clientSales.length === 0 && clientCrediarioSales.length === 0) {
      toast({
        title: "Aviso",
        description: "Este cliente não possui histórico de compras para exportar"
      });
      return;
    }

    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(20);
    doc.text('Relatório do Cliente', 20, 20);
    
    // Informações do cliente
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text(client.name, 20, 40);
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text(`Telefone: ${client.phone}`, 20, 50);
    if (client.email) {
      doc.text(`E-mail: ${client.email}`, 20, 60);
    }
    doc.text(`Cliente desde: ${formatNormalDate(client.created_at)}`, 20, client.email ? 70 : 60);

    // Resumo do cliente
    const totalSpent = clientSales.reduce((sum, sale) => sum + Number(sale.total_value), 0) +
                      clientCrediarioSales.reduce((sum, venda) => sum + Number(venda.valor_total), 0);
    const totalCommission = clientSales.reduce((sum, sale) => sum + Number(sale.commission), 0);
    
    let yPosition = client.email ? 85 : 75;
    
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('RESUMO', 20, yPosition);
    doc.setLineWidth(0.5);
    doc.line(20, yPosition + 3, 60, yPosition + 3);
    
    yPosition += 15;
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.text(`Total gasto: ${formatCurrency(totalSpent)}`, 20, yPosition);
    doc.text(`Total de vendas: ${clientSales.length}`, 20, yPosition + 8);
    doc.text(`Total de crediários: ${clientCrediarioSales.length}`, 20, yPosition + 16);
    doc.text(`Comissão gerada: ${formatCurrency(totalCommission)}`, 20, yPosition + 24);

    // Histórico de vendas
    yPosition += 43;
    
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    const salesTableData = clientSales.map(sale => [
      getProductName(sale.product_id),
      sale.quantity.toString(),
      formatCurrency(Number(sale.unit_price)),
      formatCurrency(Number(sale.total_value)),
      sale.payment_method || 'À vista',
      formatRecentPurchaseDate(sale.sale_date)
    ]);

    autoTable(doc, {
      head: [['Produto', 'Qtd', 'Preço Unit.', 'Total', 'Pagamento', 'Data']],
      body: salesTableData,
      startY: yPosition,
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [66, 139, 202],
        textColor: [255, 255, 255],
      },
      columnStyles: {
        1: { halign: 'center' },
        2: { halign: 'right' },
        3: { halign: 'right' },
      }
    });

    // Salvar arquivo
    const fileName = `cliente-${client.name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`;
    doc.save(fileName);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Carregando clientes...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={() => navigate(`/lojas/${lojaId}`)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-8 h-8" />
            Clientes
          </h1>
          <p className="text-gray-600">Gerencie seus clientes e histórico de compras</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Buscar clientes por nome ou telefone..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
            className="pl-10 w-80" 
          />
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="bg-blue-600 hover:bg-blue-700" 
              onClick={() => setEditingClient(null)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo</Label>
                <Input 
                  id="name" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  required 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input 
                  id="phone" 
                  value={formData.phone} 
                  onChange={e => setFormData({...formData, phone: e.target.value})} 
                  placeholder="(11) 99999-9999" 
                  required 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input 
                  id="email" 
                  type="email"
                  value={formData.email} 
                  onChange={e => setFormData({...formData, email: e.target.value})} 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input 
                  id="cpf" 
                  value={formData.cpf} 
                  onChange={e => setFormData({...formData, cpf: e.target.value})} 
                  placeholder="000.000.000-00" 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="rua">Rua</Label>
                <Input 
                  id="rua" 
                  value={formData.rua} 
                  onChange={e => setFormData({...formData, rua: e.target.value})} 
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bairro">Bairro</Label>
                  <Input 
                    id="bairro" 
                    value={formData.bairro} 
                    onChange={e => setFormData({...formData, bairro: e.target.value})} 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="numero">Número</Label>
                  <Input 
                    id="numero" 
                    value={formData.numero} 
                    onChange={e => setFormData({...formData, numero: e.target.value})} 
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  {editingClient ? 'Salvar' : 'Criar Cliente'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Clients List */}
      {filteredClients.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <UserPlus className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm ? 'Tente buscar com outros termos' : 'Comece adicionando seu primeiro cliente!'}
              </p>
              {!searchTerm && (
                <Button onClick={() => setDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Cliente
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredClients.map(client => {
            const clientSales = getClientSales(client.id);
            const clientCrediarioSales = getClientCrediarioSales(client.id);
            const totalSpent = clientSales.reduce((sum, sale) => sum + Number(sale.total_value), 0) + 
                              clientCrediarioSales.reduce((sum, venda) => sum + Number(venda.valor_total), 0);
            const clientInstallments = getClientInstallments(client.id);
            
            // Sort sales by date (most recent first)
            const sortedClientSales = [...clientSales].sort((a, b) => 
              parseLocalDate(b.sale_date).getTime() - parseLocalDate(a.sale_date).getTime()
            );
            
            return (
              <Card key={client.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{client.name}</CardTitle>
                    <div className="flex space-x-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleShowHistory(client)}
                        className="text-purple-600 hover:text-purple-700"
                        title="Ver histórico completo"
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        Histórico
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => exportClientToPDF(client)}
                        className="text-blue-600 hover:text-blue-700"
                        title="Exportar PDF do cliente"
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(client)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(client.id)} className="text-red-600 hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <Tabs defaultValue="info" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="info">Informações</TabsTrigger>
                      <TabsTrigger value="history">
                        Parcelas
                        {(clientSales.length > 0 || clientCrediarioSales.length > 0) && (
                          <Badge variant="secondary" className="ml-2">
                            {clientSales.length + clientCrediarioSales.length}
                          </Badge>
                        )}
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="info" className="space-y-4 mt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <Phone className="h-4 w-4" />
                            <span>{client.phone}</span>
                          </div>
                          
                          {client.email && (
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <Mail className="h-4 w-4" />
                              <span>{client.email}</span>
                            </div>
                          )}
                          
                          <div className="flex items-center space-x-2">
                            <DollarSign className="h-4 w-4 text-green-600" />
                            <span className="font-medium">
                              R$ {totalSpent.toLocaleString('pt-BR', {
                                minimumFractionDigits: 2
                              })}
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex space-x-2">
                              <Badge variant="secondary">
                                {clientSales.length} vendas
                              </Badge>
                              {clientCrediarioSales.length > 0 && (
                                <Badge variant="outline" className="border-purple-200 text-purple-700">
                                  {clientCrediarioSales.length} crediários
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-gray-500">
                              Desde {new Date(client.created_at).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        </div>

                        {/* Recent purchases summary */}
                        {clientSales.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium text-gray-700">
                              Últimas compras:
                            </h4>
                            <div className="space-y-1">
                              {sortedClientSales.slice(0, 2).map(sale => (
                                <div key={sale.id} className="text-xs text-gray-600">
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                      <div className="font-medium">{getProductName(sale.product_id)}</div>
                                      <div className="text-gray-500">
                                        {formatRecentPurchaseDate(sale.sale_date)} - {sale.payment_method || 'À vista'}
                                      </div>
                                    </div>
                                    <span className="font-medium">R$ {Number(sale.total_value).toLocaleString('pt-BR', {
                                      minimumFractionDigits: 2
                                    })}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="history" className="mt-4">
                      {clientSales.length === 0 && clientCrediarioSales.length === 0 ? (
                        <div className="text-center py-8">
                          <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                          <p className="text-gray-500">Este cliente ainda não realizou compras.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {/* Vendas Normais */}
                          {sortedClientSales.map(sale => {
                            const saleInstallments = getSaleInstallments(sale.id);
                            const totalInstallments = getTotalInstallmentsForSale(sale.payment_method);
                            const isInstallmentSale = sale.payment_method && !['À vista', 'Dinheiro', 'Cartão de Débito', 'Cartão de Crédito', 'PIX'].includes(sale.payment_method);

                            return (
                              <div key={sale.id} className="border rounded-lg p-4 space-y-3">
                                {/* Sale Header */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3">
                                    <div className="flex-shrink-0">
                                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                        <ShoppingBag className="h-5 w-5 text-blue-600" />
                                      </div>
                                    </div>
                                    <div>
                                      <h4 className="font-medium text-gray-900">
                                        {getProductName(sale.product_id)}
                                      </h4>
                                       <div className="flex items-center space-x-4 text-sm text-gray-600">
                                         <span>Qtd: {sale.quantity}</span>
                                         <span className="font-medium text-green-600">
                                           {formatCurrency(Number(sale.total_value))}
                                         </span>
                                         <span>{sale.payment_method || 'À vista'}</span>
                                         <span>{formatRecentPurchaseDate(sale.sale_date)}</span>
                                       </div>
                                       {sale.observacoes && (
                                         <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                                           <span className="font-medium text-yellow-800">Observações: </span>
                                           <span className="text-yellow-700">{sale.observacoes}</span>
                                         </div>
                                       )}
                                    </div>
                                  </div>
                                  {!isInstallmentSale && (
                                    <Badge className="bg-green-100 text-green-800">
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Pago
                                    </Badge>
                                  )}
                                </div>

                                {/* Installments */}
                                {isInstallmentSale && (
                                  <div className="ml-13 space-y-2">
                                    <h5 className="text-sm font-medium text-gray-700 flex items-center">
                                      <Calendar className="h-4 w-4 mr-2" />
                                      Parcelas:
                                    </h5>
                                     <div className="space-y-2">
                                       {saleInstallments.map(installment => (
                                         <div
                                           key={installment.id}
                                           className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                                         >
                                           <div className="flex items-center space-x-3">
                                             <div className="flex items-center space-x-2">
                                               {installment.status === 'pago' ? (
                                                 <CheckCircle className="h-4 w-4 text-green-600" />
                                               ) : (
                                                 <Clock className="h-4 w-4 text-yellow-600" />
                                               )}
                                               <span className="text-sm font-medium">
                                                 {installment.numero_da_parcela}/{totalInstallments}
                                               </span>
                                             </div>
                                             <div className="text-sm text-gray-600">
                                               <span className="font-medium">
                                                 {formatCurrency(Number(installment.valor_da_parcela))}
                                               </span>
                                               <span className="mx-2">•</span>
                                               <span>{formatNormalDate(installment.data_de_vencimento)}</span>
                                             </div>
                                           </div>
                                           <div className="flex items-center space-x-2">
                                             <Badge
                                               variant={installment.status === 'pago' ? 'default' : 'secondary'}
                                               className={
                                                 installment.status === 'pago'
                                                   ? 'bg-green-100 text-green-800'
                                                   : 'bg-yellow-100 text-yellow-800'
                                               }
                                             >
                                               {installment.status === 'pago' ? 'Pago' : 'Pendente'}
                                             </Badge>
                                             <Button
                                               variant="ghost"
                                               size="sm"
                                               onClick={() => handleInstallmentStatusChange(installment.id, installment.status)}
                                               className="text-blue-600 hover:text-blue-700"
                                             >
                                               {installment.status === 'pago' ? 'Marcar Pendente' : 'Marcar Pago'}
                                             </Button>
                                           </div>
                                         </div>
                                       ))}
                                     </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Client History Modal */}
      {selectedClientForHistory && (
        <ClientHistoryModal
          open={historyModalOpen}
          onClose={() => setHistoryModalOpen(false)}
          client={selectedClientForHistory}
        />
      )}
    </div>
  );
}