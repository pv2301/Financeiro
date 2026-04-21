import React from 'react';
import { motion } from 'motion/react';
import { Receipt } from 'lucide-react';

export default function Invoices() {
  return (
    <div className="p-8 pb-24 max-w-7xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
            <Receipt size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800">Painel Financeiro</h1>
            <p className="text-slate-500 font-medium">Controle de boletos, baixas e inadimplência</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
