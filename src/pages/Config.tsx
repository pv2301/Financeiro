import React, { useState, useEffect, useMemo } from 'react';
import {
  Save, Calendar, DollarSign, Settings, Zap, Download, ArrowUpRight, Umbrella, Sun
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { finance } from '../services/finance';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';

// --- PADRONIZAÇÃO DE TEXTOS (DESIGN SYSTEM TOKENS) ---
const TXT = {
  LABEL: "text-[11px] font-black uppercase tracking-[0.1em] text-slate-400",
  VALUE: "text-base font-black text-slate-900 uppercase tracking-tight",
  TITLE: "text-4xl font-black text-slate-900 uppercase tracking-tighter",
  SECTION_TITLE: "text-sm font-black text-slate-900 uppercase tracking-tight",
  TAB: "text-[10px] font-black uppercase tracking-widest"
};

export default function Config() {
  const navigate = useNavigate();
  const { profile: currentUserProfile } = useAuth();
  const [toast, setToast] = useState<string | null>(null);
  
  const showToast = (msg: string) => { 
    setToast(msg); 
    setTimeout(() => setToast(null), 3000); 
  };
  
  const [scholasticDays, setScholasticDays] = useState<Record<string, number | string>>({});
  const [currentYear, setCurrentYear] = useState(2026);
  const [vacationMonths, setVacationMonths] = useState<Record<string, boolean>>({});
  const [boletoFee, setBoletoFee] = useState<number>(3.50);
  const [boletoFeeInput, setBoletoFeeInput] = useState<string>("3,50");
  const [defaultCollegeShare, setDefaultCollegeShare] = useState<number>(20);
  const [ageRefDay, setAgeRefDay] = useState<number>(0); 
  const [defaultDueDay, setDefaultDueDay] = useState<number>(10);
  const [collegeShareBySegment, setCollegeShareBySegment] = useState<Record<string, number>>({
    'Ensino Fundamental I': 20
  });
  const [mandatorySnackBySegment, setMandatorySnackBySegment] = useState<Record<string, string>>({
    'Berçário': 'ALMOCO',
    'Educação Infantil': 'LANCHE_COLETIVO',
    'Ensino Fundamental I': 'LANCHE_COLETIVO'
  });
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [segments, setSegments] = useState<string[]>([]);

  const [totalStudents, setTotalStudents] = useState(0);
  const [totalClasses, setTotalClasses] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [globalConfig, students, classes, servicesData] = await Promise.all([
        finance.getGlobalConfig(),
        finance.getStudents(),
        finance.getClasses(),
        finance.getServices()
      ]);
      setTotalStudents(students.length);
      setTotalClasses(classes.length);
      setServices(servicesData);
      if (classes) {
        setSegments(Array.from(new Set(classes.map(c => c.segment))).filter(Boolean).sort());
      }
      if (globalConfig) {
        setScholasticDays(globalConfig.scholasticDays || {});
        
        const vac: Record<string, boolean> = {};
        Object.entries(globalConfig.scholasticDays || {}).forEach(([m, d]) => {
           if (d === 0) vac[m] = true;
        });
        setVacationMonths(vac);

        const fee = globalConfig.boletoEmissionFee ?? 3.50;
        setBoletoFee(fee);
        setBoletoFeeInput(fee.toFixed(2).replace('.', ','));
        setDefaultCollegeShare(globalConfig.defaultCollegeSharePercent ?? 20);
        setAgeRefDay(globalConfig.ageReferenceDay || 0);
        setDefaultDueDay(globalConfig.defaultDueDay ?? 10);
        if (globalConfig.collegeShareBySegment) setCollegeShareBySegment(globalConfig.collegeShareBySegment);
        if (globalConfig.mandatorySnackBySegment) setMandatorySnackBySegment(globalConfig.mandatorySnackBySegment);
      }
    } catch (e) {
      console.error(e);
      showToast('Erro de Sincronização');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const config = {
        scholasticDays,
        boletoEmissionFee: boletoFee,
        defaultCollegeSharePercent: defaultCollegeShare,
        ageReferenceDay: ageRefDay,
        defaultDueDay: defaultDueDay,
        collegeShareBySegment,
        mandatorySnackBySegment
      };
      await finance.saveConfig(config);
      showToast('Configurações Salvas!');
    } catch (e) {
      console.error(e);
      showToast('Erro ao Salvar');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleVacation = (monthIndex: number) => {
    const key = `${currentYear}-${String(monthIndex + 1).padStart(2, '0')}`;
    const isVac = !vacationMonths[key];
    setVacationMonths(prev => ({ ...prev, [key]: isVac }));
    setScholasticDays(prev => ({ ...prev, [key]: isVac ? 0 : 22 }));
  };

  const exportData = async () => {
    try {
      const [students, classes, services, invoices] = await Promise.all([
        finance.getStudents(), finance.getClasses(), finance.getServices(), finance.getInvoices()
      ]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(students), "Alunos");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(classes), "Turmas");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(services), "Serviços");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(invoices), "Faturas");
      XLSX.writeFile(wb, `BACKUP_FINANCEIRO_${new Date().toISOString().split('T')[0]}.xlsx`);
      showToast('Backup Realizado!');
    } catch (e) {
      console.error(e);
      showToast('Erro no Export');
    }
  };

  if (isLoading && segments.length === 0) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-brand-blue/10 border-t-brand-blue rounded-full animate-spin" />
      </div>
    );
  }

  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  return (
    <div className="p-4 md:p-8 pb-32 max-w-[1600px] mx-auto space-y-8 font-sans bg-slate-50/30 min-h-screen">
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-12 right-12 z-[100] bg-slate-900 text-white px-8 py-4 rounded-2xl font-black shadow-2xl flex items-center gap-4"
          >
            <Zap size={20} className="text-brand-lime" />
            <span className="uppercase tracking-widest text-[11px]">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="flex flex-col md:flex-row md:items-center justify-between bg-white p-8 rounded-3xl shadow-sm border border-slate-100 gap-6">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-brand-blue rounded-2xl flex items-center justify-center text-white shadow-lg">
            <Settings size={32} />
          </div>
          <div>
            <h1 className={TXT.TITLE}>Configurações</h1>
            <p className={TXT.LABEL}>Parâmetros financeiros e calendário.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={exportData} className="flex items-center gap-3 bg-white text-slate-900 px-6 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all border border-slate-200 shadow-sm">
             <Download size={16} className="text-brand-blue" /> Backup
          </button>
          <button onClick={handleSave} className="flex items-center gap-3 bg-slate-900 text-white px-8 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-lg">
             <Save size={16} className="text-brand-lime" /> Salvar Alterações
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* --- Calendário --- */}
        <div className="lg:col-span-8 bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
             <div className="flex items-center gap-4">
                <Calendar size={20} className="text-brand-blue" />
                <h3 className={TXT.SECTION_TITLE}>Calendário Letivo</h3>
             </div>
             <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                {[2025, 2026, 2027].map(y => (
                  <button 
                    key={y}
                    onClick={() => setCurrentYear(y)}
                    className={cn(
                      "px-6 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all",
                      currentYear === y ? "bg-slate-900 text-white shadow-md" : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    {y}
                  </button>
                ))}
             </div>
          </div>
          <div className="p-8">
             <div className="grid grid-cols-3 md:grid-cols-4 gap-6">
                {months.map((mes, idx) => {
                  const key = `${currentYear}-${String(idx + 1).padStart(2, '0')}`;
                  const isVac = vacationMonths[key];
                  return (
                    <div key={mes} className={cn(
                      "p-5 rounded-2xl border transition-all space-y-4",
                      isVac ? "bg-amber-50 border-amber-100" : "bg-slate-50 border-slate-100"
                    )}>
                      <div className="flex items-center justify-between">
                         <label className="text-base font-black text-slate-900 uppercase tracking-widest">{mes}</label>
                          <button 
                            onClick={() => toggleVacation(idx)}
                            className={cn(
                              "flex items-center gap-1.5 px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all border",
                              isVac ? "bg-amber-500 text-white border-amber-500" : "bg-white text-slate-400 border-slate-200 hover:text-amber-500 hover:border-brand-blue"
                            )}
                          >
                            {isVac ? <Umbrella size={10} /> : <Sun size={10} />}
                            {isVac ? 'FÉRIAS' : 'LETIVO'}
                          </button>
                      </div>
                      {!isVac ? (
                        <div className="relative">
                          <input 
                            type="number" 
                            value={scholasticDays[key] ?? 22}
                            onChange={e => setScholasticDays({...scholasticDays, [key]: parseInt(e.target.value) || 0})}
                            className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:border-brand-blue outline-none font-black text-slate-700 text-base text-center"
                            min={0} max={31}
                          />
                        </div>
                      ) : (
                        <div className="h-[46px] flex items-center justify-center bg-amber-500/10 rounded-xl border border-dashed border-amber-200">
                           <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">RECESSO</p>
                        </div>
                      )}
                    </div>
                  );
                })}
             </div>
          </div>
        </div>

        {/* --- Regras de Negócio --- */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex items-center gap-4">
               <DollarSign size={20} className="text-emerald-500" />
               <h3 className={TXT.SECTION_TITLE}>Regras de Negócio</h3>
            </div>
            <div className="p-8 space-y-8">
               <div className="space-y-3">
                  <label className={TXT.LABEL}>Taxa de Emissão (Boleto)</label>
                  <div className="relative">
                     <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 font-black text-sm">R$</span>
                     <input type="text" value={boletoFeeInput} onChange={e => {
                       setBoletoFeeInput(e.target.value);
                       setBoletoFee(parseFloat(e.target.value.replace(',', '.')) || 0);
                     }} className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-xl font-black text-slate-900 text-sm focus:bg-white transition-all" />
                  </div>
               </div>

               <div className="space-y-3">
                  <label className={TXT.LABEL}>Dia Base - Idade</label>
                  <div className="relative">
                     <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 font-black text-[10px] uppercase">DIA</span>
                     <input type="number" value={ageRefDay} onChange={e => setAgeRefDay(parseInt(e.target.value) || 0)}
                       className="w-full pl-14 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-xl font-black text-slate-900 text-sm focus:bg-white transition-all" min={0} max={31} />
                  </div>
               </div>

               <div className="space-y-3">
                  <label className={TXT.LABEL}>Vencimento Padrão</label>
                  <div className="relative">
                     <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 font-black text-[10px] uppercase">DIA</span>
                     <input type="number" value={defaultDueDay} onChange={e => setDefaultDueDay(parseInt(e.target.value) || 1)}
                       className="w-full pl-14 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-xl font-black text-slate-900 text-sm focus:bg-white transition-all" min={1} max={31} />
                  </div>
               </div>

               <div className="space-y-4 pt-6 border-t border-slate-100">
                  <label className={TXT.LABEL}>Repasse por Ensino (%)</label>
                  <div className="space-y-3">
                     {segments.map(seg => (
                       <div key={seg} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-tight truncate flex-1">{seg}</p>
                          <div className="relative w-20">
                             <input type="number" value={collegeShareBySegment[seg] ?? defaultCollegeShare}
                               onChange={e => setCollegeShareBySegment({...collegeShareBySegment, [seg]: parseInt(e.target.value) || 0})}
                               className="w-full p-2 bg-white border border-slate-200 rounded-xl font-black text-brand-blue text-sm text-center pr-6 outline-none focus:border-brand-blue" />
                             <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-300 font-black">%</span>
                          </div>
                       </div>
                     ))}
                  </div>
               </div>
            </div>
          </div>


          <div className="bg-slate-900 rounded-[2rem] p-8 text-white shadow-lg space-y-6">
             <h3 className={cn(TXT.LABEL, "text-slate-500")}>Resumo do Sistema</h3>
             <div className="space-y-3">
                <div className="flex justify-between items-center">
                   <span className={cn(TXT.LABEL, "text-slate-500")}>Total Alunos</span>
                   <span className="text-base font-black uppercase">{totalStudents}</span>
                </div>
                <div className="flex justify-between items-center">
                   <span className={cn(TXT.LABEL, "text-slate-500")}>Total Turmas</span>
                   <span className="text-base font-black uppercase">{totalClasses}</span>
                </div>
             </div>
             <button onClick={() => navigate('/system-center-test')} className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all group mt-4 border border-white/5">
                <span className={TXT.TAB}>Central de Auditoria</span>
                <ArrowUpRight size={18} className="text-slate-500 group-hover:text-white" />
             </button>
          </div>
        </div>
      </div>

      <footer className="pt-16 flex items-center justify-between opacity-30">
        <p className={TXT.LABEL}>Configuração v4.0 &bull; 2026</p>
        <p className={TXT.LABEL}>Financeiro <span className="text-brand-blue">Canteen</span></p>
      </footer>
    </div>
  );
}
