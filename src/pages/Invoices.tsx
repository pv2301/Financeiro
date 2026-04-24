import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Receipt, Search, CheckCircle2, AlertCircle, Trash2, Phone, Clock, Upload, ArrowUpDown, Copy, X } from 'lucide-react';
import Tooltip from '../components/Tooltip';
import { Invoice, Student } from '../types';
import { finance } from '../services/finance';
import { format } from 'date-fns';
import ConfirmDialog from '../components/ConfirmDialog';
import ImportPaymentsModal from '../components/ImportPaymentsModal';
import { formatCurrencyBRL } from '../lib/utils';

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'PAID'>('ALL');
  const [filterMonth, setFilterMonth] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [payTarget, setPayTarget] = useState<{ id: string; name: string } | null>(null);
  const [boletoFee, setBoletoFee] = useState(3.50);

  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [showBulkPayConfirm, setShowBulkPayConfirm] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [invData, stuData, config] = await Promise.all([
        finance.getInvoices(),
        finance.getStudents(),
        finance.getGlobalConfig()
      ]);
      setInvoices(invData.sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()));
      setStudents(stuData);
      if (config) setBoletoFee(config.boletoEmissionFee);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const getStudentName = (id: string) => students.find(s => s.id === id)?.name || 'Desconhecido';
  const getStudentPhone = (id: string) => students.find(s => s.id === id)?.contactPhone || '';

  const formatStudentCopyId = (name: string) => {
    return name.replace(/\s+/g, '').toUpperCase() + '_';
  };

  const handleMarkAsPaid = async () => {
    if (!payTarget) return;
    const invToUpdate = invoices.find(i => i.id === payTarget.id);
    if (invToUpdate) {
      await finance.saveInvoice({ ...invToUpdate, paymentStatus: 'PAID' });
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

  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (current?.key === key) {
        if (current.direction === 'asc') return { key, direction: 'desc' };
        return null;
      }
      return { key, direction: 'asc' };
    });
  };

  const toggleSelectAll = () => {
    if (selectedInvoices.size === sortedInvoices.length && sortedInvoices.length > 0) {
      setSelectedInvoices(new Set());
    } else {
      setSelectedInvoices(new Set(sortedInvoices.map(i => i.id!)));
    }
  };

  const toggleSelectInvoice = (id: string) => {
    const newSet = new Set(selectedInvoices);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedInvoices(newSet);
  };

  const handleBulkMarkAsPaid = async () => {
    setIsLoading(true);
    try {
      const promises = Array.from(selectedInvoices).map(id => {
        const inv = invoices.find(i => i.id === id);
        if (inv && inv.paymentStatus === 'PENDING') {
          return finance.saveInvoice({ ...inv, paymentStatus: 'PAID' });
        }
        return Promise.resolve();
      });
      await Promise.all(promises);
      setSelectedInvoices(new Set());
      setShowBulkPayConfirm(false);
      await loadData();
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    setIsLoading(true);
    try {
      const promises = Array.from(selectedInvoices).map(id => finance.deleteInvoice(id));
      await Promise.all(promises);
      setSelectedInvoices(new Set());
      setShowBulkDeleteConfirm(false);
      await loadData();
    } finally {
      setIsLoading(false);
    }
  };

  // Extract unique months for filter
  const uniqueMonths = Array.from(new Set(invoices.map(i => i.monthYear))).sort().reverse();

  const filteredInvoices = invoices.filter(inv => {
    const sName = getStudentName(inv.studentId).toLowerCase();
    const matchesSearch = sName.includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || inv.paymentStatus === filterStatus;
    const matchesMonth = !filterMonth || inv.monthYear === filterMonth;
    return matchesSearch && matchesStatus && matchesMonth;
  });

  const sortedInvoices = React.useMemo(() => {
    let sortable = [...filteredInvoices];
    if (sortConfig !== null) {
      sortable.sort((a, b) => {
        let aVal: any = '';
        let bVal: any = '';
        if (sortConfig.key === 'status') {
          aVal = a.paymentStatus;
          bVal = b.paymentStatus;
        } else if (sortConfig.key === 'student') {
          aVal = getStudentName(a.studentId);
          bVal = getStudentName(b.studentId);
        } else if (sortConfig.key === 'monthYear') {
          aVal = a.monthYear;
          bVal = b.monthYear;
        } else if (sortConfig.key === 'netAmount') {
          aVal = a.netAmount;
          bVal = b.netAmount;
        } else if (sortConfig.key === 'dueDate') {
          aVal = new Date(a.dueDate).getTime();
          bVal = new Date(b.dueDate).getTime();
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortable;
  }, [filteredInvoices, sortConfig, students]);

  const totalAmount = filteredInvoices.reduce((acc, curr) => acc + curr.netAmount, 0);
  const pendingAmount = filteredInvoices.filter(i => i.paymentStatus === 'PENDING').reduce((acc, curr) => acc + curr.netAmount, 0);

  const renderSortHeader = (label: string, key: string, align: 'left' | 'right' | 'center' = 'left') => (
    <th className={`px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors ${align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'}`} onClick={() => handleSort(key)}>
      <div className={`flex items-center gap-2 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'}`}>
        {label}
        {label === 'Valor Líquido' && <Tooltip title="Líquido Final" content="Valor final do boleto a ser pago. Cálculo: Bruto - Descontos." />}
        <ArrowUpDown size={12} className={sortConfig?.key === key ? 'text-brand-blue' : 'text-slate-300'} />
      </div>
    </th>
  );

  return (
    <div className="p-4 pb-24 max-w-full mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} 
        className="flex flex-col md:flex-row md:justify-between md:items-center bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shadow-inner">
            <Receipt size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-brand-blue uppercase tracking-tight">Financeiro</h1>
            <p className="text-slate-500 font-medium">Controle de boletos, baixas e inadimplência.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:flex-none md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Buscar aluno..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand-blue/10 transition-all font-medium text-slate-600"
            />
          </div>
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand-blue/10 font-bold text-slate-600 cursor-pointer"
          >
            <option value="ALL">Todos Status</option>
            <option value="PENDING">Pendentes</option>
            <option value="PAID">Pagos</option>
          </select>

          <select 
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand-blue/10 font-bold text-slate-600 cursor-pointer"
          >
            <option value="">Todos os Meses</option>
            {uniqueMonths.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          <button onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 bg-emerald-500 text-white px-5 py-3 rounded-2xl font-black text-sm hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20">
            <Upload size={18} />
            Baixa Bancária
          </button>
        </div>
      </motion.div>

      {/* Stats row */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-brand-blue/20 transition-all">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Previsto</p>
            <p className="text-2xl font-black text-brand-blue">{formatCurrencyBRL(totalAmount)}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-brand-blue/5 flex items-center justify-center text-brand-blue/40 group-hover:bg-brand-blue group-hover:text-white transition-all shadow-inner">
            <Receipt size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-emerald-200 transition-all">
          <div>
            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Total Pago</p>
            <p className="text-2xl font-black text-emerald-600">
              {formatCurrencyBRL(filteredInvoices.filter(i => i.paymentStatus === 'PAID').reduce((acc, curr) => acc + curr.netAmount, 0))}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-inner">
            <CheckCircle2 size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-red-200 transition-all">
          <div>
            <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Total Pendente</p>
            <p className="text-2xl font-black text-red-500">{formatCurrencyBRL(pendingAmount)}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-red-400 group-hover:bg-red-500 group-hover:text-white transition-all shadow-inner">
            <AlertCircle size={24} />
          </div>
        </div>
      </motion.div>

      {/* List */}
      <div className="space-y-4">
        {selectedInvoices.size > 0 && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-brand-blue text-white p-4 rounded-2xl shadow-lg flex items-center justify-between sticky top-4 z-30">
            <div className="font-bold">
              {selectedInvoices.size} {selectedInvoices.size === 1 ? 'boleto selecionado' : 'boletos selecionados'}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowBulkPayConfirm(true)} className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl font-bold transition-colors flex items-center gap-2 text-sm">
                <CheckCircle2 size={16} /> Receber
              </button>
              <button onClick={() => setShowBulkDeleteConfirm(true)} className="bg-red-500/80 hover:bg-red-500 px-4 py-2 rounded-xl font-bold transition-colors flex items-center gap-2 text-sm">
                <Trash2 size={16} /> Excluir
              </button>
            </div>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
          {isLoading ? (
            <div className="p-20 text-center">
               <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-brand-blue/20 border-t-brand-blue rounded-full animate-spin"></div>
                  <p className="text-slate-500 font-bold animate-pulse tracking-widest uppercase text-xs">Carregando faturas...</p>
                </div>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="p-20 text-center flex flex-col items-center justify-center gap-4">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                <Receipt size={40} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-700 uppercase tracking-widest">Nenhum boleto encontrado</h3>
                <p className="text-slate-500 font-medium max-w-md mx-auto mt-1">Não há boletos para os filtros selecionados.</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-50 text-[11px] font-black text-slate-400 uppercase tracking-widest select-none">
                    <th className="px-6 py-5 w-12">
                      <input 
                        type="checkbox" 
                        checked={selectedInvoices.size === sortedInvoices.length && sortedInvoices.length > 0}
                        onChange={toggleSelectAll}
                        className="w-5 h-5 rounded-lg border-2 border-slate-300 text-brand-blue focus:ring-brand-blue transition-all cursor-pointer"
                      />
                    </th>
                    {renderSortHeader('Vencimento', 'dueDate')}
                    {renderSortHeader('Aluno', 'student')}
                    {renderSortHeader('Referência', 'monthYear')}
                    <th className="px-6 py-5">Nº Boleto</th>
                    <th className="px-6 py-5">
                      <div className="flex items-center gap-1">
                        Descontos
                        <Tooltip title="Descontos" content="Soma de descontos por faltas (proporcional aos dias letivos) e descontos pessoais (ex: funcionário/acordo)." />
                      </div>
                    </th>
                    {renderSortHeader('Valor Líquido', 'netAmount', 'right')}
                    <th className="px-6 py-5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {sortedInvoices.map(inv => {
                    const isOverdue = inv.paymentStatus === 'PENDING' && new Date(inv.dueDate) < new Date();
                    
                    return (
                      <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <input 
                            type="checkbox" 
                            checked={selectedInvoices.has(inv.id!)}
                            onChange={() => toggleSelectInvoice(inv.id!)}
                            className="w-5 h-5 rounded-lg border-2 border-slate-300 text-brand-blue focus:ring-brand-blue transition-all cursor-pointer"
                          />
                        </td>
                        <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          {inv.paymentStatus === 'PAID' ? (
                            <Tooltip title="Repasse Colégio" content={`Valor de repasse: ${formatCurrencyBRL(inv.collegeShareAmount || 0)}`}>
                              <span className="inline-flex w-fit items-center gap-1 bg-emerald-50 text-emerald-600 font-black px-2.5 py-1 rounded-md text-[10px] uppercase tracking-widest cursor-help">
                                <CheckCircle2 size={12} /> Pago
                              </span>
                            </Tooltip>
                          ) : isOverdue ? (
                            <span className="inline-flex w-fit items-center gap-1 bg-red-50 text-red-600 font-black px-2.5 py-1 rounded-md text-[10px] uppercase tracking-widest">
                              <AlertCircle size={12} /> Vencido
                            </span>
                          ) : (
                            <span className="inline-flex w-fit items-center gap-1 bg-amber-50 text-amber-600 font-black px-2.5 py-1 rounded-md text-[10px] uppercase tracking-widest">
                              <Clock size={12} /> Pendente
                            </span>
                          )}
                          <span className="text-sm font-bold text-slate-600">
                            {format(new Date(inv.dueDate), 'dd/MM/yyyy')}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-800 group-hover:text-brand-blue transition-colors">
                            {getStudentName(inv.studentId)}
                          </span>
                          <button 
                            onClick={() => {
                              const sName = getStudentName(inv.studentId);
                              const formattedId = formatStudentCopyId(sName);
                              navigator.clipboard.writeText(formattedId);
                              setToast(`ID de ${sName} copiado!`);
                              setTimeout(() => setToast(null), 2000);
                            }}
                            className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-brand-blue transition-colors"
                            title="Copiar ID Formatado"
                          >
                            <Copy size={12} />
                          </button>
                        </div>
                        {inv.note && (
                          <p className="text-[10px] font-medium text-amber-600 italic mt-0.5">
                            Nota: {inv.note}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-400 text-sm uppercase">
                        {inv.monthYear}
                      </td>
                      <td className="px-6 py-4">
                        {inv.bankSlipNumber ? (
                          <span className="text-xs font-black text-slate-700 bg-slate-50 px-2 py-1 rounded border border-slate-100 uppercase tracking-tight">
                            {inv.bankSlipNumber}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-300 italic">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-[10px] text-slate-400 font-black flex flex-col gap-0.5 uppercase tracking-wider">
                          {inv.absenceDiscountAmount > 0 && <span>Faltas: <span className="text-red-500">-{formatCurrencyBRL(inv.absenceDiscountAmount)}</span> ({inv.absenceDays}d)</span>}
                          {inv.personalDiscountAmount > 0 && <span>Pessoal: <span className="text-emerald-500">-{formatCurrencyBRL(inv.personalDiscountAmount)}</span></span>}
                          {inv.absenceDiscountAmount === 0 && inv.personalDiscountAmount === 0 && <span className="text-slate-300">Sem descontos</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-black text-brand-blue text-xl text-right">
                        {formatCurrencyBRL(inv.netAmount)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {inv.paymentStatus === 'PENDING' && (
                            <>
                              <button 
                                onClick={() => setPayTarget({ id: inv.id!, name: getStudentName(inv.studentId) })}
                                className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                                title="Marcar como Pago"
                              >
                                <CheckCircle2 size={18} />
                              </button>
                              
                              <a 
                                href={`https://wa.me/55${getStudentPhone(inv.studentId).replace(/\D/g,'')}?text=Olá! Gostaríamos de lembrar sobre o vencimento do boleto da cantina referente a ${inv.monthYear}.`} 
                                target="_blank" 
                                rel="noreferrer"
                                className="p-2.5 bg-brand-lime/10 text-brand-lime rounded-xl hover:bg-brand-lime hover:text-white transition-all shadow-sm"
                                title="Cobrar por WhatsApp"
                              >
                                <Phone size={18} />
                              </a>
                            </>
                          )}
                          
                          <button 
                            onClick={() => setDeleteTarget({ id: inv.id!, name: getStudentName(inv.studentId) })}
                            className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
                            title="Excluir"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        </motion.div>
      </div>

      {showImportModal && (
        <ImportPaymentsModal
          boletoFee={boletoFee}
          onClose={() => setShowImportModal(false)}
          onComplete={loadData}
        />
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Excluir Boleto"
        message={`Deseja excluir permanentemente o boleto de "${deleteTarget?.name}"?`}
        confirmLabel="Excluir"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        isOpen={!!payTarget}
        title="Confirmar Pagamento"
        message={`Marcar o boleto de "${payTarget?.name}" como PAGO?`}
        confirmLabel="Confirmar Pagamento"
        variant="info"
        onConfirm={handleMarkAsPaid}
        onCancel={() => setPayTarget(null)}
      />

      <ConfirmDialog
        isOpen={showBulkDeleteConfirm}
        title="Excluir Boletos em Massa"
        message={`Tem certeza que deseja excluir ${selectedInvoices.size} boletos permanentemente? Essa ação não pode ser desfeita.`}
        confirmLabel="Excluir Boletos"
        variant="danger"
        onConfirm={handleBulkDelete}
        onCancel={() => setShowBulkDeleteConfirm(false)}
      />

      <ConfirmDialog
        isOpen={showBulkPayConfirm}
        title="Receber Boletos em Massa"
        message={`Deseja marcar ${selectedInvoices.size} boletos como pagos?`}
        confirmLabel="Confirmar Pagamento"
        variant="info"
        onConfirm={handleBulkMarkAsPaid}
        onCancel={() => setShowBulkPayConfirm(false)}
      />
      {/* Toast notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl flex items-center gap-3 border border-white/10"
          >
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
