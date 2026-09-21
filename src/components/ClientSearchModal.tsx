
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Search, Users } from 'lucide-react';

interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
}

interface ClientSearchModalProps {
  open: boolean;
  onClose: () => void;
  clients: Client[];
  onSelectClient: (client: Client) => void;
}

const ClientSearchModal = ({ open, onClose, clients, onSelectClient }: ClientSearchModalProps) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone.includes(searchTerm)
  );

  const handleSelectClient = (client: Client) => {
    onSelectClient(client);
    setSearchTerm('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Buscar Cliente</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="search">Pesquisar cliente</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="search"
                placeholder="Digite o nome ou telefone do cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-2">
            {filteredClients.length > 0 ? (
              filteredClients.map((client) => (
                <div
                  key={client.id}
                  className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => handleSelectClient(client)}
                >
                  <div className="font-medium text-gray-900">{client.name}</div>
                  <div className="text-sm text-gray-600">{client.phone}</div>
                  {client.email && (
                    <div className="text-sm text-gray-500">{client.email}</div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                {searchTerm ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ClientSearchModal;
