
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface PlanLimits {
  maxClients: number;
  maxProducts: number;
  currentClients: number;
  currentProducts: number;
  canAddClient: boolean;
  canAddProduct: boolean;
  isLoading: boolean;
}

export const usePlanLimits = (): PlanLimits => {
  const { user } = useAuth();
  const [currentClients, setCurrentClients] = useState(0);
  const [currentProducts, setCurrentProducts] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [userPlan, setUserPlan] = useState<string | null>(null);

  // Verificar se é plano Premium apenas pela tabela profiles
  const isPremiumPlan = userPlan === 'premium';
  
  console.log('🎯 Plan Status (usePlanLimits):', { 
    userPlan,
    isPremiumPlan,
    user: user?.email 
  });

  // Definir limites baseados no plano
  const maxClients = isPremiumPlan ? -1 : 10; // -1 = ilimitado
  const maxProducts = isPremiumPlan ? -1 : 5; // -1 = ilimitado

  useEffect(() => {
    const fetchUserPlan = async () => {
      if (!user) return;

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('plan')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Erro ao buscar plano do usuário:', error);
        } else if (profile) {
          setUserPlan(profile.plan);
        }
      } catch (error) {
        console.error('Erro ao buscar plano:', error);
      }
    };

    fetchUserPlan();
  }, [user]);

  useEffect(() => {
    const fetchCounts = async () => {
      if (!user) return;

      try {
        setIsLoading(true);

        // Buscar contagem de clientes
        const { count: clientsCount, error: clientsError } = await supabase
          .from('clients')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        if (clientsError) {
          console.error('Erro ao buscar contagem de clientes:', clientsError);
        } else {
          setCurrentClients(clientsCount || 0);
        }

        // Buscar contagem de produtos
        const { count: productsCount, error: productsError } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        if (productsError) {
          console.error('Erro ao buscar contagem de produtos:', productsError);
        } else {
          setCurrentProducts(productsCount || 0);
        }
      } catch (error) {
        console.error('Erro ao buscar contagens:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCounts();
  }, [user]);

  // Se for Premium, sempre pode adicionar (sem limite)
  const canAddClient = isPremiumPlan ? true : currentClients < maxClients;
  const canAddProduct = isPremiumPlan ? true : currentProducts < maxProducts;

  console.log('📋 Final Limits Check:', {
    isPremiumPlan,
    maxClients,
    maxProducts,
    currentClients,
    currentProducts,
    canAddClient,
    canAddProduct,
    userPlan
  });

  return {
    maxClients,
    maxProducts,
    currentClients,
    currentProducts,
    canAddClient,
    canAddProduct,
    isLoading,
  };
};
