import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Calculator, Upload, CheckCircle2, Settings, Calendar, Search, X as XIcon, 
  Clock, AlertTriangle, Filter, Zap, MoreVertical, MessageSquare, ShieldCheck, 
  Copy, User, Receipt, Download, Layers, BarChart3, Pencil, Trash2, ArrowUpRight,
  CreditCard, Plus, Loader2
} from "lucide-react";
import { FixedBillingTable } from '../components/MonthlyProcessing/FixedBillingTable';
import { ConsumptionTable } from '../components/MonthlyProcessing/ConsumptionTable';
import { IntegralBillingTable } from '../components/MonthlyProcessing/IntegralBillingTable';
import { motion, AnimatePresence } from "motion/react";
import {
  Student,
  ClassInfo,
  ServiceItem,
  Invoice,
} from "../types";
import { finance } from "../services/finance";
import { format } from "date-fns";
import { formatCurrencyBRL, cn } from "../lib/utils";
import { calculateStudentInvoice, getPriceKey } from "../lib/finance-logic";
import ConfirmDialog from "../components/ConfirmDialog";
import { useMonthlyInvoices } from "../hooks/useMonthlyInvoices";
import ImportConsumptionModal from "../components/ImportConsumptionModal";
import { TemplateModal } from "../components/MonthlyProcessing/TemplateModal";
import { IntegralModals } from "../components/MonthlyProcessing/IntegralModals";
import { usePersistentSelection } from '../hooks/usePersistentSelection';

const MONTHS_FULL = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", 
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const CURRENT_YEAR = new Date().getFullYear();

// --- PADRONIZAÇÃO DE TEXTOS (DESIGN SYSTEM TOKENS) ---
const TXT = {
  LABEL: "text-[11px] font-black uppercase tracking-[0.1em] text-slate-400",
  VALUE: "text-base font-black text-slate-900 uppercase tracking-tight",
  TITLE: "text-4xl font-black text-slate-900 uppercase tracking-tighter",
  TAB: "text-[11px] font-black uppercase tracking-widest",
  TABLE_HEAD: "text-[11px] font-black uppercase tracking-[0.15em] text-slate-400"
};

export default function MonthlyProcessing() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [monthYear, setMonthYear] = useState(format(new Date(), "MM/yyyy"));
  const [scholasticDays, setScholasticDays] = useState<Record<string, number | string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);
  const [categoryPrices, setCategoryPrices] = useState<Record<string, number>>({ GRUPO: 0, MATERNAL: 0 });
  const [showCopyConfirm, setShowCopyConfirm] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [isSavingInvoices, setIsSavingInvoices] = useState(false);
  const [previewInvoices, setPreviewInvoices] = useState<Invoice[]>([]);
  const [activeTab, setActiveTab] = useState<"fixed" | "consumption" | "integral">("fixed");
  const [studentSearch, setStudentSearch] = useState("");
  const [segmentFilter, setSegmentFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const { selectedIds, setSelectedIds, toggleId, toggleAll } = usePersistentSelection(`monthly_processing_selection_${monthYear.replace('/', '-')}`);
  
  // Draft Data
  const [manualAbsences, setManualAbsences] = useState<Record<string, number>>({});
  const [bankSlipNumbers, setBankSlipNumbers] = useState<Record<string, string>>({});
  const [manualDueDates, setManualDueDates] = useState<Record<string, string>>({});
  const [invoiceNotes, setInvoiceNotes] = useState<Record<string, string>>({});
  const [integralItems, setIntegralItems] = useState<Record<string, any>>({});
  const [removedStudentIds, setRemovedStudentIds] = useState<string[]>([]);
  const [dbConsumption, setDbConsumption] = useState<any[]>([]);

  // Config States
  const [boletoFee, setBoletoFee] = useState(3.5);
  const [ageRefDay, setAgeRefDay] = useState<number>(0);
  const [defaultDueDay, setDefaultDueDay] = useState<number>(10);
  const [collegeShareBySegment, setCollegeShareBySegment] = useState<Record<string, number>>({});
  const [integralCollegeSharePercent, setIntegralCollegeSharePercent] = useState<number>(15);
  const [mandatorySnackBySegment, setMandatorySnackBySegment] = useState<Record<string, string>>({});
  const [messageTemplates, setMessageTemplates] = useState({
    fixed: "{MANDATORY_SNACK} - {MONTH_YEAR}\n{STUDENT_NAME}\n{CLASS_NAME}\nFALTAS: {ABSENCES}",
    consumption: "{MANDATORY_SNACK} - {MONTH_YEAR}\n{STUDENT_NAME}\n{CLASS_NAME}\n{CONSUMPTION}",
    integral: "INTEGRAL - {MONTH_YEAR}\n{STUDENT_NAME}\n{CLASS_NAME}\n{CONSUMPTION}",
  });

  // UI Modals
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showIntegralSelectModal, setShowIntegralSelectModal] = useState(false);
  const [showIntegralServiceModal, setShowIntegralServiceModal] = useState<string | null>(null);
  const [consumptionFilter, setConsumptionFilter] = useState<'all' | 'imported' | 'pending'>('all');
  const [recentlyImportedIds, setRecentlyImportedIds] = useState<string[]>([]);
  const [showStudentNotes, setShowStudentNotes] = useState<Record<string, boolean>>({});
  const lastSavedRef = useRef<string>("");
  const isFirstRender = useRef(true);

  const { getStudentMessage, formatStudentCopyId } = useMonthlyInvoices({
    students, classes, services, messageTemplates, mandatorySnackBySegment,
    activeTab, integralItems, dbConsumption
  });

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const refreshConsumption = useCallback(async (force: boolean = false) => {
    setIsLoadingDraft(true);
    try {
      if (force) {
        await new Promise(resolve => setTimeout(resolve, 800));
        finance.invalidateCache('fin_consumption'); 
      }
      const consumption = await finance.getConsumptionByMonth(monthYear);
      setDbConsumption(consumption || []);
      console.log(`[MonthlyProcessing] ${consumption?.length || 0} registros de consumo carregados.`);
    } catch (err: any) {
      console.error("[MonthlyProcessing] Erro ao carregar consumo:", err);
      showToast(err.message || "Erro de conexão com o banco de dados.");
    } finally {
      setIsLoadingDraft(false);
    }
  }, [monthYear]);

  // --- Data Loading ---
  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const [s, c, svc, config] = await Promise.all([
          finance.getStudents(),
          finance.getClasses(),
          finance.getServices(),
          finance.getGlobalConfig(),
        ]);
        setStudents(s || []);
        setClasses(c || []);
        setServices(svc || []);
        if (config) {
          setScholasticDays(config.scholasticDays || {});
          setBoletoFee(config.boletoEmissionFee ?? 3.5);
          setAgeRefDay(config.ageReferenceDay || 0);
          setDefaultDueDay(config.defaultDueDay || 10);
          setCollegeShareBySegment(config.collegeShareBySegment || {});
          setIntegralCollegeSharePercent(config.integralCollegeSharePercent ?? 15);
          setMandatorySnackBySegment(config.mandatorySnackBySegment || {});
          if (config.messageTemplates) setMessageTemplates(config.messageTemplates);
        }
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  // --- Calculation Logic ---
  const generatePreview = useCallback((consumptionData: any[]) => {
    const newInvoices: Invoice[] = [];
    const businessDays = getCurrentMonthDays();

    students.forEach((student) => {
      if (removedStudentIds.includes(student.id)) return;
      
      const studentClass = classes.find((c) => c.id === student.classId);
      if (!studentClass) return;

      const consumption = consumptionData.find((d) => d.studentId === student.id);
      if (studentClass.billingMode === 'POSTPAID_CONSUMPTION' && !consumption && !bankSlipNumbers[student.id]) return;

      const calcResult = calculateStudentInvoice({
        student, studentClass, services, consumption,
        manualAbsences: manualAbsences[student.id] || 0,
        businessDays, monthYear, ageRefDay, emissionFee: boletoFee,
        collegeShareBySegment, mandatorySnackBySegment,
        categoryPrices
      });

      let dueDate = manualDueDates[student.id];
      if (!dueDate) {
        const [m, y] = monthYear.split("/").map(Number);
        const targetDate = new Date(y, m, student.dueDay || defaultDueDay);
        dueDate = format(targetDate, "yyyy-MM-dd");
      }

      newInvoices.push({
        id: `preview_${student.id}_${monthYear.replace('/', '-')}`,
        studentId: student.id,
        classId: studentClass.id,
        monthYear,
        dueDate,
        billingMode: studentClass.billingMode,
        grossAmount: calcResult.grossAmount,
        absenceDays: manualAbsences[student.id] || 0,
        absenceDiscountAmount: calcResult.absenceDiscountAmount,
        personalDiscountAmount: calcResult.personalDiscountAmount,
        netAmount: calcResult.netAmount,
        nossoNumero: "",
        filename: student.filenameSuffix || "",
        paymentStatus: "PENDING",
        collegeSharePercent: studentClass.collegeSharePercent || collegeShareBySegment[studentClass.segment] || 0,
        boletoEmissionFee: boletoFee,
        collegeShareAmount: calcResult.collegeShareAmount,
        totalServices: calcResult.totalServices,
        hasImportedConsumption: !!consumption,
      });
    });

    // Integral Items
    Object.entries(integralItems).forEach(([studentId, items]: [string, any]) => {
      const student = students.find(s => s.id === studentId);
      if (!student) return;
      const amount = items.reduce((a: any, b: any) => a + (b.price * b.quantity), 0);

      const studentClass = classes.find(c => c.id === student.classId);
      const dueDate = manualDueDates[studentId] || format(new Date(monthYear.split('/')[1] as any, parseInt(monthYear.split('/')[0]) as any, student.dueDay || defaultDueDay), "yyyy-MM-dd");

      newInvoices.push({
        id: `preview_integral_${studentId}_${monthYear.replace('/', '-')}`,
        studentId,
        classId: studentClass?.id || 'integral',
        monthYear,
        dueDate,
        billingMode: "PREPAID_FIXED",
        grossAmount: amount,
        absenceDays: 0,
        absenceDiscountAmount: 0,
        personalDiscountAmount: 0,
        netAmount: amount,
        nossoNumero: "",
        filename: student.filenameSuffix || "",
        paymentStatus: "PENDING",
        collegeSharePercent: integralCollegeSharePercent,
        boletoEmissionFee: boletoFee,
        collegeShareAmount: (amount - boletoFee) * (integralCollegeSharePercent / 100),
        totalServices: items.reduce((acc: any, it: any) => acc + it.quantity, 0),
        isIntegral: true,
        note: items.map((i: any) => `${i.name} (x${i.quantity})`).join(", "),
        items: items,
      });
    });

    setPreviewInvoices(newInvoices.sort((a, b) => {
      const nameA = students.find(s => s.id === a.studentId)?.name || "";
      const nameB = students.find(s => s.id === b.studentId)?.name || "";
      return nameA.localeCompare(nameB);
    }));
  }, [monthYear, students, classes, services, manualAbsences, manualDueDates, bankSlipNumbers, integralItems, removedStudentIds, boletoFee, collegeShareBySegment, mandatorySnackBySegment, defaultDueDay, ageRefDay, categoryPrices, scholasticDays]);

  const getDraftData = useCallback(() => ({
    manualAbsences, bankSlipNumbers, manualDueDates, invoiceNotes, 
    integralItems, removedStudentIds, selectedIds: Array.from(selectedIds),
    categoryPrices
  }), [manualAbsences, bankSlipNumbers, manualDueDates, invoiceNotes, integralItems, removedStudentIds, selectedIds, categoryPrices]);

  // --- Draft Persistence ---
  const saveCurrentDraft = useCallback(async (overrideData?: any, silent: boolean = false) => {
    const data = overrideData || getDraftData();
    const dataStr = JSON.stringify({ monthYear, ...data });
    if (dataStr === lastSavedRef.current) return;

    if (!silent) setIsLoadingDraft(true);
    await finance.saveBillingDraft({
      id: monthYear,
      ...data,
      lastUpdated: new Date().toISOString(),
    });
    lastSavedRef.current = dataStr;
    if (!silent) setIsLoadingDraft(false);
  }, [monthYear, getDraftData]);

  // --- 1. Load Initial Data (Month Change) ---
  useEffect(() => {
    async function init() {
      setIsLoadingDraft(true);
      try {
        const draft = await finance.getBillingDraft(monthYear);
        if (draft) {
          setManualAbsences(draft.manualAbsences || {});
          setBankSlipNumbers(draft.bankSlipNumbers || {});
          setManualDueDates(draft.manualDueDates || {});
          setInvoiceNotes(draft.invoiceNotes || {});
          setIntegralItems(draft.integralItems || {});
          setRemovedStudentIds(draft.removedStudentIds || []);
          setCategoryPrices(draft.categoryPrices || { GRUPO: 0, MATERNAL: 0 });
          setSelectedIds(new Set(draft.selectedIds || []));
        } else {
          setManualAbsences({}); setBankSlipNumbers({}); setManualDueDates({});
          setInvoiceNotes({}); setIntegralItems({}); setRemovedStudentIds([]); setSelectedIds(new Set());
          setCategoryPrices({ GRUPO: 0, MATERNAL: 0 });
        }
        await refreshConsumption();
      } finally {
        setIsLoadingDraft(false);
      }
    }
    init();
  }, [monthYear, students.length, refreshConsumption]);

  // --- 2. Generate Preview (Data Changes) ---
  useEffect(() => {
    generatePreview(dbConsumption);
  }, [generatePreview, dbConsumption]);

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    const timer = setTimeout(() => saveCurrentDraft(undefined, true), 2000);
    return () => clearTimeout(timer);
  }, [manualAbsences, bankSlipNumbers, manualDueDates, invoiceNotes, integralItems, removedStudentIds, selectedIds, saveCurrentDraft]);

  const getCurrentMonthDays = (): number => {
    const parts = monthYear.split("/");
    if (parts.length !== 2) return 0;
    const key = `${parts[1]}-${parts[0]}`;
    const val = scholasticDays[key];
    if (val === 0 || val === "0") return 0;
    return typeof val === "number" ? val : (parseInt(val as string) || 22);
  };

  const handleConfirmSelection = useCallback(async (selectedIds: string[]) => {
    const newItems = { ...integralItems };
    selectedIds.forEach(id => {
      if (!newItems[id]) newItems[id] = [];
    });
    setIntegralItems(newItems);
    setShowIntegralSelectModal(false);
    const draftData = { ...getDraftData(), integralItems: newItems };
    await finance.saveBillingDraft({
      id: monthYear,
      ...draftData,
      lastUpdated: new Date().toISOString(),
    });
    showToast("Lista de alunos atualizada!");
  }, [integralItems, getDraftData, monthYear, showToast]);

  const handleRemoveStudent = useCallback(async (studentId: string) => {
    const newRemoved = [...removedStudentIds, studentId];
    setRemovedStudentIds(newRemoved);
    setSelectedIds(prev => {
      const next = new Set(prev);
      Array.from(next).forEach(id => {
        if (id.includes(studentId)) next.delete(id);
      });
      return next;
    });
    await saveCurrentDraft({ ...getDraftData(), removedStudentIds: newRemoved });
    showToast("Aluno removido do faturamento!");
  }, [removedStudentIds, selectedIds, getDraftData, saveCurrentDraft, showToast]);

  const handleRemoveSelected = async () => {
    const studentIdsToRemove = previewInvoices
      .filter(inv => selectedIds.has(inv.id))
      .map(inv => inv.studentId);
    
    const newRemoved = Array.from(new Set([...removedStudentIds, ...studentIdsToRemove]));
    setRemovedStudentIds(newRemoved);
    setSelectedIds(new Set());
    await saveCurrentDraft({ ...getDraftData(), removedStudentIds: newRemoved });
    showToast(`${studentIdsToRemove.length} alunos removidos!`);
  };

  const handleCopyPreviousPrices = async () => {
    const parts = monthYear.split("/");
    let m = parseInt(parts[0]);
    let y = parseInt(parts[1]);
    if (m === 1) { m = 12; y--; } else { m--; }
    const prevMonthYear = `${m.toString().padStart(2, '0')}/${y}`;
    
    const prevDraft = await finance.getBillingDraft(prevMonthYear);
    if (prevDraft && prevDraft.categoryPrices) {
      setCategoryPrices(prevDraft.categoryPrices);
      showToast("Valores copiados de " + prevMonthYear);
    } else {
      showToast("Nenhum valor encontrado no mês anterior.");
    }
    setShowCopyConfirm(false);
  };

  const handleSaveInvoices = async () => {
    setIsSavingInvoices(true);
    try {
      const currentMonthInvoices = await finance.getInvoicesByMonth(monthYear);
      const toSave = previewInvoices.filter(inv => selectedIds.has(inv.id) && !!bankSlipNumbers[inv.studentId]);
      const duplicates = toSave.filter(inv => 
        currentMonthInvoices.some(ex => ex.studentId === inv.studentId && Math.abs(ex.netAmount - inv.netAmount) < 0.01)
      );
      if (duplicates.length > 0 && !window.confirm(`AVISO: Detectamos ${duplicates.length} possíveis duplicidades (mesmo aluno e valor já faturados este mês). Deseja continuar mesmo assim?`)) {
        setIsSavingInvoices(false);
        return;
      }
      await Promise.all(toSave.map(inv => finance.saveInvoice({
        ...inv,
        bankSlipNumber: bankSlipNumbers[inv.studentId],
        note: invoiceNotes[inv.studentId],
        dueDate: manualDueDates[inv.studentId] || inv.dueDate,
        createdAt: new Date().toISOString()
      })));
      showToast(`${toSave.length} Títulos Gerados!`);
      setSelectedIds(new Set());
    } catch (e) { showToast("Erro ao salvar faturas"); }
    finally { setIsSavingInvoices(false); setShowSaveConfirm(false); }
  };

  const handleUpdateInvoice = useCallback((updated: Invoice) => {
    setPreviewInvoices(prev => prev.map(inv => inv.id === updated.id ? updated : inv));
  }, []);

  if (isLoading) return <div className="p-8 flex items-center justify-center min-h-screen"><div className="w-12 h-12 border-4 border-brand-blue border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="p-4 md:p-10 pb-32 max-w-[1600px] mx-auto space-y-10 bg-slate-50/30 min-h-screen font-sans">
      
      <AnimatePresence>
        {isLoadingDraft && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border border-white/10"
          >
            <Loader2 size={16} className="animate-spin text-brand-lime" />
            <span className="text-[10px] font-black uppercase tracking-widest">Sincronizando Dados...</span>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="flex flex-col md:flex-row md:items-center justify-between bg-white p-8 rounded-3xl border border-slate-100 shadow-sm gap-6">
        <div className="space-y-2">
          <h1 className={TXT.TITLE}>Fechamento Mensal</h1>
          <p className={TXT.LABEL}>Gestão de faturamento e processamento automático</p>
        </div>
        <div className="flex items-center gap-4">
           <button onClick={() => setShowTemplateModal(true)} className="flex items-center gap-2 bg-slate-50 text-slate-600 px-6 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest border border-slate-200 hover:bg-slate-100">
              <MessageSquare size={16} /> Templates
           </button>
           <button onClick={() => navigate('/config')} className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-400 hover:text-brand-blue transition-all">
             <Settings size={24} />
           </button>
        </div>
      </header>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-brand-blue/30 transition-all">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center text-brand-blue shadow-inner group-hover:scale-110 transition-transform">
                <Calendar size={32} />
              </div>
              <div className="flex flex-col">
                <span className={TXT.LABEL}>Período de Referência</span>
                <span className="text-3xl font-black text-slate-900 uppercase tracking-tighter">
                  {MONTHS_FULL[parseInt(monthYear.split("/")[0]) - 1]} / {monthYear.split("/")[1]}
                </span>
              </div>
            </div>
            <div className="hidden lg:flex px-4 py-2 bg-slate-50 rounded-full border border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Ciclo {monthYear.split("/")[1]}
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-brand-blue/30 transition-all">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-brand-blue/5 rounded-3xl flex items-center justify-center text-brand-blue shadow-inner group-hover:scale-110 transition-transform">
                <Clock size={32} />
              </div>
              <div className="flex flex-col">
                <span className={cn(TXT.LABEL, "text-brand-blue/60")}>Dias Letivos no Mês</span>
                <span className="text-3xl font-black text-brand-blue tracking-tighter">
                  {getCurrentMonthDays()} <span className="text-sm opacity-60">Dias</span>
                </span>
              </div>
            </div>
            <div className="w-12 h-1 bg-brand-blue/10 rounded-full" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm">
          <div className="grid grid-cols-6 lg:grid-cols-12 gap-2">
            {MONTHS_FULL.map((m, i) => {
              const label = `${String(i + 1).padStart(2, "0")}/${CURRENT_YEAR}`;
              const isSel = monthYear === label;
              return (
                <button 
                  key={i} 
                  onClick={() => { setMonthYear(label); setSelectedIds(new Set()); }} 
                  className={cn(
                    "relative py-5 rounded-2xl text-[11px] font-black uppercase tracking-tight transition-all flex flex-col items-center gap-1 overflow-hidden",
                    isSel 
                      ? "bg-slate-900 text-white shadow-xl scale-105 z-10" 
                      : "bg-slate-50 text-slate-400 border-transparent hover:border-slate-200"
                  )}
                >
                  {isSel && (
                    <motion.div 
                      layoutId="active-month-bg"
                      className="absolute top-0 left-0 w-full h-1 bg-brand-blue"
                    />
                  )}
                  <span className="opacity-40 text-[9px] mb-0.5">{String(i + 1).padStart(2, '0')}</span>
                  {m.slice(0, 3)}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="space-y-8">
        <div className="sticky top-4 z-40 bg-white/90 backdrop-blur-md p-4 rounded-3xl border border-slate-200 shadow-xl flex flex-col lg:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4 w-full lg:flex-1">
               <div className="relative flex-1 lg:max-w-md">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                  <input type="text" placeholder="PESQUISAR ALUNO..." value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-14 pr-6 py-4 text-[12px] font-bold uppercase focus:outline-none focus:border-brand-blue shadow-inner" />
               </div>
               <select value={segmentFilter} onChange={(e) => setSegmentFilter(e.target.value)} className="bg-white border border-slate-200 rounded-2xl px-6 py-4 text-[11px] font-black uppercase tracking-widest shadow-sm">
                 <option value="all">Segmentos</option>
                 {Array.from(new Set(students.map(s => s.segment))).filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
               </select>
               <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className="bg-white border border-slate-200 rounded-2xl px-6 py-4 text-[11px] font-black uppercase tracking-widest shadow-sm">
                 <option value="all">Turmas</option>
                 {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
               </select>
            </div>
             <button 
               disabled={selectedIds.size === 0 || previewInvoices.filter(i => selectedIds.has(i.id) && !!bankSlipNumbers[i.studentId]).length === 0} 
               onClick={() => setShowSaveConfirm(true)} 
               className="flex items-center gap-3 px-10 py-5 bg-brand-blue text-white rounded-2xl shadow-lg hover:bg-blue-700 disabled:opacity-50 font-black text-[11px] uppercase tracking-widest transition-all"
             >
                <Zap size={18} className={cn("transition-colors", previewInvoices.filter(i => selectedIds.has(i.id) && !!bankSlipNumbers[i.studentId]).length > 0 ? "text-brand-lime" : "text-white/40")} /> 
                Gerar Boletos ({previewInvoices.filter(i => selectedIds.has(i.id) && !!bankSlipNumbers[i.studentId]).length})
             </button>
        </div>

        <div className="flex bg-white p-2 rounded-2xl border border-slate-200 shadow-sm max-w-2xl mx-auto">
          {(["fixed", "consumption", "integral"] as const).map((tab) => {
            const isSel = activeTab === tab;
            const stats = {
              fixed: previewInvoices.filter(i => !i.isIntegral && i.billingMode !== "POSTPAID_CONSUMPTION").length,
              consumption: previewInvoices.filter(i => !i.isIntegral && i.billingMode === "POSTPAID_CONSUMPTION").length,
              integral: previewInvoices.filter(i => i.isIntegral).length
            };
            return (
               <button key={tab} onClick={() => { setActiveTab(tab); setSelectedIds(new Set()); }} className={cn(
                "flex-1 px-6 py-4 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all flex flex-col items-center gap-1",
                isSel ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:text-slate-600"
              )}>
                <span>{tab === "fixed" ? "Mensalidades" : tab === "consumption" ? "Consumo" : "Integral"}</span>
                <span className={cn("text-[9px] opacity-60", isSel ? "text-brand-lime" : "")}>
                   {stats[tab]} Alunos
                </span>
              </button>
            );
          })}
        </div>

        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden min-h-[400px]">
          {activeTab === 'fixed' && (
            <>
               <div className="p-8 bg-slate-50/50 border-b border-slate-100">
                 <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
                   <div className="flex items-center gap-6">
                     <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg">
                       <CreditCard size={24} className="text-brand-lime" />
                     </div>
                     <div>
                       <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Configuração de Mensalidades</h3>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Defina os valores base para este mês ({monthYear})</p>
                     </div>
                   </div>
                   
                   <div className="flex flex-wrap items-center gap-6">
                     <div className="flex flex-col gap-2">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Turmas GRUPO</label>
                       <div className="relative">
                         <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span>
                         <input 
                           type="number" 
                           value={categoryPrices.GRUPO || ''} 
                           onChange={(e) => setCategoryPrices(prev => ({ ...prev, GRUPO: parseFloat(e.target.value) || 0 }))}
                           className="pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-brand-blue outline-none font-bold text-slate-700 w-32 shadow-sm transition-all"
                           placeholder="0,00"
                         />
                       </div>
                     </div>
                     
                     <div className="flex flex-col gap-2">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Turmas MATERNAL</label>
                       <div className="relative">
                         <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span>
                         <input 
                           type="number" 
                           value={categoryPrices.MATERNAL || ''} 
                           onChange={(e) => setCategoryPrices(prev => ({ ...prev, MATERNAL: parseFloat(e.target.value) || 0 }))}
                           className="pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-brand-blue outline-none font-bold text-slate-700 w-32 shadow-sm transition-all"
                           placeholder="0,00"
                         />
                       </div>
                     </div>
 
                     <div className="h-12 w-px bg-slate-200 mx-2 hidden lg:block" />
 
                      <button 
                        onClick={() => setShowCopyConfirm(true)}
                        className="flex items-center gap-3 px-8 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
                      >
                        <Copy size={16} /> Copiar Mês Anterior
                      </button>
                    </div>
                 </div>
               </div>
               <FixedBillingTable 
                  previewInvoices={previewInvoices}
                  students={students}
                  classes={classes}
                  services={services}
                  dbConsumption={dbConsumption}
                  selectedIds={selectedIds}
                  setSelectedIds={setSelectedIds}
                  classFilter={classFilter}
                  segmentFilter={segmentFilter}
                  studentSearch={studentSearch}
                  manualAbsences={manualAbsences}
                  setManualAbsences={setManualAbsences}
                  setPreviewInvoices={setPreviewInvoices}
                  businessDays={getCurrentMonthDays()}
                  monthYear={monthYear}
                  ageRefDay={ageRefDay}
                  boletoFee={boletoFee}
                  mandatorySnackBySegment={mandatorySnackBySegment}
                  collegeShareBySegment={collegeShareBySegment}
                  bankSlipNumbers={bankSlipNumbers}
                  setBankSlipNumbers={setBankSlipNumbers}
                  invoiceNotes={invoiceNotes}
                  setInvoiceNotes={setInvoiceNotes}
                  showStudentNotes={showStudentNotes}
                  setShowStudentNotes={setShowStudentNotes}
                  manualDueDates={manualDueDates}
                  setManualDueDates={setManualDueDates}
                  formatStudentCopyId={formatStudentCopyId}
                  getStudentMessage={getStudentMessage}
                  setToast={showToast}
                />
            </>
          )}

          {activeTab === 'consumption' && (
             <>
               <div className="p-8 bg-slate-50/50 border-b border-slate-100">
                 <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
                   <div className="flex items-center gap-6">
                     <div className="w-14 h-14 bg-brand-blue/10 rounded-2xl flex items-center justify-center text-brand-blue shadow-lg">
                       <Upload size={24} />
                     </div>
                     <div>
                       <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Gestão de Consumo</h3>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Importe os dados da planilha de cantina ({monthYear})</p>
                     </div>
                   </div>
                   
                   <div className="flex items-center gap-4">
                     <motion.button 
                       whileHover={{ scale: 1.02 }}
                       whileTap={{ scale: 0.98 }}
                       onClick={() => setShowImportModal(true)} 
                       className="flex items-center gap-3 bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-brand-blue transition-all shadow-xl shadow-slate-900/20"
                     >
                       <Upload size={18} /> Importar Arquivo de Consumo
                     </motion.button>
                   </div>
                 </div>
               </div>
               <ConsumptionTable 
                  previewInvoices={previewInvoices}
                  students={students}
                  classes={classes}
                  services={services}
                  dbConsumption={dbConsumption}
                  selectedIds={selectedIds}
                  setSelectedIds={setSelectedIds}
                  classFilter={classFilter}
                  segmentFilter={segmentFilter}
                  studentSearch={studentSearch}
                  consumptionFilter={consumptionFilter}
                  recentlyImportedIds={recentlyImportedIds}
                  ageRefDay={ageRefDay}
                  monthYear={monthYear}
                  bankSlipNumbers={bankSlipNumbers}
                  setBankSlipNumbers={setBankSlipNumbers}
                  invoiceNotes={invoiceNotes}
                  setInvoiceNotes={setInvoiceNotes}
                  showStudentNotes={showStudentNotes}
                  setShowStudentNotes={setShowStudentNotes}
                  manualDueDates={manualDueDates}
                  setManualDueDates={setManualDueDates}
                  formatStudentCopyId={formatStudentCopyId}
                  getStudentMessage={getStudentMessage}
                  setToast={showToast}
                  onRemoveStudent={handleRemoveStudent}
                />
             </>
          )}

          {activeTab === 'integral' && (
             <>
               <div className="p-8 bg-slate-50/50 border-b border-slate-100">
                 <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
                   <div className="flex items-center gap-6">
                     <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-500 shadow-lg">
                       <User size={24} />
                     </div>
                     <div>
                       <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Serviços e Integral</h3>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Adicione serviços avulsos ou alunos no integral</p>
                     </div>
                   </div>
                   
                   <div className="flex items-center gap-4">
                     <motion.button 
                       whileHover={{ scale: 1.02 }}
                       whileTap={{ scale: 0.98 }}
                       onClick={() => setShowIntegralSelectModal(true)}
                       className="flex items-center gap-3 bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-brand-blue transition-all shadow-xl shadow-slate-900/20"
                     >
                       <Plus size={18} className="text-brand-lime" /> Adicionar Aluno
                     </motion.button>
                   </div>
                 </div>
               </div>
               <IntegralBillingTable 
                  previewInvoices={previewInvoices}
                  students={students}
                  classes={classes}
                  services={services}
                  dbConsumption={dbConsumption}
                  selectedIds={selectedIds}
                  setSelectedIds={setSelectedIds}
                  classFilter={classFilter}
                  segmentFilter={segmentFilter}
                  studentSearch={studentSearch}
                  integralItems={integralItems}
                  setIntegralItems={setIntegralItems}
                  setShowIntegralSelectModal={setShowIntegralSelectModal}
                  setShowIntegralServiceModal={setShowIntegralServiceModal}
                  bankSlipNumbers={bankSlipNumbers}
                  setBankSlipNumbers={setBankSlipNumbers}
                  manualDueDates={manualDueDates}
                  setManualDueDates={setManualDueDates}
                  invoiceNotes={invoiceNotes}
                  setInvoiceNotes={setInvoiceNotes}
                  ageRefDay={ageRefDay}
                  monthYear={monthYear}
                  formatStudentCopyId={formatStudentCopyId}
                  getStudentMessage={getStudentMessage}
                  setToast={showToast}
                  onRemoveStudent={handleRemoveStudent}
                />
             </>
          )}
        </div>
      </div>

      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-4xl"
          >
            <div className="bg-slate-900/95 backdrop-blur-md text-white p-5 rounded-3xl shadow-2xl flex items-center justify-between border border-white/10 overflow-hidden">
              <div className="absolute top-0 left-0 h-full w-2 bg-brand-blue" />
              <div className="flex items-center gap-6 pl-2">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Seleção Ativa</span>
                  <span className="text-xl font-black text-white">{selectedIds.size} Alunos Selecionados</span>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                  <button 
                    onClick={() => {
                       const allText = previewInvoices
                         .filter(inv => selectedIds.has(inv.id))
                         .map(inv => getStudentMessage(inv))
                         .join("\n\n---\n\n");
                       navigator.clipboard.writeText(allText);
                       showToast("Copiado com sucesso!");
                    }}
                    className="px-6 py-3 bg-white/5 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2"
                  >
                    <Copy size={14} /> Copiar Mensagens
                  </button>
                  <div className="w-px h-8 bg-white/10 mx-2" />
                  <button 
                    onClick={() => handleRemoveSelected()}
                    className="px-6 py-3 bg-rose-500/20 hover:bg-rose-500 text-rose-500 hover:text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2"
                  >
                    <Trash2 size={14} /> Remover da Lista
                  </button>
                  <button 
                    onClick={() => setSelectedIds(new Set())}
                    className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
                  >
                     Fechar
                  </button>
             </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showCopyConfirm && (
        <ConfirmDialog
          isOpen={true}
          title="COPIAR VALORES?"
          message={`Deseja realmente carregar os valores de mensalidade do mês anterior? Isso irá substituir os valores atuais.`}
          confirmLabel="COPIAR AGORA"
          onConfirm={handleCopyPreviousPrices}
          onCancel={() => setShowCopyConfirm(false)}
          variant="warning"
        />
      )}

      <ConfirmDialog isOpen={showSaveConfirm} title="Gerar Boletos Oficiais" message={`Você está prestes a gerar faturas para ${previewInvoices.filter(i => selectedIds.has(i.id) && !!bankSlipNumbers[i.studentId]).length} alunos selecionados. Prosseguir?`} onConfirm={handleSaveInvoices} onCancel={() => setShowSaveConfirm(false)} variant="info" />
      <ImportConsumptionModal isOpen={showImportModal} onClose={() => setShowImportModal(false)} classes={classes} onSuccess={async () => { await refreshConsumption(true); showToast("Consumo Importado com Sucesso!"); }} monthYear={monthYear} students={students} />
      <TemplateModal isOpen={showTemplateModal} onClose={() => setShowTemplateModal(false)} messageTemplates={messageTemplates} setMessageTemplates={setMessageTemplates} setToast={showToast} />
      <IntegralModals 
        showIntegralSelectModal={showIntegralSelectModal} 
        setShowIntegralSelectModal={setShowIntegralSelectModal} 
        showIntegralServiceModal={showIntegralServiceModal} 
        setShowIntegralServiceModal={setShowIntegralServiceModal} 
        students={students} 
        services={services} 
        classes={classes} 
        integralItems={integralItems} 
        setIntegralItems={setIntegralItems} 
        monthYear={monthYear} 
        saveCurrentDraft={saveCurrentDraft} 
        ageRefDay={ageRefDay}
        getPriceKey={getPriceKey}
        onConfirmSelection={handleConfirmSelection}
      />
    </div>
  );
}
