import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
  Save,
  Palmtree,
  Trash2,
  CheckCircle2,
  Copy,
  Sparkles,
  History
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameDay, isSameMonth, isWeekend } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { GoogleGenAI } from '@google/genai';
import { storage } from '../services/storage';
import { MenuDay, Item, Category, GroupConfig, MenuSnapshot } from '../types';
import { cn } from '../lib/utils';

export default function Menu() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [menuDays, setMenuDays] = useState<MenuDay[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [groups, setGroups] = useState<GroupConfig[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<GroupConfig | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingDay, setEditingDay] = useState<MenuDay | null>(null);
  const [viewMode, setViewMode] = useState<'mensal' | 'diaria'>('mensal');
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };
  const [isGenerating, setIsGenerating] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [snapshots, setSnapshots] = useState<MenuSnapshot[]>([]);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const syncFromTop = () => { if (tableScrollRef.current && topScrollRef.current) tableScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft; };
  const syncFromTable = () => { if (tableScrollRef.current && topScrollRef.current) topScrollRef.current.scrollLeft = tableScrollRef.current.scrollLeft; };

  useEffect(() => {
    const loadData = async () => {
      const [menuData, itemsData, groupsData, snapshotsData] = await Promise.all([
        storage.getMenu(),
        storage.getItems(),
        storage.getConfig(),
        storage.getMenuSnapshots()
      ]);
      setMenuDays(menuData);
      setItems(itemsData);
      setGroups(groupsData);
      setSnapshots(snapshotsData);
      if (groupsData.length > 0) {
        setSelectedGroup(groupsData[0]);
      }
    };
    loadData();
  }, []);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const getDayMenu = (date: Date, groupId: string) => {
    return menuDays.find(d => isSameDay(new Date(d.data), date) && d.id.includes(groupId));
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

  const clearMonth = () => {
    if (window.confirm(`Tem certeza que deseja limpar todo o cardápio deste mês para todos os grupos?`)) {
      const updatedMenu = menuDays.filter(d => !isSameMonth(new Date(d.data), currentDate));
      setMenuDays(updatedMenu);
      storage.saveMenu(updatedMenu);
      showToast('Mês limpo com sucesso!');
    }
  };

  const copyPrevMonth = () => {
    const prevMonth = subMonths(currentDate, 1);
    if (!window.confirm(`Copiar cardápio de ${format(prevMonth, 'MMMM yyyy', { locale: ptBR })} para ${format(currentDate, 'MMMM yyyy', { locale: ptBR })}?`)) return;
    const prevDays = menuDays.filter(d => isSameMonth(new Date(d.data), prevMonth));
    const currentDayIds = new Set(menuDays.filter(d => isSameMonth(new Date(d.data), currentDate)).map(d => d.id));
    const copied = prevDays.map(d => {
      const targetDate = addMonths(new Date(d.data), 1);
      const newId = `day-${targetDate.getTime()}-${d.id.split('-').pop()}`;
      if (currentDayIds.has(newId)) return null;
      return { ...d, id: newId, data: targetDate.toISOString() };
    }).filter(Boolean) as MenuDay[];
    const updated = [...menuDays, ...copied];
    setMenuDays(updated);
    storage.saveMenu(updated);
    showToast(`${copied.length} dias copiados com sucesso!`);
  };

  const generateWithAI = async () => {
    if (!window.confirm(`Gerar cardápio com IA para ${format(currentDate, 'MMMM yyyy', { locale: ptBR })}? Os dias não preenchidos serão completados.`)) return;
    setIsGenerating(true);
    try {
      const workdays = daysInMonth.filter(d => !isWeekend(d));
      const itemsByCategory: Record<string, { id: string; nome: string }[]> = {};
      items.forEach(it => {
        if (!itemsByCategory[it.categoria]) itemsByCategory[it.categoria] = [];
        itemsByCategory[it.categoria].push({ id: it.id, nome: it.nome });
      });
      const recentHistory = snapshots.slice(0, 3).map(s => s.label).join(', ') || 'nenhum';
      const prompt = `Você é nutricionista especializado em alimentação infantil.
Gere um cardápio mensal para ${format(currentDate, 'MMMM yyyy', { locale: ptBR })}.
Grupos: ${JSON.stringify(groups.map(g => ({ id: g.id, nome: g.nomeCurto, colunas: g.colunas.map(c => c.categoria), restricao: g.restricao || null })))}
Itens por categoria: ${JSON.stringify(itemsByCategory)}
Dias úteis: ${workdays.map(d => format(d, 'yyyy-MM-dd')).join(', ')}
Meses com histórico (evite repetições excessivas): ${recentHistory}

Responda SOMENTE com JSON válido neste formato exato (sem markdown, sem explicações):
{"assignments":[{"date":"YYYY-MM-DD","groupId":"...","fields":{"fieldNameId":"itemId"}}]}

Onde fieldNameId é o nome da categoria normalizado + "Id" (ex: "Prato Principal" → "pratoprincipalId", "Café da Manhã" → "cafedamanhaId").
Use apenas IDs de itens da lista fornecida. Gere para todos os grupos em todos os dias úteis.`;

      const ai = new GoogleGenAI({ apiKey: (import.meta as any).env?.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '' });
      const response = await ai.models.generateContent({ model: 'gemini-2.0-flash', contents: prompt });
      const text = response.text || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Resposta inválida da IA');
      const { assignments } = JSON.parse(jsonMatch[0]);
      let updated = [...menuDays];
      (assignments as any[]).forEach(a => {
        const idx = updated.findIndex(d => isSameDay(new Date(d.data), new Date(a.date)) && d.id.includes(a.groupId));
        if (idx >= 0) {
          updated[idx] = { ...updated[idx], ...a.fields };
        } else {
          updated.push({ id: `day-${new Date(a.date).getTime()}-${a.groupId}`, data: new Date(a.date).toISOString(), diaSemana: format(new Date(a.date), 'EEEE', { locale: ptBR }), ...a.fields });
        }
      });
      setMenuDays(updated);
      await storage.saveMenu(updated);
      const snap: MenuSnapshot = { id: Date.now().toString(), label: format(currentDate, 'MMMM yyyy', { locale: ptBR }), monthYear: format(currentDate, 'yyyy-MM'), menuDays: updated.filter(d => isSameMonth(new Date(d.data), currentDate)), createdAt: new Date().toISOString() };
      await storage.addMenuSnapshot(snap);
      setSnapshots(prev => [snap, ...prev]);
      showToast('Cardápio gerado com IA!');
    } catch {
      showToast('Erro ao gerar com IA. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-6 w-full">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-brand-lime text-white px-6 py-3 rounded-2xl shadow-lg font-black text-sm uppercase tracking-widest flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 size={18} /> {toast}
        </div>
      )}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-brand-blue uppercase tracking-tight">Cardápio</h1>
          <p className="text-slate-500 font-medium">Gerencie o planejamento alimentar.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="bg-slate-100 p-1 rounded-2xl flex gap-1 mr-4">
            <button 
              onClick={() => setViewMode('mensal')}
              className={cn(
                "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                viewMode === 'mensal' ? "bg-white text-brand-blue shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >
              Mensal
            </button>
            <button 
              onClick={() => setViewMode('diaria')}
              className={cn(
                "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                viewMode === 'diaria' ? "bg-white text-brand-blue shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >
              Diária
            </button>
          </div>
          <button
            onClick={clearMonth}
            className="bg-white hover:bg-slate-50 text-brand-orange border border-slate-200 px-6 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-sm font-black text-sm uppercase tracking-widest"
          >
            <Trash2 size={20} />
            Limpar Mês
          </button>
          <button
            onClick={copyPrevMonth}
            className="bg-white hover:bg-slate-50 text-brand-blue border border-slate-200 px-6 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-sm font-black text-sm uppercase tracking-widest"
          >
            <Copy size={20} />
            Copiar Mês Anterior
          </button>
          <button
            onClick={generateWithAI}
            disabled={isGenerating}
            className="bg-brand-blue hover:bg-brand-blue/90 text-white px-6 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-sm font-black text-sm uppercase tracking-widest disabled:opacity-60"
          >
            <Sparkles size={20} />
            {isGenerating ? 'Gerando...' : 'Gerar com IA'}
          </button>
          <button
            onClick={() => setIsHistoryOpen(true)}
            className="bg-white hover:bg-slate-50 text-brand-blue border border-slate-200 p-3 rounded-2xl transition-all shadow-sm"
            title="Ver histórico"
          >
            <History size={20} />
          </button>
        </div>
      </div>

      {/* Month/Day Selector */}
      <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm mb-8 flex items-center justify-between">
        <button 
          onClick={() => viewMode === 'mensal' ? handlePrevMonth() : setSelectedDay(d => new Date(d.setDate(d.getDate() - 1)))} 
          className="p-3 hover:bg-slate-100 rounded-full text-brand-blue transition-colors"
        >
          <ChevronLeft size={28} />
        </button>
        <div className="flex items-center gap-4">
          <div className="p-3 bg-brand-blue/5 rounded-2xl text-brand-blue">
            <CalendarIcon size={24} />
          </div>
          <h2 className="text-2xl font-black text-brand-blue uppercase tracking-tight">
            {viewMode === 'mensal' 
              ? format(currentDate, 'MMMM yyyy', { locale: ptBR })
              : format(selectedDay, "dd 'de' MMMM", { locale: ptBR })}
          </h2>
        </div>
        <button 
          onClick={() => viewMode === 'mensal' ? handleNextMonth() : setSelectedDay(d => new Date(d.setDate(d.getDate() + 1)))} 
          className="p-3 hover:bg-slate-100 rounded-full text-brand-blue transition-colors"
        >
          <ChevronRight size={28} />
        </button>
      </div>

      {viewMode === 'mensal' ? (
        <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden">
          {/* Top scrollbar mirror */}
          <div ref={topScrollRef} className="overflow-x-auto" onScroll={syncFromTop} style={{height: '14px'}}>
            <div style={{width: `${Math.max(groups.length * 260 + 200, 800)}px`, height: '1px'}} />
          </div>
          <div ref={tableScrollRef} className="overflow-x-auto" onScroll={syncFromTable}>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 border-r border-slate-200 sticky left-0 bg-slate-50 z-10 w-48">Data / Grupo</th>
                  {groups.map(group => (
                    <th key={group.id} className="p-6 text-center text-[10px] font-black uppercase tracking-widest text-white border-r border-slate-200 min-w-[250px]" style={{ backgroundColor: group.cor }}>
                      {group.nomeCurto}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {daysInMonth.map(day => (
                  <tr key={day.toISOString()} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="py-2 px-4 border-r border-slate-200 sticky left-0 bg-white z-10 min-w-[130px]">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-brand-blue whitespace-nowrap">{format(day, 'dd/MM')}</span>
                        <span className="text-[10px] font-medium text-slate-400 capitalize truncate">{format(day, 'EEE', { locale: ptBR })}</span>
                      </div>
                    </td>
                    {groups.map(group => {
                      const dayMenu = getDayMenu(day, group.id);
                      return (
                        <td 
                          key={group.id} 
                          className="p-4 border-r border-slate-100 align-top cursor-pointer hover:bg-brand-blue/5 transition-all"
                          onClick={() => {
                            setSelectedGroup(group);
                            setEditingDay(dayMenu || { 
                              id: `day-${day.getTime()}-${group.id}`,
                              data: day.toISOString(),
                              diaSemana: format(day, 'EEEE', { locale: ptBR })
                            } as MenuDay);
                            setIsEditModalOpen(true);
                          }}
                        >
                          {dayMenu?.isFeriado ? (
                            <div className="flex items-center justify-center py-1">
                              <span className="bg-brand-orange text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">Feriado</span>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {group.colunas.map(col => {
                                const fieldId = getFieldIdFromColumn(col.categoria);
                                const itemId = dayMenu?.[fieldId as keyof MenuDay] as string;
                                if (!itemId) return null;
                                return (
                                  <div key={col.categoria} className="flex items-start gap-2">
                                    <div className="w-1 h-1 rounded-full bg-brand-lime mt-1.5 shrink-0" />
                                    <div>
                                      <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">{col.categoria}</p>
                                      <p className="text-[10px] font-bold text-slate-700">{getItemName(itemId)}</p>
                                    </div>
                                  </div>
                                );
                              })}
                              {!dayMenu && <p className="text-[9px] text-slate-300 italic">Não planejado</p>}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(group => {
            const dayMenu = getDayMenu(selectedDay, group.id);
            return (
              <div 
                key={group.id} 
                className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden hover:border-brand-blue/30 transition-all cursor-pointer"
                onClick={() => {
                  setSelectedGroup(group);
                  setEditingDay(dayMenu || { 
                    id: `day-${selectedDay.getTime()}-${group.id}`,
                    data: selectedDay.toISOString(),
                    diaSemana: format(selectedDay, 'EEEE', { locale: ptBR })
                  } as MenuDay);
                  setIsEditModalOpen(true);
                }}
              >
                <div className="p-6 border-b border-slate-100 flex items-center justify-between" style={{ borderLeft: `8px solid ${group.cor}` }}>
                  <div>
                    <h3 className="text-lg font-black text-brand-blue uppercase">{group.nomeCompleto}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{group.nomeCurto}</p>
                  </div>
                  <div className="flex gap-2">
                    {dayMenu?.isFeriado && (
                      <span className="bg-brand-orange text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Feriado</span>
                    )}
                  </div>
                </div>
                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                  {group.colunas.map(col => {
                    const fieldId = getFieldIdFromColumn(col.categoria);
                    const itemId = dayMenu?.[fieldId as keyof MenuDay] as string;
                    return (
                      <div key={col.categoria} className="space-y-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{col.categoria}</p>
                        <p className={cn(
                          "text-sm font-bold",
                          itemId ? "text-slate-900" : "text-slate-300 italic"
                        )}>
                          {itemId ? getItemName(itemId) : 'Não planejado'}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* History Modal */}
      {isHistoryOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-black text-brand-blue uppercase tracking-tight">Histórico de Cardápios</h2>
              <button onClick={() => setIsHistoryOpen(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} className="text-slate-400" /></button>
            </div>
            <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
              {snapshots.length === 0 && <p className="text-slate-400 text-sm text-center py-6">Nenhum histórico salvo ainda.<br />Use "Gerar com IA" para criar o primeiro.</p>}
              {snapshots.map(snap => (
                <div key={snap.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                  <div>
                    <p className="font-black text-brand-blue text-sm uppercase">{snap.label}</p>
                    <p className="text-[10px] text-slate-400">{format(new Date(snap.createdAt), "dd/MM/yyyy 'às' HH:mm")}</p>
                  </div>
                  <button
                    onClick={async () => {
                      if (!window.confirm(`Restaurar cardápio de ${snap.label}? Os dados atuais desse mês serão substituídos.`)) return;
                      const others = menuDays.filter(d => !snap.menuDays.find((s: MenuDay) => s.id === d.id));
                      const updated = [...others, ...snap.menuDays];
                      setMenuDays(updated);
                      await storage.saveMenu(updated);
                      setIsHistoryOpen(false);
                      showToast('Cardápio restaurado!');
                    }}
                    className="text-[10px] font-black text-brand-blue bg-brand-blue/5 hover:bg-brand-blue/10 px-3 py-2 rounded-xl uppercase tracking-widest transition-colors"
                  >
                    Restaurar
                  </button>
                </div>
              ))}
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
                    Planejar Dia - {selectedGroup.nomeCompleto}
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {selectedGroup.colunas.map(col => {
                    const fieldId = getFieldIdFromColumn(col.categoria);
                    return (
                      <div key={col.categoria}>
                        <CategorySelect
                          label={col.categoria} 
                          value={editingDay[fieldId as keyof MenuDay] as string} 
                          options={getItemsByCategory(col.categoria)} 
                          onChange={id => setEditingDay({...editingDay, [fieldId]: id})} 
                        />
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
