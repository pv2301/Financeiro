import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Trash2, Info, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const VARIANTS = {
  danger:  { bg: 'bg-red-50',    text: 'text-red-600',    btn: 'bg-red-500 hover:bg-red-600',    Icon: Trash2 },
  warning: { bg: 'bg-amber-50',  text: 'text-amber-600',  btn: 'bg-amber-500 hover:bg-amber-600', Icon: AlertTriangle },
  info:    { bg: 'bg-sky-50',    text: 'text-sky-600',    btn: 'bg-sky-500 hover:bg-sky-600',     Icon: Info },
};

export default function ConfirmDialog({ isOpen, title, message, confirmLabel = 'Confirmar', variant = 'danger', onConfirm, onCancel, isLoading }: Props) {
  const v = VARIANTS[variant];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center px-4"
          onClick={isLoading ? undefined : onCancel}>
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={e => e.stopPropagation()}>
            <div className="p-6 space-y-4">
              <div className={`w-14 h-14 ${v.bg} rounded-2xl flex items-center justify-center mx-auto`}>
                <v.Icon size={28} className={v.text} />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-black text-slate-800">{title}</h3>
                <p className="text-sm text-slate-500 mt-2 leading-relaxed whitespace-pre-line">{message}</p>
              </div>
            </div>
            <div className="flex gap-3 p-6 pt-0">
              <button onClick={onCancel}
                disabled={isLoading}
                className="flex-1 px-5 py-3 rounded-2xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50">
                Cancelar
              </button>
              <button onClick={onConfirm}
                disabled={isLoading}
                className={`flex-1 px-5 py-3 rounded-2xl font-black text-white ${v.btn} transition-colors shadow-lg flex items-center justify-center gap-2 disabled:opacity-50`}>
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
