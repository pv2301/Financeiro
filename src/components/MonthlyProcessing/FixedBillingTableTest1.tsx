import React from 'react';
import { motion } from 'motion/react';
import { Copy, AlertTriangle, ExternalLink } from 'lucide-react';
import { Invoice, Student, ClassInfo, ServiceItem } from '../../types';
import { formatCurrencyBRL } from '../../lib/utils';
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

export const FixedBillingTableTest1: React.FC<FixedBillingTableProps> = ({
  previewInvoices,
  students,
  classes,
  services,
  dbConsumption,
  selectedIds,
  setSelectedIds,
  classFilter,
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
  manualDueDates,
  setManualDueDates,
  formatStudentCopyId,
  getStudentMessage,
  setToast
}) => {
  const visibleInvoices = previewInvoices.filter(inv => 
    inv.billingMode !== "POSTPAID_CONSUMPTION" &&
    !inv.isIntegral &&
    (classFilter === "all" || inv.classId === classFilter) &&
    (!studentSearch || (students.find(s => s.id === inv.studentId)?.name?.toLowerCase() || "").includes(studentSearch.toLowerCase()))
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
              <th className="py-3 px-4 text-center w-8">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-slate-300 accent-brand-blue cursor-pointer transition-all"
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
              <th className="py-3 px-4">Aluno / Turma</th>
              <th className="py-3 px-4 text-right">Valor Base</th>
              <th className="py-3 px-4 text-center">Faltas</th>
              <th className="py-3 px-4 text-right">Descontos</th>
              <th className="py-3 px-4 text-center">Boleto / Obs</th>
              <th className="py-3 px-4 text-center">Vencimento</th>
              <th className="py-3 px-4 text-right">Líquido</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {visibleInvoices.map((inv) => {
              const s = students.find(x => x.id === inv.studentId);
              const cls = classes.find(x => x.id === inv.classId);
              const isSelected = selectedIds.includes(inv.id);

              return (
                <motion.tr 
                  key={inv.id} 
                  className={isSelected ? 'bg-brand-blue/[0.02]' : 'hover:bg-slate-50/50'}
                >
                  <td className="py-2.5 px-4 text-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-slate-300 accent-brand-blue cursor-pointer transition-all"
                      checked={isSelected}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedIds(prev => [...prev, inv.id]);
                        else setSelectedIds(prev => prev.filter(id => id !== inv.id));
                      }}
                    />
                  </td>
                  <td className="py-2.5 px-4">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800 uppercase truncate max-w-[200px]">{s?.name}</span>
                        <span className="px-1.5 py-0.5 bg-slate-100 text-[9px] font-black text-slate-400 rounded uppercase tracking-tighter">{cls?.name}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] font-medium text-slate-400">CPF: {s?.responsibleCpf || '—'}</span>
                        <button 
                          onClick={() => { navigator.clipboard.writeText(getStudentMessage(inv)); setToast('Corpo copiado!'); }}
                          className="text-brand-blue hover:underline text-[9px] font-bold uppercase tracking-tighter"
                        >
                          Copiar Corpo
                        </button>
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 px-4 text-right font-medium text-slate-600 text-xs">
                    {formatCurrencyBRL(inv.grossAmount)}
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <input
                      type="number"
                      value={manualAbsences[inv.studentId] ?? ""}
                      onChange={(e) => {
                        const newVal = parseInt(e.target.value) || 0;
                        setManualAbsences(prev => ({ ...prev, [inv.studentId]: newVal }));
                        
                        const studentObj = students.find(st => st.id === inv.studentId);
                        const studentClass = classes.find(c => c.id === studentObj?.classId);
                        if (studentObj && studentClass) {
                          const updatedInv = calculateStudentInvoice({
                            student: studentObj,
                            studentClass,
                            services,
                            consumption: undefined,
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
                      className="w-10 py-1 text-center text-xs font-bold text-slate-700 bg-transparent border-b border-slate-200 focus:border-brand-blue focus:outline-none"
                    />
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <div className="flex flex-col items-end">
                      {inv.absenceDiscountAmount > 0 && <span className="text-[9px] font-bold text-red-500">-{formatCurrencyBRL(inv.absenceDiscountAmount)}</span>}
                      {s?.personalDiscount && <span className="text-[8px] font-black text-amber-600 uppercase">-{s.personalDiscount}% Pont.</span>}
                    </div>
                  </td>
                  <td className="py-2.5 px-4">
                    <div className="flex flex-col gap-1">
                      <input
                        type="text"
                        value={bankSlipNumbers[inv.studentId] || ""}
                        onChange={(e) => setBankSlipNumbers(prev => ({ ...prev, [inv.studentId]: e.target.value }))}
                        placeholder="Nº TÍTULO"
                        className="w-full text-[9px] font-bold text-slate-700 bg-slate-50 border border-slate-100 rounded px-2 py-1 focus:outline-none focus:border-brand-blue uppercase"
                      />
                    </div>
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <input
                      type="date"
                      value={manualDueDates[inv.studentId] || inv.dueDate}
                      onChange={(e) => setManualDueDates(prev => ({ ...prev, [inv.studentId]: e.target.value }))}
                      className="text-[9px] font-bold text-slate-500 focus:outline-none"
                    />
                  </td>
                  <td className="py-2.5 px-4 text-right font-black text-brand-blue text-sm">
                    {formatCurrencyBRL(inv.netAmount)}
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
