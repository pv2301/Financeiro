import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Save, User, Phone, Mail, CreditCard, 
  Percent, Calendar, ShieldCheck, Heart, 
  Baby, GraduationCap, Info, UserCheck, 
  UserPlus, Hash, StickyNote
} from 'lucide-react';
import { Student, ClassInfo } from '../types';
import { cn } from '../lib/utils';

interface StudentModalProps {
  student: Student | null;
  classes: ClassInfo[];
  onClose: () => void;
  onSave: (student: Student) => Promise<void>;
  isSaving: boolean;
}

export default function StudentModal({ student, classes, onClose, onSave, isSaving }: StudentModalProps) {
  const [formData, setFormData] = useState<Student>({
    id: '',
    name: '',
    classId: '',
    segment: '',
    birthDate: '',
    responsibleName: '',
    responsibleCpf: '',
    contactPhone: '',
    contactEmail: '',
    motherName: '',
    motherCpf: '',
    motherEmail: '',
    motherPhone1: '',
    motherPhone2: '',
    fatherName: '',
    fatherCpf: '',
    fatherEmail: '',
    fatherPhone1: '',
    fatherPhone2: '',
    personalDiscount: 0,
    personalDiscountNote: '',
    hasTimelyPaymentDiscount: false,
    filenameSuffix: '',
    dueDay: undefined
  });

  const [activeTab, setActiveTab] = useState<'basic' | 'responsible' | 'parents' | 'financial'>('basic');

  useEffect(() => {
    if (student) {
      setFormData({
        ...student,
        birthDate: student.birthDate ? student.birthDate.substring(0, 10) : ''
      });
    }
  }, [student]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.classId) {
      alert('Nome e Turma são obrigatórios');
      return;
    }
    
    // Auto-fill segment from class
    const selectedClass = classes.find(c => c.id === formData.classId);
    const studentToSave = {
      ...formData,
      segment: selectedClass?.segment || formData.segment,
      id: formData.id || crypto.randomUUID()
    };
    
    onSave(studentToSave);
  };

  const TabButton = ({ id, label, icon: Icon }: { id: typeof activeTab, label: string, icon: any }) => (
    <button
      type="button"
      onClick={() => setActiveTab(id)}
      className={cn(
        "flex items-center gap-3 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border-2",
        activeTab === id 
          ? "bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/20" 
          : "bg-white text-slate-400 border-slate-100 hover:bg-slate-50 hover:text-slate-600"
      )}
    >
      <Icon size={16} />
      {label}
    </button>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-slate-900/60 backdrop-blur-xl pt-10 pb-10">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 40 }}
        className="bg-white rounded-[3rem] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.3)] border border-slate-200 w-full max-w-6xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-8 md:p-10 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center sticky top-0 z-10">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-slate-900/20">
               {student ? <UserCheck size={28} /> : <UserPlus size={28} />}
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">
                {student ? 'Refinar Cadastro' : 'Novo Aluno Estratégico'}
              </h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Sincronização de Dados Nominais</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-12 h-12 flex items-center justify-center bg-white rounded-xl border-2 border-slate-100 hover:bg-red-50 hover:text-red-500 transition-all text-slate-400 shadow-sm"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs Navigation */}
        <div className="px-8 md:px-10 py-4 bg-white border-b border-slate-50 flex items-center gap-4 overflow-x-auto no-scrollbar">
          <TabButton id="basic" label="Geral" icon={Baby} />
          <TabButton id="responsible" label="Responsável" icon={ShieldCheck} />
          <TabButton id="parents" label="Filiação" icon={Heart} />
          <TabButton id="financial" label="Financeiro" icon={Percent} />
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto bg-white p-8 md:p-12">
          <AnimatePresence mode="wait">
            {activeTab === 'basic' && (
              <motion.div 
                key="basic"
                initial={{ opacity: 0, x: 20 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: -20 }}
                className="space-y-10"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-3">
                    <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                      <User size={12} /> Nome Completo do Aluno *
                    </label>
                    <input 
                      type="text" 
                      required
                      value={formData.name} 
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-700 focus:bg-white focus:border-brand-blue/30 outline-none transition-all uppercase shadow-sm" 
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                      <Calendar size={12} /> Data de Nascimento
                    </label>
                    <input 
                      type="date" 
                      value={formData.birthDate} 
                      onChange={e => setFormData({...formData, birthDate: e.target.value})}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-700 focus:bg-white focus:border-brand-blue/30 outline-none transition-all shadow-sm" 
                    />
                  </div>
                  <div className="lg:col-span-2 space-y-3">
                    <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                      <GraduationCap size={12} /> Atribuição de Turma *
                    </label>
                    <select 
                      required
                      value={formData.classId} 
                      onChange={e => setFormData({...formData, classId: e.target.value})}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-700 focus:bg-white focus:border-brand-blue/30 outline-none transition-all uppercase shadow-sm appearance-none cursor-pointer"
                    >
                      <option value="">Selecione a Turma...</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.name} ({c.segment})</option>)}
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                      <Hash size={12} /> Suffix de Arquivo
                    </label>
                    <input 
                      type="text" 
                      value={formData.filenameSuffix} 
                      onChange={e => setFormData({...formData, filenameSuffix: e.target.value})}
                      placeholder="Ex: _BOLETO"
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-700 focus:bg-white focus:border-brand-blue/30 outline-none transition-all uppercase shadow-sm" 
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'responsible' && (
              <motion.div 
                key="responsible"
                initial={{ opacity: 0, x: 20 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: -20 }}
                className="space-y-10"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                  <div className="lg:col-span-2 space-y-3">
                    <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                      <User size={12} /> Responsável Financeiro
                    </label>
                    <input 
                      type="text" 
                      value={formData.responsibleName} 
                      onChange={e => setFormData({...formData, responsibleName: e.target.value})}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-700 focus:bg-white focus:border-brand-blue/30 outline-none transition-all uppercase shadow-sm" 
                    />
                  </div>
                  <div className="lg:col-span-2 space-y-3">
                    <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                      <CreditCard size={12} /> CPF do Responsável
                    </label>
                    <input 
                      type="text" 
                      value={formData.responsibleCpf} 
                      onChange={e => setFormData({...formData, responsibleCpf: e.target.value})}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-700 focus:bg-white focus:border-brand-blue/30 outline-none transition-all shadow-sm" 
                    />
                  </div>
                  <div className="lg:col-span-2 space-y-3">
                    <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                      <Phone size={12} /> Telefone Principal
                    </label>
                    <input 
                      type="text" 
                      value={formData.contactPhone} 
                      onChange={e => setFormData({...formData, contactPhone: e.target.value})}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-700 focus:bg-white focus:border-brand-blue/30 outline-none transition-all shadow-sm" 
                    />
                  </div>
                  <div className="lg:col-span-2 space-y-3">
                    <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                      <Mail size={12} /> E-mail para Faturamento
                    </label>
                    <input 
                      type="email" 
                      value={formData.contactEmail} 
                      onChange={e => setFormData({...formData, contactEmail: e.target.value})}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-700 focus:bg-white focus:border-brand-blue/30 outline-none transition-all shadow-sm" 
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'parents' && (
              <motion.div 
                key="parents"
                initial={{ opacity: 0, x: 20 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: -20 }}
                className="space-y-12"
              >
                {/* Mother Info */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-pink-400 rounded-full" />
                    <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Dados da Mãe</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Nome Completo</label>
                      <input type="text" value={formData.motherName} onChange={e => setFormData({...formData, motherName: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 font-bold text-slate-700 focus:bg-white outline-none uppercase transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">CPF</label>
                      <input type="text" value={formData.motherCpf} onChange={e => setFormData({...formData, motherCpf: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 font-bold text-slate-700 focus:bg-white outline-none transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Telefone 1</label>
                      <input type="text" value={formData.motherPhone1} onChange={e => setFormData({...formData, motherPhone1: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 font-bold text-slate-700 focus:bg-white outline-none transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Telefone 2</label>
                      <input type="text" value={formData.motherPhone2} onChange={e => setFormData({...formData, motherPhone2: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 font-bold text-slate-700 focus:bg-white outline-none transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">E-mail</label>
                      <input type="email" value={formData.motherEmail} onChange={e => setFormData({...formData, motherEmail: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 font-bold text-slate-700 focus:bg-white outline-none transition-all" />
                    </div>
                  </div>
                </div>

                {/* Father Info */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-blue-400 rounded-full" />
                    <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Dados do Pai</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Nome Completo</label>
                      <input type="text" value={formData.fatherName} onChange={e => setFormData({...formData, fatherName: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 font-bold text-slate-700 focus:bg-white outline-none uppercase transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">CPF</label>
                      <input type="text" value={formData.fatherCpf} onChange={e => setFormData({...formData, fatherCpf: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 font-bold text-slate-700 focus:bg-white outline-none transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Telefone 1</label>
                      <input type="text" value={formData.fatherPhone1} onChange={e => setFormData({...formData, fatherPhone1: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 font-bold text-slate-700 focus:bg-white outline-none transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Telefone 2</label>
                      <input type="text" value={formData.fatherPhone2} onChange={e => setFormData({...formData, fatherPhone2: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 font-bold text-slate-700 focus:bg-white outline-none transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">E-mail</label>
                      <input type="email" value={formData.fatherEmail} onChange={e => setFormData({...formData, fatherEmail: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 font-bold text-slate-700 focus:bg-white outline-none transition-all" />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'financial' && (
              <motion.div 
                key="financial"
                initial={{ opacity: 0, x: 20 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: -20 }}
                className="space-y-10"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  <div className="bg-slate-50/50 p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm">
                    <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-1">
                      <Calendar size={12} /> Dia de Vencimento
                    </label>
                    <input 
                      type="number" 
                      min="1" 
                      max="31"
                      value={formData.dueDay || ''} 
                      onChange={e => setFormData({...formData, dueDay: parseInt(e.target.value) || undefined})}
                      className="w-full bg-white border-2 border-slate-100 rounded-2xl px-6 py-4 font-black text-4xl text-slate-900 outline-none focus:border-brand-blue/30 transition-all tabular-nums" 
                    />
                    <p className="text-[9px] font-black text-slate-400 mt-4 uppercase tracking-widest opacity-60">Padronizado para o dia 10 se vazio.</p>
                  </div>

                  <div className="bg-slate-50/50 p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm">
                    <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-1">
                      <Percent size={12} /> Acordo de Desconto (%)
                    </label>
                    <input 
                      type="number" 
                      min="0" 
                      max="100"
                      value={formData.personalDiscount || ''} 
                      onChange={e => setFormData({...formData, personalDiscount: parseFloat(e.target.value) || 0})}
                      className="w-full bg-white border-2 border-slate-100 rounded-2xl px-6 py-4 font-black text-4xl text-slate-900 outline-none focus:border-brand-blue/30 transition-all tabular-nums" 
                    />
                    <div className="mt-6 flex items-center gap-3">
                      <input 
                        type="checkbox" 
                        id="timely"
                        checked={formData.hasTimelyPaymentDiscount}
                        onChange={e => setFormData({...formData, hasTimelyPaymentDiscount: e.target.checked})}
                        className="w-5 h-5 rounded-lg border-2 border-slate-200 accent-brand-blue cursor-pointer"
                      />
                      <label htmlFor="timely" className="text-[10px] font-black text-slate-500 uppercase tracking-widest cursor-pointer select-none">Válido até o Vencimento</label>
                    </div>
                  </div>

                  <div className="bg-slate-50/50 p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm">
                    <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-1">
                      <StickyNote size={12} /> Notas Estratégicas
                    </label>
                    <textarea 
                      rows={4}
                      value={formData.personalDiscountNote}
                      onChange={e => setFormData({...formData, personalDiscountNote: e.target.value})}
                      placeholder="Ex: Aluno de funcionário, Acordo de diretoria..."
                      className="w-full bg-white border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-600 outline-none focus:border-brand-blue/30 transition-all resize-none shadow-inner"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>

        {/* Footer Actions */}
        <div className="p-8 md:p-10 border-t-2 border-slate-100 bg-slate-50/50 flex justify-end gap-6 sticky bottom-0 z-10">
          <button 
            type="button"
            onClick={onClose} 
            className="px-10 py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] text-slate-400 hover:bg-slate-200 transition-all"
          >
            Abortar
          </button>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSubmit}
            disabled={isSaving}
            className={cn(
              "flex items-center gap-4 px-16 py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl transition-all",
              isSaving ? "bg-slate-400 cursor-not-allowed" : "bg-slate-900 text-white shadow-slate-900/30 hover:bg-black"
            )}
          >
            {isSaving ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save size={20} className="text-brand-lime" />
            )}
            {student ? 'Sincronizar Perfil' : 'Efetivar Cadastro'}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
