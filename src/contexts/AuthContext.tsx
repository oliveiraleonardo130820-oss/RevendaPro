
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Session, createClient } from '@supabase/supabase-js';
import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { parseLocalDate } from '@/lib/utils';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface AuthContextType {
  user: Profile | null;
  session: Session | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, userData: {
    telefone: string;
    cidade: string;
    bairro: string;
    rua: string;
    numero: string;
    nome_loja: string;
    ramo_atividade: string;
  }) => Promise<void>;
  registerEmployee: (nome: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<Pick<Profile, 'name' | 'email' | 'telefone' | 'cidade' | 'bairro' | 'rua' | 'numero' | 'nome_loja' | 'ramo_atividade'>>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Configurar listener de mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        setSession(session);
        
        if (session?.user) {
          // Buscar perfil do usuário
          setTimeout(async () => {
            try {
              const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

              if (error) {
                console.error('Erro ao buscar perfil:', error);
              } else {
                console.log('Perfil carregado:', profile);
                
                // Verificar se usuário está ativo
                if (profile && !profile.ativo) {
                  console.log('❌ Usuário desativado, fazendo logout');
                  await supabase.auth.signOut();
                  return;
                }

                // Assinatura expirada: trata como plano gratuito na sessão. A gravação no
                // banco é feita pela rotina diária check_expired_subscriptions (o cliente
                // não tem permissão para alterar o próprio plano).
                if (profile && profile.data_expiracao_assinatura && profile.plan !== 'free') {
                  const expirationDate = parseLocalDate(profile.data_expiracao_assinatura);
                  if (new Date() >= expirationDate) {
                    profile.plan = 'free';
                  }
                }

                setUser(profile);
              }
            } catch (error) {
              console.error('Erro ao buscar perfil:', error);
            } finally {
              setLoading(false);
            }
          }, 0);
        } else {
          setUser(null);
          setLoading(false);
        }
      }
    );

    // Verificar sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Sessão inicial:', session?.user?.id);
      setSession(session);
      if (!session) {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
  };

  const register = async (name: string, email: string, password: string, userData: {
    telefone: string;
    cidade: string;
    bairro: string;
    rua: string;
    numero: string;
    nome_loja: string;
    ramo_atividade: string;
  }) => {
    console.log('Iniciando cadastro:', { name, email, userData });
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: {
          name,
          telefone: userData.telefone,
          cidade: userData.cidade,
          bairro: userData.bairro,
          rua: userData.rua,
          numero: userData.numero,
          nome_loja: userData.nome_loja,
          ramo_atividade: userData.ramo_atividade,
          tipo_usuario: 'dono',
        },
      },
    });
    
    if (error) {
      console.error('Erro no cadastro:', error);
      throw error;
    }
    
    console.log('Cadastro realizado com sucesso');
  };

  const registerEmployee = async (nome: string, email: string, password: string) => {
    if (!user || user.tipo_usuario !== 'dono') {
      throw new Error('Apenas donos podem cadastrar funcionários');
    }

    const ownerId = user.id;

    // Cliente isolado, sem persistir sessão: criar o funcionário não pode trocar
    // nem derrubar a sessão do dono que está logado.
    const isolatedClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    const { data: signUpData, error: signUpError } = await isolatedClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: nome,
          tipo_usuario: 'funcionario',
        },
      },
    });

    if (signUpError) throw signUpError;
    if (!signUpData.user) throw new Error('Falha ao criar usuário');

    // O vínculo do funcionário com a loja é feito pelo trigger do banco quando o
    // dono (sessão normal, autenticada) insere esta linha.
    const { error: funcionarioError } = await supabase
      .from('funcionarios')
      .insert({
        nome,
        email,
        user_id: signUpData.user.id,
        loja_id: ownerId,
      });

    if (funcionarioError) {
      console.error('Erro ao inserir funcionário:', funcionarioError);
      throw funcionarioError;
    }
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
    setUser(null);
    setSession(null);
  };

  const updateProfile = async (data: Partial<Pick<Profile, 'name' | 'email' | 'telefone' | 'cidade' | 'bairro' | 'rua' | 'numero' | 'nome_loja' | 'ramo_atividade'>>) => {
    if (!session?.user) throw new Error('Usuário não autenticado');

    const { error } = await supabase
      .from('profiles')
      .update(data)
      .eq('id', session.user.id);

    if (error) throw error;

    // Atualizar estado local
    setUser(prev => prev ? { ...prev, ...data } : null);
  };

  const value = {
    user,
    session,
    isAuthenticated: !!session,
    loading,
    login,
    register,
    registerEmployee,
    logout,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
