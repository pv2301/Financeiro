import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Calculator, Upload, CheckCircle2, AlertCircle, Save, Settings } from 'lucide-react';
import { Student, ClassInfo, Snack, Invoice } from '../types';
import { finance } from '../services/finance';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

interface ParsedConsumption {
  studentName: string;
  className: string;
  daysConsumed: number;
  items: {
    [snackName: string]: number;
  };
}

export default function MonthlyProcessing() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [snacks, setSnacks] = useState<Snack[]>([]);
  
  const [monthYear, setMonthYear] = useState(format(new Date(), 'MM/yyyy'));
  const [businessDays, setBusinessDays] = useState(20);
  const [isLoading, setIsLoading] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedConsumption[]>([]);
  const [previewInvoices, setPreviewInvoices] = useState<Invoice[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      const [s, c, sn] = await Promise.all([
        finance.getStudents(),
        finance.getClasses(),
        finance.getSnacks()
      ]);
      setStudents(s);
      setClasses(c);
      setSnacks(sn);
    }
    load();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });

      // Identify header row index
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

      const headers = json[headerRowIndex]; // e.g. ["Aluno (Turma)", "Data", "Lanche da Manhã", "ALMOÇO - CFC BABY", "Lanche da Tarde", "Total"]
      
      const consumptionMap: Record<string, ParsedConsumption> = {};

      for (let i = headerRowIndex + 1; i < json.length; i++) {
        const row = json[i];
        if (!row || row.length < 2) continue;
        
        const rawName = String(row[0]);
        if (rawName.startsWith('Total ') || rawName === 'undefined' || !rawName) continue;

        // "NOME DO ALUNO (NOME DA TURMA)"
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

        // Parse items (from column index 2 to end - 1, ignoring the last "Total" column)
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

    // Para cada aluno no banco, tentamos achar o consumo correspondente.
    // Mesmo alunos sem consumo (0 faltas? ou 100% faltas?) devem gerar boleto se a turma for de mensalidade fixa.
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
      
      // Calculate based on billing mode
      if (studentClass.billingMode === 'POSTPAID_CONSUMPTION') {
        // Cobra exatamente os itens consumidos multiplicados pelos preços da tabela
        if (consumption && consumption.items) {
          Object.entries(consumption.items).forEach(([snackName, qty]) => {
            const snackObj = snacks.find(s => s.name.toLowerCase() === snackName.toLowerCase());
            const price = snackObj ? snackObj.unitPrice : 0;
            grossAmount += (price * qty);
          });
        }
        netAmount = grossAmount;
      } 
      else {
        // ANTICIPATED_FIXED or ANTICIPATED_DAYS
        grossAmount = studentClass.basePrice;
        
        // Desconto por Falta
        if (studentClass.applyAbsenceDiscount) {
          const absences = Math.max(0, businessDays - daysConsumed);
          // O valor de desconto por falta pode vir da tabela de lanches (lanche padrão?) ou um campo na turma.
          // Para simplificar, vamos assumir que o "basePrice" / "businessDays" é a diária, se não houver um valor fixo estipulado.
          const dailyRate = grossAmount / businessDays; 
          absenceDiscountAmount = absences * dailyRate;
        }

        // Desconto Pessoal
        const baseAfterAbsence = grossAmount - absenceDiscountAmount;
        if (student.personalDiscount > 0) {
          personalDiscountAmount = baseAfterAbsence * (student.personalDiscount / 100);
        }

        netAmount = grossAmount - absenceDiscountAmount - personalDiscountAmount;
      }

      // Evita valores negativos
      netAmount = Math.max(0, netAmount);

      // Só gera boleto se tiver algo a cobrar, ou se for turma fixa
      if (netAmount > 0 || studentClass.billingMode !== 'POSTPAID_CONSUMPTION') {
        const nextMonthDate = new Date();
        nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
        nextMonthDate.setDate(10); // Vencimento dia 10 padrão

        newInvoices.push({
          id: crypto.randomUUID(),
          studentId: student.id,
          monthYear: monthYear,
          grossAmount,
          absenceDays: Math.max(0, businessDays - daysConsumed),
          absenceDiscountAmount,
          personalDiscountAmount,
          netAmount,
          dueDate: format(nextMonthDate, 'yyyy-MM-dd'),
          paymentStatus: 'PENDING',
          ticketNumber: '' // Será preenchido na emissão do ERP se houver
        });
      }
    });

    setPreviewInvoices(newInvoices);
  };

  const handleSaveInvoices = async () => {
    if (!confirm(`Deseja gerar e salvar ${previewInvoices.length} boletos para o mês de ${monthYear}?`)) return;

    setIsLoading(true);
    try {
      const promises = previewInvoices.map(inv => finance.saveInvoice(inv));
      await Promise.all(promises);
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

  return (
    <div className="p-8 pb-24 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:justify-between md:items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-200 gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600">
            <Calculator size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800">Processamento Mensal</h1>
            <p className="text-slate-500 font-medium">Cálculo automático de consumo e faltas</p>
          </div>
        </div>
      </motion.div>

      {/* Configurações Iniciais */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <Settings className="text-brand-orange" size={24} />
          <h2 className="text-lg font-black text-slate-800 uppercase tracking-widest">Passo 1: Configurar Parâmetros</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Mês/Ano de Referência</label>
            <input 
              type="text" 
              value={monthYear}
              onChange={(e) => setMonthYear(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-brand-blue/20 outline-none"
              placeholder="MM/AAAA"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Total de Dias Úteis (Aulas no mês)</label>
            <input 
              type="number" 
              value={businessDays}
              onChange={(e) => setBusinessDays(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-brand-blue/20 outline-none"
            />
          </div>
        </div>
      </motion.div>

      {/* Importação */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <Upload className="text-brand-blue" size={24} />
          <h2 className="text-lg font-black text-slate-800 uppercase tracking-widest">Passo 2: Importar Relatório da Catraca</h2>
        </div>

        <div className="text-center py-8">
          <input 
            type="file" 
            accept=".xls, .xlsx" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="bg-brand-blue text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-brand-dark transition-all shadow-lg shadow-brand-blue/20 disabled:opacity-50"
          >
            {isLoading ? 'Processando...' : 'Selecionar Arquivo Excel'}
          </button>
          <p className="text-slate-400 font-medium text-sm mt-4">Faça o upload do "Relatório Cardápios Consumidos.xls" extraído do sistema da catraca.</p>
        </div>
      </motion.div>

      {/* Preview */}
      {previewInvoices.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="text-emerald-500" size={24} />
              <h2 className="text-lg font-black text-slate-800 uppercase tracking-widest">Passo 3: Revisão de Boletos</h2>
            </div>
            <button 
              onClick={handleSaveInvoices}
              disabled={isLoading}
              className="flex items-center gap-2 bg-emerald-50 text-emerald-600 border border-emerald-200 px-6 py-3 rounded-xl font-black hover:bg-emerald-100 transition-colors"
            >
              <Save size={20} />
              Salvar e Gerar {previewInvoices.length} Boletos
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-black text-slate-400 uppercase tracking-widest">
                  <th className="pb-3 pr-4">Aluno</th>
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
                  return (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-3 pr-4 font-bold text-slate-800">{s?.name || 'Desconhecido'}</td>
                      <td className="py-3 pr-4 text-slate-500">R$ {inv.grossAmount.toFixed(2)}</td>
                      <td className="py-3 pr-4">
                        <span className="bg-slate-100 text-slate-600 font-bold px-2 py-1 rounded">
                          {inv.absenceDays} d
                        </span>
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
    </div>
  );
}
