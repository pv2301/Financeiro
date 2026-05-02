import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Upload, CheckCircle2, AlertTriangle, FileSpreadsheet, Plus, Loader2 } from 'lucide-react';
import * as xlsx from 'xlsx';
import { Student, ConsumptionRecord, ClassInfo } from '../types';
import { finance } from '../services/finance';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  classes: ClassInfo[];
  monthYear: string;
  onSuccess: (importedIds: string[]) => void;
}

interface ParsedResult {
  periodLabel: string;
  records: ConsumptionRecord[];
  unmatchedNames: string[];
  fileNames: string[];
}

export default function ImportConsumptionModal({ isOpen, onClose, students, classes, monthYear, onSuccess }: Props) {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ParsedResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetAndClose = () => {
    setFiles([]);
    setResult(null);
    setError(null);
    setIsProcessing(false);
    setIsSaving(false);
    setDragActive(false);
    onClose();
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const dropped = Array.from(e.dataTransfer.files).filter(f => f.name.match(/\.xlsx?$/i));
    if (dropped.length > 0) processFiles(dropped);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length > 0) processFiles(selected);
    // Reset input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const normalizeString = (str: string) => 
    str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

  const cleanName = (name: string) => {
    // Remove parênteses e conteúdo (turmas ou info extra)
    let cleaned = name.replace(/\s*\(.*?\)\s*/g, ' ');
    // Remove "total" do início e "por cardápio" do fim
    cleaned = cleaned.replace(/^total\s+/i, '').replace(/por cardápio/i, '');
    return normalizeString(cleaned);
  };

  const findStudent = (rawName: string) => {
    const cleanedRaw = cleanName(rawName);
    if (!cleanedRaw) return null;

    // 1. Busca exata (normalizada)
    let match = students.find(s => normalizeString(s.name) === cleanedRaw);
    if (match) return match;

    // 2. Busca por inclusão
    match = students.find(s => {
      const sName = normalizeString(s.name);
      return sName.includes(cleanedRaw) || cleanedRaw.includes(sName);
    });
    
    return match || null;
  };

  const parseSingleFile = async (file: File): Promise<{ records: Map<string, ConsumptionRecord>, unmatched: Set<string>, periodLabel: string }> => {
    const data = await file.arrayBuffer();
    const workbook = xlsx.read(data, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json<any[]>(firstSheet, { header: 1 });

    let periodLabel = '';
    let detectedMonthYear = monthYear.replace('/', '-'); // Default fallback
    let serviceNames: string[] = [];
    const studentMap = new Map<string, ConsumptionRecord>();
    const unmatched = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      // Detect Period and Extract Month/Year
      if (typeof row[1] === 'string' && row[1].includes('Período:')) {
        periodLabel = row[2] || row[1].replace('Período:', '').trim();
        // Tenta extrair mm/yyyy de algo como "01/04/2026"
        const dateMatch = periodLabel.match(/(\d{2})\/(\d{4})/);
        if (dateMatch) {
          detectedMonthYear = `${dateMatch[1]}-${dateMatch[2]}`;
        }
        continue;
      }

      if (typeof row[2] === 'string' && (row[2].toLowerCase().includes('lanche') || row[2].toLowerCase().includes('almoço'))) {
        serviceNames = [];
        for (let col = 2; col < row.length; col++) {
          const colName = String(row[col]);
          if (colName.toLowerCase().includes('total')) break;
          serviceNames.push(colName.split('-')[0].trim());
        }
        continue;
      }

      // Check for Student Total row
      if (typeof row[0] === 'string' && row[0].toLowerCase().startsWith('total')) {
        const rawName = row[0];
        const student = findStudent(rawName);
        if (!student) { 
          unmatched.add(rawName.replace(/^total\s+/i, '').replace(/por cardápio/i, '').trim()); 
          continue; 
        }

        const recordId = `${student.id}_${detectedMonthYear}`;
        if (!studentMap.has(recordId)) {
          studentMap.set(recordId, {
            id: recordId,
            studentId: student.id,
            monthYear: detectedMonthYear,
            periodLabel: periodLabel,
            summary: {},
            dailyDetails: []
          });
        }

        const record = studentMap.get(recordId)!;
        
        // Reset summary if we are using the TOTAL row as the source of truth
        record.summary = {};

        serviceNames.forEach((svc, index) => {
          const qty = Number(row[index + 2]) || 0;
          if (qty > 0) {
            record.summary[svc] = qty;
          }
        });
        
        continue;
      }

      // Collect daily details if needed for history, but summary comes from TOTAL row above
      if (typeof row[0] === 'string' && row[0].trim() !== '' && typeof row[1] === 'string' && row[1].includes('/')) {
        const rawName = row[0];
        const student = findStudent(rawName);
        if (!student) continue;

        const recordId = `${student.id}_${detectedMonthYear}`;
        if (!studentMap.has(recordId)) {
          studentMap.set(recordId, {
            id: recordId,
            studentId: student.id,
            monthYear: detectedMonthYear,
            periodLabel: periodLabel,
            summary: {},
            dailyDetails: []
          });
        }

        const record = studentMap.get(recordId)!;
        const date = row[1];
        const dailyItems: { serviceName: string, quantity: number }[] = [];

        serviceNames.forEach((svc, index) => {
          const qty = Number(row[index + 2]) || 0;
          if (qty > 0) {
            dailyItems.push({ serviceName: svc, quantity: qty });
            // We DON'T add to summary here because we'll use the TOTAL row
          }
        });

        if (dailyItems.length > 0) {
          record.dailyDetails.push({ date, items: dailyItems });
        }
      }
    }

    return { records: studentMap, unmatched, periodLabel };
  };

  const processFiles = async (selectedFiles: File[]) => {
    setFiles(prev => [...prev, ...selectedFiles]);
    setIsProcessing(true);
    setError(null);

    try {
      // Merge results from all files
      const mergedMap = new Map<string, ConsumptionRecord>();
      const allUnmatched = new Set<string>();
      let combinedPeriod = '';
      const fileNames = selectedFiles.map(f => f.name);

      for (const file of selectedFiles) {
        const { records, unmatched, periodLabel } = await parseSingleFile(file);
        if (periodLabel) combinedPeriod = periodLabel;

        records.forEach((rec, key) => {
          if (mergedMap.has(key)) {
            // Merge summaries
            const existing = mergedMap.get(key)!;
            Object.entries(rec.summary).forEach(([svc, qty]) => {
              existing.summary[svc] = (existing.summary[svc] || 0) + qty;
            });
            existing.dailyDetails.push(...rec.dailyDetails);
          } else {
            mergedMap.set(key, rec);
          }
        });

        unmatched.forEach(n => allUnmatched.add(n));
      }

      const records = Array.from(mergedMap.values())
        .filter(r => Object.keys(r.summary).length > 0);
      
      records.forEach(r => r.periodLabel = combinedPeriod);

      setResult(prev => {
        if (!prev) {
          return { periodLabel: combinedPeriod, records, unmatchedNames: Array.from(allUnmatched), fileNames };
        }
        // Merge with previous result if already has one
        const existingMap = new Map(prev.records.map(r => [r.id, r]));
        records.forEach(rec => {
          if (existingMap.has(rec.id)) {
            const existing = existingMap.get(rec.id)!;
            Object.entries(rec.summary).forEach(([svc, qty]) => {
              existing.summary[svc] = (existing.summary[svc] || 0) + qty;
            });
          } else {
            existingMap.set(rec.id, rec);
          }
        });
        const combinedUnmatched = [...new Set([...prev.unmatchedNames, ...Array.from(allUnmatched)])];
        return {
          periodLabel: combinedPeriod || prev.periodLabel,
          records: Array.from(existingMap.values()),
          unmatchedNames: combinedUnmatched,
          fileNames: [...prev.fileNames, ...fileNames]
        };
      });

    } catch (err: any) {
      console.error('Erro ao processar planilha:', err);
      setError('Falha ao ler um ou mais arquivos. Verifique se estão no formato correto.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = async () => {
    if (!result || result.records.length === 0) return;
    setIsSaving(true);
    try {
      await finance.saveConsumptionRecords(result.records);
      const importedIds = result.records.map(r => r.studentId);
      onSuccess(importedIds);
      resetAndClose();
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
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-blue/10 rounded-xl flex items-center justify-center text-brand-blue">
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Importar Consumo</h2>
                  <p className="text-sm text-slate-500 font-medium">Relatório do sistema — múltiplas planilhas aceitas</p>
                </div>
              </div>
              <button onClick={resetAndClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              {/* Drop Zone — always visible so user can add more files */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all cursor-pointer
                  ${dragActive ? 'border-brand-blue bg-brand-blue/5' : 'border-slate-200 hover:border-brand-blue/40 hover:bg-slate-50'}
                  ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xls,.xlsx"
                  multiple
                  onChange={handleFileInput}
                  className="hidden"
                  disabled={isProcessing}
                />
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 transition-colors ${dragActive ? 'bg-brand-blue text-white' : 'bg-slate-100 text-slate-400'}`}>
                  {isProcessing ? (
                    <Loader2 size={28} className="animate-spin text-brand-blue" />
                  ) : result ? (
                    <Plus size={28} />
                  ) : (
                    <Upload size={28} />
                  )}
                </div>
                <p className="font-bold text-slate-700 text-base">
                  {isProcessing ? 'Processando planilhas...' : result ? 'Adicionar mais planilhas' : 'Clique ou arraste as planilhas aqui'}
                </p>
                <p className="text-slate-400 text-sm mt-1">Formato .xls ou .xlsx — múltiplos arquivos permitidos</p>
              </div>

              {/* Files loaded list */}
              {result && result.fileNames.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {result.fileNames.map((name, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1.5 rounded-full">
                      <CheckCircle2 size={12} />
                      {name}
                    </span>
                  ))}
                </div>
              )}

              {/* Result */}
              {result && (
                <div className="bg-emerald-50 text-emerald-700 p-6 rounded-3xl border border-emerald-100">
                  <div className="flex items-center gap-3 mb-4">
                    <CheckCircle2 size={24} className="text-emerald-500" />
                    <h3 className="text-lg font-bold">Leitura Concluída</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-white p-4 rounded-2xl border border-emerald-100/50">
                      <p className="text-xs font-bold uppercase tracking-wider text-emerald-600/60 mb-1">Período Detectado</p>
                      <p className="font-black text-slate-800 text-sm">{result.periodLabel || 'Não identificado'}</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-emerald-100/50">
                      <p className="text-xs font-bold uppercase tracking-wider text-emerald-600/60 mb-1">Alunos Identificados</p>
                      <p className="font-black text-slate-800 text-2xl">{result.records.length}</p>
                    </div>
                  </div>

                  {result.records.length > 0 && (
                    <div className="bg-white p-4 rounded-2xl border border-emerald-100/50">
                      <p className="text-xs font-bold uppercase tracking-wider text-emerald-600/60 mb-2">Alunos com Consumo Registrado:</p>
                      <div className="max-h-36 overflow-y-auto pr-1">
                        <ul className="list-disc pl-4 space-y-1">
                          {result.records.map(rec => {
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
              )}

              {/* Unmatched */}
              {result && result.unmatchedNames.length > 0 && (
                <div className="bg-amber-50 p-5 rounded-3xl border border-amber-100">
                  <div className="flex items-center gap-2 mb-2 text-amber-700">
                    <AlertTriangle size={18} />
                    <h4 className="font-bold text-sm">Não encontrados ({result.unmatchedNames.length})</h4>
                  </div>
                  <p className="text-xs text-amber-600/80 mb-3">Nomes da planilha não encontrados no sistema — serão ignorados:</p>
                  <div className="bg-white/50 rounded-2xl p-3 max-h-32 overflow-y-auto text-xs text-amber-800 font-medium">
                    <ul className="list-disc pl-4 space-y-1">
                      {result.unmatchedNames.map(name => <li key={name}>{name}</li>)}
                    </ul>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded-2xl flex gap-3 text-sm font-medium">
                  <AlertTriangle size={20} className="shrink-0" />
                  {error}
                </div>
              )}

              {/* Actions */}
              {result && (
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={resetAndClose}
                    disabled={isSaving}
                    className="flex-1 py-3 px-4 rounded-xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={isSaving || result.records.length === 0}
                    className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-brand-blue hover:bg-blue-600 disabled:opacity-50 transition-all shadow-lg shadow-brand-blue/20 flex items-center justify-center gap-3"
                  >
                    {isSaving ? (
                      <><Loader2 size={18} className="animate-spin" /> Salvando...</>
                    ) : (
                      `Confirmar ${result.records.length} alunos`
                    )}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
