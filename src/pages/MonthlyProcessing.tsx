import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Calculator, Upload, CheckCircle2, Save, Settings, Calendar, Info } from 'lucide-react';
import { Student, ClassInfo, ServiceItem, Invoice, BillingMode } from '../types';
import { finance } from '../services/finance';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import ConfirmDialog from '../components/ConfirmDialog';

interface ParsedConsumption {
  studentName: string;
  className: string;
  daysConsumed: number;
  items: Record<string, number>;
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
  const [parsedData, setParsedData] = useState<ParsedConsumption[]>([]);
  const [previewInvoices, setPreviewInvoices] = useState<Invoice[]>([]);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });

      let headerRowIndex = -1;
      for (let i = 0; i < Math.min(20, json.length); i++) {
        const row = json[i];
        if (row && row.length > 0 && String(row[0]).includes('Aluno (Turma)')) {
          headerRowIndex = i;
          break;
        }
      }

      if (headerRowIndex === -1) {
        throw new Error('Formato inválido. Coluna "Aluno (Turma)" não encontrada.');
      }

      const headers = json[headerRowIndex];
      const consumptionMap: Record<string, ParsedConsumption> = {};

      for (let i = headerRowIndex + 1; i < json.length; i++) {
        const row = json[i];
        if (!row || row.length < 2) continue;
        
        const rawName = String(row[0]);
        if (rawName.startsWith('Total ') || rawName === 'undefined' || !rawName) continue;

        const match = rawName.match(/^(.*?)\s*\((.*?)\)$/);
        let studentName = rawName.trim();
        let className = '';
        if (match) {
          studentName = match[1].trim();
          className = match[2].trim();
        }

        const dateStr = String(row[1]);
        if (!dateStr || dateStr === 'undefined' || dateStr.trim() === '') continue;

        const mapKey = `${studentName}-${className}`;
        if (!consumptionMap[mapKey]) {
          consumptionMap[mapKey] = { studentName, className, daysConsumed: 0, items: {} };
        }

        consumptionMap[mapKey].daysConsumed += 1;

        for (let col = 2; col < headers.length - 1; col++) {
          const snackName = String(headers[col]).trim();
          const quantity = Number(row[col]) || 0;
          if (quantity > 0) {
            consumptionMap[mapKey].items[snackName] = (consumptionMap[mapKey].items[snackName] || 0) + quantity;
          }
        }
      }

      setParsedData(Object.values(consumptionMap));
      generatePreview(Object.values(consumptionMap));
      
    } catch (error: any) {
      alert(`Erro ao processar arquivo: ${error.message}`);
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const generatePreview = (data: ParsedConsumption[]) => {
    const newInvoices: Invoice[] = [];
    const businessDays = getCurrentMonthDays();

    students.forEach(student => {
      const studentClass = classes.find(c => c.id === student.classId);
      if (!studentClass) return;

      const consumption = data.find(d => 
        d.studentName.toLowerCase() === student.name.toLowerCase()
      );

      const daysConsumed = consumption?.daysConsumed || 0;
      
      let grossAmount = 0;
      let absenceDiscountAmount = 0;
      let personalDiscountAmount = 0;
      let netAmount = 0;
      
      if (studentClass.billingMode === 'POSTPAID_CONSUMPTION') {
        // Sum consumed items × prices from service table
        if (consumption && consumption.items) {
          Object.entries(consumption.items).forEach(([snackName, qty]) => {
            // Find service price by matching name and segment
            const svc = services.find(s => s.name.toLowerCase() === snackName.toLowerCase());
            if (svc) {
              // Build price key from segment + ageRange
              const ageRange = studentClass.ageRange;
              const priceKey = ageRange ? `${studentClass.segment}|${ageRange}` : studentClass.segment;
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
          const absences = Math.max(0, businessDays - daysConsumed);
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
          const absences = Math.max(0, businessDays - daysConsumed);
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

      if (netAmount > 0 || studentClass.billingMode !== 'POSTPAID_CONSUMPTION') {
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
          absenceDays: Math.max(0, businessDays - daysConsumed),
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
      }
    });

    setPreviewInvoices(newInvoices);
  };

  const handleSaveInvoices = async () => {
    setShowSaveConfirm(false);
    setIsLoading(true);
    try {
      await Promise.all(previewInvoices.map(inv => finance.saveInvoice(inv)));
      // Also persist scholastic days
      await saveScholasticDays();
      alert('Boletos gerados com sucesso!');
      setPreviewInvoices([]);
      setParsedData([]);
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
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <Calendar className="text-brand-orange" size={24} />
          <h2 className="text-lg font-black text-slate-800 uppercase tracking-widest">Passo 1: Referência — {CURRENT_YEAR}</h2>
        </div>

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

      {/* Step 2: Import */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <Upload className="text-brand-blue" size={24} />
          <h2 className="text-lg font-black text-slate-800 uppercase tracking-widest">Passo 2: Importar Relatório de Consumo</h2>
        </div>

        <div className="text-center py-8">
          <input type="file" accept=".xls, .xlsx" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} disabled={isLoading}
            className="bg-brand-blue text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-brand-dark transition-all shadow-lg shadow-brand-blue/20 disabled:opacity-50">
            {isLoading ? 'Processando...' : 'Selecionar Arquivo Excel'}
          </button>
          <p className="text-slate-400 font-medium text-sm mt-4">Faça o upload do relatório de consumo (.xls ou .xlsx) extraído do sistema.</p>
        </div>
      </motion.div>

      {/* Step 3: Preview */}
      {previewInvoices.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="text-emerald-500" size={24} />
              <h2 className="text-lg font-black text-slate-800 uppercase tracking-widest">Passo 3: Revisão de Boletos</h2>
            </div>
            <button onClick={() => setShowSaveConfirm(true)} disabled={isLoading}
              className="flex items-center gap-2 bg-emerald-50 text-emerald-600 border border-emerald-200 px-6 py-3 rounded-xl font-black hover:bg-emerald-100 transition-colors">
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

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-black text-slate-400 uppercase tracking-widest">
                  <th className="pb-3 pr-4">Aluno</th>
                  <th className="pb-3 pr-4">Turma</th>
                  <th className="pb-3 pr-4">Modelo</th>
                  <th className="pb-3 pr-4">Base (R$)</th>
                  <th className="pb-3 pr-4">Faltas</th>
                  <th className="pb-3 pr-4">Desc. Faltas</th>
                  <th className="pb-3 pr-4">Desc. Pessoal</th>
                  <th className="pb-3">Líquido Final</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {previewInvoices.map((inv, idx) => {
                  const s = students.find(x => x.id === inv.studentId);
                  const cls = classes.find(x => x.id === inv.classId);
                  const modeLabel = inv.billingMode === 'POSTPAID_CONSUMPTION' ? 'Pós' : inv.billingMode === 'ANTICIPATED_DAYS' ? 'Dias' : 'Fixo';
                  return (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-3 pr-4 font-bold text-slate-800">{s?.name || 'Desconhecido'}</td>
                      <td className="py-3 pr-4 text-sm text-slate-500">{cls?.name || '—'}</td>
                      <td className="py-3 pr-4">
                        <span className={`text-[10px] font-black uppercase px-2 py-1 rounded ${
                          inv.billingMode === 'POSTPAID_CONSUMPTION' ? 'bg-amber-100 text-amber-700' :
                          inv.billingMode === 'ANTICIPATED_DAYS' ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-700'
                        }`}>{modeLabel}</span>
                      </td>
                      <td className="py-3 pr-4 text-slate-500">R$ {inv.grossAmount.toFixed(2)}</td>
                      <td className="py-3 pr-4">
                        <span className="bg-slate-100 text-slate-600 font-bold px-2 py-1 rounded">{inv.absenceDays} d</span>
                      </td>
                      <td className="py-3 pr-4 text-red-500 font-medium">- R$ {inv.absenceDiscountAmount.toFixed(2)}</td>
                      <td className="py-3 pr-4 text-emerald-500 font-medium">- R$ {inv.personalDiscountAmount.toFixed(2)}</td>
                      <td className="py-3 font-black text-brand-blue">R$ {inv.netAmount.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
    </div>
  );
}
