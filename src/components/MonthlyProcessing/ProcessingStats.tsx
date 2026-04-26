import React from 'react';
import { 
  TrendingUp, 
  Receipt, 
  Users, 
  Activity,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { formatCurrencyBRL, cn } from '../../lib/utils';

interface ProcessingStatsProps {
  totalGross: number;
  totalNet: number;
  totalCollege: number;
  count: number;
  saveStatus: "saved" | "saving" | "idle";
}

export const ProcessingStats: React.FC<ProcessingStatsProps> = ({
  totalGross,
  totalNet,
  totalCollege,
  count,
  saveStatus
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
      {[
        { 
          label: 'Volume Bruto', 
          value: formatCurrencyBRL(totalGross), 
          icon: TrendingUp, 
          color: 'text-slate-900', 
          bg: 'bg-white', 
          accent: 'bg-slate-900',
          sub: 'Total sem descontos'
        },
        { 
          label: 'Receita Líquida', 
          value: formatCurrencyBRL(totalNet), 
          icon: Receipt, 
          color: 'text-brand-blue', 
          bg: 'bg-brand-blue/5', 
          accent: 'bg-brand-blue',
          sub: 'Previsão de entrada'
        },
        { 
          label: 'Taxa de Repasse', 
          value: formatCurrencyBRL(totalCollege), 
          icon: Activity, 
          color: 'text-indigo-600', 
          bg: 'bg-indigo-50/50', 
          accent: 'bg-indigo-500',
          sub: 'Comissão institucional'
        },
        { 
          label: 'Lote Atual', 
          value: `${count} Itens`, 
          icon: Users, 
          color: 'text-emerald-600', 
          bg: 'bg-emerald-50/50', 
          accent: 'bg-emerald-500',
          sub: saveStatus === 'saving' ? 'Salvando...' : saveStatus === 'saved' ? 'Sincronizado' : 'Aguardando ação'
        },
      ].map((stat, i) => (
        <div 
          key={i}
          className={cn(
            "p-10 rounded-[3.5rem] border border-slate-100 shadow-xl shadow-slate-200/30 relative overflow-hidden group transition-all hover:shadow-2xl",
            stat.bg
          )}
        >
          <div className={cn("absolute top-0 left-0 w-2 h-full opacity-20", stat.accent)} />
          <div className="flex items-center gap-3 mb-6">
             <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center opacity-20", stat.accent)}>
                <stat.icon size={20} className={stat.color} />
             </div>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{stat.label}</p>
          </div>
          <div className="flex flex-col">
            <p className={cn("text-3xl font-black tracking-tighter leading-none mb-3", stat.color)}>{stat.value}</p>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest opacity-60">{stat.sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
