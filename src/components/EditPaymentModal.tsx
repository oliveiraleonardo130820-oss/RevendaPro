import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toLocalISODate } from '@/lib/utils';

interface EditPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  installment: any;
  onSave: (id: string, valorPago: number, observacoes: string, dataValorPago: string) => void;
}

const EditPaymentModal: React.FC<EditPaymentModalProps> = ({
  isOpen,
  onClose,
  installment,
  onSave,
}) => {
  const [valorPago, setValorPago] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [dataValorPago, setDataValorPago] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (installment) {
      setValorPago(installment.valor_pago?.toString() || '0');
      setObservacoes(installment.observacoes || '');
      setDataValorPago(installment.data_valor_pago || toLocalISODate());
    }
  }, [installment]);

  const handleSave = async () => {
    if (!installment) return;

    const valorPagoNumber = parseFloat(valorPago) || 0;
    
    if (valorPagoNumber < 0) {
      alert('O valor pago não pode ser negativo');
      return;
    }

    setLoading(true);
    try {
      await onSave(installment.id, valorPagoNumber, observacoes, dataValorPago);
      onClose();
    } catch (error) {
      console.error('Erro ao salvar:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!installment) return null;

  const valorParcela = Number(installment.valor_parcela);
  const valorPagoNumber = parseFloat(valorPago) || 0;
  const valorRestante = Math.max(0, valorParcela - valorPagoNumber);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Pagamento da Parcela</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Valor da Parcela (não editável) */}
          <div className="space-y-2">
            <Label htmlFor="valor-parcela">Valor da Parcela</Label>
            <Input
              id="valor-parcela"
              value={`R$ ${valorParcela.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`}
              disabled
              className="bg-gray-50"
            />
          </div>

          {/* Valor Pago (editável) */}
          <div className="space-y-2">
            <Label htmlFor="valor-pago">Valor Pago</Label>
            <Input
              id="valor-pago"
              type="number"
              step="0.01"
              min="0"
              value={valorPago}
              onChange={(e) => setValorPago(e.target.value)}
              placeholder="0,00"
            />
          </div>

          {/* Valor Restante (calculado) */}
          <div className="space-y-2">
            <Label htmlFor="valor-restante">Valor Restante</Label>
            <Input
              id="valor-restante"
              value={`R$ ${valorRestante.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`}
              disabled
              className="bg-gray-50"
            />
          </div>

          {/* Data do Valor Pago */}
          <div className="space-y-2">
            <Label htmlFor="data-valor-pago">Data Valor Pago</Label>
            <Input
              id="data-valor-pago"
              type="date"
              value={dataValorPago}
              onChange={(e) => setDataValorPago(e.target.value)}
            />
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações (opcional)</Label>
            <Textarea
              id="observacoes"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Adicione observações sobre o pagamento..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditPaymentModal;