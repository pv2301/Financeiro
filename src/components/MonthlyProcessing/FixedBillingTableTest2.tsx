import React from 'react';
import { motion } from 'motion/react';
import { Copy, Receipt, Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Invoice, Student, ClassInfo, ServiceItem } from '../../types';
import { formatCurrencyBRL, cn } from '../../lib/utils';
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
  manualDueDates: Record<string, string>;
  setManualDueDates: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  formatStudentCopyId: (name: string) => string;
  getStudentMessage: (inv: Invoice) => string;
  setToast: (msg: string | null) => void;
}

export const FixedBillingTableTest2: React.FC<FixedBillingTableProps> = ({
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {visibleInvoices.map((inv) => {
        const s = students.find(x => x.id === inv.studentId);
        const cls = classes.find(x => x.id === inv.classId);
        const isSelected = selectedIds.includes(inv.id);
        const hasTitle = !!bankSlipNumbers[inv.studentId];

        return (
          <motion.div
            key={inv.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              "group relative bg-white rounded-2xl p-5 border-2 transition-all shadow-sm hover:shadow-md",
              isSelected ? "border-brand-blue ring-4 ring-brand-blue/5" : "border-slate-100",
              hasTitle ? "bg-emerald-50/5" : "bg-white"
            )}
          >
            {/* Header: Student Info */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-3">
                <div 
                  className="mt-1 cursor-pointer"
                  onClick={() => {
                    if (isSelected) setSelectedIds(prev => prev.filter(id => id !== inv.id));
                    else setSelectedIds(prev => [...prev, inv.id]);
                  }}
                >
                  <div className={cn(
                    "w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center",
                    isSelected ? "bg-brand-blue border-brand-blue text-white" : "border-slate-300"
                  )}>
                    {isSelected && <CheckCircle2 size={12} strokeWidth={4} />}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight leading-tight">{s?.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{cls?.name}</span>
                    <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                    <span className="text-[10px] font-black text-brand-blue uppercase">{s?.responsibleCpf ? 'CPF OK' : 'SEM CPF'}</span>
                  </div>
                </div>
              </div>
              <div className={cn(
                "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                hasTitle ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
              )}>
                {hasTitle ? 'Pronto' : 'Pendente'}
              </div>
            </div>

            {/* Inputs: Absences & Title */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Faltas</label>
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-brand-blue transition-all"
                  placeholder="0"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Nº Título</label>
                <input
                  type="text"
                  value={bankSlipNumbers[inv.studentId] || ""}
                  onChange={(e) => setBankSlipNumbers(prev => ({ ...prev, [inv.studentId]: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-brand-blue transition-all uppercase"
                  placeholder="DIGITE..."
                />
              </div>
            </div>

            {/* Footer: Date & Amount */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-50">
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-slate-300" />
                <input
                  type="date"
                  value={manualDueDates[inv.studentId] || inv.dueDate}
                  onChange={(e) => setManualDueDates(prev => ({ ...prev, [inv.studentId]: e.target.value }))}
                  className="text-[10px] font-bold text-slate-500 bg-transparent focus:outline-none"
                />
              </div>
              <div className="text-right">
                <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none mb-0.5">Líquido</p>
                <p className="text-lg font-black text-brand-blue leading-none">{formatCurrencyBRL(inv.netAmount)}</p>
              </div>
            </div>

            {/* Hover Actions */}
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
               <button 
                onClick={() => { navigator.clipboard.writeText(getStudentMessage(inv)); setToast('Texto copiado!'); }}
                className="w-8 h-8 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-400 hover:text-brand-blue hover:border-brand-blue shadow-sm transition-all"
               >
                 <Copy size={14} />
               </button>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
