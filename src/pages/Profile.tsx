import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { usePhoneMask } from '@/hooks/usePhoneMask';
import {
  User,
  Mail,
  Crown,
  Edit,
  Save,
  X,
  CreditCard,
  Lock,
  Eye,
  EyeOff,
  Phone,
  MapPin,
  Store,
  Briefcase,
  MessageCircle,
  ExternalLink,
} from 'lucide-react';

const Profile = () => {
  console.log('🏁 Profile component renderizando...');
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  
  const phoneMask = usePhoneMask(user?.telefone || '');
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    telefone: user?.telefone || '',
    cidade: user?.cidade || '',
    bairro: user?.bairro || '',
    rua: user?.rua || '',
    numero: user?.numero || '',
    nome_loja: user?.tipo_usuario === 'dono' ? (user?.nome_loja || '') : '',
    ramo_atividade: user?.tipo_usuario === 'dono' ? (user?.ramo_atividade || '') : '',
    whatsapp: user?.whatsapp || '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const validateForm = () => {
    const errors = [];
    
    if (!formData.name.trim()) errors.push('Nome completo é obrigatório');
    if (!formData.email.trim()) errors.push('E-mail é obrigatório');
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.push('E-mail deve ter um formato válido');
    }
    if (!formData.telefone.trim()) errors.push('Telefone é obrigatório');
    if (!formData.cidade.trim()) errors.push('Cidade é obrigatória');
    if (!formData.bairro.trim()) errors.push('Bairro é obrigatório');
    if (!formData.rua.trim()) errors.push('Rua é obrigatória');
    if (!formData.numero.trim()) errors.push('Número da residência é obrigatório');
    
    // Só exigir campos de loja se for dono
    if (user?.tipo_usuario === 'dono') {
      if (!formData.nome_loja.trim()) errors.push('Nome da loja/revenda é obrigatório');
      if (!formData.ramo_atividade.trim()) errors.push('Ramo de atividade é obrigatório');
    }

    if (errors.length > 0) {
      toast.error(errors.join(', '));
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      await updateProfile(formData);
      setIsEditing(false);
      toast.success('Perfil atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      toast.error('Erro ao atualizar perfil. Tente novamente.');
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('As senhas não coincidem.');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });
      
      if (error) throw error;
      
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setIsChangingPassword(false);
      toast.success('Senha alterada com sucesso!');
    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      toast.error('Erro ao alterar senha. Tente novamente.');
    }
  };

  const handleCancel = () => {
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
      telefone: user?.telefone || '',
      cidade: user?.cidade || '',
      bairro: user?.bairro || '',
      rua: user?.rua || '',
      numero: user?.numero || '',
      nome_loja: user?.tipo_usuario === 'dono' ? (user?.nome_loja || '') : '',
      ramo_atividade: user?.tipo_usuario === 'dono' ? (user?.ramo_atividade || '') : '',
      whatsapp: user?.whatsapp || '',
    });
    phoneMask.setValue(user?.telefone || '');
    setIsEditing(false);
  };

  const handlePasswordCancel = () => {
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setIsChangingPassword(false);
  };

  const handleInputChange = (field: string, value: string) => {
    if (field === 'telefone') {
      const maskedValue = phoneMask.handleChange(value);
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
  };

  const handlePasswordInputChange = (field: string, value: string) => {
    setPasswordData(prev => ({
      ...prev,
      [field]: value,
    }));
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Perfil do Usuário</h1>
        <p className="text-gray-600">Gerencie suas informações pessoais e plano</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Info */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-blue-600" />
                  <span>Informações Pessoais</span>
                </CardTitle>
                <div className="flex items-center space-x-3">
                  {/* Switch para funcionários */}
                  {user?.tipo_usuario === 'funcionario' && (
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={user?.ativo}
                        onCheckedChange={handleStatusToggle}
                        disabled={isUpdatingStatus}
                      />
                      <Badge variant={user?.ativo ? 'default' : 'secondary'}>
                        {user?.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                  )}
                  
                  {!isEditing ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </Button>
                  ) : (
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCancel}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSubmit}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Save className="mr-2 h-4 w-4" />
                        Salvar
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Dados Pessoais */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Dados Pessoais</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome completo *</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          className="pl-10"
                          disabled={!isEditing}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail *</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          className="pl-10"
                          disabled={!isEditing}
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="telefone">Telefone *</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="telefone"
                          value={formData.telefone}
                          onChange={(e) => handleInputChange('telefone', e.target.value)}
                          className="pl-10"
                          disabled={!isEditing}
                          placeholder="(99) 99999-9999"
                          required
                        />
                      </div>
                    </div>

                    {/* Só mostrar campos de loja se for dono */}
                    {user?.tipo_usuario === 'dono' && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="nome_loja">Nome da loja/revenda *</Label>
                          <div className="relative">
                            <Store className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                              id="nome_loja"
                              value={formData.nome_loja}
                              onChange={(e) => handleInputChange('nome_loja', e.target.value)}
                              className="pl-10"
                              disabled={!isEditing}
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="ramo_atividade">Ramo de atividade *</Label>
                          <div className="relative">
                            <Briefcase className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                              id="ramo_atividade"
                              value={formData.ramo_atividade}
                              onChange={(e) => handleInputChange('ramo_atividade', e.target.value)}
                              className="pl-10"
                              disabled={!isEditing}
                              placeholder="Ex: Cosméticos, Roupas, Eletrônicos..."
                              required
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Endereço */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 border-b pb-2 flex items-center">
                    <MapPin className="mr-2 h-5 w-5" />
                    Endereço
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cidade">Cidade *</Label>
                      <Input
                        id="cidade"
                        value={formData.cidade}
                        onChange={(e) => handleInputChange('cidade', e.target.value)}
                        disabled={!isEditing}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bairro">Bairro *</Label>
                      <Input
                        id="bairro"
                        value={formData.bairro}
                        onChange={(e) => handleInputChange('bairro', e.target.value)}
                        disabled={!isEditing}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="rua">Rua *</Label>
                      <Input
                        id="rua"
                        value={formData.rua}
                        onChange={(e) => handleInputChange('rua', e.target.value)}
                        disabled={!isEditing}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="numero">Número *</Label>
                      <Input
                        id="numero"
                        value={formData.numero}
                        onChange={(e) => handleInputChange('numero', e.target.value)}
                        disabled={!isEditing}
                        required
                      />
                    </div>
                  </div>
                </div>

                {isEditing && (
                  <div className="flex justify-end space-x-4 pt-4 border-t">
                    <Button type="button" variant="outline" onClick={handleCancel}>
                      Cancelar
                    </Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                      Salvar Alterações
                    </Button>
                  </div>
                )}
              </form>

              {/* Password Change Section */}
              <div className="mt-6 pt-6 border-t">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">Alterar Senha</h3>
                      <p className="text-sm text-gray-600">
                        Altere sua senha para manter sua conta segura
                      </p>
                    </div>
                    {!isChangingPassword && (
                      <Button
                        variant="outline"
                        onClick={() => setIsChangingPassword(true)}
                        className="flex items-center space-x-2"
                      >
                        <Lock className="h-4 w-4" />
                        <span>Alterar Senha</span>
                      </Button>
                    )}
                  </div>

                  {isChangingPassword && (
                    <form onSubmit={handlePasswordChange} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="newPassword">Nova senha</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="newPassword"
                            type={showNewPassword ? "text" : "password"}
                            value={passwordData.newPassword}
                            onChange={(e) => handlePasswordInputChange('newPassword', e.target.value)}
                            className="pl-10 pr-10"
                            placeholder="Digite sua nova senha"
                            required
                            minLength={6}
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                          >
                            {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            value={passwordData.confirmPassword}
                            onChange={(e) => handlePasswordInputChange('confirmPassword', e.target.value)}
                            className="pl-10 pr-10"
                            placeholder="Confirme sua nova senha"
                            required
                            minLength={6}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-end space-x-4">
                        <Button type="button" variant="outline" onClick={handlePasswordCancel}>
                          Cancelar
                        </Button>
                        <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                          Alterar Senha
                        </Button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Plan Info and Actions */}
        <div className="space-y-6">
          {/* Status do Funcionário - apenas para funcionários */}
          {user?.tipo_usuario === 'funcionario' && (
            <Card>
              <CardHeader>
                <CardTitle>Status do Funcionário</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-medium text-gray-900">Status na loja:</span>
                    <p className="text-sm text-gray-600">Funcionário ativo para vendas</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={user?.ativo}
                      onCheckedChange={handleStatusToggle}
                      disabled={isUpdatingStatus}
                    />
                    <Badge variant={user?.ativo ? 'default' : 'secondary'}>
                      {user?.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Current Plan */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Crown className="h-5 w-5 text-yellow-600" />
                <span>Plano Atual</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <Badge 
                  variant={user?.plan === 'premium' ? 'default' : 'secondary'}
                  className={`text-lg px-4 py-2 ${
                    user?.plan === 'premium' 
                      ? 'bg-blue-600 hover:bg-blue-700' 
                      : 'bg-gray-500'
                  }`}
                >
                  {user?.plan === 'premium' ? 'Premium' : 'Gratuito'}
                </Badge>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span>Produtos:</span>
                  <span className="font-medium">
                    {user?.plan === 'premium' ? 'Ilimitado' : '5 produtos'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Clientes:</span>
                  <span className="font-medium">
                    {user?.plan === 'premium' ? 'Ilimitado' : '10 clientes'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Relatórios:</span>
                  <span className="font-medium">
                    {user?.plan === 'premium' ? 'Avançados' : 'Básicos'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Suporte:</span>
                  <span className="font-medium">
                    {user?.plan === 'premium' ? 'WhatsApp' : 'E-mail'}
                  </span>
                </div>
              </div>

              <Button
                className="w-full"
                onClick={() => navigate('/subscription')}
                variant={user?.plan === 'premium' ? 'outline' : 'default'}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                {user?.plan === 'premium' ? 'Gerenciar Plano' : 'Fazer Upgrade'}
              </Button>
            </CardContent>
          </Card>

          {/* Account Info */}
          <Card>
            <CardHeader>
              <CardTitle>Informações da Conta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Membro desde:</span>
                <span className="font-medium">
                  {user?.created_at 
                    ? new Date(user.created_at).toLocaleDateString('pt-BR')
                    : 'N/A'
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">ID do usuário:</span>
                <span className="font-medium text-xs">{user?.id}</span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate('/clients')}
              >
                <User className="mr-2 h-4 w-4" />
                Gerenciar Clientes
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate('/products')}
              >
                <Crown className="mr-2 h-4 w-4" />
                Gerenciar Produtos
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate('/reports')}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                Ver Relatórios
              </Button>
            </CardContent>
          </Card>

          {/* Support Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageCircle className="h-5 w-5 text-green-600" />
                <span>Suporte</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">Atendimento pelo WhatsApp</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open('https://wa.me/5588999174568', '_blank')}
                    className="p-2 hover:bg-green-50"
                    title="Falar no WhatsApp"
                  >
                    <MessageCircle className="h-5 w-5 text-[#25D366]" />
                    <ExternalLink className="h-3 w-3 ml-1 text-gray-400" />
                  </Button>
                </div>
                
                <p className="text-sm text-gray-600">
                  Fale conosco pelo WhatsApp para dúvidas, suporte ou sugestões.
                </p>
                
                <Button
                  variant="outline"
                  className="w-full flex items-center justify-center space-x-2 border-green-200 hover:bg-green-50"
                  onClick={() => window.open('https://wa.me/5588999174568', '_blank')}
                >
                  <MessageCircle className="h-4 w-4 text-[#25D366]" />
                  <span>Abrir WhatsApp</span>
                  <ExternalLink className="h-4 w-4 text-gray-400" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;
