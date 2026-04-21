import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Users,
  GraduationCap,
  Receipt,
  TrendingUp,
  AlertCircle,
  Phone,
  FileSpreadsheet,
  ChevronRight,
  Plus,
  Apple
} from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { finance } from '../services/finance';
import { Student, ClassInfo, Invoice } from '../types';

export default function Dashboard() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [s, c, inv] = await Promise.all([
          finance.getStudents(),
          finance.getClasses(),
          finance.getInvoices()
        ]);
        setStudents(s);
        setClasses(c);
        setInvoices(inv);
      } catch (error) {
        console.error("Erro ao carregar dashboard", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const getStudentName = (id: string) => students.find(s => s.id === id)?.name || 'Aluno Excluído';
  const getStudentPhone = (id: string) => students.find(s => s.id === id)?.contactPhone || '';

  const activeStudents = students.length;
  const activeClasses = classes.length;
  
  const currentMonthInvoices = invoices.filter(inv => inv.monthYear === format(new Date(), 'MM/yyyy'));
  const projectedRevenue = currentMonthInvoices.reduce((acc, curr) => acc + curr.netAmount, 0);

  const pendingInvoices = invoices.filter(inv => inv.paymentStatus === 'PENDING');
  const overdueInvoices = pendingInvoices.filter(inv => new Date(inv.dueDate) < new Date());

  const displayOverdue = overdueInvoices.length > 0 ? overdueInvoices : [
    {
      id: 'fake1',
      studentId: 'fake1',
      monthYear: '03/2026',
      grossAmount: 350.00,
      absenceDays: 0,
      absenceDiscountAmount: 0,
      personalDiscountAmount: 0,
      netAmount: 350.00,
      dueDate: new Date(new Date().setDate(new Date().getDate() - 5)).toISOString(),
      paymentStatus: 'PENDING',
      ticketNumber: ''
    } as Invoice
  ];

  const currentMonthName = format(new Date(), 'MMMM', { locale: ptBR });

  return (
    <div className="p-6 w-full space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-brand-blue uppercase tracking-tight">Visão Geral</h1>
          <p className="text-slate-500 font-medium">Acompanhe a saúde financeira da cantina.</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center text-brand-blue">
            <TrendingUp size={20} />
          </div>
          <div className="pr-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mês Atual</p>
            <p className="text-sm font-bold text-brand-blue capitalize">{currentMonthName} {format(new Date(), 'yyyy')}</p>
          </div>
        </div>
      </header>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg group-hover:scale-110 transition-transform bg-brand-blue shadow-brand-blue/20">
            <TrendingUp size={28} />
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Previsão {currentMonthName}</p>
          <p className="text-3xl font-black text-brand-blue">R$ {projectedRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>

        <Link to="/invoices" className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:border-red-500/20 transition-all group cursor-pointer block">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg group-hover:scale-110 transition-transform bg-red-500 shadow-red-500/20">
            <AlertCircle size={28} />
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Inadimplência</p>
          <p className="text-3xl font-black text-red-500">{overdueInvoices.length}</p>
        </Link>

        <Link to="/students" className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:border-brand-lime/20 transition-all group cursor-pointer block">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg group-hover:scale-110 transition-transform bg-brand-lime shadow-brand-lime/20">
            <Users size={28} />
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Alunos Ativos</p>
          <p className="text-3xl font-black text-brand-blue">{activeStudents}</p>
        </Link>

        <Link to="/classes" className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:border-brand-orange/20 transition-all group cursor-pointer block">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg group-hover:scale-110 transition-transform bg-brand-orange shadow-brand-orange/20">
            <GraduationCap size={28} />
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Turmas Atendidas</p>
          <p className="text-3xl font-black text-brand-blue">{activeClasses}</p>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-red-500 uppercase tracking-tight flex items-center gap-2">
              <AlertCircle size={24} />
              Atenção: Boletos Vencidos
            </h2>
            <Link to="/invoices" className="text-xs font-bold text-brand-blue uppercase tracking-widest hover:underline">Ver Todos</Link>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            {isLoading ? (
              <div className="p-12 text-center text-slate-400 font-medium">Carregando dados...</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {displayOverdue.map((inv, idx) => (
                  <div key={idx} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                    <div>
                      <h3 className="font-bold text-slate-800">{inv.id === 'fake1' ? 'Exemplo de Aluno (Dados Falsos)' : getStudentName(inv.studentId)}</h3>
                      <div className="flex items-center gap-3 mt-1 text-sm">
                        <span className="text-red-500 font-bold bg-red-50 px-2 py-0.5 rounded text-xs">Vencido: {format(new Date(inv.dueDate), 'dd/MM/yyyy')}</span>
                        <span className="text-slate-500 font-medium">Ref: {inv.monthYear}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs text-slate-400 font-black uppercase tracking-widest">Valor</p>
                        <p className="font-black text-slate-800">R$ {inv.netAmount.toFixed(2)}</p>
                      </div>
                      <a href={`https://wa.me/55${getStudentPhone(inv.studentId).replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center hover:bg-emerald-200 transition-colors" title="Cobrar por WhatsApp">
                        <Phone size={18} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="space-y-6">
          <div className="bg-gradient-to-br from-brand-blue to-blue-800 rounded-3xl p-8 text-white shadow-xl shadow-brand-blue/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
            
            <div className="relative z-10 flex flex-col h-full justify-between gap-6">
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
                  <FileSpreadsheet size={24} className="text-white" />
                </div>
              </div>
              
              <div>
                <h3 className="text-xl font-black mb-2">Fechamento do Mês</h3>
                <p className="text-blue-100 text-sm font-medium leading-relaxed">
                  Importe a planilha do sistema de catracas para gerar a cobrança de {currentMonthName} com o abatimento automático de faltas.
                </p>
              </div>

              <Link 
                to="/monthly" 
                className="w-full bg-white text-brand-blue font-black py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors"
              >
                Iniciar Processamento
                <ChevronRight size={18} />
              </Link>
            </div>
          </div>

          <div>
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 ml-2">Ações Rápidas</h2>
            <div className="space-y-3">
              <Link to="/students" className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 hover:border-brand-blue hover:shadow-md transition-all group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-brand-blue/10 group-hover:text-brand-blue transition-colors">
                    <Plus size={20} />
                  </div>
                  <span className="font-bold text-slate-700 group-hover:text-brand-blue transition-colors">Cadastrar Novo Aluno</span>
                </div>
                <ChevronRight size={16} className="text-slate-300 group-hover:text-brand-blue transition-colors" />
              </Link>

              <Link to="/classes" className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 hover:border-brand-orange hover:shadow-md transition-all group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-brand-orange/10 group-hover:text-brand-orange transition-colors">
                    <GraduationCap size={20} />
                  </div>
                  <span className="font-bold text-slate-700 group-hover:text-brand-orange transition-colors">Configurar Turmas</span>
                </div>
                <ChevronRight size={16} className="text-slate-300 group-hover:text-brand-orange transition-colors" />
              </Link>

              <Link to="/snacks" className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 hover:border-red-500 hover:shadow-md transition-all group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-red-50 group-hover:text-red-500 transition-colors">
                    <Apple size={20} />
                  </div>
                  <span className="font-bold text-slate-700 group-hover:text-red-500 transition-colors">Tabela de Lanches</span>
                </div>
                <ChevronRight size={16} className="text-slate-300 group-hover:text-red-500 transition-colors" />
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
