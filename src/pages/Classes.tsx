import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GraduationCap, Plus, Pencil, Trash2, Save, X } from 'lucide-react';
import { ClassInfo, BillingMode } from '../types';
import { finance } from '../services/finance';

const BILLING_MODE_LABELS: Record<BillingMode, string> = {
  ANTICIPATED_FIXED: 'Antecipado Fixo (Mensalidade)',
  ANTICIPATED_DAYS: 'Antecipado por Dias Letivos',
  POSTPAID_CONSUMPTION: 'Pós-pago (Por Consumo)'
};

export default function Classes() {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [editingClass, setEditingClass] = useState<ClassInfo>({
    id: '',
    name: '',
    billingMode: 'ANTICIPATED_FIXED',
    basePrice: 0,
    applyAbsenceDiscount: false
  });

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    setIsLoading(true);
    const data = await finance.getClasses();
    setClasses(data);
    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!editingClass.name) return alert('O nome da turma é obrigatório');
    
    const classToSave = {
      ...editingClass,
      id: editingClass.id || crypto.randomUUID()
    };
    
    await finance.saveClass(classToSave);
    await loadClasses();
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta turma?')) {
      await finance.deleteClass(id);
      await loadClasses();
    }
  };

  const openModal = (c?: ClassInfo) => {
    if (c) {
      setEditingClass({ ...c });
    } else {
      setEditingClass({
        id: '',
        name: '',
        billingMode: 'ANTICIPATED_FIXED',
        basePrice: 0,
        applyAbsenceDiscount: false
      });
    }
    setIsModalOpen(true);
  };

  return (
    <div className="p-8 pb-24 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-brand-orange/10 rounded-2xl flex items-center justify-center text-brand-orange">
            <GraduationCap size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800">Turmas e Regras</h1>
            <p className="text-slate-500 font-medium">Modelos de faturamento e turmas</p>
          </div>
        </div>
        <button 
          onClick={() => openModal()}
          className="flex items-center gap-2 bg-brand-orange text-white px-5 py-2.5 rounded-xl font-bold hover:bg-orange-500 transition-colors"
        >
          <Plus size={20} />
          Nova Turma
        </button>
      </motion.div>

      {/* List */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">Carregando turmas...</div>
        ) : classes.length === 0 ? (
          <div className="p-12 text-center text-slate-400">Nenhuma turma cadastrada.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {classes.map((c) => (
              <div key={c.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">{c.name}</h3>
                  <div className="flex items-center gap-3 mt-1 text-sm text-slate-500 font-medium">
                    <span className="bg-slate-100 px-3 py-1 rounded-full">
                      {BILLING_MODE_LABELS[c.billingMode]}
                    </span>
                    <span className="bg-slate-100 px-3 py-1 rounded-full">
                      {c.billingMode !== 'POSTPAID_CONSUMPTION' ? `Base: R$ ${c.basePrice.toFixed(2)}` : 'Soma de Itens'}
                    </span>
                    {c.applyAbsenceDiscount && (
                      <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full border border-emerald-100">
                        Desconto de Faltas Ativo
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openModal(c)} className="p-2 text-slate-400 hover:bg-brand-orange/10 hover:text-brand-orange rounded-xl transition-colors">
                    <Pencil size={20} />
                  </button>
                  <button onClick={() => handleDelete(c.id)} className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-colors">
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden"
            >
              <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-xl font-bold text-slate-800">{editingClass.id ? 'Editar Turma' : 'Nova Turma'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Nome da Turma</label>
                  <input
                    type="text"
                    value={editingClass.name}
                    onChange={(e) => setEditingClass({ ...editingClass, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all"
                    placeholder="Ex: Maternal 1, 1º Ano A..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Modelo de Cobrança</label>
                  <select
                    value={editingClass.billingMode}
                    onChange={(e) => setEditingClass({ ...editingClass, billingMode: e.target.value as BillingMode })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all"
                  >
                    <option value="ANTICIPATED_FIXED">Antecipado Fixo (Mensalidade Base)</option>
                    <option value="ANTICIPATED_DAYS">Antecipado por Dias Letivos (Base x Dias)</option>
                    <option value="POSTPAID_CONSUMPTION">Pós-pago (Soma dos itens consumidos)</option>
                  </select>
                </div>

                {editingClass.billingMode !== 'POSTPAID_CONSUMPTION' && (
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      {editingClass.billingMode === 'ANTICIPATED_FIXED' ? 'Valor Fixo Mensal (R$)' : 'Valor Base Diário (R$)'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingClass.basePrice || ''}
                      onChange={(e) => setEditingClass({ ...editingClass, basePrice: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all"
                    />
                  </div>
                )}

                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <input
                    type="checkbox"
                    id="absenceDiscount"
                    checked={editingClass.applyAbsenceDiscount}
                    onChange={(e) => setEditingClass({ ...editingClass, applyAbsenceDiscount: e.target.checked })}
                    className="w-5 h-5 rounded text-brand-orange focus:ring-brand-orange border-slate-300"
                  />
                  <div>
                    <label htmlFor="absenceDiscount" className="font-bold text-slate-700 cursor-pointer block">Aplica Desconto por Faltas?</label>
                    <span className="text-xs text-slate-500 font-medium">Desconta os dias não consumidos da mensalidade seguinte.</span>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-colors">
                  Cancelar
                </button>
                <button onClick={handleSave} className="flex items-center gap-2 bg-brand-orange text-white px-5 py-2.5 rounded-xl font-bold hover:bg-orange-500 transition-colors">
                  <Save size={20} />
                  Salvar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
