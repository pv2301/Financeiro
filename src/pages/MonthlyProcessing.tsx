import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Calculator,
  Upload,
  CheckCircle2,
  Save,
  Settings,
  Calendar,
  Info,
  HelpCircle,
  Receipt,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Search,
  X as XIcon,
  Clock,
  AlertTriangle,
  Copy,
  Plus,
  Trash2,
} from "lucide-react";
import Tooltip from "../components/Tooltip";
import {
  Student,
  ClassInfo,
  ServiceItem,
  Invoice,
  BillingMode,
} from "../types";
import { finance } from "../services/finance";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import ConfirmDialog from "../components/ConfirmDialog";
import ImportConsumptionModal from "../components/ImportConsumptionModal";
import { formatCurrencyBRL } from "../lib/utils";
import { calculateStudentInvoice } from "../lib/finance-logic";
import {
  calculateAgeInMonths,
  getPriceKey,
  CalculationInput,
} from "../lib/finance-logic";

const MONTHS = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];
const MONTHS_FULL = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_MONTH_IDX = new Date().getMonth(); // 0-indexed

const generateId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID)
    return crypto.randomUUID();
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

export default function MonthlyProcessing() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);

  const [monthYear, setMonthYear] = useState(format(new Date(), "MM/yyyy"));
  const [selectedMonthIdx, setSelectedMonthIdx] = useState(CURRENT_MONTH_IDX);
  const [scholasticDays, setScholasticDays] = useState<
    Record<string, number | string>
  >({});
  const [boletoFee, setBoletoFee] = useState(3.5);
  const [ageRefDay, setAgeRefDay] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingInvoices, setIsSavingInvoices] = useState(false);
  const [dbConsumption, setDbConsumption] = useState<
    import("../types").ConsumptionRecord[]
  >([]);
  const [previewInvoices, setPreviewInvoices] = useState<Invoice[]>([]);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "idle">(
    "idle",
  );

  // UI states
  const [activeTab, setActiveTab] = useState<
    "fixed" | "consumption" | "integral"
  >("fixed");
  const [manualAbsences, setManualAbsences] = useState<Record<string, number>>(
    {},
  );
  const [integralItems, setIntegralItems] = useState<
    Record<
      string,
      { serviceId: string; quantity: number; price: number; name: string }[]
    >
  >({}); // studentId -> items
  const [showIntegralSelectModal, setShowIntegralSelectModal] = useState(false);
  const [showIntegralServiceModal, setShowIntegralServiceModal] = useState<
    string | null
  >(null);
  const [consumptionFilter, setConsumptionFilter] = useState<
    "all" | "imported" | "pending" | "recent"
  >("all");
  const [recentlyImportedIds, setRecentlyImportedIds] = useState<string[]>([]);
  const [bankSlipNumbers, setBankSlipNumbers] = useState<
    Record<string, string>
  >({});
  const [manualDueDates, setManualDueDates] = useState<Record<string, string>>(
    {},
  );
  const [invoiceNotes, setInvoiceNotes] = useState<Record<string, string>>({});
  const [showStudentNotes, setShowStudentNotes] = useState<
    Record<string, boolean>
  >({});
  const [studentSearch, setStudentSearch] = useState("");
  const [modalStudentSearch, setModalStudentSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([
    "fixed",
    "consumption",
    "integral",
  ]);
  const [modalSegmentFilter, setModalSegmentFilter] = useState("all");
  const [modalClassFilter, setModalClassFilter] = useState("all");
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [messageTemplates, setMessageTemplates] = useState({
    fixed: "{MANDATORY_SNACK} - {MONTH_YEAR}\n{STUDENT_NAME}\n{CLASS_NAME}",
    consumption: "{MANDATORY_SNACK} - {MONTH_YEAR}\n{STUDENT_NAME}\n{CLASS_NAME}\n{CONSUMPTION}",
    integral: "INTEGRAL - {MONTH_YEAR}\n{STUDENT_NAME}\n{CLASS_NAME}\n{CONSUMPTION}",
  });

  const formatStudentCopyId = (name: string) => {
    return name.replace(/\s+/g, "").toUpperCase() + "_";
  };

  const getStudentMessage = (inv: Invoice) => {
    const s = students.find((x) => x.id === inv.studentId);
    const cls = classes.find((x) => x.id === inv.classId);
    if (!s || !cls) return "";

    let template = "";
    if (inv.billingMode === "POSTPAID_CONSUMPTION") {
      template = messageTemplates.consumption;
    } else if (
      inv.billingMode === "PREPAID_FIXED" ||
      inv.billingMode === "PREPAID_DAYS"
    ) {
      // Check if it's "Integral" by checking the note or context
      // In this app, Integral items are usually marked as PREPAID_FIXED for simplicity in previewInvoices
      // but let's check if the current active tab is integral or if it's one of the integralItems
      const isIntegral = activeTab === "integral" || integralItems[inv.studentId];
      template = isIntegral ? messageTemplates.integral : messageTemplates.fixed;
    } else {
      template = messageTemplates.fixed;
    }

    // Identify Mandatory Snack Name for the segment
    const mandatoryId = mandatorySnackBySegment[cls.segment];
    const mandatorySnack = services.find(svc => svc.id === mandatoryId)?.name || "LANCHE";

    // Placeholder replacement
    let msg = template
      .replace(/{STUDENT_NAME}/g, s.name)
      .replace(/{CLASS_NAME}/g, cls.name)
      .replace(/{MONTH_YEAR}/g, inv.monthYear)
      .replace(/{MANDATORY_SNACK}/g, mandatorySnack);

    if (template.includes("{CONSUMPTION}")) {
      let consumptionText = "";
      if (inv.billingMode === "POSTPAID_CONSUMPTION") {
        const consumption = dbConsumption.find(
          (d) => d.studentId === inv.studentId,
        );
        if (consumption) {
          consumptionText = Object.entries(consumption.summary)
            .map(([name, qty]) => `${qty}x ${name}`)
            .join("\n");
        }
      } else if (activeTab === "integral" || integralItems[inv.studentId]) {
        const items = integralItems[inv.studentId];
        if (items) {
          consumptionText = items
            .map((it) => `${it.quantity}x ${it.name}`)
            .join("\n");
        }
      }
      msg = msg.replace(/{CONSUMPTION}/g, consumptionText);
    }

    return msg;
  };
  const [isRefCollapsed, setIsRefCollapsed] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [stepStates, setStepStates] = useState({
    step1: true,
    step2: true,
    step3: true,
  });
  const [defaultDueDay, setDefaultDueDay] = useState<number>(10);
  const [collegeShareBySegment, setCollegeShareBySegment] = useState<
    Record<string, number>
  >({});
  const [mandatorySnackBySegment, setMandatorySnackBySegment] = useState<
    Record<string, string>
  >({});

  const toggleStep = (step: keyof typeof stepStates) => {
    setStepStates((prev) => ({ ...prev, [step]: !prev[step] }));
  };

  const showToast = useCallback((count: number) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(`Consumo importado com sucesso: ${count} registros`);
    toastTimerRef.current = setTimeout(() => setToast(null), 10000);
  }, []);

  useEffect(() => {
    async function load() {
      const [s, c, svc, config] = await Promise.all([
        finance.getStudents(),
        finance.getClasses(),
        finance.getServices(),
        finance.getGlobalConfig(),
      ]);
      setStudents(s);
      setClasses(c);
      setServices(svc);
      if (config) {
        setScholasticDays(config.scholasticDays || {});
        setBoletoFee(config.boletoEmissionFee ?? 3.5);
        setAgeRefDay(config.ageReferenceDay || 0);
        setDefaultDueDay(config.defaultDueDay || 10);
        setCollegeShareBySegment(config.collegeShareBySegment || {});
        setMandatorySnackBySegment(config.mandatorySnackBySegment || {});
        if (config.messageTemplates) {
          setMessageTemplates(config.messageTemplates);
        }
      }
    }
    load();
  }, []);

  // Get the scholastic days for the currently selected processing month
  const getCurrentMonthDays = (): number => {
    const parts = monthYear.split("/");
    if (parts.length !== 2) return 0;
    const key = `${parts[1]}-${parts[0]}`;
    const val = scholasticDays[key];
    const days = typeof val === "number" ? val : parseInt(val as string) || 0;
    return isNaN(days) ? 0 : days;
  };

  const loadConsumption = async (targetMonthYear: string, silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const formattedMonth = targetMonthYear.replace("/", "-");
      const records = await finance.getConsumptionByMonth(formattedMonth);
      setDbConsumption(records);
      generatePreview(records);
    } catch (error) {
      console.error(error);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (students.length > 0 && classes.length > 0) {
      loadConsumption(monthYear, true);
    }
  }, [monthYear, students.length, classes.length]);

  // Load Draft
  useEffect(() => {
    async function loadDraft() {
      const draft = await finance.getBillingDraft(monthYear);
      if (draft) {
        setManualAbsences(draft.manualAbsences || {});
        setBankSlipNumbers(draft.bankSlipNumbers || {});
        setManualDueDates(draft.manualDueDates || {});
        setInvoiceNotes(draft.invoiceNotes || {});
        setIntegralItems(draft.integralItems || {});
      } else {
        setManualAbsences({});
        setBankSlipNumbers({});
        setManualDueDates({});
        setInvoiceNotes({});
        setIntegralItems({});
      }
    }
    loadDraft();
  }, [monthYear]);

  // Auto-save Draft
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const timer = setTimeout(async () => {
      setSaveStatus("saving");
      await finance.saveBillingDraft({
        id: monthYear,
        manualAbsences,
        bankSlipNumbers,
        manualDueDates,
        invoiceNotes,
        integralItems,
        lastUpdated: new Date().toISOString(),
      });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }, 2000);

    return () => clearTimeout(timer);
  }, [
    monthYear,
    manualAbsences,
    bankSlipNumbers,
    manualDueDates,
    invoiceNotes,
    integralItems,
  ]);

  useEffect(() => {
    generatePreview(dbConsumption);
  }, [
    dbConsumption,
    manualAbsences,
    manualDueDates,
    integralItems,
    students,
    classes,
    scholasticDays,
    ageRefDay,
    boletoFee,
    defaultDueDay,
  ]);

  const generatePreview = (data: any[]) => {
    const newInvoices: Invoice[] = [];
    const businessDays = getCurrentMonthDays();

    students.forEach((student) => {
      const studentClass = classes.find((c) => c.id === student.classId);
      if (!studentClass) return;

      const consumption = data.find((d) => d.studentId === student.id);

      const calcResult = calculateStudentInvoice({
        student,
        studentClass,
        services,
        consumption,
        manualAbsences: manualAbsences[student.id] || 0,
        businessDays,
        monthYear,
        ageRefDay,
        emissionFee: boletoFee,
        collegeShareBySegment,
        mandatorySnackBySegment,
      });

      let {
        grossAmount,
        absenceDiscountAmount,
        personalDiscountAmount,
        netAmount,
        totalServices,
        collegeShareAmount,
      } = calcResult;

      netAmount = Math.max(0, netAmount);

      // Due Date Logic
      // 1. Check if user already edited it manually
      // 2. Otherwise use default: Anticipated=05, Postpaid=10
      let dueDate = manualDueDates[student.id];
      if (!dueDate) {
        const [m, y] = monthYear.split("/").map(Number);
        const targetDate = new Date(y, m, 1);
        const day = student.dueDay || defaultDueDay;
        targetDate.setDate(day);
        dueDate = format(targetDate, "yyyy-MM-dd");
      }

      newInvoices.push({
        id: generateId(),
        studentId: student.id,
        classId: studentClass.id,
        monthYear: monthYear,
        dueDate,
        billingMode: studentClass.billingMode,
        grossAmount,
        absenceDays: manualAbsences[student.id] || 0,
        absenceDiscountAmount,
        personalDiscountAmount,
        netAmount,
        nossoNumero: "",
        filename: student.filenameSuffix || "",
        paymentStatus: "PENDING",
        collegeSharePercent: studentClass.collegeSharePercent,
        boletoEmissionFee: boletoFee,
        collegeShareAmount,
        totalServices,
      });
    });

    // Add Integral invoices (Manual entries)
    Object.entries(integralItems).forEach(([studentId, items]) => {
      const student = students.find((s) => s.id === studentId);
      if (!student) return;
      const amount = items.reduce((a, b) => a + b.price * b.quantity, 0);
      if (amount <= 0) return;

      const studentClass = classes.find((c) => c.id === student.classId);
      if (!studentClass) return;

      const [m, y] = monthYear.split("/").map(Number);
      const targetDate = new Date(y, m, 1);
      const day = student.dueDay || defaultDueDay;
      targetDate.setDate(day);
      const dueDate =
        manualDueDates[studentId] || format(targetDate, "yyyy-MM-dd");

      const netAmount = Math.max(0, amount);
      const totalServices = items.reduce((acc, it) => acc + it.quantity, 0);
      const collegeSharePercent =
        studentClass.collegeSharePercent ||
        collegeShareBySegment[studentClass.segment] ||
        0;

      const collegeShareAmount = Math.max(
        0,
        ((netAmount - boletoFee) * collegeSharePercent) / 100,
      );

      newInvoices.push({
        id: generateId(),
        studentId,
        classId: studentClass.id,
        monthYear,
        dueDate,
        billingMode: "PREPAID_FIXED",
        grossAmount: amount,
        absenceDays: 0,
        absenceDiscountAmount: 0,
        personalDiscountAmount: 0,
        netAmount,
        nossoNumero: "",
        filename: student.filenameSuffix || "",
        paymentStatus: "PENDING",
        collegeSharePercent,
        boletoEmissionFee: boletoFee,
        collegeShareAmount,
        totalServices,
        note: items.map((i) => `${i.name} (x${i.quantity})`).join(", "),
        // @ts-ignore
        _isIntegral: true,
      });
    });

    setPreviewInvoices(newInvoices);
  };

  const handleSaveInvoices = async () => {
    setShowSaveConfirm(false);
    setIsSavingInvoices(true);
    try {
      if (ageRefDay === 0) {
        alert(
          "Erro: O Dia Base para Cálculo de Idade não foi definido em Configurações. Não é possível salvar.",
        );
        return;
      }

      const invoicesToSave = previewInvoices
        .filter((inv) => {
          // @ts-ignore
          if (inv._isIntegral) return selectedTypes.includes("integral");
          const typeMatch =
            inv.billingMode === "PREPAID_FIXED" ||
            inv.billingMode === "PREPAID_DAYS"
              ? selectedTypes.includes("fixed")
              : selectedTypes.includes("consumption");
          return typeMatch && inv.netAmount > 0;
        })
        .map((inv) => ({
          ...inv,
          bankSlipNumber: bankSlipNumbers[inv.studentId] || undefined,
          note: invoiceNotes[inv.studentId] || undefined,
        }));

      if (invoicesToSave.length === 0) {
        alert("Nenhum boleto selecionado para salvar.");
        return;
      }

      await Promise.all(invoicesToSave.map((inv) => finance.saveInvoice(inv)));
      await finance.clearBillingDraft(monthYear);
      showToast(`${invoicesToSave.length} boletos gerados com sucesso!`);
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar boletos. Verifique sua conexão.");
    } finally {
      setIsSavingInvoices(false);
    }
  };

  const filteredInvoicesForSummary = React.useMemo(() => {
    return previewInvoices.filter((inv) => {
      // @ts-ignore
      if (inv._isIntegral) return selectedTypes.includes("integral");
      const typeMatch =
        inv.billingMode === "PREPAID_FIXED" ||
        inv.billingMode === "PREPAID_DAYS"
          ? selectedTypes.includes("fixed")
          : selectedTypes.includes("consumption");
      return typeMatch;
    });
  }, [previewInvoices, selectedTypes]);

  const totalGross = React.useMemo(
    () => filteredInvoicesForSummary.reduce((a, i) => a + i.grossAmount, 0),
    [filteredInvoicesForSummary],
  );
  const totalNet = React.useMemo(
    () => filteredInvoicesForSummary.reduce((a, i) => a + i.netAmount, 0),
    [filteredInvoicesForSummary],
  );
  const totalCollege = React.useMemo(
    () =>
      filteredInvoicesForSummary.reduce(
        (a, i) => a + (i.collegeShareAmount || 0),
        0,
      ),
    [filteredInvoicesForSummary],
  );

  return (
    <div className="p-4 pb-24 max-w-full mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:justify-between md:items-center bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 gap-4"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-brand-blue/10 rounded-2xl flex items-center justify-center text-brand-blue shadow-inner">
            <Calculator size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-brand-blue uppercase tracking-tight">
              Fechamento
            </h1>
            <p className="text-slate-500 font-medium">
              Cálculo automático de consumo e geração de boletos.
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden"
      >
        <button
          onClick={() => setIsRefCollapsed(!isRefCollapsed)}
          className="w-full text-left p-6 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-brand-orange/10 rounded-xl flex items-center justify-center text-brand-orange shadow-sm">
              <Calendar size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800 uppercase tracking-widest leading-tight">
                Referência e Importação
              </h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">
                Mês base e consumo para processar
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isRefCollapsed && (
              <div className="hidden md:flex items-center gap-3">
                <div className="px-4 py-2 bg-brand-blue/5 border border-brand-blue/10 rounded-xl flex items-center gap-2.5">
                  <span className="text-[10px] font-black text-brand-blue/40 uppercase tracking-tighter">
                    Referência:
                  </span>
                  <span className="text-xs font-black text-brand-blue uppercase tracking-tight">
                    {MONTHS_FULL[parseInt(monthYear.split("/")[0]) - 1]} /{" "}
                    {monthYear.split("/")[1]}
                  </span>
                </div>
                <div
                  className={`px-4 py-2 border rounded-xl flex items-center gap-2.5 ${getCurrentMonthDays() === 0 ? "bg-brand-orange/5 border-brand-orange/20" : "bg-brand-blue/5 border-brand-blue/10"}`}
                >
                  <span
                    className={`text-[10px] font-black uppercase tracking-tighter ${getCurrentMonthDays() === 0 ? "text-brand-orange/60" : "text-brand-blue/40"}`}
                  >
                    Dias Letivos:
                  </span>
                  <span
                    className={`text-xs font-black ${getCurrentMonthDays() === 0 ? "text-brand-orange" : "text-brand-blue"}`}
                  >
                    {getCurrentMonthDays()}
                  </span>
                </div>
              </div>
            )}
            <div className="text-slate-400">
              {isRefCollapsed ? (
                <ChevronDown size={24} />
              ) : (
                <ChevronUp size={24} />
              )}
            </div>
          </div>
        </button>

        <AnimatePresence>
          {!isRefCollapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden p-6 pt-0"
            >
              <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-6 pt-6 mt-4 border-t border-slate-100">
                {/* Coluna 1: Mês de Referência */}
                <div className="bg-white rounded-3xl border border-slate-50 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex flex-col">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                        1. Mês de Referência
                      </h3>
                      <p className="text-lg font-black text-slate-800 uppercase tracking-tight">
                        {CURRENT_YEAR}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <AnimatePresence mode="wait">
                        {saveStatus !== "idle" && (
                          <motion.div
                            initial={{ opacity: 0, x: 5 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 5 }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black shadow-sm border ${
                              saveStatus === "saving"
                                ? "bg-amber-50 text-amber-600 border-amber-100"
                                : "bg-emerald-50 text-emerald-600 border-emerald-100"
                            }`}
                          >
                            {saveStatus === "saving" ? (
                              <>
                                <Clock size={12} className="animate-spin" />
                                SALVANDO...
                              </>
                            ) : (
                              <>
                                <CheckCircle2 size={12} />
                                SALVO
                              </>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100 shadow-inner">
                      <div className="flex flex-col items-end">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">
                          Dias Letivos
                        </span>
                        <span
                          className={`text-xl font-black leading-none ${getCurrentMonthDays() === 0 ? "text-brand-orange" : "text-brand-blue"}`}
                        >
                          {getCurrentMonthDays()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                  {getCurrentMonthDays() === 0 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-orange-50 border border-orange-100 p-4 rounded-2xl flex items-start gap-3"
                    >
                      <div className="text-orange-500 mt-0.5">
                        <AlertTriangle size={18} />
                      </div>
                      <div>
                        <h4 className="font-bold text-orange-800">
                          Período de Férias
                        </h4>
                        <p className="text-sm text-orange-700 font-medium">
                          O mês selecionado possui 0 dias letivos. Verifique as
                          Configurações.
                        </p>
                      </div>
                    </motion.div>
                  )}

                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                    {MONTHS_FULL.map((m, i) => {
                      const mmStr = String(i + 1).padStart(2, "0");
                      const label = `${mmStr}/${CURRENT_YEAR}`;
                      const isCurrent = i === CURRENT_MONTH_IDX;
                      const isSelected = monthYear === label;
                      return (
                        <button
                          key={i}
                          onClick={() => {
                            setMonthYear(label);
                            setSelectedMonthIdx(i);
                          }}
                          className={`px-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wide transition-all border ${
                            isSelected
                              ? `bg-brand-blue text-white border-brand-blue shadow-md shadow-brand-blue/20 scale-105 z-10 ${isCurrent ? "ring-2 ring-brand-orange ring-offset-1" : ""}`
                              : isCurrent
                                ? "bg-white text-brand-orange border-brand-orange ring-1 ring-brand-orange/30 hover:border-brand-orange"
                                : "bg-white text-slate-400 border-slate-100 hover:border-slate-300"
                          }`}
                          title={m}
                        >
                          {MONTHS[i]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Coluna 2: Importação */}
                <div className="flex flex-col">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none mb-5 pl-2">
                    2. Importar Consumo
                  </h3>

                  <div
                    onClick={() => setShowImportModal(true)}
                    className="group cursor-pointer flex-1 border-2 border-dashed border-slate-200 hover:border-brand-blue hover:bg-white rounded-3xl p-6 transition-all flex flex-row items-center gap-6 bg-slate-50/50 shadow-inner"
                  >
                    <div className="w-14 h-14 shrink-0 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center text-brand-blue group-hover:scale-110 transition-transform group-hover:shadow-md">
                      <Upload size={24} />
                    </div>
                    <div className="text-left">
                      <h4 className="font-black text-slate-700 uppercase tracking-widest text-xs">
                        Upload de Planilha
                      </h4>
                      <p className="text-slate-400 font-medium text-[10px] mt-0.5">
                        Excel (.xls ou .xlsx)
                      </p>
                    </div>
                    <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0 transition-transform">
                      <ChevronRight className="text-brand-blue" size={20} />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Step 3: Preview */}
      {previewInvoices.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100"
        >
          <button
            onClick={() => toggleStep("step3")}
            className="w-full flex items-center justify-between p-8 bg-slate-50/50 hover:bg-slate-100/50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div
                className={`w-10 h-10 ${getCurrentMonthDays() === 0 ? "bg-orange-50 text-brand-orange" : "bg-emerald-50 text-emerald-500"} rounded-xl flex items-center justify-center shadow-sm`}
              >
                {getCurrentMonthDays() === 0 ? (
                  <AlertTriangle size={20} />
                ) : (
                  <CheckCircle2 size={20} />
                )}
              </div>
              <h2 className="text-lg font-black text-slate-800 uppercase tracking-widest">
                Passo 3: Revisão de Boletos
              </h2>
            </div>
            <div className="text-slate-400">
              {stepStates.step3 ? (
                <ChevronUp size={24} />
              ) : (
                <ChevronDown size={24} />
              )}
            </div>
          </button>

          <AnimatePresence>
            {stepStates.step3 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="p-8 border-t border-slate-100 space-y-6"
              >
                {ageRefDay === 0 && (
                  <div className="bg-red-50 border border-red-200 p-4 rounded-2xl flex items-start gap-3 mb-6">
                    <div className="text-red-500 mt-0.5">
                      <AlertTriangle size={18} />
                    </div>
                    <div>
                      <h4 className="font-bold text-red-800">
                        Dia Base não definido
                      </h4>
                      <p className="text-sm text-red-700">
                        O Dia Base para Cálculo de Idade não foi configurado. Os
                        valores do Berçário podem estar incorretos.
                      </p>
                    </div>
                  </div>
                )}

                {/* Row 1: Tabs + Gerar boletos button */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2 bg-slate-100/50 p-1 rounded-2xl">
                    <button
                      onClick={() => {
                        setActiveTab("fixed");
                        setClassFilter("all");
                      }}
                      className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                        activeTab === "fixed"
                          ? "bg-white text-slate-800 shadow-sm"
                          : "text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      Mensalidade Fixa
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab("consumption");
                        setClassFilter("all");
                      }}
                      className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                        activeTab === "consumption"
                          ? "bg-white text-slate-800 shadow-sm"
                          : "text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      Consumo
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab("integral");
                        setClassFilter("all");
                      }}
                      className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                        activeTab === "integral"
                          ? "bg-white text-slate-800 shadow-sm"
                          : "text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      Integral
                    </button>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={selectedTypes.includes("fixed")}
                          onChange={(e) => {
                            if (e.target.checked)
                              setSelectedTypes([...selectedTypes, "fixed"]);
                            else
                              setSelectedTypes(
                                selectedTypes.filter((t) => t !== "fixed"),
                              );
                          }}
                          className="w-4 h-4 rounded text-brand-blue border-slate-300 focus:ring-brand-blue/20"
                        />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-slate-600 transition-colors">
                          Mensalidade
                        </span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={selectedTypes.includes("consumption")}
                          onChange={(e) => {
                            if (e.target.checked)
                              setSelectedTypes([
                                ...selectedTypes,
                                "consumption",
                              ]);
                            else
                              setSelectedTypes(
                                selectedTypes.filter(
                                  (t) => t !== "consumption",
                                ),
                              );
                          }}
                          className="w-4 h-4 rounded text-brand-blue border-slate-300 focus:ring-brand-blue/20"
                        />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-slate-600 transition-colors">
                          Consumo
                        </span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={selectedTypes.includes("integral")}
                          onChange={(e) => {
                            if (e.target.checked)
                              setSelectedTypes([...selectedTypes, "integral"]);
                            else
                              setSelectedTypes(
                                selectedTypes.filter((t) => t !== "integral"),
                              );
                          }}
                          className="w-4 h-4 rounded text-brand-blue border-slate-300 focus:ring-brand-blue/20"
                        />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-slate-600 transition-colors">
                          Integral
                        </span>
                      </label>
                    </div>

                    <button
                      onClick={() => setShowSaveConfirm(true)}
                      disabled={
                        isLoading || 
                        selectedTypes.length === 0 || 
                        previewInvoices.some(inv => {
                          const typeMatch = (inv.billingMode === "PREPAID_FIXED" || inv.billingMode === "PREPAID_DAYS")
                            ? selectedTypes.includes("fixed")
                            : selectedTypes.includes("consumption");
                          return typeMatch && inv.error;
                        })
                      }
                      className="flex items-center justify-center gap-2 bg-emerald-500 text-white px-6 py-3 rounded-2xl font-black hover:bg-emerald-600 disabled:opacity-50 disabled:hover:bg-emerald-500 transition-all text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20 whitespace-nowrap"
                    >
                      <Save size={18} />
                      Gerar{" "}
                      {
                        previewInvoices.filter((inv) => {
                          const typeMatch =
                            inv.billingMode === "PREPAID_FIXED" ||
                            inv.billingMode === "PREPAID_DAYS"
                              ? selectedTypes.includes("fixed")
                              : selectedTypes.includes("consumption");
                          return typeMatch && inv.netAmount > 0;
                        }).length
                      }{" "}
                      Boletos
                    </button>
                  </div>
                </div>

                {/* Row 2: Search + class filter */}
                <div className="flex flex-wrap gap-3">
                  <div className="relative flex-1 max-w-sm">
                    <Search
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      size={17}
                    />
                    <input
                      type="text"
                      placeholder="Buscar aluno por nome..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand-blue/10 font-medium text-sm"
                    />
                  </div>
                  <select
                    value={classFilter}
                    onChange={(e) => setClassFilter(e.target.value)}
                    className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-black text-xs uppercase tracking-widest focus:outline-none focus:ring-4 focus:ring-brand-blue/10 text-slate-600"
                  >
                    <option value="all">Todas as turmas</option>
                    {classes
                      .filter((c) => {
                        if (activeTab === "integral") {
                          return (
                            c.segment === "Educação Infantil" ||
                            c.segment === "Ensino Fundamental I"
                          );
                        }
                        if (activeTab === "fixed") {
                          return (
                            c.billingMode === "PREPAID_FIXED" ||
                            c.billingMode === "PREPAID_DAYS"
                          );
                        }
                        if (activeTab === "consumption") {
                          return c.billingMode === "POSTPAID_CONSUMPTION";
                        }
                        return true;
                      })
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>

                  <button
                    onClick={() => setShowTemplateModal(true)}
                    className="px-4 py-3 bg-white border border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest text-brand-blue hover:bg-brand-blue/5 transition-all flex items-center gap-2 shadow-sm"
                    title="Editar corpo do boleto para as notificações"
                  >
                    <Settings size={14} /> Mensagem Corpo do Boleto
                  </button>
                </div>

                <div className="overflow-x-auto mt-6">
                  {activeTab === "fixed" ? (
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <th className="pb-3 pr-4 text-left">
                            Aluno / Turma / Idade
                          </th>
                          <th className="pb-3 pr-4 text-right">Base</th>
                          <th className="pb-3 pr-4 text-center">Faltas</th>
                          <th className="pb-3 pr-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              Desc. Faltas
                              <Tooltip
                                title="Desconto de Faltas"
                                content="Cálculo: Valor Unitário (Lanche Referencial) × Faltas."
                              />
                            </div>
                          </th>
                          <th className="pb-3 pr-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              Desc. Pessoal (%)
                              <Tooltip
                                title="Desconto Pessoal"
                                content="Percentual de desconto fixo definido no cadastro do aluno (Ex: Funcionário/Acordo)."
                              />
                            </div>
                          </th>
                          <th className="pb-3 pr-4 text-center">Boleto</th>
                          <th className="pb-3 pr-4 text-center">Observação</th>
                          <th className="pb-3 pr-4 text-center">Vencimento</th>
                          <th className="pb-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              Líquido Final
                              <Tooltip
                                title="Líquido Final"
                                content="Valor final do boleto. Para Pré-Pago: Base - Descontos."
                              />
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {previewInvoices
                          .filter(
                            (inv) => inv.billingMode !== "POSTPAID_CONSUMPTION",
                          )
                          .filter(
                            (inv) =>
                              classFilter === "all" ||
                              inv.classId === classFilter,
                          )
                          .filter((inv) => {
                            if (!studentSearch) return true;
                            const s = students.find(
                              (x) => x.id === inv.studentId,
                            );
                            return (
                              s?.name
                                ?.toLowerCase()
                                .includes(studentSearch.toLowerCase()) ?? false
                            );
                          })
                          .map((inv) => {
                            const s = students.find(
                              (x) => x.id === inv.studentId,
                            );
                            const cls = classes.find(
                              (x) => x.id === inv.classId,
                            );
                            const businessDays = getCurrentMonthDays();

                            const billingAge = s?.birthDate
                              ? (() => {
                                  const [m, y] = monthYear
                                    .split("/")
                                    .map(Number);
                                  const refDate = new Date(
                                    y,
                                    m - 1,
                                    ageRefDay || 5,
                                  );
                                  const birth = new Date(s.birthDate);
                                  let yrs =
                                    refDate.getFullYear() - birth.getFullYear();
                                  let mos =
                                    refDate.getMonth() - birth.getMonth();
                                  if (refDate.getDate() < birth.getDate())
                                    mos--;
                                  if (mos < 0) {
                                    yrs--;
                                    mos += 12;
                                  }

                                  if (yrs === 0)
                                    return `${mos} ${mos === 1 ? "mês" : "meses"}`;
                                  const yearsText = `${yrs} ${yrs === 1 ? "ano" : "anos"}`;
                                  const monthsText =
                                    mos > 0
                                      ? ` e ${mos} ${mos === 1 ? "mês" : "meses"}`
                                      : "";
                                  return yearsText + monthsText;
                                })()
                              : "-";

                            return (
                              <React.Fragment key={inv.studentId}>
                                <tr className="hover:bg-slate-50 transition-colors">
                                  <td className="py-4 pr-4">
                                    <div className="flex items-center gap-2 mb-1">
                                      <p className="text-sm font-bold text-slate-800 leading-none">
                                        {s?.name || "Desconhecido"}
                                      </p>
                                      <button
                                        onClick={() => {
                                          const formattedId =
                                            formatStudentCopyId(s?.name || "");
                                          navigator.clipboard.writeText(
                                            formattedId,
                                          );
                                          setToast(`ID de ${s?.name} copiado!`);
                                          setTimeout(
                                            () => setToast(null),
                                            2000,
                                          );
                                        }}
                                        className="p-1 hover:bg-slate-100 rounded text-slate-300 hover:text-brand-blue transition-colors"
                                      >
                                        <Copy size={12} />
                                      </button>
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                                      {cls?.name || "—"} • {billingAge}
                                    </p>
                                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2 py-1 rounded-md w-fit group/cpf">
                                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                                            CPF Resp:
                                          </span>
                                          <span className="text-[10px] font-bold text-slate-600">
                                            {s?.responsibleCpf || (
                                              <span className="text-slate-300 italic normal-case">
                                                Não cadastrado
                                              </span>
                                            )}
                                          </span>
                                          {s?.responsibleCpf && (
                                            <button
                                              onClick={() => {
                                                navigator.clipboard.writeText(
                                                  s.responsibleCpf,
                                                );
                                                setToast("CPF copiado!");
                                                setTimeout(
                                                  () => setToast(null),
                                                  2000,
                                                );
                                              }}
                                              className="p-1 hover:bg-slate-200 rounded text-slate-300 hover:text-brand-blue transition-colors opacity-0 group-hover/cpf:opacity-100"
                                              title="Copiar CPF"
                                            >
                                              <Copy size={10} />
                                            </button>
                                          )}
                                        </div>

                                        <button
                                          onClick={() => {
                                            const msg = getStudentMessage(inv);
                                            navigator.clipboard.writeText(msg);
                                            setToast("Mensagem de cobrança copiada!");
                                            setTimeout(() => setToast(null), 2000);
                                          }}
                                          className="flex items-center gap-1.5 bg-brand-blue/5 border border-brand-blue/10 px-2 py-1 rounded-md hover:bg-brand-blue hover:text-white transition-all text-brand-blue"
                                          title="Copiar mensagem para o corpo do boleto"
                                        >
                                          <Copy size={10} />
                                          <span className="text-[9px] font-black uppercase tracking-tighter">Corpo Boleto</span>
                                        </button>
                                      </div>
                                  </td>
                                  <td className="py-4 pr-4 text-right text-sm text-slate-500 font-medium">
                                    {formatCurrencyBRL(inv.grossAmount)}
                                  </td>
                                  <td className="py-4 pr-4 text-center">
                                    <input
                                      type="number"
                                      min="0"
                                      max={
                                        inv.billingMode === "PREPAID_DAYS"
                                          ? businessDays
                                          : 31
                                      }
                                      value={
                                        manualAbsences[inv.studentId] ?? ""
                                      }
                                      onChange={(e) => {
                                        const newVal =
                                          parseInt(e.target.value) || 0;
                                        setManualAbsences((prev) => ({
                                          ...prev,
                                          [inv.studentId]: newVal,
                                        }));

                                        // Immediate Recalculation
                                        const studentObj = students.find(
                                          (st) => st.id === inv.studentId,
                                        );
                                        const studentClass = classes.find(
                                          (c) => c.id === studentObj?.classId,
                                        );

                                        if (studentObj && studentClass) {
                                          const consumption =
                                            dbConsumption.find(
                                              (c) =>
                                                c.studentId === inv.studentId,
                                            );

                                          const updatedInv =
                                            calculateStudentInvoice({
                                              student: studentObj,
                                              studentClass,
                                              services,
                                              consumption: consumption
                                                ? {
                                                    summary:
                                                      consumption.summary,
                                                  }
                                                : undefined,
                                              manualAbsences: newVal,
                                              businessDays,
                                              monthYear,
                                              ageRefDay: ageRefDay,
                                              emissionFee: boletoFee,
                                            });

                                          setPreviewInvoices((prev) =>
                                            prev.map((p) =>
                                              p.studentId === inv.studentId &&
                                              p.billingMode === inv.billingMode
                                                ? ({
                                                    ...p,
                                                    ...updatedInv,
                                                  } as Invoice)
                                                : p,
                                            ),
                                          );
                                        }
                                      }}
                                      placeholder="0"
                                      className="w-16 px-2 py-1.5 text-center text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
                                    />
                                  </td>
                                  <td className="py-4 pr-4 text-right">
                                    <div className="group relative cursor-help inline-flex items-center justify-end w-full">
                                      {inv.error ? (
                                        <div className="flex items-center gap-1.5 text-red-500">
                                          <AlertTriangle size={14} className="animate-pulse" />
                                          <span className="text-[10px] font-black uppercase tracking-tighter">ERRO</span>
                                          <div className="hidden group-hover:block absolute bottom-full right-0 mb-2 w-64 p-3 bg-red-600 text-white text-[10px] font-bold rounded-xl shadow-2xl z-[100] normal-case tracking-normal">
                                            {inv.error}. 
                                            <br/><br/>
                                            Acesse "Serviços e Valores" e marque um lanche deste segmento como "Referencial de Faltas".
                                          </div>
                                        </div>
                                      ) : (
                                        <>
                                          <span
                                            className={`text-sm font-bold ${inv.absenceDiscountAmount > 0 ? "text-red-500" : "text-slate-300"}`}
                                          >
                                            {inv.absenceDiscountAmount > 0
                                              ? `- ${formatCurrencyBRL(inv.absenceDiscountAmount)}`
                                              : "—"}
                                          </span>
                                          {inv.absenceDiscountAmount > 0 && (
                                            <div className="hidden group-hover:block absolute bottom-full right-0 mb-2 w-56 p-2 bg-slate-800 text-white text-[9px] font-medium rounded-lg shadow-xl z-[100] normal-case tracking-normal">
                                              Cálculo:
                                              {formatCurrencyBRL(
                                                inv.absenceDiscountAmount /
                                                  inv.absenceDays,
                                              )}{" "}
                                              (Unitário) × {inv.absenceDays} faltas
                                              ={" "}
                                              {formatCurrencyBRL(
                                                inv.absenceDiscountAmount,
                                              )}
                                            </div>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-4 pr-4 text-right">
                                    <div className="inline-flex flex-col items-end">
                                      <span
                                        className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${s?.personalDiscount ? "bg-amber-100 text-amber-700" : "bg-slate-50 text-slate-400"}`}
                                      >
                                        {s?.personalDiscount || 0}%
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-4 pr-4 text-center">
                                    <input
                                      type="text"
                                      value={
                                        bankSlipNumbers[inv.studentId] || ""
                                      }
                                      onChange={(e) =>
                                        setBankSlipNumbers((prev) => ({
                                          ...prev,
                                          [inv.studentId]: e.target.value,
                                        }))
                                      }
                                      placeholder="Nº Título"
                                      className="w-24 text-center py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-black focus:outline-none focus:ring-2 focus:ring-brand-blue/20 text-slate-700 uppercase placeholder:font-normal placeholder:text-slate-300"
                                    />
                                  </td>
                                  <td className="py-4 pr-4 text-center relative">
                                    <input
                                      type="text"
                                      value={invoiceNotes[inv.studentId] || ""}
                                      onChange={(e) =>
                                        setInvoiceNotes((prev) => ({
                                          ...prev,
                                          [inv.studentId]: e.target.value,
                                        }))
                                      }
                                      onClick={() =>
                                        setShowStudentNotes((prev) => ({
                                          ...prev,
                                          [inv.studentId]: !prev[inv.studentId],
                                        }))
                                      }
                                      placeholder="Obs..."
                                      className="w-32 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-medium focus:outline-none focus:ring-2 focus:ring-brand-blue/20 text-slate-600 placeholder:text-slate-300"
                                    />
                                    {showStudentNotes[inv.studentId] && (
                                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-64 bg-amber-50 border border-amber-100 p-2 rounded-lg shadow-lg z-20 text-[10px] text-amber-800 text-left animate-in fade-in slide-in-from-top-1">
                                        <p className="font-black uppercase tracking-widest text-[8px] text-amber-600 mb-1">
                                          Nota do Cadastro:
                                        </p>
                                        {s?.personalDiscountNote || (
                                          <span className="italic opacity-50">
                                            Nenhuma observação cadastrada
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-4 pr-4 text-center">
                                    <input
                                      type="date"
                                      value={
                                        manualDueDates[inv.studentId] ||
                                        inv.dueDate
                                      }
                                      onChange={(e) =>
                                        setManualDueDates((prev) => ({
                                          ...prev,
                                          [inv.studentId]: e.target.value,
                                        }))
                                      }
                                      className="text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
                                    />
                                  </td>
                                  <td className="py-4 text-right">
                                    <div className="group relative cursor-help inline-flex flex-col items-end">
                                      <span className="text-sm font-black text-slate-800">
                                        {formatCurrencyBRL(inv.netAmount)}
                                      </span>
                                      <div className="hidden group-hover:block absolute bottom-full right-0 mb-2 w-64 p-3 bg-slate-800 text-white text-[9px] font-medium rounded-xl shadow-2xl z-50 normal-case tracking-normal">
                                        <p className="font-black border-b border-white/10 pb-1 mb-1 uppercase tracking-widest text-white/50">
                                          Detalhamento do Cálculo
                                        </p>
                                        <div className="space-y-1">
                                          <div className="flex justify-between">
                                            <span>Valor Base:</span>{" "}
                                            <span>
                                              {formatCurrencyBRL(
                                                inv.grossAmount,
                                              )}
                                            </span>
                                          </div>
                                          {inv.absenceDiscountAmount > 0 && (
                                            <div className="flex justify-between text-red-300">
                                              <span>Desc. Faltas:</span>{" "}
                                              <span>
                                                -{" "}
                                                {formatCurrencyBRL(
                                                  inv.absenceDiscountAmount,
                                                )}
                                              </span>
                                            </div>
                                          )}
                                          <div className="flex justify-between pt-1 border-t border-white/10 font-bold text-emerald-300">
                                            <span>Líquido Final:</span>{" "}
                                            <span>
                                              {formatCurrencyBRL(inv.netAmount)}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              </React.Fragment>
                            );
                          })}
                      </tbody>
                    </table>
                  ) : activeTab === "consumption" ? (
                    <div className="space-y-4">
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => setConsumptionFilter("all")}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${consumptionFilter === "all" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                        >
                          Todos
                        </button>
                        <button
                          onClick={() => setConsumptionFilter("imported")}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${consumptionFilter === "imported" ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-emerald-50"}`}
                        >
                          Importados
                        </button>
                        <button
                          onClick={() => setConsumptionFilter("pending")}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${consumptionFilter === "pending" ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-amber-50"}`}
                        >
                          Pendentes
                        </button>
                        {(() => {
                          const effectiveRecentIds =
                            recentlyImportedIds.length > 0
                              ? recentlyImportedIds
                              : dbConsumption.map((d) => d.studentId);
                          if (effectiveRecentIds.length === 0) return null;
                          return (
                            <button
                              onClick={() => setConsumptionFilter("recent")}
                              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors flex items-center gap-1 ${consumptionFilter === "recent" ? "bg-sky-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-sky-50"}`}
                            >
                              <Clock size={11} /> Recentes (
                              {effectiveRecentIds.length})
                            </button>
                          );
                        })()}
                      </div>

                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <th className="pb-3 pr-4">Aluno / Turma / Idade</th>
                            <th className="pb-3 pr-4">
                              <div className="flex items-center gap-1">
                                Status
                                <Tooltip
                                  title="Status de Importação"
                                  content="Importado: Dados lidos da planilha. Pendente: Aluno sem registro de consumo no arquivo importado."
                                />
                              </div>
                            </th>
                            <th className="pb-3 pr-4">Resumo Consumo</th>
                            <th className="pb-3 pr-4 text-center">Boleto</th>
                            <th className="pb-3 pr-4 text-center">
                              Observação
                            </th>
                            <th className="pb-3 pr-4 text-center">
                              Vencimento
                            </th>
                            <th className="pb-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                Líquido Final
                                <Tooltip
                                  title="Líquido Final"
                                  content="Valor total consumido no mês (Soma dos itens × Preço unitário)."
                                />
                              </div>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {previewInvoices
                            .filter(
                              (inv) =>
                                inv.billingMode === "POSTPAID_CONSUMPTION",
                            )
                            .filter(
                              (inv) =>
                                classFilter === "all" ||
                                inv.classId === classFilter,
                            )
                            .filter((inv) => {
                              const effectiveRecentIds =
                                recentlyImportedIds.length > 0
                                  ? recentlyImportedIds
                                  : dbConsumption.map((d) => d.studentId);
                              const hasConsumption = dbConsumption.some(
                                (d) => d.studentId === inv.studentId,
                              );
                              const isRecent = effectiveRecentIds.includes(
                                inv.studentId,
                              );
                              const studentName = students.find(
                                (x) => x.id === inv.studentId,
                              )?.name;
                              const matchesSearch =
                                !studentSearch ||
                                (studentName
                                  ?.toLowerCase()
                                  .includes(studentSearch.toLowerCase()) ??
                                  false);

                              if (consumptionFilter === "imported")
                                return hasConsumption && matchesSearch;
                              if (consumptionFilter === "pending")
                                return !hasConsumption && matchesSearch;
                              if (consumptionFilter === "recent")
                                return isRecent && matchesSearch;
                              return matchesSearch;
                            })
                            .map((inv) => {
                              const s = students.find(
                                (x) => x.id === inv.studentId,
                              );
                              const cls = classes.find(
                                (x) => x.id === inv.classId,
                              );
                              const consumption = dbConsumption.find(
                                (d) => d.studentId === inv.studentId,
                              );

                              const billingAge = s?.birthDate
                                ? (() => {
                                    const [m, y] = monthYear
                                      .split("/")
                                      .map(Number);
                                    const refDate = new Date(
                                      y,
                                      m - 1,
                                      ageRefDay || 5,
                                    );
                                    const birth = new Date(s.birthDate);
                                    let yrs =
                                      refDate.getFullYear() -
                                      birth.getFullYear();
                                    let mos =
                                      refDate.getMonth() - birth.getMonth();
                                    if (refDate.getDate() < birth.getDate())
                                      mos--;
                                    if (mos < 0) {
                                      yrs--;
                                      mos += 12;
                                    }

                                    if (yrs === 0)
                                      return `${mos} ${mos === 1 ? "mês" : "meses"}`;
                                    const yearsText = `${yrs} ${yrs === 1 ? "ano" : "anos"}`;
                                    const monthsText =
                                      mos > 0
                                        ? ` e ${mos} ${mos === 1 ? "mês" : "meses"}`
                                        : "";
                                    return yearsText + monthsText;
                                  })()
                                : "-";

                              return (
                                <tr
                                  key={inv.id}
                                  className="hover:bg-slate-50 transition-colors"
                                >
                                  <td className="py-4 pr-4">
                                    <div className="flex items-center gap-2 mb-1">
                                      <p className="text-sm font-bold text-slate-800 leading-none">
                                        {s?.name || "Desconhecido"}
                                      </p>
                                      <button
                                        onClick={() => {
                                          const formattedId =
                                            formatStudentCopyId(s?.name || "");
                                          navigator.clipboard.writeText(
                                            formattedId,
                                          );
                                          setToast(`ID de ${s?.name} copiado!`);
                                          setTimeout(
                                            () => setToast(null),
                                            2000,
                                          );
                                        }}
                                        className="p-1 hover:bg-slate-100 rounded text-slate-300 hover:text-brand-blue transition-colors"
                                      >
                                        <Copy size={12} />
                                      </button>
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                                      {cls?.name || "—"} • {billingAge}
                                    </p>
                                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2 py-1 rounded-md w-fit group/cpf">
                                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                                            CPF Resp:
                                          </span>
                                          <span className="text-[10px] font-bold text-slate-600">
                                            {s?.responsibleCpf || (
                                              <span className="text-slate-300 italic normal-case">
                                                Não cadastrado
                                              </span>
                                            )}
                                          </span>
                                          {s?.responsibleCpf && (
                                            <button
                                              onClick={() => {
                                                navigator.clipboard.writeText(
                                                  s.responsibleCpf,
                                                );
                                                setToast(`CPF copiado!`);
                                                setTimeout(
                                                  () => setToast(null),
                                                  2000,
                                                );
                                              }}
                                              className="p-1 hover:bg-slate-200 rounded text-slate-300 hover:text-brand-blue transition-colors opacity-0 group-hover/cpf:opacity-100"
                                              title="Copiar CPF"
                                            >
                                              <Copy size={10} />
                                            </button>
                                          )}
                                        </div>

                                        {(() => {
                                          const hasData = dbConsumption.some(d => d.studentId === inv.studentId && Object.keys(d.summary).length > 0);
                                          return (
                                            <button
                                              onClick={() => {
                                                if (!hasData) {
                                                  setToast("Favor informar consumo");
                                                  setTimeout(() => setToast(null), 3000);
                                                  return;
                                                }
                                                const msg = getStudentMessage(inv);
                                                navigator.clipboard.writeText(msg);
                                                setToast("Mensagem de cobrança copiada!");
                                                setTimeout(() => setToast(null), 2000);
                                              }}
                                              className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-all border ${
                                                hasData 
                                                  ? "bg-brand-blue/5 border-brand-blue/10 text-brand-blue hover:bg-brand-blue hover:text-white" 
                                                  : "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed"
                                              }`}
                                              title={hasData ? "Copiar mensagem para o corpo do boleto" : "Consumo não informado"}
                                            >
                                              <Copy size={10} />
                                              <span className="text-[9px] font-black uppercase tracking-tighter">Corpo Boleto</span>
                                            </button>
                                          );
                                        })()}
                                      </div>
                                  </td>
                                  <td className="py-4 pr-4">
                                    {consumption ? (
                                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700">
                                        <CheckCircle2 size={12} /> Importado
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-400">
                                        <Receipt size={12} /> Pendente
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-4 pr-4">
                                    {consumption ? (
                                      <div className="flex flex-wrap gap-1.5 max-w-[220px] p-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/30">
                                        {Object.entries(consumption.summary).map(([name, qty]) => {
                                          const displayName = services.find(s => s.name.toLowerCase() === name.toLowerCase())?.name || name;
                                          return (
                                            <span
                                              key={name}
                                              className="text-[9px] font-bold bg-white text-slate-600 px-2 py-0.5 rounded-lg border border-slate-200 shadow-sm whitespace-nowrap"
                                            >
                                              {qty}x {displayName}
                                            </span>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <div className="p-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/30">
                                        <span className="text-[10px] font-bold text-slate-300 italic flex items-center gap-1.5">
                                          <AlertTriangle size={10} /> Sem consumo registrado
                                        </span>
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-4 pr-4 text-center">
                                    <input
                                      type="text"
                                      value={
                                        bankSlipNumbers[inv.studentId] || ""
                                      }
                                      onChange={(e) =>
                                        setBankSlipNumbers((prev) => ({
                                          ...prev,
                                          [inv.studentId]: e.target.value,
                                        }))
                                      }
                                      placeholder="Nº Título"
                                      className="w-24 text-center py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-black focus:outline-none focus:ring-2 focus:ring-brand-blue/20 text-slate-700 uppercase placeholder:font-normal placeholder:text-slate-300"
                                    />
                                  </td>
                                  <td className="py-4 pr-4 text-center relative">
                                    <input
                                      type="text"
                                      value={invoiceNotes[inv.studentId] || ""}
                                      onChange={(e) =>
                                        setInvoiceNotes((prev) => ({
                                          ...prev,
                                          [inv.studentId]: e.target.value,
                                        }))
                                      }
                                      onFocus={() =>
                                        setShowStudentNotes((prev) => ({
                                          ...prev,
                                          [inv.studentId]: true,
                                        }))
                                      }
                                      onBlur={() => {
                                        setTimeout(() => {
                                          setShowStudentNotes((prev) => ({
                                            ...prev,
                                            [inv.studentId]: false,
                                          }));
                                        }, 100);
                                      }}
                                      placeholder="Obs..."
                                      className="w-32 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-medium focus:outline-none focus:ring-2 focus:ring-brand-blue/20 text-slate-600 placeholder:text-slate-300"
                                    />
                                    {showStudentNotes[inv.studentId] && (
                                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-64 bg-amber-50 border border-amber-100 p-3 rounded-lg shadow-lg z-20 text-[10px] text-amber-800 text-left animate-in fade-in slide-in-from-top-1">
                                        <button
                                          onMouseDown={(e) => {
                                            e.preventDefault();
                                            setShowStudentNotes((prev) => ({
                                              ...prev,
                                              [inv.studentId]: false,
                                            }));
                                          }}
                                          className="absolute top-1 right-1 p-1 text-amber-400 hover:text-amber-600 transition-colors"
                                        >
                                          <XIcon size={10} />
                                        </button>
                                        <p className="font-black uppercase tracking-widest text-[8px] text-amber-600 mb-1">
                                          Nota do Cadastro:
                                        </p>
                                        {s?.personalDiscountNote || (
                                          <span className="italic opacity-50">
                                            Nenhuma observação cadastrada
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-4 pr-4 text-center">
                                    <input
                                      type="date"
                                      value={
                                        manualDueDates[inv.studentId] ||
                                        inv.dueDate
                                      }
                                      onChange={(e) =>
                                        setManualDueDates((prev) => ({
                                          ...prev,
                                          [inv.studentId]: e.target.value,
                                        }))
                                      }
                                      className="text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
                                    />
                                  </td>
                                  <td className="py-4 text-right">
                                    <div className="group relative cursor-help inline-flex flex-col items-end">
                                      <span className="text-sm font-black text-slate-800">
                                        {formatCurrencyBRL(inv.netAmount)}
                                      </span>
                                      <div className="hidden group-hover:block absolute bottom-full right-0 mb-2 w-64 p-3 bg-slate-800 text-white text-[9px] font-medium rounded-xl shadow-2xl z-50 normal-case tracking-normal">
                                        <p className="font-black border-b border-white/10 pb-1 mb-1 uppercase tracking-widest text-white/50">
                                          Detalhamento do Cálculo
                                        </p>
                                        <div className="space-y-1">
                                          <div className="flex justify-between">
                                            <span>Bruto Consumido:</span>{" "}
                                            <span>
                                              {formatCurrencyBRL(
                                                inv.grossAmount,
                                              )}
                                            </span>
                                          </div>
                                          <div className="flex justify-between pt-1 border-t border-white/10 font-bold text-emerald-300">
                                            <span>Líquido Final:</span>{" "}
                                            <span>
                                              {formatCurrencyBRL(inv.netAmount)}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="bg-sky-50 border border-sky-100 p-4 rounded-2xl flex items-start gap-3 flex-1">
                          <Info className="text-sky-500 mt-0.5" size={18} />
                          <div>
                            <p className="text-xs font-bold text-sky-800">
                              Lançamento de Serviço Integral (Lançamento Manual
                              Seletivo)
                            </p>
                            <p className="text-[10px] text-sky-700 leading-relaxed">
                              Selecione alunos da Educação Infantil e
                              Fundamental I para cobranças avulsas descritivas.
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setShowIntegralSelectModal(true)}
                          className="px-6 py-3 bg-brand-blue text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-brand-blue/20 hover:scale-105 transition-all flex items-center gap-2"
                        >
                          <Plus size={16} /> Selecionar Alunos
                        </button>
                      </div>

                      <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              <th className="py-4 px-6">
                                Aluno / Turma / Idade
                              </th>

                              <th className="py-4 px-4">Resumo Consumo</th>
                              <th className="py-4 px-4 text-center">
                                Nº Título
                              </th>
                              <th className="py-4 px-4 text-center">
                                Vencimento
                              </th>
                              <th className="py-4 px-6 text-right">
                                Líquido Final
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {Object.entries(integralItems)
                              .filter(([studentId]) => {
                                const s = students.find(
                                  (x) => x.id === studentId,
                                );
                                if (!s) return false;
                                const matchesSearch =
                                  !studentSearch ||
                                  s.name
                                    .toLowerCase()
                                    .includes(studentSearch.toLowerCase());
                                const matchesClass =
                                  classFilter === "all" ||
                                  s.classId === classFilter;
                                return matchesSearch && matchesClass;
                              })
                              .map(([studentId, items]) => {
                                const s = students.find(
                                  (x) => x.id === studentId,
                                );
                                const cls = classes.find(
                                  (c) => c.id === s?.classId,
                                );
                                const amount = items.reduce(
                                  (a, b) => a + b.price * b.quantity,
                                  0,
                                );
                                const inv = previewInvoices.find(
                                  (i) =>
                                    i.studentId === studentId &&
                                    i.note ===
                                      items
                                        .map(
                                          (it) =>
                                            `${it.name} (x${it.quantity})`,
                                        )
                                        .join(", "),
                                );

                                return (
                                  <tr
                                    key={studentId}
                                    className="hover:bg-slate-50 transition-colors"
                                  >
                                    <td className="py-4 px-6">
                                      <div className="flex items-center gap-2 mb-1">
                                        <p className="text-sm font-bold text-slate-800 leading-none">
                                          {s?.name}
                                        </p>
                                        <button
                                          onClick={() => {
                                            const next = { ...integralItems };
                                            delete next[studentId];
                                            setIntegralItems(next);
                                          }}
                                          className="p-1 hover:bg-red-50 rounded text-slate-300 hover:text-red-500 transition-colors"
                                          title="Remover aluno da lista"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                        <button
                                          onClick={() => {
                                            const formattedId =
                                              formatStudentCopyId(
                                                s?.name || "",
                                              );
                                            navigator.clipboard.writeText(
                                              formattedId,
                                            );
                                            setToast(
                                              `ID de ${s?.name} copiado!`,
                                            );
                                            setTimeout(
                                              () => setToast(null),
                                              2000,
                                            );
                                          }}
                                          className="p-1 hover:bg-slate-100 rounded text-slate-300 hover:text-brand-blue transition-colors"
                                        >
                                          <Copy size={12} />
                                        </button>
                                      </div>

                                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                                        {cls?.name || "—"} •{" "}
                                        {(() => {
                                          if (!s?.birthDate) return "-";
                                          const [m, y] = monthYear
                                            .split("/")
                                            .map(Number);
                                          const refDate = new Date(
                                            y,
                                            m - 1,
                                            ageRefDay || 5,
                                          );
                                          const birth = new Date(s.birthDate);
                                          let yrs =
                                            refDate.getFullYear() -
                                            birth.getFullYear();
                                          let mos =
                                            refDate.getMonth() -
                                            birth.getMonth();
                                          if (
                                            refDate.getDate() < birth.getDate()
                                          )
                                            mos--;
                                          if (mos < 0) {
                                            yrs--;
                                            mos += 12;
                                          }
                                          if (yrs === 0)
                                            return `${mos} ${mos === 1 ? "mês" : "meses"}`;
                                          const yearsText = `${yrs} ${yrs === 1 ? "ano" : "anos"}`;
                                          const monthsText =
                                            mos > 0
                                              ? ` e ${mos} ${mos === 1 ? "mês" : "meses"}`
                                              : "";
                                          return yearsText + monthsText;
                                        })()}
                                      </p>
                                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2 py-1 rounded-md w-fit group/cpf">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                                              CPF Resp:
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-600">
                                              {s?.responsibleCpf || (
                                                <span className="text-slate-300 italic normal-case">
                                                  Não cadastrado
                                                </span>
                                              )}
                                            </span>
                                            {s?.responsibleCpf && (
                                              <button
                                                onClick={() => {
                                                  navigator.clipboard.writeText(
                                                    s.responsibleCpf,
                                                  );
                                                  setToast(`CPF copiado!`);
                                                  setTimeout(
                                                    () => setToast(null),
                                                    2000,
                                                  );
                                                }}
                                                className="p-1 hover:bg-slate-200 rounded text-slate-300 hover:text-brand-blue transition-colors opacity-0 group-hover/cpf:opacity-100"
                                                title="Copiar CPF"
                                              >
                                                <Copy size={10} />
                                              </button>
                                            )}
                                          </div>

                                          {(() => {
                                            const hasData = (integralItems[studentId] || []).length > 0;
                                            return (
                                              <button
                                                onClick={() => {
                                                  if (!hasData) {
                                                    setToast("Favor informar consumo");
                                                    setTimeout(() => setToast(null), 3000);
                                                    return;
                                                  }
                                                  if (inv) {
                                                    const msg = getStudentMessage(inv);
                                                    navigator.clipboard.writeText(msg);
                                                    setToast("Mensagem de cobrança copiada!");
                                                    setTimeout(() => setToast(null), 2000);
                                                  }
                                                }}
                                                className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-all border ${
                                                  hasData 
                                                    ? "bg-brand-blue/5 border-brand-blue/10 text-brand-blue hover:bg-brand-blue hover:text-white" 
                                                    : "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed"
                                                }`}
                                                title={hasData ? "Copiar mensagem para o corpo do boleto" : "Consumo não informado"}
                                              >
                                                <Copy size={10} />
                                                <span className="text-[9px] font-black uppercase tracking-tighter">Corpo Boleto</span>
                                              </button>
                                            );
                                          })()}
                                        </div>
                                    </td>
                                    <td className="py-4 px-4">
                                      <button
                                        onClick={() =>
                                          setShowIntegralServiceModal(studentId)
                                        }
                                        className="group flex flex-wrap gap-1.5 max-w-[250px] p-2 rounded-xl border border-dashed border-slate-200 hover:border-brand-blue hover:bg-brand-blue/5 transition-all text-left"
                                      >
                                        {items.length > 0 ? (
                                          items.map((it, idx) => (
                                            <span
                                              key={idx}
                                              className="text-[9px] font-bold bg-white text-slate-600 px-2 py-0.5 rounded-lg border border-slate-200 shadow-sm"
                                            >
                                              {it.quantity}x {it.name}
                                            </span>
                                          ))
                                        ) : (
                                          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
                                            <Plus size={10} /> Clique para
                                            adicionar serviços
                                          </span>
                                        )}
                                      </button>
                                    </td>
                                    <td className="py-4 px-4 text-center">
                                      <input
                                        type="text"
                                        value={bankSlipNumbers[studentId] || ""}
                                        onChange={(e) =>
                                          setBankSlipNumbers((prev) => ({
                                            ...prev,
                                            [studentId]: e.target.value,
                                          }))
                                        }
                                        placeholder="Nº Título"
                                        className="w-24 text-center py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-black focus:outline-none focus:ring-2 focus:ring-brand-blue/20 text-slate-700 uppercase"
                                      />
                                    </td>
                                    <td className="py-4 px-4 text-center">
                                      <input
                                        type="date"
                                        value={
                                          manualDueDates[studentId] ||
                                          inv?.dueDate ||
                                          ""
                                        }
                                        onChange={(e) =>
                                          setManualDueDates((prev) => ({
                                            ...prev,
                                            [studentId]: e.target.value,
                                          }))
                                        }
                                        className="text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
                                      />
                                    </td>
                                    <td className="py-4 px-6 text-right">
                                      <div className="group relative cursor-help inline-flex flex-col items-end">
                                        <span className="text-sm font-black text-brand-blue">
                                          {formatCurrencyBRL(amount)}
                                        </span>
                                        <div className="hidden group-hover:block absolute bottom-full right-0 mb-2 w-64 p-4 bg-slate-800 text-white text-[10px] font-medium rounded-2xl shadow-2xl z-50 normal-case tracking-normal">
                                          <p className="font-black border-b border-white/10 pb-2 mb-2 uppercase tracking-widest text-white/50">
                                            Detalhamento Integral
                                          </p>
                                          <div className="space-y-1.5">
                                            {items.map((it, idx) => (
                                              <div
                                                key={idx}
                                                className="flex justify-between"
                                              >
                                                <span>
                                                  {it.quantity}x {it.name}
                                                </span>
                                                <span>
                                                  {formatCurrencyBRL(
                                                    it.price * it.quantity,
                                                  )}
                                                </span>
                                              </div>
                                            ))}
                                            <div className="flex justify-between pt-2 border-t border-white/10 font-black text-brand-blue">
                                              <span>VALOR TOTAL:</span>
                                              <span>
                                                {formatCurrencyBRL(amount)}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            {Object.keys(integralItems).length === 0 && (
                              <tr>
                                <td
                                  colSpan={6}
                                  className="py-12 text-center text-slate-400"
                                >
                                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <Plus
                                      className="text-slate-300"
                                      size={32}
                                    />
                                  </div>
                                  <p className="font-bold text-sm">
                                    Nenhum aluno selecionado para o Integral.
                                  </p>
                                  <p className="text-xs">
                                    Clique no botão "Selecionar Alunos" acima
                                    para começar.
                                  </p>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      <ConfirmDialog
        isOpen={showSaveConfirm}
        title="Gerar Boletos"
        message={`Deseja gerar e salvar ${
          previewInvoices.filter((inv) => {
            if (inv.note === "Serviço Integral")
              return selectedTypes.includes("integral");
            const typeMatch =
              inv.billingMode === "PREPAID_FIXED" ||
              inv.billingMode === "PREPAID_DAYS"
                ? selectedTypes.includes("fixed")
                : selectedTypes.includes("consumption");
            return typeMatch && inv.netAmount > 0;
          }).length
        } boletos com valor acima de R$ 0,00 para ${monthYear}?\n\nTotal Líquido: ${formatCurrencyBRL(totalNet)}`}
        confirmLabel="Gerar Boletos"
        variant="info"
        isLoading={isSavingInvoices}
        onConfirm={handleSaveInvoices}
        onCancel={() => setShowSaveConfirm(false)}
      />

      <ImportConsumptionModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        students={students}
        classes={classes}
        monthYear={monthYear}
        onSuccess={(importedIds) => {
          setRecentlyImportedIds(importedIds);
          setToast(`${importedIds.length} consumos importados com sucesso!`);
          setTimeout(() => setToast(null), 3000);
          loadConsumption(monthYear);
        }}
      />


      {showIntegralServiceModal &&
        (() => {
          const s = students.find((x) => x.id === showIntegralServiceModal);
          const currentItems = integralItems[showIntegralServiceModal!] || [];

          return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-[2.5rem] w-full max-w-xl overflow-hidden flex flex-col max-h-[80vh] shadow-2xl"
              >
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <div>
                    <div className="flex flex-col">
                      <h3 className="text-xl font-black text-slate-800 uppercase tracking-widest">
                        Serviços do Aluno - {s?.segment || "—"}
                      </h3>
                    </div>
                    <p className="text-sm text-slate-500 font-medium">
                      {s?.name}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowIntegralServiceModal(null)}
                    className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"
                  >
                    <XIcon size={24} />
                  </button>
                </div>

                <div className="p-8 overflow-y-auto space-y-6 bg-white">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                      Itens Lançados
                    </label>
                    {currentItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 group"
                      >
                        <div className="flex-1">
                          <p className="font-black text-slate-700 text-xs uppercase tracking-widest mb-0.5">
                            {item.name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            {formatCurrencyBRL(item.price)} unitário
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center bg-white rounded-lg border border-slate-200 p-1">
                            <button
                              onClick={() => {
                                const next = [...currentItems];
                                next[idx] = {
                                  ...next[idx],
                                  quantity: Math.max(1, next[idx].quantity - 1),
                                };
                                setIntegralItems((prev) => ({
                                  ...prev,
                                  [s!.id]: next,
                                }));
                              }}
                              className="p-1 text-slate-400 hover:text-brand-blue hover:bg-slate-50 rounded"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => {
                                const qty = parseInt(e.target.value) || 1;
                                const next = [...currentItems];
                                next[idx] = { ...next[idx], quantity: qty };
                                setIntegralItems((prev) => ({
                                  ...prev,
                                  [s!.id]: next,
                                }));
                              }}
                              className="w-10 py-1 text-center text-xs font-black text-slate-700 focus:outline-none"
                            />
                            <button
                              onClick={() => {
                                const next = [...currentItems];
                                next[idx] = {
                                  ...next[idx],
                                  quantity: next[idx].quantity + 1,
                                };
                                setIntegralItems((prev) => ({
                                  ...prev,
                                  [s!.id]: next,
                                }));
                              }}
                              className="p-1 text-slate-400 hover:text-brand-blue hover:bg-slate-50 rounded"
                            >
                              +
                            </button>
                          </div>
                          <button
                            onClick={() => {
                              const next = currentItems.filter(
                                (_, i) => i !== idx,
                              );
                              setIntegralItems((prev) => ({
                                ...prev,
                                [s!.id]: next,
                              }));
                            }}
                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}

                    {currentItems.length === 0 && (
                      <div className="text-center py-8 border-2 border-dashed border-slate-100 rounded-2xl">
                        <Receipt
                          className="mx-auto mb-2 text-slate-200"
                          size={32}
                        />
                        <p className="text-slate-400 text-xs font-medium italic">
                          Nenhum serviço adicionado ainda.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="pt-6 border-t border-slate-100">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                      Adicionar Novo Serviço
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      {services
                        .filter((svc) => {
                          const studentClass = classes.find(
                            (c) => c.id === s?.classId,
                          );
                          if (!studentClass) return false;
                          const priceKey = getPriceKey(
                            studentClass,
                            s || null,
                            monthYear,
                            ageRefDay,
                          );
                          const hasPrice = svc.priceByKey[priceKey] !== undefined;
                          
                          // Filter out Lanche Coletivo for Infantil and Fundamental I
                          const isInfantilOrFundI = s?.segment === 'Educação Infantil' || s?.segment === 'Ensino Fundamental I';
                          const isLancheColetivo = svc.name.toUpperCase().includes('LANCHE COLETIVO');
                          
                          if (isInfantilOrFundI && isLancheColetivo) return false;
                          
                          return hasPrice;
                        })
                        .map((svc) => (
                          <button
                            key={svc.id}
                            onClick={() => {
                              if (s) {
                                const studentClass = classes.find(
                                  (c) => c.id === s.classId,
                                );
                                if (studentClass) {
                                  const priceKey = getPriceKey(
                                    studentClass,
                                    s,
                                    monthYear,
                                    ageRefDay,
                                  );
                                  const price = svc.priceByKey[priceKey] || 0;

                                  setIntegralItems((prev) => {
                                    const currentStudentItems = [...(prev[s.id] || [])];
                                    const existingItemIndex = currentStudentItems.findIndex(item => item.serviceId === svc.id);
                                    
                                    if (existingItemIndex > -1) {
                                      currentStudentItems[existingItemIndex] = {
                                        ...currentStudentItems[existingItemIndex],
                                        quantity: currentStudentItems[existingItemIndex].quantity + 1
                                      };
                                    } else {
                                      currentStudentItems.push({
                                        serviceId: svc.id,
                                        name: svc.name,
                                        quantity: 1,
                                        price,
                                      });
                                    }
                                    
                                    return {
                                      ...prev,
                                      [s.id]: currentStudentItems,
                                    };
                                  });
                                }
                              }
                            }}
                            className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-brand-blue hover:bg-brand-blue/5 transition-all text-left"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400">
                                <Plus size={14} />
                              </div>
                              <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">
                                {svc.name}
                              </span>
                            </div>
                            <span className="text-xs font-black text-slate-400">
                              {(() => {
                                const studentClass = classes.find(
                                  (c) => c.id === s?.classId,
                                );
                                if (!studentClass) return "—";
                                const pk = getPriceKey(
                                  studentClass,
                                  s || null,
                                  monthYear,
                                  ageRefDay,
                                );
                                return formatCurrencyBRL(
                                  svc.priceByKey[pk] || 0,
                                );
                              })()}
                            </span>
                          </button>
                        ))}
                    </div>
                  </div>
                </div>

                <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                  <div className="text-left">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                      Total a Cobrar
                    </p>
                    <p className="text-2xl font-black text-brand-blue leading-none">
                      {formatCurrencyBRL(
                        currentItems.reduce(
                          (a, b) => a + b.price * b.quantity,
                          0,
                        ),
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowIntegralServiceModal(null)}
                    className="px-10 py-4 bg-brand-blue text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-brand-blue/30 hover:scale-105 transition-transform"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}

      {/* Modal: Editar Mensagens Padrão */}
      <AnimatePresence>
        {showTemplateModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTemplateModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-brand-blue/10 rounded-2xl flex items-center justify-center text-brand-blue shadow-inner">
                    <Settings size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-brand-blue uppercase tracking-tight">
                      Configurar Mensagens
                    </h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      Corpo do Boleto / Notificações
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowTemplateModal(false)}
                  className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors text-slate-400"
                >
                  <XIcon size={20} />
                </button>
              </div>

              <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl">
                  <h4 className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <Info size={12} /> Placeholders Disponíveis
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {["{STUDENT_NAME}", "{CLASS_NAME}", "{MONTH_YEAR}", "{MANDATORY_SNACK}", "{CONSUMPTION}"].map(p => (
                      <span key={p} className="px-2 py-1 bg-white border border-amber-200 rounded-lg text-[9px] font-black text-amber-800 font-mono tracking-tighter">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                      Mensalidade Fixa
                    </label>
                    <textarea
                      value={messageTemplates.fixed}
                      onChange={(e) => setMessageTemplates({ ...messageTemplates, fixed: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand-blue/10 font-medium text-sm min-h-[80px]"
                      placeholder="Ex: {MANDATORY_SNACK} - {MONTH_YEAR}\n{STUDENT_NAME}"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                      Consumo
                    </label>
                    <textarea
                      value={messageTemplates.consumption}
                      onChange={(e) => setMessageTemplates({ ...messageTemplates, consumption: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand-blue/10 font-medium text-sm min-h-[80px]"
                      placeholder="Ex: {MANDATORY_SNACK} - {MONTH_YEAR}\n{STUDENT_NAME}\n{CONSUMPTION}"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                      Integral
                    </label>
                    <textarea
                      value={messageTemplates.integral}
                      onChange={(e) => setMessageTemplates({ ...messageTemplates, integral: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand-blue/10 font-medium text-sm min-h-[80px]"
                      placeholder="Ex: INTEGRAL - {MONTH_YEAR}\n{STUDENT_NAME}\n{CONSUMPTION}"
                    />
                  </div>
                </div>
              </div>

              <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button
                  onClick={() => setShowTemplateModal(false)}
                  className="px-6 py-3 text-slate-500 font-black text-xs uppercase tracking-widest hover:text-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    try {
                      const config = await finance.getGlobalConfig();
                      await finance.saveGlobalConfig({
                        ...config,
                        messageTemplates,
                      } as any);
                      setShowTemplateModal(false);
                      setToast("Templates salvos com sucesso!");
                      setTimeout(() => setToast(null), 2000);
                    } catch (e) {
                      console.error(e);
                    }
                  }}
                  className="px-8 py-3 bg-brand-blue text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-brand-blue/30 hover:scale-105 transition-transform"
                >
                  Salvar Templates
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Selecionar Alunos para Integral */}
      <AnimatePresence>
        {showIntegralSelectModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowIntegralSelectModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-brand-orange/10 rounded-2xl flex items-center justify-center text-brand-orange shadow-inner">
                    <Plus size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                      Selecionar Alunos (Integral)
                    </h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      Educação Infantil e Fundamental I
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowIntegralSelectModal(false)}
                  className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors text-slate-400"
                >
                  <XIcon size={20} />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="flex flex-col gap-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type="text"
                        placeholder="Pesquisar aluno pelo nome..."
                        value={modalStudentSearch}
                        onChange={(e) => setModalStudentSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand-blue/10 text-sm font-medium"
                      />
                    </div>
                    <div className="flex gap-3">
                      <select
                        value={modalSegmentFilter}
                        onChange={(e) => {
                          setModalSegmentFilter(e.target.value);
                          setModalClassFilter('all');
                        }}
                        className="flex-1 px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-black text-xs uppercase tracking-widest focus:outline-none focus:ring-4 focus:ring-brand-blue/10"
                      >
                        <option value="all">Todos os segmentos</option>
                        <option value="Educação Infantil">Educação Infantil</option>
                        <option value="Ensino Fundamental I">Ensino Fundamental I</option>
                      </select>
                      
                      <select
                        value={modalClassFilter}
                        onChange={(e) => setModalClassFilter(e.target.value)}
                        className="flex-1 px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-black text-xs uppercase tracking-widest focus:outline-none focus:ring-4 focus:ring-brand-blue/10"
                      >
                        <option value="all">Todas as turmas</option>
                        {classes
                          .filter(c => modalSegmentFilter === 'all' || c.segment === modalSegmentFilter)
                          .filter(c => c.segment === 'Educação Infantil' || c.segment === 'Ensino Fundamental I')
                          .map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                      </select>
                    </div>
                  </div>

                  <div className="max-h-[40vh] overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-2">
                    {students
                      .filter(s => {
                        const cls = classes.find(c => c.id === s.classId);
                        if (!cls) return false;
                        const isTargetSegment = cls.segment === 'Educação Infantil' || cls.segment === 'Ensino Fundamental I';
                        const matchesSegment = modalSegmentFilter === 'all' || cls.segment === modalSegmentFilter;
                        const matchesClass = modalClassFilter === 'all' || s.classId === modalClassFilter;
                        const matchesSearch = !modalStudentSearch || s.name.toLowerCase().includes(modalStudentSearch.toLowerCase());
                        return isTargetSegment && matchesSegment && matchesClass && matchesSearch;
                      })
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map(student => {
                        const isSelected = !!integralItems[student.id];
                        return (
                          <button
                            key={student.id}
                            onClick={() => {
                              if (isSelected) {
                                const newItems = { ...integralItems };
                                delete newItems[student.id];
                                setIntegralItems(newItems);
                              } else {
                                setIntegralItems({
                                  ...integralItems,
                                  [student.id]: []
                                });
                              }
                            }}
                            className={`flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${
                              isSelected 
                                ? 'bg-brand-blue/5 border-brand-blue shadow-sm' 
                                : 'bg-white border-slate-100 hover:border-slate-200'
                            }`}
                          >
                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-all ${
                              isSelected 
                                ? 'bg-brand-blue border-brand-blue text-white' 
                                : 'bg-white border-slate-200'
                            }`}>
                              {isSelected && <CheckCircle2 size={14} />}
                            </div>
                            <div className="flex-1">
                              <p className={`text-sm font-black uppercase tracking-tight ${isSelected ? 'text-brand-blue' : 'text-slate-700'}`}>
                                {student.name}
                              </p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                {student.segment} • {classes.find(c => c.id === student.classId)?.name || '—'}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                  </div>
              </div>

              <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setShowIntegralSelectModal(false)}
                  className="px-10 py-4 bg-brand-blue text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-brand-blue/30 hover:scale-105 transition-transform"
                >
                  Concluir Seleção
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
