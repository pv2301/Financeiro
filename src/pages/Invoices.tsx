import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Receipt, Search, CheckCircle2, AlertCircle, Trash2, Phone, Clock, Upload, ArrowUpDown } from 'lucide-react';
import { Invoice, Student } from '../types';
import { finance } from '../services/finance';
import { format } from 'date-fns';
import ConfirmDialog from '../components/ConfirmDialog';
import ImportPaymentsModal from '../components/ImportPaymentsModal';

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
        <ArrowUpDown size={12} className={sortConfig?.key === key ? 'text-brand-blue' : 'text-slate-300'} />
      </div>
    </th>
  );

  return (
    <div className="p-8 pb-24 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:justify-between md:items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-200 gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
            <Receipt size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800">Painel Financeiro</h1>
            <p className="text-slate-500 font-medium">Controle de boletos, baixas e inadimplência</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Buscar aluno..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/20 transition-all"
            />
          </div>
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="w-full md:w-auto px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
          >
            <option value="ALL">Todos Status</option>
            <option value="PENDING">Pendentes</option>
            <option value="PAID">Pagos</option>
          </select>

          <select 
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="w-full md:w-auto px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
          >
            <option value="">Todos os Meses</option>
            {uniqueMonths.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          <button onClick={() => setShowImportModal(true)}
            className="w-full md:w-auto flex items-center justify-center gap-2 bg-emerald-50 text-emerald-600 border border-emerald-200 px-5 py-2.5 rounded-xl font-bold hover:bg-emerald-100 transition-colors">
            <Upload size={18} />
            Baixa Bancária
          </button>
        </div>
      </motion.div>

      {/* Stats row */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Filtrado</p>
            <p className="text-3xl font-black text-slate-800">R$ {totalAmount.toFixed(2)}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
            <Receipt size={24} />
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Pendente Filtrado</p>
            <p className="text-3xl font-black text-red-500">R$ {pendingAmount.toFixed(2)}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-500">
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

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-slate-400 font-medium">Carregando faturas...</div>
          ) : filteredInvoices.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center gap-4">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                <Receipt size={32} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-700">Nenhum boleto encontrado</h3>
                <p className="text-slate-500 font-medium max-w-md mx-auto mt-1">Não há boletos para os filtros selecionados. Vá em <span className="text-brand-blue font-bold">Fechamento Mensal</span> para gerar novos boletos.</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-xs font-black text-slate-400 uppercase tracking-widest select-none">
                    <th className="px-6 py-4 w-12">
                      <input 
                        type="checkbox" 
                        checked={selectedInvoices.size === sortedInvoices.length && sortedInvoices.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded text-brand-blue focus:ring-brand-blue/20 w-4 h-4 cursor-pointer"
                      />
                    </th>
                    {renderSortHeader('Vencimento', 'dueDate')}
                    {renderSortHeader('Aluno', 'student')}
                    {renderSortHeader('Referência', 'monthYear')}
                    <th className="px-6 py-4">Descontos</th>
                    {renderSortHeader('Valor Líquido', 'netAmount', 'right')}
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedInvoices.map(inv => {
                    const isOverdue = inv.paymentStatus === 'PENDING' && new Date(inv.dueDate) < new Date();
                    
                    return (
                      <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <input 
                            type="checkbox" 
                            checked={selectedInvoices.has(inv.id!)}
                            onChange={() => toggleSelectInvoice(inv.id!)}
                            className="rounded text-brand-blue focus:ring-brand-blue/20 w-4 h-4 cursor-pointer"
                          />
                        </td>
                        <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          {inv.paymentStatus === 'PAID' ? (
                            <span className="inline-flex w-fit items-center gap-1 bg-emerald-100 text-emerald-700 font-bold px-2.5 py-1 rounded-md text-[10px] uppercase tracking-widest">
                              <CheckCircle2 size={12} /> Pago
                            </span>
                          ) : isOverdue ? (
                            <span className="inline-flex w-fit items-center gap-1 bg-red-100 text-red-700 font-bold px-2.5 py-1 rounded-md text-[10px] uppercase tracking-widest">
                              <AlertCircle size={12} /> Vencido
                            </span>
                          ) : (
                            <span className="inline-flex w-fit items-center gap-1 bg-amber-100 text-amber-700 font-bold px-2.5 py-1 rounded-md text-[10px] uppercase tracking-widest">
                              <Clock size={12} /> Pendente
                            </span>
                          )}
                          <span className="text-sm font-bold text-slate-600">
                            {format(new Date(inv.dueDate), 'dd/MM/yyyy')}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-800">
                        {getStudentName(inv.studentId)}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-500">
                        {inv.monthYear}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs text-slate-500 flex flex-col gap-0.5">
                          {inv.absenceDiscountAmount > 0 && <span>Faltas: <span className="text-red-500 font-bold">-R${inv.absenceDiscountAmount.toFixed(2)}</span> ({inv.absenceDays}d)</span>}
                          {inv.personalDiscountAmount > 0 && <span>Pessoal: <span className="text-emerald-500 font-bold">-R${inv.personalDiscountAmount.toFixed(2)}</span></span>}
                          {inv.absenceDiscountAmount === 0 && inv.personalDiscountAmount === 0 && <span>Sem descontos</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-black text-brand-blue text-lg">
                        R$ {inv.netAmount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {inv.paymentStatus === 'PENDING' && (
                            <>
                              <button 
                                onClick={() => setPayTarget({ id: inv.id!, name: getStudentName(inv.studentId) })}
                                className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
                                title="Marcar como Pago"
                              >
                                <CheckCircle2 size={18} />
                              </button>
                              
                              <a 
                                href={`https://wa.me/55${getStudentPhone(inv.studentId).replace(/\D/g,'')}?text=Olá! Gostaríamos de lembrar sobre o vencimento do boleto da cantina referente a ${inv.monthYear}.`} 
                                target="_blank" 
                                rel="noreferrer"
                                className="p-2 bg-brand-lime/10 text-brand-lime rounded-lg hover:bg-brand-lime/20 transition-colors"
                                title="Cobrar por WhatsApp"
                              >
                                <Phone size={18} />
                              </a>
                            </>
                          )}
                          
                          <button 
                            onClick={() => setDeleteTarget({ id: inv.id!, name: getStudentName(inv.studentId) })}
                            className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors"
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
    </div>
  );
}
