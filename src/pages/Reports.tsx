import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Download, Users, Search, DollarSign, Wallet,
  AlertCircle, Zap, ShieldCheck, LayoutDashboard, List as ListIcon,
  GraduationCap, Layers, ChevronDown, ArrowUpRight, Percent, Receipt,
  Calendar, Table as TableIcon, TrendingUp
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import { Invoice, ClassInfo, Student, SystemStats } from '../types';
import { finance } from '../services/finance';
import { formatCurrencyBRL, cn } from '../lib/utils';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type ViewMode = 'dashboard' | 'turmas' | 'dados' | 'anual';

const SEGMENT_COLORS: Record<string, string> = {
  'Berçário': '#3B82F6',
  'Educação Infantil': '#10B981',
  'Ensino Fundamental I': '#F59E0B',
  'Ensino Fundamental II': '#8B5CF6',
  'Outros': '#94A3B8',
};

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

export default function ReportsTest() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [sysStats, setSysStats] = useState<SystemStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [period, setPeriod] = useState('2026');
  const [selectedClass, setSelectedClass] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [showExportModal, setShowExportModal] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // High performance path: Load stats doc first
        const statsDoc = await finance.getStats();
        setSysStats(statsDoc);

        const [inv, cls, stu] = await Promise.all([
          finance.getInvoices(), finance.getClasses(), finance.getStudents()
        ]);
        setInvoices(inv || []); setClasses(cls || []); setStudents(stu || []);
      } catch (e) { console.error(e); }
      finally { setIsLoading(false); }
    };
    loadData();
  }, []);

  const filteredData = useMemo(() => {
    return invoices.filter(inv => {
      const year = inv.monthYear?.split(/[\/-]/)?.[1] || inv.monthYear?.split(/[\/-]/)?.[0] || '';
      const matchesPeriod = inv.monthYear?.includes(period);
      const matchesClass = selectedClass === 'ALL' || inv.classId === selectedClass;
      const student = students.find(s => s.id === inv.studentId);
      const matchesSearch = !searchTerm || student?.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesPeriod && matchesClass && matchesSearch;
    });
  }, [invoices, period, selectedClass, searchTerm, students]);

  const stats = useMemo(() => {
    const isGlobal = selectedClass === 'ALL' && !searchTerm && period === new Date().getFullYear().toString();
    
    if (isGlobal && sysStats) {
      const monthlySummary = sysStats.monthlySummary || {};
      const faturadoGlobal = Object.values(monthlySummary).reduce((a: any, b: any) => a + (b.faturado || 0), 0);
      const recebidoGlobal = Object.values(monthlySummary).reduce((a: any, b: any) => a + (b.recebido || 0), 0);
      return {
        totalFaturado: faturadoGlobal,
        totalRecebido: recebidoGlobal,
        totalPendente: sysStats.unpaidAmount || 0,
        totalVencido: (sysStats.topDevedores || []).reduce((a, b) => a + (b.amount || 0), 0),
        repasseColegio: 0, 
        taxasBancarias: 0, 
        margemCanteen: 0, 
        inadimplencia: (faturadoGlobal > 0) ? ((sysStats.unpaidAmount || 0) / faturadoGlobal) * 100 : 0,
        descontoPessoal: 0,
        descontoFaltas: 0,
        totalBruto: 0,
        ticketMedio: (sysStats.totalInvoices || 0) > 0 ? faturadoGlobal / sysStats.totalInvoices : 0,
        topDevedores: (sysStats.topDevedores || []).map(d => ({ 
          student: students.find(s => s.id === d.studentId), 
          amount: d.amount 
        })).filter(x => x.student),
        paidCount: (sysStats.totalInvoices || 0) - (sysStats.totalUnpaidInvoices || 0),
        pendingCount: sysStats.totalUnpaidInvoices || 0,
        overdueCount: (sysStats.topDevedores || []).length,
      };
    }

    const now = new Date();
    const paid = filteredData.filter(i => i?.paymentStatus === 'PAID');
    const pending = filteredData.filter(i => i?.paymentStatus !== 'PAID');
    const overdue = pending.filter(i => i.dueDate && new Date(i.dueDate) < now);

    const totalFaturado = filteredData.reduce((a, c) => a + (c?.netAmount || 0), 0);
    const totalRecebido = paid.reduce((a, c) => a + (c?.amountCharged || c?.netAmount || 0), 0);
    const totalPendente = pending.reduce((a, c) => a + (c?.netAmount || 0), 0);
    const totalVencido = overdue.reduce((a, c) => a + (c?.netAmount || 0), 0);
    const repasseColegio = paid.reduce((a, inv) => {
      const student = students.find(s => s.id === inv.studentId);
      const isPaidInTime = inv.paymentDate && new Date(inv.paymentDate) <= new Date(inv.dueDate);
      let effectiveValor = inv.netAmount;
      if (isPaidInTime && student?.hasTimelyPaymentDiscount && (student.personalDiscount || 0) > 0) {
        effectiveValor = inv.netAmount - (inv.personalDiscountAmount || 0);
      }
      const valorCobrado = inv.amountCharged ?? inv.netAmount;
      const baseRepasse = Math.min(effectiveValor, valorCobrado);
      const sharePercent = inv.collegeSharePercent ?? 0;
      return a + (baseRepasse * (sharePercent / 100));
    }, 0);
    const taxasBancarias = paid.reduce((a, c) => a + (c?.boletoEmissionFee || 0), 0);
    const margemCanteen = totalRecebido - repasseColegio - taxasBancarias;
    const inadimplencia = totalFaturado > 0 ? (totalPendente / totalFaturado) * 100 : 0;
    const totalBruto = filteredData.reduce((a, c) => a + (c?.grossAmount || 0), 0);
    const descontoPessoal = filteredData.reduce((a, c) => a + (c?.personalDiscountAmount || 0), 0);
    const descontoFaltas = filteredData.reduce((a, c) => a + (c?.absenceDiscountAmount || 0), 0);
    const totalInvoices = filteredData.length;
    const ticketMedio = totalInvoices > 0 ? totalFaturado / totalInvoices : 0;

    const debtMap: Record<string, number> = {};
    overdue.forEach(inv => { debtMap[inv.studentId] = (debtMap[inv.studentId] || 0) + (inv.netAmount || 0); });
    const topDevedores = Object.entries(debtMap)
      .map(([id, amount]) => ({ student: students.find(s => s.id === id), amount }))
      .filter(x => x.student)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);

    return {
      totalFaturado, totalRecebido, totalPendente, totalVencido,
      repasseColegio, taxasBancarias, margemCanteen, inadimplencia,
      descontoPessoal, descontoFaltas, totalBruto,
      ticketMedio, topDevedores,
      paidCount: paid.length, pendingCount: pending.length, overdueCount: overdue.length,
    };
  }, [filteredData, students, sysStats, selectedClass, searchTerm, period]);

  const revenueByMonth = useMemo(() => {
    const isGlobal = selectedClass === 'ALL' && !searchTerm && period === new Date().getFullYear().toString();
    if (isGlobal && sysStats) {
      const monthlySummary = sysStats.monthlySummary || {};
      return MONTHS.map((month, i) => {
        const mNum = (i + 1).toString().padStart(2, '0');
        const data = monthlySummary[mNum] || { faturado: 0, recebido: 0 };
        return {
          name: month,
          Previsto: data.faturado || 0,
          Realizado: data.recebido || 0,
        };
      });
    }

    return MONTHS.map((month, i) => {
      const mNum = (i + 1).toString().padStart(2, '0');
      const mInv = invoices.filter(inv => {
        if (!inv.monthYear?.includes(period)) return false;
        const parts = inv.monthYear.split(/[\/-]/);
        return parts[0] === mNum || parts[0]?.toLowerCase() === month.toLowerCase();
      });
      return {
        name: month,
        Previsto: mInv.reduce((a, c) => a + (c?.netAmount || 0), 0),
        Realizado: mInv.filter(i => i.paymentStatus === 'PAID').reduce((a, c) => a + (c?.amountCharged || c?.netAmount || 0), 0),
      };
    });
  }, [invoices, period, sysStats, selectedClass, searchTerm]);

  const bySegment = useMemo(() => {
    const isGlobal = selectedClass === 'ALL' && !searchTerm && period === new Date().getFullYear().toString();
    if (isGlobal && sysStats) {
      const segmentSummary = sysStats.segmentSummary || {};
      return Object.entries(segmentSummary).map(([name, v]: [string, any]) => ({ name, ...v })).sort((a, b) => (b.recebido || 0) - (a.recebido || 0));
    }

    const map: Record<string, { faturado: number; recebido: number }> = {};
    filteredData.forEach(inv => {
      const cls = classes.find(c => c.id === inv.classId);
      const seg = cls?.segment || 'Outros';
      if (!map[seg]) map[seg] = { faturado: 0, recebido: 0 };
      map[seg].faturado += inv.netAmount || 0;
      if (inv.paymentStatus === 'PAID') map[seg].recebido += inv.amountCharged || inv.netAmount || 0;
    });
    return Object.entries(map).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.recebido - a.recebido);
  }, [filteredData, classes, sysStats, selectedClass, searchTerm, period]);

  const byClass = useMemo(() => {
    return classes.map(cls => {
      const ci = filteredData.filter(i => i.classId === cls.id);
      const faturado = ci.reduce((a, c) => a + (c?.netAmount || 0), 0);
      const recebido = ci.filter(i => i.paymentStatus === 'PAID').reduce((a, c) => a + (c?.amountCharged || c?.netAmount || 0), 0);
      const pendente = ci.filter(i => i.paymentStatus !== 'PAID').reduce((a, c) => a + (c?.netAmount || 0), 0);
      const taxa = faturado > 0 ? (recebido / faturado) * 100 : 0;
      const alunos = new Set(ci.map(i => i.studentId)).size;
      return { cls, faturado, recebido, pendente, taxa, alunos };
    }).filter(x => x.faturado > 0).sort((a, b) => b.recebido - a.recebido);
  }, [classes, filteredData]);

  // --- Annual Report Specific Logic ---
  const annualData = useMemo(() => {
    const isGlobal = selectedClass === 'ALL' && !searchTerm && period === new Date().getFullYear().toString();
    
    const yearSummary = MONTH_NAMES.map((name, index) => {
      if (isGlobal && sysStats) {
        const mNum = (index + 1).toString().padStart(2, '0');
        const data = sysStats.monthlySummary[mNum] || { faturado: 0, recebido: 0 };
        return { name, index, cobranca: 0, boletos: data.recebido, total: data.recebido };
      }

      const monthInvoices = invoices.filter(inv => {
        if (!inv.monthYear?.includes(period)) return false;
        const mNum = (index + 1).toString().padStart(2, '0');
        const invMonth = inv.monthYear.split(/[\/-]/)[0];
        return invMonth === mNum;
      });

      const boletos = monthInvoices
        .filter(i => i.paymentStatus === 'PAID')
        .reduce((sum, i) => sum + (i.amountCharged || i.netAmount || 0), 0);
      
      return { name, index, cobranca: 0, boletos, total: boletos };
    });

    let cumulative = 0;
    const summary = yearSummary.map(m => {
      cumulative += m.total;
      return { ...m, acumulado: cumulative };
    });

    return { summary };
  }, [invoices, period, sysStats, selectedClass, searchTerm]);

  const dailyBreakdown = useMemo(() => {
    const year = parseInt(period);
    const startDate = new Date(year, selectedMonth, 1);
    const endDate = new Date(year, selectedMonth + 1, 0);
    const days: any[] = [];
    let cumulative = 0;

    const monthInvoices = invoices.filter(inv => {
      const mNum = (selectedMonth + 1).toString().padStart(2, '0');
      return inv.monthYear?.startsWith(`${mNum}/${period}`) || inv.monthYear?.startsWith(`${mNum}-${period}`);
    });

    for (let d = 1; d <= endDate.getDate(); d++) {
      const currentDay = new Date(year, selectedMonth, d);
      const paidThisDay = monthInvoices.filter(inv => {
        if (!inv.paymentDate) return false;
        const pDate = new Date(inv.paymentDate);
        return pDate.getDate() === d && pDate.getMonth() === selectedMonth && pDate.getFullYear() === year;
      });

      const totalDia = paidThisDay.reduce((sum, i) => sum + (i.amountCharged || i.netAmount || 0), 0);
      cumulative += totalDia;

      days.push({
        date: currentDay,
        formattedDate: format(currentDay, "eeee, d 'de' MMMM", { locale: ptBR }),
        pagtoBoleto: totalDia,
        totalDia,
        acumulado: cumulative,
        isWeekend: currentDay.getDay() === 0 || currentDay.getDay() === 6
      });
    }
    return days;
  }, [invoices, period, selectedMonth]);

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    // Sheet 1: Resumo financeiro
    const resumo = [
      { Métrica: 'Total Faturado', Valor: stats.totalFaturado },
      { Métrica: 'Total Recebido', Valor: stats.totalRecebido },
      { Métrica: 'Total Pendente', Valor: stats.totalPendente },
      { Métrica: 'Repasse Colégio', Valor: stats.repasseColegio },
      { Métrica: 'Margem Canteen', Valor: stats.margemCanteen },
      { Métrica: 'Inadimplência %', Valor: stats.inadimplencia.toFixed(2) + '%' },
      { Métrica: 'Ticket Médio', Valor: stats.ticketMedio },
      { Métrica: 'Descontos Pessoais', Valor: stats.descontoPessoal },
      { Métrica: 'Descontos por Faltas', Valor: stats.descontoFaltas },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumo), 'Resumo');
    // Sheet 2: Por turma
    const turmas = byClass.map(x => ({
      Turma: x.cls.name, Segmento: x.cls.segment,
      Alunos: x.alunos, Faturado: x.faturado, Recebido: x.recebido,
      Pendente: x.pendente, 'Taxa Receb. %': x.taxa.toFixed(1) + '%',
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(turmas), 'Por Turma');
    // Sheet 3: Detalhado
    const rows = filteredData.map(inv => {
      const s = students.find(x => x.id === inv.studentId);
      const c = classes.find(x => x.id === inv.classId);
      return {
        'Mês/Ano': inv.monthYear, 'Aluno': s?.name || '—', 'Turma': c?.name || '—',
        'Bruto': inv.grossAmount, 'Desc. Pessoal': inv.personalDiscountAmount,
        'Desc. Faltas': inv.absenceDiscountAmount, 'Líquido': inv.netAmount,
        'Repasse': inv.collegeShareAmount, 'Status': inv.paymentStatus === 'PAID' ? 'Pago' : 'Pendente',
        'Pago Em': inv.paymentDate || '—', 'Valor Cobrado': inv.amountCharged || '—',
      };
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Detalhado');
    XLSX.writeFile(wb, `Relatorio_${period}.xlsx`);
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-brand-blue/10 border-t-brand-blue rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 pb-32 max-w-[1600px] mx-auto space-y-6 font-sans">

      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between bg-white p-6 rounded-3xl border border-slate-100 shadow-sm gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Relatórios</h1>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Análise financeira · {period}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100">
            {(['dashboard', 'turmas', 'dados', 'anual'] as ViewMode[]).map((v, i) => {
              const labels = ['Painel', 'Turmas', 'Dados', 'Anual'];
              const icons = [LayoutDashboard, Layers, ListIcon, Calendar];
              const Icon = icons[i];
              return (
                <button key={v} onClick={() => setViewMode(v)}
                  className={cn("px-4 py-2 rounded-lg transition-all text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5",
                    viewMode === v ? "bg-slate-900 text-white shadow-md" : "text-slate-400 hover:text-slate-600")}>
                  <Icon size={13} /> {labels[i]}
                </button>
              );
            })}
          </div>
          <select value={period} onChange={e => setPeriod(e.target.value)}
            className="h-10 bg-slate-50 border-transparent rounded-xl px-4 font-black text-[10px] uppercase tracking-widest text-slate-600 focus:bg-white transition-all">
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </select>
          <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
            className="h-10 bg-slate-50 border-transparent rounded-xl px-4 font-black text-[10px] uppercase tracking-widest text-slate-600 focus:bg-white transition-all">
            <option value="ALL">Todas Turmas</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button onClick={exportToExcel}
            className="h-10 bg-brand-blue text-white px-5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-md flex items-center gap-2">
            <Download size={14} /> Excel
          </button>
        </div>
      </header>

      <AnimatePresence mode="wait">

        {/* ─── DASHBOARD VIEW ─── */}
        {viewMode === 'dashboard' && (
          <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">

            {/* KPI Row — 5 cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {[
                { label: 'Faturado', value: formatCurrencyBRL(stats.totalFaturado), icon: Receipt, color: 'text-slate-900', accent: 'bg-slate-900', sub: `${filteredData.length} títulos` },
                { label: 'Recebido', value: formatCurrencyBRL(stats.totalRecebido), icon: Wallet, color: 'text-emerald-600', accent: 'bg-emerald-500', sub: `${stats.paidCount} pagos` },
                { label: 'Em Aberto', value: formatCurrencyBRL(stats.totalPendente), icon: AlertCircle, color: 'text-amber-600', accent: 'bg-amber-400', sub: `${stats.pendingCount} títulos` },
                { label: 'Vencido', value: formatCurrencyBRL(stats.totalVencido), icon: TrendingUp, color: 'text-rose-600', accent: 'bg-rose-500', sub: `${stats.overdueCount} atrasados` },
                { label: 'Margem Canteen', value: formatCurrencyBRL(stats.margemCanteen), icon: Zap, color: 'text-brand-blue', accent: 'bg-brand-blue', sub: 'após repasse' },
              ].map((kpi, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                  className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                  <div className={cn("absolute top-0 left-0 w-1 h-full opacity-20", kpi.accent)} />
                  <div className="flex items-center justify-between mb-3">
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", kpi.accent + '/10')}>
                      <kpi.icon size={15} className={kpi.color} />
                    </div>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{kpi.sub}</span>
                  </div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{kpi.label}</p>
                  <p className={cn("text-xl font-black tracking-tight leading-none", kpi.color)}>{kpi.value}</p>
                </motion.div>
              ))}
            </div>

            {/* KPI secondary row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Inadimplência', value: `${stats.inadimplencia.toFixed(1)}%`, color: stats.inadimplencia > 20 ? 'text-rose-600' : 'text-amber-600' },
                { label: 'Repasse Colégio', value: formatCurrencyBRL(stats.repasseColegio), color: 'text-slate-600' },
                { label: 'Ticket Médio / Boleto', value: formatCurrencyBRL(stats.ticketMedio), color: 'text-brand-blue' },
                { label: 'Total de Descontos', value: formatCurrencyBRL(stats.descontoPessoal + stats.descontoFaltas), color: 'text-indigo-600' },
              ].map((item, i) => (
                <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.label}</p>
                  <p className={cn("text-base font-black tabular-nums", item.color)}>{item.value}</p>
                </div>
              ))}
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Area chart — Previsto vs Realizado */}
              <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">Fluxo Mensal {period}</h3>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Previsto vs Realizado</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-brand-blue/30" /><span className="text-[8px] font-black text-slate-400 uppercase">Previsto</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-500" /><span className="text-[8px] font-black text-slate-400 uppercase">Realizado</span></div>
                  </div>
                </div>
                <div className="h-[240px] w-full min-w-0">
                  {isReady && (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={Array.isArray(revenueByMonth) ? revenueByMonth : []} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gPrev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.12}/>
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="gReal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.12}/>
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#94A3B8' }} dy={8} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#94A3B8' }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                      <RechartsTooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.15)', fontSize: 10, fontWeight: 900 }} formatter={(v: number) => [formatCurrencyBRL(v), '']} />
                      <Area type="monotone" dataKey="Previsto" stroke="#3B82F6" strokeWidth={2} strokeDasharray="4 3" fillOpacity={1} fill="url(#gPrev)" />
                      <Area type="monotone" dataKey="Realizado" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#gReal)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
                </div>
              </div>

              {/* Pie chart — por segmento */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col">
                <div className="mb-4">
                  <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">Por Segmento</h3>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Receita recebida</p>
                </div>
                <div className="h-[180px] w-full min-w-0">
                  {isReady && (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={Array.isArray(bySegment) ? bySegment : []} dataKey="recebido" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                        {bySegment.map((entry, i) => (
                          <Cell key={i} fill={SEGMENT_COLORS[entry.name] || '#94A3B8'} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(v: number) => [formatCurrencyBRL(v), '']} contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.15)', fontSize: 10, fontWeight: 900 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
                </div>
                <div className="space-y-2 mt-2">
                  {bySegment.map((seg, i) => (
                    <div key={i} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: SEGMENT_COLORS[seg.name] || '#94A3B8' }} />
                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest truncate">{seg.name}</span>
                      </div>
                      <span className="text-[9px] font-black text-slate-900 tabular-nums shrink-0">{formatCurrencyBRL(seg.recebido)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom row: top devedores + análise de descontos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Top devedores */}
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">Maiores Inadimplentes</h3>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Títulos vencidos e não pagos</p>
                  </div>
                  <div className="w-8 h-8 bg-rose-50 rounded-xl flex items-center justify-center">
                    <AlertCircle size={16} className="text-rose-500" />
                  </div>
                </div>
                {stats.topDevedores.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nenhuma inadimplência no período</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {stats.topDevedores.map((d, i) => (
                      <div key={i} className="p-4 px-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-rose-50 rounded-xl flex items-center justify-center font-black text-rose-400 text-xs">
                            {d.student?.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{d.student?.name}</p>
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{classes.find(c => c.id === d.student?.classId)?.name || '—'}</p>
                          </div>
                        </div>
                        <span className="text-sm font-black text-rose-600 tabular-nums">{formatCurrencyBRL(d.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Análise de descontos */}
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">Análise de Descontos</h3>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Impacto sobre receita bruta</p>
                  </div>
                  <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center">
                    <Percent size={16} className="text-indigo-500" />
                  </div>
                </div>
                <div className="p-6 space-y-5">
                  {[
                    { label: 'Desconto Pessoal / Acordos', value: stats.descontoPessoal, color: 'bg-indigo-500' },
                    { label: 'Desconto por Faltas', value: stats.descontoFaltas, color: 'bg-amber-400' },
                  ].map((item, i) => {
                    const pct = stats.totalBruto > 0 ? (item.value / stats.totalBruto) * 100 : 0;
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{item.label}</span>
                          <div className="text-right">
                            <span className="text-sm font-black text-slate-900 tabular-nums">{formatCurrencyBRL(item.value)}</span>
                            <span className="text-[8px] font-black text-slate-400 ml-2">{pct.toFixed(1)}% do bruto</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={cn("h-full rounded-full transition-all", item.color)} style={{ width: `${Math.min(100, pct * 3)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                  <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total descontado</span>
                    <span className="text-base font-black text-indigo-600">{formatCurrencyBRL(stats.descontoPessoal + stats.descontoFaltas)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Receita bruta original</span>
                    <span className="text-base font-black text-slate-900">{formatCurrencyBRL(stats.totalBruto)}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ─── TURMAS VIEW ─── */}
        {viewMode === 'turmas' && (
          <motion.div key="turmas" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
            {/* Bar chart — receita por turma */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <h3 className="text-base font-black text-slate-900 uppercase tracking-tight mb-1">Receita por Turma</h3>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-6">Faturado vs Recebido</p>
              <div style={{ height: Math.max(240, byClass.length * 44) }}>
                {isReady && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={Array.isArray(byClass) ? byClass.map(x => ({ name: x.cls.name, Faturado: x.faturado, Recebido: x.recebido })) : []} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                    <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#94A3B8' }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#64748B' }} width={110} />
                    <RechartsTooltip formatter={(v: number) => [formatCurrencyBRL(v), '']} contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.15)', fontSize: 10, fontWeight: 900 }} />
                    <Bar dataKey="Faturado" fill="#3B82F620" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="Recebido" fill="#10B981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Table — por turma */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100">
                      {['Turma', 'Segmento', 'Alunos', 'Faturado', 'Recebido', 'Pendente', 'Taxa'].map(h => (
                        <th key={h} className="p-4 px-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {byClass.map(({ cls, faturado, recebido, pendente, taxa, alunos }) => (
                      <tr key={cls.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 px-6">
                          <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{cls.name}</p>
                        </td>
                        <td className="p-4 px-6">
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{cls.segment}</span>
                        </td>
                        <td className="p-4 px-6 text-center">
                          <span className="text-xs font-black text-slate-900">{alunos}</span>
                        </td>
                        <td className="p-4 px-6">
                          <span className="text-xs font-black text-slate-900 tabular-nums">{formatCurrencyBRL(faturado)}</span>
                        </td>
                        <td className="p-4 px-6">
                          <span className="text-xs font-black text-emerald-600 tabular-nums">{formatCurrencyBRL(recebido)}</span>
                        </td>
                        <td className="p-4 px-6">
                          <span className={cn("text-xs font-black tabular-nums", pendente > 0 ? 'text-amber-600' : 'text-slate-400')}>{formatCurrencyBRL(pendente)}</span>
                        </td>
                        <td className="p-4 px-6">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className={cn("h-full rounded-full", taxa >= 90 ? 'bg-emerald-500' : taxa >= 60 ? 'bg-amber-400' : 'bg-rose-500')} style={{ width: `${taxa}%` }} />
                            </div>
                            <span className={cn("text-[9px] font-black tabular-nums", taxa >= 90 ? 'text-emerald-600' : taxa >= 60 ? 'text-amber-600' : 'text-rose-600')}>{taxa.toFixed(0)}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* ─── DADOS VIEW ─── */}
        {viewMode === 'dados' && (
          <motion.div key="dados" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
              <Search size={16} className="text-slate-300 shrink-0" />
              <input type="text" placeholder="BUSCAR ALUNO..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="flex-1 bg-transparent font-bold text-[11px] text-slate-700 outline-none placeholder:text-slate-300" />
            </div>
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100">
                    {['Aluno / Turma', 'Referência', 'Bruto', 'Líquido', 'Repasse', 'Status', ''].map((h, i) => (
                      <th key={i} className="p-4 px-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredData.map(inv => {
                    const s = students.find(x => x.id === inv.studentId);
                    const c = classes.find(x => x.id === inv.classId);
                    const isExp = expandedRow === inv.id;
                    return (
                      <React.Fragment key={inv.id}>
                        <tr className={cn("hover:bg-slate-50 transition-colors", isExp && "bg-slate-50")}>
                          <td className="p-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center font-black text-slate-400 text-xs">{s?.name.charAt(0) || '?'}</div>
                              <div>
                                <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{s?.name || '—'}</p>
                                <p className="text-[8px] font-black text-brand-blue uppercase tracking-widest">{c?.name || '—'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 px-6 text-xs font-bold text-slate-600 tabular-nums">{inv.monthYear}</td>
                          <td className="p-4 px-6 text-xs font-black text-slate-500 tabular-nums">{formatCurrencyBRL(inv.grossAmount)}</td>
                          <td className="p-4 px-6 text-xs font-black text-slate-900 tabular-nums">
                            {(() => {
                              const student = students.find(s => s.id === inv.studentId);
                              const isPaidInTime = inv.paymentStatus === 'PAID' && inv.paymentDate && new Date(inv.paymentDate) <= new Date(inv.dueDate);
                              if (isPaidInTime && student?.hasTimelyPaymentDiscount && (student.personalDiscount || 0) > 0) {
                                return formatCurrencyBRL(inv.netAmount - (inv.personalDiscountAmount || 0));
                              }
                              return formatCurrencyBRL(inv.netAmount);
                            })()}
                          </td>
                          <td className="p-4 px-6 text-xs font-black text-rose-500 tabular-nums">
                            {(() => {
                              const student = students.find(s => s.id === inv.studentId);
                              const isPaidInTime = inv.paymentStatus === 'PAID' && inv.paymentDate && new Date(inv.paymentDate) <= new Date(inv.dueDate);
                              let effectiveValor = inv.netAmount;
                              if (isPaidInTime && student?.hasTimelyPaymentDiscount && (student.personalDiscount || 0) > 0) {
                                effectiveValor = inv.netAmount - (inv.personalDiscountAmount || 0);
                              }
                              const valorCobrado = inv.amountCharged ?? inv.netAmount;
                              const baseRepasse = Math.min(effectiveValor, valorCobrado);
                              const sharePercent = inv.collegeSharePercent ?? 0;
                              return formatCurrencyBRL(baseRepasse * (sharePercent / 100));
                            })()}
                          </td>
                          <td className="p-4 px-6">
                            <span className={cn("px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest",
                              inv.paymentStatus === 'PAID' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600")}>
                              {inv.paymentStatus === 'PAID' ? 'Pago' : 'Pendente'}
                            </span>
                          </td>
                          <td className="p-4 px-6">
                            <button onClick={() => setExpandedRow(isExp ? null : inv.id)}
                              className={cn("w-7 h-7 flex items-center justify-center rounded-lg transition-all", isExp ? "bg-slate-900 text-white" : "text-slate-400 hover:text-slate-900")}>
                              <ChevronDown size={14} className={cn("transition-transform", isExp && "rotate-180")} />
                            </button>
                          </td>
                        </tr>
                        {isExp && (
                          <tr className="bg-slate-50/50">
                            <td colSpan={7} className="px-6 pb-4 pt-2">
                              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-inner grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                  { label: 'Desc. Pessoal', value: formatCurrencyBRL(inv.personalDiscountAmount || 0), color: 'text-indigo-600' },
                                  { label: 'Desc. Faltas', value: formatCurrencyBRL(inv.absenceDiscountAmount || 0), color: 'text-amber-600' },
                                  { label: 'Pago em', value: inv.paymentDate || '—', color: 'text-slate-900' },
                                  { label: 'Valor Cobrado', value: inv.amountCharged ? formatCurrencyBRL(inv.amountCharged) : '—', color: 'text-emerald-600' },
                                ].map((d, i) => (
                                  <div key={i}>
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{d.label}</p>
                                    <p className={cn("text-sm font-black", d.color)}>{d.value}</p>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* ─── ANUAL VIEW ─── */}
        {viewMode === 'anual' && (
          <motion.div key="anual" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Summary Table */}
              <div className="lg:col-span-5 bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Consolidado Mensal</h3>
                  <TrendingUp size={16} className="text-brand-blue" />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50">
                        <th className="p-3 px-6 text-[8px] font-black text-slate-400 uppercase tracking-widest">Mês</th>
                        <th className="p-3 px-4 text-[8px] font-black text-slate-400 uppercase tracking-widest text-right">Boletos</th>
                        <th className="p-3 px-6 text-[8px] font-black text-slate-400 uppercase tracking-widest text-right">Acumulado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {annualData.summary.map((m, i) => (
                        <tr key={m.name} onClick={() => setSelectedMonth(i)}
                          className={cn("cursor-pointer transition-all hover:bg-slate-50", selectedMonth === i ? "bg-brand-blue/5 border-l-4 border-l-brand-blue" : "border-l-4 border-l-transparent")}>
                          <td className="p-3 px-6 text-[10px] font-black text-slate-900 uppercase">{m.name}</td>
                          <td className="p-3 px-4 text-right text-[10px] font-bold text-slate-600">{formatCurrencyBRL(m.boletos)}</td>
                          <td className="p-3 px-6 text-right text-[10px] font-black text-brand-blue">{formatCurrencyBRL(m.acumulado)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Daily Breakdown Table */}
              <div className="lg:col-span-7 space-y-6">
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand-blue/10 text-brand-blue rounded-xl flex items-center justify-center"><TableIcon size={20} /></div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">{MONTH_NAMES[selectedMonth]}</h3>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Detalhamento Diário</p>
                    </div>
                  </div>
                  <div className="flex gap-1 overflow-x-auto max-w-[300px] no-scrollbar">
                    {MONTH_NAMES.map((m, i) => (
                      <button key={m} onClick={() => setSelectedMonth(i)}
                        className={cn("px-2 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all", selectedMonth === i ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-400")}>
                        {m.substring(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50">
                        <th className="p-4 px-6 text-[8px] font-black text-slate-400 uppercase tracking-widest">Data</th>
                        <th className="p-4 px-4 text-[8px] font-black text-slate-400 uppercase tracking-widest text-right">Pagto Boleto</th>
                        <th className="p-4 px-6 text-[8px] font-black text-slate-400 uppercase tracking-widest text-right">Acumulado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {dailyBreakdown.map((d, i) => (
                        <tr key={i} className={cn(d.isWeekend ? "bg-amber-50/20" : "hover:bg-slate-50")}>
                          <td className="p-3 px-6 text-[9px] font-bold text-slate-600 uppercase">{d.formattedDate}</td>
                          <td className="p-3 px-4 text-right text-[10px] font-black text-slate-900">{formatCurrencyBRL(d.pagtoBoleto)}</td>
                          <td className="p-3 px-6 text-right text-[10px] font-black text-brand-blue">{formatCurrencyBRL(d.acumulado)}</td>
                        </tr>
                      ))}
                      <tr className="bg-slate-900 text-white">
                        <td className="p-4 px-6 text-[10px] font-black uppercase">Total {MONTH_NAMES[selectedMonth]}</td>
                        <td className="p-4 px-4 text-right text-[10px] font-black">{formatCurrencyBRL(dailyBreakdown[dailyBreakdown.length - 1]?.acumulado || 0)}</td>
                        <td className="p-4 px-6 text-right text-[11px] font-black text-brand-lime">{formatCurrencyBRL(dailyBreakdown[dailyBreakdown.length - 1]?.acumulado || 0)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="pt-6 flex items-center gap-3 opacity-40">
        <ShieldCheck size={16} className="text-slate-400" />
        <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">Relatórios Financeiros · {filteredData.length} registros · {period}</p>
      </footer>
    </div>
  );
}
