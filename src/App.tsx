
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { DataProvider } from "@/contexts/DataContext";
import { CrediarioProvider } from "@/contexts/CrediarioContext";
import Layout from "@/components/Layout";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "@/pages/Index";
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import NewSale from "@/pages/NewSale";
import Clients from "@/pages/Clients";
import Products from "@/pages/Products";
import Sales from "@/pages/Sales";
import Reports from "@/pages/Reports";
import SalesReport from "@/pages/SalesReport";
import InstallmentsControl from "@/pages/InstallmentsControl";
import Profile from "@/pages/Profile";
import Subscription from "@/pages/Subscription";
import Despesas from "@/pages/Despesas";
import Funcionarios from "@/pages/Funcionarios";
import FuncionarioDashboard from "@/pages/FuncionarioDashboard";
import Crediario from "@/pages/Crediario";
import NovaVendaCrediario from "@/pages/NovaVendaCrediario";
import Lojas from "@/pages/Lojas";
import LojaDetalhes from "@/pages/LojaDetalhes";
import LojaNovaVenda from "@/pages/loja/LojaNovaVenda";
import LojaClientes from "@/pages/loja/LojaClientes";
import LojaProdutos from "@/pages/loja/LojaProdutos";
import LojaVendas from "@/pages/loja/LojaVendas";
import LojaCrediario from "@/pages/loja/LojaCrediario";
import LojaRelatorios from "@/pages/loja/LojaRelatorios";
import LojaControleParcelas from "@/pages/loja/LojaControleParcelas";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <AuthProvider>
          <SubscriptionProvider>
            <DataProvider>
              <CrediarioProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route
                path="/funcionario-dashboard"
                element={
                  <ProtectedRoute>
                    <FuncionarioDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Dashboard />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/funcionarios"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Funcionarios />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/new-sale"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <NewSale />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/clients"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Clients />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/products"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Products />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sales"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Sales />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Reports />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sales-report"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <SalesReport />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/installments-control"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <InstallmentsControl />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/despesas"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Despesas />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Profile />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/subscription"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Subscription />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/crediario"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Crediario />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/nova-venda-crediario"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <NovaVendaCrediario />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/lojas"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Lojas />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/lojas/:id"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <LojaDetalhes />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/loja/:id/nova-venda"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <LojaNovaVenda />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/loja/:id/clientes"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <LojaClientes />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/loja/:id/produtos"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <LojaProdutos />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/loja/:id/vendas"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <LojaVendas />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/loja/:id/crediario"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <LojaCrediario />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/loja/:id/relatorios"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <LojaRelatorios />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/loja/:id/controle-parcelas"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <LojaControleParcelas />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
              </CrediarioProvider>
            </DataProvider>
          </SubscriptionProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
