import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Upload, CheckCircle2, AlertTriangle, XCircle, X, FileSpreadsheet } from 'lucide-react';
import { PaymentImportResult } from '../types';
import { finance } from '../services/finance';
import * as XLSX from 'xlsx';

interface Props {
  boletoFee: number;
  onClose: () => void;
  onComplete: () => void;
}

export default function ImportPaymentsModal({ boletoFee, onClose, onComplete }: Props) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<PaymentImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

      // Map bank columns to expected format
      const bankRows = json.map(row => {
        // Try common column names from bank files
        const nossoNumero = String(
          row['Nosso Número'] || row['NossoNumero'] || row['NOSSO NUMERO'] || row['Titulo'] || ''
        ).trim();
        
        const paymentDate = String(
          row['DT Liquidação'] || row['Data Pagamento'] || row['DT_LIQUIDACAO'] || row['Data'] || ''
        ).trim();
        
        const amountCharged = parseFloat(
          String(row['Vr cobrado'] || row['VR_COBRADO'] || row['Valor Pago'] || row['ValorPago'] || 0)
            .replace(',', '.')
        ) || 0;
        
        const oscilacao = parseFloat(
          String(row['Oscilação'] || row['Oscilacao'] || row['Diferença'] || 0)
            .replace(',', '.')
        ) || 0;
        
        const pagador = String(
          row['Pagador'] || row['Nome'] || row['Aluno'] || ''
        ).trim();

        return { nossoNumero, paymentDate, amountCharged, oscilacao, pagador };
      }).filter(r => r.nossoNumero && r.amountCharged > 0);

      if (bankRows.length === 0) {
        throw new Error('Nenhuma linha válida encontrada. Verifique se a planilha contém as colunas "Nosso Número" e "Vr cobrado".');
      }

      const importResult = await finance.processPaymentImport(bankRows, boletoFee);
      setResult(importResult);
      
    } catch (error: any) {
      alert(`Erro: ${error.message}`);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    if (result && result.processed > 0) {
      onComplete();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800">Importar Baixa Bancária</h2>
              <p className="text-xs text-slate-400">Planilha de retorno do banco (.xlsx)</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {!result ? (
            /* Upload area */
            <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-2xl">
              <input type="file" accept=".xls,.xlsx" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
              <Upload size={40} className="mx-auto mb-4 text-slate-300" />
              <button onClick={() => fileInputRef.current?.click()} disabled={isProcessing}
                className="bg-brand-blue text-white px-6 py-3 rounded-2xl font-black hover:bg-brand-blue/90 transition-all disabled:opacity-50">
                {isProcessing ? 'Processando...' : 'Selecionar Planilha'}
              </button>
              <p className="text-xs text-slate-400 mt-4">Ex: Cobranca_Titulos.xlsx, retorno bancário Bradesco</p>
            </div>
          ) : (
            /* Results */
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-emerald-50 rounded-2xl p-4 text-center">
                  <CheckCircle2 size={24} className="mx-auto text-emerald-600 mb-1" />
                  <p className="text-xl font-black text-emerald-700">{result.processed}</p>
                  <p className="text-[9px] font-black text-emerald-500 uppercase">Baixados</p>
                </div>
                <div className="bg-amber-50 rounded-2xl p-4 text-center">
                  <AlertTriangle size={24} className="mx-auto text-amber-600 mb-1" />
                  <p className="text-xl font-black text-amber-700">{result.divergences}</p>
                  <p className="text-[9px] font-black text-amber-500 uppercase">Divergências</p>
                </div>
                <div className="bg-red-50 rounded-2xl p-4 text-center">
                  <XCircle size={24} className="mx-auto text-red-500 mb-1" />
                  <p className="text-xl font-black text-red-600">{result.notFound}</p>
                  <p className="text-[9px] font-black text-red-400 uppercase">Não encontrados</p>
                </div>
              </div>

              {/* Detail table */}
              {result.details.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        <th className="pb-2 pr-3">Nosso Nº</th>
                        <th className="pb-2 pr-3">Aluno</th>
                        <th className="pb-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {result.details.map((d, i) => (
                        <tr key={i}>
                          <td className="py-2 pr-3 font-bold text-slate-600">{d.nossoNumero}</td>
                          <td className="py-2 pr-3 text-slate-500">{d.studentName || '—'}</td>
                          <td className="py-2">
                            {d.status === 'OK' && <span className="text-emerald-600 font-bold text-xs">✓ OK</span>}
                            {d.status === 'NOT_FOUND' && <span className="text-red-500 font-bold text-xs">✗ Não encontrado</span>}
                            {d.status === 'VALUE_DIVERGENCE' && (
                              <span className="text-amber-600 font-bold text-xs" title={d.divergenceNote}>⚠ {d.divergenceNote}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100">
          <button onClick={handleClose}
            className="w-full px-6 py-3 rounded-2xl font-black text-sm bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
            {result ? 'Fechar' : 'Cancelar'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
