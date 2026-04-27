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
  
  const [filterSegment, setFilterSegment] = useState<string>('all');
  const [filterBilling, setFilterBilling] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

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
    
    // Validation for PREPAID_FIXED: Must contain GRUPO or MATERNAL
    if (modal.billingMode === 'PREPAID_FIXED') {
      const nameUpper = modal.name.toUpperCase();
      if (!nameUpper.includes('GRUPO') && !nameUpper.includes('MATERNAL')) {
        return alert('Turmas com Mensalidade Fixa devem conter "GRUPO" ou "MATERNAL" no nome.');
      }
    }
    
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
      {/* --- Header - Premium --- */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 gap-8"
      >
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 bg-slate-900 rounded-[2rem] flex items-center justify-center text-white shadow-2xl relative overflow-hidden group">
            <GraduationCap size={40} />
            <div className="absolute inset-0 bg-brand-blue/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tight leading-none mb-2">Turmas</h1>
            <p className="text-slate-500 font-bold text-sm tracking-wide">Configuração de cobrança e grupos acadêmicos.</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={openNew} 
            className="flex items-center gap-3 bg-slate-900 text-white px-8 py-4 rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.2em] hover:bg-brand-blue transition-all shadow-xl shadow-slate-900/10"
          >
             <Plus size={18} className="text-brand-lime" /> Nova Turma
          </motion.button>
        </div>
      </motion.div>

      {/* --- Filters - Premium Toolbar --- */}
      <div className="flex flex-col lg:flex-row gap-6 bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100 items-center">
        <div className="relative flex-1 group w-full">
           <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-brand-blue transition-colors" size={20} />
           <input 
             type="text" placeholder="Pesquisar por nome da turma..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
             className="w-full pl-16 pr-8 py-4 bg-white border border-slate-200 rounded-2xl focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 outline-none font-bold text-slate-700 text-base shadow-sm transition-all"
           />
        </div>
        
        <div className="flex items-center gap-4 w-full lg:w-auto">
           <div className="relative group flex-1 lg:flex-none">
             <Layers className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
             <select 
                value={filterSegment} onChange={(e) => setFilterSegment(e.target.value)}
                className="w-full lg:w-64 pl-12 pr-8 py-4 bg-white border border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-[0.1em] text-slate-600 outline-none hover:border-brand-blue transition-all appearance-none cursor-pointer"
             >
                <option value="all">TODOS SEGMENTOS</option>
                {SEGMENT_OPTIONS.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
             </select>
             <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
           </div>

           <div className="relative group flex-1 lg:flex-none">
             <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
             <select 
                value={filterBilling} onChange={(e) => setFilterBilling(e.target.value)}
                className="w-full lg:w-64 pl-12 pr-8 py-4 bg-white border border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-[0.1em] text-slate-600 outline-none hover:border-brand-blue transition-all appearance-none cursor-pointer"
             >
                <option value="all">TODOS FATURAMENTOS</option>
                {(Object.keys(BILLING_LABELS) as BillingMode[]).map(mode => (
                  <option key={mode} value={mode}>{BILLING_LABELS[mode].toUpperCase()}</option>
                ))}
             </select>
             <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
           </div>
        </div>
      </div>

      {/* --- Stats Cards --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Panorama Geral */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-between group hover:border-brand-blue/30 transition-all">
          <div className="flex items-center justify-between">
            <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
              <GraduationCap size={28} />
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Capacidade Total</span>
              <span className="text-xl font-black text-slate-900 tabular-nums">{intelligence.totalStudents} Alunos</span>
            </div>
          </div>
          <div className="mt-8">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total de Turmas</p>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black text-slate-900 tracking-tighter tabular-nums">{classes.length}</span>
              <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Ativas</span>
            </div>
          </div>
        </div>

        {/* Distribuição por Modalidade */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm group hover:border-brand-blue/30 transition-all flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1.5 h-6 bg-brand-blue rounded-full" />
            <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Por Modalidade</h3>
          </div>
          <div className="space-y-4 flex-1">
            {intelligence.segmentList.map(({ seg, count }) => {
              const percentage = classes.length > 0 ? (count / classes.length) * 100 : 0;
              return (
                <div key={seg} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider truncate mr-2">{seg}</span>
                    <span className="text-[10px] font-black text-slate-900 tabular-nums">{count} turmas</span>
                  </div>
                  <div className="w-full h-2 bg-slate-50 rounded-full overflow-hidden border border-slate-100 shadow-inner">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      className="h-full bg-brand-blue rounded-full shadow-sm"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Alunos por Turma (Top Ocupação) */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm group hover:border-brand-blue/30 transition-all flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 bg-brand-lime rounded-full" />
              <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Maior Ocupação</h3>
            </div>
          </div>
          <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar max-h-[160px]">
            {intelligence.byClass.slice(0, 5).map(({ name, students: count }) => (
              <div key={name} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100/50 hover:bg-white hover:shadow-md transition-all">
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider truncate mr-2">{name}</span>
                <div className="flex items-center gap-2">
                   <span className="text-[10px] font-black text-slate-900 tabular-nums">{count}</span>
                   <span className="text-[9px] font-bold text-slate-400">alunos</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* --- Content - Premium Layout --- */}
      <div className="space-y-16">
        {SEGMENT_OPTIONS
          .filter(seg => filterSegment === 'all' || filterSegment === seg)
          .map(seg => {
            const segClasses = filteredClasses.filter(c => c.segment === seg);
            if (segClasses.length === 0) return null;

            return (
              <div key={seg} className="space-y-6">
                <div className="flex items-center gap-6 px-4">
                  <div className="w-2 h-8 bg-brand-blue rounded-full shadow-sm shadow-brand-blue/20" />
                  <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">{seg}</h2>
                  <div className="flex-1 h-px bg-slate-100" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{segClasses.length} turmas</span>
                </div>

                {/* Grid de Turmas Unificado */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {segClasses.map((cls) => {
                    const count = studentCounts[cls.id] || 0;
                    return (
                      <div key={cls.id} className="group bg-white rounded-3xl border border-slate-100 p-5 hover:border-brand-blue/30 hover:shadow-xl hover:shadow-slate-200/40 transition-all relative overflow-hidden flex flex-col gap-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white text-xs font-black shadow-lg shadow-slate-200 shrink-0 group-hover:scale-110 transition-transform">
                              {cls.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-sm font-black text-slate-900 uppercase tracking-tight truncate leading-none mb-1.5">{cls.name}</span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] truncate">{cls.segment}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                          <div className="flex items-center gap-2">
                            <div className="px-2.5 py-1 bg-slate-50 rounded-lg border border-slate-100">
                              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{BILLING_LABELS[cls.billingMode]}</span>
                            </div>
                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50/50 rounded-lg border border-blue-100/50">
                              <Users size={12} className="text-brand-blue" />
                              <span className="text-[10px] font-black text-brand-blue tabular-nums">{count}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                            <button onClick={() => openEdit(cls)} className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-brand-blue hover:border-brand-blue transition-all shadow-sm">
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => setDeleteTarget({ id: cls.id, name: cls.name })} className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-red-500 hover:border-red-500 transition-all shadow-sm">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
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

                {modal.billingMode !== 'PREPAID_FIXED' && modal.billingMode !== 'PREPAID_DAYS' && (
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
                )}
                
                {(modal.billingMode === 'PREPAID_FIXED' || modal.billingMode === 'PREPAID_DAYS') && (
                  <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest leading-relaxed">
                      💡 Configurações Automáticas: <br/>
                      <span className="opacity-70">Desconto de faltas permanentemente ATIVO. {modal.billingMode === 'PREPAID_FIXED' ? 'Valor mensal definido no Fechamento.' : ''}</span>
                    </p>
                  </div>
                )}
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
