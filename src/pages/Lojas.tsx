import { useState, useEffect } from 'react';
import { Plus, Building2, Calendar, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Loja {
  id: string;
  nome: string;
  cidade?: string;
  bairro?: string;
  rua?: string;
  numero?: string;
  plano: string;
  created_at: string;
}

export default function Lojas() {
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    nome: '',
    cidade: '',
    bairro: '',
    rua: '',
    numero: '',
    plano: 'gratuito'
  });
  
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchLojas = async () => {
    try {
      const { data, error } = await supabase
        .from('lojas')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLojas(data || []);
    } catch (error) {
      console.error('Erro ao buscar lojas:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as lojas.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome.trim()) {
      toast({
        title: "Erro",
        description: "Nome da loja é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('lojas')
        .insert([{
          ...formData,
          user_id: user?.id
        }]);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Loja criada com sucesso!",
      });
      
      setFormData({
        nome: '',
        cidade: '',
        bairro: '',
        rua: '',
        numero: '',
        plano: 'gratuito'
      });
      setIsDialogOpen(false);
      fetchLojas();
    } catch (error) {
      console.error('Erro ao criar loja:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar a loja.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta loja?')) return;

    try {
      const { error } = await supabase
        .from('lojas')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Loja excluída com sucesso!",
      });
      fetchLojas();
    } catch (error) {
      console.error('Erro ao excluir loja:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a loja.",
        variant: "destructive",
      });
    }
  };

  const handleAcessar = (lojaId: string) => {
    navigate(`/lojas/${lojaId}`);
  };

  useEffect(() => {
    fetchLojas();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Carregando lojas...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Lojas</h1>
          <p className="text-muted-foreground">Gerencie suas lojas</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary">
              <Plus className="w-4 h-4 mr-2" />
              Nova Loja
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Nova Loja</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome da Loja *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({...formData, nome: e.target.value})}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cidade">Cidade</Label>
                <Input
                  id="cidade"
                  value={formData.cidade}
                  onChange={(e) => setFormData({...formData, cidade: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="bairro">Bairro</Label>
                <Input
                  id="bairro"
                  value={formData.bairro}
                  onChange={(e) => setFormData({...formData, bairro: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="rua">Rua</Label>
                <Input
                  id="rua"
                  value={formData.rua}
                  onChange={(e) => setFormData({...formData, rua: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="numero">Número</Label>
                <Input
                  id="numero"
                  value={formData.numero}
                  onChange={(e) => setFormData({...formData, numero: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="plano">Plano</Label>
                <Select value={formData.plano} onValueChange={(value) => setFormData({...formData, plano: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gratuito">Gratuito</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex gap-2">
                <Button type="submit" className="bg-primary">Criar Loja</Button>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {lojas.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma loja encontrada</h3>
            <p className="text-muted-foreground text-center mb-4">
              Crie sua primeira loja para começar a gerenciar seu negócio.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {lojas.map((loja) => (
            <Card key={loja.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  {loja.nome}
                </CardTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(loja.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  {loja.cidade && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Cidade:</span> {loja.cidade}
                    </p>
                  )}
                  {loja.bairro && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Bairro:</span> {loja.bairro}
                    </p>
                  )}
                  <p className="text-sm">
                    <span className="font-medium">Plano:</span>{' '}
                    <span className={`px-2 py-1 rounded text-xs ${
                      loja.plano === 'premium' 
                        ? 'bg-primary/10 text-primary' 
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {loja.plano}
                    </span>
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleAcessar(loja.id)}
                    className="flex-1"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Acessar
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDelete(loja.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}