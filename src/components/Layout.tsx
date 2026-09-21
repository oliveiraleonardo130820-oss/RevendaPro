
import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { Button } from '@/components/ui/button';
import { BarChart3, Users, Package, PlusCircle, FileText, User, LogOut, ChartLine, Calendar, ShoppingCart, DollarSign, UserCheck, CreditCard, Building2 } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { user, logout } = useAuth();
  const { refreshData } = useData();
  const { subscribed, subscriptionTier } = useSubscription();
  const location = useLocation();
  const navigate = useNavigate();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: BarChart3 },
    { name: 'Nova Venda', href: '/new-sale', icon: PlusCircle },
    { name: 'Clientes', href: '/clients', icon: Users },
    { name: 'Produtos', href: '/products', icon: Package },
    { name: 'Vendas', href: '/sales', icon: ShoppingCart },
    // Mostrar Crediário apenas para admins
    ...(user?.tipo_usuario === 'admin' ? [
      { name: 'Crediário', href: '/crediario', icon: CreditCard }
    ] : []),
    { name: 'Despesas', href: '/despesas', icon: DollarSign },
    { name: 'Relatórios', href: '/reports', icon: FileText },
    
    { name: 'Controle de Parcelas', href: '/installments-control', icon: Calendar },
    // Adicionar link para funcionários apenas para donos
    ...(user?.tipo_usuario === 'dono' ? [
      { name: 'Funcionários', href: '/funcionarios', icon: UserCheck }
    ] : []),
    // Adicionar link para lojas apenas para admins
    ...(user?.tipo_usuario === 'admin' ? [
      { name: 'Lojas', href: '/lojas', icon: Building2 }
    ] : []),
    { name: 'Perfil', href: '/profile', icon: User }
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Component to handle mobile menu closing
  const MobileAwareMenuButton = ({ item }: { item: typeof navigation[0] }) => {
    const { setOpenMobile, isMobile } = useSidebar();
    const Icon = item.icon;
    const isActive = location.pathname === item.href;

    const handleClick = async () => {
      if (isMobile) {
        setOpenMobile(false);
      }
      // Atualizar dados quando navegar
      try {
        await refreshData();
      } catch (error) {
        console.error('Erro ao atualizar dados:', error);
      }
    };

    return (
      <SidebarMenuButton asChild isActive={isActive}>
        <Link to={item.href} className="flex items-center" onClick={handleClick}>
          <Icon className="h-5 w-5" />
          <span className="group-data-[collapsible=icon]:hidden">{item.name}</span>
        </Link>
      </SidebarMenuButton>
    );
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <Sidebar variant="sidebar" collapsible="icon">
          <SidebarHeader>
            <div className="flex items-center space-x-2 px-4 py-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900 group-data-[collapsible=icon]:hidden">RevendaPro</span>
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigation.map((item) => (
                    <SidebarMenuItem key={item.name}>
                      <MobileAwareMenuButton item={item} />
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter>
            {/* Plan Status */}
            <div className={`p-4 rounded-lg mx-4 mb-4 group-data-[collapsible=icon]:hidden ${
              subscribed && subscriptionTier === 'Premium' 
                ? 'bg-gradient-to-r from-yellow-50 to-amber-50' 
                : 'bg-gradient-to-r from-blue-50 to-indigo-50'
            }`}>
              <div className="flex items-center space-x-2 mb-2">
                <BarChart3 className={`h-4 w-4 ${
                  subscribed && subscriptionTier === 'Premium' ? 'text-yellow-600' : 'text-blue-600'
                }`} />
                <span className="text-sm font-medium text-gray-900">
                  {subscribed && subscriptionTier === 'Premium' ? 'Plano Premium' : 'Plano Gratuito'}
                </span>
              </div>
              <div className={`text-xs mb-2 ${
                subscribed && subscriptionTier === 'Premium' ? 'text-yellow-600' : 'text-blue-600'
              }`}>
                {subscribed && subscriptionTier === 'Premium' 
                  ? 'Recursos ilimitados' 
                  : 'Recursos limitados'
                }
              </div>
              <Button 
                size="sm" 
                className={`w-full ${
                  subscribed && subscriptionTier === 'Premium'
                    ? 'bg-yellow-600 hover:bg-yellow-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
                onClick={() => navigate('/subscription')}
              >
                {subscribed && subscriptionTier === 'Premium' ? 'Gerenciar Plano' : 'Fazer Upgrade'}
              </Button>
            </div>

            {/* User info and logout */}
            <div className="px-4 pb-4 border-t border-gray-200 pt-4">
              <div className="flex items-center space-x-3 mb-3 group-data-[collapsible=icon]:justify-center">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user?.name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {user?.email}
                  </p>
                  {user?.tipo_usuario && (
                    <p className="text-xs text-blue-600 capitalize">
                      {user.tipo_usuario}
                    </p>
                  )}
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 group-data-[collapsible=icon]:px-2" 
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 group-data-[collapsible=icon]:mr-0 mr-2" />
                <span className="group-data-[collapsible=icon]:hidden">Sair</span>
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex-1">
          {/* Header */}
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-white">
            <SidebarTrigger className="-ml-1">
              Menu
            </SidebarTrigger>
            <div className="flex items-center space-x-4 ml-auto">
              <span className="text-sm text-gray-500 hidden sm:block">
                Bem-vindo, {user?.name}
              </span>
            </div>
          </header>

          {/* Main content */}
          <main className="flex-1 p-4">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Layout;
