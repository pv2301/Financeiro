import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X as XIcon, Settings, Info } from 'lucide-react';
import { finance } from '../../services/finance';

interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  messageTemplates: {
    fixed: string;
    consumption: string;
    integral: string;
  };
  setMessageTemplates: React.Dispatch<React.SetStateAction<{
    fixed: string;
    consumption: string;
    integral: string;
  }>>;
  setToast: (msg: string | null) => void;
}

export const TemplateModal: React.FC<TemplateModalProps> = ({
  isOpen,
  onClose,
  messageTemplates,
  setMessageTemplates,
  setToast,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
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
                onClick={onClose}
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
                  {["{STUDENT_NAME}", "{CLASS_NAME}", "{MONTH_YEAR}", "{MANDATORY_SNACK}", "{CONSUMPTION}", "{ABSENCES}"].map(p => (
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
                onClick={onClose}
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
                    setToast("Templates salvos com sucesso!");
                    setTimeout(() => setToast(null), 3000);
                    onClose();
                  } catch (error) {
                    console.error(error);
                    setToast("Erro ao salvar templates");
                  }
                }}
                className="px-10 py-4 bg-brand-blue text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-brand-blue/30 hover:scale-105 transition-transform"
              >
                Salvar Templates
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
