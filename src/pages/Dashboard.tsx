import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  AlertCircle,
  ChevronRight,
  CheckCircle2,
  TrendingUp,
  Receipt,
  Calendar,
  Clock,
  ArrowUpRight,
  Percent,
  Plus,
  Activity
} from 'lucide-react';
import { cn, formatCurrencyBRL } from '../lib/utils';
import { format } from 'date-fns';
import { finance } from '../services/finance';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Student, Invoice, SystemStats } from '../types';

export default function DashboardTest() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [sysStats, setSysStats] = useState<SystemStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Fast path: Load stats first
        const stats = await finance.getStats();
        setSysStats(stats);
        
        // Background path: Load lists for the table
        const [s, inv] = await Promise.all([
          finance.getStudents(),
          finance.getInvoices()
        ]);
        setStudents(s || []);
        setInvoices(inv || []);
      } catch (error) {
        console.error("Erro ao carregar dashboard", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const computedStats = useMemo(() => {
    const now = new Date();
    const realInvoices = invoices.filter(inv => {
      const s = students.find(x => x.id === inv.studentId);
      return s && !s.name.includes('Exemplo') && !s.id.includes('fake');
    });

    const pendingInvoices = realInvoices.filter(inv => inv.paymentStatus === 'PENDING');
    const overdueInvoices = pendingInvoices.filter(inv => new Date(inv.dueDate) < now);
    const paidInvoices = realInvoices.filter(inv => inv.paymentStatus === 'PAID');
    
    const currentMonth = (now.getMonth() + 1).toString().padStart(2, '0');
    const monthlyData = sysStats?.monthlySummary?.[currentMonth] || { faturado: 0, paidCount: 0, pendingCount: 0 };
    const currentMonthTotal = sysStats?.revenueCurrentMonth ?? 0;
    const totalInvoicesMonth = (monthlyData.paidCount || 0) + (monthlyData.pendingCount || 0);

    // Use sysStats if available, otherwise fallback to computed
    return {
      totalStudents: sysStats?.totalStudents ?? students.filter(s => !s.name.includes('Exemplo')).length,
      currentMonthTotal: currentMonthTotal, 
      pendingCount: sysStats?.totalUnpaidInvoices ?? pendingInvoices.length,
      overdueValue: sysStats?.unpaidAmount ?? overdueInvoices.reduce((acc, inv) => acc + (inv.netAmount || 0), 0),
      overdueInvoices: overdueInvoices.slice(0, 5),
      collectionRate: sysStats 
        ? (sysStats.paidInvoicesMonth / (sysStats.totalInvoices || 1)) * 100 
        : (realInvoices.length > 0 ? (paidInvoices.length / realInvoices.length) * 100 : 0),
      averageTicket: totalInvoicesMonth > 0 
        ? (monthlyData.faturado / totalInvoicesMonth) 
        : 0
    };
  }, [students, invoices, sysStats]);

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-brand-blue/10 border-t-brand-blue rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 pb-32 max-w-[1600px] mx-auto space-y-8 font-sans">
      {/* Header Section - More Compact */}
      <motion.header initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between bg-white p-6 rounded-3xl shadow-sm border border-slate-100 gap-6"
      >
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Resumo Financeiro</h1>
          <p className="text-slate-500 font-medium text-sm mt-1">Bem-vindo, <span className="text-slate-900 font-bold">{profile?.displayName?.split(' ')[0] || 'Administrador'}</span>.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/students')}
            className="bg-white border border-slate-200 text-slate-600 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm flex items-center gap-3"
          >
            <Plus size={16} className="text-brand-blue" /> Cadastrar Aluno
          </button>
          <button 
            onClick={() => navigate('/monthly')}
            className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-slate-900/10 flex items-center gap-3"
          >
            <Activity size={16} className="text-brand-lime" /> Iniciar Fechamento
          </button>
        </div>
      </motion.header>

      {/* Bento Grid - Unified Card Sizes */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Ticket Médio', value: formatCurrencyBRL(computedStats.averageTicket), icon: TrendingUp, color: 'text-brand-blue', bg: 'bg-brand-blue/5', detail: `${sysStats?.paidInvoicesMonth || 0} boletos`, path: '/students' },
          { label: 'Receita Mês', value: formatCurrencyBRL(computedStats.currentMonthTotal), icon: Receipt, color: 'text-emerald-600', bg: 'bg-emerald-50', detail: 'Faturamento Bruto', path: '/reports' },
          { label: 'Liquidez', value: `${computedStats.collectionRate.toFixed(1)}%`, icon: Percent, color: 'text-white', bg: 'bg-slate-900', detail: 'Eficiência Pago', path: '/invoices' },
          { label: 'Inadimplência', value: formatCurrencyBRL(computedStats.overdueValue), icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50', detail: `${computedStats.overdueInvoices.length} títulos atrasados`, path: '/invoices' }
        ].map((stat, i) => (
          <motion.div 
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => stat.path && navigate(stat.path)}
            className={cn(
              "p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between h-40 group hover:scale-[1.02] transition-all cursor-pointer",
              stat.bg === 'bg-slate-900' ? "bg-slate-900 border-slate-800 text-white" : "bg-white"
            )}
          >
            <div className="flex justify-between items-start">
               <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", stat.bg === 'bg-slate-900' ? 'bg-white/10' : stat.bg)}>
                  <stat.icon size={20} className={stat.color} />
               </div>
               <span className={cn("text-[9px] font-black uppercase tracking-widest opacity-60", stat.bg === 'bg-slate-900' ? "text-slate-400" : "text-slate-400")}>{stat.detail}</span>
            </div>
            <div>
              <p className={cn("text-[10px] font-black uppercase tracking-widest mb-1", stat.bg === 'bg-slate-900' ? "text-slate-400" : "text-slate-400")}>{stat.label}</p>
              <h3 className="text-2xl font-black tracking-tight">{stat.value}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Overdue Payments - Compact Table */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
            <div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Pendências Críticas</h3>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Ações necessárias</p>
            </div>
            <button 
              onClick={() => navigate('/invoices')}
              className="h-8 px-4 bg-slate-100 hover:bg-slate-200 rounded-lg text-[9px] font-black text-slate-600 uppercase tracking-widest transition-all"
            >
              Ver Lista
            </button>
          </div>
          
          <div className="divide-y divide-slate-50">
            {computedStats.overdueInvoices.length > 0 ? computedStats.overdueInvoices.map((inv) => {
              const s = students.find(x => x.id === inv.studentId);
              return (
                <div key={inv.id} className="p-4 flex items-center justify-between group hover:bg-slate-50 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center font-black text-slate-400 text-sm group-hover:bg-brand-blue group-hover:text-white transition-all shadow-sm">
                      {s?.name?.charAt(0) || 'A'}
                    </div>
                    <div>
                      <p className="font-black text-slate-900 uppercase tracking-tight text-sm">{s?.name}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-1">
                          <Clock size={10} /> Atrasado
                        </span>
                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">({format(new Date(inv.dueDate), 'dd/MM/yy')})</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-black text-slate-900 tabular-nums">{formatCurrencyBRL(inv.netAmount)}</p>
                    <button 
                      onClick={() => navigate('/invoices')}
                      className="text-brand-blue text-[9px] font-black uppercase tracking-widest mt-1 hover:underline flex items-center gap-1 ml-auto"
                    >
                      Cobranca <ArrowUpRight size={10} />
                    </button>
                  </div>
                </div>
              );
            }) : (
              <div className="p-12 text-center">
                <CheckCircle2 size={32} className="mx-auto text-emerald-500 opacity-20 mb-3" />
                <p className="text-slate-400 font-black uppercase tracking-widest text-[9px]">Tudo em dia</p>
              </div>
            )}
          </div>
        </div>

        {/* System Activity - Compact */}
        <div className="space-y-8">
          <div className="bg-brand-blue p-8 rounded-3xl text-white shadow-lg relative overflow-hidden group">
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
            <div className="relative z-10 space-y-6">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center">
                <Calendar size={24} className="text-brand-lime" />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight">Fechamento</h3>
                <p className="text-blue-100 text-[10px] font-black uppercase tracking-widest mt-1 opacity-60">Mensalidade e Consumo</p>
              </div>
              <button 
                onClick={() => navigate('/monthly')}
                className="w-full py-3 bg-white text-brand-blue rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-50 transition-all shadow-md"
              >
                Iniciar Fechamento Mensal
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resumo de Operações</h4>
              <Activity size={14} className="text-emerald-500" />
            </div>
            
            <div className="space-y-6">
              {[
                { label: 'Consumo Importado', time: 'Sistema', icon: Receipt, color: 'text-brand-blue', bg: 'bg-brand-blue/5' },
                { label: 'Pagamentos Identificados', time: 'Conciliação', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                { label: 'Sincronização Nuvem', time: 'Automatizado', icon: Clock, color: 'text-slate-400', bg: 'bg-slate-50' }
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4 group">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", item.bg, item.color)}>
                    <item.icon size={18} />
                  </div>
                  <div className="flex-1 pt-0.5">
                    <p className="text-xs font-black text-slate-800 uppercase tracking-tight leading-none mb-1">{item.label}</p>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                       {item.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            
            <button 
              onClick={() => navigate('/reports')}
              className="mt-8 w-full py-3 rounded-xl border border-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest hover:bg-slate-50 hover:text-slate-600 transition-all"
            >
              Log Completo
            </button>
          </div>
        </div>
      </div>

      <footer className="pt-10 flex items-center justify-between opacity-30">
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">HUB V1.2</p>
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">2026 &bull; Secure Protocol</p>
      </footer>
    </div>
  );
}
