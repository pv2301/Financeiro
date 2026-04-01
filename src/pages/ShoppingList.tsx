import React, { useState, useMemo, useEffect } from 'react';
import {
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Printer,
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, startOfMonth, endOfMonth, addMonths, subMonths, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { storage } from '../services/storage';
import { MenuDay, Item, Recipe } from '../types';
import { cn } from '../lib/utils';

export default function ShoppingList() {
  const [periodMode, setPeriodMode] = useState<'semanal' | 'mensal' | 'personalizado'>('semanal');
  const [startDate, setStartDate] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [endDate, setEndDate] = useState(endOfWeek(new Date(), { weekStartsOn: 1 }));
  const [customStart, setCustomStart] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [customEnd, setCustomEnd] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  const [menuDays, setMenuDays] = useState<MenuDay[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [logo, setLogo] = useState<string | null>(null);
  const [nutricionista, setNutricionista] = useState<{nome: string, crn: string}>({nome: '', crn: ''});

  const effectiveStart = periodMode === 'personalizado' && customStart ? parseISO(customStart) : startDate;
  const effectiveEnd = periodMode === 'personalizado' && customEnd ? parseISO(customEnd) : endDate;

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('print') === '1') {
      setTimeout(() => window.print(), 600);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      const [menuData, itemsData, recipesData, logoData, nutData] = await Promise.all([
        storage.getMenu(),
        storage.getItems(),
        storage.getRecipes(),
        storage.getLogo(),
        storage.getNutricionista()
      ]);
      setMenuDays(menuData);
      setItems(itemsData);
      setRecipes(recipesData);
      setLogo(logoData);
      setNutricionista(nutData);
    };
    loadData();
  }, []);

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

  const shoppingItems = useMemo(() => {
    const collectedItems = new Map<string, { nome: string, categoria: string, count: number, days: string[], ingredients: string[] }>();

    const filteredDays = menuDays.filter(day => {
      const dayDate = parseISO(day.data);
      return isWithinInterval(dayDate, { start: effectiveStart, end: effectiveEnd }) && !day.isFeriado;
    });

    filteredDays.forEach(day => {
      const dayName = day.diaSemana.split('-')[0];
      const dayLabel = dayName.charAt(0).toUpperCase() + dayName.slice(1);
      const itemIds = Object.entries(day)
        .filter(([key, value]) => key.endsWith('Id') && key !== 'id' && key !== 'grupoId' && value)
        .map(([_, value]) => value as string);

      itemIds.forEach(id => {
        const item = items.find(it => it.id === id);
        if (item) {
          const existing = collectedItems.get(item.id);
          if (existing) {
            existing.count += 1;
            if (!existing.days.includes(dayLabel)) existing.days.push(dayLabel);
          } else {
            const recipe = item.receitaVinculadaId ? recipes.find(r => r.id === item.receitaVinculadaId) : null;
            collectedItems.set(item.id, {
              nome: item.nome,
              categoria: item.categoria,
              count: 1,
              days: [dayLabel],
              ingredients: recipe ? recipe.ingredientes.split('\n').filter(Boolean) : []
            });
          }
        }
      });
    });

    const grouped: { [category: string]: any[] } = {};
    collectedItems.forEach((value, key) => {
      if (!grouped[value.categoria]) grouped[value.categoria] = [];
      grouped[value.categoria].push({ id: key, ...value });
    });

    return grouped;
  }, [menuDays, items, recipes, effectiveStart, effectiveEnd]);

  const allCategories = Object.keys(shoppingItems).sort();
  const displayedEntries = selectedCategory === 'Todas'
    ? Object.entries(shoppingItems).sort(([a], [b]) => a.localeCompare(b))
    : Object.entries(shoppingItems).filter(([cat]) => cat === selectedCategory);

  const totalItems = Object.values(shoppingItems).reduce((sum: number, arr) => sum + (arr as any[]).length, 0);
  const checkedCount = checkedItems.size;

  const toggleItem = (id: string) => {
    const next = new Set(checkedItems);
    if (next.has(id)) next.delete(id); else next.add(id);
    setCheckedItems(next);
  };

  const periodLabel = periodMode === 'mensal'
    ? format(startDate, 'MMMM yyyy', { locale: ptBR }).toUpperCase()
    : `${format(effectiveStart, 'dd/MM')} — ${format(effectiveEnd, 'dd/MM')}`;

  return (
    <div className="p-6 w-full space-y-6 print:p-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-black text-brand-blue uppercase tracking-tight">Lista de Compras</h1>
          <p className="text-slate-500 font-medium">Itens necessários para o período selecionado.</p>
        </div>
        <button
          onClick={() => window.print()}
          className="bg-white hover:bg-slate-50 text-brand-blue border border-slate-200 px-6 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-sm font-black text-sm uppercase tracking-widest"
        >
          <Printer size={20} />
          Imprimir
        </button>
      </div>

      {/* Controls */}
      <div className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm no-print space-y-4">
        {/* Period mode + navigation */}
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
                  "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                  periodMode === mode ? "bg-white text-brand-blue shadow-sm" : "text-slate-400 hover:text-slate-600"
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
                <input
                  type="date"
                  value={customStart}
                  onChange={e => setCustomStart(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-brand-blue/20 font-bold text-slate-900 text-sm"
                />
              </div>
              <span className="text-slate-300 font-bold">—</span>
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Até</label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={e => setCustomEnd(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-brand-blue/20 font-bold text-slate-900 text-sm"
                />
              </div>
            </div>
          )}
        </div>

        {/* Category filter */}
        {allCategories.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">Categoria:</span>
            <button
              onClick={() => setSelectedCategory('Todas')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                selectedCategory === 'Todas' ? "bg-brand-blue text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              )}
            >
              Todas
            </button>
            {allCategories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                  selectedCategory === cat ? "bg-brand-blue text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Summary bar */}
      {totalItems > 0 && (
        <div className="print:hidden flex items-center gap-3">
          <span className="text-sm font-bold text-slate-500">{totalItems} {totalItems === 1 ? 'item' : 'itens'}</span>
          {checkedCount > 0 && (
            <>
              <span className="text-slate-300">•</span>
              <span className="text-sm font-bold text-brand-lime">{checkedCount} verificado{checkedCount !== 1 ? 's' : ''}</span>
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

      {/* Spreadsheet list */}
      <div className="print:hidden pb-20">
        {displayedEntries.length > 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            {displayedEntries.map(([category, catItems]) => (
              <div key={category}>
                <div className="flex items-center gap-3 px-5 py-3 bg-slate-50 border-b border-slate-100">
                  <span className="text-[10px] font-black text-brand-blue uppercase tracking-widest">{category}</span>
                  <span className="text-[9px] font-bold text-slate-400">{catItems.length} {catItems.length === 1 ? 'item' : 'itens'}</span>
                </div>
                {(catItems as any[]).map((item) => {
                  const isChecked = checkedItems.has(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleItem(item.id)}
                      className={cn(
                        "flex items-center gap-4 px-5 py-3 cursor-pointer transition-all border-b border-slate-50 last:border-0 hover:bg-slate-50/50 group",
                        isChecked && "opacity-50"
                      )}
                    >
                      <div className={cn(
                        "w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all",
                        isChecked ? "bg-brand-lime border-brand-lime" : "border-slate-300 group-hover:border-brand-blue"
                      )}>
                        {isChecked && <div className="w-2 h-1.5 rounded-sm bg-white" />}
                      </div>
                      <span className={cn(
                        "flex-1 text-sm font-bold text-slate-800",
                        isChecked && "line-through text-slate-400"
                      )}>
                        {item.nome}
                      </span>
                      <span className="hidden md:block text-[10px] text-slate-400 font-medium truncate max-w-[240px]">
                        {item.days?.join(', ')}
                      </span>
                      <span className="text-sm font-black text-brand-blue tabular-nums shrink-0 ml-2">
                        {item.count}×
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-200">
              <ShoppingCart size={40} />
            </div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Nenhum item para o período</h3>
            <p className="text-slate-500">Selecione um período com dias planejados no cardápio.</p>
          </div>
        )}
      </div>

      {/* ===== PRINT TEMPLATE ===== */}
      <div className="hidden print:block text-[11px]">
        <div style={{backgroundColor:'#f27205',padding:'10px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'12px'}}>
          <div style={{color:'white'}}>
            <div style={{fontSize:'9px',fontWeight:'bold',textTransform:'uppercase',opacity:0.8}}>Canteen</div>
            <div style={{fontSize:'18px',fontWeight:'900',textTransform:'uppercase',lineHeight:'1.1'}}>Lista de Compras</div>
            <div style={{fontSize:'11px',opacity:0.9}}>{format(effectiveStart,'dd/MM')} a {format(effectiveEnd,'dd/MM/yyyy')}</div>
          </div>
          {logo && <img src={logo} alt="logo" style={{maxHeight:'48px',objectFit:'contain'}} />}
          <div style={{color:'white',textAlign:'right'}}>
            <div style={{fontWeight:'bold'}}>{nutricionista.nome}</div>
            {nutricionista.crn && <div style={{fontSize:'10px'}}>CRN {nutricionista.crn}</div>}
          </div>
        </div>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:'10px'}}>
          <thead>
            <tr style={{backgroundColor:'#404040',color:'white'}}>
              <th style={{padding:'6px 8px',textAlign:'left',border:'1px solid #ccc'}}>Item</th>
              <th style={{padding:'6px 8px',textAlign:'center',border:'1px solid #ccc',whiteSpace:'nowrap'}}>Qtd</th>
              <th style={{padding:'6px 8px',textAlign:'left',border:'1px solid #ccc'}}>Categoria</th>
              <th style={{padding:'6px 8px',textAlign:'left',border:'1px solid #ccc'}}>Dias</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(shoppingItems).sort(([a],[b])=>a.localeCompare(b)).map(([category, catItems]) => (
              <React.Fragment key={category}>
                <tr style={{backgroundColor:'#e8e8e8'}}>
                  <td colSpan={4} style={{padding:'5px 8px',fontWeight:'bold',fontSize:'11px',border:'1px solid #ccc'}}>{category}</td>
                </tr>
                {(catItems as any[]).map((item, idx) => (
                  <tr key={item.id} style={{backgroundColor: idx % 2 === 0 ? '#fff' : '#f9f9f9'}}>
                    <td style={{padding:'4px 8px',border:'1px solid #eee'}}>{item.nome}</td>
                    <td style={{padding:'4px 8px',border:'1px solid #eee',textAlign:'center'}}>{item.count}×</td>
                    <td style={{padding:'4px 8px',border:'1px solid #eee'}}>{item.categoria}</td>
                    <td style={{padding:'4px 8px',border:'1px solid #eee'}}>{item.days?.join(', ')}</td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
        <div style={{display:'flex',justifyContent:'space-between',marginTop:'10px',fontSize:'9px',color:'#666',borderTop:'1px solid #ccc',paddingTop:'6px'}}>
          <span>{nutricionista.nome}{nutricionista.crn ? ` — Nutricionista — CRN ${nutricionista.crn}` : ''}</span>
          <span>Canteen</span>
        </div>
      </div>
    </div>
  );
}
