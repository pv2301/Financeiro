import React, { useState, useEffect, useRef } from 'react';
import {
  Save, Image as ImageIcon, CheckCircle2, ChevronDown, ChevronUp, Upload, Trash2, Calendar, DollarSign, Activity, FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { storage } from '../services/storage';
import { finance } from '../services/finance';
import { storage as firebaseStorage } from '../firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import * as XLSX from 'xlsx';

export default function Config() {
  const [logo, setLogo] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };
  
  // Sections state
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    logo: true,
    academicYear: true,
    financial: true,
    summary: true
  });
  
  const toggleSection = (id: string) => {
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Finance config state
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [scholasticDays, setScholasticDays] = useState<Record<string, number>>({});
  const [boletoFee, setBoletoFee] = useState<number>(3.50);
  const [defaultCollegeShare, setDefaultCollegeShare] = useState<number>(20);

  // Summary state
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalClasses, setTotalClasses] = useState(0);
  const [totalServices, setTotalServices] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [logoData, globalConfig, students, classes, services] = await Promise.all([
        storage.getLogo(),
        finance.getGlobalConfig(),
        finance.getStudents(),
        finance.getClasses(),
        finance.getServices()
      ]);
      
      setLogo(logoData);
      setTotalStudents(students.length);
      setTotalClasses(classes.length);
      setTotalServices(services.length);

      if (globalConfig) {
        setScholasticDays(globalConfig.scholasticDays || {});
        setBoletoFee(globalConfig.boletoEmissionFee ?? 3.50);
      }
    } catch (e) {
      console.error(e);
      showToast('Erro ao carregar configurações');
    }
  };

  // Logo handlers
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64 = reader.result as string;
          const logoRef = ref(firebaseStorage, 'configs/logo');
          await uploadString(logoRef, base64, 'data_url');
          const url = await getDownloadURL(logoRef);
          setLogo(url);
          storage.saveLogo(url);
          showToast('Logo atualizada com sucesso');
        } catch (error) {
          console.error("Erro no upload da logo:", error);
          showToast('Erro ao atualizar logo');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setLogo(null);
    storage.saveLogo('');
    showToast('Logo removida');
  };

  // Financial Config Handlers
  const saveFinancialConfig = async () => {
    await finance.saveGlobalConfig({ 
      scholasticDays, 
      boletoEmissionFee: boletoFee,
      defaultDueDay: 10 // keep standard
    });
    showToast('Configurações salvas');
  };

  const updateScholasticDay = (monthIdx: number, val: string) => {
    const mmStr = String(monthIdx + 1).padStart(2, '0');
    const key = `${selectedYear}-${mmStr}`;
    const days = parseInt(val) || 0;
    setScholasticDays(prev => ({ ...prev, [key]: days }));
  };

  const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const currentYearDays = MONTHS.map((_, i) => {
    const mmStr = String(i + 1).padStart(2, '0');
    const key = `${selectedYear}-${mmStr}`;
    return scholasticDays[key] || 0;
  });
  
  const configuredMonthsCount = currentYearDays.filter(d => d > 0).length;
  const missingMonthsCount = 12 - configuredMonthsCount;
  const totalDaysCount = currentYearDays.reduce((a, b) => a + b, 0);

  // Backup Handler
  const exportBackup = async () => {
    try {
      const [students, classes, services] = await Promise.all([
        finance.getStudents(),
        finance.getClasses(),
        finance.getServices()
      ]);
      
      const wb = XLSX.utils.book_new();
      
      const wsStudents = XLSX.utils.json_to_sheet(students);
      XLSX.utils.book_append_sheet(wb, wsStudents, "Alunos");
      
      const wsClasses = XLSX.utils.json_to_sheet(classes);
      XLSX.utils.book_append_sheet(wb, wsClasses, "Turmas");
      
      const wsServices = XLSX.utils.json_to_sheet(services);
      XLSX.utils.book_append_sheet(wb, wsServices, "Serviços");
      
      XLSX.writeFile(wb, `backup_financeiro_${new Date().getTime()}.xlsx`);
      showToast('Backup exportado com sucesso');
    } catch (e) {
      console.error(e);
      showToast('Erro ao exportar backup');
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-6xl mx-auto pb-32">
      {toast && (
        <div className="fixed bottom-4 right-4 bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold shadow-xl flex items-center gap-2 z-50 animate-in slide-in-from-bottom-5">
          <CheckCircle2 size={20} />
          {toast}
        </div>
      )}

      <div>
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">Configurações</h1>
        <p className="text-slate-500 font-medium">Configure os parâmetros globais do Financeiro Canteen.</p>
      </div>

      <div className="space-y-4">
        {/* SEC 1: LOGO */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <button onClick={() => toggleSection('logo')} className="w-full flex items-center justify-between p-6 bg-slate-50 hover:bg-slate-100 transition-colors">
            <div className="flex items-center gap-3">
              <ImageIcon className="text-brand-blue" size={24} />
              <h2 className="text-lg font-black text-slate-800">Logo do Sistema</h2>
            </div>
            {openSections.logo ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
          </button>
          
          <AnimatePresence>
            {openSections.logo && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-slate-100">
                <div className="p-6">
                  <div className="flex items-center gap-8">
                    <div className="w-32 h-32 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-2 relative overflow-hidden group">
                      {logo ? (
                        <img src={logo} alt="Logo" className="w-full h-full object-contain" />
                      ) : (
                        <ImageIcon className="text-slate-300" size={32} />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg mb-1">Upload de Logo</h3>
                      <p className="text-sm text-slate-500 mb-4">Recomendado: 512x512px, PNG ou JPG</p>
                      <div className="flex gap-2">
                        <label className="bg-brand-blue hover:bg-brand-dark text-white px-4 py-2 rounded-xl font-bold cursor-pointer transition-colors flex items-center gap-2">
                          <Upload size={18} /> Selecionar
                          <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                        </label>
                        {logo && (
                          <button onClick={removeLogo} className="bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-xl font-bold transition-colors flex items-center gap-2">
                            <Trash2 size={18} /> Remover
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* SEC 2: ANO LETIVO */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <button onClick={() => toggleSection('academicYear')} className="w-full flex items-center justify-between p-6 bg-slate-50 hover:bg-slate-100 transition-colors">
            <div className="flex items-center gap-3">
              <Calendar className="text-brand-orange" size={24} />
              <h2 className="text-lg font-black text-slate-800">Ano Letivo & Dias Letivos</h2>
            </div>
            {openSections.academicYear ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
          </button>

          <AnimatePresence>
            {openSections.academicYear && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-slate-100">
                <div className="p-6 space-y-6">
                  
                  {/* Year selector */}
                  <div className="flex items-center justify-between bg-slate-100 p-2 rounded-2xl w-fit mx-auto mb-6">
                    <button onClick={() => setSelectedYear(y => y - 1)} className="p-2 hover:bg-white rounded-xl transition-all">◀</button>
                    <span className="px-6 text-xl font-black text-brand-blue">{selectedYear}</span>
                    <button onClick={() => setSelectedYear(y => y + 1)} className="p-2 hover:bg-white rounded-xl transition-all">▶</button>
                  </div>

                  {totalDaysCount === 0 && (
                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3">
                      <div className="text-amber-500 mt-0.5">⚠️</div>
                      <div>
                        <h4 className="font-bold text-amber-800">Dias letivos não configurados</h4>
                        <p className="text-sm text-amber-700">Os dias letivos de {selectedYear} ainda não foram definidos. Configure antes de gerar os boletos de consumo.</p>
                      </div>
                    </div>
                  )}

                  {/* Banner */}
                  <div className="flex flex-wrap gap-4">
                    <div className="flex-1 min-w-[150px] bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
                      <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Meses Config</p>
                      <p className="text-2xl font-black text-emerald-700">{configuredMonthsCount} <span className="text-sm font-bold">/ 12</span></p>
                    </div>
                    <div className={`flex-1 min-w-[150px] ${missingMonthsCount > 0 ? 'bg-amber-50 border-amber-100' : 'bg-emerald-50 border-emerald-100'} rounded-2xl p-4 border`}>
                      <p className={`text-[9px] font-black ${missingMonthsCount > 0 ? 'text-amber-600' : 'text-emerald-600'} uppercase tracking-widest mb-1`}>Faltam</p>
                      <p className={`text-2xl font-black ${missingMonthsCount > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>{missingMonthsCount}</p>
                    </div>
                    <div className="flex-1 min-w-[150px] bg-sky-50 rounded-2xl p-4 border border-sky-100">
                      <p className="text-[9px] font-black text-sky-600 uppercase tracking-widest mb-1">Total Dias</p>
                      <p className="text-2xl font-black text-sky-700">{totalDaysCount}</p>
                    </div>
                  </div>

                  {/* Grid of 12 months */}
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                    {MONTHS.map((m, i) => {
                      const val = currentYearDays[i];
                      return (
                        <div key={i} className={`rounded-2xl p-3 text-center border ${val > 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                          <p className="text-[9px] font-black text-slate-400 uppercase mb-1">{m}</p>
                          <input type="number" value={val || ''} onChange={e => updateScholasticDay(i, e.target.value)}
                            onBlur={saveFinancialConfig}
                            className="w-full text-center font-black text-brand-blue bg-transparent focus:outline-none text-lg" min={0} max={31}
                            placeholder="0" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* SEC 3: PARAMETROS FINANCEIROS */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <button onClick={() => toggleSection('financial')} className="w-full flex items-center justify-between p-6 bg-slate-50 hover:bg-slate-100 transition-colors">
            <div className="flex items-center gap-3">
              <DollarSign className="text-emerald-500" size={24} />
              <h2 className="text-lg font-black text-slate-800">Parâmetros Financeiros</h2>
            </div>
            {openSections.financial ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
          </button>
          
          <AnimatePresence>
            {openSections.financial && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-slate-100">
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Taxa de Boleto (R$)</label>
                    <input type="number" value={boletoFee} onChange={e => setBoletoFee(parseFloat(e.target.value) || 0)}
                      onBlur={saveFinancialConfig}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-brand-blue/20 outline-none"
                      min={0} step={0.01} />
                    <p className="text-[10px] text-slate-400 mt-1">Sempre formatado: R$ {boletoFee.toFixed(2)}</p>
                  </div>
                  <div className="opacity-50 pointer-events-none">
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">% Repasse Colégio (Padrão)</label>
                    <input type="number" value={defaultCollegeShare} onChange={e => setDefaultCollegeShare(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none"
                      min={0} max={100} />
                    <p className="text-[10px] text-slate-400 mt-1">Em breve. Definirá o repasse global.</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* SEC 4: RESUMO */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <button onClick={() => toggleSection('summary')} className="w-full flex items-center justify-between p-6 bg-slate-50 hover:bg-slate-100 transition-colors">
            <div className="flex items-center gap-3">
              <Activity className="text-sky-500" size={24} />
              <h2 className="text-lg font-black text-slate-800">Resumo do Sistema</h2>
            </div>
            {openSections.summary ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
          </button>
          
          <AnimatePresence>
            {openSections.summary && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-slate-100">
                <div className="p-6 space-y-6">
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                      <p className="text-3xl font-black text-brand-blue mb-1">{totalStudents}</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Alunos</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                      <p className="text-3xl font-black text-brand-blue mb-1">{totalClasses}</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Turmas</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                      <p className="text-3xl font-black text-brand-blue mb-1">{totalServices}</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Serviços</p>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-6">
                    <button onClick={exportBackup} className="flex items-center gap-2 bg-brand-blue/10 text-brand-blue hover:bg-brand-blue/20 px-6 py-3 rounded-xl font-bold transition-colors">
                      <FileText size={18} />
                      Exportar Backup Excel
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}
