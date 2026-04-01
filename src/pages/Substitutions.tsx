import React, { useState, useEffect } from 'react';
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

    const restriction: Restriction = {
      id: `res-${Date.now()}`,
      nome: newRestriction.trim()
    };

    const updated = [...restrictions, restriction];
    setRestrictions(updated);
    storage.saveRestrictions(updated);
    setNewRestriction('');
  };

  const handleDeleteRestriction = (id: string) => {
    if (confirm('Deseja remover esta restrição?')) {
      const updated = restrictions.filter(r => r.id !== id);
      setRestrictions(updated);
      storage.saveRestrictions(updated);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Deseja remover esta substituição?')) {
      const updated = substitutions.filter(s => s.id !== id);
      setSubstitutions(updated);
      storage.saveSubstitutions(updated);
    }
  };

  const getItemName = (id: string) => items.find(it => it.id === id)?.nome || 'Item não encontrado';

  const filteredSubs = substitutions.filter(sub => 
    getItemName(sub.itemOriginalId).toLowerCase().includes(searchTerm.toLowerCase()) ||
    getItemName(sub.itemSubstitutoId).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-brand-blue uppercase tracking-tight">Substituições</h1>
          <p className="text-slate-500 font-medium">Gerencie trocas automáticas por restrição.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => window.print()}
            className="bg-white hover:bg-slate-50 text-brand-blue border border-slate-200 px-6 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-sm font-black text-sm uppercase tracking-widest no-print"
          >
            <Printer size={20} />
            Imprimir
          </button>
          <button
            onClick={() => setIsRestrictionModalOpen(true)}
            className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-6 py-3 rounded-2xl flex items-center gap-2 transition-all font-black text-sm uppercase tracking-widest no-print"
          >
            <ShieldAlert size={20} />
            Restrições
          </button>
          <button 
            onClick={() => { setEditingSub({}); setIsModalOpen(true); }}
            className="bg-brand-orange hover:bg-brand-orange/90 text-white px-6 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-lg shadow-brand-orange/20 font-black text-sm uppercase tracking-widest"
          >
            <Plus size={20} />
            Nova Substituição
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-[2rem] border border-slate-200 shadow-sm mb-8 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por item..."
            className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-brand-blue/20 font-bold text-slate-900"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Substitutions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredSubs.map((sub) => (
          <div key={sub.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-brand-blue/5 transition-all group">
            <div className="flex items-center justify-between mb-6">
              <div className="px-4 py-1.5 rounded-full bg-brand-blue/10 text-brand-blue text-[10px] font-black uppercase tracking-widest">
                {sub.restricao}
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => { setEditingSub(sub); setIsModalOpen(true); }}
                  className="p-2 text-slate-400 hover:text-brand-blue hover:bg-brand-blue/5 rounded-xl transition-all"
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  onClick={() => handleDelete(sub.id)}
                  className="p-2 text-slate-400 hover:text-brand-orange hover:bg-brand-orange/5 rounded-xl transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Original</p>
                <p className="text-sm font-black text-slate-900">{getItemName(sub.itemOriginalId)}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-brand-lime/10 text-brand-lime flex items-center justify-center shrink-0">
                <ArrowRight size={20} />
              </div>
              <div className="flex-1 p-4 rounded-2xl bg-brand-lime/5 border border-brand-lime/10">
                <p className="text-[8px] font-black text-brand-lime uppercase tracking-widest mb-1">Substituto</p>
                <p className="text-sm font-black text-slate-900">{getItemName(sub.itemSubstitutoId)}</p>
              </div>
            </div>

            {sub.observacao && (
              <div className="p-4 rounded-2xl bg-slate-50 text-xs text-slate-500 font-medium italic">
                "{sub.observacao}"
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredSubs.length === 0 && (
        <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-200">
            <RefreshCw size={40} />
          </div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Nenhuma substituição</h3>
          <p className="text-slate-500">Cadastre regras de troca automática para restrições.</p>
        </div>
      )}

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
                <button 
                  type="submit"
                  className="bg-brand-blue text-white p-3 rounded-xl hover:bg-brand-blue/90 transition-all"
                >
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
    </div>
  );
}
