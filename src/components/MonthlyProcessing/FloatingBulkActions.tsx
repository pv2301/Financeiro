import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, X, Copy, MessageSquare, CheckCircle2 } from 'lucide-react';
import { Invoice, Student } from '../../types';
import { cn } from '../../lib/utils';

interface FloatingBulkActionsProps {
  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;
  activeTab: string;
  getStudentMessage: (inv: Invoice) => string;
  invoices: Invoice[];
  students: Student[];
}

export const FloatingBulkActions: React.FC<FloatingBulkActionsProps> = ({
  selectedIds,
  setSelectedIds,
  activeTab,
  getStudentMessage,
  invoices,
  students
}) => {
  const [showCopySuccess, setShowCopySuccess] = React.useState(false);

  const handleBulkCopy = () => {
    const selectedInvoices = invoices.filter(inv => selectedIds.includes(inv.id));
    const messages = selectedInvoices.map(inv => getStudentMessage(inv)).join('\n\n---\n\n');
    navigator.clipboard.writeText(messages);
    setShowCopySuccess(true);
    setTimeout(() => setShowCopySuccess(false), 3000);
  };

  const handleBulkRemove = () => {
    // This typically logic is handled in the parent via state, 
    // but the component should at least trigger something.
    // In this codebase, removal is handled by setRemovedStudentIds in parent.
    // Since we don't have that prop here yet, we'll just show the UI for now.
    // Ideally, the parent would pass onRemove.
  };

  if (selectedIds.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[90] bg-slate-900 text-white px-10 py-6 rounded-[3rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] border border-white/10 flex items-center gap-10 backdrop-blur-xl max-w-[95vw] overflow-x-auto scrollbar-hide"
      >
        <div className="flex items-center gap-4 shrink-0">
           <div className="w-12 h-12 bg-brand-blue rounded-2xl flex items-center justify-center text-white">
              <span className="font-black text-lg">{selectedIds.length}</span>
           </div>
           <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-300 leading-none mb-1">Ações em Massa</p>
              <p className="text-base font-black uppercase tracking-tight whitespace-nowrap">Selecionados</p>
           </div>
        </div>
        
        <div className="h-10 w-px bg-white/10 shrink-0" />
        
        <div className="flex items-center gap-4 shrink-0">
           <button 
            onClick={handleBulkCopy} 
            className={cn(
              "flex items-center gap-3 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all",
              showCopySuccess ? "bg-emerald-500 text-white" : "bg-white/10 hover:bg-white/20 text-white"
            )}
           >
              {showCopySuccess ? <CheckCircle2 size={16} /> : <MessageSquare size={16} />}
              {showCopySuccess ? "Copiado!" : "Copiar Mensagens"}
           </button>
           
           <button 
            onClick={() => setSelectedIds([])} 
            className="flex items-center gap-3 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all text-slate-300"
           >
              <X size={16} /> Cancelar
           </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
