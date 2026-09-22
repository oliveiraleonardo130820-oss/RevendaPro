
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn, parseLocalDate, toLocalISODate } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, Plus, Users, Package, ShoppingCart, BarChart3, AlertCircle, Search, User, Phone, Mail, DollarSign, ShoppingBag, CheckCircle, FileText, AlertTriangle, Percent, Archive, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import ClientHistoryModal from '@/components/ClientHistoryModal';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import ClientSearchModal from '@/components/ClientSearchModal';
import ProductSearchModal from '@/components/ProductSearchModal';

interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
  created_at: string;
}

interface Product {
  id: string;
  name: string;
  unit_price: number;
  commission: number;
}

interface Sale {
  id: string;
  sale_date: string;
  product_id: string;
  client_id?: string;
  quantity: number;
  unit_price: number;
  total_value: number;
  payment_method?: string;
  observacoes?: string;
  commission: number;
  juros_parcelamento?: number;
  products?: { name: string };
  clients?: { name: string };
}

interface Funcionario {
  id: string;
  nome: string;
  email: string;
  loja_id: string;
}

interface Loja {
  nome_loja?: string;
}

const FuncionarioDashboard = () => {
  const { user, logout, loading: authLoading } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [funcionario, setFuncionario] = useState<Funcionario | null>(null);
  const [loja, setLoja] = useState<Loja | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Formulário de nova venda
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [selectedInstallments, setSelectedInstallments] = useState('');
  const [saleDate, setSaleDate] = useState<Date>(new Date());
  const [observacoes, setObservacoes] = useState('');
  const [jurosParcelamento, setJurosParcelamento] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Estados dos modais
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedClientForHistory, setSelectedClientForHistory] = useState<Client | null>(null);
  const [isNewClientDialogOpen, setIsNewClientDialogOpen] = useState(false);
  const [newClientData, setNewClientData] = useState({
    name: '',
    phone: '',
    cpf: '',
    rua: '',
    bairro: '',
    numero: ''
  });
  const [installments, setInstallments] = useState<any[]>([]);
  const [stockSearchTerm, setStockSearchTerm] = useState('');
  
  // Estados para produto
  const [isNewProductDialogOpen, setIsNewProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newProductData, setNewProductData] = useState({
    name: '',
    unit_price: '',
    commission: '',
    estoque: ''
  });

  // Estados para editar venda
  const [isEditSaleDialogOpen, setIsEditSaleDialogOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [editSaleData, setEditSaleData] = useState({
    selectedClient: null as Client | null,
    selectedProduct: null as Product | null,
    quantity: 1,
    paymentMethod: '',
    selectedInstallments: '',
    saleDate: new Date(),
    observacoes: '',
    jurosParcelamento: 0
  });

  // Payment method options
  const basePaymentMethods = [
    'Dinheiro',
    'Cartão de Débito',
    'Cartão de Crédito',
    'PIX',
    'Crediário',
  ];

  const installmentOptions = [
    '2x',
    '3x',
    '4x',
    '5x',
    '6x',
    '7x',
    '8x',
    '9x',
    '10x',
    '11x',
    '12x',
  ];

  useEffect(() => {
    // Aguardar o carregamento da autenticação
    if (authLoading) return;

    // Verificar se é funcionário
    if (!user || user.tipo_usuario !== 'funcionario') {
      setLoading(false);
      return;
    }

    fetchData();
  }, [user, authLoading]);

  // Se ainda está carregando a autenticação, mostrar loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  // Se não é funcionário, redirecionar
  if (!user || user.tipo_usuario !== 'funcionario') {
    return <Navigate to="/auth" replace />;
  }

  const fetchData = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      console.log('Funcionário logado:', { id: user.id, tipo: user.tipo_usuario, loja_id: user.loja_id });

      let lojaId: string | null = null;

      // Primeiro, tentar buscar informações do funcionário na tabela funcionarios
      console.log('Buscando dados do funcionário na tabela funcionarios...');
      const { data: funcionarioData, error: funcionarioError } = await supabase
        .from('funcionarios')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (funcionarioError) {
        console.log('Funcionário não encontrado na tabela funcionarios, verificando profiles...');
        
        // Se não encontrar na tabela funcionarios, usar loja_id do profiles
        if (user.loja_id) {
          lojaId = user.loja_id;
          console.log('Usando loja_id do profiles:', lojaId);
          
          // Criar objeto funcionario temporário
          setFuncionario({
            id: user.id,
            nome: user.name,
            email: user.email,
            loja_id: lojaId
          });
        } else {
          console.error('Funcionário não possui loja_id definida');
          setErrorMessage('Este funcionário não está associado a nenhuma loja. Entre em contato com o administrador.');
          setLoading(false);
          return;
        }
      } else {
        console.log('Funcionário encontrado na tabela funcionarios:', funcionarioData);
        setFuncionario(funcionarioData);
        lojaId = funcionarioData.loja_id;
      }

      console.log('ID da loja a ser usada:', lojaId);

      if (!lojaId) {
        setErrorMessage('Não foi possível identificar a loja do funcionário. Entre em contato com o administrador.');
        setLoading(false);
        return;
      }

      // Buscar informações da loja
      const { data: lojaData } = await supabase
        .from('profiles')
        .select('nome_loja')
        .eq('id', lojaId)
        .single();
      
      if (lojaData) {
        console.log('Loja encontrada:', lojaData);
        setLoja(lojaData);
      }

      // Buscar clientes da loja
      console.log('Buscando clientes da loja:', lojaId);
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', lojaId);
      
      if (clientsError) {
        console.error('Erro ao buscar clientes:', clientsError);
        toast.error('Erro ao carregar clientes');
      } else {
        console.log('Clientes encontrados:', clientsData?.length || 0);
        setClients(clientsData || []);
      }

      // Buscar produtos da loja
      console.log('Buscando produtos da loja:', lojaId);
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', lojaId);
      
      if (productsError) {
        console.error('Erro ao buscar produtos:', productsError);
        toast.error('Erro ao carregar produtos');
      } else {
        console.log('Produtos encontrados:', productsData?.length || 0);
        setProducts(productsData || []);
      }

      // Buscar vendas do funcionário
      console.log('Buscando vendas do funcionário:', user.id);
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select(`
          *,
          products(name),
          clients(name)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (salesError) {
        console.error('Erro ao buscar vendas:', salesError);
        toast.error('Erro ao carregar vendas');
      } else {
        console.log('Vendas encontradas:', salesData?.length || 0);
        setSales(salesData || []);
      }

      // Buscar parcelas das vendas
      console.log('Buscando parcelas das vendas...');
      const { data: installmentsData, error: installmentsError } = await supabase
        .from('parcelas_venda')
        .select('*')
        .eq('user_id', user.id)
        .order('data_de_vencimento', { ascending: true });
      
      if (installmentsError) {
        console.error('Erro ao buscar parcelas:', installmentsError);
        toast.error('Erro ao carregar parcelas');
      } else {
        console.log('Parcelas encontradas:', installmentsData?.length || 0);
        setInstallments(installmentsData || []);
      }

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setErrorMessage('Erro interno ao carregar dados. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectClient = (client: Client) => {
    if (isEditSaleDialogOpen) {
      setEditSaleData({...editSaleData, selectedClient: client});
    } else {
      setSelectedClient(client);
    }
    setIsClientModalOpen(false);
  };

  const handleSelectProduct = (product: Product) => {
    if (isEditSaleDialogOpen) {
      setEditSaleData({...editSaleData, selectedProduct: product});
    } else {
      setSelectedProduct(product);
    }
    setIsProductModalOpen(false);
  };

  const handleNewClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!funcionario?.loja_id) return;

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('clients')
        .insert({
          ...newClientData,
          user_id: funcionario.loja_id
        });

      if (error) {
        console.error('Erro ao criar cliente:', error);
        toast.error('Erro ao criar cliente');
        return;
      }

      toast.success('Cliente criado com sucesso!');
      setNewClientData({ name: '', phone: '', cpf: '', rua: '', bairro: '', numero: '' });
      setIsNewClientDialogOpen(false);
      
      // Recarregar clientes
      const { data: clientsData } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', funcionario.loja_id);
      
      if (clientsData) {
        setClients(clientsData);
      }

    } catch (error) {
      console.error('Erro ao criar cliente:', error);
      toast.error('Erro interno ao criar cliente');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNewSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !user || !funcionario) return;

    setSubmitting(true);
    try {
      let totalValue = selectedProduct.unit_price * quantity;
      
      // Aplicar juros de parcelamento se for parcelado
      if (paymentMethod === 'Parcelas' && jurosParcelamento > 0) {
        const juros = (jurosParcelamento / 100) * totalValue;
        totalValue += juros;
      }
      
      const commission = (selectedProduct.commission / 100) * totalValue;

      // Corrigir o client_id - usar null quando não há cliente selecionado
      let clientId = null;
      if (selectedClient) {
        clientId = selectedClient.id;
      }

      // Determinar o método de pagamento final
      const finalPaymentMethod = paymentMethod === 'Parcelas' ? selectedInstallments : paymentMethod;

      console.log('Dados da venda a serem inseridos:', {
        user_id: user.id,
        product_id: selectedProduct.id,
        client_id: clientId,
        quantity,
        unit_price: selectedProduct.unit_price,
        total_value: totalValue,
        commission,
        payment_method: finalPaymentMethod,
        sale_date: toLocalISODate(),
      });

      const { data: saleData, error } = await supabase
        .from('sales')
        .insert({
          user_id: user.id,
          product_id: selectedProduct.id,
          client_id: clientId,
          quantity,
          unit_price: selectedProduct.unit_price,
          total_value: totalValue,
          commission,
          payment_method: finalPaymentMethod,
          sale_date: toLocalISODate(saleDate),
          observacoes: observacoes.trim() || null,
          juros_parcelamento: paymentMethod === 'Parcelas' ? jurosParcelamento : 0,
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao registrar venda:', error);
        throw error;
      }

      // Só continua se o pagamento for parcelado
      if (paymentMethod === 'Parcelas') {
        const vendaId = saleData.id;
        const installmentNumber = parseInt(selectedInstallments.replace('x', ''));
        const parcelas = [];
        const parcelaValor = parseFloat((totalValue / installmentNumber).toFixed(2));
        const saleDate = toLocalISODate();
        
        // Parse the sale date
        const [year, month, day] = saleDate.split('-').map(Number);

        for (let i = 1; i <= installmentNumber; i++) {
          // Create date for each installment using proper month addition
          const installmentDate = new Date(year, month - 1, day); // month is 0-indexed
          
          // Add months instead of days for proper calendar-based calculation
          installmentDate.setMonth(installmentDate.getMonth() + (i - 1));
          
          // Handle edge cases where the day doesn't exist in the target month
          if (installmentDate.getDate() !== day) {
            installmentDate.setDate(0);
            installmentDate.setMonth(installmentDate.getMonth() + 1, 0);
          }

          // Add +1 day to compensate for UTC timezone issue
          installmentDate.setDate(installmentDate.getDate() + 1);

          // Format the date as YYYY-MM-DD
          const dueDateString = `${installmentDate.getFullYear()}-${String(installmentDate.getMonth() + 1).padStart(2, '0')}-${String(installmentDate.getDate()).padStart(2, '0')}`;

          parcelas.push({
            venda_id: vendaId,
            numero_da_parcela: i,
            valor_da_parcela: parcelaValor,
            data_de_vencimento: dueDateString,
            status: 'pendente',
            user_id: user.id,
          });
        }

        const { error: parcelasError } = await supabase
          .from('parcelas_venda')
          .insert(parcelas);

        if (parcelasError) {
          console.error('Erro ao inserir parcelas:', parcelasError);
          throw parcelasError;
        }

        console.log('Parcelas registradas com sucesso!');
      }

      console.log('Venda registrada com sucesso!');
      toast.success('Venda registrada com sucesso!');
      
      // Limpar formulário
      setSelectedClient(null);
      setSelectedProduct(null);
      setQuantity(1);
      setPaymentMethod('');
      setSelectedInstallments('');
      setSaleDate(new Date());
      setObservacoes('');
      setJurosParcelamento(0);
      
      // Recarregar vendas
      fetchData();
    } catch (error) {
      console.error('Erro ao registrar venda:', error);
      toast.error('Erro ao registrar venda');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInstallmentStatusChange = async (installmentId: string, currentStatus: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('parcelas_venda')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', installmentId);

      if (error) {
        console.error('Erro ao atualizar status da parcela:', error);
        toast.error('Erro ao atualizar status da parcela');
        return;
      }

      toast.success(`Parcela marcada como ${newStatus === 'pago' ? 'paga' : 'pendente'}!`);
      fetchData(); // Reload data
    } catch (error) {
      console.error('Erro ao atualizar status da parcela:', error);
      toast.error('Erro ao atualizar status da parcela');
    }
  };

  // Funções para gerenciar produtos
  const handleNewProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!funcionario?.loja_id) return;

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('products')
        .insert({
          name: newProductData.name,
          unit_price: parseFloat(newProductData.unit_price),
          commission: parseFloat(newProductData.commission) || 0,
          estoque: parseInt(newProductData.estoque) || 0,
          user_id: funcionario.loja_id
        });

      if (error) {
        console.error('Erro ao criar produto:', error);
        toast.error('Erro ao criar produto');
        return;
      }

      toast.success('Produto criado com sucesso!');
      setNewProductData({ name: '', unit_price: '', commission: '', estoque: '' });
      setIsNewProductDialogOpen(false);
      fetchData(); // Reload data
    } catch (error) {
      console.error('Erro ao criar produto:', error);
      toast.error('Erro ao criar produto');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setNewProductData({
      name: product.name,
      unit_price: product.unit_price.toString(),
      commission: product.commission.toString(),
      estoque: (product as any).estoque?.toString() || '0'
    });
    setIsNewProductDialogOpen(true);
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('products')
        .update({
          name: newProductData.name,
          unit_price: parseFloat(newProductData.unit_price),
          commission: parseFloat(newProductData.commission) || 0,
          estoque: parseInt(newProductData.estoque) || 0
        })
        .eq('id', editingProduct.id);

      if (error) {
        console.error('Erro ao atualizar produto:', error);
        toast.error('Erro ao atualizar produto');
        return;
      }

      toast.success('Produto atualizado com sucesso!');
      setNewProductData({ name: '', unit_price: '', commission: '', estoque: '' });
      setEditingProduct(null);
      setIsNewProductDialogOpen(false);
      fetchData(); // Reload data
    } catch (error) {
      console.error('Erro ao atualizar produto:', error);
      toast.error('Erro ao atualizar produto');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) {
        console.error('Erro ao deletar produto:', error);
        toast.error('Erro ao deletar produto');
        return;
      }

      toast.success('Produto deletado com sucesso!');
      fetchData(); // Reload data
    } catch (error) {
      console.error('Erro ao deletar produto:', error);
      toast.error('Erro ao deletar produto');
    }
  };

  const resetProductForm = () => {
    setNewProductData({ name: '', unit_price: '', commission: '', estoque: '' });
    setEditingProduct(null);
    setIsNewProductDialogOpen(false);
  };

  // Funções para gerenciar vendas
  const handleEditSale = (sale: Sale) => {
    setEditingSale(sale);
    
    // Buscar cliente e produto da venda
    const client = clients.find(c => c.id === sale.client_id);
    const product = products.find(p => p.id === sale.product_id);
    
    setEditSaleData({
      selectedClient: client || null,
      selectedProduct: product || null,
      quantity: sale.quantity,
      paymentMethod: sale.payment_method || '',
      selectedInstallments: sale.payment_method && sale.payment_method.includes('x') ? sale.payment_method : '',
      saleDate: parseLocalDate(sale.sale_date),
      observacoes: sale.observacoes || '',
      jurosParcelamento: sale.juros_parcelamento || 0
    });
    
    setIsEditSaleDialogOpen(true);
  };

  const handleUpdateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSale || !editSaleData.selectedProduct) return;

    setSubmitting(true);
    try {
      let totalValue = editSaleData.selectedProduct.unit_price * editSaleData.quantity;
      
      // Aplicar juros de parcelamento se for parcelado
      if (editSaleData.paymentMethod === 'Parcelas' && editSaleData.jurosParcelamento > 0) {
        const juros = (editSaleData.jurosParcelamento / 100) * totalValue;
        totalValue += juros;
      }
      
      const commission = (editSaleData.selectedProduct.commission / 100) * totalValue;

      // Determinar o método de pagamento final
      const finalPaymentMethod = editSaleData.paymentMethod === 'Parcelas' ? editSaleData.selectedInstallments : editSaleData.paymentMethod;

      const { error } = await supabase
        .from('sales')
        .update({
          product_id: editSaleData.selectedProduct.id,
          client_id: editSaleData.selectedClient?.id || null,
          quantity: editSaleData.quantity,
          unit_price: editSaleData.selectedProduct.unit_price,
          total_value: totalValue,
          commission,
          payment_method: finalPaymentMethod,
          sale_date: toLocalISODate(editSaleData.saleDate),
          observacoes: editSaleData.observacoes.trim() || null,
          juros_parcelamento: editSaleData.paymentMethod === 'Parcelas' ? editSaleData.jurosParcelamento : 0,
        })
        .eq('id', editingSale.id);

      if (error) {
        console.error('Erro ao atualizar venda:', error);
        throw error;
      }

      toast.success('Venda atualizada com sucesso!');
      setIsEditSaleDialogOpen(false);
      setEditingSale(null);
      fetchData(); // Reload data
    } catch (error) {
      console.error('Erro ao atualizar venda:', error);
      toast.error('Erro ao atualizar venda');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSale = async (saleId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta venda? Esta ação não pode ser desfeita.')) return;

    try {
      // Primeiro, deletar as parcelas relacionadas se existirem
      const { error: parcelasError } = await supabase
        .from('parcelas_venda')
        .delete()
        .eq('venda_id', saleId);

      if (parcelasError) {
        console.error('Erro ao deletar parcelas da venda:', parcelasError);
        toast.error('Erro ao deletar parcelas da venda');
        return;
      }

      // Depois, deletar a venda
      const { error } = await supabase
        .from('sales')
        .delete()
        .eq('id', saleId);

      if (error) {
        console.error('Erro ao deletar venda:', error);
        toast.error('Erro ao deletar venda');
        return;
      }

      toast.success('Venda deletada com sucesso!');
      fetchData(); // Reload data
    } catch (error) {
      console.error('Erro ao deletar venda:', error);
      toast.error('Erro ao deletar venda');
    }
  };

  const handleStatusToggle = async (checked: boolean) => {
    setIsUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ ativo: checked })
        .eq('id', user?.id);

      if (error) throw error;
      
      toast.success(checked ? 'Funcionário ativado!' : 'Funcionário desativado!');
      
      // Recarregar a página para atualizar o contexto
      window.location.reload();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status. Tente novamente.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleShowHistory = (client: Client) => {
    setSelectedClientForHistory(client);
    setHistoryModalOpen(true);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatRecentPurchaseDate = (dateString: string) => {
    const date = new Date(dateString);
    date.setDate(date.getDate() + 1); // Add 1 day to correct timezone
    return date.toLocaleDateString('pt-BR');
  };

  const formatNormalDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getProductName = (productId: string) => {
    const product = products.find(p => p.id === productId);
    return product ? product.name : 'Produto não encontrado';
  };

  const getClientInstallments = (clientId: string) => {
    // Filtrar vendas do cliente primeiro
    const clientSales = sales.filter(sale => sale.client_id === clientId);
    const clientSalesIds = clientSales.map(sale => sale.id);
    
    return installments
      .filter(installment => clientSalesIds.includes(installment.venda_id))
      .sort((a, b) => {
        // Get product names for comparison
        const saleA = clientSales.find(sale => sale.id === a.venda_id);
        const saleB = clientSales.find(sale => sale.id === b.venda_id);
        const productA = products.find(p => p.id === saleA?.product_id);
        const productB = products.find(p => p.id === saleB?.product_id);
        
        return (productA?.name || '').localeCompare(productB?.name || '');
      });
  };

  const exportClientToPDF = (client: Client) => {
    const clientSales = sales.filter(sale => sale.client_id === client.id);
    
    if (clientSales.length === 0) {
      toast.error('Este cliente não possui histórico de compras para exportar');
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
    const totalSpent = clientSales.reduce((sum, sale) => sum + Number(sale.total_value), 0);
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
    doc.text(`Comissão gerada: ${formatCurrency(totalCommission)}`, 20, yPosition + 16);

    // Histórico de vendas
    yPosition += 35;
    
    // Verificar se há espaço suficiente
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
    toast.success('Relatório gerado com sucesso!');
  };

  const handleLogout = () => {
    logout();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando dados...</p>
        </div>
      </div>
    );
  }

  // Mostrar erro se houver
  if (errorMessage) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Acesso não autorizado
          </h2>
          <p className="text-gray-600 mb-6">
            {errorMessage}
          </p>
          <Button onClick={handleLogout} variant="outline">
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 flex items-center">
                  <span className="text-blue-600 font-bold mr-2">RevendaPro</span>
                  {loja?.nome_loja && (
                    <>
                      <span className="text-gray-400 mx-2">|</span>
                      <span>{loja.nome_loja}</span>
                    </>
                  )}
                </h1>
                <p className="text-sm text-gray-500">
                  Bem-vindo, {user?.name}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs defaultValue="nova-venda" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="nova-venda" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nova Venda
            </TabsTrigger>
            <TabsTrigger value="vendas" className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Minhas Vendas
            </TabsTrigger>
            <TabsTrigger value="clientes" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Clientes
            </TabsTrigger>
            <TabsTrigger value="produtos" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Produtos
            </TabsTrigger>
            <TabsTrigger value="perfil" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Meu Perfil
            </TabsTrigger>
          </TabsList>

          {/* Nova Venda */}
          <TabsContent value="nova-venda">
            <Card>
              <CardHeader>
                <CardTitle>Registrar Nova Venda</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleNewSale} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="client">Cliente (Opcional)</Label>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-start h-10"
                        onClick={() => setIsClientModalOpen(true)}
                      >
                        <Search className="h-4 w-4 mr-2" />
                        {selectedClient ? selectedClient.name : "Buscar cliente (opcional)"}
                      </Button>
                      {selectedClient && (
                        <div className="mt-2 p-2 bg-blue-50 rounded-md">
                          <p className="text-sm font-medium text-blue-900">{selectedClient.name}</p>
                          <p className="text-xs text-blue-700">{selectedClient.phone}</p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedClient(null)}
                            className="text-red-600 hover:text-red-700 mt-1"
                          >
                            Remover cliente
                          </Button>
                        </div>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="product">Produto *</Label>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-start h-10"
                        onClick={() => setIsProductModalOpen(true)}
                      >
                        <Search className="h-4 w-4 mr-2" />
                        {selectedProduct ? selectedProduct.name : "Buscar produto"}
                      </Button>
                      {selectedProduct && (
                        <div className="mt-2 p-2 bg-blue-50 rounded-md">
                          <p className="text-sm font-medium text-blue-900">{selectedProduct.name}</p>
                          <p className="text-xs text-blue-700">
                            R$ {selectedProduct.unit_price.toFixed(2)}
                          </p>
                        </div>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="quantity">Quantidade *</Label>
                      <Input
                        id="quantity"
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="saleDate">Data da Venda *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !saleDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {saleDate ? format(saleDate, "dd/MM/yyyy") : <span>Selecionar data</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={saleDate}
                            onSelect={(date) => date && setSaleDate(date)}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div>
                      <Label htmlFor="payment">Forma de Pagamento</Label>
                      <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a forma de pagamento" />
                        </SelectTrigger>
                        <SelectContent>
                          {basePaymentMethods.map((method) => (
                            <SelectItem key={method} value={method}>
                              {method}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      {paymentMethod === 'Parcelas' && (
                        <div className="mt-2 space-y-2">
                          <Label>Número de Parcelas</Label>
                          <Select value={selectedInstallments} onValueChange={setSelectedInstallments}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o número de parcelas" />
                            </SelectTrigger>
                            <SelectContent>
                              {installmentOptions.map((installment) => (
                                <SelectItem key={installment} value={installment}>
                                  {installment}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          <div>
                            <Label htmlFor="juros">Juros de Parcelamento (%)</Label>
                            <Input
                              id="juros"
                              type="number"
                              min="0"
                              step="0.01"
                              value={jurosParcelamento}
                              onChange={(e) => setJurosParcelamento(parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="observacoes">Observações</Label>
                      <Textarea
                        id="observacoes"
                        placeholder="Observações sobre a venda..."
                        value={observacoes}
                        onChange={(e) => setObservacoes(e.target.value)}
                        className="min-h-[80px]"
                      />
                    </div>

                    {/* Resumo da Venda */}
                    {selectedProduct && (
                      <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                        <h3 className="font-medium text-gray-900">Resumo da Venda</h3>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-600">Produto:</span>
                            <p className="font-medium">{selectedProduct.name}</p>
                          </div>
                          {selectedClient && (
                            <div>
                              <span className="text-gray-600">Cliente:</span>
                              <p className="font-medium">{selectedClient.name}</p>
                            </div>
                          )}
                          <div>
                            <span className="text-gray-600">Quantidade:</span>
                            <p className="font-medium">{quantity}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Valor unitário:</span>
                            <p className="font-medium">R$ {selectedProduct.unit_price.toFixed(2)}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Subtotal:</span>
                            <p className="font-medium">R$ {(selectedProduct.unit_price * quantity).toFixed(2)}</p>
                          </div>
                          {paymentMethod === 'Parcelas' && jurosParcelamento > 0 && (
                            <div>
                              <span className="text-gray-600">Juros ({jurosParcelamento}%):</span>
                              <p className="font-medium text-orange-600">
                                R$ {((jurosParcelamento / 100) * (selectedProduct.unit_price * quantity)).toFixed(2)}
                              </p>
                            </div>
                          )}
                          <div className="col-span-2 pt-2 border-t border-gray-200">
                            <span className="text-gray-600">Total:</span>
                            <p className="text-lg font-bold text-green-600">
                              R$ {(() => {
                                let total = selectedProduct.unit_price * quantity;
                                if (paymentMethod === 'Parcelas' && jurosParcelamento > 0) {
                                  total += (jurosParcelamento / 100) * total;
                                }
                                return total.toFixed(2);
                              })()}
                            </p>
                          </div>
                          <div className="col-span-2">
                            <span className="text-gray-600">Comissão:</span>
                            <p className="font-medium text-blue-600">
                              R$ {(() => {
                                let total = selectedProduct.unit_price * quantity;
                                if (paymentMethod === 'Parcelas' && jurosParcelamento > 0) {
                                  total += (jurosParcelamento / 100) * total;
                                }
                                return ((selectedProduct.commission / 100) * total).toFixed(2);
                              })()}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={submitting || !selectedProduct}>
                      {submitting ? 'Registrando...' : 'Registrar Venda'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Vendas */}
          <TabsContent value="vendas">
            <Card>
              <CardHeader>
                <CardTitle>Minhas Vendas ({sales.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
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
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                    <TableBody>
                      {sales.map((sale) => (
                        <TableRow key={sale.id}>
                          <TableCell>
                            {parseLocalDate(sale.sale_date).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell>{sale.products?.name}</TableCell>
                          <TableCell>{sale.clients?.name || 'Sem cliente'}</TableCell>
                          <TableCell>{sale.quantity}</TableCell>
                          <TableCell>R$ {sale.unit_price.toFixed(2)}</TableCell>
                          <TableCell>R$ {sale.total_value.toFixed(2)}</TableCell>
                          <TableCell>{sale.payment_method || 'N/A'}</TableCell>
                          <TableCell>
                            {sale.payment_method && ['Dinheiro', 'Cartão de Débito', 'Cartão de Crédito', 'PIX'].includes(sale.payment_method) ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Pago
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                Parcelado
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditSale(sale)}
                                className="text-blue-600 hover:text-blue-700"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteSale(sale.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {sales.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-gray-500">
                            Nenhuma venda registrada
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Clientes */}
          <TabsContent value="clientes">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Clientes da Loja</h2>
                  <p className="text-gray-600">
                    Visualize os clientes e histórico de compras
                  </p>
                </div>
                
                <Dialog open={isNewClientDialogOpen} onOpenChange={setIsNewClientDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="mr-2 h-4 w-4" />
                      Novo Cliente
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Novo Cliente</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleNewClient} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="client-name">Nome do cliente</Label>
                        <Input
                          id="client-name"
                          value={newClientData.name}
                          onChange={(e) => setNewClientData({...newClientData, name: e.target.value})}
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="client-phone">Telefone</Label>
                        <Input
                          id="client-phone"
                          value={newClientData.phone}
                          onChange={(e) => setNewClientData({...newClientData, phone: e.target.value})}
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="client-rua">Rua (opcional)</Label>
                        <Input
                          id="client-rua"
                          value={newClientData.rua}
                          onChange={(e) => setNewClientData({...newClientData, rua: e.target.value})}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="client-bairro">Bairro (opcional)</Label>
                        <Input
                          id="client-bairro"
                          value={newClientData.bairro}
                          onChange={(e) => setNewClientData({...newClientData, bairro: e.target.value})}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="client-numero">Número da casa (opcional)</Label>
                        <Input
                          id="client-numero"
                          value={newClientData.numero}
                          onChange={(e) => setNewClientData({...newClientData, numero: e.target.value})}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="client-cpf">CPF (opcional)</Label>
                        <Input
                          id="client-cpf"
                          value={newClientData.cpf}
                          onChange={(e) => setNewClientData({...newClientData, cpf: e.target.value})}
                        />
                      </div>
                      
                      <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={() => setIsNewClientDialogOpen(false)}>
                          Cancelar
                        </Button>
                        <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={submitting}>
                          {submitting ? 'Salvando...' : 'Salvar Cliente'}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Search */}
              <Card>
                <CardContent className="pt-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input 
                      placeholder="Buscar clientes por nome ou telefone..." 
                      className="pl-10" 
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Clients List */}
              {clients.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-12">
                      <Users className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Nenhum cliente cadastrado
                      </h3>
                      <p className="text-gray-600 mb-4">
                        A loja ainda não possui clientes cadastrados.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {clients.map(client => {
                    const clientSales = sales.filter(sale => sale.client_id === client.id);
                    const totalSpent = clientSales.reduce((sum, sale) => sum + Number(sale.total_value), 0);
                    
                    // Sort sales by date (most recent first)
                    const sortedClientSales = [...clientSales].sort((a, b) => 
                      parseLocalDate(b.sale_date).getTime() - parseLocalDate(a.sale_date).getTime()
                    );
                    
                    return (
                      <Card key={client.id} className="hover:shadow-lg transition-shadow">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">{client.name}</CardTitle>
                          </div>
                        </CardHeader>
                        
                        <CardContent>
                           <Tabs defaultValue="info" className="w-full">
                             <TabsList className="grid w-full grid-cols-3">
                               <TabsTrigger value="info">Informações</TabsTrigger>
                               <TabsTrigger value="history">
                                 Vendas
                                 {clientSales.length > 0 && (
                                   <Badge variant="secondary" className="ml-2">
                                     {clientSales.length}
                                   </Badge>
                                 )}
                               </TabsTrigger>
                               <TabsTrigger value="installments">
                                 Parcelas
                                 {getClientInstallments(client.id).length > 0 && (
                                   <Badge variant="secondary" className="ml-2">
                                     {getClientInstallments(client.id).length}
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
                                              <div className="font-medium">{sale.products?.name || 'Produto não encontrado'}</div>
                                              <div className="text-gray-500">
                                                {new Date(sale.sale_date + 'T12:00:00').toLocaleDateString('pt-BR')} - {sale.payment_method || 'À vista'}
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

                               <div className="flex gap-2 mt-4">
                                 <Button
                                   variant="outline"
                                   onClick={() => handleShowHistory(client)}
                                   className="flex items-center space-x-2"
                                 >
                                   <FileText className="h-4 w-4" />
                                   <span>Histórico</span>
                                 </Button>
                                 
                                 <Button
                                   variant="outline"
                                   onClick={() => exportClientToPDF(client)}
                                   className="flex items-center space-x-2"
                                 >
                                   <FileText className="h-4 w-4" />
                                   <span>Relatório</span>
                                 </Button>
                               </div>
                             </TabsContent>
                             
                             <TabsContent value="history" className="mt-4">
                              {clientSales.length === 0 ? (
                                <div className="text-center py-8">
                                  <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                                  <p className="text-gray-500">Este cliente ainda não realizou compras.</p>
                                </div>
                              ) : (
                                <div className="space-y-4">
                                  {sortedClientSales.map(sale => {
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
                                                {sale.products?.name || 'Produto não encontrado'}
                                              </h4>
                                               <div className="flex items-center space-x-4 text-sm text-gray-600">
                                                 <span>Qtd: {sale.quantity}</span>
                                                 <span className="font-medium text-green-600">
                                                   R$ {Number(sale.total_value).toLocaleString('pt-BR', {
                                                     minimumFractionDigits: 2
                                                   })}
                                                 </span>
                                                 <span>{sale.payment_method || 'À vista'}</span>
                                                 <span>{new Date(sale.sale_date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
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
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                             </TabsContent>

                              <TabsContent value="installments" className="space-y-4 mt-4">
                                {(() => {
                                  const clientInstallments = getClientInstallments(client.id);
                                  
                                  if (clientInstallments.length === 0) {
                                    return (
                                      <div className="text-center py-8">
                                        <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                                        <p className="text-gray-500">Este cliente não possui parcelas em aberto.</p>
                                      </div>
                                    );
                                  }

                                  // Group installments by sale
                                  const installmentsBySale = clientInstallments.reduce((acc, installment) => {
                                    if (!acc[installment.venda_id]) {
                                      acc[installment.venda_id] = [];
                                    }
                                    acc[installment.venda_id].push(installment);
                                    return acc;
                                  }, {} as Record<string, typeof clientInstallments>);

                                  return (
                                    <div className="space-y-4">
                                      {Object.entries(installmentsBySale).map(([saleId, saleInstallments]) => {
                                        const sale = sales.find(s => s.id === saleId);
                                        const product = products.find(p => p.id === sale?.product_id);
                                        
                                        return (
                                          <div key={saleId} className="border rounded-lg p-4 space-y-3">
                                            {/* Sale Header */}
                                            <div className="flex items-center space-x-3">
                                              <div className="flex-shrink-0">
                                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                                  <ShoppingBag className="h-5 w-5 text-blue-600" />
                                                </div>
                                              </div>
                                              <div>
                                                <h4 className="font-medium text-gray-900">
                                                  {product?.name || 'Produto não encontrado'}
                                                </h4>
                                                <div className="flex items-center space-x-4 text-sm text-gray-600">
                                                  <span>Qtd: {sale?.quantity || 1}</span>
                                                  <span className="font-medium text-green-600">
                                                    R$ {Number(sale?.total_value || 0).toFixed(2)}
                                                  </span>
                                                  <span>2x</span>
                                                  <span>{sale?.sale_date ? new Date(sale.sale_date + 'T12:00:00').toLocaleDateString('pt-BR') : ''}</span>
                                                </div>
                                              </div>
                                            </div>

                                            {/* Installments List */}
                                            <div className="ml-13">
                                              <h5 className="text-sm font-medium text-gray-700 mb-2">Parcelas:</h5>
                                              <div className="space-y-2">
                                                {(saleInstallments as typeof clientInstallments).map(installment => {
                                                  const isOverdue = new Date(installment.data_de_vencimento) < new Date() && installment.status === 'pendente';
                                                  
                                                  return (
                                                    <div key={installment.id} className="flex items-center justify-between py-2">
                                                      <div className="flex items-center space-x-3">
                                                        <div className={`w-4 h-4 rounded-full ${
                                                          installment.status === 'pago' 
                                                            ? 'bg-green-500' 
                                                            : isOverdue 
                                                              ? 'bg-red-500' 
                                                              : 'bg-yellow-500'
                                                        }`} />
                                                        <span className="text-sm text-gray-900">
                                                          {installment.numero_da_parcela}/{(saleInstallments as typeof clientInstallments).length} R$ {Number(installment.valor_da_parcela).toFixed(2)} • {new Date(installment.data_de_vencimento).toLocaleDateString('pt-BR')}
                                                        </span>
                                                      </div>
                                                       <div className="flex items-center space-x-2">
                                                         {installment.status === 'pago' ? (
                                                           <>
                                                             <Badge className="bg-green-100 text-green-800">
                                                               Pago
                                                             </Badge>
                                                             <Button
                                                               size="sm"
                                                               variant="outline"
                                                               onClick={() => handleInstallmentStatusChange(installment.id, installment.status, 'pendente')}
                                                               className="text-orange-600 hover:text-orange-700"
                                                             >
                                                               Marcar Pendente
                                                             </Button>
                                                           </>
                                                         ) : (
                                                           <>
                                                             <Badge className={isOverdue ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}>
                                                               {isOverdue ? 'Vencida' : 'Pendente'}
                                                             </Badge>
                                                             <Button
                                                               size="sm"
                                                               variant="outline"
                                                               onClick={() => handleInstallmentStatusChange(installment.id, installment.status, 'pago')}
                                                               className="text-blue-600 hover:text-blue-700"
                                                             >
                                                               Marcar Pago
                                                             </Button>
                                                           </>
                                                         )}
                                                       </div>
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            </div>
                                          </div>
                                        );
                                       })}
                                    </div>
                                  );
                                })()}
                             </TabsContent>
                           </Tabs>
                         </CardContent>
                       </Card>
                     );
                   })}
                 </div>
               )}
             </div>
           </TabsContent>

          {/* Produtos */}
          <TabsContent value="produtos">
            <Tabs defaultValue="lista" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="lista">Lista de Produtos</TabsTrigger>
                <TabsTrigger value="estoque">Controle de Estoque</TabsTrigger>
              </TabsList>

              <TabsContent value="lista">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Produtos da Loja ({products.length})</CardTitle>
                  <Button 
                    onClick={() => {
                      setEditingProduct(null);
                      setIsNewProductDialogOpen(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Produto
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {products.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Nenhum produto cadastrado
                    </h3>
                    <p className="text-gray-600">
                      A loja ainda não possui produtos cadastrados.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {products.map((product) => {
                      const productSales = sales.filter(sale => sale.product_id === product.id);
                      const totalSold = productSales.reduce((sum, sale) => sum + sale.quantity, 0);
                      const totalRevenue = productSales.reduce((sum, sale) => sum + Number(sale.total_value), 0);
                      const totalCommission = productSales.reduce((sum, sale) => sum + Number(sale.commission), 0);
                      const commissionPercentage = Number(product.unit_price) > 0 ? (Number(product.commission) / Number(product.unit_price)) * 100 : 0;
                      
                      return (
                        <Card 
                          key={product.id} 
                          className={`hover:shadow-lg transition-shadow ${
                            ((product as any).estoque ?? 0) <= 5 && ((product as any).estoque ?? 0) > 0 
                              ? 'border-orange-300' 
                              : ((product as any).estoque ?? 0) === 0 
                                ? 'border-red-300' 
                                : ''
                          }`}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <CardTitle className="text-lg">{product.name}</CardTitle>
                                {((product as any).estoque ?? 0) <= 5 && ((product as any).estoque ?? 0) > 0 && (
                                  <div className="flex items-center text-orange-600">
                                    <AlertTriangle className="h-4 w-4" />
                                  </div>
                                )}
                                {((product as any).estoque ?? 0) === 0 && (
                                  <div className="flex items-center text-red-600">
                                    <AlertTriangle className="h-4 w-4" />
                                  </div>
                                )}
                              </div>
                              <div className="flex space-x-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditProduct(product)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteProduct(product.id)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <DollarSign className="h-4 w-4 text-green-600" />
                                <span className="font-medium">
                                  R$ {Number(product.unit_price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                              <Badge variant="outline">
                                Unitário
                              </Badge>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <Percent className="h-4 w-4 text-blue-600" />
                                <span className="font-medium">
                                  R$ {Number(product.commission).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                              <Badge variant="secondary">
                                {commissionPercentage.toFixed(1)}%
                              </Badge>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <Archive className="h-4 w-4 text-orange-600" />
                                <span className="font-medium">
                                  {Number((product as any).estoque ?? 0)} unidades
                                </span>
                              </div>
                              <Badge variant={Number((product as any).estoque ?? 0) > 0 ? "default" : "destructive"}>
                                {Number((product as any).estoque ?? 0) > 0 ? "Em estoque" : "Sem estoque"}
                              </Badge>
                            </div>
                            
                            <div className="pt-2 border-t">
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="text-center">
                                  <div className="font-semibold text-gray-900">{totalSold}</div>
                                  <div className="text-gray-600">Vendidos</div>
                                </div>
                                <div className="text-center">
                                  <div className="font-semibold text-gray-900">{productSales.length}</div>
                                  <div className="text-gray-600">Vendas</div>
                                </div>
                              </div>
                            </div>
                            
                            {totalRevenue > 0 && (
                              <div className="pt-2 border-t">
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600">Faturamento:</span>
                                  <span className="font-medium">
                                    R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600">Comissão total:</span>
                                  <span className="font-medium text-green-600">
                                    R$ {totalCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                              </div>
                            )}
                            
                            <div className="text-xs text-gray-500">
                              Criado em {new Date((product as any).created_at || '').toLocaleDateString('pt-BR')}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

              <TabsContent value="estoque">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Archive className="h-5 w-5" />
                      <span>Controle de Estoque</span>
                    </CardTitle>
                    <div className="flex items-center space-x-2 mt-4">
                      <Search className="h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Pesquisar produtos no estoque..."
                        value={stockSearchTerm}
                        onChange={(e) => setStockSearchTerm(e.target.value)}
                        className="max-w-sm"
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produto</TableHead>
                          <TableHead>Preço Unitário</TableHead>
                          <TableHead>Estoque Atual</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Valor em Estoque</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {products.filter(product => 
                          product.name.toLowerCase().includes(stockSearchTerm.toLowerCase())
                        ).map((product) => {
                          const stock = Number((product as any).estoque || 0);
                          const stockValue = stock * Number(product.unit_price);
                         
                          return (
                            <TableRow key={product.id}>
                              <TableCell className="font-medium">{product.name}</TableCell>
                              <TableCell>
                                R$ {Number(product.unit_price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <span>{stock} unidades</span>
                                  {stock <= 5 && stock > 0 && (
                                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                                  )}
                                  {stock === 0 && (
                                    <AlertTriangle className="h-4 w-4 text-red-500" />
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={stock > 5 ? "default" : stock > 0 ? "secondary" : "destructive"}>
                                  {stock > 5 ? "Normal" : stock > 0 ? "Baixo" : "Esgotado"}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-medium">
                                R$ {stockValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end space-x-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditProduct(product)}
                                    className="text-blue-600 hover:text-blue-700"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteProduct(product.id)}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                    
                    {products.length === 0 && (
                      <div className="text-center py-8">
                        <Archive className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-500">Nenhum produto cadastrado para controle de estoque.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Meu Perfil */}
          <TabsContent value="perfil">
            <Card>
              <CardHeader>
                <CardTitle>Meu Perfil</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Nome</Label>
                      <p className="mt-1 text-sm text-gray-900">{user?.name}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Email</Label>
                      <p className="mt-1 text-sm text-gray-900">{user?.email}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Tipo de Usuário</Label>
                      <p className="mt-1 text-sm text-gray-900 capitalize">{user?.tipo_usuario}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Loja</Label>
                      <p className="mt-1 text-sm text-gray-900">{loja?.nome_loja || 'Não definida'}</p>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t">
                    {/* Switch para ativar/desativar funcionário */}
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={user?.ativo}
                        onCheckedChange={() => setShowStatusDialog(true)}
                        disabled={isUpdatingStatus}
                      />
                      <Badge variant={user?.ativo ? 'default' : 'secondary'}>
                        {user?.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Alert Dialog para confirmação de desativação */}
      <AlertDialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Desativação</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem certeza que quer desativar essa conta? Para reativá-la é necessário entrar em contato com o suporte.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                handleStatusToggle(false);
                setShowStatusDialog(false);
              }}
            >
              Desativar Conta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modais */}
      <ClientSearchModal
        open={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        clients={clients}
        onSelectClient={handleSelectClient}
      />

      <ProductSearchModal
        open={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        products={products}
        onSelectProduct={handleSelectProduct}
      />

      {/* Client History Modal */}
      {historyModalOpen && selectedClientForHistory && (
        <ClientHistoryModal
          open={historyModalOpen}
          onClose={() => setHistoryModalOpen(false)}
          client={selectedClientForHistory}
        />
      )}

      {/* Dialog para produto */}
      <Dialog open={isNewProductDialogOpen} onOpenChange={setIsNewProductDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Editar Produto' : 'Novo Produto'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={editingProduct ? handleUpdateProduct : handleNewProduct} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="product-name">Nome do produto</Label>
              <Input
                id="product-name"
                value={newProductData.name}
                onChange={(e) => setNewProductData({...newProductData, name: e.target.value})}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="product-price">Preço unitário (R$)</Label>
              <Input
                id="product-price"
                type="number"
                step="0.01"
                min="0"
                value={newProductData.unit_price}
                onChange={(e) => setNewProductData({...newProductData, unit_price: e.target.value})}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="product-commission">Comissão por unidade (R$)</Label>
              <Input
                id="product-commission"
                type="number"
                step="0.01"
                min="0"
                value={newProductData.commission}
                onChange={(e) => setNewProductData({...newProductData, commission: e.target.value})}
                placeholder="0.00"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="product-estoque">Quantidade em estoque</Label>
              <Input
                id="product-estoque"
                type="number"
                min="0"
                value={newProductData.estoque}
                onChange={(e) => setNewProductData({...newProductData, estoque: e.target.value})}
                placeholder="0"
                required
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={resetProductForm}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={submitting}>
                {editingProduct ? 'Salvar' : 'Criar Produto'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog para editar venda */}
      <Dialog open={isEditSaleDialogOpen} onOpenChange={setIsEditSaleDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Venda</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateSale} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cliente</Label>
                <div className="flex space-x-2">
                  <Input
                    value={editSaleData.selectedClient?.name || 'Nenhum cliente selecionado'}
                    readOnly
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsClientModalOpen(true)}
                  >
                    Selecionar
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Produto *</Label>
                <div className="flex space-x-2">
                  <Input
                    value={editSaleData.selectedProduct?.name || 'Nenhum produto selecionado'}
                    readOnly
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsProductModalOpen(true)}
                  >
                    Selecionar
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-quantity">Quantidade *</Label>
                <Input
                  id="edit-quantity"
                  type="number"
                  min="1"
                  value={editSaleData.quantity}
                  onChange={(e) => setEditSaleData({...editSaleData, quantity: parseInt(e.target.value) || 1})}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-payment">Método de Pagamento *</Label>
                <Select 
                  value={editSaleData.paymentMethod} 
                  onValueChange={(value) => setEditSaleData({...editSaleData, paymentMethod: value})}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o método" />
                  </SelectTrigger>
                  <SelectContent>
                    {basePaymentMethods.map((method) => (
                      <SelectItem key={method} value={method}>
                        {method}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {editSaleData.paymentMethod === 'Parcelas' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="edit-installments">Número de Parcelas *</Label>
                    <Select 
                      value={editSaleData.selectedInstallments} 
                      onValueChange={(value) => setEditSaleData({...editSaleData, selectedInstallments: value})}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione as parcelas" />
                      </SelectTrigger>
                      <SelectContent>
                        {installmentOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-interest">Juros do Parcelamento (%)</Label>
                    <Input
                      id="edit-interest"
                      type="number"
                      step="0.01"
                      min="0"
                      value={editSaleData.jurosParcelamento}
                      onChange={(e) => setEditSaleData({...editSaleData, jurosParcelamento: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label>Data da Venda</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !editSaleData.saleDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editSaleData.saleDate ? format(editSaleData.saleDate, "dd/MM/yyyy") : <span>Selecione uma data</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={editSaleData.saleDate}
                      onSelect={(date) => setEditSaleData({...editSaleData, saleDate: date || new Date()})}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-observations">Observações</Label>
              <Textarea
                id="edit-observations"
                value={editSaleData.observacoes}
                onChange={(e) => setEditSaleData({...editSaleData, observacoes: e.target.value})}
                placeholder="Observações sobre a venda (opcional)"
                rows={3}
              />
            </div>

            {editSaleData.selectedProduct && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium mb-2">Resumo da Venda</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Preço unitário:</span>
                    <p className="font-medium">R$ {editSaleData.selectedProduct.unit_price.toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Quantidade:</span>
                    <p className="font-medium">{editSaleData.quantity}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Subtotal:</span>
                    <p className="font-medium">
                      R$ {(editSaleData.selectedProduct.unit_price * editSaleData.quantity).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Total final:</span>
                    <p className="font-medium text-green-600">
                      R$ {(() => {
                        let total = editSaleData.selectedProduct.unit_price * editSaleData.quantity;
                        if (editSaleData.paymentMethod === 'Parcelas' && editSaleData.jurosParcelamento > 0) {
                          total += (editSaleData.jurosParcelamento / 100) * total;
                        }
                        return total.toFixed(2);
                      })()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsEditSaleDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="bg-blue-600 hover:bg-blue-700" 
                disabled={submitting || !editSaleData.selectedProduct}
              >
                {submitting ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FuncionarioDashboard;
