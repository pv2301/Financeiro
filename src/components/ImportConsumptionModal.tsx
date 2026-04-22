import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Upload, CheckCircle2, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import * as xlsx from 'xlsx';
import { Student, ConsumptionRecord, ClassInfo } from '../types';
import { finance } from '../services/finance';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  classes: ClassInfo[];
  monthYear: string; // e.g. "04/2026"
  onSuccess: () => void;
}

interface ParsedResult {
  periodLabel: string;
  records: ConsumptionRecord[];
  unmatchedNames: string[];
}

export default function ImportConsumptionModal({ isOpen, onClose, students, classes, monthYear, onSuccess }: Props) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ParsedResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const cleanName = (name: string) => {
    return name.replace(/\s*\(.*?\)\s*/g, '').trim().toLowerCase();
  };

  const findStudent = (rawName: string) => {
    const cleanedRaw = cleanName(rawName);
    
    // Tentativa 1: Busca exata ignorando case e sufixo de turma
    let match = students.find(s => s.name.toLowerCase() === cleanedRaw);
    if (match) return match;

    // Tentativa 2: Busca parcial (se o nome da planilha estiver contido no nome do banco)
    match = students.find(s => s.name.toLowerCase().includes(cleanedRaw) || cleanedRaw.includes(s.name.toLowerCase()));
    return match || null;
  };

  const handleFile = async (selectedFile: File) => {
    setFile(selectedFile);
    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = xlsx.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = xlsx.utils.sheet_to_json<any[]>(firstSheet, { header: 1 });

      let periodLabel = '';
      let serviceNames: string[] = [];
      const studentMap = new Map<string, ConsumptionRecord>();
      const unmatched = new Set<string>();

      // A linha de cabeçalhos de serviços geralmente é a 5 (índice 4)
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;

        // Extrai Período (ex: "De 01/04/2026 até 30/04/2026")
        if (typeof row[1] === 'string' && row[1].includes('Período:')) {
          periodLabel = row[2] || row[1].replace('Período:', '').trim();
          continue;
        }

        // Detecta cabeçalhos de serviço (Lanche da Manhã, ALMOÇO - CFC BABY, etc)
        if (typeof row[2] === 'string' && (row[2].toLowerCase().includes('lanche') || row[2].toLowerCase().includes('almoço'))) {
          // Extraímos os nomes dos serviços da coluna 2 em diante, até achar 'Total'
          for (let col = 2; col < row.length; col++) {
            const colName = String(row[col]);
            if (colName.toLowerCase().includes('total')) break;
            
            // "ALMOÇO - CFC BABY" -> "ALMOÇO"
            const cleanedName = colName.split('-')[0].trim();
            serviceNames.push(cleanedName);
          }
          continue;
        }

        // Processa linhas de consumo
        // row[0] = Nome do aluno (com turma), row[1] = Data, row[2] = Lanche 1, etc.
        if (typeof row[0] === 'string' && row[0].trim() !== '' && typeof row[1] === 'string' && row[1].includes('/')) {
          const rawName = row[0];
          
          if (rawName.toLowerCase().startsWith('total')) continue;

          const student = findStudent(rawName);
          if (!student) {
            unmatched.add(rawName);
            continue;
          }

          const date = row[1];
          const recordId = `${student.id}_${monthYear.replace('/', '-')}`;

          if (!studentMap.has(recordId)) {
            studentMap.set(recordId, {
              id: recordId,
              studentId: student.id,
              monthYear: monthYear.replace('/', '-'), // Padroniza "04-2026"
              periodLabel: '',
              summary: {},
              dailyDetails: []
            });
          }

          const record = studentMap.get(recordId)!;
          
          const dailyItems: { serviceName: string, quantity: number }[] = [];
          
          // Mapeia colunas de serviço
          serviceNames.forEach((svc, index) => {
            const qty = Number(row[index + 2]) || 0;
            if (qty > 0) {
              dailyItems.push({ serviceName: svc, quantity: qty });
              record.summary[svc] = (record.summary[svc] || 0) + qty;
            }
          });

          if (dailyItems.length > 0) {
            record.dailyDetails.push({ date, items: dailyItems });
          }
        }
      }

      // Adiciona o periodLabel a todos
      const records = Array.from(studentMap.values());
      records.forEach(r => r.periodLabel = periodLabel);

      setResult({
        periodLabel,
        records,
        unmatchedNames: Array.from(unmatched)
      });

    } catch (err: any) {
      console.error('Erro ao processar planilha de consumo:', err);
      setError('Falha ao ler o arquivo. Verifique se é a planilha correta.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = async () => {
    if (!result || result.records.length === 0) return;
    setIsSaving(true);
    try {
      await finance.saveConsumptionRecords(result.records);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar os dados.');
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/40 backdrop-blur-sm pt-20 pb-20 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden my-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-blue/10 rounded-xl flex items-center justify-center text-brand-blue">
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Importar Consumo</h2>
                  <p className="text-sm text-slate-500 font-medium">Relatório do sistema</p>
                </div>
              </div>
              <button onClick={onClose} disabled={isSaving} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-8">
              {!result ? (
                <>
                  <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-3xl p-12 text-center transition-all
                      ${dragActive ? 'border-brand-blue bg-brand-blue/5' : 'border-slate-200 hover:border-brand-blue/30'}
                      ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    <input
                      type="file"
                      accept=".xls,.xlsx"
                      onChange={handleFileInput}
                      className="hidden"
                      id="consumption-upload"
                      disabled={isProcessing}
                    />
                    <label
                      htmlFor="consumption-upload"
                      className="cursor-pointer flex flex-col items-center gap-4"
                    >
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${dragActive ? 'bg-brand-blue text-white' : 'bg-slate-100 text-slate-400'}`}>
                        <Upload size={32} />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-slate-700">
                          {isProcessing ? 'Lendo planilha...' : 'Clique ou arraste a planilha aqui'}
                        </p>
                        <p className="text-slate-500 mt-1">Apenas formato .xls ou .xlsx</p>
                      </div>
                    </label>
                  </div>
                  {error && (
                    <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-2xl flex gap-3 text-sm font-medium">
                      <AlertTriangle size={20} className="shrink-0" />
                      {error}
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-6">
                  <div className="bg-emerald-50 text-emerald-700 p-6 rounded-3xl border border-emerald-100">
                    <div className="flex items-center gap-3 mb-4">
                      <CheckCircle2 size={24} className="text-emerald-500" />
                      <h3 className="text-lg font-bold">Leitura Concluída</h3>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-white p-4 rounded-2xl border border-emerald-100/50">
                        <p className="text-xs font-bold uppercase tracking-wider text-emerald-600/60 mb-1">Período Detectado</p>
                        <p className="font-black text-slate-800">{result.periodLabel || 'Não identificado'}</p>
                      </div>
                      <div className="bg-white p-4 rounded-2xl border border-emerald-100/50">
                        <p className="text-xs font-bold uppercase tracking-wider text-emerald-600/60 mb-1">Alunos Identificados</p>
                        <p className="font-black text-slate-800">{result.records.length}</p>
                      </div>
                    </div>

                    {result.records.length > 0 && (
                      <div className="bg-white p-4 rounded-2xl border border-emerald-100/50">
                        <p className="text-xs font-bold uppercase tracking-wider text-emerald-600/60 mb-2">Alunos Importados com Sucesso:</p>
                        <div className="max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                          <ul className="list-disc pl-4 space-y-1">
                            {result.records.map((rec) => {
                              const student = students.find(s => s.id === rec.studentId);
                              return (
                                <li key={rec.id} className="font-bold text-slate-800 text-sm">
                                  {student?.name}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>

                  {result.unmatchedNames.length > 0 && (
                    <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100">
                      <div className="flex items-center gap-2 mb-3 text-amber-700">
                        <AlertTriangle size={20} />
                        <h4 className="font-bold">Alunos não encontrados ({result.unmatchedNames.length})</h4>
                      </div>
                      <p className="text-sm text-amber-600/80 mb-3">
                        Estes nomes constam na planilha mas não foram localizados na base do sistema. Eles serão ignorados:
                      </p>
                      <div className="bg-white/50 rounded-2xl p-4 max-h-40 overflow-y-auto text-sm text-amber-800 font-medium">
                        <ul className="list-disc pl-4 space-y-1">
                          {result.unmatchedNames.map(name => (
                            <li key={name}>{name}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="p-4 bg-red-50 text-red-600 rounded-2xl flex gap-3 text-sm font-medium">
                      <AlertTriangle size={20} className="shrink-0" />
                      {error}
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setResult(null)}
                      disabled={isSaving}
                      className="flex-1 py-3 px-4 rounded-xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleConfirm}
                      disabled={isSaving || result.records.length === 0}
                      className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-brand-blue hover:bg-blue-600 disabled:opacity-50 transition-colors shadow-lg shadow-brand-blue/20"
                    >
                      {isSaving ? 'Salvando...' : 'Confirmar Importação'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
