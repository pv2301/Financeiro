import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Utensils, Plus, Pencil, Trash2, X, Save, 
  CheckSquare, ShieldCheck, Zap, ArrowUpRight,
  Calculator, Activity, Star, Info, ChevronRight,
  LayoutGrid, Layers, Search, TrendingUp, Target,
  DollarSign, Package, MousePointer2,
  Globe
} from 'lucide-react';
import { ServiceItem, Segment } from '../types';
import { finance } from '../services/finance';
import ConfirmDialog from '../components/ConfirmDialog';
import { cn, formatCurrencyBRL } from '../lib/utils';
import EditServiceModal, { ALL_SEGMENTS } from '../components/EditServiceModal';

const SEGMENT_THEMES: Record<string, { text: string; bg: string; accent: string; shadow: string; iconBg: string; cardBg: string; border: string; title: string }> = {
  'Berçário':              { 
    text: 'text-amber-600', 
    bg: 'bg-amber-500', 
    accent: 'bg-amber-50', 
    shadow: 'shadow-amber-500/20', 
    iconBg: 'bg-amber-100',
    cardBg: 'bg-[#FFFDF2]', // Muito claro, quase creme
    border: 'border-[#FFECB3]',
    title: 'text-[#A1887F]'
  },
  'Educação Infantil':     { 
    text: 'text-emerald-600', 
    bg: 'bg-emerald-500', 
    accent: 'bg-emerald-50', 
    shadow: 'shadow-emerald-500/20', 
    iconBg: 'bg-emerald-100',
    cardBg: 'bg-[#F1FBF4]', // Verde muito claro
    border: 'border-[#C8E6C9]',
    title: 'text-[#2E7D32]'
  },
  'Ensino Fundamental I':  { 
    text: 'text-sky-600', 
    bg: 'bg-brand-blue', 
    accent: 'bg-brand-blue/5', 
    shadow: 'shadow-brand-blue/20', 
    iconBg: 'bg-sky-100',
    cardBg: 'bg-[#F0F9FF]', // Azul muito claro
    border: 'border-[#B3E5FC]',
    title: 'text-[#1565C0]'
  },
};

export default function SnacksTest() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [editingSegment, setEditingSegment] = useState<Segment | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [globalConfig, setGlobalConfig] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [data, config] = await Promise.all([
        finance.getServices(),
        finance.getGlobalConfig()
      ]);
      setServices(data.sort((a, b) => a.name.localeCompare(b.name)));
      setGlobalConfig(config);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = (msg: string) => {
    // Basic toast logic or replace with actual toast component if available
    console.log(msg);
  };

  const startEdit = (service: ServiceItem, segment: Segment) => {
    setEditingService(service);
    setEditingSegment(segment);
  };

  const saveEdit = async (id: string, name: string, prices: Record<string, number>, mandatorySegments: Segment[]) => {
    setIsSaving(true);
    try {
      await finance.saveService({ id, name: name.trim(), priceByKey: prices });
      if (globalConfig) {
        const newMandatory = { ...globalConfig.mandatorySnackBySegment };
        Object.keys(newMandatory).forEach(seg => {
          if (newMandatory[seg] === id) delete newMandatory[seg];
        });
        mandatorySegments.forEach(seg => {
          newMandatory[seg] = id;
        });
        await finance.saveConfig({ ...globalConfig, mandatorySnackBySegment: newMandatory });
      }
      showToast('Precificação Atualizada!');
      setEditingService(null);
      setEditingSegment(null);
      await loadData();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAdd = async () => {
    if (!addName.trim()) return;
    setIsSaving(true);
    try {
      const id = addName.trim().replace(/\s+/g, '_').toUpperCase();
      await finance.saveService({ id, name: addName.trim(), priceByKey: {} });
      setShowAddModal(false);
      setAddName('');
      await loadData();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsSaving(true);
    try {
      await finance.deleteService(deleteTarget.id);
      setDeleteTarget(null);
      await loadData();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredServices = useMemo(() => {
    return services.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [services, searchTerm]);

  if (isLoading && services.length === 0) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-brand-blue/10 border-t-brand-blue rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 pb-32 max-w-[1600px] mx-auto space-y-6 font-sans">
      
      {/* --- Header - Compact --- */}
      <header className="flex flex-col md:flex-row md:items-center justify-between bg-white p-6 rounded-3xl shadow-sm border border-slate-100 gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg">
            <Utensils size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Configuração de Serviços e Valores</h1>
            <p className="text-slate-500 font-medium text-xs mt-1">Gerenciamento de precificação e itens por segmento.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => finance.getServices().then(loadData)} className="px-5 py-3 bg-slate-50 text-slate-400 rounded-xl font-black text-[10px] uppercase tracking-widest border border-slate-100 hover:bg-white transition-all">
             Atualizar
          </button>
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-3 bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-md">
             <Plus size={16} className="text-brand-lime" /> Novo Serviço
          </button>
        </div>
      </header>

      {/* --- Stats - Compact --- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-6 rounded-3xl bg-slate-900 text-white shadow-lg flex flex-col justify-between">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Total Serviços</p>
          <p className="text-3xl font-black tracking-tight">{services.length}</p>
        </div>
        {ALL_SEGMENTS.map(s => {
          const theme = SEGMENT_THEMES[s.key] || SEGMENT_THEMES['Ensino Fundamental I'];
          const count = services.filter(svc => s.subKeys.some(sk => (svc.priceByKey[sk.key] || 0) > 0)).length;
          return (
            <div key={s.key} className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm flex flex-col justify-between">
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 truncate">{s.label}</p>
               <div className="flex items-baseline gap-2">
                  <p className={cn("text-2xl font-black", theme.text)}>{count}</p>
                  <p className="text-[9px] font-black text-slate-400 uppercase">Serviços</p>
               </div>
            </div>
          );
        })}
      </div>

      {/* --- Search - Compact --- */}
      <div className="relative group w-full bg-white p-3 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row items-center gap-4">
         <div className="flex-1 relative w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
            <input 
              type="text" placeholder="BUSCAR SERVIÇO..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-6 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:border-brand-blue outline-none font-bold text-slate-700 text-sm shadow-inner"
            />
         </div>
         <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-100 rounded-2xl">
            <Info size={14} className="text-amber-500" />
            <p className="text-[9px] font-black text-amber-700 uppercase tracking-widest">
               Lanches Referenciais são usados para o cálculo de faltas.
            </p>
         </div>
      </div>



      {/* --- Content - Compact --- */}
      <div className="space-y-12">
        {ALL_SEGMENTS.map((seg) => {
          const theme = SEGMENT_THEMES[seg.key] || SEGMENT_THEMES['Ensino Fundamental I'];
          const segServices = filteredServices.filter(svc => {
            const hasAnyPrice = seg.subKeys.some(sk => (svc.priceByKey[sk.key] || 0) > 0);
            const isBrandNew = !Object.values(svc.priceByKey || {}).some(val => val > 0);
            const isFirstSegment = seg.key === ALL_SEGMENTS[0].key;
            return hasAnyPrice || (isBrandNew && isFirstSegment);
          });

          if (segServices.length === 0) return null;

          return (
            <div key={seg.key} className="space-y-4">
              <div className="flex items-center gap-4 px-2">
                <h2 className={cn("text-2xl font-black uppercase tracking-widest", theme.title)}>{seg.label}</h2>
              </div>

              <div className={cn("rounded-[2.5rem] border shadow-sm overflow-hidden transition-all", theme.cardBg, theme.border)}>
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-white/40">
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Serviço</th>
                      {seg.subKeys.map(sk => (
                        <th key={sk.key} className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">{sk.label}</th>
                      ))}
                      <th className="px-6 py-4 w-20"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {segServices.map((svc) => (
                      <tr key={svc.id} className="group hover:bg-white/60 transition-all">
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-3">
                             <p className="text-xs font-black text-slate-900 uppercase tracking-tight group-hover:text-brand-blue transition-colors">{svc.name}</p>
                             {globalConfig?.mandatorySnackBySegment?.[seg.key] === svc.id && (
                                <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-600 rounded-lg text-[8px] font-black uppercase tracking-widest border border-amber-200">
                                   <Star size={8} fill="currentColor" /> Referencial
                                </div>
                             )}
                          </div>
                        </td>
                        {seg.subKeys.map(sk => {
                          const price = svc.priceByKey[sk.key] || 0;
                          return (
                            <td key={sk.key} className="px-4 py-3 text-center">
                              <span className={cn(
                                "text-sm font-black tracking-tight",
                                price > 0 ? theme.text : 'text-slate-200'
                              )}>
                                {price > 0 ? formatCurrencyBRL(price) : '—'}
                              </span>
                            </td>
                          );
                        })}
                        <td className="px-6 py-3 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <button onClick={() => startEdit(svc, seg.key)} className="p-1.5 text-slate-400 hover:text-brand-blue transition-colors"><Pencil size={14} /></button>
                            <button onClick={() => setDeleteTarget({ id: svc.id, name: svc.name })} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      {/* --- Footer --- */}
      <footer className="pt-10 flex items-center justify-between opacity-30">
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Serviços v4.0 &bull; 2026</p>
      </footer>

      {/* --- Add Modal --- */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 space-y-6"
            >
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Novo Serviço</h2>
              <input value={addName} onChange={e => setAddName(e.target.value)} placeholder="NOME DO SERVIÇO..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-black text-slate-900 text-sm focus:border-brand-blue outline-none uppercase shadow-inner" />
              <div className="flex gap-3">
                <button onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest text-slate-400">Cancelar</button>
                <button onClick={handleAdd} className="flex-1 bg-slate-900 text-white px-4 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest">Adicionar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmDialog isOpen={!!deleteTarget} title="Remover" message={`Excluir "${deleteTarget?.name}"?`} confirmLabel="Remover" variant="danger" onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />

      {editingService && (
        <EditServiceModal 
          service={editingService} 
          onSave={saveEdit} 
          onClose={() => { setEditingService(null); setEditingSegment(null); }} 
          isSaving={isSaving} 
          targetSegment={editingSegment || undefined}
          mandatoryFor={Object.entries(globalConfig?.mandatorySnackBySegment || {})
            .filter(([_, v]) => v === editingService.id)
            .map(([k, _]) => k as Segment)}
        />
      )}
    </div>
  );
}
