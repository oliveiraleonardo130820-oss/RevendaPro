import React from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useData } from '@/contexts/DataContext';

interface CrediarioDetalhesModalProps {
  open: boolean;
  onClose: () => void;
  venda: any;
  parcelas: any[];
}

export default function CrediarioDetalhesModal({ 
  open, 
  onClose, 
  venda, 
  parcelas 
}: CrediarioDetalhesModalProps) {
  const { clients, products } = useData();

  if (!venda) return null;

  console.log('CrediarioDetalhesModal - venda data:', venda);

  // Função para obter nome do cliente
  const getClientName = (clientId: string | null) => {
    if (!clientId) return 'Sem cadastro';
    const client = clients.find(c => c.id === clientId);
    return client?.name || 'Cliente não encontrado';
  };

  // Função para obter nome do produto
  const getProductName = (productId: string) => {
    const product = products.find(p => p.id === productId);
    return product?.name || 'Produto não encontrado';
  };

  // Função para formatar valor
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Função para formatar data
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';

    // Se já está no formato dd/MM/yyyy, retorna direto
    if (dateString.includes('/')) {
      return dateString;
    }

    // Para formato YYYY-MM-DD, subtrair 1 dia para corrigir timezone
    const [year, month, day] = dateString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    date.setDate(date.getDate() - 1);
    const correctedDay = date.getDate().toString().padStart(2, '0');
    const correctedMonth = (date.getMonth() + 1).toString().padStart(2, '0');
    const correctedYear = date.getFullYear();
    return `${correctedDay}/${correctedMonth}/${correctedYear}`;
  };

  // Função para obter informações do cliente
  const getClientInfo = () => {
    if (!venda.client_id) return {
      name: 'Sem cadastro',
      phone: '-'
    };
    const client = clients.find(c => c.id === venda.client_id);
    return {
      name: client?.name || 'Cliente não encontrado',
      phone: client?.phone || '-'
    };
  };

  // Função para obter status da venda
  const getSaleStatus = () => {
    if (venda.status === 'finalizado') return 'Pago';
    if (venda.status === 'cancelado') return 'Cancelado';
    return 'Pendente';
  };

  const parcelasVenda = parcelas.filter(p => p.crediario_venda_id === venda.id);
  const parcelasPagas = parcelasVenda.filter(p => p.status === 'pago');
  const valorPago = parcelasPagas.reduce((acc, p) => acc + p.valor_parcela, 0);
  const valorPendente = venda.valor_total - valorPago;
  const progressPercentage = venda.valor_total > 0 ? (valorPago / venda.valor_total) * 100 : 0;

  const clientInfo = getClientInfo();
  const status = getSaleStatus();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between text-xl font-semibold">
            📋 Detalhes da Venda
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Seção: Informações do Cliente e Venda */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Informações do Cliente */}
            <div className="border rounded-lg p-4 space-y-3">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-blue-600">
                👤 Informações do Cliente
              </h3>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Nome:</label>
                <p className="text-lg font-medium">{clientInfo.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Telefone:</label>
                <p className="text-lg">{clientInfo.phone}</p>
              </div>
            </div>

            {/* Informações da Venda */}
            <div className="border rounded-lg p-4 space-y-3">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-blue-600">
                📊 Informações da Venda
              </h3>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Data da Venda:</label>
                <p className="text-lg">{formatDate(venda.data_venda)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status:</label>
                <div className="mt-1">
                  <Badge variant={status === 'Pago' ? 'default' : 'secondary'} className={status === 'Pago' ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'}>
                    {status === 'Pago' ? 'PAGO' : 'ATIVO'}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Produto:</label>
                <p className="text-lg">{getProductName(venda.produto_id)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Forma de Pagamento:</label>
                <p className="text-lg">Crediário</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Juros:</label>
                <p className="text-lg">{formatCurrency(venda.juros || 0)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Desconto:</label>
                <p className="text-lg">{formatCurrency(venda.desconto || 0)}</p>
              </div>
            </div>
          </div>

          {/* Resumo Financeiro */}
          <div className="border rounded-lg p-4">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-blue-600 mb-4">
              💰 Resumo Financeiro
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <label className="text-sm font-medium text-blue-600">Valor Total</label>
                <p className="text-xl font-bold text-blue-600">{formatCurrency(venda.valor_total)}</p>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <label className="text-sm font-medium text-green-600">Valor da Entrada</label>
                <p className="text-xl font-bold text-green-600">{formatCurrency(venda.valor_entrada || 0)}</p>
              </div>
              
              <div className="bg-orange-50 p-4 rounded-lg text-center">
                <label className="text-sm font-medium text-orange-600">Valor Pago</label>
                <p className="text-xl font-bold text-orange-600">{formatCurrency(valorPago)}</p>
              </div>
              
              <div className="bg-red-50 p-4 rounded-lg text-center">
                <label className="text-sm font-medium text-red-600">Valor Pendente</label>
                <p className="text-xl font-bold text-red-600">{formatCurrency(valorPendente)}</p>
              </div>
            </div>

            {/* Barra de Progresso */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Progresso do Pagamento:</span>
                <span className="text-sm font-bold">{progressPercentage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className="bg-green-500 h-3 rounded-full transition-all duration-300" style={{
                  width: `${progressPercentage}%`
                }} />
              </div>
              {parcelasVenda.length > 0 && (
                <p className="text-sm text-muted-foreground text-center">
                  {parcelasPagas.length} de {parcelasVenda.length} parcelas pagas
                </p>
              )}
            </div>
          </div>

          {/* Produtos Vendidos */}
          <div className="border rounded-lg p-4">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-blue-600 mb-4">
              📦 Produtos da Venda
            </h3>
            <div className="space-y-3">
              {venda.produtos && venda.produtos.length > 0 ? (
                venda.produtos.map((produto: any, index: number) => (
                  <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium text-lg text-blue-600">{getProductName(produto.produto_id)}</p>
                        <div className="flex gap-6 text-sm text-muted-foreground mt-1">
                          <span>Quantidade: {produto.quantidade}</span>
                          <span>Preço Unit.: {formatCurrency(produto.preco_unitario)}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm text-muted-foreground">Total:</span>
                        <p className="font-bold text-lg">{formatCurrency(produto.quantidade * produto.preco_unitario)}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : venda.produto_id ? (
                <div className="border-l-4 border-blue-500 pl-4 py-2">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium text-lg text-blue-600">{getProductName(venda.produto_id)}</p>
                      <div className="flex gap-6 text-sm text-muted-foreground mt-1">
                        <span>Quantidade: 1</span>
                        <span>Preço Unit.: {formatCurrency(venda.valor_total - (venda.juros || 0) + (venda.desconto || 0))}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm text-muted-foreground">Total:</span>
                      <p className="font-bold text-lg">{formatCurrency(venda.valor_total - (venda.juros || 0) + (venda.desconto || 0))}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border-l-4 border-gray-400 pl-4 py-2">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium text-lg text-gray-600">Venda sem produto específico</p>
                      <div className="flex gap-6 text-sm text-muted-foreground mt-1">
                        <span>Quantidade: 1</span>
                        <span>Preço Unit.: {formatCurrency(venda.valor_total)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm text-muted-foreground">Total:</span>
                      <p className="font-bold text-lg">{formatCurrency(venda.valor_total)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Observações */}
          {venda.observacoes && venda.observacoes.trim() !== '' && (
            <div className="border rounded-lg p-4">
              <label className="text-sm font-medium text-muted-foreground">Observações:</label>
              <p className="text-lg mt-2 p-3 bg-muted rounded-md">{venda.observacoes}</p>
            </div>
          )}

          {/* Detalhes das Parcelas - Mostrar apenas se houver parcelas */}
          {parcelasVenda.length > 0 && (
            <div className="border rounded-lg p-4">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-blue-600 mb-4">
                📅 Detalhes das Parcelas
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Parcela</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Valor Pago</TableHead>
                    <TableHead>Valor Restante</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Data Pagamento</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parcelasVenda
                    .sort((a, b) => a.numero_parcela - b.numero_parcela)
                    .map((parcela) => {
                      const valorPago = parcela.valor_pago || 0;
                      const valorRestante = valorPago > 0 ? Math.max(0, parcela.valor_parcela - valorPago) : 0;
                      return (
                        <TableRow key={parcela.id}>
                          <TableCell>
                            {parcela.numero_parcela === 0 ? 'Entrada' : `${parcela.numero_parcela}° parcela`}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
                              Parcela
                            </Badge>
                          </TableCell>
                          <TableCell className="bg-transparent">
                            {formatCurrency(parcela.valor_parcela)}
                          </TableCell>
                          <TableCell className="bg-transparent">
                            {formatCurrency(valorPago)}
                          </TableCell>
                          <TableCell className="bg-transparent">
                            {formatCurrency(valorRestante)}
                          </TableCell>
                          <TableCell>
                            {formatDate(parcela.data_vencimento)}
                          </TableCell>
                          <TableCell>
                            {parcela.data_pagamento ? formatDate(parcela.data_pagamento) : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={parcela.status === 'pago' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-yellow-50 text-yellow-600 border-yellow-200'}>
                              {parcela.status === 'pago' ? 'pago' : 'pendente'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}