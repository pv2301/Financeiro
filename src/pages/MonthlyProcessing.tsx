import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Calculator, Upload, CheckCircle2, Save, Settings, Calendar, Info, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { Student, ClassInfo, ServiceItem, Invoice, BillingMode } from '../types';
import { finance } from '../services/finance';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import ConfirmDialog from '../components/ConfirmDialog';
import ImportConsumptionModal from '../components/ImportConsumptionModal';

function getPriceKey(studentClass: ClassInfo): string {
  const seg = studentClass.segment;
  const name = studentClass.name.toLowerCase();
  
  if (seg === 'Berçário') {
    if (studentClass.ageRange === '6-9m') return 'Berçário|Baby';
    if (studentClass.ageRange === '10-12m') return 'Berçário|Ninho';
    if (studentClass.ageRange === '13-24m') return 'Berçário|Extra';
    return 'Berçário|Baby'; 
  }
  
  if (seg === 'Educação Infantil') {
    if (name.includes('maternal')) return 'Educação Infantil|Maternal';
    if (name.includes('grupo 1')) return 'Educação Infantil|Grupo 1';
    if (name.includes('grupo 2')) return 'Educação Infantil|Grupo 2';
    if (name.includes('grupo 3')) return 'Educação Infantil|Grupo 3';
    return 'Educação Infantil|Maternal'; 
  }

  if (seg === 'Ensino Fundamental I' || seg === 'Fundamental') {
    if (name.includes('1º') || name.includes('1o') || name.includes('ano 1')) return 'Ensino Fundamental I|Ano 1';
    if (name.includes('2º') || name.includes('2o') || name.includes('ano 2')) return 'Ensino Fundamental I|Ano 2';
    if (name.includes('3º') || name.includes('3o') || name.includes('ano 3')) return 'Ensino Fundamental I|Ano 3';
    if (name.includes('4º') || name.includes('4o') || name.includes('ano 4')) return 'Ensino Fundamental I|Ano 4';
    if (name.includes('5º') || name.includes('5o') || name.includes('ano 5')) return 'Ensino Fundamental I|Ano 5';
    return 'Ensino Fundamental I|Ano 1'; 
  }
  
  return studentClass.segment;
}

const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const MONTHS_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_MONTH_IDX = new Date().getMonth(); // 0-indexed

export default function MonthlyProcessing() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  
  const [monthYear, setMonthYear] = useState(format(new Date(), 'MM/yyyy'));
  const [selectedMonthIdx, setSelectedMonthIdx] = useState(CURRENT_MONTH_IDX);
  const [scholasticDays, setScholasticDays] = useState<Record<string, number>>({});
  const [boletoFee, setBoletoFee] = useState(3.50);
  const [isLoading, setIsLoading] = useState(false);
  const [dbConsumption, setDbConsumption] = useState<import('../types').ConsumptionRecord[]>([]);
  const [previewInvoices, setPreviewInvoices] = useState<Invoice[]>([]);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // New UI states
  const [activeTab, setActiveTab] = useState<'fixed' | 'consumption'>('fixed');
  const [manualAbsences, setManualAbsences] = useState<Record<string, number>>({});
  const [consumptionFilter, setConsumptionFilter] = useState<'all' | 'imported' | 'pending'>('all');
  const [studentSearch, setStudentSearch] = useState('');
  
  const [stepStates, setStepStates] = useState({
    step1: true,
    step2: true,
    step3: true
  });

  const toggleStep = (step: keyof typeof stepStates) => {
    setStepStates(prev => ({ ...prev, [step]: !prev[step] }));
  };

  useEffect(() => {
    async function load() {
      const [s, c, svc, config] = await Promise.all([
        finance.getStudents(),
        finance.getClasses(),
        finance.getServices(),
        finance.getGlobalConfig()
      ]);
      setStudents(s);
      setClasses(c);
      setServices(svc);
      if (config) {
        setScholasticDays(config.scholasticDays || {});
        setBoletoFee(config.boletoEmissionFee ?? 3.50);
      }
    }
    load();
  }, []);

  // Get the scholastic days for the currently selected processing month
  const getCurrentMonthDays = (): number => {
    const parts = monthYear.split('/');
    if (parts.length !== 2) return 0;
    const key = `${parts[1]}-${parts[0]}`;
    return scholasticDays[key] || 0;
  };

  const loadConsumption = async (targetMonthYear: string) => {
    setIsLoading(true);
    try {
      const formattedMonth = targetMonthYear.replace('/', '-');
      const records = await finance.getConsumptionByMonth(formattedMonth);
      setDbConsumption(records);
      generatePreview(records);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (students.length > 0 && classes.length > 0) {
      loadConsumption(monthYear);
    }
  }, [monthYear, students.length, classes.length]);

  useEffect(() => {
    generatePreview(dbConsumption);
  }, [dbConsumption, manualAbsences, students, classes, scholasticDays]);

  const generatePreview = (data: import('../types').ConsumptionRecord[]) => {
    const newInvoices: Invoice[] = [];
    const businessDays = getCurrentMonthDays();

    students.forEach(student => {
      const studentClass = classes.find(c => c.id === student.classId);
      if (!studentClass) return;

      const consumption = data.find(d => d.studentId === student.id);

      // Quantidade de dias únicos que o aluno consumiu no mês
      const daysConsumed = consumption ? new Set(consumption.dailyDetails.map(dd => dd.date)).size : 0;
      
      let grossAmount = 0;
      let absenceDiscountAmount = 0;
      let personalDiscountAmount = 0;
      let netAmount = 0;
      
      if (studentClass.billingMode === 'POSTPAID_CONSUMPTION') {
        // Sum consumed items × prices from service table
        if (consumption && consumption.summary) {
          Object.entries(consumption.summary).forEach(([snackName, qty]) => {
            // Find service price by matching name and segment
            const svc = services.find(s => s.name.toLowerCase() === snackName.toLowerCase());
            if (svc) {
              const priceKey = getPriceKey(studentClass);
              const price = svc.priceByKey[priceKey] || 0;
              grossAmount += (price * qty);
            }
          });
        }
        netAmount = grossAmount;
      } 
      else if (studentClass.billingMode === 'ANTICIPATED_DAYS') {
        // basePrice is per-day × scholastic days
        grossAmount = studentClass.basePrice * businessDays;
        
        if (studentClass.applyAbsenceDiscount && businessDays > 0) {
          const absences = manualAbsences[student.id] || 0;
          absenceDiscountAmount = absences * studentClass.discountPerAbsence;
        }

        const baseAfterAbsence = grossAmount - absenceDiscountAmount;
        if (student.personalDiscount > 0) {
          personalDiscountAmount = baseAfterAbsence * (student.personalDiscount / 100);
        }

        netAmount = grossAmount - absenceDiscountAmount - personalDiscountAmount;
      }
      else {
        // ANTICIPATED_FIXED
        grossAmount = studentClass.basePrice;
        
        if (studentClass.applyAbsenceDiscount && businessDays > 0) {
          const absences = manualAbsences[student.id] || 0;
          absenceDiscountAmount = absences * studentClass.discountPerAbsence;
        }

        const baseAfterAbsence = grossAmount - absenceDiscountAmount;
        if (student.personalDiscount > 0) {
          personalDiscountAmount = baseAfterAbsence * (student.personalDiscount / 100);
        }

        netAmount = grossAmount - absenceDiscountAmount - personalDiscountAmount;
      }

      netAmount = Math.max(0, netAmount);

      // Calculate college share
      const collegeShareAmount = Math.max(0, (netAmount - boletoFee) * (studentClass.collegeSharePercent / 100));

      // Always push to preview so they appear in the UI (e.g. as Pending in Consumption tab)
      const nextMonthDate = new Date();
      nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
      nextMonthDate.setDate(10);

      newInvoices.push({
        id: crypto.randomUUID(),
        studentId: student.id,
        classId: studentClass.id,
        monthYear: monthYear,
        dueDate: format(nextMonthDate, 'yyyy-MM-dd'),
        billingMode: studentClass.billingMode,
        grossAmount,
        absenceDays: manualAbsences[student.id] || 0,
        absenceDiscountAmount,
        personalDiscountAmount,
        netAmount,
        nossoNumero: '',
        filename: student.filenameSuffix || '',
        paymentStatus: 'PENDING',
        collegeSharePercent: studentClass.collegeSharePercent,
        boletoEmissionFee: boletoFee,
        collegeShareAmount,
      });
    });

    setPreviewInvoices(newInvoices);
  };

  const handleSaveInvoices = async () => {
    setShowSaveConfirm(false);
    setIsLoading(true);
    try {
      // Filter out postpaid consumption invoices that have 0 amount, unless we want to generate 0.00 boletos
      const invoicesToSave = previewInvoices.filter(inv => inv.netAmount > 0 || inv.billingMode !== 'POSTPAID_CONSUMPTION');
      await Promise.all(invoicesToSave.map(inv => finance.saveInvoice(inv)));
      alert('Boletos gerados com sucesso!');
    } catch (e) {
      console.error(e);
      alert('Erro ao salvar boletos.');
    } finally {
      setIsLoading(false);
    }
  };

  const totalGross = previewInvoices.reduce((a, i) => a + i.grossAmount, 0);
  const totalNet = previewInvoices.reduce((a, i) => a + i.netAmount, 0);
  const totalCollege = previewInvoices.reduce((a, i) => a + (i.collegeShareAmount || 0), 0);

  return (
    <div className="p-8 pb-24 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:justify-between md:items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-200 gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-brand-blue/10 rounded-2xl flex items-center justify-center text-brand-blue">
            <Calculator size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800">Fechamento Mensal</h1>
            <p className="text-slate-500 font-medium">Cálculo automático de consumo e geração de boletos</p>
          </div>
        </div>
      </motion.div>

      {/* Step 1: Processing Month Selection */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <button onClick={() => toggleStep('step1')} className="w-full flex items-center justify-between p-8 bg-slate-50/50 hover:bg-slate-100/50 transition-colors">
          <div className="flex items-center gap-3">
            <Calendar className="text-brand-orange" size={24} />
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-widest">Passo 1: Referência — {CURRENT_YEAR}</h2>
          </div>
          <div className="text-slate-400">
            {stepStates.step1 ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
          </div>
        </button>

        <AnimatePresence>
          {stepStates.step1 && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="p-8 border-t border-slate-100 space-y-6"
            >
              {getCurrentMonthDays() === 0 && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3">
                  <div className="text-amber-500 mt-0.5">⚠️</div>
                  <div>
                    <h4 className="font-bold text-amber-800">Dias letivos não configurados</h4>
                    <p className="text-sm text-amber-700">O mês selecionado possui 0 dias letivos configurados. Acesse as Configurações para definir.</p>
                  </div>
                </div>
              )}

              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Mês/Ano de Referência — Clique para selecionar</label>
                  <div className="flex flex-wrap gap-2">
                    {MONTHS_FULL.map((m, i) => {
                      const mmStr = String(i + 1).padStart(2, '0');
                      const label = `${mmStr}/${CURRENT_YEAR}`;
                      const isCurrent = i === CURRENT_MONTH_IDX;
                      const isSelected = monthYear === label;
                      return (
                        <button key={i} onClick={() => { setMonthYear(label); setSelectedMonthIdx(i); }}
                          className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide transition-all border ${
                            isSelected
                              ? 'bg-brand-blue text-white border-brand-blue shadow-lg shadow-brand-blue/20'
                              : isCurrent
                              ? 'bg-brand-orange/10 text-brand-orange border-brand-orange/30 hover:bg-brand-orange/20'
                              : 'bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100'
                          }`}>
                          {MONTHS[i]}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="pt-2">
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Dias Letivos neste Mês</label>
                  <div className="w-full bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 font-black text-emerald-700 flex items-center justify-between max-w-sm">
                    <span>{getCurrentMonthDays()} dias</span>
                    <span className="text-xs font-bold opacity-60">{MONTHS_FULL[selectedMonthIdx]} {CURRENT_YEAR}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Step 2: Import */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <button onClick={() => toggleStep('step2')} className="w-full flex items-center justify-between p-8 bg-slate-50/50 hover:bg-slate-100/50 transition-colors">
          <div className="flex items-center gap-3">
            <Upload className="text-brand-blue" size={24} />
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-widest">Passo 2: Importar Relatório de Consumo</h2>
          </div>
          <div className="text-slate-400">
            {stepStates.step2 ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
          </div>
        </button>

        <AnimatePresence>
          {stepStates.step2 && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="p-8 border-t border-slate-100 space-y-6"
            >
              <div className="text-center py-8">
                <button onClick={() => setShowImportModal(true)} disabled={isLoading}
                  className="bg-brand-blue text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-brand-dark transition-all shadow-lg shadow-brand-blue/20 disabled:opacity-50">
                  {isLoading ? 'Carregando...' : 'Importar Consumo'}
                </button>
                <p className="text-slate-400 font-medium text-sm mt-4">Faça o upload do relatório de consumo (.xls ou .xlsx).</p>
                
                {dbConsumption.length > 0 && (
                  <div className="mt-6 flex items-center justify-center gap-2 text-emerald-600 bg-emerald-50 py-2 px-4 rounded-xl inline-flex font-bold text-sm border border-emerald-100">
                    <CheckCircle2 size={18} />
                    Consumo do mês carregado ({dbConsumption.length} alunos)
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Step 3: Preview */}
      {previewInvoices.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <button onClick={() => toggleStep('step3')} className="w-full flex items-center justify-between p-8 bg-slate-50/50 hover:bg-slate-100/50 transition-colors">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="text-emerald-500" size={24} />
              <h2 className="text-lg font-black text-slate-800 uppercase tracking-widest">Passo 3: Revisão de Boletos</h2>
            </div>
            <div className="text-slate-400">
              {stepStates.step3 ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
            </div>
          </button>

          <AnimatePresence>
            {stepStates.step3 && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="p-8 border-t border-slate-100 space-y-6"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-2 bg-slate-100/50 p-1 rounded-xl">
                    <button
                      onClick={() => setActiveTab('fixed')}
                      className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-all ${
                        activeTab === 'fixed' 
                          ? 'bg-white text-slate-800 shadow-sm' 
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Mensalidade Fixa
                    </button>
                    <button
                      onClick={() => setActiveTab('consumption')}
                      className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-all ${
                        activeTab === 'consumption' 
                          ? 'bg-white text-slate-800 shadow-sm' 
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Consumo
                    </button>
                  </div>

                  <div className="flex-1 max-w-sm relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      placeholder="Filtrar por aluno..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/20 font-medium text-sm"
                    />
                  </div>

                  <button onClick={() => setShowSaveConfirm(true)} disabled={isLoading}
                    className="flex items-center justify-center gap-2 bg-emerald-50 text-emerald-600 border border-emerald-200 px-6 py-3 rounded-xl font-black hover:bg-emerald-100 transition-colors">
                    <Save size={20} />
                    Gerar {previewInvoices.length} Boletos
                  </button>
                </div>

                {/* Summary cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-slate-50 rounded-2xl p-4">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Bruto</p>
                    <p className="text-xl font-black text-slate-700">R$ {totalGross.toFixed(2)}</p>
                  </div>
                  <div className="bg-emerald-50 rounded-2xl p-4">
                    <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Total Líquido</p>
                    <p className="text-xl font-black text-emerald-700">R$ {totalNet.toFixed(2)}</p>
                  </div>
                  <div className="bg-sky-50 rounded-2xl p-4">
                    <p className="text-[9px] font-black text-sky-600 uppercase tracking-widest mb-1">Repasse Colégio</p>
                    <p className="text-xl font-black text-sky-700">R$ {totalCollege.toFixed(2)}</p>
                  </div>
                </div>

                <div className="overflow-x-auto mt-6">
                  {activeTab === 'fixed' ? (
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <th className="pb-3 pr-4">Aluno / Turma</th>
                          <th className="pb-3 pr-4 text-right">Base (R$)</th>
                          <th className="pb-3 pr-4 text-center">Faltas</th>
                          <th className="pb-3 pr-4 text-right">Desc. Faltas</th>
                          <th className="pb-3 pr-4 text-right">Desc. Pessoal</th>
                          <th className="pb-3 text-right">Líquido Final</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {previewInvoices
                          .filter(inv => inv.billingMode !== 'POSTPAID_CONSUMPTION')
                          .filter(inv => {
                            if (!studentSearch) return true;
                            const s = students.find(x => x.id === inv.studentId);
                            return s?.name?.toLowerCase().includes(studentSearch.toLowerCase()) ?? false;
                          })
                          .map((inv) => {
                          const s = students.find(x => x.id === inv.studentId);
                          const cls = classes.find(x => x.id === inv.classId);
                          
                          return (
                            <tr key={inv.studentId} className="hover:bg-slate-50 group">
                              <td className="py-4 pr-4">
                                <p className="font-bold text-slate-800 text-sm">{s?.name || 'Desconhecido'}</p>
                                <p className="text-xs text-slate-500">{cls?.name || '—'}</p>
                              </td>
                              <td className="py-4 pr-4 text-right text-sm text-slate-500">R$ {inv.grossAmount.toFixed(2)}</td>
                              <td className="py-4 pr-4 text-center">
                                {cls?.applyAbsenceDiscount ? (
                                  <input
                                    type="number"
                                    min="0"
                                    max={getCurrentMonthDays()}
                                    value={manualAbsences[inv.studentId] || ''}
                                    onChange={(e) => setManualAbsences(prev => ({
                                      ...prev,
                                      [inv.studentId]: parseInt(e.target.value) || 0
                                    }))}
                                    placeholder="0"
                                    className="w-16 px-2 py-1.5 text-center text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
                                  />
                                ) : (
                                  <span className="text-xs text-slate-400 font-medium bg-slate-100 px-2 py-1 rounded-md">N/A</span>
                                )}
                              </td>
                              <td className="py-4 pr-4 text-right text-sm text-red-500 font-medium">
                                {inv.absenceDiscountAmount > 0 ? `- R$ ${inv.absenceDiscountAmount.toFixed(2)}` : '—'}
                              </td>
                              <td className="py-4 pr-4 text-right text-sm text-emerald-500 font-medium">
                                {inv.personalDiscountAmount > 0 ? `- R$ ${inv.personalDiscountAmount.toFixed(2)}` : '—'}
                              </td>
                              <td className="py-4 text-right font-black text-brand-blue text-sm">R$ {inv.netAmount.toFixed(2)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <button onClick={() => setConsumptionFilter('all')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${consumptionFilter === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Todos</button>
                        <button onClick={() => setConsumptionFilter('imported')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${consumptionFilter === 'imported' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-emerald-50'}`}>Importados</button>
                        <button onClick={() => setConsumptionFilter('pending')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${consumptionFilter === 'pending' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-amber-50'}`}>Pendentes</button>
                      </div>

                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <th className="pb-3 pr-4">Aluno / Turma</th>
                            <th className="pb-3 pr-4">Status</th>
                            <th className="pb-3 pr-4">Itens Consumidos (Resumo)</th>
                            <th className="pb-3 text-right">Líquido Final</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {previewInvoices
                            .filter(inv => inv.billingMode === 'POSTPAID_CONSUMPTION')
                            .filter(inv => {
                              const hasConsumption = dbConsumption.some(d => d.studentId === inv.studentId);
                              const studentName = students.find(x => x.id === inv.studentId)?.name;
                              const matchesSearch = !studentSearch || (studentName?.toLowerCase().includes(studentSearch.toLowerCase()) ?? false);
                              
                              if (consumptionFilter === 'imported') return hasConsumption && matchesSearch;
                              if (consumptionFilter === 'pending') return !hasConsumption && matchesSearch;
                              return matchesSearch;
                            })
                            .map((inv) => {
                            const s = students.find(x => x.id === inv.studentId);
                            const cls = classes.find(x => x.id === inv.classId);
                            const consumption = dbConsumption.find(d => d.studentId === inv.studentId);
                            
                            return (
                              <tr key={inv.studentId} className="hover:bg-slate-50 group">
                                <td className="py-4 pr-4">
                                  <p className="font-bold text-slate-800 text-sm">{s?.name || 'Desconhecido'}</p>
                                  <p className="text-xs text-slate-500">{cls?.name || '—'}</p>
                                </td>
                                <td className="py-4 pr-4">
                                  {consumption ? (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700">
                                      <CheckCircle2 size={12} /> Importado
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-700">
                                      Pendente
                                    </span>
                                  )}
                                </td>
                                <td className="py-4 pr-4">
                                  {consumption && consumption.summary && Object.keys(consumption.summary).length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                      {Object.entries(consumption.summary).map(([item, qty]) => (
                                        <span key={item} className="text-xs font-medium text-slate-600 bg-white border border-slate-200 px-2 py-1 rounded-md shadow-sm">
                                          {qty}x <span className="font-bold text-slate-800">{item}</span>
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-xs text-slate-400 italic">Nenhum consumo registrado</span>
                                  )}
                                </td>
                                <td className="py-4 text-right font-black text-brand-blue text-sm">R$ {inv.netAmount.toFixed(2)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
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
        message={`Deseja gerar e salvar ${previewInvoices.length} boletos para ${monthYear}?\n\nTotal Líquido: R$ ${totalNet.toFixed(2)}`}
        confirmLabel="Gerar Boletos"
        variant="info"
        onConfirm={handleSaveInvoices}
        onCancel={() => setShowSaveConfirm(false)}
      />

      <ImportConsumptionModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        students={students}
        classes={classes}
        monthYear={monthYear}
        onSuccess={() => loadConsumption(monthYear)}
      />
    </div>
  );
}
