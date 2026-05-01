import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertTriangle, Trash2, X, ChevronDown, ChevronRight,
  User, Users, Receipt, Calendar, RotateCcw, Loader2, CheckCircle2
} from 'lucide-react';
import { finance } from '../services/finance';
import { Student, ClassInfo } from '../types';

interface DeleteDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Category = 'students' | 'classes' | 'financial';

export default function DeleteDataModal({ isOpen, onClose, onSuccess }: DeleteDataModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [progress, setProgress] = useState<string | null>(null);

  // Cancellation flag: if the modal closes during deletion, we stop the loop
  const cancelledRef = useRef(false);

  // Data for selection
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [months, setMonths] = useState<string[]>([]);

  // Selection states
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);

  const [expanded, setExpanded] = useState<Category | null>(null);

  // Reset state completely when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      cancelledRef.current = false;
      setConfirmText('');
      setProgress(null);
      loadData();
    } else {
      // If modal closes mid-operation, signal cancellation and reset loading state
      cancelledRef.current = true;
      setIsLoading(false);
      setProgress(null);
    }
  }, [isOpen]);

  const loadData = async () => {
    setIsRefreshing(true);
    try {
      // Invalidate cache to ensure fresh data
      finance.invalidateCache();

      const [s, c, inv, drafts, consSnap] = await Promise.all([
        finance.getStudents(),
        finance.getClasses(),
        finance.getInvoices(),
        finance.getBillingDrafts(),
        finance.getConsumption()
      ]);

      setStudents(s);
      setClasses(c);

      // Extract unique months from all sources and normalize to MM/YYYY
      const monthsFromInv = inv.map(i => i.monthYear);
      const monthsFromCons = consSnap.map(c => c.monthYear);
      const monthsFromDrafts = drafts.map(d => d.id);

      const allRawMonths = [...monthsFromInv, ...monthsFromCons, ...monthsFromDrafts];

      const uniqueMonths = Array.from(new Set(allRawMonths))
        .filter(m => {
          if (!m || typeof m !== 'string') return false;
          return /\d{2,4}[/-]\d{2,4}/.test(m);
        })
        .map(m => m.replace('-', '/'))
        .sort((a, b) => {
          const [mA, yA] = a.split('/').map(Number);
          const [mB, yB] = b.split('/').map(Number);
          if (yA !== yB) return yA - yB;
          return mA - mB;
        });

      setMonths(uniqueMonths);
    } catch (err) {
      console.error('Error loading data for DeleteModal:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleToggleStudent = (id: string) => {
    setSelectedStudents(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleToggleClass = (id: string) => {
    setSelectedClasses(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleToggleMonth = (m: string) => {
    setSelectedMonths(prev =>
      prev.includes(m) ? prev.filter(i => i !== m) : [...prev, m]
    );
  };

  const handleDelete = async () => {
    if (confirmText !== 'EXCLUIR') return;

    cancelledRef.current = false;
    setIsLoading(true);
    setProgress('Iniciando...');

    try {
      // 1. Delete Financial Data by Month (sequential to allow cancellation)
      if (selectedMonths.length > 0 && !cancelledRef.current) {
        for (let i = 0; i < selectedMonths.length; i++) {
          if (cancelledRef.current) break;
          const m = selectedMonths[i];
          setProgress(`Excluindo dados de ${m} (${i + 1}/${selectedMonths.length})...`);
          await finance.deleteMonthlyData(m);
        }
      }

      // 2. Delete Students (parallel)
      if (selectedStudents.length > 0 && !cancelledRef.current) {
        setProgress(`Excluindo ${selectedStudents.length} aluno(s)...`);
        await finance.deleteStudents(selectedStudents);
      }

      // 3. Delete Classes and their students (parallel)
      if (selectedClasses.length > 0 && !cancelledRef.current) {
        setProgress(`Excluindo ${selectedClasses.length} turma(s)...`);
        await finance.deleteClasses(selectedClasses);
      }

      if (!cancelledRef.current) {
        setProgress('Concluído!');
        // Small delay so user sees "Concluído!" before modal closes
        await new Promise(r => setTimeout(r, 800));
        onSuccess();
        onClose();
      }
    } catch (error) {
      console.error('Error deleting data:', error);
      if (!cancelledRef.current) {
        setProgress('Erro ao excluir. Tente novamente.');
        await new Promise(r => setTimeout(r, 2000));
        setProgress(null);
      }
    } finally {
      setIsLoading(false);
      if (cancelledRef.current) setProgress(null);
    }
  };

  const handleCancel = () => {
    cancelledRef.current = true;
    setIsLoading(false);
    setProgress(null);
    onClose();
  };

  const totalSelected = selectedStudents.length + selectedClasses.length + selectedMonths.length;
  const canDelete = confirmText === 'EXCLUIR' && totalSelected > 0 && !isLoading;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={isLoading ? undefined : handleCancel}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-red-100"
        >
          {/* Header */}
          <div className="bg-red-50 p-6 flex items-center justify-between border-b border-red-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center text-red-600">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black text-red-900">Zona de Perigo</h2>
                <p className="text-red-700/70 text-sm font-medium">Exclusão permanente e irreversível de dados</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Refresh button with loading state */}
              <button
                onClick={loadData}
                disabled={isRefreshing || isLoading}
                className="p-2 hover:bg-red-100 rounded-xl transition-colors text-red-600 font-bold text-[10px] uppercase tracking-widest flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Atualizar dados do banco"
              >
                {isRefreshing
                  ? <Loader2 size={14} className="animate-spin" />
                  : <RotateCcw size={14} />
                }
                {isRefreshing ? 'Atualizando...' : 'Atualizar'}
              </button>
              <button
                onClick={handleCancel}
                disabled={false} /* Always allow close */
                className="p-2 hover:bg-red-100 rounded-xl transition-colors text-red-400"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">

            {/* 1. ALUNOS */}
            <div className="border border-slate-100 rounded-2xl overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === 'students' ? null : 'students')}
                className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <User size={20} className="text-slate-400" />
                  <span className="font-bold text-slate-700">
                    Alunos
                    {selectedStudents.length > 0 && (
                      <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-600 rounded-lg text-[10px] font-black">
                        {selectedStudents.length} selecionados
                      </span>
                    )}
                  </span>
                </div>
                {expanded === 'students' ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
              </button>
              {expanded === 'students' && (
                <div className="p-4 bg-white space-y-3">
                  <button
                    onClick={() => setSelectedStudents(selectedStudents.length === students.length ? [] : students.map(s => s.id))}
                    className="text-xs font-black text-red-600 uppercase tracking-widest hover:underline mb-2"
                  >
                    {selectedStudents.length === students.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                  </button>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-2">
                    {students.map(s => (
                      <label key={s.id} className="flex items-center gap-3 p-2 rounded-xl border border-slate-100 hover:border-red-200 hover:bg-red-50 transition-all cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(s.id)}
                          onChange={() => handleToggleStudent(s.id)}
                          className="w-5 h-5 rounded-lg border-2 border-slate-300 accent-red-600 cursor-pointer transition-all"
                        />
                        <span className="text-sm font-medium text-slate-700 truncate">{s.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 2. TURMAS */}
            <div className="border border-slate-100 rounded-2xl overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === 'classes' ? null : 'classes')}
                className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Users size={20} className="text-slate-400" />
                  <span className="font-bold text-slate-700">
                    Turmas
                    {selectedClasses.length > 0 && (
                      <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-600 rounded-lg text-[10px] font-black">
                        {selectedClasses.length} selecionadas
                      </span>
                    )}
                  </span>
                </div>
                {expanded === 'classes' ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
              </button>
              {expanded === 'classes' && (
                <div className="p-4 bg-white space-y-3">
                  <p className="text-[10px] text-amber-600 font-bold uppercase tracking-tighter">⚠️ Deletar uma turma apagará todos os alunos e boletos dela!</p>
                  <button
                    onClick={() => setSelectedClasses(selectedClasses.length === classes.length ? [] : classes.map(c => c.id))}
                    className="text-xs font-black text-red-600 uppercase tracking-widest hover:underline"
                  >
                    {selectedClasses.length === classes.length ? 'Desmarcar Todas' : 'Selecionar Todas'}
                  </button>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {classes.map(c => (
                      <label key={c.id} className="flex items-center gap-3 p-2 rounded-xl border border-slate-100 hover:border-red-200 hover:bg-red-50 transition-all cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedClasses.includes(c.id)}
                          onChange={() => handleToggleClass(c.id)}
                          className="w-5 h-5 rounded-lg border-2 border-slate-300 accent-red-600 cursor-pointer transition-all"
                        />
                        <span className="text-sm font-medium text-slate-700">{c.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 3. FECHAMENTOS MENSAL */}
            <div className="border border-slate-100 rounded-2xl overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === 'financial' ? null : 'financial')}
                className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Receipt size={20} className="text-slate-400" />
                  <span className="font-bold text-slate-700">
                    Fechamentos / Consumo
                    {selectedMonths.length > 0 && (
                      <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-600 rounded-lg text-[10px] font-black">
                        {selectedMonths.length} meses
                      </span>
                    )}
                  </span>
                </div>
                {expanded === 'financial' ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
              </button>
              {expanded === 'financial' && (
                <div className="p-4 bg-white space-y-3">
                  <button
                    onClick={() => setSelectedMonths(selectedMonths.length === months.length ? [] : months)}
                    className="text-xs font-black text-red-600 uppercase tracking-widest hover:underline"
                  >
                    {selectedMonths.length === months.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                  </button>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {months.map(m => (
                      <label key={m} className="flex items-center gap-3 p-2 rounded-xl border border-slate-100 hover:border-red-200 hover:bg-red-50 transition-all cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={selectedMonths.includes(m)}
                          onChange={() => handleToggleMonth(m)}
                          className="w-5 h-5 rounded-lg border-2 border-slate-300 accent-red-600 focus:ring-4 focus:ring-red-100 transition-all"
                        />
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-700 group-hover:text-red-700">
                          <Calendar size={14} className="text-slate-400 group-hover:text-red-400" />
                          {m}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Confirmation Box */}
          <div className="p-6 bg-slate-50 border-t border-slate-100 space-y-4">

            {/* Progress indicator */}
            <AnimatePresence>
              {progress && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className={`p-3 rounded-2xl flex items-center gap-3 text-xs font-bold ${
                    progress === 'Concluído!'
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                      : progress.startsWith('Erro')
                        ? 'bg-red-50 border border-red-200 text-red-700'
                        : 'bg-blue-50 border border-blue-200 text-blue-700'
                  }`}>
                    {progress === 'Concluído!' ? (
                      <CheckCircle2 size={16} className="shrink-0" />
                    ) : progress.startsWith('Erro') ? (
                      <AlertTriangle size={16} className="shrink-0" />
                    ) : (
                      <Loader2 size={16} className="animate-spin shrink-0" />
                    )}
                    {progress}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="p-4 bg-red-100/50 border border-red-200 rounded-2xl flex items-start gap-3">
              <AlertTriangle className="text-red-600 mt-0.5 shrink-0" size={18} />
              <p className="text-xs font-medium text-red-800 leading-relaxed">
                Você está prestes a excluir <strong>{totalSelected} {totalSelected === 1 ? 'item' : 'itens'}</strong>.
                Esta ação não pode ser desfeita e os dados serão apagados permanentemente do servidor.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Digite <strong>EXCLUIR</strong> para confirmar
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                disabled={isLoading}
                placeholder="EXCLUIR"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 font-black text-center text-red-600 placeholder:text-slate-300 transition-all disabled:opacity-50"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleCancel}
                className="flex-1 px-6 py-3.5 rounded-2xl font-black text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 transition-all"
              >
                CANCELAR
              </button>
              <button
                onClick={handleDelete}
                disabled={!canDelete}
                className="flex-1 px-6 py-3.5 rounded-2xl font-black text-white bg-red-600 hover:bg-red-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg shadow-red-200 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  <>
                    <Trash2 size={18} />
                    Excluir Dados
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
