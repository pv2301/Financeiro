import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Check, Upload, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Student, ClassInfo, StudentImportResult } from '../types';
import { finance } from '../services/finance';
import * as XLSX from 'xlsx';

// Column mapping from Excel headers to Student fields
const COLUMN_MAP: Record<string, { field: string; label: string; default: boolean }> = {
  'car':              { field: 'segment',        label: 'Segmento (car)',         default: true },
  'SERIE_TURMA':      { field: 'classId',        label: 'Série/Turma',           default: true },
  'ALUNO':            { field: 'name',           label: 'Nome do Aluno',         default: true },
  'DATANASCALUNO':    { field: 'birthDate',      label: 'Data de Nascimento',    default: true },
  'NOME_RESPONS_FIN': { field: 'responsibleName',label: 'Responsável Financeiro',default: true },
  'CPF_RESP_FIN':     { field: 'responsibleCpf', label: 'CPF do Responsável',    default: true },
  'TELEX':            { field: 'landlinePhone',  label: 'Telefone Fixo',         default: true },
  'TEL_RESP':         { field: 'contactPhone',   label: 'Telefone/WhatsApp',     default: true },
  'EMAIL_RESP':       { field: 'contactEmail',   label: 'Email do Responsável',  default: true },
  'MAE':              { field: 'motherName',     label: 'Nome da Mãe',           default: false },
  'CPF_MAE':          { field: 'motherCpf',      label: 'CPF da Mãe',            default: false },
  'EMAIL_MAE':        { field: 'motherEmail',    label: 'Email da Mãe',          default: false },
  'PAI':              { field: 'fatherName',     label: 'Nome do Pai',            default: false },
  'CPF_PAI':          { field: 'fatherCpf',      label: 'CPF do Pai',             default: false },
  'EMAIL_PAI':        { field: 'fatherEmail',    label: 'Email do Pai',           default: false },
  'TEL_MAE1':         { field: 'motherPhone1',   label: 'Telefone Mãe 1',        default: false },
  'TEL_MAE2':         { field: 'motherPhone2',   label: 'Telefone Mãe 2',        default: false },
  'TEL_PAI1':         { field: 'fatherPhone1',   label: 'Telefone Pai 1',        default: false },
  'TEL_PAI2':         { field: 'fatherPhone2',   label: 'Telefone Pai 2',        default: false },
};

function generateFilenameSuffix(name: string): string {
  return name
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '')
    .toUpperCase() + '_';
}

type Step = 'SELECT_COLUMNS' | 'CONFIRM_CLASSES' | 'RESULT';

interface Props {
  existingClasses: ClassInfo[];
  onClose: () => void;
  onComplete: () => void;
}

export default function ImportStudentsModal({ existingClasses, onClose, onComplete }: Props) {
  const [step, setStep] = useState<Step>('SELECT_COLUMNS');
  const [rows, setRows] = useState<any[]>([]);
  const [detectedCols, setDetectedCols] = useState<string[]>([]);
  const [selectedCols, setSelectedCols] = useState<Set<string>>(new Set());
  const [classChanges, setClassChanges] = useState<{ name: string; isNew: boolean; existingName?: string }[]>([]);
  const [result, setResult] = useState<StudentImportResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(ws);
    if (json.length === 0) return alert('Planilha vazia.');
    setRows(json);
    const cols = Object.keys(json[0] as object);
    setDetectedCols(cols);
    // Pre-select default columns that exist in the file
    const defaults = new Set<string>();
    cols.forEach(c => { if (COLUMN_MAP[c]?.default) defaults.add(c); });
    setSelectedCols(defaults);
  };

  const toggleCol = (col: string) => {
    const next = new Set(selectedCols);
    next.has(col) ? next.delete(col) : next.add(col);
    setSelectedCols(next);
  };

  const proceedToConfirm = () => {
    if (!selectedCols.has('ALUNO') && !selectedCols.has('SERIE_TURMA')) {
      return alert('Selecione pelo menos ALUNO e SERIE_TURMA.');
    }
    // Detect class changes
    const classNames = new Set<string>();
    rows.forEach(r => {
      const raw = String(r['SERIE_TURMA'] || '').trim();
      if (raw) classNames.add(raw);
    });
    const changes = Array.from(classNames).map(name => {
      const existing = existingClasses.find(c => c.name.toLowerCase() === name.toLowerCase());
      return { name, isNew: !existing, existingName: existing?.name };
    });
    setClassChanges(changes);
    setStep('CONFIRM_CLASSES');
  };

  const executeImport = async () => {
    setLoading(true);
    try {
      const newClasses: ClassInfo[] = [];
      const classLookup = new Map(existingClasses.map(c => [c.name.toLowerCase(), c]));

      // Create new classes
      classChanges.filter(c => c.isNew).forEach(c => {
        const id = c.name.replace(/\s+/g, '_').toUpperCase();
        const segmentRow = rows.find(r => String(r['SERIE_TURMA'] || '').trim() === c.name);
        const seg = String(segmentRow?.['car'] || '').trim();
        const nc: ClassInfo = {
          id, name: c.name, segment: seg,
          billingMode: 'ANTICIPATED_FIXED', basePrice: 0,
          applyAbsenceDiscount: false, discountPerAbsence: 0,
          collegeSharePercent: 20, scholasticDays: {},
        };
        newClasses.push(nc);
        classLookup.set(c.name.toLowerCase(), nc);
      });

      // Build students
      const students: Student[] = rows.map(r => {
        const name = String(r['ALUNO'] || '').trim();
        const className = String(r['SERIE_TURMA'] || '').trim();
        const cls = classLookup.get(className.toLowerCase());
        if (!name || !cls) return null;
        const cpf = String(r['CPF_RESP_FIN'] || '').trim();
        const s: Student = {
          id: cpf || crypto.randomUUID(),
          name,
          classId: cls.id,
          segment: String(r['car'] || '').trim(),
          birthDate: r['DATANASCALUNO'] ? new Date(r['DATANASCALUNO']).toISOString() : '',
          responsibleName: selectedCols.has('NOME_RESPONS_FIN') ? String(r['NOME_RESPONS_FIN'] || '') : '',
          responsibleCpf: cpf,
          contactPhone: selectedCols.has('TEL_RESP') ? String(r['TEL_RESP'] || '') : '',
          contactEmail: selectedCols.has('EMAIL_RESP') ? String(r['EMAIL_RESP'] || '') : '',
          landlinePhone: selectedCols.has('TELEX') ? String(r['TELEX'] || '') : '',
          motherName: selectedCols.has('MAE') ? String(r['MAE'] || '') : undefined,
          motherCpf: selectedCols.has('CPF_MAE') ? String(r['CPF_MAE'] || '') : undefined,
          motherEmail: selectedCols.has('EMAIL_MAE') ? String(r['EMAIL_MAE'] || '') : undefined,
          motherPhone1: selectedCols.has('TEL_MAE1') ? String(r['TEL_MAE1'] || '') : undefined,
          motherPhone2: selectedCols.has('TEL_MAE2') ? String(r['TEL_MAE2'] || '') : undefined,
          fatherName: selectedCols.has('PAI') ? String(r['PAI'] || '') : undefined,
          fatherCpf: selectedCols.has('CPF_PAI') ? String(r['CPF_PAI'] || '') : undefined,
          fatherEmail: selectedCols.has('EMAIL_PAI') ? String(r['EMAIL_PAI'] || '') : undefined,
          fatherPhone1: selectedCols.has('TEL_PAI1') ? String(r['TEL_PAI1'] || '') : undefined,
          fatherPhone2: selectedCols.has('TEL_PAI2') ? String(r['TEL_PAI2'] || '') : undefined,
          personalDiscount: 0,
          hasTimelyPaymentDiscount: false,
          filenameSuffix: generateFilenameSuffix(name),
        };
        return s;
      }).filter(Boolean) as Student[];

      if (newClasses.length > 0) await finance.mergeBatchClasses(newClasses);
      if (students.length > 0) await finance.mergeBatchStudents(students);

      setResult({
        studentsAdded: students,
        studentsUpdated: [],
        classesCreated: newClasses,
        classesRenamed: [],
        totalStudents: students.length,
      });
      setStep('RESULT');
    } catch (err) {
      console.error(err);
      alert('Erro na importação: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-start justify-center pt-8 px-4 overflow-y-auto">
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl mb-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-xl font-black text-slate-800">Importar Alunos</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 rounded-xl"><X size={20} /></button>
        </div>

        <div className="p-6">
          {/* STEP 1: Select columns */}
          {step === 'SELECT_COLUMNS' && (
            <div className="space-y-5">
              {rows.length === 0 ? (
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl p-10 cursor-pointer hover:border-brand-blue/40 transition-colors">
                  <Upload size={32} className="text-slate-300 mb-3" />
                  <span className="font-bold text-slate-500">Selecione a planilha Excel</span>
                  <span className="text-xs text-slate-400 mt-1">LISTA ALUNOS CFC BABY ao 5º ANO.xlsx</span>
                  <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
                </label>
              ) : (
                <>
                  <p className="text-sm text-slate-500"><strong>{rows.length}</strong> linhas detectadas. Selecione as colunas para importar:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[50vh] overflow-y-auto">
                    {detectedCols.map(col => {
                      const mapped = COLUMN_MAP[col];
                      return (
                        <button key={col} onClick={() => toggleCol(col)}
                          className={`flex items-center gap-3 p-3 rounded-xl border text-left text-sm transition-all ${selectedCols.has(col) ? 'border-brand-blue bg-brand-blue/5' : 'border-slate-200'}`}>
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${selectedCols.has(col) ? 'border-brand-blue bg-brand-blue' : 'border-slate-300'}`}>
                            {selectedCols.has(col) && <Check size={12} className="text-white" />}
                          </div>
                          <div>
                            <p className="font-bold text-slate-700">{mapped?.label || col}</p>
                            <p className="text-[10px] text-slate-400">{col}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex justify-end">
                    <button onClick={proceedToConfirm} className="px-6 py-3 bg-brand-blue text-white rounded-2xl font-black text-sm">Avançar</button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* STEP 2: Confirm class changes */}
          {step === 'CONFIRM_CLASSES' && (
            <div className="space-y-5">
              <p className="text-sm text-slate-500 font-medium">Confirme as turmas que serão criadas ou atualizadas:</p>
              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {classChanges.map(c => (
                  <div key={c.name} className={`flex items-center gap-3 p-4 rounded-2xl border ${c.isNew ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
                    {c.isNew ? <AlertTriangle size={18} className="text-amber-500 flex-shrink-0" /> : <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0" />}
                    <div>
                      <p className="font-bold text-slate-800">{c.name}</p>
                      <p className="text-xs text-slate-500">{c.isNew ? 'Nova turma — será criada automaticamente' : 'Turma existente — alunos serão vinculados'}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between">
                <button onClick={() => setStep('SELECT_COLUMNS')} className="px-5 py-3 text-slate-500 font-bold rounded-2xl hover:bg-slate-100">Voltar</button>
                <button onClick={executeImport} disabled={loading} className="px-6 py-3 bg-brand-blue text-white rounded-2xl font-black text-sm disabled:opacity-50">
                  {loading ? 'Importando...' : `Importar ${rows.length} Alunos`}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Result */}
          {step === 'RESULT' && result && (
            <div className="space-y-5">
              <div className="text-center py-4">
                <CheckCircle2 size={48} className="mx-auto text-emerald-500 mb-3" />
                <h3 className="text-xl font-black text-slate-800">Importação Concluída!</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-50 rounded-2xl p-4 text-center">
                  <p className="text-2xl font-black text-emerald-600">{result.totalStudents}</p>
                  <p className="text-xs font-bold text-emerald-500">Alunos Importados</p>
                </div>
                <div className="bg-amber-50 rounded-2xl p-4 text-center">
                  <p className="text-2xl font-black text-amber-600">{result.classesCreated.length}</p>
                  <p className="text-xs font-bold text-amber-500">Turmas Criadas</p>
                </div>
              </div>
              {result.classesCreated.length > 0 && (
                <div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Novas Turmas</p>
                  <div className="flex flex-wrap gap-2">
                    {result.classesCreated.map(c => (
                      <span key={c.id} className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold">{c.name}</span>
                    ))}
                  </div>
                </div>
              )}
              <button onClick={() => { onComplete(); onClose(); }}
                className="w-full py-3 bg-brand-blue text-white rounded-2xl font-black text-sm">Fechar</button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
