import React, { useState, useEffect, useMemo } from 'react';
import { 
  Shield, Clock, Trash2, RotateCcw, AlertTriangle, ShieldAlert, 
  UserCheck, UserX, Plus, Database, FileText, CheckCircle2,
  ChevronDown, ChevronUp, Activity, Search, Filter, Zap,
  Lock, ShieldCheck, Key, History, Trash, Download, ArrowRight,
  Fingerprint, Eye, Ghost, Terminal, Cpu, MousePointer2,
  Server, HardDrive, ShieldEllipsis, Users, UserPlus, ToggleLeft, ToggleRight, Globe, Loader2, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { finance } from '../services/finance';
import { useAuth } from '../hooks/useAuth';
import { profilesService, UserProfile, UserRole } from '../services/profiles';
import { AuditLog } from '../types';
import DeleteDataModal from '../components/DeleteDataModal';
import * as XLSX from 'xlsx';
import { cn } from '../lib/utils';

type TabType = 'audit' | 'access' | 'maintenance' | 'danger';

export default function SystemCenterTest() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('audit');
  const [auditSubTab, setAuditSubTab] = useState<'logs' | 'trash'>('logs');
  
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [deletedItems, setDeletedItems] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [pendingProfiles, setPendingProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [purging, setPurging] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isRecomputing, setIsRecomputing] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [preApproveEmail, setPreApproveEmail] = useState('');
  const [preApproveFinanceRole, setPreApproveFinanceRole] = useState<UserRole>('EDITOR');
  const [preApproveMenuRole, setPreApproveMenuRole] = useState<UserRole>('NONE');
  const [isPreApproving, setIsPreApproving] = useState(false);
  const [presenceEnabled, setPresenceEnabled] = useState(true);

  const { profile: currentUserProfile } = useAuth();
  const isAdmin = currentUserProfile?.role === 'ADMIN';
  const isSuperAdmin = currentUserProfile?.email === 'paulovictorsilva2301@gmail.com';

  const showToast = (msg: string) => { 
    setToast(msg); 
    setTimeout(() => setToast(null), 3000); 
  };

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin, activeTab, auditSubTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'audit') {
        if (auditSubTab === 'logs') {
          const data = await finance.getAuditLogs();
          setLogs(data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        } else {
          const data = await finance.getDeletedItems();
          setDeletedItems(data);
        }
      } else if (activeTab === 'access') {
        const all = await profilesService.getAllProfiles();
        setProfiles(all);
        setPendingProfiles(all.filter(p => p.status === 'PENDING'));
        const cfg = await finance.getGlobalConfig();
        setPresenceEnabled(cfg?.presenceEnabled ?? true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (col: string, id: string) => {
    setRestoring(id);
    try {
      await finance.restoreItem(col, id);
      showToast('Restaurado!');
      loadData();
    } catch (error) {
      console.error(error);
    } finally {
      setRestoring(null);
    }
  };

  const handlePurge = async () => {
    if (window.confirm('Excluir permanentemente itens na lixeira com mais de 90 dias?')) {
      setPurging(true);
      try {
        const count = await finance.purgeOldDeletedItems(90);
        showToast(`${count} itens removidos!`);
        loadData();
      } catch (error) {
        console.error(error);
      } finally {
        setPurging(false);
      }
    }
  };

  const handlePreApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preApproveEmail) return;
    setIsPreApproving(true);
    try {
      await profilesService.preApproveEmail(preApproveEmail, preApproveFinanceRole, preApproveMenuRole);
      showToast('E-mail Autorizado!');
      setPreApproveEmail('');
      loadData();
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsPreApproving(false);
    }
  };

  const handleUpdateStatus = async (uid: string, status: 'APPROVED' | 'BLOCKED' | 'PENDING') => {
    try {
      await profilesService.updateStatus(uid, status);
      showToast('Status Atualizado');
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleTogglePresence = async () => {
    try {
      const next = !presenceEnabled;
      await finance.saveGlobalConfig({ presenceEnabled: next } as any);
      setPresenceEnabled(next);
      showToast(next ? 'Rastreio Ativo' : 'Rastreio Desativado');
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateAppRole = async (uid: string, app: 'finance' | 'menu', role: UserRole) => {
    try {
      await profilesService.updateAppRole(uid, app, role);
      showToast('Permissão Atualizada');
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const exportBackup = async () => {
    setIsExporting(true);
    try {
      const [students, classes, services] = await Promise.all([
        finance.getStudents(), finance.getClasses(), finance.getServices()
      ]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(students), "Alunos");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(classes), "Turmas");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(services), "Serviços");
      XLSX.writeFile(wb, `backup_sistema_${new Date().toLocaleDateString('pt-BR')}.xlsx`);
      showToast('Backup Exportado!');
    } catch (e) {
      console.error(e);
      showToast('Erro ao exportar backup');
    } finally {
      setIsExporting(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500 space-y-8">
        <div className="w-20 h-20 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center">
           <ShieldAlert size={36} />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Acesso Restrito</h2>
          <p className="text-sm font-medium text-slate-400">Somente administradores podem acessar esta área.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 pb-32 max-w-[1600px] mx-auto space-y-6 font-sans">
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-12 right-12 z-[100] bg-slate-900 text-white px-8 py-4 rounded-2xl font-black shadow-2xl flex items-center gap-4"
          >
            <Zap size={20} className="text-brand-lime" />
            <span className="uppercase tracking-widest text-[11px]">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Header - Compact --- */}
      <header className="flex flex-col md:flex-row md:items-center justify-between bg-white p-6 rounded-3xl shadow-sm border border-slate-100 gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-brand-blue rounded-2xl flex items-center justify-center text-white shadow-lg">
            <Shield size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Sistema</h1>
            <p className="text-slate-500 font-medium text-xs mt-1">Ajustes avançados e manutenção.</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
           <button 
             onClick={() => loadData()} 
             disabled={loading}
             className="flex items-center gap-2 px-5 py-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-widest transition-all disabled:opacity-50"
           >
             {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
             Atualizar Dados
           </button>
           <div className="px-5 py-3 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Status</p>
              <p className="text-sm font-black text-emerald-600 uppercase tracking-tight">Online</p>
           </div>
        </div>
      </header>

      {/* --- Navigation - Compact --- */}
      <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-100 gap-1">
        {[
          { id: 'audit', label: 'Atividades' },
          { id: 'access', label: 'Acessos' },
          { id: 'maintenance', label: 'Backup' },
          { id: 'danger', label: 'Zerar' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={cn(
              "flex-1 py-3 rounded-xl font-black uppercase tracking-widest text-[9px] transition-all",
              activeTab === tab.id ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* --- Tab Content - Compact --- */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
          
          {activeTab === 'audit' && (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="flex bg-slate-50 border-b border-slate-100 p-1">
                <button onClick={() => setAuditSubTab('logs')} className={cn("flex-1 py-2 font-black text-[9px] uppercase tracking-widest rounded-lg transition-all", auditSubTab === 'logs' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400')}>Histórico</button>
                <button onClick={() => setAuditSubTab('trash')} className={cn("flex-1 py-2 font-black text-[9px] uppercase tracking-widest rounded-lg transition-all", auditSubTab === 'trash' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400')}>Lixeira</button>
              </div>

              {loading ? (
                <div className="p-20 flex justify-center"><Activity className="animate-spin text-brand-blue" /></div>
              ) : auditSubTab === 'logs' ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-400 font-black uppercase tracking-widest text-[9px]">
                      <tr>
                        <th className="px-6 py-4">Horário</th>
                        <th className="px-6 py-4">Usuário</th>
                        <th className="px-6 py-4">Ação</th>
                        <th className="px-6 py-4">Área</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-xs">
                      {logs.slice(0, 50).map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-3 text-slate-500 font-bold tabular-nums">{new Date(log.timestamp).toLocaleString('pt-BR')}</td>
                          <td className="px-6 py-3 font-black text-slate-900 uppercase">{log.userEmail.split('@')[0]}</td>
                          <td className="px-6 py-3">
                             <span className={cn("px-2 py-0.5 rounded-lg text-[8px] font-black uppercase", log.action === 'CREATE' ? 'bg-emerald-100 text-emerald-600' : log.action === 'UPDATE' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600')}>{log.action}</span>
                          </td>
                          <td className="px-6 py-3 text-slate-400 font-black uppercase tracking-widest">{log.collectionName}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 space-y-6">
                  <div className="bg-slate-900 p-4 rounded-2xl flex justify-between items-center text-white">
                     <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Itens removidos recentemente</p>
                     <button onClick={handlePurge} disabled={purging} className="bg-white text-slate-900 px-6 py-2 rounded-xl font-black uppercase text-[9px] tracking-widest shadow-md">Esvaziar Lixeira</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 text-slate-400 font-black uppercase tracking-widest text-[9px]">
                        <tr>
                           <th className="px-6 py-4">Removido em</th>
                           <th className="px-6 py-4">Nome</th>
                           <th className="px-6 py-4 text-right">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 text-xs">
                        {deletedItems.map(item => (
                          <tr key={item.id}>
                             <td className="px-6 py-3 text-slate-500 font-bold tabular-nums">{new Date(item.deletedAt).toLocaleString('pt-BR')}</td>
                             <td className="px-6 py-3 font-black text-slate-900 uppercase">{item.name || item.studentName || item.id}</td>
                             <td className="px-6 py-3 text-right">
                                <button onClick={() => handleRestore(item._collection, item.id)} disabled={restoring === item.id} className="text-brand-blue font-black uppercase text-[9px] tracking-widest hover:underline">Restaurar</button>
                             </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'access' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-4 space-y-6">
                 <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                    <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-3"><Lock size={20} className="text-brand-blue" /> Liberar Acesso</h3>
                    <form onSubmit={handlePreApprove} className="space-y-4">
                        <input type="email" placeholder="EMAIL DO USUÁRIO..." value={preApproveEmail} onChange={e => setPreApproveEmail(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 font-bold text-slate-900 outline-none focus:border-brand-blue transition-all" required />
                        
                        <div className="space-y-1">
                           <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Acesso Financeiro</label>
                           <select value={preApproveFinanceRole} onChange={e => setPreApproveFinanceRole(e.target.value as any)} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 font-black text-[10px] uppercase tracking-widest outline-none cursor-pointer">
                              <option value="ADMIN">ADMINISTRADOR</option>
                              <option value="EDITOR">EDITOR</option>
                              <option value="VIEWER">VISUALIZADOR</option>
                              <option value="NONE">NENHUM</option>
                           </select>
                        </div>

                        <div className="space-y-1">
                           <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Acesso Cardápio</label>
                           <select value={preApproveMenuRole} onChange={e => setPreApproveMenuRole(e.target.value as any)} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 font-black text-[10px] uppercase tracking-widest outline-none cursor-pointer">
                              <option value="ADMIN">ADMINISTRADOR</option>
                              <option value="EDITOR">EDITOR</option>
                              <option value="VIEWER">VISUALIZADOR</option>
                              <option value="NONE">NENHUM</option>
                           </select>
                        </div>
                       <button type="submit" disabled={isPreApproving || !isSuperAdmin} className="w-full bg-slate-900 text-white py-3 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-md disabled:opacity-50">Autorizar</button>
                    </form>
                 </div>
                 <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <button onClick={handleTogglePresence} className={cn("w-full flex items-center justify-between px-6 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all", presenceEnabled ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-100 text-slate-400')}>
                       <span>Rastreio de Usuários</span>
                       {presenceEnabled ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                    </button>
                 </div>
              </div>
              <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                 <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center">
                    <h3 className="font-black text-slate-900 uppercase tracking-tight text-sm flex-1">Usuários Ativos</h3>
                    <div className="flex gap-20 pr-16 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                       <span className="w-24 text-center">Financeiro</span>
                       <span className="w-24 text-center">Cardápio</span>
                    </div>
                 </div>
                 <div className="divide-y divide-slate-50">
                    {profiles.map(p => (
                      <div key={p.uid} className="p-4 flex items-center justify-between group hover:bg-slate-50 transition-all">
                         <div className="flex items-center gap-4">
                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border", p.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100')}>
                               {p.status === 'APPROVED' ? <UserCheck size={20} /> : <UserX size={20} />}
                            </div>
                            <div>
                               <p className="font-black text-slate-900 uppercase text-xs tracking-tight">{p.displayName || p.email.split('@')[0]}</p>
                               <p className="text-[9px] font-bold text-slate-400">{p.email}</p>
                            </div>
                         </div>
                         <div className="flex items-center gap-6">
                            {/* Financeiro Role */}
                            <div className="flex flex-col items-center gap-1">
                              <select 
                                value={p.financeRole || p.role} 
                                onChange={(e) => handleUpdateAppRole(p.uid, 'finance', e.target.value as any)} 
                                disabled={!isSuperAdmin || p.uid === currentUserProfile?.uid} 
                                className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5 text-[9px] font-black uppercase tracking-widest outline-none disabled:opacity-50 w-28"
                              >
                                 <option value="ADMIN">ADMIN</option>
                                 <option value="EDITOR">EDITOR</option>
                                 <option value="VIEWER">VIEWER</option>
                                 <option value="NONE">NENHUM</option>
                              </select>
                            </div>

                            {/* Cardápio Role */}
                            <div className="flex flex-col items-center gap-1">
                              <select 
                                value={p.menuRole || 'NONE'} 
                                onChange={(e) => handleUpdateAppRole(p.uid, 'menu', e.target.value as any)} 
                                disabled={!isSuperAdmin || p.uid === currentUserProfile?.uid} 
                                className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5 text-[9px] font-black uppercase tracking-widest outline-none disabled:opacity-50 w-28"
                              >
                                 <option value="ADMIN">ADMIN</option>
                                 <option value="EDITOR">EDITOR</option>
                                 <option value="VIEWER">VIEWER</option>
                                 <option value="NONE">NENHUM</option>
                              </select>
                            </div>

                            <button onClick={() => handleUpdateStatus(p.uid, p.status === 'APPROVED' ? 'BLOCKED' : 'APPROVED')} disabled={!isSuperAdmin || p.uid === currentUserProfile?.uid} className={cn("p-1.5 rounded-lg transition-all", p.status === 'APPROVED' ? 'text-red-400 hover:bg-red-50' : 'text-emerald-400 hover:bg-emerald-50', (!isSuperAdmin || p.uid === currentUserProfile?.uid) && "hidden")}>
                               {p.status === 'APPROVED' ? <UserX size={16} /> : <UserCheck size={16} />}
                            </button>
                         </div>
                      </div>
                    ))}
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'maintenance' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600"><Download size={24} /></div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Exportar Backup</h3>
                  <p className="text-xs text-slate-400 font-medium">Baixar planilha completa com todos os dados de alunos, turmas e serviços.</p>
              <button onClick={exportBackup} disabled={isExporting} className="w-full bg-slate-900 text-white py-4 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg flex items-center justify-center gap-3 disabled:opacity-50 transition-all">
                {isExporting ? <><Loader2 size={16} className="animate-spin" /> Exportando...</> : 'Gerar Planilha'}
              </button>
               </div>
               
               <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                  <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600"><Zap size={24} /></div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Performance</h3>
                  <p className="text-xs text-slate-400 font-medium">Recalcular o documento de estatísticas do Dashboard para garantir precisão.</p>
                  <button 
                    onClick={async () => {
                      setIsRecomputing(true);
                      try {
                        await finance.recomputeStats();
                        showToast('Estatisticas Sincronizadas!');
                      } catch (e) {
                        console.error(e);
                        showToast('Erro ao recalcular');
                      } finally {
                        setIsRecomputing(false);
                      }
                    }} 
                    disabled={isRecomputing}
                    className="w-full bg-emerald-600 text-white py-4 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg flex items-center justify-center gap-3 disabled:opacity-50 transition-all"
                  >
                    {isRecomputing
                      ? <><Loader2 size={16} className="animate-spin" /> Recalculando...</>
                      : 'Recalcular Estatisticas'
                    }
                  </button>
               </div>
               <div className="bg-slate-900 p-8 rounded-3xl shadow-xl space-y-6">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-3">Informações</h3>
                  <div className="space-y-2">
                     <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-[9px] font-black text-white uppercase tracking-widest flex justify-between">
                        <span>Versão</span>
                        <span>4.2.0</span>
                     </div>
                     <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-[9px] font-black text-white uppercase tracking-widest flex justify-between">
                        <span>Servidor</span>
                        <span>Ativo</span>
                     </div>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'danger' && (
            <div className="max-w-md mx-auto bg-white p-8 rounded-3xl border-2 border-red-100 shadow-sm text-center space-y-6">
               <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
                  <AlertTriangle size={32} />
               </div>
               <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Zerar Dados</h2>
               <p className="text-xs text-slate-400 font-medium leading-relaxed">Esta ação excluirá permanentemente todas as informações do sistema. Use com extrema cautela.</p>
               <button onClick={() => setIsDeleteModalOpen(true)} className="w-full bg-red-600 text-white py-4 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg hover:bg-red-700 transition-all">
                  Confirmar Exclusão Total
               </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* --- Footer --- */}
      <footer className="pt-10 flex items-center justify-between opacity-30">
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">HUB V1.0 &bull; 2026</p>
      </footer>

      <DeleteDataModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onSuccess={() => window.location.reload()} />
    </div>
  );
}
