
import React, { useState, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCrediario } from '@/contexts/CrediarioContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import ClientSearchModal from '@/components/ClientSearchModal';
import ProductSearchModal from '@/components/ProductSearchModal';
import {
  PlusCircle,
  Calculator,
  DollarSign,
  Percent,
  Calendar,
  Package,
  Users,
  CreditCard,
  UserPlus,
  Search,
  AlertTriangle,
} from 'lucide-react';
import { parseLocalDate, toLocalISODate } from '@/lib/utils';

const NewSale = () => {
  const { products, clients, sales, installments, addSale } = useData();
  const { user } = useAuth();
  const { criarVendaCrediario } = useCrediario();
  const navigate = useNavigate();
  const [isEmployeeActive, setIsEmployeeActive] = useState(true);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
  const [saleType, setSaleType] = useState<'normal' | 'crediario'>('normal');

  // Verificar se o funcionário está ativo
  useEffect(() => {
    const checkEmployeeStatus = async () => {
      if (user && user.tipo_usuario === 'funcionario') {
        console.log('🔍 Verificando status do funcionário:', user.id);
        try {
          const { data, error } = await supabase
            .from('funcionarios')
            .select('ativo')
            .eq('user_id', user.id)
            .maybeSingle();

          console.log('📊 Resultado da consulta funcionarios:', { data, error });

          if (error) {
            console.error('❌ Erro ao verificar status do funcionário:', error);
            // Se houve erro, bloquear por segurança
            setIsEmployeeActive(false);
            return;
          }

          if (!data) {
            console.log('⚠️ Funcionário não encontrado na tabela funcionarios - bloqueando acesso');
            setIsEmployeeActive(false);
            return;
          }

          const isActive = data.ativo === true;
          console.log('✅ Status do funcionário ativo:', isActive);
          setIsEmployeeActive(isActive);
        } catch (error) {
          console.error('❌ Erro geral ao verificar status do funcionário:', error);
          // Em caso de erro, bloquear por segurança
          setIsEmployeeActive(false);
        }
      } else {
        console.log('👤 Usuário não é funcionário - permitindo acesso');
        setIsEmployeeActive(true);
      }
    };

    checkEmployeeStatus();
  }, [user]);
  
  const [formData, setFormData] = useState({
    quantity: '1',
    date: toLocalISODate(),
    paymentMethod: '',
    juros_parcelamento: '0',
    desconto: '0',
    observacoes: '',
  });

  // Crediário specific fields
  const [crediarioData, setCrediarioData] = useState({
    valor_entrada: '0',
    numero_parcelas: '2',
    dia_vencimento: '10',
    juros: '0',
    desconto: '0',
  });

  const [selectedInstallments, setSelectedInstallments] = useState('');

  const totalQuantity = selectedProducts.reduce((sum, product) => sum + (product.selectedQuantity || 0), 0);
  const baseValue = selectedProducts.reduce((sum, product) => 
    sum + (Number(product.unit_price) * (product.selectedQuantity || 0)), 0);
  const juros = saleType === 'crediario' 
    ? parseFloat(crediarioData.juros) || 0 
    : parseFloat(formData.juros_parcelamento) || 0;
  const desconto = saleType === 'crediario' 
    ? parseFloat(crediarioData.desconto) || 0 
    : parseFloat(formData.desconto) || 0;
  
  // Calcular valor com juros
  const finalPaymentMethod = formData.paymentMethod === 'Parcelas' ? selectedInstallments : formData.paymentMethod;
  const installmentMatch = finalPaymentMethod.match(/(\d+)x/);
  const numberOfInstallments = installmentMatch ? parseInt(installmentMatch[1]) : 1;
  const shouldApplyInterest = saleType === 'crediario' || 
    (juros > 0 && ['Dinheiro', 'Cartão de Débito', 'Cartão de Crédito', 'PIX'].includes(formData.paymentMethod)) ||
    numberOfInstallments > 1;
  
  // Aplicar desconto primeiro, depois juros
  const valueWithDiscount = baseValue - (baseValue * (desconto / 100));
  const totalValue = shouldApplyInterest 
    ? valueWithDiscount * (1 + (juros / 100))
    : valueWithDiscount;
  
  const commission = selectedProducts.reduce((sum, product) => 
    sum + (Number(product.commission) * (product.selectedQuantity || 0)), 0);

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

  // Função para verificar se o cliente tem parcelas vencidas
  const getClientOverdueInstallments = (clientId: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const clientSales = sales.filter(sale => sale.client_id === clientId);
    const clientSalesIds = clientSales.map(sale => sale.id);
    
    return installments.filter(installment => 
      clientSalesIds.includes(installment.venda_id) &&
      installment.status === 'pendente' &&
      new Date(installment.data_de_vencimento) < today
    );
  };

  const handleSelectClient = (client: any) => {
    console.log('Cliente selecionado:', client);
    setSelectedClient(client);
    setIsClientModalOpen(false);
  };

  const handleSelectProduct = (product: any) => {
    console.log('Produto selecionado:', product);
    if (!selectedProducts.find(p => p.id === product.id)) {
      setSelectedProducts(prev => [...prev, { ...product, selectedQuantity: 1 }]);
    }
    setIsProductModalOpen(false);
  };

  const handleRemoveProduct = (productId: string) => {
    setSelectedProducts(prev => prev.filter(p => p.id !== productId));
  };

  const handleQuantityChange = (productId: string, quantity: number) => {
    setSelectedProducts(prev => 
      prev.map(p => p.id === productId ? { ...p, selectedQuantity: quantity } : p)
    );
  };

  const handleCloseClientModal = () => {
    console.log('Fechando modal de cliente');
    setIsClientModalOpen(false);
  };

  const handleCloseProductModal = () => {
    console.log('Fechando modal de produto');
    setIsProductModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('=== INICIANDO REGISTRO DE VENDA ===');
    console.log('🔒 Status do funcionário ativo:', isEmployeeActive);
    console.log('👤 Tipo de usuário:', user?.tipo_usuario);
    console.log('🔄 Tipo de venda:', saleType);
    
    // BLOQUEAR VENDA SE FUNCIONÁRIO ESTIVER INATIVO
    if (user?.tipo_usuario === 'funcionario' && !isEmployeeActive) {
      console.log('❌ VENDA BLOQUEADA - Funcionário inativo');
      toast.error('Sua conta está desativada. Não é possível registrar vendas.');
      return;
    }
    
    console.log('Form data:', formData);
    console.log('Selected products:', selectedProducts);
    console.log('Selected client:', selectedClient);
    
    if (selectedProducts.length === 0) {
      console.log('ERRO: Nenhum produto selecionado');
      toast.error('Selecione pelo menos um produto');
      return;
    }

    // Verificar se todas as quantidades são válidas
    for (const product of selectedProducts) {
      if ((product.selectedQuantity || 0) <= 0) {
        console.log('ERRO: Quantidade inválida para produto:', product.name);
        toast.error(`A quantidade do produto ${product.name} deve ser maior que zero`);
        return;
      }

      // Verificar se há estoque suficiente
      const availableStock = product.estoque || 0;
      if ((product.selectedQuantity || 0) > availableStock) {
        console.log('ERRO: Estoque insuficiente:', { product: product.name, quantity: product.selectedQuantity, availableStock });
        toast.error(`Estoque insuficiente para ${product.name}! Disponível: ${availableStock} unidades`);
        return;
      }
    }

    // Validações específicas para cada tipo de venda
    if (saleType === 'crediario') {
      if (!selectedClient) {
        toast.error('Cliente é obrigatório para vendas no crediário');
        return;
      }
      
      const valorEntrada = parseFloat(crediarioData.valor_entrada) || 0;
      if (valorEntrada > totalValue) {
        toast.error('Valor da entrada não pode ser maior que o valor total');
        return;
      }
      
      const numeroParcelas = parseInt(crediarioData.numero_parcelas) || 0;
      if (numeroParcelas < 1) {
        toast.error('Número de parcelas deve ser maior que zero');
        return;
      }
      
      const diaVencimento = parseInt(crediarioData.dia_vencimento) || 0;
      if (diaVencimento < 1 || diaVencimento > 31) {
        toast.error('Dia de vencimento deve estar entre 1 e 31');
        return;
      }
    } else {
      if (!formData.paymentMethod || (formData.paymentMethod === 'Parcelas' && !selectedInstallments)) {
        console.log('ERRO: Forma de pagamento não selecionada');
        toast.error('Selecione a forma de pagamento');
        return;
      }
    }

    // Verificar se cliente tem parcelas vencidas
    if (selectedClient) {
      const overdueInstallments = getClientOverdueInstallments(selectedClient.id);
      if (overdueInstallments.length > 0) {
        const confirmed = confirm(
          `ATENÇÃO: O cliente ${selectedClient.name} possui ${overdueInstallments.length} parcela(s) vencida(s).\n\nTem certeza que deseja realizar esta venda?`
        );
        
        if (!confirmed) {
          console.log('Venda cancelada pelo usuário devido a parcelas vencidas');
          return;
        }
      }
    }

    try {
      console.log('=== VALIDAÇÕES PASSOU, TENTANDO REGISTRAR ===');
      
      if (saleType === 'crediario') {
        // Registrar venda no crediário
        const crediarioVendaData = {
          client_id: selectedClient!.id,
          produto_id: selectedProducts.length > 0 ? selectedProducts[0].id : null,
          valor_total: totalValue,
          desconto: baseValue * (parseFloat(crediarioData.desconto) || 0) / 100,
          valor_entrada: parseFloat(crediarioData.valor_entrada) || 0,
          numero_parcelas: parseInt(crediarioData.numero_parcelas) || 2,
          dia_vencimento: (parseInt(crediarioData.dia_vencimento) || 10) + 1,
          data_venda: formData.date,
          observacoes: formData.observacoes,
        };
        
        console.log('=== DADOS DA VENDA CREDIÁRIO A SEREM ENVIADOS ===', crediarioVendaData);
        
        await criarVendaCrediario(crediarioVendaData);
        
        // Diminuir estoque do produto
        if (selectedProducts.length > 0) {
          const product = selectedProducts[0];
          const newStock = product.estoque - (product.selectedQuantity || 1);
          
          const { error: updateError } = await supabase
            .from('products')
            .update({ estoque: newStock })
            .eq('id', product.id);
            
          if (updateError) {
            console.error('Erro ao atualizar estoque:', updateError);
            throw new Error('Erro ao atualizar estoque do produto');
          }
        }
        
        console.log('=== VENDA CREDIÁRIO REGISTRADA COM SUCESSO ===');
        toast.success('Venda no crediário registrada com sucesso!');
      } else {
        // Gerar número da venda
        const { data: numeroVenda } = await supabase.rpc('generate_next_sale_number', { p_user_id: user.id });
        if (!numeroVenda) {
          toast.error('Erro ao gerar número da venda');
          return;
        }
        
        // Registrar venda única com múltiplos produtos
        const clientId = selectedClient ? selectedClient.id : null;
        const saleGroupId = crypto.randomUUID();
        
        // Criar uma venda principal
        const mainSaleData = {
          product_id: selectedProducts[0].id, // Usar primeiro produto como referência
          client_id: clientId,
          quantity: totalQuantity,
          unit_price: baseValue / totalQuantity, // Preço médio
          total_value: totalValue,
          commission: commission,
          sale_date: formData.date,
          payment_method: finalPaymentMethod,
          juros_parcelamento: juros,
          due_date: null,
          observacoes: formData.observacoes,
          desconto: baseValue * (desconto / 100),
          is_multi_product: selectedProducts.length > 1,
          sale_group_id: saleGroupId,
          numero_venda: numeroVenda,
        };
        
        console.log('=== DADOS DA VENDA PRINCIPAL A SEREM ENVIADOS ===', mainSaleData);
        
        const { data: saleData, error: saleError } = await supabase
          .from('sales')
          .insert([{
            ...mainSaleData,
            user_id: user?.id,
            loja_id: user?.loja_id || user?.id,
          }])
          .select()
          .single();

        if (saleError) {
          console.error('❌ Erro ao inserir venda:', saleError);
          throw saleError;
        }
        
        // Se é multi-produto, salvar os itens individuais
        if (selectedProducts.length > 1) {
          for (const product of selectedProducts) {
            const productBaseValue = Number(product.unit_price) * (product.selectedQuantity || 1);
            const productValueWithDiscount = productBaseValue - (productBaseValue * (desconto / 100));
            const productFinalValue = shouldApplyInterest 
              ? productValueWithDiscount * (1 + (juros / 100))
              : productValueWithDiscount;
            
            const { error: itemError } = await supabase
              .from('sale_items')
              .insert({
                sale_id: saleData.id,
                product_id: product.id,
                quantity: product.selectedQuantity || 1,
                unit_price: Number(product.unit_price),
                total_price: productFinalValue,
                user_id: user?.id,
                numero_venda: numeroVenda,
              });
              
            if (itemError) {
              console.error('Erro ao salvar item da venda:', itemError);
              throw new Error('Erro ao salvar item da venda');
            }
          }
        }

        // Criar parcelas se necessário
        if (mainSaleData.payment_method && mainSaleData.payment_method.includes('x')) {
          const installmentMatch = mainSaleData.payment_method.match(/(\d+)x/);
          if (installmentMatch) {
            const numberOfInstallments = parseInt(installmentMatch[1]);
            const installmentValue = mainSaleData.total_value / numberOfInstallments;
            const baseDate = parseLocalDate(mainSaleData.sale_date);
            
            for (let i = 1; i <= numberOfInstallments; i++) {
              const dueDate = new Date(baseDate);
              dueDate.setMonth(dueDate.getMonth() + i);
              
              const { error: installmentError } = await supabase
                .from('parcelas_venda')
                .insert({
                  venda_id: saleData.id,
                  numero_da_parcela: i,
                  valor_da_parcela: installmentValue,
                  data_de_vencimento: toLocalISODate(dueDate),
                  user_id: user?.id,
                  loja_id: user?.loja_id || user?.id,
                  numero_venda: numeroVenda,
                });
                
              if (installmentError) {
                console.error('Erro ao criar parcela:', installmentError);
                throw installmentError;
              }
            }
          }
        }

        // Atualizar estoque de todos os produtos
        for (const product of selectedProducts) {
          const newStock = product.estoque - (product.selectedQuantity || 1);
          
          const { error: updateError } = await supabase
            .from('products')
            .update({ estoque: newStock })
            .eq('id', product.id);
            
          if (updateError) {
            console.error('Erro ao atualizar estoque:', updateError);
            throw new Error('Erro ao atualizar estoque do produto');
          }
        }
        
        console.log('=== VENDA REGISTRADA COM SUCESSO ===');
        toast.success('Venda registrada com sucesso!');
      }
      
      navigate('/dashboard');
      
    } catch (error) {
      console.error('=== ERRO AO REGISTRAR VENDA ===');
      console.error('Erro completo:', error);
      console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
      toast.error(`Erro ao registrar venda: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCrediarioInputChange = (field: string, value: string) => {
    setCrediarioData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  // Verificar se tem produtos cadastrados
  if (products.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Nova Venda</h1>
          <p className="text-gray-600">Registre uma nova venda</p>
        </div>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Package className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhum produto cadastrado
              </h3>
              <p className="text-gray-600 mb-4">
                Você precisa cadastrar produtos antes de registrar vendas
              </p>
              <Button 
                onClick={() => navigate('/products')}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Cadastrar Produtos
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Se funcionário estiver desativado, mostrar mensagem
  if (user && user.tipo_usuario === 'funcionario' && !isEmployeeActive) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Nova Venda</h1>
          <p className="text-gray-600">Registre uma nova venda</p>
        </div>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-red-500" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Acesso Bloqueado
              </h3>
              <p className="text-gray-600 mb-4">
                Sua conta está desativada. Entre em contato com o administrador para reativar seu acesso.
              </p>
              <Button 
                onClick={() => navigate('/funcionario-dashboard')}
                variant="outline"
              >
                Voltar ao Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Determinar se pode registrar a venda
  const canRegisterSale = selectedProducts.length > 0 && 
    selectedProducts.every(product => (product.selectedQuantity || 0) > 0) && 
    (saleType === 'crediario' ? selectedClient : 
     (formData.paymentMethod && (formData.paymentMethod !== 'Parcelas' || selectedInstallments)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Nova Venda</h1>
        <p className="text-gray-600">Registre uma nova venda e calcule a comissão automaticamente</p>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <PlusCircle className="h-5 w-5 text-blue-600" />
                <span>Dados da Venda</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="product">Produtos *</Label>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-start h-10"
                      onClick={() => setIsProductModalOpen(true)}
                    >
                      <Search className="h-4 w-4 mr-2" />
                      Adicionar produto
                    </Button>
                    
                    {selectedProducts.length > 0 && (
                      <div className="space-y-2">
                        {selectedProducts.map((product, index) => (
                          <div key={product.id} className="p-3 bg-blue-50 rounded-md border">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-blue-900">{product.name}</p>
                                <p className="text-xs text-blue-700">
                                  R$ {Number(product.unit_price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                                <p className="text-xs text-blue-700">
                                  Estoque: {product.estoque || 0} unidades
                                </p>
                              </div>
                              <div className="flex items-center space-x-2">
                                <div className="flex items-center space-x-1">
                                  <Label htmlFor={`quantity-${product.id}`} className="text-xs">Qtd:</Label>
                                  <Input
                                    id={`quantity-${product.id}`}
                                    type="number"
                                    min="1"
                                    max={product.estoque || 0}
                                    value={product.selectedQuantity || 1}
                                    onChange={(e) => handleQuantityChange(product.id, parseInt(e.target.value) || 1)}
                                    className="w-16 h-8 text-xs"
                                  />
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveProduct(product.id)}
                                  className="text-red-600 hover:text-red-700 h-8 w-8 p-0"
                                >
                                  ×
                                </Button>
                              </div>
                            </div>
                            {(product.estoque || 0) <= 5 && (product.estoque || 0) > 0 && (
                              <div className="flex items-center text-orange-600 mt-1">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                <span className="text-xs">Estoque baixo!</span>
                              </div>
                            )}
                            {(product.estoque || 0) === 0 && (
                              <div className="flex items-center text-red-600 mt-1">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                <span className="text-xs">Sem estoque!</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="client">
                      Cliente {saleType === 'crediario' && <span className="text-red-500">*</span>}
                    </Label>
                    <div className="space-y-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-start h-10"
                        onClick={() => setIsClientModalOpen(true)}
                      >
                        <Search className="h-4 w-4 mr-2" />
                        {selectedClient ? selectedClient.name : 
                         saleType === 'crediario' ? "Buscar cliente (obrigatório)" : "Buscar cliente (opcional)"}
                      </Button>
                      {selectedClient && (
                        <div className="p-2 bg-blue-50 rounded-md">
                          <p className="text-sm font-medium text-blue-900">{selectedClient.name}</p>
                          <p className="text-xs text-blue-700">{selectedClient.phone}</p>
                          {/* Aviso de parcelas vencidas */}
                          {(() => {
                            const overdueInstallments = getClientOverdueInstallments(selectedClient.id);
                            if (overdueInstallments.length > 0) {
                              return (
                                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                                  <div className="flex items-center space-x-2">
                                    <AlertTriangle className="h-4 w-4 text-red-600" />
                                    <p className="text-xs text-red-700 font-medium">
                                      Cliente possui {overdueInstallments.length} parcela(s) vencida(s)
                                    </p>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      )}
                      {selectedClient && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedClient(null)}
                          className="text-red-600 hover:text-red-700"
                        >
                          Remover cliente
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date">Data da Venda</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="date"
                        type="date"
                        value={formData.date}
                        onChange={(e) => handleInputChange('date', e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                </div>

                {saleType === 'normal' && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="paymentMethod">Forma de Pagamento *</Label>
                        <Select
                          value={formData.paymentMethod}
                          onValueChange={(value) => {
                            handleInputChange('paymentMethod', value);
                            if (value !== 'Parcelas') {
                              setSelectedInstallments('');
                            }
                            if (value === 'Crediário') {
                              setSaleType('crediario');
                            }
                          }}
                        >
                          <SelectTrigger className="h-10">
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
                      </div>
                        
                      {(['Dinheiro', 'Cartão de Débito', 'Cartão de Crédito', 'PIX'].includes(formData.paymentMethod)) && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="juros_normal">Juros (%)</Label>
                            <div className="relative">
                              <Percent className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                              <Input
                                id="juros_normal"
                                type="number"
                                min="0"
                                step="0.1"
                                value={formData.juros_parcelamento}
                                onChange={(e) => handleInputChange('juros_parcelamento', e.target.value)}
                                className="pl-10"
                                placeholder="0.0"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="desconto_normal">Desconto (%)</Label>
                            <div className="relative">
                              <Percent className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                              <Input
                                id="desconto_normal"
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                value={formData.desconto}
                                onChange={(e) => handleInputChange('desconto', e.target.value)}
                                className="pl-10"
                                placeholder="0.0"
                              />
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                        
                     {formData.paymentMethod === 'Parcelas' && (
                       <div className="space-y-4">
                         <div className="grid grid-cols-3 gap-4">
                           <div className="space-y-2">
                             <Label htmlFor="valor_entrada_parcelas">Entrada</Label>
                             <div className="relative">
                               <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                               <Input
                                 id="valor_entrada_parcelas"
                                 type="number"
                                 min="0"
                                 step="0.01"
                                 value={crediarioData.valor_entrada}
                                 onChange={(e) => handleCrediarioInputChange('valor_entrada', e.target.value)}
                                 className="pl-10"
                                 placeholder="0.00"
                               />
                             </div>
                           </div>

                           <div className="space-y-2">
                             <Label htmlFor="numero_parcelas_parcelas">Parcelas</Label>
                             <Input
                               id="numero_parcelas_parcelas"
                               type="number"
                               min="1"
                               value={crediarioData.numero_parcelas}
                               onChange={(e) => handleCrediarioInputChange('numero_parcelas', e.target.value)}
                               required
                             />
                           </div>

                           <div className="space-y-2">
                             <Label htmlFor="dia_vencimento_parcelas">Dia Vencimento</Label>
                             <Input
                               id="dia_vencimento_parcelas"
                               type="number"
                               min="1"
                               max="31"
                               value={crediarioData.dia_vencimento}
                               onChange={(e) => handleCrediarioInputChange('dia_vencimento', e.target.value)}
                               required
                             />
                           </div>
                         </div>

                         <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-2">
                             <Label htmlFor="juros_parcelas">Juros (%)</Label>
                             <div className="relative">
                               <Percent className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                               <Input
                                 id="juros_parcelas"
                                 type="number"
                                 min="0"
                                 step="0.1"
                                 value={formData.juros_parcelamento}
                                 onChange={(e) => handleInputChange('juros_parcelamento', e.target.value)}
                                 className="pl-10"
                                 placeholder="0.0"
                               />
                             </div>
                           </div>

                           <div className="space-y-2">
                             <Label htmlFor="desconto_parcelas">Desconto (%)</Label>
                             <div className="relative">
                               <Percent className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                               <Input
                                 id="desconto_parcelas"
                                 type="number"
                                 min="0"
                                 max="100"
                                 step="0.1"
                                 value={formData.desconto}
                                 onChange={(e) => handleInputChange('desconto', e.target.value)}
                                 className="pl-10"
                                 placeholder="0.0"
                               />
                             </div>
                           </div>
                         </div>
                       </div>
                     )}
                   </>
                 )}

                {saleType === 'crediario' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="payment-method-crediario">Forma de Pagamento</Label>
                      <Select
                        value={formData.paymentMethod}
                        onValueChange={(value) => {
                          handleInputChange('paymentMethod', value);
                          if (['Dinheiro', 'Cartão de Débito', 'Cartão de Crédito', 'PIX', 'Parcelas'].includes(value)) {
                            setSaleType('normal');
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a forma de pagamento" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                          <SelectItem value="Cartão de Débito">Cartão de Débito</SelectItem>
                          <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
                          <SelectItem value="PIX">PIX</SelectItem>
                          <SelectItem value="Parcelas">Parcelas</SelectItem>
                          <SelectItem value="Crediário">Crediário</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="valor_entrada">Entrada</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="valor_entrada"
                            type="number"
                            min="0"
                            step="0.01"
                            value={crediarioData.valor_entrada}
                            onChange={(e) => handleCrediarioInputChange('valor_entrada', e.target.value)}
                            className="pl-10"
                            placeholder="0.00"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="numero_parcelas">Parcelas</Label>
                        <Input
                          id="numero_parcelas"
                          type="number"
                          min="1"
                          value={crediarioData.numero_parcelas}
                          onChange={(e) => handleCrediarioInputChange('numero_parcelas', e.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="dia_vencimento">Dia Vencimento</Label>
                        <Input
                          id="dia_vencimento"
                          type="number"
                          min="1"
                          max="31"
                          value={crediarioData.dia_vencimento}
                          onChange={(e) => handleCrediarioInputChange('dia_vencimento', e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="crediario_juros">Juros (%)</Label>
                        <div className="relative">
                          <Percent className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="crediario_juros"
                            type="number"
                            min="0"
                            step="0.01"
                            value={crediarioData.juros}
                            onChange={(e) => handleCrediarioInputChange('juros', e.target.value)}
                            className="pl-10"
                            placeholder="0"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="crediario_desconto">Desconto (%)</Label>
                        <div className="relative">
                          <Percent className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="crediario_desconto"
                            type="number"
                            min="0"
                            step="0.01"
                            value={crediarioData.desconto}
                            onChange={(e) => handleCrediarioInputChange('desconto', e.target.value)}
                            className="pl-10"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="observacoes">Observações</Label>
                  <textarea
                    id="observacoes"
                    value={formData.observacoes}
                    onChange={(e) => handleInputChange('observacoes', e.target.value)}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Informações adicionais sobre a venda..."
                  />
                </div>

                <div className="flex justify-end space-x-4">
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => navigate('/dashboard')}
                  >
                    Cancelar
                  </Button>
                  {user?.ativo !== false && (
                    <Button 
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700"
                      disabled={!canRegisterSale}
                    >
                      Registrar Venda
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Summary */}
        <div className="space-y-6">
          {/* Selected Products Info */}
          {selectedProducts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Produtos Selecionados</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedProducts.map((product) => (
                  <div key={product.id} className="border-b last:border-b-0 pb-2 last:pb-0">
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-600">
                      R$ {Number(product.unit_price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} x {product.selectedQuantity || 1}
                    </p>
                    <p className="text-sm text-gray-600">
                      Comissão: R$ {(Number(product.commission) * (product.selectedQuantity || 1)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Selected Client Info */}
          {selectedClient && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Cliente Selecionado</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="font-medium text-gray-900">{selectedClient.name}</p>
                  <p className="text-sm text-gray-600">{selectedClient.phone}</p>
                  {selectedClient.email && (
                    <p className="text-sm text-gray-600">{selectedClient.email}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment Info */}
          {formData.paymentMethod && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informações de Pagamento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="font-medium text-gray-900">{formData.paymentMethod}</p>
                  {shouldApplyInterest && juros > 0 && (
                    <p className="text-sm text-orange-600">
                      Juros aplicado: {juros}%
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Calculation Summary */}
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calculator className="h-5 w-5 text-blue-600" />
                <span>Resumo da Venda</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Quantidade Total:</span>
                  <span className="font-medium">{totalQuantity}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Produtos:</span>
                  <span className="font-medium">{selectedProducts.length}</span>
                </div>

                {desconto > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Desconto ({desconto}%):</span>
                    <span className="font-medium text-green-600">
                      - R$ {(baseValue * (desconto / 100)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                <div className="border-t pt-3">
                  <div className="flex justify-between items-center">
                    <span className="flex items-center space-x-1 text-gray-900 font-medium">
                      <DollarSign className="h-4 w-4" />
                      <span>Valor Total:</span>
                    </span>
                    <span className="text-xl font-bold text-gray-900">
                      R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {saleType === 'crediario' && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Entrada:</span>
                      <span className="font-medium">
                        R$ {(parseFloat(crediarioData.valor_entrada) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Restante:</span>
                      <span className="font-medium">
                        R$ {(totalValue - (parseFloat(crediarioData.valor_entrada) || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Parcelas:</span>
                      <span className="font-medium">
                        {crediarioData.numero_parcelas}x de R$ {((totalValue - (parseFloat(crediarioData.valor_entrada) || 0)) / (parseInt(crediarioData.numero_parcelas) || 1)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </>
                )}

                {formData.paymentMethod === 'Parcelas' && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Entrada:</span>
                      <span className="font-medium">
                        R$ {(parseFloat(crediarioData.valor_entrada) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Restante:</span>
                      <span className="font-medium">
                        R$ {(totalValue - (parseFloat(crediarioData.valor_entrada) || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Parcelas:</span>
                      <span className="font-medium">
                        {crediarioData.numero_parcelas}x de R$ {((totalValue - (parseFloat(crediarioData.valor_entrada) || 0)) / (parseInt(crediarioData.numero_parcelas) || 1)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </>
                )}

                {saleType === 'normal' && shouldApplyInterest && formData.paymentMethod !== 'Parcelas' && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Valor da parcela:</span>
                    <span className="font-medium">
                      R$ {(totalValue / numberOfInstallments).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="flex items-center space-x-1 text-green-800 font-medium">
                      <Percent className="h-4 w-4" />
                      <span>Sua Comissão:</span>
                    </span>
                    <span className="text-xl font-bold text-green-700">
                      R$ {commission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <ClientSearchModal
        open={isClientModalOpen}
        onClose={handleCloseClientModal}
        clients={clients}
        onSelectClient={handleSelectClient}
      />

      <ProductSearchModal
        open={isProductModalOpen}
        onClose={handleCloseProductModal}
        products={products}
        onSelectProduct={handleSelectProduct}
      />
    </div>
  );
};

export default NewSale;
