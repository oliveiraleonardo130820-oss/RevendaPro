
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

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
  updateProfile: (data: Partial<Pick<Profile, 'name' | 'email' | 'telefone' | 'cidade' | 'bairro' | 'rua' | 'numero' | 'nome_loja' | 'ramo_atividade' | 'plan'>>) => Promise<void>;
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
                  throw new Error('Usuário desativado.');
                }
                
                // Verificar se assinatura expirou
                if (profile && profile.data_expiracao_assinatura) {
                  const today = new Date();
                  const expirationDate = new Date(profile.data_expiracao_assinatura);
                  
                  if (today >= expirationDate && profile.plan !== 'free') {
                    console.log('⚠️ Assinatura expirada, alterando para plano gratuito');
                    
                    // Atualizar plano para gratuito
                    const { error: updateError } = await supabase
                      .from('profiles')
                      .update({ plan: 'free' })
                      .eq('id', profile.id);
                    
                    if (updateError) {
                      console.error('Erro ao atualizar plano:', updateError);
                    } else {
                      profile.plan = 'free';
                      console.log('✅ Plano alterado para gratuito automaticamente');
                    }
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
    console.log('🔹 AÇÃO 1: INSERIR NA TABELA USUARIOS');
    console.log('🔐 Dono atual logado:', { 
      id: user?.id, 
      tipo: user?.tipo_usuario, 
      email: user?.email 
    });
    
    if (!user || user.tipo_usuario !== 'dono') {
      console.error('❌ Usuário não é dono:', { user: user?.id, tipo: user?.tipo_usuario });
      throw new Error('Apenas donos podem cadastrar funcionários');
    }

    console.log('✅ Usuário é dono válido, prosseguindo...');

    // Salvar sessão atual do dono
    const ownerSession = session;
    const ownerId = user.id;

    try {
      // 🔹 AÇÃO 1: Inserir na tabela usuarios (via profiles)
      console.log('📝 Inserindo funcionário na tabela usuarios...');
      console.log('📊 Dados para inserir:', {
        nome: nome,
        email: email,
        tipo_usuario: 'funcionario'
      });

      // Primeiro criamos o usuário no auth
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: nome,
            tipo_usuario: 'funcionario',
            loja_id: ownerId, // ID do dono
          },
        },
      });

      if (signUpError) {
        console.error('❌ Erro ao criar usuário:', signUpError);
        throw signUpError;
      }

      if (!signUpData.user) {
        console.error('❌ Nenhum usuário criado');
        throw new Error('Falha ao criar usuário');
      }

      const novo_usuario_id = signUpData.user.id;
      console.log('✅ AÇÃO 1 CONCLUÍDA - Usuario criado!');
      console.log('🆔 novo_usuario.id:', novo_usuario_id);

      // Aguardar um pouco para garantir que o perfil foi criado
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Restaurar sessão do dono antes de inserir na tabela funcionarios
      if (ownerSession) {
        await supabase.auth.setSession({
          access_token: ownerSession.access_token,
          refresh_token: ownerSession.refresh_token
        });
        console.log('🔄 Sessão do dono restaurada para inserção');
      }

      // 🔹 AÇÃO 2: Inserir na tabela funcionarios
      console.log('📝 AÇÃO 2: INSERIR NA TABELA FUNCIONARIOS');
      console.log('📊 Dados para inserir:', {
        nome: nome,
        user_id: novo_usuario_id,
        loja_id: ownerId
      });

      const { data: funcionarioData, error: funcionarioError } = await supabase
        .from('funcionarios')
        .insert({
          nome: nome,
          email: email,
          user_id: novo_usuario_id,
          loja_id: ownerId,
        })
        .select('*');

      if (funcionarioError) {
        console.error('❌ Erro ao inserir funcionário:', funcionarioError);
        throw funcionarioError;
      }

      console.log('✅ AÇÃO 2 CONCLUÍDA - Funcionário inserido!');
      console.log('📋 Dados inseridos:', funcionarioData);
      console.log('🎉 CADASTRO COMPLETO!');

    } catch (error) {
      console.error('❌ Erro durante cadastro:', error);
      
      // Garantir que a sessão do dono seja restaurada em caso de erro
      if (ownerSession) {
        await supabase.auth.setSession({
          access_token: ownerSession.access_token,
          refresh_token: ownerSession.refresh_token
        });
        console.log('🔄 Sessão do dono restaurada após erro');
      }
      
      throw error;
    }
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
    setUser(null);
    setSession(null);
  };

  const updateProfile = async (data: Partial<Pick<Profile, 'name' | 'email' | 'telefone' | 'cidade' | 'bairro' | 'rua' | 'numero' | 'nome_loja' | 'ramo_atividade' | 'plan'>>) => {
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
