import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Utensils, Plus, Pencil, Trash2, X, Save } from 'lucide-react';
import { ServiceItem, Segment } from '../types';
import { finance } from '../services/finance';
import ConfirmDialog from '../components/ConfirmDialog';

const SEGMENTS: { key: Segment; label: string; subKeys: { key: string; label: string }[] }[] = [
  {
    key: 'Berçário', label: 'Berçário',
    subKeys: [
      { key: 'Berçário|6-9m',   label: 'Baby (6-9 meses)' },
      { key: 'Berçário|10-12m', label: 'Ninho (10-12 meses)' },
      { key: 'Berçário|13-24m', label: 'Extra (13-24 meses)' },
    ]
  },
  {
    key: 'Educação Infantil', label: 'Educação Infantil',
    subKeys: [
      { key: 'Educação Infantil|Maternal', label: 'Maternal' },
      { key: 'Educação Infantil|Grupo',    label: 'Grupo 1/2/3' },
    ]
  },
  {
    key: 'Ensino Fundamental I', label: 'Ensino Fundamental I',
    subKeys: [
      { key: 'Ensino Fundamental I', label: 'Todos (1º ao 4º Ano)' },
    ]
  }
];

const SEGMENT_COLORS: Record<string, { bg: string; border: string; text: string; headerBg: string }> = {
  'Berçário':              { bg: 'bg-amber-50',   border: 'border-amber-200', text: 'text-amber-700',   headerBg: 'bg-amber-100' },
  'Educação Infantil':     { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', headerBg: 'bg-emerald-100' },
  'Ensino Fundamental I':  { bg: 'bg-sky-50',     border: 'border-sky-200',    text: 'text-sky-700',     headerBg: 'bg-sky-100' },
};

export default function Snacks() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [editPrices, setEditPrices] = useState<Record<string, number>>({});
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
    setEditingId(s.id);
    setNewName(s.name);
    setEditPrices({ ...s.priceByKey });
  };

  const saveEdit = async () => {
    if (!editingId || !newName.trim()) return;
    await finance.saveService({ id: editingId, name: newName.trim(), priceByKey: editPrices });
    setEditingId(null);
    await loadData();
  };

  const cancelEdit = () => { setEditingId(null); };

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

  const setPrice = (key: string, val: string) => {
    setEditPrices(prev => ({ ...prev, [key]: parseFloat(val) || 0 }));
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
          <p className="font-bold">Nenhum serviço cadastrado.</p>
        </div>
      ) : (
        /* Segment blocks */
        SEGMENTS.map(seg => {
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
                      const isEditing = editingId === svc.id;
                      const hasAnyPrice = seg.subKeys.some(sk => (svc.priceByKey[sk.key] || 0) > 0);
                      // Show service in this segment if it has prices or is being edited
                      if (!hasAnyPrice && !isEditing) return null;
                      return (
                        <tr key={svc.id} className="hover:bg-white/50 transition-colors">
                          <td className="px-6 py-3 font-bold text-slate-800">
                            {isEditing ? (
                              <input value={newName} onChange={e => setNewName(e.target.value)}
                                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-sm font-bold w-40" />
                            ) : svc.name}
                          </td>
                          {seg.subKeys.map(sk => (
                            <td key={sk.key} className="px-6 py-3 text-center">
                              {isEditing ? (
                                <input type="number" step="0.01" min="0"
                                  value={editPrices[sk.key] || ''}
                                  onChange={e => setPrice(sk.key, e.target.value)}
                                  className="w-24 px-2 py-1.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-center mx-auto" />
                              ) : (
                                <span className={`font-bold ${(svc.priceByKey[sk.key] || 0) > 0 ? colors.text : 'text-slate-300'}`}>
                                  {(svc.priceByKey[sk.key] || 0) > 0 ? `R$ ${svc.priceByKey[sk.key].toFixed(2)}` : '—'}
                                </span>
                              )}
                            </td>
                          ))}
                          <td className="px-6 py-3 text-right">
                            {isEditing ? (
                              <div className="flex items-center justify-end gap-1">
                                <button onClick={saveEdit} className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded-lg"><Save size={16} /></button>
                                <button onClick={cancelEdit} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg"><X size={16} /></button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-1">
                                <button onClick={() => startEdit(svc)} className="p-1.5 text-slate-400 hover:text-brand-blue hover:bg-brand-blue/5 rounded-lg"><Pencil size={16} /></button>
                                <button onClick={() => setDeleteTarget({ id: svc.id, name: svc.name })} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                              </div>
                            )}
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
    </div>
  );
}
