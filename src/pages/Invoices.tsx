import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Receipt, Search, CheckCircle2, AlertCircle, Trash2, 
  Phone, Clock, Upload, ArrowUpDown, Copy, X, 
  Calendar, Filter, Download, Zap, TrendingUp,
  CreditCard, ShieldCheck, ArrowUpRight, ChevronRight,
  MoreVertical, Layers, Activity, MousePointer2,
  PieChart, DollarSign, Wallet, ShieldAlert,
  Globe
} from 'lucide-react';
import { Invoice, Student, ClassInfo } from '../types';
import { finance } from '../services/finance';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ConfirmDialog from '../components/ConfirmDialog';
import ImportPaymentsModal from '../components/ImportPaymentsModal';
import { formatCurrencyBRL, cn } from '../lib/utils';

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'PAID'>('ALL');
  const [filterMonth, setFilterMonth] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [payTarget, setPayTarget] = useState<{ id: string; name: string } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'dueDate', direction: 'desc' });
  const [boletoFee, setBoletoFee] = useState(3.5);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [invData, stuData, classData, configData] = await Promise.all([
        finance.getInvoices(),
        finance.getStudents(),
        finance.getClasses(),
        finance.getGlobalConfig()
      ]);
      setInvoices(invData);
      setStudents(stuData);
      setClasses(classData);
      if (configData) setBoletoFee(configData.boletoEmissionFee ?? 3.5);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = (msg: string) => {
    console.log(msg);
  };

  const getStudentName = (id: string) => students.find(s => s.id === id)?.name || 'Desconhecido';

  const handleMarkAsPaid = async (id?: string) => {
    const targetId = id || payTarget?.id;
    if (!targetId) return;
    const inv = invoices.find(i => i.id === targetId);
    if (inv) {
      await finance.saveInvoice({ ...inv, paymentStatus: 'PAID' });
      showToast('Fatura Paga!');
      await loadData();
    }
    setPayTarget(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await finance.deleteInvoice(deleteTarget.id);
    setDeleteTarget(null);
    await loadData();
  };

  const handleBulkAction = async (action: 'PAY' | 'DELETE') => {
    setIsLoading(true);
    try {
      const ids = Array.from(selectedIds);
      if (action === 'PAY') {
        await Promise.all(ids.map(id => {
          const inv = invoices.find(i => i.id === id);
          return inv ? finance.saveInvoice({ ...inv, paymentStatus: 'PAID' }) : Promise.resolve();
        }));
      } else {
        await Promise.all(ids.map(id => finance.deleteInvoice(id)));
      }
      setSelectedIds(new Set());
      await loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const name = getStudentName(inv.studentId).toLowerCase();
      const matchesSearch = name.includes(searchTerm.toLowerCase()) || inv.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'ALL' || inv.paymentStatus === filterStatus;
      const matchesMonth = !filterMonth || inv.monthYear === filterMonth;
      return matchesSearch && matchesStatus && matchesMonth;
    }).sort((a, b) => {
      if (!sortConfig) return 0;
      const valA = a[sortConfig.key as keyof Invoice];
      const valB = b[sortConfig.key as keyof Invoice];
      if (valA === undefined || valB === undefined) return 0;
      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [invoices, searchTerm, filterStatus, filterMonth, sortConfig, students]);

  const stats = useMemo(() => {
    const totalCount = invoices.length;
    const pendingCount = invoices.filter(i => i.paymentStatus === 'PENDING').length;
    const totalPendingAmount = invoices.filter(i => i.paymentStatus === 'PENDING').reduce((a, b) => a + b.netAmount, 0);
    const totalPaidAmount = invoices.filter(i => i.paymentStatus === 'PAID').reduce((a, b) => a + b.netAmount, 0);
    return { totalCount, pendingCount, totalPendingAmount, totalPaidAmount };
  }, [invoices]);

  if (isLoading && invoices.length === 0) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-brand-blue/10 border-t-brand-blue rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 pb-32 max-w-[1600px] mx-auto space-y-6 font-sans bg-slate-50/30 min-h-screen">
      
      {/* --- Header - Compact --- */}
      <header className="flex flex-col md:flex-row md:items-center justify-between bg-white p-6 rounded-3xl shadow-sm border border-slate-100 gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg">
            <Receipt size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Faturas</h1>
            <p className="text-slate-500 font-medium text-xs mt-1 uppercase tracking-widest opacity-60">Gestão de recebíveis e liquidação.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => setShowImportModal(true)} className="flex items-center gap-3 bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-md">
             <Upload size={16} className="text-brand-lime" /> Importar Retorno
          </button>
        </div>
      </header>

      {/* --- Stats - Compact --- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-6 rounded-3xl bg-slate-900 text-white shadow-lg">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Total</p>
          <p className="text-2xl font-black tracking-tight">{formatCurrencyBRL(stats.totalPaidAmount + stats.totalPendingAmount)}</p>
        </div>
        <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 text-emerald-600">Liquidados</p>
          <p className="text-2xl font-black tracking-tight text-emerald-600">{formatCurrencyBRL(stats.totalPaidAmount)}</p>
        </div>
        <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 text-brand-blue">A Receber</p>
          <p className="text-2xl font-black tracking-tight text-brand-blue">{formatCurrencyBRL(stats.totalPendingAmount)}</p>
        </div>
        <div className="p-6 rounded-3xl bg-indigo-50 border border-indigo-100 shadow-sm">
          <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-4">Liquidez</p>
          <p className="text-2xl font-black tracking-tight text-indigo-600">
             {stats.totalCount > 0 ? Math.round(((stats.totalCount - stats.pendingCount) / stats.totalCount) * 100) : 0}%
          </p>
        </div>
      </div>

      {/* --- Filter & Bulk - Compact --- */}
      <div className="flex flex-col lg:flex-row gap-4 bg-white p-4 rounded-3xl shadow-sm border border-slate-100 items-center">
        <div className="relative flex-1 group w-full">
           <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
           <input 
             type="text" placeholder="BUSCAR FATURA OU ALUNO..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
             className="w-full pl-12 pr-6 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:border-brand-blue outline-none font-bold text-slate-700 text-sm shadow-inner"
           />
        </div>
        
        <div className="flex items-center gap-3 w-full lg:w-auto">
           <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100">
              {(['ALL', 'PENDING', 'PAID'] as const).map(st => (
                <button key={st} onClick={() => setFilterStatus(st)} className={cn("px-4 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all", filterStatus === st ? "bg-white shadow-sm text-slate-900 border border-slate-100" : "text-slate-400")}>
                  {st === 'ALL' ? 'Todas' : st === 'PENDING' ? 'Pendentes' : 'Pagas'}
                </button>
              ))}
           </div>

           {selectedIds.size > 0 && (
             <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-xl">
                <button onClick={() => handleBulkAction('PAY')} className="px-3 py-2 text-emerald-400 font-black text-[9px] uppercase tracking-widest hover:bg-white/10 rounded-lg">Baixar</button>
                <button onClick={() => handleBulkAction('DELETE')} className="px-3 py-2 text-red-400 font-black text-[9px] uppercase tracking-widest hover:bg-white/10 rounded-lg">Excluir</button>
             </div>
           )}
        </div>
      </div>

      {/* --- Invoices List - Compact Table --- */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 w-10">
                   <input type="checkbox" checked={selectedIds.size === filteredInvoices.length && filteredInvoices.length > 0} 
                     onChange={() => {
                       if (selectedIds.size === filteredInvoices.length) setSelectedIds(new Set());
                       else setSelectedIds(new Set(filteredInvoices.map(i => i.id)));
                     }}
                     className="w-4 h-4 rounded border-slate-300" />
                </th>
                <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Aluno</th>
                <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Vencimento</th>
                <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Valor</th>
                <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                <th className="px-6 py-4 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredInvoices.map((inv) => (
                <tr key={inv.id} className={cn("group transition-all hover:bg-slate-50", selectedIds.has(inv.id) ? "bg-brand-blue/5" : "")}>
                  <td className="px-6 py-3">
                     <input type="checkbox" checked={selectedIds.has(inv.id)} onChange={() => toggleSelect(inv.id)} className="w-4 h-4 rounded border-slate-300" />
                  </td>
                  <td className="px-4 py-3">
                     <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{getStudentName(inv.studentId)}</p>
                  </td>
                  <td className="px-4 py-3">
                     <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{format(new Date(inv.dueDate), "dd 'de' MMM", { locale: ptBR })}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                     <span className="text-sm font-black text-slate-900 tracking-tight">{formatCurrencyBRL(inv.netAmount)}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                     <span className={cn(
                       "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border",
                       inv.paymentStatus === 'PAID' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"
                     )}>
                       {inv.paymentStatus === 'PAID' ? 'Pago' : 'Pendente'}
                     </span>
                  </td>
                  <td className="px-6 py-3 text-right">
                     <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        {inv.paymentStatus === 'PENDING' && (
                          <button onClick={() => setPayTarget({ id: inv.id, name: getStudentName(inv.studentId) })} className="p-1.5 text-slate-400 hover:text-emerald-500 transition-colors"><CheckCircle2 size={16} /></button>
                        )}
                        <button onClick={() => setDeleteTarget({ id: inv.id, name: getStudentName(inv.studentId) })} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                     </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog isOpen={!!deleteTarget} title="Excluir" message={`Deseja excluir a fatura de "${deleteTarget?.name}"?`} confirmLabel="Excluir" variant="danger" onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
      <ConfirmDialog isOpen={!!payTarget} title="Liquidar" message={`Confirmar recebimento de "${payTarget?.name}"?`} confirmLabel="Liquidar" variant="info" onConfirm={() => handleMarkAsPaid()} onCancel={() => setPayTarget(null)} />
      {showImportModal && <ImportPaymentsModal boletoFee={boletoFee} onClose={() => setShowImportModal(false)} onComplete={loadData} />}
    </div>
  );
}
