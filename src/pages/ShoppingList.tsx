import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShoppingCart, 
  Calendar, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2,
  Filter,
  Printer,
  X,
  Plus
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks, subWeeks, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { storage } from '../services/storage';
import { MenuDay, Item, Recipe, GroupConfig } from '../types';
import { cn } from '../lib/utils';

export default function ShoppingList() {
  const [startDate, setStartDate] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [endDate, setEndDate] = useState(endOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedGroupId, setSelectedGroupId] = useState<string | 'Todos'>('Todos');
  
  const [menuDays, setMenuDays] = useState<MenuDay[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [groups, setGroups] = useState<GroupConfig[]>([]);
  const [logo, setLogo] = useState<string | null>(null);
  const [nutricionista, setNutricionista] = useState<{nome: string, crn: string}>({nome: '', crn: ''});

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('print') === '1') {
      setTimeout(() => window.print(), 600);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      const [menuData, itemsData, recipesData, groupsData, logoData, nutData] = await Promise.all([
        storage.getMenu(),
        storage.getItems(),
        storage.getRecipes(),
        storage.getConfig(),
        storage.getLogo(),
        storage.getNutricionista()
      ]);
      setMenuDays(menuData);
      setItems(itemsData);
      setRecipes(recipesData);
      setGroups(groupsData);
      setLogo(logoData);
      setNutricionista(nutData);
    };
    loadData();
  }, []);

  const shoppingItems = useMemo(() => {
    const collectedItems = new Map<string, { nome: string, categoria: string, count: number, days: string[], ingredients: string[] }>();

    const filteredDays = menuDays.filter(day => {
      const dayDate = parseISO(day.data);
      const isInRange = isWithinInterval(dayDate, { start: startDate, end: endDate });
      const matchesGroup = selectedGroupId === 'Todos' || day.id.includes(selectedGroupId);
      return isInRange && matchesGroup && !day.isFeriado;
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
  }, [menuDays, items, recipes, startDate, endDate, selectedGroupId]);

  const handlePrevWeek = () => {
    setStartDate(subWeeks(startDate, 1));
    setEndDate(subWeeks(endDate, 1));
  };

  const handleNextWeek = () => {
    setStartDate(addWeeks(startDate, 1));
    setEndDate(addWeeks(endDate, 1));
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6 w-full space-y-8 print:p-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-black text-brand-blue uppercase tracking-tight">Lista de Compras</h1>
          <p className="text-slate-500 font-medium">Itens necessários para o período selecionado.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handlePrint}
            className="bg-white hover:bg-slate-50 text-brand-blue border border-slate-200 px-6 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-sm font-black text-sm uppercase tracking-widest"
          >
            <Printer size={20} />
            Imprimir
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6 no-print">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <button onClick={handlePrevWeek} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
              <ChevronLeft size={24} className="text-brand-blue" />
            </button>
            <div className="text-center min-w-[250px]">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Período Selecionado</p>
              <p className="text-lg font-black text-brand-blue uppercase">
                {format(startDate, "dd/MM")} a {format(endDate, "dd/MM")}
              </p>
            </div>
            <button onClick={handleNextWeek} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
              <ChevronRight size={24} className="text-brand-blue" />
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Filtrar por Grupo</label>
              <select 
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="w-full md:w-64 px-5 py-3 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-brand-blue/20 font-bold text-slate-900 appearance-none"
              >
                <option value="Todos">Todos os Grupos</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.nomeCompleto}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* List Content */}
      <div className="print:hidden space-y-8 pb-20">
        {Object.keys(shoppingItems).length > 0 ? (
          Object.entries(shoppingItems).map(([category, items]) => (
            <div key={category} className="space-y-4 break-inside-avoid">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3">
                <div className="w-8 h-px bg-slate-200" />
                {category}
                <div className="flex-1 h-px bg-slate-200" />
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(items as any[]).map((item) => (
                  <div key={item.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:border-brand-blue/20 transition-all group">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-black text-brand-blue leading-tight group-hover:text-brand-orange transition-colors">
                        {item.nome}
                      </h3>
                      <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-2 py-1 rounded-lg uppercase">
                        {item.count}x no cardápio
                      </span>
                    </div>
                    
                    {item.ingredients.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-50 space-y-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ingredientes da Receita:</p>
                        <ul className="grid grid-cols-1 gap-1">
                          {item.ingredients.map((ing: string, idx: number) => (
                            <li key={idx} className="text-sm text-slate-600 flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-brand-lime/40" />
                              {ing}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
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
            <div style={{fontSize:'11px',opacity:0.9}}>{format(startDate,'dd/MM')} a {format(endDate,'dd/MM/yyyy')}</div>
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
              <th style={{padding:'6px 8px',textAlign:'center',border:'1px solid #ccc',whiteSpace:'nowrap'}}>Qtd (dias)</th>
              <th style={{padding:'6px 8px',textAlign:'left',border:'1px solid #ccc'}}>Categoria</th>
              <th style={{padding:'6px 8px',textAlign:'left',border:'1px solid #ccc'}}>Dias</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(shoppingItems).map(([category, catItems]) => (
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
