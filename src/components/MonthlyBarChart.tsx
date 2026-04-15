import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from 'recharts';

interface MonthEntry {
  /** Short label, e.g. "Abr" */
  mes: string;
  /** Number of planned days */
  dias: number;
}

interface Props {
  data: MonthEntry[];
  title?: string;
}

export default function MonthlyBarChart({ data, title = 'Dias Planejados por Mês' }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-300 text-sm font-bold">
        Nenhum histórico disponível
      </div>
    );
  }

  return (
    <div className="w-full">
      {title && (
        <h3 className="text-[10px] font-black text-brand-blue uppercase tracking-widest mb-4">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 12, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="mes"
            tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value: number) => [`${value} dias`, 'Planejados']}
            contentStyle={{
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              fontSize: '12px',
              fontWeight: 700,
            }}
            cursor={{ fill: '#f8fafc' }}
          />
          <Bar dataKey="dias" fill="#1f4687" radius={[6, 6, 0, 0]} maxBarSize={48}>
            <LabelList
              dataKey="dias"
              position="top"
              style={{ fontSize: 11, fontWeight: 700, fill: '#1f4687' }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
