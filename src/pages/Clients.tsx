import React, { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, Plus, Search, Phone, Mail, DollarSign, Edit, Trash2, UserPlus, FileText, ShoppingBag, Calendar, CheckCircle, Clock, Crown, AlertTriangle } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ClientHistoryModal from '@/components/ClientHistoryModal';
import { parseLocalDate } from '@/lib/utils';
const Clients = () => {
  const {
    clients,
    addClient,
    updateClient,
    deleteClient,
    sales,
    products,
    getClientInstallments,
    getClientCrediarioInstallments,
    getClientCrediarioSales,
    updateInstallmentStatus
  } = useData();
  const {
    user
  } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    rua: '',
    bairro: '',
    numero: '',
    cpf: ''
  });
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedClientForHistory, setSelectedClientForHistory] = useState(null);
  const [saleItemsCache, setSaleItemsCache] = useState({});
  const canAddClient = user?.plan === 'premium' || clients.length < 10;
  const isAtLimit = user?.plan === 'free' && clients.length >= 10;
  const handleUpgrade = async () => {
    setUpgradeLoading(true);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('create-checkout', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });
      if (error) {
        throw error;
      }
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Erro no processo de upgrade:', error);
      toast.error('Erro ao processar pagamento. Tente novamente.');
    } finally {
      setUpgradeLoading(false);
    }
  };
  const filteredClients = clients.filter(client => client.name.toLowerCase().includes(searchTerm.toLowerCase()) || client.phone.includes(searchTerm));
  const handleSubmit = e => {
    e.preventDefault();
    if (editingClient) {
      updateClient(editingClient.id, formData);
    } else {
      if (!canAddClient) {
        toast.error('Limite de clientes atingido. Faça upgrade para o plano Premium!');
        return;
      }
      addClient(formData);
    }
    resetForm();
  };
  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      rua: '',
      bairro: '',
      numero: '',
      cpf: ''
    });
    setEditingClient(null);
    setDialogOpen(false);
  };
  const handleEdit = client => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      phone: client.phone,
      rua: client.rua || '',
      bairro: client.bairro || '',
      numero: client.numero || '',
      cpf: client.cpf || ''
    });
    setDialogOpen(true);
  };
  const handleDelete = clientId => {
    if (confirm('Tem certeza que deseja excluir este cliente?')) {
      deleteClient(clientId);
    }
  };
  const handleShowHistory = client => {
    setSelectedClientForHistory(client);
    setHistoryModalOpen(true);
  };
  const getClientSales = clientId => {
    return sales.filter(sale => sale.client_id === clientId);
  };
  const getProductName = productId => {
    const product = products.find(p => p.id === productId);
    return product ? product.name : 'Produto não encontrado';
  };

  // Function to get all product names for a sale
  const getSaleProductNames = async (sale) => {
    if (sale.is_multi_product) {
      // Get from cache first
      if (saleItemsCache[sale.id]) {
        return saleItemsCache[sale.id].map(item => getProductName(item.product_id)).join(', ');
      }
      
      try {
        const { data, error } = await supabase
          .from('sale_items')
          .select('product_id')
          .eq('sale_id', sale.id);
          
        if (!error && data) {
          // Cache the result
          setSaleItemsCache(prev => ({ ...prev, [sale.id]: data }));
          return data.map(item => getProductName(item.product_id)).join(', ');
        }
      } catch (error) {
        console.error('Error fetching sale items:', error);
      }
    }
    
    // For single product sales
    return getProductName(sale.product_id);
  };

  // Hook to fetch sale items for multi-product sales
  React.useEffect(() => {
    const fetchAllSaleItems = async () => {
      const multiProductSales = sales.filter(sale => sale.is_multi_product && !saleItemsCache[sale.id]);
      
      if (multiProductSales.length > 0) {
        for (const sale of multiProductSales) {
          try {
            const { data, error } = await supabase
              .from('sale_items')
              .select('product_id')
              .eq('sale_id', sale.id);
              
            if (!error && data) {
              setSaleItemsCache(prev => ({ ...prev, [sale.id]: data }));
            }
          } catch (error) {
            console.error('Error fetching sale items:', error);
          }
        }
      }
    };
    
    fetchAllSaleItems();
  }, [sales]);
  const handleInstallmentStatusChange = async (installmentId, currentStatus) => {
    const newStatus = currentStatus === 'pendente' ? 'pago' : 'pendente';
    try {
      await updateInstallmentStatus(installmentId, newStatus);
    } catch (error) {
      console.error('Erro ao atualizar status da parcela:', error);
      alert('Erro ao atualizar status da parcela');
    }
  };
  const getTotalInstallments = clientId => {
    const clientSales = getClientSales(clientId);
    return clientSales.reduce((total, sale) => {
      if (sale.payment_method && sale.payment_method !== 'À vista') {
        const match = sale.payment_method.match(/(\d+)x/);
        return total + (match ? parseInt(match[1]) : 0);
      }
      return total;
    }, 0);
  };
  const formatRecentPurchaseDate = dateString => {
    const date = new Date(dateString);
    date.setDate(date.getDate() + 1); // Add 1 day to correct timezone
    return date.toLocaleDateString('pt-BR');
  };
  const formatNormalDate = dateString => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };
  const formatCurrency = value => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };
  const getSaleInstallments = saleId => {
    // Get all installments for all clients, then filter by sale ID
    const allInstallments = clients.reduce((acc, client) => {
      const clientInstallments = getClientInstallments(client.id);
      return [...acc, ...clientInstallments];
    }, []);
    return allInstallments.filter(installment => installment.venda_id === saleId);
  };
  const getTotalInstallmentsForSale = paymentMethod => {
    if (!paymentMethod || paymentMethod === 'À vista') return 1;
    const match = paymentMethod.match(/(\d+)x/);
    return match ? parseInt(match[1]) : 1;
  };
  const exportClientToPDF = client => {
    const clientSales = getClientSales(client.id);
    const clientCrediarioSales = getClientCrediarioSales(client.id);
    const clientInstallments = getClientInstallments(client.id);
    const clientCrediarioInstallments = getClientCrediarioInstallments(client.id);
    if (clientSales.length === 0 && clientCrediarioSales.length === 0) {
      alert('Este cliente não possui histórico de compras para exportar');
      return;
    }
    console.log('Iniciando exportação PDF do cliente:', client.name);
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
    const totalSpent = clientSales.reduce((sum, sale) => sum + Number(sale.total_value), 0) + clientCrediarioSales.reduce((sum, venda) => sum + Number(venda.valor_total), 0);
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

    // Verificar se há espaço suficiente
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }
    const salesTableData = clientSales.map(sale => {
      const originalValue = Number(sale.unit_price) * Number(sale.quantity);
      const discount = originalValue - Number(sale.total_value);
      return [
        getProductName(sale.product_id), 
        sale.quantity.toString(), 
        formatCurrency(Number(sale.unit_price)), 
        formatCurrency(Number(sale.total_value)), 
        discount > 0 ? formatCurrency(discount) : 'R$ 0,00',
        sale.payment_method || 'À vista', 
        formatRecentPurchaseDate(sale.sale_date)
      ];
    });
    autoTable(doc, {
      head: [['Produto', 'Qtd', 'Preço Unit.', 'Total', 'Desconto', 'Pagamento', 'Data']],
      body: salesTableData,
      startY: yPosition,
      styles: {
        fontSize: 9,
        cellPadding: 3
      },
      headStyles: {
        fillColor: [66, 139, 202],
        textColor: [255, 255, 255]
      },
      columnStyles: {
        1: {
          halign: 'center'
        },
        2: {
          halign: 'right'
        },
        3: {
          halign: 'right'
        }
      }
    });

    // Vendas de Crediário (se houver)
    if (clientCrediarioSales.length > 0) {
      const finalY = (doc as any).lastAutoTable.finalY || yPosition + 50;
      let crediarioStartY = finalY + 20;

      // Verificar se precisa de nova página
      if (crediarioStartY > 250) {
        doc.addPage();
        crediarioStartY = 20;
      }
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('VENDAS A CREDIÁRIO', 20, crediarioStartY);
      doc.setLineWidth(0.5);
      doc.line(20, crediarioStartY + 3, 100, crediarioStartY + 3);
      const crediarioTableData = clientCrediarioSales.map(venda => [formatCurrency(Number(venda.valor_total)), formatCurrency(Number(venda.valor_entrada)), formatCurrency(Number(venda.valor_restante)), venda.numero_parcelas.toString(), venda.dia_vencimento.toString(), formatRecentPurchaseDate(venda.data_venda), venda.status === 'concluido' ? 'Concluído' : 'Ativo']);
      autoTable(doc, {
        head: [['Valor Total', 'Entrada', 'Restante', 'Parcelas', 'Dia Venc.', 'Data', 'Status']],
        body: crediarioTableData,
        startY: crediarioStartY + 10,
        styles: {
          fontSize: 9,
          cellPadding: 3
        },
        headStyles: {
          fillColor: [147, 51, 234],
          textColor: [255, 255, 255]
        },
        columnStyles: {
          0: {
            halign: 'right'
          },
          1: {
            halign: 'right'
          },
          2: {
            halign: 'right'
          },
          3: {
            halign: 'center'
          },
          4: {
            halign: 'center'
          },
          6: {
            halign: 'center'
          }
        }
      });
    }

    // Parcelas de Crediário (se houver)
    if (clientCrediarioInstallments.length > 0) {
      const finalY = (doc as any).lastAutoTable.finalY || yPosition + 50;
      let crediarioInstallmentsStartY = finalY + 20;

      // Verificar se precisa de nova página
      if (crediarioInstallmentsStartY > 250) {
        doc.addPage();
        crediarioInstallmentsStartY = 20;
      }
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('PARCELAS DE CREDIÁRIO', 20, crediarioInstallmentsStartY);
      doc.setLineWidth(0.5);
      doc.line(20, crediarioInstallmentsStartY + 3, 120, crediarioInstallmentsStartY + 3);
      const crediarioInstallmentsTableData = clientCrediarioInstallments.map(installment => {
        const crediarioVenda = clientCrediarioSales.find(v => v.id === installment.crediario_venda_id);
        return [`${installment.numero_parcela}/${crediarioVenda?.numero_parcelas || '?'}`, formatCurrency(Number(installment.valor_parcela)), formatNormalDate(installment.data_vencimento), installment.status === 'pago' ? 'Pago' : 'Pendente', installment.tipo];
      });
      autoTable(doc, {
        head: [['Parcela', 'Valor', 'Vencimento', 'Status', 'Tipo']],
        body: crediarioInstallmentsTableData,
        startY: crediarioInstallmentsStartY + 10,
        styles: {
          fontSize: 9,
          cellPadding: 3
        },
        headStyles: {
          fillColor: [147, 51, 234],
          textColor: [255, 255, 255]
        },
        columnStyles: {
          0: {
            halign: 'center'
          },
          1: {
            halign: 'right'
          },
          3: {
            halign: 'center'
          },
          4: {
            halign: 'center'
          }
        }
      });
    }

    // Parcelas de Vendas Normais (se houver)
    if (clientInstallments.length > 0) {
      const finalY = (doc as any).lastAutoTable.finalY || yPosition + 50;
      let installmentsStartY = finalY + 20;

      // Verificar se precisa de nova página
      if (installmentsStartY > 250) {
        doc.addPage();
        installmentsStartY = 20;
      }
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('PARCELAS', 20, installmentsStartY);
      doc.setLineWidth(0.5);
      doc.line(20, installmentsStartY + 3, 70, installmentsStartY + 3);
      const installmentsTableData = clientInstallments.map(installment => {
        const sale = clientSales.find(s => s.id === installment.venda_id);
        const totalInstallments = sale?.payment_method?.match(/(\d+)x/)?.[1] || '1';
        return [sale ? getProductName(sale.product_id) : 'N/A', `${installment.numero_da_parcela}/${totalInstallments}`, formatCurrency(Number(installment.valor_da_parcela)), formatNormalDate(installment.data_de_vencimento), installment.status === 'pago' ? 'Pago' : 'Pendente'];
      });
      autoTable(doc, {
        head: [['Produto', 'Parcela', 'Valor', 'Vencimento', 'Status']],
        body: installmentsTableData,
        startY: installmentsStartY + 10,
        styles: {
          fontSize: 9,
          cellPadding: 3
        },
        headStyles: {
          fillColor: [34, 197, 94],
          textColor: [255, 255, 255]
        },
        columnStyles: {
          1: {
            halign: 'center'
          },
          2: {
            halign: 'right'
          },
          4: {
            halign: 'center'
          }
        }
      });
    }

    // Salvar arquivo
    const fileName = `cliente-${client.name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`;
    console.log('Salvando arquivo:', fileName);
    doc.save(fileName);
  };
  return <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-600">
            Gerencie seus clientes e histórico de compras
          </p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700" disabled={!canAddClient} onClick={() => setEditingClient(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo</Label>
                <Input id="name" value={formData.name} onChange={e => setFormData({
                ...formData,
                name: e.target.value
              })} required />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input 
                  id="phone" 
                  value={formData.phone} 
                  onChange={e => {
                    let value = e.target.value.replace(/\D/g, ''); // Remove tudo que não é dígito
                    if (value.length <= 11) {
                      if (value.length <= 10) {
                        value = value.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
                      } else {
                        value = value.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
                      }
                      setFormData({...formData, phone: value});
                    }
                  }} 
                  placeholder="(11) 99999-9999" 
                  maxLength={15}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input 
                  id="cpf" 
                  value={formData.cpf} 
                  onChange={e => {
                    let value = e.target.value.replace(/\D/g, ''); // Remove tudo que não é dígito
                    if (value.length <= 11) {
                      value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
                      setFormData({...formData, cpf: value});
                    }
                  }} 
                  placeholder="000.000.000-00"
                  maxLength={14}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="rua">Rua</Label>
                <Input id="rua" value={formData.rua} onChange={e => setFormData({
                ...formData,
                rua: e.target.value
              })} />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bairro">Bairro</Label>
                  <Input id="bairro" value={formData.bairro} onChange={e => setFormData({
                  ...formData,
                  bairro: e.target.value
                })} />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="numero">Número</Label>
                  <Input id="numero" value={formData.numero} onChange={e => setFormData({
                  ...formData,
                  numero: e.target.value
                })} />
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

      {/* Plan Limit Alert */}
      {isAtLimit && <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <div className="flex items-center justify-between">
              <span>❌ Você atingiu o limite de 10 clientes no plano gratuito. Para continuar, faça upgrade para o plano completo por R$ 99,99/mês.</span>
              <Button onClick={() => window.open('https://pay.cakto.com.br/pta8p6r_492210', '_blank')} className="ml-4 bg-red-600 hover:bg-red-700 text-white" size="sm">
                <Crown className="mr-2 h-4 w-4" />
                Fazer Upgrade
              </Button>
            </div>
          </AlertDescription>
        </Alert>}

      {/* Plan Limit Warning */}
      {user?.plan === 'free' && !isAtLimit && <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-orange-800">
              <Users className="h-5 w-5" />
              <span className="font-medium">
                Plano Gratuito: {clients.length}/10 clientes
              </span>
            </div>
            {clients.length >= 8 && <p className="text-sm text-orange-700 mt-2">
                Você está próximo do limite. Considere fazer upgrade para o plano Premium!
              </p>}
          </CardContent>
        </Card>}

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input placeholder="Buscar clientes por nome ou telefone..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
          </div>
        </CardContent>
      </Card>

      {/* Clients List */}
      {filteredClients.length === 0 ? <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <UserPlus className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm ? 'Tente buscar com outros termos' : 'Comece adicionando seu primeiro cliente!'}
              </p>
              {!searchTerm && canAddClient && <Button onClick={() => setDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Cliente
                </Button>}
            </div>
          </CardContent>
        </Card> : <div className="grid grid-cols-1 gap-6">
          {filteredClients.map(client => {
        const clientSales = getClientSales(client.id);
        const clientCrediarioSales = getClientCrediarioSales(client.id);
        const totalSpent = clientSales.reduce((sum, sale) => sum + Number(sale.total_value), 0) + clientCrediarioSales.reduce((sum, venda) => sum + Number(venda.valor_total), 0);
        const clientInstallments = getClientInstallments(client.id);
        const clientCrediarioInstallments = getClientCrediarioInstallments(client.id);

        // Sort sales by date (most recent first)
        const sortedClientSales = [...clientSales].sort((a, b) => parseLocalDate(b.sale_date).getTime() - parseLocalDate(a.sale_date).getTime());
        return <Card key={client.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{client.name}</CardTitle>
                    <div className="flex space-x-1">
                      <Button variant="ghost" size="sm" onClick={() => handleShowHistory(client)} className="text-purple-600 hover:text-purple-700" title="Ver histórico completo">
                        <FileText className="h-4 w-4 mr-1" />
                        Histórico
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => exportClientToPDF(client)} className="text-blue-600 hover:text-blue-700" title="Exportar PDF do cliente">
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(client)} className="text-green-600 hover:text-green-700" title="Ver dados pessoais">
                        <Users className="h-4 w-4 mr-1" />
                        Dados Pessoais
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
                        {(clientSales.length > 0 || clientCrediarioSales.length > 0) && <Badge variant="secondary" className="ml-2">
                            {clientSales.length + clientCrediarioSales.length}
                          </Badge>}
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="info" className="space-y-4 mt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <Phone className="h-4 w-4" />
                            <span>{client.phone}</span>
                          </div>
                          
                          {client.email && <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <Mail className="h-4 w-4" />
                              <span>{client.email}</span>
                            </div>}
                          
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
                              {clientCrediarioSales.length > 0 && <Badge variant="outline" className="border-purple-200 text-purple-700">
                                  {clientCrediarioSales.length} crediários
                                </Badge>}
                            </div>
                            <span className="text-xs text-gray-500">
                              Desde {new Date(client.created_at).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        </div>

                        {/* Recent purchases summary */}
                        {clientSales.length > 0 && <div className="space-y-2">
                            <h4 className="text-sm font-medium text-gray-700">
                              Últimas compras:
                            </h4>
                            <div className="space-y-1">
                              {sortedClientSales.slice(0, 2).map(sale => <div key={sale.id} className="text-xs text-gray-600">
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
                                </div>)}
                            </div>
                          </div>}
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="history" className="mt-4">
                      {clientSales.length === 0 && clientCrediarioSales.length === 0 ? <div className="text-center py-8">
                          <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                          <p className="text-gray-500">Este cliente ainda não realizou compras.</p>
                        </div> : <div className="space-y-4">
                          {/* Vendas Normais */}
                          {sortedClientSales.map(sale => {
                    const saleInstallments = getSaleInstallments(sale.id);
                    const totalInstallments = getTotalInstallmentsForSale(sale.payment_method);
                    const isInstallmentSale = sale.payment_method && !['À vista', 'Dinheiro', 'Cartão de Débito', 'Cartão de Crédito', 'PIX'].includes(sale.payment_method);
                    return <div key={sale.id} className="border rounded-lg p-4 space-y-3">
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
                                         {sale.is_multi_product && saleItemsCache[sale.id] 
                                           ? saleItemsCache[sale.id].map(item => getProductName(item.product_id)).join(', ')
                                           : getProductName(sale.product_id)
                                         }
                                       </h4>
                                       <div className="flex items-center space-x-4 text-sm text-gray-600">
                                         <span>Qtd: {sale.quantity}</span>
                                         <span className="font-medium text-green-600">
                                           {formatCurrency(Number(sale.total_value))}
                                         </span>
                                         <span className="font-medium text-red-600">
                                           Desc: {(() => {
                                             const originalValue = Number(sale.unit_price) * Number(sale.quantity);
                                             const discount = originalValue - Number(sale.total_value);
                                             return discount > 0 ? formatCurrency(discount) : 'R$ 0,00';
                                           })()}
                                         </span>
                                         <span>{sale.payment_method || 'À vista'}</span>
                                         <span>{formatRecentPurchaseDate(sale.sale_date)}</span>
                                       </div>
                                       {sale.observacoes && <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                                           <span className="font-medium text-yellow-800">Observações: </span>
                                           <span className="text-yellow-700">{sale.observacoes}</span>
                                         </div>}
                                    </div>
                                  </div>
                                  {!isInstallmentSale && <Badge className="bg-green-100 text-green-800">
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Pago
                                    </Badge>}
                                </div>

                                {/* Installments */}
                                {isInstallmentSale && <div className="ml-13 space-y-2">
                                    <h5 className="text-sm font-medium text-gray-700 flex items-center">
                                      <Calendar className="h-4 w-4 mr-2" />
                                      Parcelas:
                                    </h5>
                                     <div className="space-y-2">
                                       {saleInstallments.map(installment => <div key={installment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                                           <div className="flex items-center space-x-3">
                                             <div className="flex items-center space-x-2">
                                               {installment.status === 'pago' ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Clock className="h-4 w-4 text-yellow-600" />}
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
                                              {installment.observacoes && (
                                                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                                                  <span className="font-medium text-blue-800">Observações: </span>
                                                  <span className="text-blue-700">{installment.observacoes}</span>
                                                </div>
                                              )}
                                           </div>
                                           <div className="flex items-center space-x-2">
                                             <Badge variant={installment.status === 'pago' ? 'default' : 'secondary'} className={installment.status === 'pago' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                                               {installment.status === 'pago' ? 'Pago' : 'Pendente'}
                                             </Badge>
                                             <Button variant="ghost" size="sm" onClick={() => handleInstallmentStatusChange(installment.id, installment.status)} className="text-xs px-2 py-1 h-auto">
                                               {installment.status === 'pendente' ? 'Marcar Pago' : 'Marcar Pendente'}
                                             </Button>
                                           </div>
                                         </div>)}
                                     </div>
                                  </div>}
                              </div>;
                  })}
                          
                          {/* Vendas de Crediário */}
                          {clientCrediarioSales.sort((a, b) => parseLocalDate(b.data_venda).getTime() - parseLocalDate(a.data_venda).getTime()).map(crediarioVenda => {
                    const crediarioInstallments = clientCrediarioInstallments.filter(parcela => parcela.crediario_venda_id === crediarioVenda.id);
                    return <div key={`crediario-${crediarioVenda.id}`} className="border rounded-lg p-4 space-y-3 bg-purple-50">
                                {/* Sale Header */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3">
                                    <div className="flex-shrink-0">
                                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                        <ShoppingBag className="h-5 w-5 text-purple-600" />
                                      </div>
                                    </div>
                                    <div>
                                       <h4 className="font-medium text-gray-900 flex items-center">
                                         {crediarioVenda.produto_id ? getProductName(crediarioVenda.produto_id) : 'Venda a Crediário'}
                                         <Badge variant="outline" className="ml-2 border-purple-200 text-purple-700">
                                           Crediário
                                         </Badge>
                                       </h4>
                                       <div className="flex items-center space-x-4 text-sm text-gray-600">
                                         <span className="font-medium text-purple-600">
                                           {formatCurrency(Number(crediarioVenda.valor_total))}
                                         </span>
                                         <span>Entrada: {formatCurrency(Number(crediarioVenda.valor_entrada))}</span>
                                         <span>{crediarioVenda.numero_parcelas}x</span>
                                         <span>{formatRecentPurchaseDate(crediarioVenda.data_venda)}</span>
                                       </div>
                                       {crediarioVenda.observacoes && <div className="mt-2 p-2 bg-purple-100 border border-purple-200 rounded text-sm">
                                           <span className="font-medium text-purple-800">Observações: </span>
                                           <span className="text-purple-700">{crediarioVenda.observacoes}</span>
                                         </div>}
                                    </div>
                                  </div>
                                  <Badge variant={crediarioVenda.status === 'concluido' ? 'default' : 'secondary'} className={crediarioVenda.status === 'concluido' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                                    {crediarioVenda.status === 'concluido' ? 'Concluído' : 'Ativo'}
                                  </Badge>
                                </div>

                                {/* Installments */}
                                <div className="ml-13 space-y-2">
                                  <h5 className="text-sm font-medium text-gray-700 flex items-center">
                                    <Calendar className="h-4 w-4 mr-2" />
                                    Parcelas do Crediário:
                                  </h5>
                                   <div className="space-y-2">
                                     {crediarioInstallments.map(installment => <div key={installment.id} className="flex items-center justify-between p-3 bg-white rounded-md border border-purple-100">
                                         <div className="flex items-center space-x-3">
                                           <div className="flex items-center space-x-2">
                                             {installment.status === 'pago' ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Clock className="h-4 w-4 text-yellow-600" />}
                                             <span className="text-sm font-medium">
                                               {installment.numero_parcela}/{crediarioVenda.numero_parcelas}
                                             </span>
                                           </div>
                                            <div className="text-sm text-gray-600">
                                              <span className="font-medium">
                                                {formatCurrency(Number(installment.valor_parcela))}
                                              </span>
                                              <span className="mx-2">•</span>
                                              <span>{installment.tipo === 'entrada' ? formatNormalDate(installment.data_vencimento) : formatNormalDate(installment.data_vencimento)}</span>
                                              <span className="mx-2">•</span>
                                              <span className="text-purple-600">{installment.tipo}</span>
                                            </div>
                                            {installment.observacoes && (
                                              <div className="mt-2 p-2 bg-purple-50 border border-purple-200 rounded text-xs">
                                                <span className="font-medium text-purple-800">Observações: </span>
                                                <span className="text-purple-700">{installment.observacoes}</span>
                                              </div>
                                            )}
                                         </div>
                                         <Badge variant={installment.status === 'pago' ? 'default' : 'secondary'} className={installment.status === 'pago' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                                           {installment.status === 'pago' ? 'Pago' : 'Pendente'}
                                         </Badge>
                                       </div>)}
                                   </div>
                                </div>
                              </div>;
                  })}
                        </div>}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>;
      })}
        </div>}

      {/* Client History Modal */}
      {selectedClientForHistory && <ClientHistoryModal open={historyModalOpen} onClose={() => {
      setHistoryModalOpen(false);
      setSelectedClientForHistory(null);
    }} client={selectedClientForHistory} />}
    </div>;
};
export default Clients;