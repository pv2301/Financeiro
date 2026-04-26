import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Trash2, X, ChevronDown, ChevronRight, User, Users, Receipt, Calendar, RotateCcw } from 'lucide-react';
import { finance } from '../services/finance';
import { Student, ClassInfo, Invoice } from '../types';

interface DeleteDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Category = 'students' | 'classes' | 'financial';

export default function DeleteDataModal({ isOpen, onClose, onSuccess }: DeleteDataModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  
  // Data for selection
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [months, setMonths] = useState<string[]>([]);
  
  // Selection states
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  
  const [expanded, setExpanded] = useState<Category | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    // Invalidate cache to ensure we see the latest April/May data
    localStorage.removeItem('fin_cache_fin_students');
    localStorage.removeItem('fin_cache_fin_classes');
    localStorage.removeItem('fin_cache_fin_invoices');
    localStorage.removeItem('fin_cache_fin_consumption');
    localStorage.removeItem('fin_cache_fin_billing_drafts');

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
        // Accept any string containing 4 digits (year) and 2 digits (month) or something like MM/YYYY, MM-YYYY, YYYY-MM
        return /\d{2,4}[/-]\d{2,4}/.test(m);
      })
      .map(m => m.replace('-', '/'))
      .sort((a, b) => {
        const [mA, yA] = a.split('/').map(Number);
        const [mB, yB] = b.split('/').map(Number);
        if (yA !== yB) return yA - yB;
        return mA - mB;
      });
      
    console.log('Months debug:', {
      fromInv: Array.from(new Set(monthsFromInv)),
      fromCons: Array.from(new Set(monthsFromCons)),
      fromDrafts: Array.from(new Set(monthsFromDrafts)),
      allRaw: allRawMonths,
      unique: uniqueMonths
    });
      
    setMonths(uniqueMonths);
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
    
    setIsLoading(true);
    try {
      // 1. Delete Financial Data by Month
      if (selectedMonths.length > 0) {
        await Promise.all(selectedMonths.map(m => finance.deleteMonthlyData(m)));
      }
      
      // 2. Delete Students
      if (selectedStudents.length > 0) {
        await finance.deleteStudents(selectedStudents);
      }
      
      // 3. Delete Classes (and their students)
      if (selectedClasses.length > 0) {
        await finance.deleteClasses(selectedClasses);
      }

      onSuccess();
      onClose();
      alert('Dados excluídos com sucesso!');
    } catch (error) {
      console.error(error);
      alert('Erro ao excluir dados.');
    } finally {
      setIsLoading(false);
    }
  };

  const totalSelected = selectedStudents.length + selectedClasses.length + selectedMonths.length;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
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
              <button 
                onClick={loadData}
                className="p-2 hover:bg-red-100 rounded-xl transition-colors text-red-600 font-bold text-[10px] uppercase tracking-widest flex items-center gap-1"
                title="Atualizar dados do banco"
              >
                <RotateCcw size={14} /> Atualizar
              </button>
              <button onClick={onClose} className="p-2 hover:bg-red-100 rounded-xl transition-colors text-red-400">
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
                  <span className="font-bold text-slate-700">Alunos ({selectedStudents.length} selecionados)</span>
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {students.map(s => (
                      <label key={s.id} className="flex items-center gap-3 p-2 rounded-xl border border-slate-100 hover:border-red-200 hover:bg-red-50 transition-all cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={selectedStudents.includes(s.id)}
                          onChange={() => handleToggleStudent(s.id)}
                          className="w-5 h-5 rounded-lg border-2 border-slate-300 accent-brand-blue cursor-pointer transition-all focus:ring-4 focus:ring-brand-blue/10"
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
                  <span className="font-bold text-slate-700">Turmas ({selectedClasses.length} selecionadas)</span>
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
                          className="w-5 h-5 rounded-lg border-2 border-slate-300 accent-brand-blue cursor-pointer transition-all focus:ring-4 focus:ring-brand-blue/10"
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
                  <span className="font-bold text-slate-700">Fechamentos / Consumo ({selectedMonths.length} meses)</span>
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
            <div className="p-4 bg-red-100/50 border border-red-200 rounded-2xl flex items-start gap-3">
              <AlertTriangle className="text-red-600 mt-0.5" size={18} />
              <p className="text-xs font-medium text-red-800 leading-relaxed">
                Você está prestes a excluir <strong>{totalSelected} itens</strong>. 
                Esta ação não pode ser desfeita e os dados serão apagados permanentemente do servidor.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Digite EXCLUIR para confirmar</label>
              <input 
                type="text" 
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="EXCLUIR"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 font-black text-center text-red-600 placeholder:text-slate-300 transition-all"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                onClick={onClose}
                className="flex-1 px-6 py-3.5 rounded-2xl font-black text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 transition-all"
              >
                CANCELAR
              </button>
              <button 
                onClick={handleDelete}
                disabled={confirmText !== 'EXCLUIR' || totalSelected === 0 || isLoading}
                className="flex-1 px-6 py-3.5 rounded-2xl font-black text-white bg-red-600 hover:bg-red-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg shadow-red-200 flex items-center justify-center gap-2"
              >
                <Trash2 size={20} />
                {isLoading ? 'EXCLUINDO...' : 'EXCLUIR DADOS'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
