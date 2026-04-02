import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Save,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  ShieldAlert,
  Printer
} from 'lucide-react';
import { storage } from '../services/storage';
import { Substitution, Item, Restriction, GroupConfig } from '../types';
import { cn } from '../lib/utils';

export default function Substitutions() {
  const [substitutions, setSubstitutions] = useState<Substitution[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [restrictions, setRestrictions] = useState<Restriction[]>([]);
  const [groups, setGroups] = useState<GroupConfig[]>([]);
  const [logo, setLogo] = useState<string | null>(null);
  const [nutricionista, setNutricionista] = useState<{nome: string, crn: string}>({nome: '', crn: ''});
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const showConfirm = (title: string, message: string, onConfirm: () => void) => setConfirmModal({ title, message, onConfirm });

  useEffect(() => {
    const loadData = async () => {
      const [subsData, itemsData, restrictionsData, groupsData, logoData, nutData] = await Promise.all([
        storage.getSubstitutions(),
        storage.getItems(),
        storage.getRestrictions(),
        storage.getConfig(),
        storage.getLogo(),
        storage.getNutricionista()
      ]);
      setSubstitutions(subsData);
      setItems(itemsData);
      setRestrictions(restrictionsData);
      setGroups(groupsData);
      setLogo(logoData);
      setNutricionista(nutData);
    };
    loadData();
  }, []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRestrictionModalOpen, setIsRestrictionModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<Partial<Substitution> | null>(null);
  const [newRestriction, setNewRestriction] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSub?.itemOriginalId || !editingSub?.itemSubstitutoId) return;

    const newSub: Substitution = {
      id: editingSub.id || `sub-${Date.now()}`,
      itemOriginalId: editingSub.itemOriginalId,
      itemSubstitutoId: editingSub.itemSubstitutoId,
      restricao: editingSub.restricao || 'Geral',
      grupoDestino: editingSub.grupoDestino || 'Todos',
      observacao: editingSub.observacao
    };

    const updated = editingSub.id
      ? substitutions.map(s => s.id === editingSub.id ? newSub : s)
      : [...substitutions, newSub];

    setSubstitutions(updated);
    storage.saveSubstitutions(updated);
    setIsModalOpen(false);
    setEditingSub(null);
  };

  const handleAddRestriction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRestriction.trim()) return;
    const restriction: Restriction = { id: `res-${Date.now()}`, nome: newRestriction.trim() };
    const updated = [...restrictions, restriction];
    setRestrictions(updated);
    storage.saveRestrictions(updated);
    setNewRestriction('');
  };

  const handleDeleteRestriction = (id: string) => {
    showConfirm('Remover Restrição', 'Deseja remover esta restrição?', () => {
      const updated = restrictions.filter((r: { id: string }) => r.id !== id);
      setRestrictions(updated);
      storage.saveRestrictions(updated);
    });
  };

  const handleDelete = (id: string) => {
    showConfirm('Remover Substituição', 'Deseja remover esta substituição?', () => {
      const updated = substitutions.filter((s: { id: string }) => s.id !== id);
      setSubstitutions(updated);
      storage.saveSubstitutions(updated);
    });
  };

  const getItemName = (id: string) => items.find(it => it.id === id)?.nome || 'Item não encontrado';

  const filteredSubs = substitutions.filter(sub =>
    getItemName(sub.itemOriginalId).toLowerCase().includes(searchTerm.toLowerCase()) ||
    getItemName(sub.itemSubstitutoId).toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group by restriction, sorted alphabetically
  const grouped = useMemo(() => {
    const map: Record<string, Substitution[]> = {};
    filteredSubs.forEach((sub: Substitution) => {
      const key = sub.restricao || 'Geral';
      if (!map[key]) map[key] = [];
      map[key].push(sub);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredSubs]);

  return (
    <div className="p-6 w-full">
      {/* Header */}
      <div className="print:hidden flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-brand-blue uppercase tracking-tight">Substituições</h1>
          <p className="text-slate-500 font-medium">Gerencie trocas automáticas por restrição.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsRestrictionModalOpen(true)}
            className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all font-black text-xs uppercase tracking-widest"
          >
            <ShieldAlert size={16} />
            Restrições
          </button>
          <button
            onClick={() => { setEditingSub({}); setIsModalOpen(true); }}
            className="bg-brand-orange hover:bg-brand-orange/90 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-brand-orange/20 font-black text-xs uppercase tracking-widest"
          >
            <Plus size={16} />
            Nova Substituição
          </button>
          <button
            onClick={() => window.print()}
            className="bg-white hover:bg-slate-50 text-brand-blue border border-slate-200 px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-sm font-black text-xs uppercase tracking-widest"
          >
            <Printer size={16} />
            Imprimir
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="print:hidden mb-5">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por item..."
            className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white border border-slate-200 shadow-sm focus:ring-2 focus:ring-brand-blue/20 font-bold text-slate-900 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Grouped compact list */}
      <div className="print:hidden">
        {grouped.length > 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            {grouped.map(([restricao, subs], groupIdx) => (
              <div key={restricao}>
                {/* Group header */}
                <div className="flex items-center gap-3 px-5 py-3 bg-slate-50 border-b border-slate-100">
                  <span className="text-[10px] font-black text-brand-blue uppercase tracking-widest">{restricao}</span>
                  <span className="text-[9px] font-bold text-slate-400">{subs.length} regra{subs.length !== 1 ? 's' : ''}</span>
                </div>
                {/* Rows */}
                {subs.map((sub, idx) => (
                  <div
                    key={sub.id}
                    className={cn(
                      "flex items-center gap-3 px-5 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50/60 group transition-colors",
                      idx % 2 === 0 ? "bg-white" : "bg-slate-100",
                      groupIdx === grouped.length - 1 && idx === subs.length - 1 && "last:border-b-0"
                    )}
                  >
                    <span className="flex-1 text-sm font-bold text-slate-800 truncate">{getItemName(sub.itemOriginalId)}</span>
                    <ArrowRight size={14} className="text-brand-lime shrink-0" />
                    <span className="flex-1 text-sm font-bold text-slate-800 truncate">{getItemName(sub.itemSubstitutoId)}</span>
                    {sub.grupoDestino && sub.grupoDestino !== 'Todos' && (
                      <span className="hidden md:inline text-[9px] font-black text-brand-blue bg-brand-blue/8 px-2 py-0.5 rounded-full uppercase tracking-widest shrink-0">
                        {sub.grupoDestino}
                      </span>
                    )}
                    {sub.observacao && (
                      <span className="hidden lg:block text-xs text-slate-400 italic truncate max-w-[180px] shrink-0">
                        {sub.observacao}
                      </span>
                    )}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={() => { setEditingSub(sub); setIsModalOpen(true); }}
                        className="p-1.5 text-slate-400 hover:text-brand-blue hover:bg-brand-blue/5 rounded-lg transition-all"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(sub.id)}
                        className="p-1.5 text-slate-400 hover:text-brand-orange hover:bg-brand-orange/5 rounded-lg transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-200">
              <RefreshCw size={32} />
            </div>
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Nenhuma substituição</h3>
            <p className="text-slate-500 text-sm">Cadastre regras de troca automática para restrições.</p>
          </div>
        )}
      </div>

      {/* Substitution Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-brand-orange/10 rounded-2xl text-brand-orange">
                  <RefreshCw size={24} />
                </div>
                <h2 className="text-xl font-black text-brand-blue uppercase tracking-tight">
                  {editingSub?.id ? 'Editar Substituição' : 'Nova Substituição'}
                </h2>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={24} className="text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Item Original</label>
                  <select
                    required
                    className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-brand-blue/20 font-bold text-slate-900 appearance-none"
                    value={editingSub?.itemOriginalId || ''}
                    onChange={(e) => setEditingSub({...editingSub, itemOriginalId: e.target.value})}
                  >
                    <option value="">Selecione...</option>
                    {items.map(it => <option key={it.id} value={it.id}>{it.nome}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Item Substituto</label>
                  <select
                    required
                    className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-brand-blue/20 font-bold text-slate-900 appearance-none"
                    value={editingSub?.itemSubstitutoId || ''}
                    onChange={(e) => setEditingSub({...editingSub, itemSubstitutoId: e.target.value})}
                  >
                    <option value="">Selecione...</option>
                    {items.map(it => <option key={it.id} value={it.id}>{it.nome}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Restrição</label>
                    <button
                      type="button"
                      onClick={() => setIsRestrictionModalOpen(true)}
                      className="text-[8px] font-black uppercase tracking-widest text-brand-blue hover:underline"
                    >
                      + Nova
                    </button>
                  </div>
                  <select
                    className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-brand-blue/20 font-bold text-slate-900 appearance-none"
                    value={editingSub?.restricao || 'Geral'}
                    onChange={(e) => setEditingSub({...editingSub, restricao: e.target.value})}
                  >
                    {restrictions.map(r => <option key={r.id} value={r.nome}>{r.nome}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Grupo Destino</label>
                  <select
                    className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-brand-blue/20 font-bold text-slate-900 appearance-none"
                    value={editingSub?.grupoDestino || 'Todos'}
                    onChange={(e) => setEditingSub({...editingSub, grupoDestino: e.target.value})}
                  >
                    <option value="Todos">Todos os Grupos</option>
                    {groups.map(g => <option key={g.id} value={g.nomeCompleto}>{g.nomeCompleto}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Observação (Opcional)</label>
                <textarea
                  className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-brand-blue/20 font-bold text-slate-900 min-h-[100px]"
                  value={editingSub?.observacao || ''}
                  onChange={(e) => setEditingSub({...editingSub, observacao: e.target.value})}
                  placeholder="Ex: Usar apenas se não houver estoque do original..."
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-[2] bg-brand-lime hover:bg-brand-lime/90 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-lg shadow-brand-lime/20 flex items-center justify-center gap-2"
                >
                  <Save size={20} />
                  Salvar Regra
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== PRINT TEMPLATE ===== */}
      <div className="hidden print:block text-[11px]">
        <div style={{backgroundColor:'#f27205',padding:'10px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'12px'}}>
          <div style={{color:'white'}}>
            <div style={{fontSize:'9px',fontWeight:'bold',textTransform:'uppercase',opacity:0.8}}>Canteen</div>
            <div style={{fontSize:'18px',fontWeight:'900',textTransform:'uppercase',lineHeight:'1.1'}}>Lista de Substituições</div>
            <div style={{fontSize:'11px',opacity:0.9}}>{new Date().toLocaleDateString('pt-BR')}</div>
          </div>
          {logo && <img src={logo} alt="logo" style={{maxHeight:'48px',objectFit:'contain'}} />}
          <div style={{color:'white',textAlign:'right'}}>
            <div style={{fontWeight:'bold'}}>{nutricionista.nome}</div>
            {nutricionista.crn && <div style={{fontSize:'10px'}}>CRN {nutricionista.crn}</div>}
          </div>
        </div>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:'10px'}}>
          <thead>
            <tr style={{backgroundColor:'#404040',color:'white'}}>
              <th style={{padding:'6px 8px',textAlign:'left',border:'1px solid #ccc'}}>Item Original</th>
              <th style={{padding:'6px 8px',textAlign:'left',border:'1px solid #ccc'}}>Restrição</th>
              <th style={{padding:'6px 8px',textAlign:'left',border:'1px solid #ccc'}}>Item Substituto</th>
              <th style={{padding:'6px 8px',textAlign:'left',border:'1px solid #ccc'}}>Grupo Destino</th>
              <th style={{padding:'6px 8px',textAlign:'left',border:'1px solid #ccc'}}>Observação</th>
            </tr>
          </thead>
          <tbody>
            {substitutions.map((sub, idx) => (
              <tr key={sub.id} style={{backgroundColor: idx % 2 === 0 ? '#fff' : '#f9f9f9'}}>
                <td style={{padding:'4px 8px',border:'1px solid #eee'}}>{getItemName(sub.itemOriginalId)}</td>
                <td style={{padding:'4px 8px',border:'1px solid #eee'}}>{sub.restricao}</td>
                <td style={{padding:'4px 8px',border:'1px solid #eee'}}>{getItemName(sub.itemSubstitutoId)}</td>
                <td style={{padding:'4px 8px',border:'1px solid #eee'}}>{sub.grupoDestino}</td>
                <td style={{padding:'4px 8px',border:'1px solid #eee',fontStyle:'italic',color:'#666'}}>{sub.observacao || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{display:'flex',justifyContent:'space-between',marginTop:'10px',fontSize:'9px',color:'#666',borderTop:'1px solid #ccc',paddingTop:'6px'}}>
          <span>{nutricionista.nome}{nutricionista.crn ? ` — Nutricionista — CRN ${nutricionista.crn}` : ''}</span>
          <span>Canteen</span>
        </div>
      </div>

      {/* Restrictions Modal */}
      {isRestrictionModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-brand-blue/10 rounded-2xl text-brand-blue">
                  <ShieldAlert size={24} />
                </div>
                <h2 className="text-xl font-black text-brand-blue uppercase tracking-tight">Restrições</h2>
              </div>
              <button onClick={() => setIsRestrictionModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={24} className="text-slate-400" />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <form onSubmit={handleAddRestriction} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nova restrição..."
                  className="flex-1 px-5 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-brand-blue/20 font-bold text-slate-900"
                  value={newRestriction}
                  onChange={(e) => setNewRestriction(e.target.value)}
                />
                <button type="submit" className="bg-brand-blue text-white p-3 rounded-xl hover:bg-brand-blue/90 transition-all">
                  <Plus size={20} />
                </button>
              </form>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {restrictions.map(r => (
                  <div key={r.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl group">
                    <span className="font-bold text-slate-700">{r.nome}</span>
                    <button
                      onClick={() => handleDeleteRestriction(r.id)}
                      className="p-2 text-slate-400 hover:text-brand-orange opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setIsRestrictionModalOpen(false)}
                className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-brand-lime text-white px-6 py-3 rounded-2xl shadow-lg font-black text-sm uppercase tracking-widest flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 size={18} /> {toast}
        </div>
      )}
      {confirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden">
            <div className="p-8 text-center space-y-3">
              <h3 className="text-lg font-black text-brand-blue uppercase tracking-tight">{confirmModal.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{confirmModal.message}</p>
            </div>
            <div className="px-8 pb-8 flex gap-3">
              <button onClick={() => setConfirmModal(null)} className="flex-1 py-3 rounded-2xl font-black text-sm uppercase tracking-widest text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all">Cancelar</button>
              <button onClick={() => { confirmModal.onConfirm(); setConfirmModal(null); }}
                className="flex-[2] py-3 rounded-2xl font-black text-sm uppercase tracking-widest text-white bg-brand-orange hover:bg-brand-orange/90 shadow-lg shadow-brand-orange/20 transition-all">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
