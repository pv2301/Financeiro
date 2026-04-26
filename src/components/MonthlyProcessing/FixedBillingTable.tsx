import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Copy, AlertTriangle, User, Receipt, ArrowUpDown, Trash2 } from 'lucide-react';
import { Invoice, Student, ClassInfo, ServiceItem } from '../../types';
import { cn, formatCurrencyBRL, formatFullAge } from '../../lib/utils';
import { calculateStudentInvoice } from '../../lib/finance-logic';

interface FixedBillingTableProps {
  previewInvoices: Invoice[];
  students: Student[];
  classes: ClassInfo[];
  services: ServiceItem[];
  dbConsumption: any[];
  selectedIds: string[];
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
  classFilter: string;
  segmentFilter: string;
  studentSearch: string;
  manualAbsences: Record<string, number>;
  setManualAbsences: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  setPreviewInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>;
  businessDays: number;
  monthYear: string;
  ageRefDay: number;
  boletoFee: number;
  mandatorySnackBySegment: Record<string, string>;
  collegeShareBySegment: Record<string, number>;
  bankSlipNumbers: Record<string, string>;
  setBankSlipNumbers: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  invoiceNotes: Record<string, string>;
  setInvoiceNotes: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  showStudentNotes: Record<string, boolean>;
  setShowStudentNotes: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  manualDueDates: Record<string, string>;
  setManualDueDates: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  formatStudentCopyId: (name: string) => string;
  getStudentMessage: (inv: Invoice) => string;
  setToast: (msg: string | null) => void;
}

export const FixedBillingTable: React.FC<FixedBillingTableProps> = ({
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
  manualAbsences,
  setManualAbsences,
  setPreviewInvoices,
  businessDays,
  monthYear,
  ageRefDay,
  boletoFee,
  mandatorySnackBySegment,
  collegeShareBySegment,
  bankSlipNumbers,
  setBankSlipNumbers,
  invoiceNotes,
  setInvoiceNotes,
  showStudentNotes,
  setShowStudentNotes,
  manualDueDates,
  setManualDueDates,
  formatStudentCopyId,
  getStudentMessage,
  setToast,
  onRemoveStudent
}) => {
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const visibleInvoices = useMemo(() => {
    const filtered = previewInvoices.filter(inv => {
      const s = students.find(x => x.id === inv.studentId);
      return inv.billingMode !== "POSTPAID_CONSUMPTION" &&
      !inv.isIntegral &&
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
                    setSelectedIds(prev => Array.from(new Set([...prev, ...visibleInvoices.map(v => v.id)])));
                  } else {
                    const visibleIds = visibleInvoices.map(v => v.id);
                    setSelectedIds(prev => prev.filter(id => !visibleIds.includes(id)));
                  }
                }}
                checked={visibleInvoices.length > 0 && visibleInvoices.every(v => selectedIds.includes(v.id))}
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
            <th className="pb-4 px-4 text-right">Valor Base</th>
            <th className="pb-4 px-4 text-center">Faltas</th>
            <th className="pb-4 px-4 text-right">Descontos</th>
            <th className="pb-4 px-4 text-center">Boleto / Obs</th>
            <th className="pb-4 px-4 text-center">Vencimento</th>
            <th className="pb-4 px-4 text-center">Status</th>
            <th className="pb-4 px-4 text-right">Líquido</th>
          </tr>
        </thead>
        <tbody>
          {visibleInvoices.map((inv, idx) => {
            const s = students.find(x => x.id === inv.studentId);
            const cls = classes.find(x => x.id === inv.classId);

            const billingAge = s?.birthDate ? (() => {
              const [m, y] = monthYear.split("/").map(Number);
              const refDate = new Date(y, m - 1, ageRefDay || 5);
              return formatFullAge(s.birthDate, refDate);
            })() : "-";

            const isSelected = selectedIds.includes(inv.id);

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
                      if (e.target.checked) setSelectedIds(prev => [...prev, inv.id]);
                      else setSelectedIds(prev => prev.filter(id => id !== inv.id));
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
                        {s?.name || "Desconhecido"}
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
                <td className="py-4 px-4 text-right border-y border-transparent group-hover:border-slate-100 transition-colors">
                  <span className="text-sm font-bold text-slate-500">{formatCurrencyBRL(inv.grossAmount)}</span>
                </td>
                <td className="py-4 px-4 text-center border-y border-transparent group-hover:border-slate-100 transition-colors">
                  <input
                    type="number"
                    min="0"
                    max={inv.billingMode === "PREPAID_DAYS" ? businessDays : 31}
                    value={manualAbsences[inv.studentId] ?? ""}
                    onChange={(e) => {
                      const newVal = parseInt(e.target.value) || 0;
                      setManualAbsences(prev => ({ ...prev, [inv.studentId]: newVal }));
                      
                      const studentObj = students.find(st => st.id === inv.studentId);
                      const studentClass = classes.find(c => c.id === studentObj?.classId);
                      if (studentObj && studentClass) {
                        const consumption = dbConsumption.find(c => c.studentId === inv.studentId);
                        const updatedInv = calculateStudentInvoice({
                          student: studentObj,
                          studentClass,
                          services,
                          consumption: consumption ? { summary: consumption.summary } : undefined,
                          manualAbsences: newVal,
                          businessDays,
                          monthYear,
                          ageRefDay,
                          emissionFee: boletoFee,
                          mandatorySnackBySegment,
                          collegeShareBySegment
                        });
                        setPreviewInvoices(prev => prev.map(p => p.studentId === inv.studentId && p.billingMode === inv.billingMode ? { ...p, ...updatedInv } as Invoice : p));
                      }
                    }}
                    placeholder="0"
                    className="w-14 px-2 py-2 text-center text-xs font-black text-slate-700 bg-slate-50 border-2 border-slate-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-brand-blue/10 focus:border-brand-blue transition-all"
                  />
                </td>
                <td className="py-4 px-4 text-right border-y border-transparent group-hover:border-slate-100 transition-colors">
                  <div className="flex flex-col items-end gap-1">
                    {inv.absenceDiscountAmount > 0 ? (
                      <span className="text-[11px] font-black text-red-500 uppercase tracking-tighter">
                        -{formatCurrencyBRL(inv.absenceDiscountAmount)} FALTAS
                      </span>
                    ) : null}
                    {s?.personalDiscount ? (
                      <span className="text-[11px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100 uppercase tracking-tighter">
                        {s.personalDiscount}% PONTUAL
                      </span>
                    ) : null}
                    {!inv.absenceDiscountAmount && !s?.personalDiscount && (
                      <span className="text-[11px] font-black text-slate-300 uppercase tracking-tighter">—</span>
                    )}
                  </div>
                </td>
                <td className="py-4 px-4 border-y border-transparent group-hover:border-slate-100 transition-colors">
                  <div className="flex flex-col gap-1.5 min-w-[120px]">
                    <input
                      type="text"
                      value={bankSlipNumbers[inv.studentId] || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setBankSlipNumbers(prev => ({ ...prev, [inv.studentId]: val }));
                        if (val.trim() !== "" && !selectedIds.includes(inv.id)) {
                          setSelectedIds(prev => [...prev, inv.id]);
                        }
                      }}
                      placeholder="Nº TÍTULO"
                      className="w-full text-center py-2 bg-slate-50 border-2 border-slate-100 rounded-xl text-[10px] font-black focus:outline-none focus:ring-4 focus:ring-brand-blue/10 focus:border-brand-blue transition-all text-slate-700 uppercase"
                    />
                    <div className="relative">
                      <input
                        type="text"
                        value={invoiceNotes[inv.studentId] || ""}
                        onChange={(e) => setInvoiceNotes(prev => ({ ...prev, [inv.studentId]: e.target.value }))}
                        onClick={() => setShowStudentNotes(prev => ({ ...prev, [inv.studentId]: !prev[inv.studentId] }))}
                        placeholder="OBSERVAÇÃO..."
                        className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-100 rounded-xl text-[10px] font-black focus:outline-none focus:ring-4 focus:ring-brand-blue/10 focus:border-brand-blue transition-all text-slate-600 uppercase"
                      />
                    </div>
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
                <td className="py-4 px-4 text-center border-y border-transparent group-hover:border-slate-100 transition-colors">
                  <div className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border",
                    bankSlipNumbers[inv.studentId] ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"
                  )}>
                    <div className={cn("w-1 h-1 rounded-full", bankSlipNumbers[inv.studentId] ? "bg-emerald-500" : "bg-amber-500")} />
                    {bankSlipNumbers[inv.studentId] ? "PRONTO" : "PENDENTE"}
                  </div>
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
                          <span className="font-black uppercase tracking-widest text-[9px]">Valor Mensal:</span> 
                          <span className="font-mono text-xs">{formatCurrencyBRL(inv.grossAmount)}</span>
                        </div>
                        {inv.absenceDiscountAmount > 0 && (
                          <div className="flex justify-between items-center text-rose-400">
                            <span className="font-black uppercase tracking-widest text-[9px]">Desconto por Faltas:</span> 
                            <span className="font-mono text-xs">- {formatCurrencyBRL(inv.absenceDiscountAmount)}</span>
                          </div>
                        )}
                         {/* Desconto Pessoal removido a pedido do usuário */}
                        {(inv.totalServices || businessDays) > 0 && (
                          <div className="flex justify-between items-center text-slate-300">
                            <span className="font-black uppercase tracking-widest text-[9px]">Consumo:</span> 
                            <span className="font-mono text-xs">{(inv.totalServices || businessDays) - (manualAbsences[inv.studentId] || 0)} {(inv.totalServices || businessDays) - (manualAbsences[inv.studentId] || 0) === 1 ? 'dia' : 'dias'}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center pt-3 border-t border-white/10 font-black text-emerald-400 text-sm">
                          <span className="uppercase tracking-widest text-[10px]">Líquido Final:</span> 
                          <span className="font-mono">{formatCurrencyBRL(inv.netAmount)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

