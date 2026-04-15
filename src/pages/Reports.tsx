import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Printer,
  Trophy,
  Calendar,
  Layers,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, addMonths, parseISO, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { storage } from '../services/storage';
import { computeMenuAnalytics } from '../services/shoppingCalculator';
import { Item, MenuDay, MenuAnalytics } from '../types';
import CategoryPieChart from '../components/CategoryPieChart';
import MonthlyBarChart from '../components/MonthlyBarChart';
import { cn } from '../lib/utils';

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}

function StatCard({ icon: Icon, label, value, sub, accent = 'brand-blue' }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-start gap-4 shadow-sm">
      <div className={`p-3 rounded-xl bg-${accent}/10 shrink-0`}>
        <Icon size={20} className={`text-${accent}`} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
        <p className="text-2xl font-black text-brand-blue leading-tight">{value}</p>
        {sub && <p className="text-xs text-slate-400 font-medium mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function Reports() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [menuDays,  setMenuDays]  = useState<MenuDay[]>([]);
  const [items,     setItems]     = useState<Item[]>([]);
  const [logo,      setLogo]      = useState<string | null>(null);
  const [nutri,     setNutri]     = useState<{ nome: string; crn: string }>({ nome: '', crn: '' });

  useEffect(() => {
    (async () => {
      const [menuData, itemsData, logoData, nutData] = await Promise.all([
        storage.getMenu(),
        storage.getItems(),
        storage.getLogo(),
        storage.getNutricionista(),
      ]);
      setMenuDays(menuData);
      setItems(itemsData);
      setLogo(logoData);
      setNutri(nutData);
    })();
  }, []);

  // ── Filtered days for currently selected month ─────────────────────────────
  const monthYear = format(currentDate, 'yyyy-MM');
  const monthStart = startOfMonth(currentDate);
  const monthEnd   = endOfMonth(currentDate);

  const currentMonthDays = useMemo(
    () =>
      menuDays.filter(d => {
        try {
          const date = parseISO(d.data);
          return isWithinInterval(date, { start: monthStart, end: monthEnd }) && !d.isFeriado;
        } catch {
          return false;
        }
      }),
    [menuDays, monthYear]
  );

  // ── Analytics for selected month ───────────────────────────────────────────
  const analytics: MenuAnalytics = useMemo(
    () => computeMenuAnalytics(currentMonthDays, items, monthYear),
    [currentMonthDays, items, monthYear]
  );

  // ── Historical bar chart: last 6 months ────────────────────────────────────
  const historicalData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d  = subMonths(currentDate, 5 - i);
      const my = format(d, 'yyyy-MM');
      const s  = startOfMonth(d);
      const e  = endOfMonth(d);
      const dias = menuDays.filter(day => {
        try {
          return isWithinInterval(parseISO(day.data), { start: s, end: e }) && !day.isFeriado;
        } catch { return false; }
      }).length;
      return { mes: format(d, 'MMM', { locale: ptBR }), dias };
    });
  }, [menuDays, monthYear]);

  // ── Print ──────────────────────────────────────────────────────────────────
  const handlePrint = () => window.print();

  const monthLabel = format(currentDate, 'MMMM yyyy', { locale: ptBR }).toUpperCase();
  const totalCategories = Object.keys(analytics.categoriaDistribuicao).length;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 w-full space-y-6 print:p-0">

      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-black text-brand-blue uppercase tracking-tight">Relatórios</h1>
          <p className="text-slate-500 font-medium">Analytics nutricional do cardápio.</p>
        </div>
        <button
          id="btn-imprimir-relatorio"
          onClick={handlePrint}
          className="bg-white hover:bg-slate-50 text-brand-blue border border-slate-200 px-6 py-3 rounded-2xl flex items-center gap-2 shadow-sm font-black text-sm uppercase tracking-widest transition-all"
        >
          <Printer size={18} />
          Imprimir
        </button>
      </div>

      {/* ── MONTH SELECTOR ── */}
      <div className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm flex items-center justify-between">
        <button
          onClick={() => setCurrentDate(d => subMonths(d, 1))}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          <ChevronLeft size={22} className="text-brand-blue" />
        </button>
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-brand-blue/5 rounded-xl">
            <Calendar size={20} className="text-brand-blue" />
          </div>
          <h2 className="text-xl font-black text-brand-blue uppercase tracking-tight">{monthLabel}</h2>
        </div>
        <button
          onClick={() => setCurrentDate(d => addMonths(d, 1))}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          <ChevronRight size={22} className="text-brand-blue" />
        </button>
      </div>

      {/* ── SCREEN REPORT AREA ── */}
      <div className="print:hidden">

        {/* ── STAT CARDS ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <StatCard
            icon={Calendar}
            label="Dias Planejados"
            value={analytics.totalDias}
            sub={`em ${monthLabel}`}
          />
          <StatCard
            icon={Layers}
            label="Categorias"
            value={totalCategories}
            sub="categorias distintas"
            accent="brand-orange"
          />
          <StatCard
            icon={Trophy}
            label="Mais Servido"
            value={analytics.topItens[0]?.nome ?? '—'}
            sub={analytics.topItens[0] ? `${analytics.topItens[0].aparicoes}× no mês` : 'Sem dados'}
            accent="brand-lime"
          />
        </div>

        {/* ── ALERTS ── */}
        {analytics.alertas.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6 shadow-sm space-y-3">
            <h3 className="text-[10px] font-black text-brand-blue uppercase tracking-widest flex items-center gap-2">
              <AlertTriangle size={14} className="text-brand-orange" />
              Alertas Nutricionais
            </h3>
            {analytics.alertas.map((alerta, i) => (
              <div
                key={i}
                className="flex items-start gap-3 bg-brand-orange/5 border border-brand-orange/10 rounded-xl p-3"
              >
                <AlertTriangle size={14} className="text-brand-orange shrink-0 mt-0.5" />
                <p className="text-sm text-slate-700 font-medium">{alerta}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── CHARTS ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <CategoryPieChart
              data={analytics.categoriaDistribuicao}
              title="Distribuição por Categoria"
            />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <MonthlyBarChart
              data={historicalData}
              title="Dias Planejados — Últimos 6 Meses"
            />
          </div>
        </div>

        {/* ── TOP ITENS ── */}
        {analytics.topItens.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-6">
            <h3 className="text-[10px] font-black text-brand-blue uppercase tracking-widest mb-4 flex items-center gap-2">
              <TrendingUp size={14} className="text-brand-lime" />
              Top {analytics.topItens.length} Alimentos do Mês
            </h3>
            <div className="space-y-3">
              {analytics.topItens.map((item, i) => {
                const max = analytics.topItens[0].aparicoes;
                const pct = Math.round((item.aparicoes / max) * 100);
                return (
                  <div key={item.nome} className="flex items-center gap-3">
                    <span className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black shrink-0',
                      i === 0 ? 'bg-brand-lime text-white' :
                      i === 1 ? 'bg-brand-blue text-white' :
                      i === 2 ? 'bg-brand-orange text-white' :
                      'bg-slate-100 text-slate-500'
                    )}>
                      {i + 1}
                    </span>
                    <span className="text-sm font-bold text-slate-800 min-w-[120px] shrink-0">{item.nome}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full bg-brand-blue transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-sm font-black text-brand-blue tabular-nums shrink-0 w-12 text-right">
                      {item.aparicoes}×
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── EMPTY STATE ── */}
        {analytics.totalDias === 0 && (
          <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <BarChart3 size={36} className="text-slate-200" />
            </div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Sem dados para este mês</h3>
            <p className="text-slate-500 mt-1">Planeje o cardápio deste mês para ver os relatórios.</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-slate-200 flex justify-between text-xs text-slate-400 font-medium">
          <span>{nutri.nome}{nutri.crn ? ` — CRN ${nutri.crn}` : ''}</span>
          <span>Cardápio Baby — {monthLabel}</span>
        </div>
      </div>

      {/* ── PRINT TEMPLATE ── */}
      <div className="hidden print:block text-[11px]">
        <div style={{ backgroundColor: '#1e40af', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ color: 'white' }}>
            <div style={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', opacity: 0.8 }}>Cardápio Baby</div>
            <div style={{ fontSize: '18px', fontWeight: '900', textTransform: 'uppercase', lineHeight: '1.1' }}>Relatório Nutricional</div>
            <div style={{ fontSize: '11px', opacity: 0.9 }}>{monthLabel}</div>
          </div>
          {logo && <img src={logo} alt="logo" style={{ maxHeight: '48px', objectFit: 'contain' }} />}
          <div style={{ color: 'white', textAlign: 'right' }}>
            <div style={{ fontWeight: 'bold' }}>{nutri.nome}</div>
            {nutri.crn && <div style={{ fontSize: '10px' }}>CRN {nutri.crn}</div>}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
          <div style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px' }}>
            <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase' }}>Dias Planejados</div>
            <div style={{ fontSize: '22px', fontWeight: '900', color: '#1e40af' }}>{analytics.totalDias}</div>
          </div>
          <div style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px' }}>
            <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase' }}>Categorias</div>
            <div style={{ fontSize: '22px', fontWeight: '900', color: '#1e40af' }}>{Object.keys(analytics.categoriaDistribuicao).length}</div>
          </div>
          <div style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px' }}>
            <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase' }}>Mais Servido</div>
            <div style={{ fontSize: '14px', fontWeight: '900', color: '#1e40af' }}>{analytics.topItens[0]?.nome ?? '—'}</div>
          </div>
        </div>

        {/* Top items table */}
        {analytics.topItens.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginBottom: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: '#404040', color: 'white' }}>
                <th style={{ padding: '6px 8px', textAlign: 'left', border: '1px solid #ccc' }}>#</th>
                <th style={{ padding: '6px 8px', textAlign: 'left', border: '1px solid #ccc' }}>Alimento</th>
                <th style={{ padding: '6px 8px', textAlign: 'center', border: '1px solid #ccc' }}>Aparições</th>
                <th style={{ padding: '6px 8px', textAlign: 'left', border: '1px solid #ccc' }}>Categoria</th>
              </tr>
            </thead>
            <tbody>
              {analytics.topItens.map((item, i) => (
                <tr key={item.nome} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                  <td style={{ padding: '4px 8px', border: '1px solid #eee', fontWeight: 'bold' }}>{i + 1}</td>
                  <td style={{ padding: '4px 8px', border: '1px solid #eee' }}>{item.nome}</td>
                  <td style={{ padding: '4px 8px', border: '1px solid #eee', textAlign: 'center' }}>{item.aparicoes}×</td>
                  <td style={{ padding: '4px 8px', border: '1px solid #eee' }}>{item.categoria}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '9px', color: '#666', borderTop: '1px solid #ccc', paddingTop: '6px' }}>
          <span>{nutri.nome}{nutri.crn ? ` — Nutricionista — CRN ${nutri.crn}` : ''}</span>
          <span>Cardápio Baby — {monthLabel}</span>
        </div>
      </div>
    </div>
  );
}
