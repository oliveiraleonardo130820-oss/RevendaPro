import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { usePhoneMask } from '@/hooks/usePhoneMask';
import {
  BarChart3,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Phone,
  MapPin,
  Home,
  Store,
  Briefcase,
} from 'lucide-react';

const ADMIN_EMAIL = 'jose130820leo@gmail.com';
const ADMIN_PASSWORD = '123456';

const Auth = () => {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const phone = usePhoneMask();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    telefone: '',
    cidade: '',
    bairro: '',
    rua: '',
    numero: '',
    nome_loja: '',
    ramo_atividade: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!isLogin) {
      if (!formData.name.trim()) {
        newErrors.name = 'Nome completo é obrigatório';
      }
      
      if (!formData.telefone.trim()) {
        newErrors.telefone = 'Telefone é obrigatório';
      } else if (formData.telefone.replace(/\D/g, '').length < 10) {
        newErrors.telefone = 'Telefone deve ter pelo menos 10 dígitos';
      }
      
      if (!formData.cidade.trim()) {
        newErrors.cidade = 'Cidade é obrigatória';
      }
      
      if (!formData.bairro.trim()) {
        newErrors.bairro = 'Bairro é obrigatório';
      }
      
      if (!formData.rua.trim()) {
        newErrors.rua = 'Rua é obrigatória';
      }
      
      if (!formData.numero.trim()) {
        newErrors.numero = 'Número da residência é obrigatório';
      }
      
      if (!formData.nome_loja.trim()) {
        newErrors.nome_loja = 'Nome da loja/revenda é obrigatório';
      }
      
      if (!formData.ramo_atividade.trim()) {
        newErrors.ramo_atividade = 'Ramo de atividade é obrigatório';
      }
    }

    if (!formData.email.trim()) {
      newErrors.email = 'E-mail é obrigatório';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Formato de e-mail inválido';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Senha é obrigatória';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Senha deve ter pelo menos 6 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Por favor, corrija os erros no formulário');
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        await login(formData.email, formData.password);
        
        if (formData.email === ADMIN_EMAIL && formData.password === ADMIN_PASSWORD) {
          toast.success('Login de administrador realizado com sucesso!');
          navigate('/admin');
        } else {
          // Aguardar um pouco para o perfil ser carregado
          setTimeout(() => {
            // O redirecionamento será feito pelo ProtectedRoute baseado no tipo_usuario
            navigate('/dashboard');
          }, 1000);
          toast.success('Login realizado com sucesso!');
        }
      } else {
        // Cadastro
        const userData = {
          telefone: formData.telefone,
          cidade: formData.cidade,
          bairro: formData.bairro,
          rua: formData.rua,
          numero: formData.numero,
          nome_loja: formData.nome_loja,
          ramo_atividade: formData.ramo_atividade,
        };
        
        console.log('Enviando dados de cadastro:', { name: formData.name, email: formData.email, userData });
        
        await register(formData.name, formData.email, formData.password, userData);
        toast.success('Cadastro realizado com sucesso! Verifique seu e-mail para confirmação.');
        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error('Erro na autenticação:', error);
      if (error.message?.includes('Invalid login credentials')) {
        toast.error('E-mail ou senha incorretos');
      } else if (error.message?.includes('User already registered')) {
        toast.error('Este e-mail já está cadastrado');
      } else {
        toast.error(error.message || 'Erro inesperado. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    if (field === 'telefone') {
      const maskedValue = phone.handleChange(value);
      setFormData(prev => ({
        ...prev,
        [field]: maskedValue,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value,
      }));
    }
    
    // Limpar erro do campo quando o usuário começar a digitar
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setErrors({});
    setFormData({
      name: '',
      email: '',
      password: '',
      telefone: '',
      cidade: '',
      bairro: '',
      rua: '',
      numero: '',
      nome_loja: '',
      ramo_atividade: '',
    });
    phone.setValue('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">RevendaPro</h1>
          <p className="text-gray-600 mt-2">
            {isLogin ? 'Entre na sua conta' : 'Crie sua conta gratuita'}
          </p>
        </div>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-center">
              {isLogin ? 'Login' : 'Cadastro'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome completo *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className={`pl-10 ${errors.name ? 'border-red-500' : ''}`}
                        placeholder="Seu nome completo"
                      />
                    </div>
                    {errors.name && (
                      <p className="text-sm text-red-600">{errors.name}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telefone">Telefone *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="telefone"
                        value={formData.telefone}
                        onChange={(e) => handleInputChange('telefone', e.target.value)}
                        className={`pl-10 ${errors.telefone ? 'border-red-500' : ''}`}
                        placeholder="(11) 99999-9999"
                        maxLength={15}
                      />
                    </div>
                    {errors.telefone && (
                      <p className="text-sm text-red-600">{errors.telefone}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cidade">Cidade *</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="cidade"
                          value={formData.cidade}
                          onChange={(e) => handleInputChange('cidade', e.target.value)}
                          className={`pl-10 ${errors.cidade ? 'border-red-500' : ''}`}
                          placeholder="Sua cidade"
                        />
                      </div>
                      {errors.cidade && (
                        <p className="text-sm text-red-600">{errors.cidade}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bairro">Bairro *</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="bairro"
                          value={formData.bairro}
                          onChange={(e) => handleInputChange('bairro', e.target.value)}
                          className={`pl-10 ${errors.bairro ? 'border-red-500' : ''}`}
                          placeholder="Seu bairro"
                        />
                      </div>
                      {errors.bairro && (
                        <p className="text-sm text-red-600">{errors.bairro}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor="rua">Rua *</Label>
                      <div className="relative">
                        <Home className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="rua"
                          value={formData.rua}
                          onChange={(e) => handleInputChange('rua', e.target.value)}
                          className={`pl-10 ${errors.rua ? 'border-red-500' : ''}`}
                          placeholder="Nome da rua"
                        />
                      </div>
                      {errors.rua && (
                        <p className="text-sm text-red-600">{errors.rua}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="numero">Número *</Label>
                      <Input
                        id="numero"
                        value={formData.numero}
                        onChange={(e) => handleInputChange('numero', e.target.value)}
                        className={errors.numero ? 'border-red-500' : ''}
                        placeholder="123"
                      />
                      {errors.numero && (
                        <p className="text-sm text-red-600">{errors.numero}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nome_loja">Nome da loja/revenda *</Label>
                    <div className="relative">
                      <Store className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="nome_loja"
                        value={formData.nome_loja}
                        onChange={(e) => handleInputChange('nome_loja', e.target.value)}
                        className={`pl-10 ${errors.nome_loja ? 'border-red-500' : ''}`}
                        placeholder="Nome da sua loja"
                      />
                    </div>
                    {errors.nome_loja && (
                      <p className="text-sm text-red-600">{errors.nome_loja}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ramo_atividade">Ramo de atividade *</Label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="ramo_atividade"
                        value={formData.ramo_atividade}
                        onChange={(e) => handleInputChange('ramo_atividade', e.target.value)}
                        className={`pl-10 ${errors.ramo_atividade ? 'border-red-500' : ''}`}
                        placeholder="Ex: Roupas, Eletrônicos, Cosméticos..."
                      />
                    </div>
                    {errors.ramo_atividade && (
                      <p className="text-sm text-red-600">{errors.ramo_atividade}</p>
                    )}
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">E-mail *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className={`pl-10 ${errors.email ? 'border-red-500' : ''}`}
                    placeholder="seu@email.com"
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-red-600">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className={`pl-10 pr-10 ${errors.password ? 'border-red-500' : ''}`}
                    placeholder="Sua senha"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-600">{errors.password}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={loading}
              >
                {loading ? 'Processando...' : (isLogin ? 'Entrar' : 'Criar Conta')}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={switchMode}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                {isLogin
                  ? 'Não tem conta? Cadastre-se'
                  : 'Já tem conta? Faça login'
                }
              </button>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-6 text-sm text-gray-600">
          <p>Plano gratuito: Recursos ilimitados</p>
          <p>Todos os planos são gratuitos!</p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
