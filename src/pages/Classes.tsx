import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GraduationCap, Plus, Pencil, Trash2, Users, X, Check, LayoutGrid, List } from 'lucide-react';
import { ClassInfo, BillingMode } from '../types';
import { finance } from '../services/finance';
import ConfirmDialog from '../components/ConfirmDialog';

const SEGMENT_OPTIONS = ['Berçário', 'Educação Infantil', 'Ensino Fundamental I'];
const AGE_RANGES = ['6-9m', '10-12m', '13-24m'];

const BILLING_LABELS: Record<BillingMode, string> = {
  ANTICIPATED_FIXED:    'Antecipado Fixo',
  ANTICIPATED_DAYS:     'Antecipado por Dias Letivos',
  POSTPAID_CONSUMPTION: 'Pós-Pago (Consumo)',
};

const BILLING_DESC: Record<BillingMode, string> = {
  ANTICIPATED_FIXED:    'Valor fixo mensal independente do consumo',
  ANTICIPATED_DAYS:     'Valor/dia × dias letivos, com desconto por falta',
  POSTPAID_CONSUMPTION: 'Cobra pelo consumo real importado da catraca',
};

const emptyClass = (): ClassInfo => ({
  id: '',
  name: '',
  segment: 'Berçário',
  billingMode: 'ANTICIPATED_FIXED',
  basePrice: 0,
  applyAbsenceDiscount: false,
  discountPerAbsence: 0,
  collegeSharePercent: 20,
});

export default function Classes() {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [studentCounts, setStudentCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [modal, setModal] = useState<ClassInfo | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  
  const [viewMode, setViewMode] = useState<'cards' | 'list'>(() => {
    return (localStorage.getItem('classesViewMode') as 'cards' | 'list') || 'cards';
  });

  useEffect(() => {
    localStorage.setItem('classesViewMode', viewMode);
  }, [viewMode]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [cls, students] = await Promise.all([finance.getClasses(), finance.getStudents()]);
    setClasses(cls.sort((a, b) => a.name.localeCompare(b.name)));
    const counts: Record<string, number> = {};
    students.forEach(s => { counts[s.classId] = (counts[s.classId] || 0) + 1; });
    setStudentCounts(counts);
    setIsLoading(false);
  };

  const openNew = () => { setModal(emptyClass()); setIsNew(true); };
  const openEdit = (c: ClassInfo) => { setModal({ ...c }); setIsNew(false); };
  const closeModal = () => { setModal(null); };

  const save = async () => {
    if (!modal) return;
    if (!modal.name.trim()) return alert('Nome da turma obrigatório.');
    setSaving(true);
    const id = modal.id || modal.name.replace(/\s+/g, '_').toUpperCase();
    await finance.saveClass({ ...modal, id });
    await loadData();
    setSaving(false);
    closeModal();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await finance.deleteClass(deleteTarget.id);
    setDeleteTarget(null);
    await loadData();
  };

  return (
    <div className="p-8 pb-24 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:justify-between md:items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-200 gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-brand-blue/10 rounded-2xl flex items-center justify-center text-brand-blue">
            <GraduationCap size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800">Turmas</h1>
            <p className="text-slate-500 font-medium">Modelos de cobrança e configuração por turma</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button onClick={() => setViewMode('cards')} className={`p-2 rounded-lg transition-colors ${viewMode === 'cards' ? 'bg-white shadow-sm text-brand-blue' : 'text-slate-400 hover:text-slate-600'}`}>
              <LayoutGrid size={18} />
            </button>
            <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-brand-blue' : 'text-slate-400 hover:text-slate-600'}`}>
              <List size={18} />
            </button>
          </div>
          <button onClick={openNew}
            className="flex items-center gap-2 bg-brand-blue text-white px-6 py-3 rounded-2xl font-black text-sm hover:bg-brand-blue/90 transition-all shadow-lg shadow-brand-blue/20">
            <Plus size={18} /> Nova Turma
          </button>
        </div>
      </motion.div>

      {/* Content */}
      {isLoading ? (
        <div className="text-center text-slate-400 py-16">Carregando turmas...</div>
      ) : classes.length === 0 ? (
        <div className="text-center text-slate-400 py-16">
          <GraduationCap size={40} className="mx-auto mb-4 opacity-30" />
          <p className="font-bold">Nenhuma turma cadastrada.</p>
          <p className="text-sm mt-1">Crie manualmente ou importe alunos para gerar turmas automaticamente.</p>
        </div>
      ) : (
        <div className="space-y-12">
          {SEGMENT_OPTIONS.map(seg => {
            const segClasses = classes.filter(c => c.segment === seg);
            if (segClasses.length === 0) return null;

            return (
              <div key={seg} className="space-y-4">
                <div className="flex items-center gap-4">
                  <h2 className="text-lg font-black text-slate-800 uppercase tracking-widest">{seg}</h2>
                  <div className="h-px bg-slate-200 flex-1"></div>
                </div>

                {viewMode === 'cards' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {segClasses.map((cls, i) => (
                      <motion.div key={cls.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                        className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col gap-4 hover:border-brand-blue/30 transition-colors">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-xl font-black text-slate-800">{cls.name}</h3>
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={() => openEdit(cls)} className="p-2 text-slate-400 hover:text-brand-blue hover:bg-brand-blue/5 rounded-xl transition-colors"><Pencil size={16} /></button>
                            <button onClick={() => setDeleteTarget({ id: cls.id, name: cls.name })} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"><Trash2 size={16} /></button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-slate-50 rounded-2xl p-3">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Modelo</p>
                            <p className="text-sm font-bold text-slate-700">{BILLING_LABELS[cls.billingMode]}</p>
                          </div>
                          <div className="bg-slate-50 rounded-2xl p-3">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Valor Base</p>
                            <p className="text-sm font-bold text-brand-blue">R$ {cls.basePrice.toFixed(2)}</p>
                          </div>
                          <div className="bg-slate-50 rounded-2xl p-3">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">% Colégio</p>
                            <p className="text-sm font-bold text-slate-700">{cls.collegeSharePercent}%</p>
                          </div>
                          <div className="bg-emerald-50 rounded-2xl p-3 flex items-center gap-2">
                            <Users size={14} className="text-emerald-600" />
                            <div>
                              <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-0.5">Alunos</p>
                              <p className="text-sm font-black text-emerald-700">{studentCounts[cls.id] || 0}</p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50/50">
                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Turma</th>
                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Alunos</th>
                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Modelo de Cobrança</th>
                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Valor Base</th>
                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">% Repasse</th>
                            <th className="px-6 py-4 text-right text-xs font-black text-slate-400 uppercase tracking-widest">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {segClasses.map((cls) => (
                            <tr key={cls.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4">
                                <span className="font-bold text-slate-800">{cls.name}</span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold border border-emerald-100">
                                  <Users size={12} /> {studentCounts[cls.id] || 0}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-sm font-bold text-slate-600">{BILLING_LABELS[cls.billingMode]}</span>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-sm font-bold text-brand-blue">R$ {cls.basePrice.toFixed(2)}</span>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-sm font-bold text-slate-600">{cls.collegeSharePercent}%</span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center justify-end gap-1">
                                  <button onClick={() => openEdit(cls)} className="p-2 text-slate-400 hover:text-brand-blue hover:bg-brand-blue/5 rounded-xl transition-colors"><Pencil size={18} /></button>
                                  <button onClick={() => setDeleteTarget({ id: cls.id, name: cls.name })} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"><Trash2 size={18} /></button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {modal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-start justify-center pt-8 px-4 overflow-y-auto">
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl mb-8">
              <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <h2 className="text-xl font-black text-slate-800">{isNew ? 'Nova Turma' : `Editar: ${modal.name}`}</h2>
                <button onClick={closeModal} className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"><X size={20} /></button>
              </div>

              <div className="p-6 space-y-6">
                {/* Basic info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Nome da Turma *</label>
                    <input value={modal.name} onChange={e => setModal({ ...modal, name: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-blue/20" placeholder="Ex: 1º ANO A" />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Segmento</label>
                    <select value={modal.segment} onChange={e => setModal({ ...modal, segment: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-blue/20">
                      {SEGMENT_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                {/* Billing model */}
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Modelo de Cobrança</label>
                  <div className="grid grid-cols-1 gap-2">
                    {(Object.keys(BILLING_LABELS) as BillingMode[]).map(mode => (
                      <button key={mode} onClick={() => setModal({ ...modal, billingMode: mode })}
                        className={`flex items-start gap-3 p-4 rounded-2xl border-2 text-left transition-all ${modal.billingMode === mode ? 'border-brand-blue bg-brand-blue/5' : 'border-slate-200 hover:border-slate-300'}`}>
                        <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center flex-shrink-0 ${modal.billingMode === mode ? 'border-brand-blue bg-brand-blue' : 'border-slate-300'}`}>
                          {modal.billingMode === mode && <Check size={12} className="text-white" />}
                        </div>
                        <div>
                          <p className="font-black text-slate-800 text-sm">{BILLING_LABELS[mode]}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{BILLING_DESC[mode]}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pricing */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                      {modal.billingMode === 'ANTICIPATED_DAYS' ? 'Valor por Dia (R$)' : 'Valor Mensal (R$)'}
                    </label>
                    <input type="number" value={modal.basePrice} onChange={e => setModal({ ...modal, basePrice: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-blue/20" min={0} step={0.01} />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Desconto/Falta (R$)</label>
                    <input type="number" value={modal.discountPerAbsence} onChange={e => setModal({ ...modal, discountPerAbsence: parseFloat(e.target.value) || 0, applyAbsenceDiscount: parseFloat(e.target.value) > 0 })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-blue/20" min={0} step={0.01} />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">% Colégio</label>
                    <input type="number" value={modal.collegeSharePercent} onChange={e => setModal({ ...modal, collegeSharePercent: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-blue/20" min={0} max={100} />
                  </div>
                </div>

                {/* Age range for Berçário */}
                {modal.segment === 'Berçário' && (
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Faixa Etária</label>
                    <select value={modal.ageRange || ''} onChange={e => setModal({ ...modal, ageRange: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-blue/20">
                      <option value="">Selecione...</option>
                      {AGE_RANGES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <p className="text-[10px] text-slate-400 mt-1">Define a faixa de preço na tabela de serviços.</p>
                  </div>
                )}

                <p className="text-[10px] text-slate-400 bg-sky-50 rounded-xl p-3">💡 Os dias letivos são configurados na página <strong>Fechamento Mensal</strong>, Passo 1.</p>
              </div>

              <div className="flex justify-end gap-3 p-6 border-t border-slate-100">
                <button onClick={closeModal} className="px-6 py-3 rounded-2xl font-black text-sm text-slate-500 hover:bg-slate-100 transition-colors">Cancelar</button>
                <button onClick={save} disabled={saving}
                  className="px-6 py-3 rounded-2xl font-black text-sm bg-brand-blue text-white hover:bg-brand-blue/90 transition-all shadow-lg shadow-brand-blue/20 disabled:opacity-50">
                  {saving ? 'Salvando...' : 'Salvar Turma'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Excluir Turma"
        message={`Deseja excluir a turma "${deleteTarget?.name}"? Os alunos vinculados não serão excluídos.`}
        confirmLabel="Excluir"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
