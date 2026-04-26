import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Upload, CheckCircle2, AlertTriangle, XCircle, X, FileSpreadsheet } from 'lucide-react';
import { PaymentImportResult } from '../types';
import { finance } from '../services/finance';
import * as XLSX from 'xlsx';
import { cn } from '../lib/utils';

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

      const bankRows = json.map(row => {
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
        throw new Error('Nenhuma linha válida encontrada na planilha.');
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
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center px-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[3rem] shadow-2xl w-full max-w-xl overflow-hidden max-h-[90vh] flex flex-col border border-slate-100"
      >
        {/* --- Glass Header --- */}
        <div className="flex items-center justify-between p-8 border-b border-slate-50 bg-slate-50/50">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-emerald-500/20">
              <FileSpreadsheet size={28} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase">Baixa Bancária</h2>
              <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-0.5">Sincronização via Retorno (.xlsx)</p>
            </div>
          </div>
          <button 
            onClick={handleClose} 
            className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-8 space-y-8 overflow-y-auto flex-1 custom-scrollbar">
          {!result ? (
            <div className="text-center py-12 border-4 border-dashed border-slate-100 rounded-[2.5rem] bg-slate-50/30 group hover:border-brand-blue/20 transition-all">
              <input type="file" accept=".xls,.xlsx" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
              <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-sm border border-slate-100 mx-auto mb-6 group-hover:scale-110 transition-transform">
                <Upload size={32} className="text-slate-300 group-hover:text-brand-blue transition-colors" />
              </div>
              <h3 className="text-sm font-black text-slate-700 uppercase tracking-tight mb-2">Selecione o arquivo do banco</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8 px-10">Cobranca_Titulos_Liquidacao.xlsx</p>
              
              <button 
                onClick={() => fileInputRef.current?.click()} 
                disabled={isProcessing}
                className="bg-brand-blue text-white px-10 py-4 rounded-2xl font-black text-xs hover:bg-brand-blue/90 transition-all shadow-xl shadow-brand-blue/20 disabled:opacity-50 uppercase tracking-widest flex items-center gap-3 mx-auto"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Upload size={18} />
                    Selecionar Planilha
                  </>
                )}
              </button>
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8"
            >
              {/* --- Dashboard Results --- */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Baixados', value: result.processed, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', accent: 'bg-emerald-500' },
                  { label: 'Divergentes', value: result.divergences, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', accent: 'bg-amber-500' },
                  { label: 'Ignorados', value: result.notFound, icon: XCircle, color: 'text-red-500', bg: 'bg-red-50', accent: 'bg-red-500' },
                ].map((stat, i) => (
                  <div key={i} className={cn("p-5 rounded-[2rem] text-center border border-slate-50 relative overflow-hidden", stat.bg)}>
                    <div className={cn("absolute top-0 left-0 w-full h-1 opacity-40", stat.accent)} />
                    <stat.icon size={24} className={cn("mx-auto mb-2", stat.color)} />
                    <p className={cn("text-2xl font-black tracking-tighter leading-none", stat.color)}>{stat.value}</p>
                    <p className={cn("text-[9px] font-black uppercase tracking-widest mt-2", stat.color, "opacity-70")}>{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* --- Detailed Report --- */}
              <div className="bg-slate-50 rounded-[2rem] p-6 border border-slate-100">
                <div className="flex items-center justify-between mb-6 px-2">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Relatório de Processamento</h4>
                  <span className="text-[10px] font-bold text-slate-300">{result.details.length} itens</span>
                </div>
                
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {result.details.map((d, i) => (
                    <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Nosso Nº {d.nossoNumero}</p>
                        <h5 className="text-xs font-black text-slate-700 uppercase truncate">{d.studentName || 'Não Identificado'}</h5>
                      </div>
                      <div className="text-right">
                        {d.status === 'OK' && (
                          <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                            <CheckCircle2 size={12} /> OK
                          </div>
                        )}
                        {d.status === 'NOT_FOUND' && (
                          <div className="flex items-center gap-1.5 text-red-500 bg-red-50 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-red-100">
                            <XCircle size={12} /> Falha
                          </div>
                        )}
                        {d.status === 'VALUE_DIVERGENCE' && (
                          <div className="flex flex-col items-end">
                            <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-amber-100">
                              <AlertTriangle size={12} /> Divergência
                            </div>
                            <span className="text-[9px] font-bold text-amber-500 mt-1 uppercase tracking-tighter">{d.divergenceNote}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* --- Footer --- */}
        <div className="p-8 border-t border-slate-50 bg-white sticky bottom-0">
          <button 
            onClick={handleClose}
            className="w-full px-8 py-4 rounded-2xl font-black text-xs bg-slate-900 text-white hover:bg-black transition-all shadow-xl shadow-slate-900/10 uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95"
          >
            {result ? (
              <>
                <CheckCircle2 size={18} />
                Concluir e Sincronizar
              </>
            ) : (
              'Cancelar Importação'
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
