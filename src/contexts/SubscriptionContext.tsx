
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface SubscriptionContextType {
  subscribed: boolean;
  subscriptionTier: string | null;
  subscriptionEnd: string | null;
  loading: boolean;
  checkSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, session } = useAuth();
  const [subscribed, setSubscribed] = useState(false);
  const [subscriptionTier, setSubscriptionTier] = useState<string | null>(null);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const checkSubscription = async () => {
    if (!session?.user?.id) {
      console.log('🔐 Sem sessão - definindo como não subscrito');
      setSubscribed(false);
      setSubscriptionTier(null);
      setSubscriptionEnd(null);
      return;
    }

    setLoading(true);
    try {
      console.log('🔍 Verificando plano para:', session.user.email);
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('plan')
        .eq('id', session.user.id)
        .single();

      if (error) {
        console.error('❌ Erro ao verificar plano:', error);
        return;
      }

      console.log('📊 Plano do usuário:', profile);

      const isPremium = profile?.plan === 'premium';
      
      setSubscribed(isPremium);
      setSubscriptionTier(isPremium ? 'Premium' : null);
      setSubscriptionEnd(null);

      console.log('✅ Status atualizado:', { 
        subscribed: isPremium, 
        tier: isPremium ? 'Premium' : null,
        plan: profile?.plan
      });
    } catch (error) {
      console.error('❌ Erro ao verificar plano:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      checkSubscription();
    }
  }, [session]);

  // Auto-refresh subscription status every 30 seconds
  useEffect(() => {
    if (!session) return;

    const interval = setInterval(() => {
      checkSubscription();
    }, 30000);

    return () => clearInterval(interval);
  }, [session]);

  const value = {
    subscribed,
    subscriptionTier,
    subscriptionEnd,
    loading,
    checkSubscription,
  };

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};
