import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  Printer,
  Share2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from 'lucide-react';
import {
  format,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  isWithinInterval,
  parseISO,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { storage } from '../services/storage';
import {
  calculateShoppingList,
  getDefaultUnit,
  getDefaultPortion,
  formatQuantity,
  MARKET_CATEGORY_ORDER,
} from '../services/shoppingCalculator';
import {
  MenuDay,
  Item,
  Recipe,
  GroupConfig,
  GroupCapacity,
  ShoppingItem,
  UnitType,
} from '../types';
import { cn } from '../lib/utils';

const UNIT_OPTIONS: { value: UnitType; label: string }[] = [
  { value: 'kg',     label: 'kg'     },
  { value: 'g',      label: 'g'      },
  { value: 'un',     label: 'un'     },
  { value: 'L',      label: 'L'      },
  { value: 'ml',     label: 'ml'     },
  { value: 'cx',     label: 'cx'     },
  { value: 'pct',    label: 'pct'    },
  { value: 'porcao', label: 'porção' },
];

export default function ShoppingList() {
  // ── Period state ───────────────────────────────────────────────────────────
  const [periodMode, setPeriodMode] = useState<'semanal' | 'mensal' | 'personalizado'>('semanal');
  const [startDate, setStartDate]   = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [endDate,   setEndDate]     = useState(endOfWeek(new Date(),   { weekStartsOn: 1 }));
  const [customStart, setCustomStart] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [customEnd,   setCustomEnd]   = useState(format(new Date(), 'yyyy-MM-dd'));

  // ── Data ───────────────────────────────────────────────────────────────────
  const [menuDays,    setMenuDays]    = useState<MenuDay[]>([]);
  const [items,       setItems]       = useState<Item[]>([]);
  const [recipes,     setRecipes]     = useState<Recipe[]>([]);
  const [groups,      setGroups]      = useState<GroupConfig[]>([]);
  const [capacities,  setCapacities]  = useState<GroupCapacity[]>([]);
  const [logo,        setLogo]        = useState<string | null>(null);
  const [nutricionista, setNutricionista] = useState<{ nome: string; crn: string }>({ nome: '', crn: '' });

  // Per-item portion overrides: { itemId: { unitType, portionSize } }
  const [portionOverrides, setPortionOverrides] = useState<Record<string, { unitType: UnitType; portionSize: number }>>({});

  // ── UI state ───────────────────────────────────────────────────────────────
  const [checkedItems,    setCheckedItems]    = useState<Set<string>>(new Set());
  const [openCategories,  setOpenCategories]  = useState<Set<string>>(new Set([MARKET_CATEGORY_ORDER[0]]));

  // ── Load data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('print') === '1') {
      setTimeout(() => window.print(), 600);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const [menuData, itemsData, recipesData, groupsData, logoData, nutData] = await Promise.all([
        storage.getMenu(),
        storage.getItems(),
        storage.getRecipes(),
        storage.getConfig(),
        storage.getLogo(),
        storage.getNutricionista(),
      ]);
      let caps: GroupCapacity[]  = [];
      let portions: Record<string, { unitType: UnitType; portionSize: number }> = {};
      try { caps    = await storage.getGroupCapacities(); } catch (_) { /* ignore */ }
      try { portions = await storage.getItemPortions();   } catch (_) { /* ignore */ }

      setMenuDays(menuData);
      setItems(itemsData);
      setRecipes(recipesData);
      setGroups(groupsData);
      setCapacities(caps);
      setPortionOverrides(portions);
      setLogo(logoData);
      setNutricionista(nutData);
    })();
  }, []);

  // ── Period navigation ──────────────────────────────────────────────────────
  const effectiveStart = periodMode === 'personalizado' && customStart ? parseISO(customStart) : startDate;
  const effectiveEnd   = periodMode === 'personalizado' && customEnd   ? parseISO(customEnd)   : endDate;

  const handlePrevPeriod = () => {
    if (periodMode === 'semanal') {
      setStartDate(subWeeks(startDate, 1));
      setEndDate(subWeeks(endDate, 1));
    } else if (periodMode === 'mensal') {
      const prev = subMonths(startDate, 1);
      setStartDate(startOfMonth(prev));
      setEndDate(endOfMonth(prev));
    }
  };

  const handleNextPeriod = () => {
    if (periodMode === 'semanal') {
      setStartDate(addWeeks(startDate, 1));
      setEndDate(addWeeks(endDate, 1));
    } else if (periodMode === 'mensal') {
      const next = addMonths(startDate, 1);
      setStartDate(startOfMonth(next));
      setEndDate(endOfMonth(next));
    }
  };

  const periodLabel =
    periodMode === 'mensal'
      ? format(startDate, 'MMMM yyyy', { locale: ptBR }).toUpperCase()
      : `${format(effectiveStart, 'dd/MM')} — ${format(effectiveEnd, 'dd/MM')}`;

  // ── Calculate smart shopping list ─────────────────────────────────────────
  const filteredDays = useMemo(
    () =>
      menuDays.filter(day => {
        const d = parseISO(day.data);
        return !day.isFeriado && isWithinInterval(d, { start: effectiveStart, end: effectiveEnd });
      }),
    [menuDays, effectiveStart, effectiveEnd]
  );

  const shoppingList: ShoppingItem[] = useMemo(
    () =>
      calculateShoppingList({
        menuDays: filteredDays,
        items,
        recipes,
        groups,
        capacities,
        portionOverrides,
      }),
    [filteredDays, items, recipes, groups, capacities, portionOverrides]
  );

  // Group by market category, preserving order
  const byMarketCategory = useMemo(() => {
    const map = new Map<string, ShoppingItem[]>();
    for (const cat of MARKET_CATEGORY_ORDER) map.set(cat, []);
    for (const item of shoppingList) {
      const cat = item.marketCategory;
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(item);
    }
    // Remove empty categories
    for (const [cat, arr] of map) if (arr.length === 0) map.delete(cat);
    return map;
  }, [shoppingList]);

  const totalItems   = shoppingList.length;
  const checkedCount = checkedItems.size;

  // ── Warnings ───────────────────────────────────────────────────────────────
  const groupsWithoutCapacity = groups.filter(
    g => !capacities.find(c => c.groupId === g.id && c.childrenCount > 0)
  );

  // ── Per-item portion override ──────────────────────────────────────────────
  const updatePortion = useCallback(
    async (itemId: string, field: 'unitType' | 'portionSize', value: UnitType | number) => {
      const item = items.find(i => i.id === itemId);
      if (!item) return;
      const prev = portionOverrides[itemId] ?? {
        unitType:    item.unitType    ?? getDefaultUnit(item.categoria),
        portionSize: item.portionSize ?? getDefaultPortion(item.categoria),
      };
      const next = { ...portionOverrides, [itemId]: { ...prev, [field]: value } };
      setPortionOverrides(next);
      await storage.saveItemPortions(next);
    },
    [portionOverrides, items]
  );

  // ── Check toggle ───────────────────────────────────────────────────────────
  const toggleItem = (id: string) => {
    const next = new Set(checkedItems);
    if (next.has(id)) next.delete(id); else next.add(id);
    setCheckedItems(next);
  };

  // ── Accordion ──────────────────────────────────────────────────────────────
  const toggleCategory = (cat: string) => {
    const next = new Set(openCategories);
    if (next.has(cat)) next.delete(cat); else next.add(cat);
    setOpenCategories(next);
  };

  // ── Share ──────────────────────────────────────────────────────────────────
  const handleShare = () => {
    const lines: string[] = [`🛒 *Lista de Compras — ${periodLabel}*\n`];
    for (const [cat, catItems] of byMarketCategory) {
      lines.push(`*${cat}*`);
      catItems.forEach(it => {
        const qty    = formatQuantity(it.quantidadeTotal, it.unitType);
        const check  = checkedItems.has(it.itemId) ? '✅' : '☐';
        lines.push(`  ${check} ${it.nome} — ${qty}`);
      });
      lines.push('');
    }
    const text = lines.join('\n');
    navigator.clipboard.writeText(text).then(() => {
      const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
    });
  };

  // ── Print data (keep legacy table format) ─────────────────────────────────
  const printItems = useMemo(() => {
    const result: { nome: string; quantidade: string; categoria: string; marketCategory: string }[] = [];
    for (const item of shoppingList) {
      result.push({
        nome: item.nome,
        quantidade: formatQuantity(item.quantidadeTotal, item.unitType),
        categoria: item.categoria,
        marketCategory: item.marketCategory,
      });
    }
    return result;
  }, [shoppingList]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 w-full space-y-6 print:p-0">

      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-black text-brand-blue uppercase tracking-tight">Lista de Compras</h1>
          <p className="text-slate-500 font-medium">Quantidades calculadas por grupo.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleShare}
            className="bg-brand-lime hover:bg-brand-lime/90 text-white px-5 py-3 rounded-2xl flex items-center gap-2 shadow-sm font-black text-sm uppercase tracking-widest transition-all"
          >
            <Share2 size={18} />
            Compartilhar
          </button>
          <button
            onClick={() => window.print()}
            className="bg-white hover:bg-slate-50 text-brand-blue border border-slate-200 px-5 py-3 rounded-2xl flex items-center gap-2 shadow-sm font-black text-sm uppercase tracking-widest transition-all"
          >
            <Printer size={18} />
            Imprimir
          </button>
        </div>
      </div>

      {/* ── CAPACITY WARNING ── */}
      {groupsWithoutCapacity.length > 0 && (
        <div className="print:hidden flex items-start gap-3 bg-brand-orange/10 border border-brand-orange/20 rounded-2xl p-4">
          <AlertTriangle size={18} className="text-brand-orange shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-black text-brand-orange uppercase tracking-wide">Capacidade não definida</p>
            <p className="text-xs text-brand-orange/80 mt-0.5">
              Defina o nº de crianças em <strong>Configurações</strong> para calcular quantidades:{' '}
              {groupsWithoutCapacity.map(g => g.nomeCompleto).join(', ')}.
            </p>
          </div>
        </div>
      )}

      {/* ── PERIOD CONTROLS ── */}
      <div className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm print:hidden space-y-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="bg-slate-100 p-1 rounded-xl flex gap-1 shrink-0">
            {(['semanal', 'mensal', 'personalizado'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => {
                  setPeriodMode(mode);
                  if (mode === 'mensal') {
                    setStartDate(startOfMonth(new Date()));
                    setEndDate(endOfMonth(new Date()));
                  } else if (mode === 'semanal') {
                    setStartDate(startOfWeek(new Date(), { weekStartsOn: 1 }));
                    setEndDate(endOfWeek(new Date(), { weekStartsOn: 1 }));
                  }
                }}
                className={cn(
                  'px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all',
                  periodMode === mode ? 'bg-white text-brand-blue shadow-sm' : 'text-slate-400 hover:text-slate-600'
                )}
              >
                {mode === 'personalizado' ? 'Período' : mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>

          {periodMode !== 'personalizado' ? (
            <div className="flex items-center gap-3 flex-1">
              <button onClick={handlePrevPeriod} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                <ChevronLeft size={20} className="text-brand-blue" />
              </button>
              <span className="text-sm font-black text-brand-blue uppercase tracking-wide min-w-[220px] text-center">
                {periodLabel}
              </span>
              <button onClick={handleNextPeriod} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                <ChevronRight size={20} className="text-brand-blue" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 flex-1 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">De</label>
                <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-brand-blue/20 font-bold text-slate-900 text-sm" />
              </div>
              <span className="text-slate-300 font-bold">—</span>
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Até</label>
                <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-brand-blue/20 font-bold text-slate-900 text-sm" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── SUMMARY BAR ── */}
      {totalItems > 0 && (
        <div className="print:hidden flex items-center gap-3">
          <span className="text-sm font-bold text-slate-500">
            {totalItems} {totalItems === 1 ? 'item' : 'itens'}
          </span>
          {checkedCount > 0 && (
            <>
              <span className="text-slate-300">•</span>
              <span className="text-sm font-bold text-brand-lime">{checkedCount} comprado{checkedCount !== 1 ? 's' : ''}</span>
              <button
                onClick={() => setCheckedItems(new Set())}
                className="text-[10px] font-black text-slate-400 uppercase hover:text-brand-orange transition-colors ml-auto"
              >
                Limpar
              </button>
            </>
          )}
        </div>
      )}

      {/* ── SMART SHOPPING LIST ── */}
      <div className="print:hidden pb-20 space-y-3">
        {byMarketCategory.size > 0 ? (
          Array.from(byMarketCategory.entries()).map(([cat, catItems]) => {
            const isOpen = openCategories.has(cat);
            const catChecked = catItems.filter(i => checkedItems.has(i.itemId)).length;
            return (
              <div key={cat} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                {/* Category header */}
                <button
                  onClick={() => toggleCategory(cat)}
                  className="w-full flex items-center justify-between px-5 py-4 bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-brand-blue uppercase tracking-widest">{cat}</span>
                    <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                      {catItems.length} itens
                    </span>
                    {catChecked > 0 && (
                      <span className="text-[9px] font-bold text-brand-lime bg-brand-lime/10 px-2 py-0.5 rounded-full">
                        {catChecked} ✓
                      </span>
                    )}
                  </div>
                  {isOpen
                    ? <ChevronUp size={16} className="text-slate-400" />
                    : <ChevronDown size={16} className="text-slate-400" />
                  }
                </button>

                {/* Items */}
                {isOpen && (
                  <div>
                    {catItems.map((shItem, idx) => {
                      const isChecked = checkedItems.has(shItem.itemId);
                      const override  = portionOverrides[shItem.itemId];
                      const unit      = override?.unitType    ?? shItem.unitType;
                      const portion   = override?.portionSize ?? shItem.portionSize;
                      const qty       = formatQuantity(shItem.quantidadeTotal, unit);

                      return (
                        <div
                          key={shItem.itemId}
                          className={cn(
                            'flex items-center gap-3 px-5 py-3 border-t border-slate-100 transition-all group',
                            idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40',
                            isChecked && 'opacity-50'
                          )}
                        >
                          {/* Checkbox */}
                          <button
                            onClick={() => toggleItem(shItem.itemId)}
                            className={cn(
                              'w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all',
                              isChecked
                                ? 'bg-brand-lime border-brand-lime'
                                : 'border-slate-300 hover:border-brand-blue'
                            )}
                          >
                            {isChecked && <div className="w-2.5 h-1.5 rounded-sm bg-white" />}
                          </button>

                          {/* Name */}
                          <span className={cn(
                            'flex-1 text-sm font-bold text-slate-800 min-w-0 truncate',
                            isChecked && 'line-through text-slate-400'
                          )}>
                            {shItem.nome}
                          </span>

                          {/* Quantity display */}
                          <span className="text-sm font-black text-brand-blue tabular-nums shrink-0 min-w-[64px] text-right">
                            {qty}
                          </span>

                          {/* Portion editor — always visible, compact */}
                          <div className="flex items-center gap-1 shrink-0">
                            <input
                              type="number"
                              step="0.01"
                              min={0.01}
                              value={portion}
                              title="Quantidade por criança"
                              onClick={e => e.stopPropagation()}
                              onChange={e => updatePortion(shItem.itemId, 'portionSize', parseFloat(e.target.value) || 0.01)}
                              className="w-16 text-center text-[11px] font-black text-brand-blue border border-slate-200 rounded-lg px-1 py-1 focus:outline-none focus:border-brand-blue"
                            />
                            <span className="text-[9px] text-slate-400">/cri</span>
                            <select
                              value={unit}
                              title="Unidade"
                              onClick={e => e.stopPropagation()}
                              onChange={e => updatePortion(shItem.itemId, 'unitType', e.target.value as UnitType)}
                              className="text-[11px] font-black text-brand-blue border border-slate-200 rounded-lg px-1 py-1 focus:outline-none focus:border-brand-blue bg-white"
                            >
                              {UNIT_OPTIONS.map(o => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-200">
              <ShoppingCart size={40} />
            </div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Nenhum item para o período</h3>
            <p className="text-slate-500 mt-1">
              {groups.length === 0
                ? 'Crie grupos em Configurações antes de usar a lista de compras.'
                : totalItems === 0 && groupsWithoutCapacity.length === groups.length
                ? 'Defina o nº de crianças em Configurações para calcular quantidades.'
                : 'Selecione um período com dias planejados no cardápio.'}
            </p>
          </div>
        )}
      </div>

      {/* ── PRINT TEMPLATE ── */}
      <div className="hidden print:block text-[11px]">
        <div style={{ backgroundColor: '#f27205', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ color: 'white' }}>
            <div style={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', opacity: 0.8 }}>Canteen</div>
            <div style={{ fontSize: '18px', fontWeight: '900', textTransform: 'uppercase', lineHeight: '1.1' }}>Lista de Compras</div>
            <div style={{ fontSize: '11px', opacity: 0.9 }}>{format(effectiveStart, 'dd/MM')} a {format(effectiveEnd, 'dd/MM/yyyy')}</div>
          </div>
          {logo && <img src={logo} alt="logo" style={{ maxHeight: '48px', objectFit: 'contain' }} />}
          <div style={{ color: 'white', textAlign: 'right' }}>
            <div style={{ fontWeight: 'bold' }}>{nutricionista.nome}</div>
            {nutricionista.crn && <div style={{ fontSize: '10px' }}>CRN {nutricionista.crn}</div>}
          </div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
          <thead>
            <tr style={{ backgroundColor: '#404040', color: 'white' }}>
              <th style={{ padding: '6px 8px', textAlign: 'left', border: '1px solid #ccc' }}>Item</th>
              <th style={{ padding: '6px 8px', textAlign: 'center', border: '1px solid #ccc', whiteSpace: 'nowrap' }}>Quantidade</th>
              <th style={{ padding: '6px 8px', textAlign: 'left', border: '1px solid #ccc' }}>Categoria</th>
            </tr>
          </thead>
          <tbody>
            {Array.from(byMarketCategory.entries()).map(([cat, catItems]) => (
              <React.Fragment key={cat}>
                <tr style={{ backgroundColor: '#e8e8e8' }}>
                  <td colSpan={3} style={{ padding: '5px 8px', fontWeight: 'bold', fontSize: '11px', border: '1px solid #ccc' }}>{cat}</td>
                </tr>
                {catItems.map((item, idx) => (
                  <tr key={item.itemId} style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                    <td style={{ padding: '4px 8px', border: '1px solid #eee' }}>{item.nome}</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #eee', textAlign: 'center' }}>
                      {formatQuantity(item.quantidadeTotal, item.unitType)}
                    </td>
                    <td style={{ padding: '4px 8px', border: '1px solid #eee' }}>{item.categoria}</td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '9px', color: '#666', borderTop: '1px solid #ccc', paddingTop: '6px' }}>
          <span>{nutricionista.nome}{nutricionista.crn ? ` — Nutricionista — CRN ${nutricionista.crn}` : ''}</span>
          <span>Canteen</span>
        </div>
      </div>
    </div>
  );
}
