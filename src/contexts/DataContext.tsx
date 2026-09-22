import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { useSubscription } from './SubscriptionContext';
import { Database } from '@/integrations/supabase/types';
import { parseLocalDate } from '@/lib/utils';

type Client = Database['public']['Tables']['clients']['Row'];
type Product = Database['public']['Tables']['products']['Row'];
type Sale = Database['public']['Tables']['sales']['Row'];
type MonthlyGoal = Database['public']['Tables']['monthly_goals']['Row'];
type Installment = Database['public']['Tables']['parcelas_venda']['Row'];
type CrediarioVenda = Database['public']['Tables']['crediario_vendas']['Row'];
type ParcelaCrediario = Database['public']['Tables']['parcelas_crediario']['Row'];

type ClientInsert = Database['public']['Tables']['clients']['Insert'];
type ProductInsert = Database['public']['Tables']['products']['Insert'];
type SaleInsert = Database['public']['Tables']['sales']['Insert'];
type InstallmentInsert = Database['public']['Tables']['parcelas_venda']['Insert'];
type CrediarioVendaInsert = Database['public']['Tables']['crediario_vendas']['Insert'];
type ParcelaCrediarioInsert = Database['public']['Tables']['parcelas_crediario']['Insert'];

interface DataContextType {
  clients: Client[];
  products: Product[];
  sales: Sale[];
  installments: Installment[];
  crediarioVendas: CrediarioVenda[];
  parcelasCrediario: ParcelaCrediario[];
  monthlyGoal: number;
  loading: boolean;
  addClient: (client: Omit<ClientInsert, 'id' | 'created_at' | 'updated_at' | 'total_purchases' | 'user_id'>) => Promise<Client>;
  updateClient: (id: string, client: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  addProduct: (product: Omit<ProductInsert, 'user_id'>) => Promise<void>;
  updateProduct: (id: string, product: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addSale: (sale: Omit<SaleInsert, 'user_id'>) => Promise<void>;
  updateSale: (id: string, sale: Partial<Sale>) => Promise<void>;
  deleteSale: (id: string) => Promise<void>;
  updateInstallmentStatus: (id: string, status: string) => Promise<void>;
  getClientInstallments: (clientId: string) => Installment[];
  getClientCrediarioInstallments: (clientId: string) => ParcelaCrediario[];
  getClientCrediarioSales: (clientId: string) => CrediarioVenda[];
  setMonthlyGoal: (goal: number) => Promise<void>;
  getMonthlyGoal: (month?: number, year?: number) => Promise<number>;
  getMonthlyStats: (parcelasCrediario?: any[]) => {
    totalSales: number;
    totalCommission: number;
    salesCount: number;
    goalProgress: number;
  };
  refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

export const DataProvider = ({ children }: { children: React.ReactNode }) => {
  const { session, isAuthenticated, user } = useAuth();
  const { subscribed, subscriptionTier } = useSubscription();
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [crediarioVendas, setCrediarioVendas] = useState<CrediarioVenda[]>([]);
  const [parcelasCrediario, setParcelasCrediario] = useState<ParcelaCrediario[]>([]);
  const [monthlyGoal, setMonthlyGoalState] = useState(10000);
  const [loading, setLoading] = useState(false);

  // Carregar dados quando usuário autenticar
  useEffect(() => {
    if (isAuthenticated && session?.user) {
      loadAllData();
    } else {
      // Limpar dados quando usuário desautenticar
      setClients([]);
      setProducts([]);
      setSales([]);
      setInstallments([]);
      setCrediarioVendas([]);
      setParcelasCrediario([]);
      setMonthlyGoalState(10000);
    }
  }, [isAuthenticated, session]);

  const loadAllData = async () => {
    if (!session?.user) return;
    
    setLoading(true);
    try {
      await Promise.all([
        loadClients(),
        loadProducts(),
        loadSales(),
        loadInstallments(),
        loadCrediarioVendas(),
        loadParcelasCrediario(),
        loadMonthlyGoal(),
      ]);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadClients = async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao carregar clientes:', error);
    } else {
      setClients(data || []);
    }
  };

  const loadProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao carregar produtos:', error);
    } else {
      setProducts(data || []);
    }
  };

  const loadSales = async () => {
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao carregar vendas:', error);
    } else {
      setSales(data || []);
    }
  };

  const loadInstallments = async () => {
    const { data, error } = await supabase
      .from('parcelas_venda')
      .select('*')
      .order('data_de_vencimento', { ascending: true });

    if (error) {
      console.error('Erro ao carregar parcelas:', error);
    } else {
      setInstallments(data || []);
    }
  };

  const loadCrediarioVendas = async () => {
    const { data, error } = await supabase
      .from('crediario_vendas')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao carregar vendas de crediário:', error);
    } else {
      setCrediarioVendas(data || []);
    }
  };

  const loadParcelasCrediario = async () => {
    const { data, error } = await supabase
      .from('parcelas_crediario')
      .select('*')
      .order('data_vencimento', { ascending: true });

    if (error) {
      console.error('Erro ao carregar parcelas de crediário:', error);
    } else {
      setParcelasCrediario(data || []);
    }
  };

  const loadMonthlyGoal = async () => {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const { data, error } = await supabase
      .from('monthly_goals')
      .select('*')
      .eq('month', currentMonth)
      .eq('year', currentYear)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Erro ao carregar meta mensal:', error);
    } else if (data) {
      setMonthlyGoalState(Number(data.goal_amount));
    }
  };

  const createInstallments = async (saleId: string, totalValue: number, paymentMethod: string, saleDate: string, jurosParcelamento: number = 0) => {
    if (!session?.user || paymentMethod === 'À vista') return;

    // Extract number of installments from payment method (e.g., "2x" -> 2)
    const installmentMatch = paymentMethod.match(/(\d+)x/);
    if (!installmentMatch) return;

    const numberOfInstallments = parseInt(installmentMatch[1]);
    
    // Calculate total value with interest if there are installments
    const totalValueWithInterest = numberOfInstallments > 1 
      ? totalValue * (1 + (jurosParcelamento / 100))
      : totalValue;
      
    const installmentValue = totalValueWithInterest / numberOfInstallments;

    // Check if payment method is instant (should be marked as paid immediately)
    const instantPaymentMethods = ['Dinheiro', 'Cartão de débito', 'Cartão de crédito', 'PIX'];
    const isInstantPayment = instantPaymentMethods.includes(paymentMethod);

    const installments: Omit<InstallmentInsert, 'user_id'>[] = [];
    
    // Parse the sale date
    const [year, month, day] = saleDate.split('-').map(Number);

    for (let i = 1; i <= numberOfInstallments; i++) {
      // Create date for each installment using proper month addition
      const installmentDate = new Date(year, month - 1, day); // month is 0-indexed
      
      // Add months instead of days for proper calendar-based calculation
      installmentDate.setMonth(installmentDate.getMonth() + (i - 1));
      
      // Handle edge cases where the day doesn't exist in the target month
      // For example, if sale date is Jan 31 and we add 1 month, Feb 31 doesn't exist
      // JavaScript will automatically adjust to the last day of the month
      if (installmentDate.getDate() !== day) {
        // If the day changed, it means the target month doesn't have enough days
        // Set to the last day of the previous month
        installmentDate.setDate(0); // This sets to the last day of the previous month
        installmentDate.setMonth(installmentDate.getMonth() + 1, 0); // Last day of target month
      }

      // Add +1 day to compensate for UTC timezone issue
      installmentDate.setDate(installmentDate.getDate() + 1);

      // Format the date as YYYY-MM-DD
      const dueDateString = `${installmentDate.getFullYear()}-${String(installmentDate.getMonth() + 1).padStart(2, '0')}-${String(installmentDate.getDate()).padStart(2, '0')}`;

      installments.push({
        venda_id: saleId,
        numero_da_parcela: i,
        valor_da_parcela: installmentValue,
        data_de_vencimento: dueDateString,
        status: isInstantPayment ? 'pago' : 'pendente',
        data_pagamento: isInstantPayment ? saleDate : null,
        valor_pago: isInstantPayment ? installmentValue : 0,
      });
    }

    // Insert all installments
    const installmentsWithUserId = installments.map(installment => ({
      ...installment,
      user_id: session.user.id,
    }));

    const { error } = await supabase
      .from('parcelas_venda')
      .insert(installmentsWithUserId);

    if (error) {
      console.error('Erro ao criar parcelas:', error);
      throw error;
    }

    // Reload installments
    await loadInstallments();
  };

  const updateSale = async (id: string, saleData: Partial<Sale>) => {
    if (!session?.user) throw new Error('Usuário não autenticado');

    const { error } = await supabase
      .from('sales')
      .update(saleData)
      .eq('id', id);

    if (error) throw error;

    setSales(prev => prev.map(sale => 
      sale.id === id ? { ...sale, ...saleData } : sale
    ));

    // If payment method or total value changed, we might need to recreate installments
    // For now, we'll just reload the data to keep it simple
    await loadSales();
    await loadInstallments();
  };

  const deleteSale = async (id: string) => {
    if (!session?.user) throw new Error('Usuário não autenticado');

    // Check if it's a crediario sale
    const crediarioSale = crediarioVendas.find(venda => venda.id === id);
    
    if (crediarioSale) {
      // Restore stock if product exists
      if (crediarioSale.produto_id) {
        const product = products.find(p => p.id === crediarioSale.produto_id);
        if (product) {
          const { error: stockError } = await supabase
            .from('products')
            .update({ estoque: product.estoque + 1 })
            .eq('id', crediarioSale.produto_id);

          if (stockError) throw stockError;

          setProducts(prev => prev.map(p => 
            p.id === crediarioSale.produto_id ? { ...p, estoque: p.estoque + 1 } : p
          ));
        }
      }

      // Delete crediario installments first
      const { error: crediarioInstallmentsError } = await supabase
        .from('parcelas_crediario')
        .delete()
        .eq('crediario_venda_id', id);

      if (crediarioInstallmentsError) throw crediarioInstallmentsError;

      // Then delete the crediario sale
      const { error: crediarioSaleError } = await supabase
        .from('crediario_vendas')
        .delete()
        .eq('id', id);

      if (crediarioSaleError) throw crediarioSaleError;

      setCrediarioVendas(prev => prev.filter(venda => venda.id !== id));
      setParcelasCrediario(prev => prev.filter(parcela => parcela.crediario_venda_id !== id));
    } else {
      // Handle regular sale
      const sale = sales.find(s => s.id === id);
      
      // Restore stock if product exists
      if (sale && sale.product_id) {
        const product = products.find(p => p.id === sale.product_id);
        if (product) {
          const { error: stockError } = await supabase
            .from('products')
            .update({ estoque: product.estoque + sale.quantity })
            .eq('id', sale.product_id);

          if (stockError) throw stockError;

          setProducts(prev => prev.map(p => 
            p.id === sale.product_id ? { ...p, estoque: p.estoque + sale.quantity } : p
          ));
        }
      }

      // First delete related installments
      const { error: installmentsError } = await supabase
        .from('parcelas_venda')
        .delete()
        .eq('venda_id', id);

      if (installmentsError) throw installmentsError;

      // Then delete the sale
      const { error: saleError } = await supabase
        .from('sales')
        .delete()
        .eq('id', id);

      if (saleError) throw saleError;

      setSales(prev => prev.filter(sale => sale.id !== id));
      setInstallments(prev => prev.filter(installment => installment.venda_id !== id));
    }
  };

  const updateInstallmentStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from('parcelas_venda')
      .update({ status })
      .eq('id', id);

    if (error) throw error;

    setInstallments(prev => prev.map(installment => 
      installment.id === id ? { ...installment, status } : installment
    ));
  };

  const getClientInstallments = (clientId: string) => {
    const clientSales = sales.filter(sale => sale.client_id === clientId);
    const clientSalesIds = clientSales.map(sale => sale.id);
    
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
    const clientCrediarioSales = crediarioVendas.filter(venda => venda.client_id === clientId);
    const clientCrediarioSalesIds = clientCrediarioSales.map(venda => venda.id);
    
    return parcelasCrediario
      .filter(parcela => clientCrediarioSalesIds.includes(parcela.crediario_venda_id))
      .sort((a, b) => {
        // Sort by due date
        return new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime();
      });
  };

  const getClientCrediarioSales = (clientId: string) => {
    return crediarioVendas.filter(venda => venda.client_id === clientId);
  };

  const addClient = async (clientData: Omit<ClientInsert, 'id' | 'created_at' | 'updated_at' | 'total_purchases' | 'user_id'>) => {
    if (!user) throw new Error('Usuário não autenticado');

    // VERIFICAÇÃO PREMIUM SIMPLIFICADA
    const isPremium = subscribed === true && subscriptionTier === 'Premium';
    
    console.log('🚀 VERIFICAÇÃO PREMIUM CLIENTE:', { 
      subscribed, 
      subscriptionTier, 
      isPremium,
      totalClientes: clients.length,
      userEmail: user.email
    });

    // PREMIUM = SEM LIMITE
    if (isPremium) {
      console.log('✅ USUARIO PREMIUM - ADICIONANDO CLIENTE SEM VERIFICAÇÃO DE LIMITE');
    } else if (clients.length >= 10) {
      console.log('❌ BLOQUEANDO - não é premium e atingiu limite de 10 clientes');
      throw new Error('Limite de clientes atingido. Faça upgrade para o plano Premium.');
    } else {
      console.log('✅ PLANO GRATUITO - PERMITINDO ADICIONAR CLIENTE (ainda dentro do limite)');
    }

    const { data, error } = await supabase
      .from('clients')
      .insert({
        ...clientData,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    setClients(prev => [...prev, data]);
    return data;
  };

  const updateClient = async (id: string, clientData: Partial<Client>) => {
    const { error } = await supabase
      .from('clients')
      .update(clientData)
      .eq('id', id);

    if (error) throw error;

    setClients(prev => prev.map(client => 
      client.id === id ? { ...client, ...clientData } : client
    ));
  };

  const deleteClient = async (id: string) => {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);

    if (error) throw error;

    setClients(prev => prev.filter(client => client.id !== id));
  };

  const addProduct = async (productData: Omit<ProductInsert, 'user_id'>) => {
    if (!session?.user) throw new Error('Usuário não autenticado');

    // VERIFICAÇÃO PREMIUM SIMPLIFICADA
    const isPremium = subscribed === true && subscriptionTier === 'Premium';
    
    console.log('🚀 VERIFICAÇÃO PREMIUM PRODUTO:', { 
      subscribed, 
      subscriptionTier, 
      isPremium,
      totalProdutos: products.length,
      userEmail: session.user.email
    });

    // PREMIUM = SEM LIMITE
    if (isPremium) {
      console.log('✅ USUARIO PREMIUM - ADICIONANDO PRODUTO SEM VERIFICAÇÃO DE LIMITE');
    } else if (products.length >= 5) {
      console.log('❌ BLOQUEANDO - não é premium e atingiu limite de 5 produtos');
      throw new Error('Limite de produtos atingido. Faça upgrade para o plano Premium.');
    } else {
      console.log('✅ PLANO GRATUITO - PERMITINDO ADICIONAR PRODUTO (ainda dentro do limite)');
    }

    const { data, error } = await supabase
      .from('products')
      .insert([{
        ...productData,
        user_id: session.user.id,
      }])
      .select()
      .single();

    if (error) throw error;

    setProducts(prev => [data, ...prev]);
  };

  const updateProduct = async (id: string, productData: Partial<Product>) => {
    const { error } = await supabase
      .from('products')
      .update(productData)
      .eq('id', id);

    if (error) throw error;

    setProducts(prev => prev.map(product => 
      product.id === id ? { ...product, ...productData } : product
    ));
  };

  const deleteProduct = async (id: string) => {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;

    setProducts(prev => prev.filter(product => product.id !== id));
  };

  const addSale = async (saleData: Omit<SaleInsert, 'user_id'>) => {
    if (!session?.user) throw new Error('Usuário não autenticado');

    console.log('Dados da venda a serem inseridos:', saleData);

    // Insert sale with original dates
    const { data, error } = await supabase
      .from('sales')
      .insert([{
        ...saleData,
        user_id: session.user.id,
      }])
      .select()
      .single();

    if (error) {
      console.error('Erro ao inserir venda:', error);
      throw error;
    }

    console.log('Venda inserida com sucesso:', data);
    setSales(prev => [data, ...prev]);

    // Create installments if payment is not "À vista"
    if (saleData.payment_method && saleData.payment_method !== 'À vista') {
      try {
        await createInstallments(
          data.id,
          saleData.total_value,
          saleData.payment_method,
          saleData.sale_date,
          saleData.juros_parcelamento || 0
        );
      } catch (installmentError) {
        console.error('Erro ao criar parcelas:', installmentError);
        // Don't throw here to avoid blocking the sale, but log the error
      }
    }

    // Update product stock
    if (saleData.product_id && saleData.quantity) {
      // First get current stock
      const { data: currentProduct } = await supabase
        .from('products')
        .select('estoque')
        .eq('id', saleData.product_id)
        .single();

      if (currentProduct) {
        const newStock = (currentProduct.estoque || 0) - saleData.quantity;
        const { error: stockError } = await supabase
          .from('products')
          .update({ estoque: Math.max(0, newStock) })
          .eq('id', saleData.product_id);

        if (stockError) {
          console.error('Erro ao atualizar estoque:', stockError);
        } else {
          await loadProducts(); // Reload products to show updated stock
        }
      }
    }

    // Update client total purchases if client exists
    if (saleData.client_id) {
      // Acumula no total do cliente (antes o total era sobrescrito pelo valor desta venda)
      const { data: currentClient } = await supabase
        .from('clients')
        .select('total_purchases')
        .eq('id', saleData.client_id)
        .maybeSingle();

      const { error: updateError } = await supabase
        .from('clients')
        .update({
          total_purchases: Number(currentClient?.total_purchases || 0) + Number(saleData.total_value)
        })
        .eq('id', saleData.client_id);

      if (updateError) {
        console.error('Erro ao atualizar total do cliente:', updateError);
      } else {
        await loadClients(); // Reload clients
      }
    }
  };

  const setMonthlyGoal = async (goal: number) => {
    if (!session?.user) throw new Error('Usuário não autenticado');

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    // Primeiro, verificar se já existe uma meta para este mês
    const { data: existingGoal } = await supabase
      .from('monthly_goals')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('month', currentMonth)
      .eq('year', currentYear)
      .single();

    let error;
    
    if (existingGoal) {
      // Se existe, fazer UPDATE
      const { error: updateError } = await supabase
        .from('monthly_goals')
        .update({ goal_amount: goal })
        .eq('user_id', session.user.id)
        .eq('month', currentMonth)
        .eq('year', currentYear);
      error = updateError;
    } else {
      // Se não existe, fazer INSERT
      const { error: insertError } = await supabase
        .from('monthly_goals')
        .insert({
          user_id: session.user.id,
          goal_amount: goal,
          month: currentMonth,
          year: currentYear,
        });
      error = insertError;
    }

    if (error) throw error;

    setMonthlyGoalState(goal);
  };

  const getMonthlyGoal = async (month?: number, year?: number): Promise<number> => {
    if (!session?.user) return 10000;

    const currentMonth = month || (new Date().getMonth() + 1);
    const currentYear = year || new Date().getFullYear();

    try {
      const { data, error } = await supabase
        .from('monthly_goals')
        .select('goal_amount')
        .eq('user_id', session.user.id)
        .eq('month', currentMonth)
        .eq('year', currentYear)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao buscar meta mensal:', error);
        return 10000;
      }

      return data?.goal_amount || 10000;
    } catch (error) {
      console.error('Erro ao buscar meta mensal:', error);
      return 10000;
    }
  };

  const getMonthlyStats = (parcelasCrediarioParam: any[] = []) => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    // Usar as parcelas do crediário do contexto ou o parâmetro passado
    const parcelasCrediarioToUse = parcelasCrediarioParam.length > 0 ? parcelasCrediarioParam : parcelasCrediario;
    
    // Métodos de pagamento à vista
    const paymentMethodsAvista = ['Dinheiro', 'Cartão de Débito', 'Cartão de Crédito', 'PIX'];
    
    // 1. Vendas à vista (dinheiro, cartão débito, cartão crédito, PIX)
    const vendasAvista = sales.filter(sale => {
      const saleDate = parseLocalDate(sale.sale_date);
      return saleDate.getMonth() === currentMonth && 
             saleDate.getFullYear() === currentYear &&
             paymentMethodsAvista.includes(sale.payment_method || '');
    });
    
    // 2. Parcelas pagas (de vendas parceladas)
    const parcelasPagas = installments.filter(installment => {
      const dueDate = new Date(installment.data_de_vencimento);
      return dueDate.getMonth() === currentMonth && 
             dueDate.getFullYear() === currentYear &&
             installment.status === 'pago';
    });

    // 3. Parcelas do crediário pagas no mês atual
    const parcelasCrediarioPagas = parcelasCrediarioToUse.filter(parcela => {
      // Se data_pagamento existir, usar ela; senão usar data_vencimento
      const dateToCheck = parcela.data_pagamento ? 
        parseLocalDate(parcela.data_pagamento) : 
        new Date(parcela.data_vencimento);
      
      return dateToCheck.getMonth() === currentMonth && 
             dateToCheck.getFullYear() === currentYear &&
             parcela.status === 'pago';
    });

    // Calcular totais
    const totalVendasAvista = vendasAvista.reduce((sum, sale) => sum + Number(sale.total_value), 0);
    const totalParcelasPagas = parcelasPagas.reduce((sum, parcela) => sum + Number(parcela.valor_da_parcela), 0);
    const totalCrediarioPago = parcelasCrediarioPagas.reduce((sum, parcela) => sum + Number(parcela.valor_parcela), 0);
    
    // Comissão das vendas à vista (apenas se existe comissão)
    const comissaoVendasAvista = vendasAvista.reduce((sum, sale) => {
      if (sale.commission && Number(sale.commission) > 0) {
        return sum + Number(sale.commission);
      }
      return sum;
    }, 0);
    
    // Comissão das parcelas pagas (proporcional)
    const comissaoParcelasPagas = parcelasPagas.reduce((sum, parcela) => {
      const sale = sales.find(s => s.id === parcela.venda_id);
      if (sale && sale.commission && Number(sale.commission) > 0) {
        // Calcular comissão proporcional da parcela apenas se existe comissão
        const proporção = Number(parcela.valor_da_parcela) / Number(sale.total_value);
        return sum + (Number(sale.commission) * proporção);
      }
      return sum;
    }, 0);

    // Para o crediário, não assumir comissão padrão - comissão deve ser configurada
    const comissaoCrediario = 0; // Removido comissão automática de 5%

    const totalSales = totalVendasAvista + totalParcelasPagas + totalCrediarioPago;
    const totalCommission = comissaoVendasAvista + comissaoParcelasPagas + comissaoCrediario;
    const salesCount = vendasAvista.length + parcelasPagas.length + parcelasCrediarioPagas.length;
    const goalProgress = monthlyGoal > 0 ? (totalSales / monthlyGoal) * 100 : 0;

    return { totalSales, totalCommission, salesCount, goalProgress };
  };

  // Função para atualizar dados manualmente
  const refreshData = async () => {
    await loadAllData();
  };

  return (
    <DataContext.Provider value={{
      clients,
      products,
      sales,
      installments,
      crediarioVendas,
      parcelasCrediario,
      monthlyGoal,
      loading,
      addClient,
      updateClient,
      deleteClient,
      addProduct,
      updateProduct,
      deleteProduct,
      addSale,
      updateSale,
      deleteSale,
      updateInstallmentStatus,
      getClientInstallments,
      getClientCrediarioInstallments,
      getClientCrediarioSales,
      setMonthlyGoal,
      getMonthlyGoal,
      getMonthlyStats,
      refreshData,
    }}>
      {children}
    </DataContext.Provider>
  );
};
