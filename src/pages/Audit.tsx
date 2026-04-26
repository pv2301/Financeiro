import React, { useState, useEffect } from 'react';
import { 
  Shield, Clock, Trash2, RotateCcw, AlertTriangle, 
  ShieldAlert, Activity, Search, Zap, Filter,
  History, Database, ShieldCheck, ArrowUpRight, 
  ChevronRight, MoreVertical, HeartPulse
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { finance } from '../services/finance';
import { useAuth } from '../hooks/useAuth';
import { AuditLog } from '../types';
import { cn } from '../lib/utils';

export function Audit() {
  const [activeTab, setActiveTab] = useState<'logs' | 'trash'>('logs');
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [deletedItems, setDeletedItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [purging, setPurging] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const { profile } = useAuth();
  const isAdmin = profile?.role === 'ADMIN';

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin, activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'logs') {
        const data = await finance.getAuditLogs();
        setLogs(data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      } else {
        const data = await finance.getDeletedItems();
        setDeletedItems(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleRestore = async (col: string, id: string) => {
    setRestoring(id);
    try {
      await finance.restoreItem(col, id);
      showToast('Item Restaurado!');
      await loadData();
    } catch (error) {
      console.error(error);
      alert('Erro ao restaurar o item.');
    } finally {
      setRestoring(null);
    }
  };

  const handlePurge = async () => {
    if (window.confirm('CUIDADO: Isso excluirá permanentemente todos os itens na lixeira com mais de 90 dias. Deseja continuar?')) {
      setPurging(true);
      try {
        const count = await finance.purgeOldDeletedItems(90);
        showToast(`${count} itens expurgados!`);
        await loadData();
      } catch (error) {
        console.error(error);
        alert('Erro ao limpar lixeira.');
      } finally {
        setPurging(false);
      }
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] text-slate-500 space-y-10">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }}
          className="w-32 h-32 bg-red-50 rounded-[2.5rem] flex items-center justify-center text-red-500 shadow-2xl shadow-red-900/5 border-2 border-red-100"
        >
          <ShieldAlert size={64} className="animate-pulse" />
        </motion.div>
        <div className="text-center space-y-2">
           <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Acesso Restrito</h2>
           <p className="text-slate-400 font-medium text-lg italic">Este terminal exige credenciais de auditoria administrativa.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 pb-32 max-w-[1600px] mx-auto space-y-12">
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-12 right-12 z-[100] bg-slate-900 text-white px-8 py-5 rounded-[2rem] font-black shadow-2xl flex items-center gap-4 border border-white/10 backdrop-blur-xl"
          >
            <div className="w-10 h-10 bg-brand-lime rounded-xl flex items-center justify-center text-slate-900 shadow-lg">
              <Zap size={20} />
            </div>
            <span className="uppercase tracking-widest text-[11px]">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Strategic Header --- */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col xl:flex-row xl:justify-between xl:items-center bg-white p-10 rounded-[4rem] shadow-xl shadow-slate-200/50 border border-slate-100 gap-10"
      >
        <div className="flex items-center gap-8">
          <div className="w-24 h-24 bg-slate-900 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl shadow-slate-900/30 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <Shield size={42} className="relative z-10" />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-2">
               <span className="px-3 py-1 bg-slate-900/10 text-slate-900 rounded-full text-[9px] font-black uppercase tracking-widest border border-slate-900/20">Auditoria</span>
               <span className="px-3 py-1 bg-brand-blue/10 text-brand-blue rounded-full text-[9px] font-black uppercase tracking-widest border border-brand-blue/20">Integridade</span>
            </div>
            <h1 className="text-5xl font-black text-slate-900 uppercase tracking-tighter leading-none">Central de <span className="text-brand-blue text-6xl">Controle</span></h1>
            <p className="text-slate-400 font-medium mt-3 text-lg">Logs de atividade, <span className="text-slate-900 font-bold">recuperação de dados</span> e governança do vault.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 bg-slate-50 p-3 rounded-[3rem] border border-slate-100">
           <div className="px-8 py-5 bg-white rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-600">
                 <ShieldCheck size={18} />
              </div>
              <div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Status</p>
                 <p className="text-base font-black text-slate-900 mt-1">Sincronizado</p>
              </div>
           </div>
        </div>
      </motion.div>

      {/* --- Navigation Tabs --- */}
      <div className="flex justify-center">
         <div className="bg-white p-2 rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-slate-100 flex items-center gap-2">
            {[
              { id: 'logs', label: 'Logs de Atividade', icon: History },
              { id: 'trash', label: 'Lixeira (Recuperação)', icon: Trash2 }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "px-10 py-5 rounded-[1.8rem] font-black text-[11px] uppercase tracking-widest flex items-center gap-4 transition-all",
                  activeTab === tab.id ? "bg-slate-900 text-white shadow-xl shadow-slate-900/20" : "text-slate-400 hover:text-slate-900 hover:bg-slate-50"
                )}
              >
                <tab.icon size={20} />
                {tab.label}
              </button>
            ))}
         </div>
      </div>

      {/* --- Content Hub --- */}
      <div className="space-y-12">
        {loading ? (
          <div className="bg-white rounded-[4rem] p-32 text-center border border-slate-100 shadow-xl">
             <div className="w-20 h-20 border-4 border-brand-blue/10 border-t-brand-blue rounded-full animate-spin mx-auto mb-6" />
             <p className="font-black text-slate-400 uppercase tracking-[0.3em] text-xs">Mapeando Vault...</p>
          </div>
        ) : activeTab === 'logs' ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[4rem] shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left border-separate border-spacing-0">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="pl-12 pr-6 py-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Timestamp / Protocolo</th>
                    <th className="px-6 py-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Usuário Administrativo</th>
                    <th className="px-6 py-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Ação Executada</th>
                    <th className="px-6 py-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Entidade / Coleção</th>
                    <th className="pl-6 pr-12 py-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Identificador Interno</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {logs.length === 0 ? (
                    <tr><td colSpan={5} className="p-32 text-center text-slate-300 font-black uppercase tracking-[0.2em]">Nenhum log registrado no ciclo.</td></tr>
                  ) : (
                    logs.map((log, idx) => (
                      <tr key={log.id} className="group hover:bg-slate-50/50 transition-all">
                        <td className="pl-12 pr-6 py-8">
                           <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300 group-hover:text-brand-blue transition-colors">
                                 <Clock size={16} />
                              </div>
                              <span className="text-sm font-black text-slate-900 tabular-nums tracking-tighter">
                                {new Date(log.timestamp).toLocaleString('pt-BR')}
                              </span>
                           </div>
                        </td>
                        <td className="px-6 py-8">
                           <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-brand-blue/10 rounded-lg flex items-center justify-center text-brand-blue font-black text-[10px]">
                                 {log.userEmail.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-sm font-bold text-slate-700">{log.userEmail}</span>
                           </div>
                        </td>
                        <td className="px-6 py-8">
                           <span className={cn(
                             "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border",
                             log.action === 'CREATE' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                             log.action === 'UPDATE' ? 'bg-brand-blue/5 text-brand-blue border-brand-blue/10' :
                             log.action === 'SOFT_DELETE' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                             'bg-red-50 text-red-600 border-red-100'
                           )}>
                             {log.action}
                           </span>
                        </td>
                        <td className="px-6 py-8">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{log.collectionName}</span>
                        </td>
                        <td className="pl-6 pr-12 py-8 text-right font-mono text-[10px] text-slate-300 group-hover:text-slate-500 transition-colors uppercase tracking-tight">
                           {log.documentId}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-10">
            <div className="bg-amber-50 border border-amber-100 p-10 rounded-[3.5rem] flex items-center justify-between gap-10 shadow-xl shadow-amber-900/5">
               <div className="flex items-center gap-8">
                  <div className="w-20 h-20 bg-amber-100 rounded-[2rem] flex items-center justify-center text-amber-600 shadow-inner">
                     <AlertTriangle size={36} />
                  </div>
                  <div>
                     <h3 className="text-2xl font-black text-amber-900 uppercase tracking-tighter leading-none">Política de Retenção (90 dias)</h3>
                     <p className="text-amber-700/70 font-medium mt-2 text-lg">Itens apagados permanecem no vault para recuperação. <span className="font-bold">Após 90 dias, o expurgo é definitivo.</span></p>
                  </div>
               </div>
               <button 
                onClick={handlePurge}
                disabled={purging}
                className="px-10 py-5 bg-white border-2 border-amber-200 text-amber-700 rounded-[1.5rem] hover:bg-amber-100 transition-all font-black text-[11px] uppercase tracking-widest flex items-center gap-3 disabled:opacity-50"
              >
                <Trash2 size={18} />
                {purging ? 'Expurgando...' : 'Purge Antigos'}
              </button>
            </div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-[4rem] shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left border-separate border-spacing-0">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="pl-12 pr-6 py-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Exclusão / Cronograma</th>
                      <th className="px-6 py-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Autor da Ação</th>
                      <th className="px-6 py-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Tipo de Documento</th>
                      <th className="px-6 py-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Identificação Visual</th>
                      <th className="pl-6 pr-12 py-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Comandos de Recuperação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {deletedItems.length === 0 ? (
                      <tr><td colSpan={5} className="p-32 text-center text-slate-300 font-black uppercase tracking-[0.2em]">Lixeira Limpa.</td></tr>
                    ) : (
                      deletedItems.map((item) => (
                        <tr key={item.id} className="group hover:bg-slate-50/50 transition-all">
                          <td className="pl-12 pr-6 py-8">
                             <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300">
                                   <Clock size={16} />
                                </div>
                                <span className="text-sm font-black text-slate-900 tabular-nums tracking-tighter">
                                  {new Date(item.deletedAt).toLocaleString('pt-BR')}
                                </span>
                             </div>
                          </td>
                          <td className="px-6 py-8 font-bold text-slate-700 text-sm">{item.deletedBy || 'Sistema Central'}</td>
                          <td className="px-6 py-8">
                             <span className="px-4 py-1.5 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest">
                                {item._collectionName}
                             </span>
                          </td>
                          <td className="px-6 py-8">
                             <span className="text-sm font-black text-slate-900 uppercase tracking-tighter max-w-xs truncate block">
                                {item.name || item.studentName || item.nossoNumero || item.monthYear || item.id}
                             </span>
                          </td>
                          <td className="pl-6 pr-12 py-8 text-right">
                             <button
                                onClick={() => handleRestore(item._collection, item.id)}
                                disabled={restoring === item.id}
                                className="inline-flex items-center gap-3 px-8 py-3 bg-brand-blue text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-brand-blue/90 transition-all shadow-lg shadow-brand-blue/20 disabled:opacity-50"
                             >
                                <RotateCcw size={16} className={cn(restoring === item.id && "animate-spin")} />
                                {restoring === item.id ? 'Restaurando...' : 'Reativar Item'}
                             </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>
        )}
      </div>

      {/* --- Footer Signature --- */}
      <div className="flex flex-col md:flex-row justify-between items-center pt-20 border-t border-slate-100 gap-8 opacity-30 group hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-4">
           <HeartPulse size={24} className="text-slate-400 group-hover:text-red-500 transition-colors" />
           <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Canteen Governance &bull; 2026</p>
        </div>
        <div className="flex items-center gap-10">
           <div className="flex items-center gap-3">
              <Activity size={16} className="text-brand-blue animate-pulse" />
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Vault Integrity: Locked</p>
           </div>
           <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Antigravity Protocol</p>
        </div>
      </div>
    </div>
  );
}
