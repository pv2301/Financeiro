import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Receipt, Search, CheckCircle2, AlertCircle, Trash2, 
  Phone, Clock, Upload, ArrowUpDown, Copy, X, 
  Calendar, Filter, Download, Zap, TrendingUp,
  CreditCard, ShieldCheck, ArrowUpRight, ChevronRight,
  MoreVertical, Layers, Activity, MousePointer2,
  PieChart, DollarSign, Wallet, ShieldAlert,
  Globe, Smartphone, Barcode, LayoutList, Columns,
  Archive, RotateCcw, Ban, Eye, EyeOff
} from 'lucide-react';
import { Invoice, Student, ClassInfo } from '../types';
import { finance } from '../services/finance';
import { format, isSameDay, parseISO, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ConfirmDialog from '../components/ConfirmDialog';
import ImportPaymentsModal from '../components/ImportPaymentsModal';
import { formatCurrencyBRL, cn } from '../lib/utils';
import { usePersistentSelection } from '../hooks/usePersistentSelection';

type FilterCategory = 'ALL' | 'FIXED' | 'CONSUMPTION' | 'INTEGRAL';

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'PAID' | 'CANCELLED'>('ALL');
  const [view, setView] = useState<'ACTIVE' | 'ARCHIVED'>('ACTIVE');
  const [showCancelled, setShowCancelled] = useState(false);
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('ALL');
  const [filterMonth, setFilterMonth] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [groupByDate, setGroupByDate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<{ id: string; name: string } | null>(null);
  const [payTarget, setPayTarget] = useState<{ id: string; name: string } | null>(null);
  const { selectedIds, toggleId, toggleAll, clearAll } = usePersistentSelection('invoices_selected_ids');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'dueDate', direction: 'desc' });
  const [boletoFee, setBoletoFee] = useState(3.5);
  const [editPaymentDate, setEditPaymentDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [editAmountCharged, setEditAmountCharged] = useState<number>(0);

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
      
      // Auto-archive check (paid > 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const toAutoArchive = invData.filter(i => 
        i.paymentStatus === 'PAID' && 
        !i.archivedAt && 
        i.paymentDate && 
        new Date(i.paymentDate) < thirtyDaysAgo
      );

      if (toAutoArchive.length > 0) {
        await Promise.all(toAutoArchive.map(i => finance.archiveInvoice(i.id)));
        const updatedInvoices = await finance.getInvoices();
        setInvoices(updatedInvoices);
      } else {
        setInvoices(invData);
      }

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

  const handleMarkAsPaid = async (method: 'PIX' | 'BOLETO') => {
    if (!payTarget) return;
    const inv = invoices.find(i => i.id === payTarget.id);
    if (inv) {
      const referenceAmount = inv.netAmount;
      const oscilacao = editAmountCharged - referenceAmount;

      await finance.saveInvoice({ 
        ...inv, 
        paymentStatus: 'PAID',
        paymentMethod: method,
        paymentDate: editPaymentDate,
        amountCharged: editAmountCharged,
        oscilacao
      });
      showToast(`Fatura Paga via ${method}!`);
      await loadData();
    }
    setPayTarget(null);
  };

  useEffect(() => {
    if (payTarget) {
      const inv = invoices.find(i => i.id === payTarget.id);
      setEditPaymentDate(format(new Date(), "yyyy-MM-dd"));
      setEditAmountCharged(inv?.netAmount || 0);
    }
  }, [payTarget, invoices]);

  const confirmCancel = async () => {
    if (!deleteTarget) return;
    await finance.cancelInvoice(deleteTarget.id);
    setDeleteTarget(null);
    await loadData();
  };

  const confirmArchive = async () => {
    if (!archiveTarget) return;
    await finance.archiveInvoice(archiveTarget.id);
    setArchiveTarget(null);
    await loadData();
  };

  const handleBulkAction = async (action: 'PAY' | 'CANCEL' | 'ARCHIVE') => {
    setIsLoading(true);
    try {
      const ids = Array.from(selectedIds);
      if (action === 'PAY') {
        await Promise.all(ids.map(id => {
          const inv = invoices.find(i => i.id === id);
          return inv ? finance.saveInvoice({ 
            ...inv, 
            paymentStatus: 'PAID',
            paymentMethod: 'PIX', // Default bulk to PIX for manual
            paymentDate: new Date().toISOString(),
            amountCharged: inv.netAmount,
            oscilacao: 0
          }) : Promise.resolve();
        }));
      } else if (action === 'CANCEL') {
        await Promise.all(ids.map(id => finance.cancelInvoice(id)));
      } else if (action === 'ARCHIVE') {
        await Promise.all(ids.map(id => finance.archiveInvoice(id)));
      }
      clearAll();
      await loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      // Visibility logic
      const isArchived = !!inv.archivedAt;
      const isCancelled = inv.paymentStatus === 'CANCELLED';

      if (view === 'ACTIVE' && isArchived) return false;
      if (view === 'ARCHIVED' && !isArchived) return false;
      if (isCancelled && !showCancelled && filterStatus !== 'CANCELLED') return false;

      const name = getStudentName(inv.studentId).toLowerCase();
      const matchesSearch = name.includes(searchTerm.toLowerCase()) || inv.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'ALL' || inv.paymentStatus === filterStatus;
      const matchesMonth = !filterMonth || inv.monthYear === filterMonth;
      
      let matchesCategory = true;
      if (filterCategory === 'FIXED') matchesCategory = (inv.billingMode !== 'POSTPAID_CONSUMPTION' && !inv.isIntegral);
      if (filterCategory === 'CONSUMPTION') matchesCategory = (inv.billingMode === 'POSTPAID_CONSUMPTION');
      if (filterCategory === 'INTEGRAL') matchesCategory = !!inv.isIntegral;

      return matchesSearch && matchesStatus && matchesMonth && matchesCategory;
    }).sort((a, b) => {
      if (!sortConfig) return 0;
      const valA = a[sortConfig.key as keyof Invoice];
      const valB = b[sortConfig.key as keyof Invoice];
      if (valA === undefined || valB === undefined) return 0;
      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [invoices, searchTerm, filterStatus, filterCategory, filterMonth, sortConfig, students, view, showCancelled]);

  const groupedInvoices = useMemo(() => {
    if (!groupByDate) return { 'Tudo': filteredInvoices };
    
    const groups: Record<string, Invoice[]> = {};
    filteredInvoices.forEach(inv => {
      let dateKey = 'Histórico';
      if (inv.createdAt) {
        const date = parseISO(inv.createdAt);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);

        if (isSameDay(date, today)) dateKey = 'HOJE';
        else if (isSameDay(date, yesterday)) dateKey = 'ONTEM';
        else dateKey = format(date, "EEEE, dd 'de' MMMM", { locale: ptBR }).toUpperCase();
      }
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(inv);
    });
    return groups;
  }, [filteredInvoices, groupByDate]);

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
          <button 
            onClick={() => setGroupByDate(!groupByDate)} 
            className={cn(
              "flex items-center gap-2 px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border",
              groupByDate ? "bg-brand-blue/5 border-brand-blue text-brand-blue" : "bg-white border-slate-200 text-slate-400 hover:border-slate-300"
            )}
          >
            {groupByDate ? <LayoutList size={16} /> : <Columns size={16} />}
            {groupByDate ? "Visão Agrupada" : "Visão em Lista"}
          </button>
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
      <div className="space-y-4 bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
        <div className="flex flex-col lg:flex-row gap-4 items-center">
          <div className="relative flex-1 group w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
            <input 
              type="text" placeholder="BUSCAR FATURA OU ALUNO..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-brand-blue outline-none font-bold text-slate-700 text-sm shadow-inner transition-all"
            />
          </div>
          
          <div className="flex items-center gap-3 w-full lg:w-auto">
            <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100 shadow-inner">
                {(['ALL', 'PENDING', 'PAID', 'CANCELLED'] as const).map(st => (
                  <button key={st} onClick={() => {
                    setFilterStatus(st);
                    if (st === 'CANCELLED') setShowCancelled(true);
                  }} className={cn("px-5 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all", filterStatus === st ? "bg-white shadow-md text-slate-900 border border-slate-100" : "text-slate-400 hover:text-slate-600")}>
                    {st === 'ALL' ? 'Todas' : st === 'PENDING' ? 'Pendentes' : st === 'PAID' ? 'Pagas' : 'Canceladas'}
                  </button>
                ))}
            </div>

            <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100 shadow-inner ml-2">
                <button onClick={() => setView('ACTIVE')} className={cn("px-5 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all", view === 'ACTIVE' ? "bg-white shadow-md text-slate-900 border border-slate-100" : "text-slate-400 hover:text-slate-600")}>
                   <Activity size={14} className="inline mr-2" /> Ativas
                </button>
                <button onClick={() => setView('ARCHIVED')} className={cn("px-5 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all", view === 'ARCHIVED' ? "bg-white shadow-md text-slate-900 border border-slate-100" : "text-slate-400 hover:text-slate-600")}>
                   <Archive size={14} className="inline mr-2" /> Arquivadas
                </button>
            </div>

            <button 
              onClick={() => setShowCancelled(!showCancelled)} 
              className={cn(
                "p-3 rounded-xl border transition-all",
                showCancelled ? "bg-rose-50 border-rose-200 text-rose-500" : "bg-white border-slate-200 text-slate-400"
              )}
              title={showCancelled ? "Ocultar Cancelados" : "Exibir Cancelados"}
            >
              {showCancelled ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>

            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-2xl shadow-lg border border-white/10">
                  <button onClick={() => handleBulkAction('PAY')} className="px-4 py-2.5 text-emerald-400 font-black text-[9px] uppercase tracking-widest hover:bg-white/10 rounded-xl transition-all">Baixar</button>
                  <button onClick={() => handleBulkAction('ARCHIVE')} className="px-4 py-2.5 text-indigo-400 font-black text-[9px] uppercase tracking-widest hover:bg-white/10 rounded-xl transition-all">Arquivar</button>
                  <button onClick={() => handleBulkAction('CANCEL')} className="px-4 py-2.5 text-rose-400 font-black text-[9px] uppercase tracking-widest hover:bg-white/10 rounded-xl transition-all">Cancelar</button>
              </div>
            )}
          </div>
        </div>

        {/* Categoria Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2">
          {(['ALL', 'FIXED', 'CONSUMPTION', 'INTEGRAL'] as const).map(cat => (
            <button 
              key={cat} 
              onClick={() => setFilterCategory(cat)} 
              className={cn(
                "px-5 py-2 rounded-full font-black text-[8px] uppercase tracking-[0.15em] transition-all border",
                filterCategory === cat 
                  ? "bg-slate-900 text-white border-slate-900 shadow-md" 
                  : "bg-white text-slate-400 border-slate-200 hover:border-slate-400"
              )}
            >
              {cat === 'ALL' ? 'Todos os Tipos' : cat === 'FIXED' ? 'Mensalidade' : cat === 'CONSUMPTION' ? 'Consumo' : 'Integral'}
            </button>
          ))}
          
          <div className="ml-auto flex items-center gap-3">
             <select 
               value={sortConfig?.key || 'dueDate'} 
               onChange={(e) => setSortConfig({ key: e.target.value, direction: 'desc' })}
               className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-[9px] font-black uppercase tracking-widest text-slate-500 focus:outline-none"
             >
                <option value="dueDate">Ordenar por Vencimento</option>
                <option value="createdAt">Ordenar por Geração</option>
                <option value="netAmount">Ordenar por Valor</option>
             </select>
          </div>
        </div>
      </div>

      {/* --- Invoices List - Compact Table --- */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="max-h-[calc(100vh-220px)] overflow-y-auto relative scrollbar-gutter-stable">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead className="sticky top-0 z-10 bg-white">
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-5 w-10 border-b border-slate-100">
                   <input type="checkbox" checked={selectedIds.size > 0 && selectedIds.size === filteredInvoices.length} 
                     onChange={() => toggleAll(filteredInvoices.map(i => i.id))}
                     className="w-4 h-4 rounded border-slate-300 accent-brand-blue" />
                </th>
                <th className="px-4 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Aluno / Pagador</th>
                <th className="px-4 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Boleto</th>
                <th className="px-4 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Vencimento</th>
                <th className="px-4 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Liquidação</th>
                <th className="px-4 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right border-b border-slate-100">Valor</th>
                <th className="px-4 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right border-b border-slate-100">Valor Cobrado</th>
                <th className="px-4 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center border-b border-slate-100">Status</th>
                <th className="px-8 py-5 w-16 border-b border-slate-100"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {Object.entries(groupedInvoices).map(([group, invs]) => (
                <React.Fragment key={group}>
                  {groupByDate && (
                    <tr className="bg-slate-50/80">
                      <td colSpan={9} className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] shadow-inner">
                         {group}
                      </td>
                    </tr>
                  )}
                  {invs.map((inv) => (
                    <tr key={inv.id} className={cn("group transition-all hover:bg-slate-50", selectedIds.has(inv.id) ? "bg-brand-blue/5" : "")}>
                      <td className="px-8 py-4">
                         <input type="checkbox" checked={selectedIds.has(inv.id)} onChange={() => toggleId(inv.id)} className="w-4 h-4 rounded border-slate-300 accent-brand-blue" />
                      </td>
                      <td className="px-4 py-4">
                         <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{getStudentName(inv.studentId)}</p>
                         {inv.pagador && (
                           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Pago por: {inv.pagador}</p>
                         )}
                      </td>
                      <td className="px-4 py-4">
                         <span className="text-[10px] font-bold text-slate-600 tracking-wider font-mono">{inv.bankSlipNumber || inv.nossoNumero || '-'}</span>
                      </td>
                      <td className="px-4 py-4">
                         <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{format(new Date(inv.dueDate), "dd/MM/yyyy")}</span>
                      </td>
                      <td className="px-4 py-4">
                         <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                           {inv.paymentDate ? format(new Date(inv.paymentDate), "dd/MM/yyyy") : '-'}
                         </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                         <div className="flex flex-col items-end">
                           <span className={cn(
                             "text-sm font-black tracking-tight",
                             inv.paymentStatus === 'PAID' && inv.paymentDate && new Date(inv.paymentDate) <= new Date(inv.dueDate) && students.find(s => s.id === inv.studentId)?.hasTimelyPaymentDiscount
                               ? "text-emerald-600"
                               : "text-slate-900"
                           )}>
                             {(() => {
                               const student = students.find(s => s.id === inv.studentId);
                               const isPaidInTime = inv.paymentStatus === 'PAID' && inv.paymentDate && new Date(inv.paymentDate) <= new Date(inv.dueDate);
                               const hasDiscount = student?.hasTimelyPaymentDiscount && student.personalDiscount > 0;
                               
                               if (isPaidInTime && hasDiscount) {
                                 return formatCurrencyBRL(inv.netAmount - (inv.personalDiscountAmount || 0));
                               }
                               return formatCurrencyBRL(inv.netAmount);
                             })()}
                           </span>
                           {(() => {
                             const student = students.find(s => s.id === inv.studentId);
                             const isPaidInTime = inv.paymentStatus === 'PAID' && inv.paymentDate && new Date(inv.paymentDate) <= new Date(inv.dueDate);
                             if (isPaidInTime && student?.hasTimelyPaymentDiscount && student.personalDiscount > 0) {
                               return (
                                 <span className="text-[8px] font-black text-emerald-500 uppercase tracking-tighter">
                                   Desc. Pontualidade Aplicado
                                 </span>
                               );
                             }
                             return null;
                           })()}
                         </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                         <span className="text-sm font-black text-slate-700 tracking-tight">
                           {inv.amountCharged !== undefined ? formatCurrencyBRL(inv.amountCharged) : '-'}
                         </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                         <div className="flex flex-col items-center gap-1">
                            <span className={cn(
                               "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border",
                               inv.paymentStatus === 'PAID' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : 
                               inv.paymentStatus === 'CANCELLED' ? "bg-slate-100 text-slate-400 border-slate-200" :
                               "bg-amber-50 text-amber-600 border-amber-100"
                            )}>
                               {inv.paymentStatus === 'PAID' ? 'Pago' : inv.paymentStatus === 'CANCELLED' ? 'Cancelado' : 'Pendente'}
                            </span>
                           {inv.paymentMethod && (
                             <span className="text-[8px] font-black text-slate-300 uppercase tracking-tighter">{inv.paymentMethod}</span>
                           )}
                         </div>
                      </td>
                      <td className="px-8 py-4 text-right">
                         <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                             {inv.paymentStatus === 'PENDING' && (
                               <button onClick={() => setPayTarget({ id: inv.id, name: getStudentName(inv.studentId) })} className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all" title="Baixar"><CheckCircle2 size={18} /></button>
                             )}
                             {inv.paymentStatus === 'PAID' && !inv.archivedAt && (
                               <button onClick={() => setArchiveTarget({ id: inv.id, name: getStudentName(inv.studentId) })} className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-all" title="Arquivar"><Archive size={18} /></button>
                             )}
                             {inv.paymentStatus !== 'CANCELLED' && (
                               <button onClick={() => setDeleteTarget({ id: inv.id, name: getStudentName(inv.studentId) })} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Cancelar"><Ban size={18} /></button>
                             )}
                         </div>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog isOpen={!!deleteTarget} title="Cancelar Fatura" message={`Deseja cancelar permanentemente a fatura de "${deleteTarget?.name}"? Esta ação não pode ser desfeita.`} confirmLabel="Cancelar Fatura" variant="danger" onConfirm={confirmCancel} onCancel={() => setDeleteTarget(null)} />
      <ConfirmDialog isOpen={!!archiveTarget} title="Arquivar Fatura" message={`Deseja arquivar a fatura de "${archiveTarget?.name}"? Ela será movida para a aba de histórico.`} confirmLabel="Arquivar" variant="info" onConfirm={confirmArchive} onCancel={() => setArchiveTarget(null)} />
      
      {/* Modal de Método de Pagamento */}
      <AnimatePresence>
        {payTarget && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
             <motion.div 
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.9, opacity: 0 }}
               className="bg-white rounded-[2.5rem] w-full max-w-md p-10 shadow-2xl border border-white/20"
             >
                <div className="text-center mb-8">
                   <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-inner">
                      <DollarSign size={32} />
                   </div>
                   <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Baixa Manual</h3>
                   <p className="text-sm text-slate-500 font-medium mt-2">Informe os detalhes do recebimento para <br/><span className="text-slate-900 font-black uppercase">{payTarget.name}</span></p>
                </div>

                <div className="space-y-6 mb-8">
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                         <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Liquidação</label>
                         <input 
                           type="date" 
                           value={editPaymentDate} 
                           onChange={(e) => setEditPaymentDate(e.target.value)}
                           className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:border-brand-blue outline-none transition-all"
                         />
                      </div>
                      <div className="space-y-1.5">
                         <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Valor Cobrado</label>
                         <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-300">R$</span>
                            <input 
                              type="number" 
                              step="0.01"
                              value={editAmountCharged} 
                              onChange={(e) => setEditAmountCharged(Number(e.target.value))}
                              className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-10 pr-4 py-3 text-sm font-black focus:border-brand-blue outline-none transition-all"
                            />
                         </div>
                      </div>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <button 
                     onClick={() => handleMarkAsPaid('PIX')}
                     className="flex flex-col items-center gap-4 p-8 rounded-[2rem] bg-slate-50 border border-slate-100 hover:border-emerald-500 hover:bg-emerald-50 transition-all group"
                   >
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-emerald-500 shadow-sm transition-all">
                        <Smartphone size={24} />
                      </div>
                      <span className="text-[11px] font-black uppercase tracking-widest text-slate-600 group-hover:text-emerald-600">Baixar via PIX</span>
                   </button>

                   <button 
                     onClick={() => handleMarkAsPaid('BOLETO')}
                     className="flex flex-col items-center gap-4 p-8 rounded-[2rem] bg-slate-50 border border-slate-100 hover:border-brand-blue hover:bg-brand-blue/5 transition-all group"
                   >
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-brand-blue shadow-sm transition-all">
                        <DollarSign size={24} />
                      </div>
                      <span className="text-[11px] font-black uppercase tracking-widest text-slate-600 group-hover:text-brand-blue">Baixar via Espécie</span>
                   </button>
                </div>

                <button 
                  onClick={() => setPayTarget(null)}
                  className="w-full mt-8 py-4 text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] hover:text-slate-600 transition-all"
                >
                  Cancelar
                </button>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {showImportModal && <ImportPaymentsModal boletoFee={boletoFee} onClose={() => setShowImportModal(false)} onComplete={loadData} />}
    </div>
  );
}
