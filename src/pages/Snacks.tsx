import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Utensils, Plus, Pencil, Trash2, X, Save } from 'lucide-react';
import { ServiceItem, Segment } from '../types';
import { finance } from '../services/finance';
import ConfirmDialog from '../components/ConfirmDialog';

import EditServiceModal, { ALL_SEGMENTS } from '../components/EditServiceModal';

const SEGMENT_COLORS: Record<string, { bg: string; border: string; text: string; headerBg: string }> = {
  'Berçário':              { bg: 'bg-amber-50',   border: 'border-amber-200', text: 'text-amber-700',   headerBg: 'bg-amber-100' },
  'Educação Infantil':     { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', headerBg: 'bg-emerald-100' },
  'Ensino Fundamental I':  { bg: 'bg-sky-50',     border: 'border-sky-200',    text: 'text-sky-700',     headerBg: 'bg-sky-100' },
};

export default function Snacks() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setIsLoading(true);
    const data = await finance.getServices();
    setServices(data.sort((a, b) => a.name.localeCompare(b.name)));
    setIsLoading(false);
  };

  const startEdit = (s: ServiceItem) => {
    setEditingService(s);
  };

  const saveEdit = async (id: string, name: string, prices: Record<string, number>) => {
    await finance.saveService({ id, name: name.trim(), priceByKey: prices });
    setEditingService(null);
    await loadData();
  };

  const cancelEdit = () => { setEditingService(null); };

  const handleAdd = async () => {
    if (!addName.trim()) return;
    const id = addName.trim().replace(/\s+/g, '_').toUpperCase();
    await finance.saveService({ id, name: addName.trim(), priceByKey: {} });
    setShowAddModal(false);
    setAddName('');
    await loadData();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await finance.deleteService(deleteTarget.id);
    setDeleteTarget(null);
    await loadData();
  };

  const loadDefaults = async () => {
    setIsLoading(true);
    const defaults = [
      {
        id: 'LANCHE_COLETIVO', name: 'Lanche Coletivo',
        priceByKey: { 'Educação Infantil|Maternal': 11.00, 'Educação Infantil|Grupo 1': 14.50, 'Educação Infantil|Grupo 2': 14.50, 'Educação Infantil|Grupo 3': 14.50, 'Ensino Fundamental I|Ano 1': 14.20, 'Ensino Fundamental I|Ano 2': 14.20, 'Ensino Fundamental I|Ano 3': 14.20, 'Ensino Fundamental I|Ano 4': 14.20, 'Ensino Fundamental I|Ano 5': 14.20 }
      },
      {
        id: 'LANCHE_INTEGRAL', name: 'Lanche Integral',
        priceByKey: { 'Educação Infantil|Maternal': 10.50, 'Educação Infantil|Grupo 1': 13.60, 'Educação Infantil|Grupo 2': 13.60, 'Educação Infantil|Grupo 3': 13.60, 'Ensino Fundamental I|Ano 1': 13.60, 'Ensino Fundamental I|Ano 2': 13.60, 'Ensino Fundamental I|Ano 3': 13.60, 'Ensino Fundamental I|Ano 4': 13.60, 'Ensino Fundamental I|Ano 5': 13.60 }
      },
      {
        id: 'ALMOCO', name: 'Almoço',
        priceByKey: { 'Berçário|Baby': 12.20, 'Berçário|Ninho': 13.50, 'Berçário|Extra': 15.00, 'Educação Infantil|Maternal': 17.00, 'Educação Infantil|Grupo 1': 21.00, 'Educação Infantil|Grupo 2': 21.00, 'Educação Infantil|Grupo 3': 21.00, 'Ensino Fundamental I|Ano 1': 21.00, 'Ensino Fundamental I|Ano 2': 21.00, 'Ensino Fundamental I|Ano 3': 21.00, 'Ensino Fundamental I|Ano 4': 21.00, 'Ensino Fundamental I|Ano 5': 21.00 }
      },
      {
        id: 'CEIA', name: 'Ceia',
        priceByKey: { 'Berçário|Baby': 11.20, 'Berçário|Ninho': 12.50, 'Berçário|Extra': 14.00, 'Educação Infantil|Maternal': 14.50, 'Educação Infantil|Grupo 1': 15.50, 'Educação Infantil|Grupo 2': 15.50, 'Educação Infantil|Grupo 3': 15.50 }
      },
      {
        id: 'LANCHE', name: 'Lanche',
        priceByKey: { 'Berçário|Baby': 4.80, 'Berçário|Ninho': 6.20, 'Berçário|Extra': 8.80 }
      }
    ];
    for (const svc of defaults) {
      await finance.saveService(svc);
    }
    await loadData();
  };

  return (
    <div className="p-8 pb-24 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:justify-between md:items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-200 gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-brand-blue/10 rounded-2xl flex items-center justify-center text-brand-blue">
            <Utensils size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800">Serviços e Valores</h1>
            <p className="text-slate-500 font-medium">Preços por segmento e faixa etária</p>
          </div>
        </div>
        <button onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-brand-blue text-white px-6 py-3 rounded-2xl font-black text-sm hover:bg-brand-blue/90 transition-all shadow-lg shadow-brand-blue/20">
          <Plus size={18} /> Novo Serviço
        </button>
      </motion.div>

      {isLoading ? (
        <div className="text-center text-slate-400 py-16">Carregando serviços...</div>
      ) : services.length === 0 ? (
        <div className="text-center text-slate-400 py-16">
          <Utensils size={40} className="mx-auto mb-4 opacity-30" />
          <p className="font-bold mb-4">Nenhum serviço cadastrado.</p>
          <button onClick={loadDefaults} className="bg-white border-2 border-brand-blue text-brand-blue font-bold px-6 py-3 rounded-2xl hover:bg-brand-blue/5 transition-colors">
            Carregar Tabela Padrão (Colégio)
          </button>
        </div>
      ) : (
        /* Segment blocks */
        ALL_SEGMENTS.map(seg => {
          const colors = SEGMENT_COLORS[seg.key];
          return (
            <motion.div key={seg.key} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className={`${colors.bg} ${colors.border} border rounded-3xl overflow-hidden`}>
              <div className={`${colors.headerBg} px-6 py-4`}>
                <h2 className={`text-lg font-black ${colors.text} uppercase tracking-widest`}>{seg.label}</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-200/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <th className="px-6 py-3">Serviço</th>
                      {seg.subKeys.map(sk => (
                        <th key={sk.key} className="px-6 py-3 text-center">{sk.label}</th>
                      ))}
                      <th className="px-6 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/30">
                    {services.map(svc => {
                      const hasAnyPrice = seg.subKeys.some(sk => (svc.priceByKey[sk.key] || 0) > 0);
                      const isBrandNew = !Object.values(svc.priceByKey || {}).some(val => val > 0);
                      const isFirstSegment = seg.key === ALL_SEGMENTS[0].key;
                      
                      // Show service in this segment if it has prices, or if it's completely new (show in first segment only)
                      if (!hasAnyPrice && !(isBrandNew && isFirstSegment)) return null;
                      return (
                        <tr key={svc.id} className="hover:bg-white/50 transition-colors">
                          <td className="px-6 py-3 font-bold text-slate-800">
                            {svc.name}
                          </td>
                          {seg.subKeys.map(sk => (
                            <td key={sk.key} className="px-6 py-3 text-center">
                                <span className={`font-bold ${(svc.priceByKey[sk.key] || 0) > 0 ? colors.text : 'text-slate-300'}`}>
                                  {(svc.priceByKey[sk.key] || 0) > 0 ? `R$ ${svc.priceByKey[sk.key].toFixed(2)}` : '—'}
                                </span>
                            </td>
                          ))}
                          <td className="px-6 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button onClick={() => startEdit(svc)} className="p-1.5 text-slate-400 hover:text-brand-blue hover:bg-brand-blue/5 rounded-lg"><Pencil size={16} /></button>
                                <button onClick={() => setDeleteTarget({ id: svc.id, name: svc.name })} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                              </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          );
        })
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center px-4">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-black text-slate-800">Novo Serviço</h3>
            <input value={addName} onChange={e => setAddName(e.target.value)} placeholder="Ex: Lanche Coletivo, Almoço..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold" />
            <p className="text-xs text-slate-400">Após criar, clique em editar para definir preços por segmento.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowAddModal(false)} className="flex-1 px-5 py-3 bg-slate-100 text-slate-500 font-bold rounded-2xl">Cancelar</button>
              <button onClick={handleAdd} className="flex-1 px-5 py-3 bg-brand-blue text-white font-black rounded-2xl">Criar</button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Excluir Serviço"
        message={`Deseja excluir o serviço "${deleteTarget?.name}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Edit Service Modal */}
      {editingService && (
        <EditServiceModal
          service={editingService}
          onSave={saveEdit}
          onClose={cancelEdit}
        />
      )}
    </div>
  );
}
