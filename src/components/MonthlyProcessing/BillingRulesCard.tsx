import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, CheckCircle2, AlertCircle, Zap, Clock, User, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';

interface BillingRulesCardProps {
  activeTab: 'fixed' | 'consumption' | 'integral';
}

export const BillingRulesCard: React.FC<BillingRulesCardProps> = ({ activeTab }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const rules = {
    fixed: {
      title: "Mensalidade Fixa (Pré-pago)",
      description: "Faturamento baseado no valor fixo da turma/aluno ajustado pelos dias letivos do mês.",
      items: [
        { label: "Desconto de Faltas", type: "IMEDIATO", detail: "Subtraído do valor líquido se configurado como pré-pago.", icon: AlertCircle },
        { label: "Desconto Pessoal", type: "PONTUALIDADE", detail: "Informativo. Válido apenas se pago até o vencimento.", icon: Clock },
      ]
    },
    consumption: {
      title: "Consumo de Cantina (Pós-pago)",
      description: "Faturamento baseado nos itens consumidos no mês anterior.",
      items: [
        { label: "Desconto Combo (10%)", type: "IMEDIATO", detail: "Prioritário. Aplicado se houver > 1 serviço. Reduz o valor líquido.", icon: Zap },
        { label: "Desconto Pessoal", type: "PONTUALIDADE", detail: "Secundário. Aplicado apenas se NÃO houver Combo. Informativo.", icon: Clock },
        { label: "Tabela de Preços", type: "BERÇÁRIO", detail: "Preços baseados exclusivamente na idade da criança (Tabela Berçário).", icon: User },
      ]
    },
    integral: {
      title: "Serviços e Integral",
      description: "Faturamento de serviços avulsos ou mensais do período integral.",
      items: [
        { label: "Valor dos Serviços", type: "BRUTO", detail: "Soma total dos itens adicionados.", icon: Info },
        { label: "Desconto Pessoal", type: "PONTUALIDADE", detail: "Informativo. Válido apenas se pago até o vencimento.", icon: Clock },
      ]
    }
  };

  const current = rules[activeTab] || rules.fixed;

  return (
    <div className="px-6 py-2">
      <div className="bg-white/40 backdrop-blur-sm border border-slate-200/60 rounded-2xl overflow-hidden transition-all shadow-sm">
        {/* Header Toggle */}
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50/50 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-900 rounded-xl flex items-center justify-center text-brand-lime shadow-lg">
              <BookOpen size={16} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">REGRAS</span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">— {current.title}</span>
            </div>
          </div>
          <div className={isExpanded ? "text-brand-blue" : "text-slate-300 group-hover:text-slate-500"}>
            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
        </button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <div className="px-5 pb-6 pt-2 border-t border-slate-100/50">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6 opacity-70">
                  {current.description}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {current.items.map((item, idx) => (
                    <div key={idx} className="flex gap-4 p-3 rounded-xl hover:bg-slate-50/50 transition-all border border-transparent hover:border-slate-100">
                      <div className={`mt-1 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        item.type === 'IMEDIATO' ? 'bg-brand-lime/10 text-brand-lime' : 
                        item.type === 'PONTUALIDADE' ? 'bg-amber-500/10 text-amber-500' : 
                        item.type === 'BERÇÁRIO' ? 'bg-purple-500/10 text-purple-500' : 'bg-slate-100 text-slate-400'
                      }`}>
                        <item.icon size={16} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[11px] font-black text-slate-900 uppercase tracking-widest">{item.label}</span>
                          <span className={`text-[8px] font-black px-2 py-0.5 rounded-full tracking-tighter ${
                            item.type === 'IMEDIATO' ? 'bg-brand-lime/20 text-brand-lime' : 
                            item.type === 'PONTUALIDADE' ? 'bg-amber-500/20 text-amber-500' : 
                            item.type === 'BERÇÁRIO' ? 'bg-purple-500/20 text-purple-500' : 'bg-slate-200 text-slate-500'
                          }`}>
                            {item.type}
                          </span>
                        </div>
                        <p className="text-[10px] font-medium text-slate-500 leading-relaxed uppercase tracking-tight">
                          {item.detail}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
