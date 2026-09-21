import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { toast } from '@/hooks/use-toast';

// Types
export interface CrediarioVenda {
  id: string;
  user_id: string;
  client_id: string | null;
  produto_id: string | null;
  valor_total: number;
  desconto: number;
  valor_entrada: number;
  valor_restante: number;
  numero_parcelas: number;
  dia_vencimento: number;
  data_venda: string;
  status: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

export interface ParcelaCrediario {
  id: string;
  user_id: string;
  crediario_venda_id: string;
  numero_parcela: number;
  valor_parcela: number;
  data_vencimento: string;
  data_pagamento?: string;
  status: 'pendente' | 'pago' | 'vencido';
  tipo: 'entrada' | 'parcela';
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

export interface NovaVendaCrediario {
  client_id: string;
  produto_id?: string | null;
  produtos?: Array<{id: string, nome: string, quantidade: number, preco: number, comissao?: number}>;
  valor_total: number;
  desconto: number;
  valor_entrada: number;
  numero_parcelas: number;
  dia_vencimento: number;
  data_venda: string;
  observacoes?: string;
}

interface CrediarioContextType {
  vendas: CrediarioVenda[];
  parcelas: ParcelaCrediario[];
  loading: boolean;
  loadVendas: () => Promise<void>;
  loadParcelas: () => Promise<void>;
  criarVendaCrediario: (venda: NovaVendaCrediario) => Promise<void>;
  atualizarStatusParcela: (parcelaId: string, status: 'pago' | 'pendente', dataPagamento?: string) => Promise<void>;
  editarVendaCrediario: (vendaId: string, data: any) => Promise<void>;
  deletarVendaCrediario: (vendaId: string) => Promise<void>;
}

const CrediarioContext = createContext<CrediarioContextType | undefined>(undefined);

export const useCrediario = () => {
  const context = useContext(CrediarioContext);
  if (!context) {
    throw new Error('useCrediario must be used within a CrediarioProvider');
  }
  return context;
};

export const CrediarioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [vendas, setVendas] = useState<CrediarioVenda[]>([]);
  const [parcelas, setParcelas] = useState<ParcelaCrediario[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  // Carregar dados quando usuário autenticar
  useEffect(() => {
    if (user) {
      loadVendas();
      loadParcelas();
    } else {
      // Limpar dados quando usuário desautenticar
      setVendas([]);
      setParcelas([]);
    }
  }, [user]);

  const loadVendas = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('crediario_vendas')
        .select('*')
        .eq('user_id', user.id)
        .order('data_venda', { ascending: false });

      if (error) throw error;
      setVendas(data || []);
    } catch (error) {
      console.error('Error loading vendas crediário:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar vendas do crediário",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadParcelas = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('parcelas_crediario')
        .select('*')
        .eq('user_id', user.id)
        .order('data_vencimento', { ascending: true });

      if (error) throw error;
      setParcelas((data || []) as ParcelaCrediario[]);
    } catch (error) {
      console.error('Error loading parcelas crediário:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar parcelas do crediário",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calcularParcelas = (valorRestante: number, numeroParcelas: number, dataVenda: string, diaVencimento: number) => {
    const valorParcela = valorRestante / numeroParcelas;
    const parcelas = [];
    const dataVendaObj = new Date(dataVenda);
    
    // Calcular primeira data de vencimento baseada no dia escolhido
    const anoVenda = dataVendaObj.getFullYear();
    const mesVenda = dataVendaObj.getMonth();
    const diaVenda = dataVendaObj.getDate();
    
    // A primeira parcela sempre vence no próximo mês
    // Esta é a regra padrão para crediário: primeira parcela no mês seguinte
    let primeiraDataVencimento = new Date(anoVenda, mesVenda + 1, diaVencimento);

    for (let i = 0; i < numeroParcelas; i++) {
      const dataVencimento = new Date(
        primeiraDataVencimento.getFullYear(), 
        primeiraDataVencimento.getMonth() + i, 
        diaVencimento
      );
      
      parcelas.push({
        numero_parcela: i + 1,
        valor_parcela: valorParcela,
        data_vencimento: dataVencimento.toISOString().split('T')[0],
        status: 'pendente' as const,
        tipo: 'parcela' as const
      });
    }

    return parcelas;
  };

  const criarVendaCrediario = async (vendaData: NovaVendaCrediario) => {
    if (!user) return;

    setLoading(true);
    try {
      console.log('Dados da venda sendo enviados:', vendaData);
      const valorFinal = vendaData.valor_total;
      const valorRestante = valorFinal - vendaData.valor_entrada;

      // Criar venda
      const insertData = {
        user_id: user.id,
        client_id: vendaData.client_id,
        produto_id: vendaData.produto_id,
        produtos: vendaData.produtos || [], // Array de múltiplos produtos
        valor_total: vendaData.valor_total,
        desconto: vendaData.desconto,
        valor_entrada: vendaData.valor_entrada,
        valor_restante: valorRestante,
        numero_parcelas: vendaData.numero_parcelas,
        dia_vencimento: vendaData.dia_vencimento,
        data_venda: vendaData.data_venda,
        observacoes: vendaData.observacoes
      };
      
      console.log('Dados sendo inseridos no banco:', insertData);
      
      const { data: venda, error: vendaError } = await supabase
        .from('crediario_vendas')
        .insert(insertData)
        .select()
        .single();

      if (vendaError) throw vendaError;

      // Reduzir estoque dos produtos vendidos
      if (vendaData.produtos && vendaData.produtos.length > 0) {
        for (const produto of vendaData.produtos) {
          try {
            const { data: currentProduct, error: productError } = await supabase
              .from('products')
              .select('estoque')
              .eq('id', produto.id)
              .single();

            if (!productError && currentProduct && currentProduct.estoque >= produto.quantidade) {
              await supabase
                .from('products')
                .update({ estoque: currentProduct.estoque - produto.quantidade })
                .eq('id', produto.id);
            }
          } catch (error) {
            console.error('Erro ao atualizar estoque do produto:', produto.id, error);
          }
        }
      } else if (vendaData.produto_id) {
        // Manter compatibilidade com produto único
        try {
          const { data: currentProduct, error: productError } = await supabase
            .from('products')
            .select('estoque')
            .eq('id', vendaData.produto_id)
            .single();

          if (!productError && currentProduct && currentProduct.estoque > 0) {
            await supabase
              .from('products')
              .update({ estoque: currentProduct.estoque - 1 })
              .eq('id', vendaData.produto_id);
          }
        } catch (error) {
          console.error('Erro ao atualizar estoque do produto único:', vendaData.produto_id, error);
        }
      }

      const parcelas = [];

      // Criar parcela de entrada se houver
      if (vendaData.valor_entrada > 0) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        parcelas.push({
          user_id: user.id,
          crediario_venda_id: venda.id,
          numero_parcela: 0,
          valor_parcela: vendaData.valor_entrada,
          data_vencimento: tomorrow.toISOString().split('T')[0],
          data_pagamento: new Date().toISOString().split('T')[0],
          status: 'pago' as const,
          tipo: 'entrada' as const
        });
      }

      // Criar parcelas do restante
      if (valorRestante > 0) {
        const parcelasRestante = calcularParcelas(
          valorRestante,
          vendaData.numero_parcelas,
          vendaData.data_venda,
          vendaData.dia_vencimento
        );

        parcelasRestante.forEach(parcela => {
          parcelas.push({
            user_id: user.id,
            crediario_venda_id: venda.id,
            ...parcela
          });
        });
      }

      // Inserir todas as parcelas
      if (parcelas.length > 0) {
        const { error: parcelasError } = await supabase
          .from('parcelas_crediario')
          .insert(parcelas);

        if (parcelasError) throw parcelasError;
      }


      toast({
        title: "Sucesso",
        description: "Venda no crediário criada com sucesso!",
      });

      // Recarregar dados
      await loadVendas();
      await loadParcelas();

    } catch (error) {
      console.error('Error creating venda crediário:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar venda no crediário",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const atualizarStatusParcela = async (parcelaId: string, status: 'pago' | 'pendente', dataPagamento?: string) => {
    if (!user) return;

    try {
      const updateData: any = { status };
      if (status === 'pago' && dataPagamento) {
        updateData.data_pagamento = dataPagamento;
      } else if (status === 'pendente') {
        updateData.data_pagamento = null;
      }

      const { error } = await supabase
        .from('parcelas_crediario')
        .update(updateData)
        .eq('id', parcelaId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Parcela ${status === 'pago' ? 'marcada como paga' : 'desmarcada'}!`,
      });

      // Recarregar parcelas
      await loadParcelas();

    } catch (error) {
      console.error('Error updating parcela status:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar status da parcela",
        variant: "destructive",
      });
    }
  };

  const editarVendaCrediario = async (vendaId: string, data: any) => {
    if (!user) return;

    try {
      // Buscar venda atual para comparar campos e produtos
      const { data: vendaAtual, error: fetchError } = await supabase
        .from('crediario_vendas')
        .select('numero_parcelas, valor_total, valor_entrada, dia_vencimento, produto_id, produtos')
        .eq('id', vendaId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!vendaAtual) throw new Error('Venda não encontrada');

      const valorRestante = (data.valor_total - (data.desconto || 0)) - data.valor_entrada;

      // Restaurar estoque dos produtos anteriores
      const vendaAtualAny = vendaAtual as any;
      if (vendaAtualAny.produtos && vendaAtualAny.produtos.length > 0) {
        // Múltiplos produtos anteriores
        for (const produto of vendaAtualAny.produtos) {
          try {
            // Verificar se é o formato novo (id) ou antigo (produto_id)
            const produtoId = produto.id || produto.produto_id;
            const quantidade = produto.quantidade || 1;
            
            const { data: oldProduct, error: oldProductError } = await supabase
              .from('products')
              .select('estoque')
              .eq('id', produtoId)
              .single();

            if (!oldProductError && oldProduct) {
              await supabase
                .from('products')
                .update({ estoque: oldProduct.estoque + quantidade })
                .eq('id', produtoId);
            }
          } catch (error) {
            console.error('Erro ao restaurar estoque do produto anterior:', produto.id || produto.produto_id, error);
          }
        }
      } else if (vendaAtual.produto_id) {
        // Produto único anterior
        try {
          const { data: oldProduct, error: oldProductError } = await supabase
            .from('products')
            .select('estoque')
            .eq('id', vendaAtual.produto_id)
            .single();

          if (!oldProductError && oldProduct) {
            await supabase
              .from('products')
              .update({ estoque: oldProduct.estoque + 1 })
              .eq('id', vendaAtual.produto_id);
          }
        } catch (error) {
          console.error('Erro ao restaurar estoque do produto único anterior:', vendaAtual.produto_id, error);
        }
      }

      // Reduzir estoque dos novos produtos
      if (data.produtos && data.produtos.length > 0) {
        // Múltiplos produtos novos
        for (const produto of data.produtos) {
          try {
            // Verificar se é o formato novo (id) ou antigo (produto_id)
            const produtoId = produto.id || produto.produto_id;
            const quantidade = produto.quantidade || 1;
            
            const { data: newProduct, error: newProductError } = await supabase
              .from('products')
              .select('estoque')
              .eq('id', produtoId)
              .single();

            if (!newProductError && newProduct && newProduct.estoque >= quantidade) {
              await supabase
                .from('products')
                .update({ estoque: newProduct.estoque - quantidade })
                .eq('id', produtoId);
            }
          } catch (error) {
            console.error('Erro ao reduzir estoque do novo produto:', produto.id || produto.produto_id, error);
          }
        }
      } else if (data.produto_id) {
        // Produto único novo
        try {
          const { data: newProduct, error: newProductError } = await supabase
            .from('products')
            .select('estoque')
            .eq('id', data.produto_id)
            .single();

          if (!newProductError && newProduct && newProduct.estoque > 0) {
            await supabase
              .from('products')
              .update({ estoque: newProduct.estoque - 1 })
              .eq('id', data.produto_id);
          }
        } catch (error) {
          console.error('Erro ao reduzir estoque do produto único novo:', data.produto_id, error);
        }
      }

      // Atualizar venda
      const { error } = await supabase
        .from('crediario_vendas')
        .update({
          client_id: data.client_id,
          produto_id: data.produto_id,
          produtos: data.produtos || [], // Array de múltiplos produtos
          valor_total: data.valor_total,
          desconto: data.desconto || 0,
          valor_entrada: data.valor_entrada,
          numero_parcelas: data.numero_parcelas,
          dia_vencimento: data.dia_vencimento,
          data_venda: data.data_venda,
          observacoes: data.observacoes,
          valor_restante: valorRestante
        })
        .eq('id', vendaId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Se algum campo que afeta as parcelas mudou, recriar parcelas
      const camposMudaram = vendaAtual.numero_parcelas !== data.numero_parcelas ||
                           vendaAtual.valor_total !== data.valor_total ||
                           vendaAtual.valor_entrada !== data.valor_entrada ||
                           vendaAtual.dia_vencimento !== data.dia_vencimento;

      if (camposMudaram) {
        // Deletar parcelas do tipo 'parcela' existentes (manter entrada se houver)
        const { error: deleteError } = await supabase
          .from('parcelas_crediario')
          .delete()
          .eq('crediario_venda_id', vendaId)
          .eq('user_id', user.id)
          .eq('tipo', 'parcela');

        if (deleteError) throw deleteError;

        // Recriar parcelas apenas se há valor restante
        if (valorRestante > 0 && data.numero_parcelas > 0) {
          const novasParcelas = calcularParcelas(
            valorRestante,
            data.numero_parcelas,
            data.data_venda,
            data.dia_vencimento
          );

          const parcelasParaInserir = novasParcelas.map(parcela => ({
            user_id: user.id,
            crediario_venda_id: vendaId,
            ...parcela
          }));

          const { error: insertError } = await supabase
            .from('parcelas_crediario')
            .insert(parcelasParaInserir);

          if (insertError) throw insertError;
        }
      }


      toast({
        title: "Sucesso",
        description: "Venda crediário editada com sucesso!",
      });

      await loadVendas();
      await loadParcelas();

    } catch (error) {
      console.error('Error editing venda crediário:', error);
      toast({
        title: "Erro",
        description: "Erro ao editar venda crediário",
        variant: "destructive",
      });
    }
  };

  const deletarVendaCrediario = async (vendaId: string) => {
    if (!user) return;

    try {
      // Buscar a venda para obter informações dos produtos
      const { data: venda, error: vendaFetchError } = await supabase
        .from('crediario_vendas')
        .select('produto_id, produtos')
        .eq('id', vendaId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (vendaFetchError) throw vendaFetchError;

      // Restaurar estoque de todos os produtos associados
      if (venda) {
        const vendaAny = venda as any;
        
        // Restaurar múltiplos produtos se existirem
        if (vendaAny.produtos && vendaAny.produtos.length > 0) {
          for (const produto of vendaAny.produtos) {
            try {
              // Verificar se é o formato novo (id) ou antigo (produto_id)
              const produtoId = produto.id || produto.produto_id;
              const quantidade = produto.quantidade || 1;
              
              const { data: product, error: productFetchError } = await supabase
                .from('products')
                .select('estoque')
                .eq('id', produtoId)
                .single();

              if (!productFetchError && product) {
                await supabase
                  .from('products')
                  .update({ estoque: product.estoque + quantidade })
                  .eq('id', produtoId);
              }
            } catch (error) {
              console.error('Erro ao restaurar estoque na exclusão:', produto.id || produto.produto_id, error);
            }
          }
        } else if (venda.produto_id) {
          // Restaurar produto único se existir
          try {
            const { data: product, error: productFetchError } = await supabase
              .from('products')
              .select('estoque')
              .eq('id', venda.produto_id)
              .single();

            if (!productFetchError && product) {
              const { error: stockError } = await supabase
                .from('products')
                .update({ estoque: product.estoque + 1 })
                .eq('id', venda.produto_id);

              if (stockError) throw stockError;
            }
          } catch (error) {
            console.error('Erro ao restaurar estoque único na exclusão:', venda.produto_id, error);
          }
        }
      }

      // Primeiro deletar as parcelas
      const { error: parcelasError } = await supabase
        .from('parcelas_crediario')
        .delete()
        .eq('crediario_venda_id', vendaId)
        .eq('user_id', user.id);

      if (parcelasError) throw parcelasError;

      // Depois deletar a venda
      const { error: vendaError } = await supabase
        .from('crediario_vendas')
        .delete()
        .eq('id', vendaId)
        .eq('user_id', user.id);

      if (vendaError) throw vendaError;

      toast({
        title: "Sucesso",
        description: "Venda crediário deletada com sucesso!",
      });

      await loadVendas();
      await loadParcelas();

    } catch (error) {
      console.error('Error deleting venda crediário:', error);
      toast({
        title: "Erro",
        description: "Erro ao deletar venda crediário",
        variant: "destructive",
      });
    }
  };

  return (
    <CrediarioContext.Provider value={{
      vendas,
      parcelas,
      loading,
      loadVendas,
      loadParcelas,
      criarVendaCrediario,
      atualizarStatusParcela,
      editarVendaCrediario,
      deletarVendaCrediario
    }}>
      {children}
    </CrediarioContext.Provider>
  );
};