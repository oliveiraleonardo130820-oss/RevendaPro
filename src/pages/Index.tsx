
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  Shield,
  Zap,
  CheckCircle,
  ArrowRight,
} from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-blue-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">RevendaPro</span>
          </div>
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-gray-600 hover:text-blue-600 font-medium">
              Recursos
            </a>
            <a href="#pricing" className="text-gray-600 hover:text-blue-600 font-medium">
              Preços
            </a>
            <Link to="/auth">
              <Button className="bg-blue-600 hover:bg-blue-700">
                Entrar
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          Gerencie suas vendas com
          <span className="text-blue-600 block">inteligência e simplicidade</span>
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          O RevendaPro é a plataforma completa para vendedores controlarem vendas, 
          clientes, produtos e comissões de forma segura e eficiente.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/auth">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-4">
              Começar Gratuitamente
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Button variant="outline" size="lg" className="text-lg px-8 py-4">
            Ver Demonstração
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-white py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Tudo que você precisa em um só lugar
            </h2>
            <p className="text-xl text-gray-600">
              Recursos poderosos para impulsionar seu negócio
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="border-2 border-blue-100 hover:border-blue-200 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle>Controle de Vendas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Registre vendas rapidamente com múltiplas formas de pagamento, 
                  controle de parcelas e edição completa de vendas registradas.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-green-100 hover:border-green-200 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle>Gestão de Clientes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Cadastro completo com histórico de compras, controle de parcelas 
                  e pesquisa avançada por nome, telefone ou CPF.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-purple-100 hover:border-purple-200 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <DollarSign className="h-6 w-6 text-purple-600" />
                </div>
                <CardTitle>Sistema de Crediário</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Vendas a prazo com controle total de parcelas, datas de vencimento 
                  e acompanhamento de pagamentos pendentes.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-orange-100 hover:border-orange-200 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-orange-600" />
                </div>
                <CardTitle>Segurança Total</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Seus dados estão protegidos com criptografia avançada. 
                  Cada usuário acessa apenas suas próprias informações.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-indigo-100 hover:border-indigo-200 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-indigo-600" />
                </div>
                <CardTitle>Interface Intuitiva</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Design moderno e responsivo que funciona perfeitamente 
                  em computadores, tablets e smartphones.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-red-100 hover:border-red-200 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                  <BarChart3 className="h-6 w-6 text-red-600" />
                </div>
                <CardTitle>Relatórios Detalhados</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Análise completa do seu desempenho com gráficos, 
                  estatísticas e insights para melhorar seus resultados.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Planos que crescem com você
            </h2>
            <p className="text-xl text-gray-600">
              Comece grátis e faça upgrade quando precisar
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Plan */}
            <Card className="border-2 border-gray-200">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Plano Gratuito</CardTitle>
                <div className="text-4xl font-bold text-gray-900 mt-4">
                  R$ 0<span className="text-lg font-normal text-gray-600">/mês</span>
                </div>
                <p className="text-gray-600 mt-2">Perfeito para começar</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>Até 5 produtos</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>Até 10 clientes</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>Relatórios básicos</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>Suporte por WhatsApp</span>
                </div>
                <Link to="/auth">
                  <Button className="w-full mt-6" variant="outline">
                    Começar Grátis
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Premium Plan */}
            <Card className="border-2 border-blue-500 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium">
                  Mais Popular
                </span>
              </div>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Plano Premium</CardTitle>
                <div className="text-4xl font-bold text-blue-600 mt-4">
                  R$ 99,99<span className="text-lg font-normal text-gray-600">/mês</span>
                </div>
                <p className="text-gray-600 mt-2">Para negócios em crescimento</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>Produtos ilimitados</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>Clientes ilimitados</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>Relatórios avançados</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>Suporte prioritário</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>Backup automático</span>
                </div>
                <Link to="/auth">
                  <Button className="w-full mt-6 bg-blue-600 hover:bg-blue-700">
                    Começar agora!
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-600 py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Pronto para transformar suas vendas?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Junte-se a milhares de vendedores que já estão usando o RevendaPro 
            para aumentar suas vendas e organizar seu negócio.
          </p>
          <Link to="/auth">
            <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8 py-4">
              Criar Conta Gratuita
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center space-x-2 mb-8">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">RevendaPro</span>
          </div>
          <div className="text-center text-gray-400">
            <p>&copy; 2024 RevendaPro. Todos os direitos reservados.</p>
            <p className="mt-2">Plataforma segura para gestão de vendas e comissões.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
