import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

/** 
 * Brand-aligned palette — no purples per design rules.
 * Uses brand-blue, brand-orange, brand-lime + neutral tones.
 */
const COLORS = [
  '#1f4687', // brand-blue
  '#f27205', // brand-orange
  '#84cc16', // brand-lime
  '#0ea5e9', // sky-500
  '#f59e0b', // amber-500
  '#10b981', // emerald-500
  '#ef4444', // red-500
  '#64748b', // slate-500
];

interface Props {
  /** Record of category name → occurrence count */
  data: Record<string, number>;
  title?: string;
}

interface LabelProps {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
  name: string;
}

const RADIAN = Math.PI / 180;

function renderCustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: LabelProps) {
  if (percent < 0.06) return null; // skip tiny slices
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central"
      fontSize={11} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

export default function CategoryPieChart({ data, title = 'Distribuição por Categoria' }: Props) {
  const entries = Object.entries(data)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const total = entries.reduce((s, e) => s + e.value, 0);

  if (entries.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-300 text-sm font-bold">
        Nenhum dado disponível
      </div>
    );
  }

  return (
    <div className="w-full">
      {title && (
        <h3 className="text-[10px] font-black text-brand-blue uppercase tracking-widest mb-4">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={entries}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomLabel as any}
            outerRadius={100}
            dataKey="value"
          >
            {entries.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number, name: string) => [
              `${value} aparições (${((value / total) * 100).toFixed(1)}%)`,
              name,
            ]}
            contentStyle={{
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              fontSize: '12px',
              fontWeight: 700,
            }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(value) => (
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
