
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, RefreshCw, Settings } from "lucide-react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

const Subscription = () => {
  const { user } = useAuth();
  const { subscribed, subscriptionTier, loading, checkSubscription } = useSubscription();
  const { toast } = useToast();

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const handleUpgrade = () => {
    window.open('https://pay.kirvano.com/c4a6a594-e59f-45e0-97b3-b3b1026488c3', '_blank');
  };

  const handleRefresh = async () => {
    try {
      await checkSubscription();
      toast({
        title: "Atualizado",
        description: "Status da assinatura atualizado com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao atualizar status. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Assinatura</h1>
        <p className="text-muted-foreground">
          Gerencie sua assinatura e acesse recursos premium
        </p>
      </div>

      {/* Status atual */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Status da Assinatura
                {subscribed && <Crown className="h-5 w-5 text-yellow-500" />}
              </CardTitle>
              <CardDescription>
                {subscribed 
                  ? `Você tem acesso ao plano ${subscriptionTier}`
                  : "Você está no plano gratuito"
                }
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Badge variant={subscribed ? "default" : "secondary"}>
              {subscribed ? "Premium Ativo" : "Gratuito"}
            </Badge>
            {subscribed && (
              <p className="text-sm text-muted-foreground">
                Status: Ativo
              </p>
            )}
          </div>
          
          {subscribed && (
            <div className="mt-4">
              <Button disabled className="w-full">
                <Crown className="h-4 w-4 mr-2" />
                Plano Premium Ativo
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Planos */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Plano Gratuito */}
        <Card className={!subscribed ? "border-primary" : ""}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Plano Gratuito</CardTitle>
              {!subscribed && (
                <Badge>Atual</Badge>
              )}
            </div>
            <CardDescription>
              Perfeito para começar
            </CardDescription>
            <div className="text-3xl font-bold">
              R$ 0<span className="text-lg font-normal">/mês</span>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 mb-6">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>Até 5 produtos</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>Até 10 clientes</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>Relatórios básicos</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>Suporte por WhatsApp</span>
              </li>
            </ul>
            
            {!subscribed && (
              <Button disabled className="w-full">
                Plano Atual
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Plano Premium */}
        <Card className={subscribed ? "border-primary bg-primary/5" : ""}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                Plano Premium
                <Crown className="h-5 w-5 text-yellow-500" />
              </CardTitle>
              {!subscribed ? (
                <Badge className="bg-blue-500 text-white">Mais Popular</Badge>
              ) : (
                <Badge>Atual</Badge>
              )}
            </div>
            <CardDescription>
              Para negócios em crescimento
            </CardDescription>
            <div className="text-3xl font-bold">
              R$ 99,99<span className="text-lg font-normal">/mês</span>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 mb-6">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>Produtos ilimitados</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>Clientes ilimitados</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>Relatórios avançados</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>Suporte prioritário</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>Backup automático</span>
              </li>
            </ul>
            
            {subscribed ? (
              <Button disabled className="w-full">
                Plano Ativo
              </Button>
            ) : (
              <Button onClick={handleUpgrade} className="w-full">
                Fazer Upgrade
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Subscription;
