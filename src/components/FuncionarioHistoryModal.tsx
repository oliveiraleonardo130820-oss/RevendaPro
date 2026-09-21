
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';

interface Venda {
  id: string;
  sale_date: string;
  total_value: number;
  product_name: string;
  client_name: string | null;
  commission: number;
}

interface FuncionarioHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  funcionarioNome: string;
  vendas: Venda[];
}

const FuncionarioHistoryModal = ({ 
  open, 
  onOpenChange, 
  funcionarioNome, 
  vendas 
}: FuncionarioHistoryModalProps) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const totalVendas = vendas.reduce((sum, venda) => sum + venda.total_value, 0);
  const totalComissao = vendas.reduce((sum, venda) => sum + venda.commission, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Histórico de Vendas - {funcionarioNome}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Resumo */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <p className="text-sm text-gray-600">Total de Vendas</p>
              <p className="text-lg font-bold">{vendas.length}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Valor Total</p>
              <p className="text-lg font-bold text-green-600">
                {formatCurrency(totalVendas)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Comissão Total</p>
              <p className="text-lg font-bold text-blue-600">
                {formatCurrency(totalComissao)}
              </p>
            </div>
          </div>

          {/* Tabela de Vendas */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Comissão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                      Nenhuma venda encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  vendas.map((venda) => (
                    <TableRow key={venda.id}>
                      <TableCell>{formatDate(venda.sale_date)}</TableCell>
                      <TableCell>{venda.product_name}</TableCell>
                      <TableCell>{venda.client_name || 'Cliente avulso'}</TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(venda.total_value)}
                      </TableCell>
                      <TableCell className="text-green-600">
                        {formatCurrency(venda.commission)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FuncionarioHistoryModal;
