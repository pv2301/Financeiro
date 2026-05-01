import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Copy, Plus, AlertTriangle, User, Receipt, ArrowUpDown, Trash2 } from 'lucide-react';
import { Invoice, Student, ClassInfo, ServiceItem } from '../../types';
import { cn, formatCurrencyBRL, formatFullAge } from '../../lib/utils';

interface IntegralBillingTableProps {
  previewInvoices: Invoice[];
  students: Student[];
  classes: ClassInfo[];
  services: ServiceItem[];
  dbConsumption: any[];
  selectedIds: Set<string>;
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  classFilter: string;
  segmentFilter: string;
  studentSearch: string;
  monthYear: string;
  ageRefDay: number;
  bankSlipNumbers: Record<string, string>;
  setBankSlipNumbers: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  invoiceNotes: Record<string, string>;
  setInvoiceNotes: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  manualDueDates: Record<string, string>;
  setManualDueDates: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  formatStudentCopyId: (name: string) => string;
  getStudentMessage: (inv: Invoice) => string;
  setToast: (msg: string | null) => void;
  setShowIntegralServiceModal: (studentId: string) => void;
  setShowIntegralSelectModal: (show: boolean) => void;
  integralItems: Record<string, any[]>;
  setIntegralItems: React.Dispatch<React.SetStateAction<Record<string, any[]>>>;
  onRemoveStudent?: (id: string) => void;
}

export const IntegralBillingTable: React.FC<IntegralBillingTableProps> = ({
  previewInvoices,
  students,
  classes,
  services,
  dbConsumption,
  selectedIds,
  setSelectedIds,
  classFilter,
  segmentFilter,
  studentSearch,
  monthYear,
  ageRefDay,
  bankSlipNumbers,
  setBankSlipNumbers,
  invoiceNotes,
  setInvoiceNotes,
  manualDueDates,
  setManualDueDates,
  formatStudentCopyId,
  getStudentMessage,
  setToast,
  setShowIntegralServiceModal,
  setShowIntegralSelectModal,
  integralItems,
  setIntegralItems,
  onRemoveStudent
}) => {
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const visibleInvoices = useMemo(() => {
    const filtered = previewInvoices.filter(inv => {
      const s = students.find(x => x.id === inv.studentId);
      return inv.isIntegral &&
      (classFilter === "all" || inv.classId === classFilter) &&
      (segmentFilter === "all" || s?.segment === segmentFilter) &&
      (!studentSearch || (s?.name?.toLowerCase() || "").includes(studentSearch.toLowerCase()));
    });

    return filtered.sort((a, b) => {
      const sa = students.find(x => x.id === a.studentId)?.name || "";
      const sb = students.find(x => x.id === b.studentId)?.name || "";
      return sortOrder === 'asc' ? sa.localeCompare(sb) : sb.localeCompare(sa);
    });
  }, [previewInvoices, students, classFilter, segmentFilter, studentSearch, sortOrder]);

  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
      <table className="w-full text-left border-separate border-spacing-y-2">
        <thead>
          <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <th className="pb-4 px-4 text-center w-8">
              <input
                type="checkbox"
                className="w-5 h-5 rounded-lg border-2 border-slate-300 accent-brand-blue cursor-pointer transition-all focus:ring-4 focus:ring-brand-blue/10"
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedIds(prev => new Set([...prev, ...visibleInvoices.map(v => v.id)]));
                  } else {
                    const visibleIds = new Set(visibleInvoices.map(v => v.id));
                    setSelectedIds(prev => {
                      const next = new Set(prev);
                      visibleIds.forEach(id => next.delete(id));
                      return next;
                    });
                  }
                }}
                checked={visibleInvoices.length > 0 && visibleInvoices.every(v => selectedIds.has(v.id))}
              />
            </th>
            <th className="pb-4 px-4 text-center w-10">#</th>
            <th className="pb-4 px-4">
              <button 
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="flex items-center gap-2 hover:text-brand-blue transition-colors group/sort"
              >
                Aluno / Turma
                <ArrowUpDown size={12} className={cn("transition-opacity", sortOrder === 'asc' ? "opacity-40" : "opacity-100")} />
              </button>
            </th>
            <th className="pb-4 px-4">Resumo Serviços</th>
            <th className="pb-4 px-4 text-right">Valor Base</th>
            <th className="pb-4 px-4 text-center">Boleto / Título</th>
            <th className="pb-4 px-4 text-center">Vencimento</th>
            <th className="pb-4 px-6 text-right">Líquido</th>
            <th className="pb-4 px-4 w-10"></th>
          </tr>
        </thead>
        <tbody>
          {visibleInvoices.map((inv, idx) => {
            const s = students.find(x => x.id === inv.studentId);
            const cls = classes.find(x => x.id === inv.classId);
            const items = inv.items || [];

            const billingAge = s?.birthDate ? (() => {
              const [m, y] = monthYear.split("/").map(Number);
              const refDate = new Date(y, m - 1, ageRefDay || 5);
              return formatFullAge(s.birthDate, refDate);
            })() : "-";

            const isSelected = selectedIds.has(inv.id);

            return (
              <motion.tr 
                layout
                key={inv.id} 
                className={`group transition-all ${isSelected ? 'bg-brand-blue/5' : 'bg-white hover:bg-slate-50'} rounded-2xl overflow-hidden`}
              >
                <td className="py-4 px-4 text-center rounded-l-2xl border-y border-l border-transparent group-hover:border-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded-lg border-2 border-slate-300 accent-brand-blue cursor-pointer transition-all focus:ring-4 focus:ring-brand-blue/10"
                    checked={isSelected}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(prev => new Set([...prev, inv.id]));
                      } else {
                        setSelectedIds(prev => {
                          const next = new Set(prev);
                          next.delete(inv.id);
                          return next;
                        });
                      }
                    }}
                  />
                </td>
                <td className="py-4 px-4 text-center border-y border-transparent group-hover:border-slate-100 transition-colors">
                  <span className="text-[10px] font-black text-slate-300">{idx + 1}</span>
                </td>
                <td className="py-4 px-4 border-y border-transparent group-hover:border-slate-100 transition-colors">
                  <div className="flex flex-col min-w-[250px]">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-black text-slate-800 leading-none uppercase tracking-tight">
                        {s?.name?.replace(/^\([AEIOU]\)\s+/i, '') || "Desconhecido"}
                      </p>
                      <button 
                        onClick={() => { navigator.clipboard.writeText(formatStudentCopyId(s?.name || "")); setToast(`ID de ${s?.name} copiado!`); }} 
                        className="p-1 hover:bg-slate-200 rounded text-slate-300 hover:text-brand-blue transition-colors opacity-0 group-hover:opacity-100"
                        title="Copiar ID do Aluno"
                      >
                        <Copy size={12} />
                      </button>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{cls?.name || "—"}</span>
                        <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                        <span className="text-[10px] font-black text-brand-blue uppercase">{billingAge}</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2 text-slate-600">
                            <User size={10} className="text-slate-400" />
                            <span className="text-[10px] font-black uppercase tracking-tight truncate">
                              RESP: {s?.responsibleName || "Responsável não informado"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 text-slate-400 group/cpf">
                            <span className="text-[9px] font-black uppercase tracking-widest">CPF: {s?.responsibleCpf || "—"}</span>
                            {s?.responsibleCpf && (
                              <button 
                                onClick={() => { navigator.clipboard.writeText(s.responsibleCpf!); setToast("CPF Copiado!"); }}
                                className="opacity-0 group-hover/cpf:opacity-100 p-0.5 hover:text-brand-blue transition-all"
                              >
                                <Copy size={8} />
                              </button>
                            )}
                          </div>
                          <button 
                            onClick={() => { 
                              const msg = getStudentMessage(inv);
                              navigator.clipboard.writeText(msg); 
                              setToast(`Corpo do boleto de ${s?.name} copiado!`); 
                            }} 
                            className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded-md text-slate-400 hover:text-brand-blue transition-all border border-slate-200"
                          >
                            <Copy size={10} />
                            <span className="text-[8px] font-black uppercase tracking-widest">Corpo</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4 border-y border-transparent group-hover:border-slate-100 transition-colors">
                  <button 
                    onClick={() => setShowIntegralServiceModal(inv.studentId)} 
                    className="group/btn flex flex-wrap gap-1.5 max-w-[280px] p-2.5 rounded-2xl border-2 border-dashed border-slate-100 hover:border-brand-blue hover:bg-brand-blue/5 transition-all text-left bg-slate-50/50"
                  >
                    {items.length > 0 ? (
                      items.map((it, idx) => (
                        <span key={idx} className="text-[9px] font-black uppercase tracking-tighter bg-white text-slate-600 px-2.5 py-1 rounded-lg border border-slate-200 shadow-sm group-hover/btn:border-brand-blue/20">
                          {it.quantity}x {it.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-2">
                        <Plus size={14} className="text-brand-blue" /> 
                        Adicionar Serviços
                      </span>
                    )}
                  </button>
                </td>
                <td className="py-4 px-4 text-right border-y border-transparent group-hover:border-slate-100 transition-colors">
                  <span className="text-sm font-bold text-slate-500">{formatCurrencyBRL(inv.grossAmount)}</span>
                </td>
                <td className="py-4 px-4 border-y border-transparent group-hover:border-slate-100 transition-colors">
                  <div className="flex flex-col gap-1.5 min-w-[120px]">
                    <input
                      type="text"
                      value={bankSlipNumbers[inv.studentId] || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setBankSlipNumbers(prev => ({ ...prev, [inv.studentId]: val }));
                      }}
                      placeholder="Nº TÍTULO"
                      className="w-full text-center py-2 bg-slate-50 border-2 border-slate-100 rounded-xl text-[10px] font-black focus:outline-none focus:ring-4 focus:ring-brand-blue/10 focus:border-brand-blue transition-all text-slate-700 uppercase"
                    />
                    <input
                      type="text"
                      value={invoiceNotes[inv.studentId] || ""}
                      onChange={(e) => setInvoiceNotes(prev => ({ ...prev, [inv.studentId]: e.target.value }))}
                      placeholder="OBSERVAÇÃO..."
                      className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-100 rounded-xl text-[10px] font-black focus:outline-none focus:ring-4 focus:ring-brand-blue/10 focus:border-brand-blue transition-all text-slate-600 uppercase"
                    />
                  </div>
                </td>
                <td className="py-4 px-4 text-center border-y border-transparent group-hover:border-slate-100 transition-colors">
                  <input
                    type="date"
                    value={manualDueDates[inv.studentId] || inv.dueDate}
                    onChange={(e) => setManualDueDates(prev => ({ ...prev, [inv.studentId]: e.target.value }))}
                    className="text-[10px] font-black text-slate-600 bg-slate-50 border-2 border-slate-100 rounded-xl px-2 py-2 focus:outline-none focus:ring-4 focus:ring-brand-blue/10 focus:border-brand-blue transition-all uppercase"
                  />
                </td>
                <td className="py-4 px-4 text-right rounded-r-2xl border-y border-r border-transparent group-hover:border-slate-100 transition-colors">
                  <div className="group relative cursor-help flex flex-col items-end">
                    <span className="text-base font-black text-brand-blue tracking-tight">{formatCurrencyBRL(inv.netAmount)}</span>
                    <div className="hidden group-hover:block absolute top-0 right-full mr-4 w-72 p-5 bg-slate-900/95 backdrop-blur-xl text-white text-[10px] font-bold rounded-[2rem] shadow-2xl z-[150] border border-white/10 ring-1 ring-white/20 animate-in fade-in zoom-in duration-200">
                      <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                        <p className="font-black uppercase tracking-[0.2em] text-slate-400">Detalhamento Financeiro</p>
                        <Receipt size={14} className="text-brand-blue" />
                      </div>
                      <div className="space-y-2.5">
                        <div className="flex justify-between items-center text-slate-300">
                          <span className="font-black uppercase tracking-widest text-[9px]">Bruto Consumido:</span> 
                          <span className="font-mono text-xs">{formatCurrencyBRL(inv.grossAmount)}</span>
                        </div>
                        <div className="flex justify-between items-center pt-3 border-t border-white/10 font-black text-emerald-400 text-sm">
                          <span className="uppercase tracking-widest text-[10px]">Líquido Final:</span> 
                          <span className="font-mono">{formatCurrencyBRL(inv.netAmount)}</span>
                        </div>
                        {s?.personalDiscount ? (
                          <div className="flex justify-between items-center pt-2 border-t border-white/5 text-amber-400/60 italic">
                            <span className="font-black uppercase tracking-tight text-[8px]">DESC. PONTUAL ({s.personalDiscount}%):</span> 
                            <span className="font-mono text-[9px]">{formatCurrencyBRL(inv.personalDiscountAmount)}</span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4 text-center rounded-r-2xl border-y border-r border-transparent group-hover:border-slate-100 transition-colors">
                  <button
                    onClick={() => {
                      if (window.confirm(`Remover ${s?.name} do fechamento integral?`)) {
                        const newItems = { ...integralItems };
                        delete newItems[inv.studentId];
                        setIntegralItems(newItems);
                        setToast(`${s?.name} removido.`);
                      }
                    }}
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    title="Remover Aluno"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
