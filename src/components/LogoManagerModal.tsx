import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Upload, Trash2, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import { finance } from '../services/finance';

interface LogoManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LogoManagerModal: React.FC<LogoManagerModalProps> = ({ isOpen, onClose }) => {
  const [logo, setLogo] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const loadLogo = async () => {
      const currentLogo = await finance.getLogo();
      setLogo(currentLogo);
    };
    if (isOpen) loadLogo();
  }, [isOpen]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      await finance.saveLogo(base64);
      setLogo(base64);
      setIsUploading(false);
      showToast('Logo atualizada com sucesso!');
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = async () => {
    if (window.confirm('Deseja realmente remover a logo do sistema?')) {
      await finance.saveLogo(null);
      setLogo(null);
      showToast('Logo removida');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl relative overflow-hidden z-10"
      >
        {/* Header */}
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-brand-blue/10 rounded-xl flex items-center justify-center text-brand-blue shadow-sm">
              <ImageIcon size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800 uppercase tracking-widest">Logo do Sistema</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Personalização da Marca</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8">
          <div className="flex flex-col items-center gap-6">
            <div className="w-48 h-48 rounded-[3rem] bg-slate-50 border-4 border-dashed border-slate-200 flex flex-col items-center justify-center p-4 relative overflow-hidden group shadow-inner">
              {logo ? (
                <img src={logo} alt="Logo Preview" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
              ) : (
                <div className="text-center">
                  <ImageIcon className="text-slate-200 mx-auto mb-2" size={48} />
                  <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Sem Logo</p>
                </div>
              )}
              {isUploading && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-brand-blue border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            <div className="text-center">
              <h3 className="font-bold text-slate-700 text-base mb-1 uppercase tracking-widest">Alterar Identidade</h3>
              <p className="text-[11px] text-slate-400 font-medium max-w-[250px]">Selecione uma imagem quadrada (PNG/JPG) de alta resolução.</p>
            </div>

            <div className="flex flex-col w-full gap-3">
              <label className="w-full bg-brand-blue hover:bg-brand-dark text-white px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-xs cursor-pointer transition-all shadow-lg shadow-brand-blue/20 flex items-center justify-center gap-3 active:scale-95">
                <Upload size={18} /> 
                {logo ? 'Trocar Imagem' : 'Selecionar Imagem'}
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              </label>
              
              {logo && (
                <button 
                  onClick={removeLogo} 
                  className="w-full bg-red-50 text-red-600 hover:bg-red-100 px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-colors flex items-center justify-center gap-3"
                >
                  <Trash2 size={18} /> Remover Logo Atual
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
            A logo será atualizada instantaneamente em todos os menus e relatórios do sistema.
          </p>
        </div>

        {/* Toast */}
        <AnimatePresence>
          {toast && (
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold shadow-xl flex items-center gap-2 z-50 whitespace-nowrap"
            >
              <CheckCircle2 size={18} />
              {toast}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
