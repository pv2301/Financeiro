import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  GraduationCap, Plus, Pencil, Trash2, Users, X, Save,
  Check, LayoutGrid, List, Filter,
  Zap, CreditCard, ShieldCheck,
  Layers, Activity, ChevronRight, Calculator,
  Settings, Search, ArrowUpRight, Target,
  Star, Info, BookOpen, ChevronUp, ChevronDown,
  Globe
} from 'lucide-react';
import { ClassInfo, BillingMode } from '../types';
import { finance } from '../services/finance';
import ConfirmDialog from '../components/ConfirmDialog';
import { cn, formatCurrencyBRL } from '../lib/utils';

const SEGMENT_OPTIONS = ['Berçário', 'Educação Infantil', 'Ensino Fundamental I'];

const BILLING_LABELS: Record<BillingMode, string> = {
  PREPAID_FIXED:        'Mensalidade Fixa',
  PREPAID_DAYS:         'Por Dias Letivos',
  POSTPAID_CONSUMPTION: 'Por Consumo',
};

const BILLING_DESC: Record<BillingMode, string> = {
  PREPAID_FIXED:        'Valor mensal estável.',
  PREPAID_DAYS:         'Cálculo por dias de aula.',
  POSTPAID_CONSUMPTION: 'Faturamento por uso.',
};

const emptyClass = (): ClassInfo => ({
  id: '',
  name: '',
  segment: 'Berçário',
  billingMode: 'PREPAID_FIXED',
  basePrice: 0,
  applyAbsenceDiscount: false,
  collegeSharePercent: 20,
});

export default function ClassesTest() {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [studentCounts, setStudentCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [modal, setModal] = useState<ClassInfo | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  
  const [viewMode, setViewMode] = useState<'cards' | 'list'>(() => {
    return (localStorage.getItem('classesViewMode') as 'cards' | 'list') || 'cards';
  });

  const [filterSegment, setFilterSegment] = useState<string>('all');
  const [filterBilling, setFilterBilling] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    localStorage.setItem('classesViewMode', viewMode);
  }, [viewMode]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [cls, students] = await Promise.all([finance.getClasses(), finance.getStudents()]);
      setClasses((cls || []).sort((a, b) => a.name.localeCompare(b.name)));
      const counts: Record<string, number> = {};
      (students || []).forEach(s => { counts[s.classId] = (counts[s.classId] || 0) + 1; });
      setStudentCounts(counts);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const openNew = () => { setModal(emptyClass()); setIsNew(true); };
  const openEdit = (c: ClassInfo) => { setModal({ ...c }); setIsNew(false); };
  const closeModal = () => { setModal(null); };

  const save = async () => {
    if (!modal) return;
    if (!modal.name.trim()) return alert('Nome da turma obrigatório.');
    
    setSaving(true);
    try {
      const id = modal.id || modal.name.replace(/\s+/g, '_').toUpperCase();
      await finance.saveClass({ ...modal, id });
      await loadData();
      showToast(isNew ? 'Turma Criada!' : 'Turma Atualizada!');
      closeModal();
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar turma.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await finance.deleteClass(deleteTarget.id);
      showToast('Turma Removida!');
      setDeleteTarget(null);
      await loadData();
    } catch (error) {
      console.error(error);
      alert('Erro ao excluir turma.');
    } finally {
      setSaving(false);
    }
  };

  const filteredClasses = useMemo(() => {
    return classes.filter(c => {
      const matchesSegment = filterSegment === 'all' || c.segment === filterSegment;
      const matchesBilling = filterBilling === 'all' || c.billingMode === filterBilling;
      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSegment && matchesBilling && matchesSearch;
    });
  }, [classes, filterSegment, filterBilling, searchTerm]);

  const intelligence = useMemo(() => {
    const totalStudents = Object.values(studentCounts).reduce((a, b) => a + b, 0);

    const bySegment: Record<string, number> = {};
    classes.forEach(c => {
      const seg = c.segment || 'Sem Modalidade';
      bySegment[seg] = (bySegment[seg] || 0) + 1;
    });
    const segmentList = Object.entries(bySegment)
      .map(([seg, count]) => ({ seg, count }))
      .sort((a, b) => b.count - a.count);

    const byClass = classes
      .map(c => ({ name: c.name, segment: c.segment, students: studentCounts[c.id] || 0 }))
      .sort((a, b) => b.students - a.students);

    return { totalStudents, segmentList, byClass };
  }, [classes, studentCounts]);

  if (isLoading && classes.length === 0) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-brand-blue/10 border-t-brand-blue rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 pb-32 max-w-[1600px] mx-auto space-y-6 font-sans">
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-12 right-12 z-[100] bg-slate-900 text-white px-8 py-4 rounded-2xl font-black shadow-2xl flex items-center gap-4 border border-white/10 backdrop-blur-xl"
          >
            <Zap size={20} className="text-brand-lime" />
            <span className="uppercase tracking-widest text-[11px]">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Header - Compact --- */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between bg-white p-6 rounded-3xl shadow-sm border border-slate-100 gap-6"
      >
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg">
            <GraduationCap size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Turmas</h1>
            <p className="text-slate-500 font-medium text-xs mt-1">Configuração de cobrança e grupos.</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200">
            <button onClick={() => setViewMode('cards')} className={cn("p-2 rounded-lg transition-all", viewMode === 'cards' ? "bg-white shadow-sm text-slate-900 border border-slate-100" : "text-slate-400")}>
              <LayoutGrid size={16} />
            </button>
            <button onClick={() => setViewMode('list')} className={cn("p-2 rounded-lg transition-all", viewMode === 'list' ? "bg-white shadow-sm text-slate-900 border border-slate-100" : "text-slate-400")}>
              <List size={16} />
            </button>
          </div>
          <button onClick={openNew} className="flex items-center gap-3 bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-md">
             <Plus size={16} className="text-brand-lime" /> Nova Turma
          </button>
        </div>
      </motion.div>

      {/* --- Filters - Compact --- */}
      <div className="flex flex-col lg:flex-row gap-4 bg-white p-4 rounded-3xl shadow-sm border border-slate-100 items-center">
        <div className="relative flex-1 group w-full">
           <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
           <input 
             type="text" placeholder="BUSCAR TURMA..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
             className="w-full pl-12 pr-6 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:border-brand-blue outline-none font-bold text-slate-700 text-sm shadow-inner"
           />
        </div>
        
        <div className="flex items-center gap-3 w-full lg:w-auto">
           <select value={filterSegment} onChange={(e) => setFilterSegment(e.target.value)}
              className="bg-slate-50 border border-slate-100 px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-500 outline-none"
           >
              <option value="all">Segmentos</option>
              {SEGMENT_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
           </select>
           <select value={filterBilling} onChange={(e) => setFilterBilling(e.target.value)}
              className="bg-slate-50 border border-slate-100 px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-500 outline-none"
           >
              <option value="all">Cobrança</option>
              {(Object.keys(BILLING_LABELS) as BillingMode[]).map(mode => (
                <option key={mode} value={mode}>{BILLING_LABELS[mode]}</option>
              ))}
           </select>
        </div>
      </div>

      {/* --- Stats Cards --- */}
      <div className="grid grid-cols-3 gap-4">
        {/* Card 1: Total Turmas */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between min-h-[130px]">
          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center">
            <GraduationCap size={18} className="text-white" />
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total de Turmas</p>
            <p className="text-4xl font-black text-slate-900 leading-none">{classes.length}</p>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">turmas ativas</p>
          </div>
        </div>

        {/* Card 2: Por Modalidade */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col min-h-[130px]">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Por Modalidade</p>
          <div className="space-y-2 flex-1">
            {intelligence.segmentList.map(({ seg, count }) => (
              <div key={seg} className="flex items-center justify-between">
                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest truncate mr-2">{seg}</span>
                <span className="text-[9px] font-black text-slate-900 tabular-nums shrink-0">{count} turma{count !== 1 ? 's' : ''}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Card 3: Alunos por Turma */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col min-h-[130px]">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Alunos por Turma</p>
            <span className="text-[9px] font-black text-brand-blue uppercase tracking-widest">{intelligence.totalStudents} total</span>
          </div>
          <div className="space-y-2 flex-1 max-h-36 overflow-y-auto pr-1">
            {intelligence.byClass.map(({ name, students: count }) => (
              <div key={name} className="flex items-center justify-between">
                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest truncate mr-2">{name}</span>
                <span className="text-[9px] font-black text-slate-900 tabular-nums shrink-0">{count} al.</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* --- Content - Compact --- */}
      <div className="space-y-12">
        {SEGMENT_OPTIONS
          .filter(seg => filterSegment === 'all' || filterSegment === seg)
          .map(seg => {
            const segClasses = filteredClasses.filter(c => c.segment === seg);
            if (segClasses.length === 0) return null;

            return (
              <div key={seg} className="space-y-4">
                <div className="flex items-center gap-4 px-2">
                  <div className="w-1 h-6 bg-indigo-600 rounded-full" />
                  <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">{seg}</h2>
                </div>

                {viewMode === 'cards' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {segClasses.map((cls) => {
                      const count = studentCounts[cls.id] || 0;
                      return (
                        <div key={cls.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col gap-4 hover:border-indigo-300 transition-all group">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                <GraduationCap size={20} />
                              </div>
                              <div>
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">{cls.name}</h3>
                                <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{count} ALUNOS</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                              <button onClick={() => openEdit(cls)} className="p-1.5 text-slate-400 hover:text-indigo-600"><Pencil size={16} /></button>
                              <button onClick={() => setDeleteTarget({ id: cls.id, name: cls.name })} className="p-1.5 text-slate-400 hover:text-red-500"><Trash2 size={16} /></button>
                            </div>
                          </div>

                          <div className="space-y-2">
                             <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                <div className="flex items-center gap-2">
                                   <CreditCard size={12} className="text-slate-400" />
                                   <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{BILLING_LABELS[cls.billingMode]}</span>
                                </div>
                                <span className="text-sm font-black text-brand-blue tracking-tight">
                                   {cls.billingMode === 'PREPAID_DAYS' ? 'Cálculo por Dias' : formatCurrencyBRL(cls.basePrice)}
                                </span>
                             </div>
                             {cls.applyAbsenceDiscount && (
                                <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-600 rounded-lg text-[8px] font-black uppercase tracking-widest border border-amber-100">
                                   <Info size={10} /> Desc. Faltas Ativo
                                </div>
                             )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50/50">
                          <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Nome</th>
                          <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Modelo</th>
                          <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Valor</th>
                          <th className="px-6 py-4 w-16"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {segClasses.map((cls) => (
                          <tr key={cls.id} className="group hover:bg-slate-50 transition-all">
                            <td className="px-6 py-3">
                              <span className="text-xs font-black text-slate-900 uppercase tracking-tight">{cls.name}</span>
                            </td>
                            <td className="px-6 py-3">
                               <p className="text-[9px] font-black text-slate-700 uppercase tracking-widest">{BILLING_LABELS[cls.billingMode]}</p>
                            </td>
                            <td className="px-6 py-3 text-right">
                              <span className="text-sm font-black text-brand-blue tracking-tight">
                                 {cls.billingMode === 'PREPAID_DAYS' ? 'Cálculo por Dias' : formatCurrencyBRL(cls.basePrice)}
                              </span>
                            </td>
                            <td className="px-6 py-3 text-right">
                              <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                <button onClick={() => openEdit(cls)} className="p-1.5 text-slate-400 hover:text-indigo-600"><Pencil size={14} /></button>
                                <button onClick={() => setDeleteTarget({ id: cls.id, name: cls.name })} className="p-1.5 text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {/* --- Footer --- */}
      <footer className="pt-10 flex items-center justify-between opacity-30">
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Turmas v4.0 &bull; 2026</p>
      </footer>

      {/* --- Modal - Compact --- */}
      <AnimatePresence>
        {modal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">{isNew ? 'Nova Turma' : 'Editar Turma'}</h2>
                <button onClick={closeModal} className="text-slate-300 hover:text-red-500"><X size={20} /></button>
              </div>

              <div className="p-6 space-y-6 overflow-y-auto no-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nome</label>
                      <input value={modal.name} onChange={e => setModal({ ...modal, name: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:border-brand-blue outline-none font-black text-slate-700 uppercase tracking-tight" placeholder="EX: 1º ANO A" />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Segmento</label>
                      <select value={modal.segment} onChange={e => setModal({ ...modal, segment: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:border-brand-blue outline-none font-black text-slate-700 uppercase tracking-tight appearance-none">
                        {SEGMENT_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                   </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Modelo de Cobrança</label>
                  <div className="grid grid-cols-1 gap-2">
                    {(Object.keys(BILLING_LABELS) as BillingMode[]).map(mode => (
                      <button key={mode} 
                        onClick={() => setModal({ ...modal, billingMode: mode })}
                        className={cn(
                          "flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left",
                          modal.billingMode === mode ? "border-slate-900 bg-slate-900 text-white shadow-md" : "border-slate-50 bg-slate-50"
                        )}>
                        <div>
                          <p className="font-black text-xs uppercase tracking-tight">{BILLING_LABELS[mode]}</p>
                          <p className="text-[8px] font-black uppercase tracking-widest opacity-60">{BILLING_DESC[mode]}</p>
                        </div>
                        {modal.billingMode === mode && <Check size={16} className="text-brand-lime" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Valor Base</label>
                      <input type="number" value={typeof modal.basePrice === 'number' ? modal.basePrice : 0} onChange={e => setModal({ ...modal, basePrice: parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:border-brand-blue outline-none font-black text-brand-blue text-xl tabular-nums shadow-inner" min={0} step={0.01} />
                   </div>
                   <div className="flex items-end">
                      <button onClick={() => setModal({ ...modal, applyAbsenceDiscount: !modal.applyAbsenceDiscount })}
                         className={cn("w-full px-4 py-3 rounded-xl border transition-all text-center font-black text-[9px] uppercase tracking-widest", modal.applyAbsenceDiscount ? "bg-amber-500 text-white border-amber-500 shadow-md" : "bg-white border-slate-100 text-slate-400")}>
                         Desconto Faltas {modal.applyAbsenceDiscount ? 'Ativo' : 'Inativo'}
                      </button>
                   </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 flex justify-end gap-3">
                <button onClick={closeModal} className="px-6 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest text-slate-400">Cancelar</button>
                <button onClick={save} disabled={saving} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-slate-900/10 flex items-center gap-2">
                  {saving ? <Activity size={16} className="animate-spin" /> : <Save size={16} />}
                  Salvar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmDialog isOpen={!!deleteTarget} title="Excluir Turma" message={`Excluir "${deleteTarget?.name}"?`} confirmLabel="Excluir" variant="danger" onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}
