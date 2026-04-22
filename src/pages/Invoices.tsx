import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Receipt, Search, CheckCircle2, AlertCircle, Trash2, Phone, Clock, Upload } from 'lucide-react';
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

  // Extract unique months for filter
  const uniqueMonths = Array.from(new Set(invoices.map(i => i.monthYear))).sort().reverse();

  const filteredInvoices = invoices.filter(inv => {
    const sName = getStudentName(inv.studentId).toLowerCase();
    const matchesSearch = sName.includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || inv.paymentStatus === filterStatus;
    const matchesMonth = !filterMonth || inv.monthYear === filterMonth;
    return matchesSearch && matchesStatus && matchesMonth;
  });

  const totalAmount = filteredInvoices.reduce((acc, curr) => acc + curr.netAmount, 0);
  const pendingAmount = filteredInvoices.filter(i => i.paymentStatus === 'PENDING').reduce((acc, curr) => acc + curr.netAmount, 0);

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
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 font-medium">Carregando faturas...</div>
        ) : filteredInvoices.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-medium">Nenhum boleto encontrado para os filtros selecionados.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-xs font-black text-slate-400 uppercase tracking-widest">
                  <th className="px-6 py-4">Status / Vencimento</th>
                  <th className="px-6 py-4">Aluno</th>
                  <th className="px-6 py-4">Referência</th>
                  <th className="px-6 py-4">Descontos</th>
                  <th className="px-6 py-4">Valor Líquido</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.map(inv => {
                  const isOverdue = inv.paymentStatus === 'PENDING' && new Date(inv.dueDate) < new Date();
                  
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
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
    </div>
  );
}
