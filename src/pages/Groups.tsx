import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calendar as CalendarIcon,
  Plus,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  MoreHorizontal,
  Download,
  X,
  Save,
  Palmtree,
  Trash2,
  Copy,
  Repeat,
  Users
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, addMonths, subMonths, isSameDay, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { storage } from '../services/storage';
import { MenuDay, Item, Category, GroupConfig, MenuColumn } from '../types';
import { cn } from '../lib/utils';

export default function Groups() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [menuDays, setMenuDays] = useState<MenuDay[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [groups, setGroups] = useState<GroupConfig[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<GroupConfig | null>(null);
  const [substitutions, setSubstitutions] = useState<any[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingDay, setEditingDay] = useState<MenuDay | null>(null);
  const [logo, setLogo] = useState<string | null>(null);
  const [nutricionista, setNutricionista] = useState<{nome: string, crn: string}>({nome: '', crn: ''});
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printGroups, setPrintGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadData = async () => {
      const [menuData, itemsData, groupsData, subsData, logoData, nutData] = await Promise.all([
        storage.getMenu(),
        storage.getItems(),
        storage.getConfig(),
        storage.getSubstitutions(),
        storage.getLogo(),
        storage.getNutricionista()
      ]);
      setMenuDays(menuData);
      setItems(itemsData);
      setGroups(groupsData);
      setPrintGroups(new Set(groupsData.map((g: GroupConfig) => g.id)));
      setSubstitutions(subsData);
      setLogo(logoData);
      setNutricionista(nutData);
      if (groupsData.length > 0) {
        setSelectedGroup(groupsData[0]);
      }
    };
    loadData();
  }, []);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const currentMonthMenu = useMemo(() => {
    if (!selectedGroup) return [];
    return daysInMonth.map(date => {
      const dateStr = date.toISOString();
      const existing = menuDays.find(d => isSameDay(new Date(d.data), date) && d.id.includes(selectedGroup.id));
      if (existing) return existing;
      return {
        id: `temp-${date.getTime()}-${selectedGroup.id}`,
        data: dateStr,
        diaSemana: format(date, 'EEEE', { locale: ptBR }),
      } as MenuDay;
    });
  }, [menuDays, currentDate, daysInMonth, selectedGroup]);

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const generateMonth = () => {
    if (!selectedGroup) return;
    const newDays: MenuDay[] = daysInMonth
      .filter(date => !isWeekend(date))
      .map(date => {
        const existing = menuDays.find(d => isSameDay(new Date(d.data), date) && d.id.includes(selectedGroup.id));
        if (existing) return existing;
        return {
          id: `day-${date.getTime()}-${selectedGroup.id}`,
          data: date.toISOString(),
          diaSemana: format(date, 'EEEE', { locale: ptBR }),
        };
      });

    const updatedMenu = [...menuDays.filter(d => !newDays.some(nd => nd.id === d.id)), ...newDays];
    setMenuDays(updatedMenu);
    storage.saveMenu(updatedMenu);
    showToast('Mês gerado com sucesso!');
  };

  const handleSaveDay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDay) return;

    const updatedMenu = menuDays.filter(d => d.id !== editingDay.id);
    updatedMenu.push(editingDay);

    setMenuDays(updatedMenu);
    storage.saveMenu(updatedMenu);
    setIsEditModalOpen(false);
    setEditingDay(null);
    showToast('Planejamento salvo!');
  };

  const openEditModal = (day: MenuDay) => {
    setEditingDay({ ...day });
    setIsEditModalOpen(true);
  };

  const getSubstitutionsForItem = (itemId?: string) => {
    if (!itemId) return [];
    return substitutions.filter(s => s.itemOriginalId === itemId);
  };

  const getItemName = (id?: string) => {
    if (!id) return null;
    return items.find(it => it.id === id)?.nome;
  };

  const getItemsByCategory = (category: Category) => {
    return items.filter(it => it.categoria === category).sort((a, b) => a.nome.localeCompare(b.nome));
  };

  const getFieldIdFromColumn = (col: string) => {
    return col
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\s+/g, '') + 'Id';
  };

  const getMealSubstitutions = (day: MenuDay, columns: MenuColumn[]) => {
    const itemIds = columns.map(col => day[getFieldIdFromColumn(col.categoria) as keyof MenuDay] as string).filter(Boolean);

    const subs: { original: string, substitute: string }[] = [];
    itemIds.forEach(id => {
      const itemSubs = getSubstitutionsForItem(id);
      itemSubs.forEach(s => {
        const originalName = getItemName(s.itemOriginalId);
        const substituteName = getItemName(s.itemSubstitutoId);
        if (originalName && substituteName) {
          subs.push({ original: originalName, substitute: substituteName });
        }
      });
    });
    return subs;
  };

  const clearMonth = () => {
    if (!selectedGroup) return;
    if (window.confirm(`Tem certeza que deseja limpar todo o cardápio deste mês para o grupo ${selectedGroup.nomeCompleto}?`)) {
      const updatedMenu = menuDays.filter(d => !(isSameMonth(new Date(d.data), currentDate) && d.id.includes(selectedGroup.id)));
      setMenuDays(updatedMenu);
      storage.saveMenu(updatedMenu);
      showToast('Mês limpo!');
    }
  };

  const copyPreviousMonth = () => {
    if (!selectedGroup) return;
    const prevMonth = subMonths(currentDate, 1);
    const prevMonthMenu = menuDays.filter(d => isSameMonth(new Date(d.data), prevMonth) && d.id.includes(selectedGroup.id));
    
    if (prevMonthMenu.length === 0) {
      alert(`Não há cardápio no mês anterior para o grupo ${selectedGroup.nomeCompleto} para copiar.`);
      return;
    }

    if (window.confirm(`Deseja copiar o cardápio do mês anterior para este mês para o grupo ${selectedGroup.nomeCompleto}? Isso substituirá os dias já planejados.`)) {
      const newDays = daysInMonth
        .filter(date => !isWeekend(date))
        .map(date => {
          const dayNum = format(date, 'd');
          const sourceDay = prevMonthMenu.find(d => format(new Date(d.data), 'd') === dayNum);
          
          const copiedFields: any = {};
          if (sourceDay) {
            selectedGroup.colunas.forEach(col => {
              const fieldId = getFieldIdFromColumn(col.categoria);
              copiedFields[fieldId] = sourceDay[fieldId];
            });
            copiedFields.isFeriado = sourceDay.isFeriado;
          }

          return {
            id: `day-${date.getTime()}-${selectedGroup.id}`,
            data: date.toISOString(),
            diaSemana: format(date, 'EEEE', { locale: ptBR }),
            ...copiedFields
          };
        });

      const updatedMenu = [...menuDays.filter(d => !(isSameMonth(new Date(d.data), currentDate) && d.id.includes(selectedGroup.id))), ...newDays];
      setMenuDays(updatedMenu);
      storage.saveMenu(updatedMenu);
      showToast('Mês anterior copiado!');
    }
  };

  const mesAno = format(currentDate, 'MMMM yyyy', { locale: ptBR }).toUpperCase();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-brand-lime text-white px-6 py-3 rounded-2xl shadow-lg font-black text-sm uppercase tracking-widest flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 size={18} /> {toast}
        </div>
      )}

      {/* ===== PRINT TEMPLATE ===== */}
      <div className="hidden print:block text-[11px]">
        {groups.filter(g => printGroups.has(g.id)).map((group, groupIdx, arr) => {
          const groupMonthMenu = daysInMonth.map(date => {
            const existing = menuDays.find(d => isSameDay(new Date(d.data), date) && d.id.includes(group.id));
            if (existing) return existing;
            return { id: `temp-${date.getTime()}-${group.id}`, data: date.toISOString(), diaSemana: format(date, 'EEEE', { locale: ptBR }) } as MenuDay;
          });
          const isLast = groupIdx === arr.length - 1;
          return (
            <div key={group.id} style={isLast ? {} : {pageBreakAfter: 'always'}}>
              <div style={{backgroundColor:'#f27205',padding:'10px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'12px'}}>
                <div style={{color:'white'}}>
                  <div style={{fontSize:'9px',fontWeight:'bold',textTransform:'uppercase',opacity:0.8}}>Canteen</div>
                  <div style={{fontSize:'18px',fontWeight:'900',textTransform:'uppercase',lineHeight:'1.1'}}>{group.nomeCompleto}</div>
                  <div style={{fontSize:'11px',textTransform:'uppercase',opacity:0.9}}>{mesAno}</div>
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
                    <th style={{padding:'6px 8px',textAlign:'left',border:'1px solid #ccc',whiteSpace:'nowrap'}}>Data</th>
                    <th style={{padding:'6px 8px',textAlign:'left',border:'1px solid #ccc',whiteSpace:'nowrap'}}>Dia</th>
                    {group.colunas.map(col => (
                      <th key={col.categoria} style={{padding:'6px 8px',textAlign:'left',border:'1px solid #ccc'}}>{col.categoria}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {groupMonthMenu.filter(d => !isWeekend(new Date(d.data))).map((day, idx) => (
                    <tr key={day.id} style={{backgroundColor: day.isFeriado ? '#fff3e0' : idx % 2 === 0 ? '#fff' : '#f9f9f9'}}>
                      <td style={{padding:'5px 8px',border:'1px solid #eee',whiteSpace:'nowrap',fontWeight: day.isFeriado ? 'bold' : 'normal'}}>
                        {format(new Date(day.data), 'dd/MM/yyyy')}
                      </td>
                      <td style={{padding:'5px 8px',border:'1px solid #eee',whiteSpace:'nowrap',textTransform:'capitalize',fontWeight: day.isFeriado ? 'bold' : 'normal'}}>
                        {day.diaSemana.split('-')[0].charAt(0).toUpperCase() + day.diaSemana.split('-')[0].slice(1)}
                      </td>
                      {group.colunas.map(col => {
                        const fieldId = getFieldIdFromColumn(col.categoria);
                        const itemId = day[fieldId as keyof MenuDay] as string;
                        return (
                          <td key={col.categoria} style={{padding:'5px 8px',border:'1px solid #eee',fontWeight: day.isFeriado ? 'bold' : 'normal',color: day.isFeriado ? '#f27205' : 'inherit'}}>
                            {day.isFeriado ? 'Feriado' : (getItemName(itemId) || '')}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{display:'flex',justifyContent:'space-between',marginTop:'10px',fontSize:'9px',color:'#666',borderTop:'1px solid #ccc',paddingTop:'6px'}}>
                <span>{nutricionista.nome}{nutricionista.crn ? ` — Nutricionista — CRN ${nutricionista.crn}` : ''}</span>
                <span>Canteen</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ===== APP UI ===== */}
      <div className="print:hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-brand-blue uppercase tracking-tight">Grupos</h1>
          <p className="text-slate-500 font-medium">Visão individualizada por grupo.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select 
            className="bg-white border border-slate-200 px-4 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest text-brand-blue focus:ring-2 focus:ring-brand-blue/20 outline-none mr-2"
            value={selectedGroup?.id || ''}
            onChange={(e) => setSelectedGroup(groups.find(g => g.id === e.target.value) || null)}
          >
            {groups.map(g => <option key={g.id} value={g.id}>{g.nomeCompleto}</option>)}
          </select>

          <button 
            onClick={copyPreviousMonth}
            className="bg-white hover:bg-slate-50 text-brand-lime border border-slate-200 px-6 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-sm font-black text-sm uppercase tracking-widest"
          >
            <Copy size={20} />
            Copiar Anterior
          </button>
          <button 
            onClick={clearMonth}
            className="bg-white hover:bg-slate-50 text-brand-orange border border-slate-200 px-6 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-sm font-black text-sm uppercase tracking-widest"
          >
            <Trash2 size={20} />
            Limpar Mês
          </button>
          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="bg-white hover:bg-slate-50 text-brand-blue border border-slate-200 px-6 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-sm font-black text-sm uppercase tracking-widest"
          >
            <Download size={20} />
            Imprimir
          </button>
          <button 
            onClick={generateMonth}
            className="bg-brand-orange hover:bg-brand-orange/90 text-white px-6 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-lg shadow-brand-orange/20 font-black text-sm uppercase tracking-widest"
          >
            <Plus size={20} />
            Gerar Mês
          </button>
        </div>
      </div>

      {/* Month Selector */}
      <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm mb-8 flex items-center justify-between">
        <button onClick={handlePrevMonth} className="p-3 hover:bg-slate-100 rounded-full text-brand-blue transition-colors">
          <ChevronLeft size={28} />
        </button>
        <div className="flex items-center gap-4">
          <div className="p-3 bg-brand-blue/5 rounded-2xl text-brand-blue">
            <CalendarIcon size={24} />
          </div>
          <h2 className="text-2xl font-black text-brand-blue uppercase tracking-tight">
            {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
          </h2>
        </div>
        <button onClick={handleNextMonth} className="p-3 hover:bg-slate-100 rounded-full text-brand-blue transition-colors">
          <ChevronRight size={28} />
        </button>
      </div>

      <div className="space-y-1">
        {currentMonthMenu.map((day) => {
          const isWknd = isWeekend(new Date(day.data));

          return (
            <div
              key={day.id}
              onClick={() => !isWknd && openEditModal(day)}
              className={cn(
                "bg-white rounded-xl border transition-all overflow-hidden cursor-pointer group",
                isWknd ? "opacity-40 grayscale pointer-events-none border-slate-100" : "hover:border-brand-blue hover:shadow-md hover:shadow-brand-blue/5 border-slate-200",
                day.isFeriado && "border-brand-orange bg-brand-orange/5"
              )}
            >
              <div className="flex flex-row">
                {/* Date Side */}
                <div className={cn(
                  "w-20 py-1 px-3 flex flex-col justify-center items-center border-r transition-colors shrink-0",
                  day.isFeriado ? "bg-brand-orange/10 border-brand-orange/20" : "bg-slate-50/50 border-slate-100 group-hover:bg-brand-blue/5"
                )}>
                  <span className="text-base font-black text-slate-900">{format(new Date(day.data), 'dd')}</span>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{day.diaSemana.split('-')[0]}</span>
                  {day.isFeriado && (
                    <span className="px-2 py-0.5 rounded-full bg-brand-orange text-white text-[8px] font-black uppercase">FER</span>
                  )}
                </div>

                {/* Meals Row */}
                <div className="flex-1 py-1 px-3 flex flex-wrap items-center gap-x-6 gap-y-0.5">
                  {day.isFeriado ? (
                    <div className="flex items-center gap-2 text-brand-orange py-1">
                      <Palmtree size={14} />
                      <span className="font-black text-xs uppercase tracking-widest">Dia de Descanso</span>
                    </div>
                  ) : (
                    <>
                      {selectedGroup.colunas.map(col => {
                        const fieldId = getFieldIdFromColumn(col.categoria);
                        const itemName = getItemName(day[fieldId as keyof MenuDay] as string);
                        return (
                          <React.Fragment key={col.categoria}>
                            <CompactMealSlot label={col.categoria} itemName={itemName} />
                          </React.Fragment>
                        );
                      })}
                    </>
                  )}
                </div>

                {/* Status */}
                <div className="px-2 py-1 flex items-center justify-center border-l border-slate-100 shrink-0">
                  {!day.id.startsWith('temp-') && !day.isFeriado ? (
                    <CheckCircle2 className="text-brand-lime" size={16} />
                  ) : (
                    <MoreHorizontal className="text-slate-200" size={16} />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Print Group Selection Modal */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-black text-brand-blue uppercase tracking-tight">Selecionar Grupos</h2>
              <button onClick={() => setIsPrintModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full">
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <div className="p-6 space-y-3">
              <div className="pb-3 border-b border-slate-100 mb-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={printGroups.size === groups.length}
                    onChange={() => {
                      if (printGroups.size === groups.length) setPrintGroups(new Set());
                      else setPrintGroups(new Set(groups.map(g => g.id)));
                    }}
                    className="w-4 h-4 accent-brand-blue"
                  />
                  <span className="font-black text-slate-600 uppercase text-[10px] tracking-widest">
                    {printGroups.size === groups.length ? 'Desmarcar todos' : 'Selecionar todos'}
                  </span>
                </label>
              </div>
              {groups.map(g => (
                <label key={g.id} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={printGroups.has(g.id)}
                    onChange={() => {
                      const next = new Set(printGroups);
                      if (next.has(g.id)) next.delete(g.id); else next.add(g.id);
                      setPrintGroups(next);
                    }}
                    className="w-4 h-4 accent-brand-blue"
                  />
                  <span className="font-bold text-slate-800">{g.nomeCompleto}</span>
                </label>
              ))}
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button onClick={() => setIsPrintModalOpen(false)} className="flex-1 py-3 rounded-xl font-black text-sm text-slate-500 hover:bg-slate-200 transition-all uppercase tracking-widest">
                Cancelar
              </button>
              <button
                onClick={() => { setIsPrintModalOpen(false); setTimeout(() => window.print(), 100); }}
                className="flex-[2] bg-brand-blue hover:bg-brand-blue/90 text-white py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-all"
              >
                Imprimir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && editingDay && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-brand-blue text-white flex flex-col items-center justify-center shadow-lg shadow-brand-blue/20">
                  <span className="text-xl font-black leading-none">{format(new Date(editingDay.data), 'dd')}</span>
                  <span className="text-[8px] font-bold uppercase">{format(new Date(editingDay.data), 'MMM', { locale: ptBR })}</span>
                </div>
                <div>
                  <h2 className="text-xl font-black text-brand-blue uppercase tracking-tight">
                    Planejar Dia
                  </h2>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{editingDay.diaSemana}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  type="button"
                  onClick={() => setEditingDay({...editingDay, isFeriado: !editingDay.isFeriado})}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all font-black text-[10px] uppercase tracking-widest",
                    editingDay.isFeriado 
                      ? "bg-brand-orange border-brand-orange text-white shadow-lg shadow-brand-orange/20" 
                      : "border-slate-100 text-slate-400 hover:border-slate-200"
                  )}
                >
                  <Palmtree size={16} />
                  Feriado
                </button>
                <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <X size={24} className="text-slate-400" />
                </button>
              </div>
            </div>
            
            <form id="edit-day-form" onSubmit={handleSaveDay} className="flex-1 overflow-y-auto p-8">
              {selectedGroup && !editingDay.isFeriado ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {selectedGroup.colunas.map(col => {
                    const fieldId = getFieldIdFromColumn(col.categoria);
                    return (
                      <div key={col.categoria} className="space-y-2">
                        <CategorySelect
                          label={col.categoria}
                          value={editingDay[fieldId as keyof MenuDay] as string}
                          options={getItemsByCategory(col.categoria)}
                          onChange={id => setEditingDay({...editingDay, [fieldId]: id})}
                        />
                        <SubstitutionInfo subs={getMealSubstitutions(editingDay, [col])} />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-20 text-center space-y-4">
                  <div className="w-24 h-24 bg-brand-orange/10 rounded-full flex items-center justify-center mx-auto text-brand-orange">
                    <Palmtree size={48} />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Este dia é um Feriado</h3>
                  <p className="text-slate-500 max-w-xs mx-auto">Nenhum item de cardápio será exibido para esta data.</p>
                </div>
              )}
            </form>

            <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
              <button 
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="flex-1 py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-slate-500 hover:bg-slate-200 transition-all"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                form="edit-day-form"
                className="flex-[2] bg-brand-lime hover:bg-brand-lime/90 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-lg shadow-brand-lime/20 flex items-center justify-center gap-2"
              >
                <Save size={20} />
                Salvar Planejamento
              </button>
            </div>
          </div>
        </div>
      )}
      </div>{/* end print:hidden */}
    </div>
  );
}

function MealSlot({ label, icon: Icon, items, substitutions }: { label: string, icon: any, items: (string | null | undefined)[], substitutions: { original: string, substitute: string }[] }) {
  const filledItems = items.filter(Boolean);
  
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon size={14} className="text-brand-blue/40" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{label}</p>
      </div>
      <div className="min-h-[40px] flex flex-col justify-center pl-5 border-l-2 border-slate-100 group-hover:border-brand-blue/20 transition-colors">
        {filledItems.length > 0 ? (
          <>
            {filledItems.map((it, i) => (
              <p key={i} className="text-sm font-bold text-slate-800 leading-tight mb-0.5 last:mb-0">{it}</p>
            ))}
            {substitutions.length > 0 && (
              <div className="mt-2 space-y-1">
                {substitutions.map((sub, i) => (
                  <p key={i} className="text-[9px] font-bold text-brand-orange uppercase tracking-tight flex items-center gap-1">
                    <Repeat size={10} /> {sub.original} → {sub.substitute}
                  </p>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="text-xs text-slate-300 italic font-medium">Vazio</p>
        )}
      </div>
    </div>
  );
}

function SubstitutionInfo({ subs }: { subs: { original: string, substitute: string }[] }) {
  if (subs.length === 0) return null;
  return (
    <div className="bg-brand-orange/5 border border-brand-orange/20 rounded-xl p-3 space-y-1">
      <p className="text-[8px] font-black text-brand-orange uppercase tracking-widest flex items-center gap-1 mb-1">
        <Repeat size={12} /> Substituições Sugeridas
      </p>
      {subs.map((sub, i) => (
        <p key={i} className="text-[10px] font-bold text-slate-600">
          <span className="text-brand-orange">{sub.original}</span> por <span className="text-brand-blue">{sub.substitute}</span>
        </p>
      ))}
    </div>
  );
}

function CategorySelect({ label, value, options, onChange }: { label: string, value?: string, options: Item[], onChange: (id: string) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{label}</label>
      <select
        className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-brand-blue/20 font-bold text-slate-900 appearance-none"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
      >
        <option value="">Selecione...</option>
        {options.map(it => (
          <option key={it.id} value={it.id}>{it.nome}</option>
        ))}
      </select>
    </div>
  );
}

function CompactMealSlot({ label, itemName }: { label: string, itemName: string | null | undefined }) {
  return (
    <div className="flex items-baseline gap-1.5 min-w-[120px]">
      <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap">{label}:</span>
      {itemName
        ? <span className="text-xs font-bold text-slate-800 truncate">{itemName}</span>
        : <span className="text-xs text-slate-300 italic">—</span>
      }
    </div>
  );
}
