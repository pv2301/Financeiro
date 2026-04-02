import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar as CalendarIcon,

  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  MoreHorizontal,
  Download,
  X,
  Save,
  Palmtree,
  Trash2,
  Copy,
  Repeat,
  Users,
  Sparkles,
  History
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, addMonths, subMonths, isSameDay, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { GoogleGenAI } from '@google/genai';
import { storage, resolveMainCategory } from '../services/storage';
import { MenuDay, Item, Category, GroupConfig, MenuColumn, MenuSnapshot, CategorySubcategories } from '../types';
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
  const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [snapshots, setSnapshots] = useState<MenuSnapshot[]>([]);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [aiDirectives, setAiDirectives] = useState('');
  const [aiStep, setAiStep] = useState<'directives' | 'generating' | 'preview'>('directives');
  const [categorySubcategories, setCategorySubcategories] = useState<CategorySubcategories>({});
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: React.ReactNode; onConfirm: () => void; variant?: 'destructive' | 'primary' } | null>(null);
  const showConfirm = (title: string, message: React.ReactNode, onConfirm: () => void, variant: 'destructive' | 'primary' = 'destructive') =>
    setConfirmModal({ title, message, onConfirm, variant });

  useEffect(() => {
    const loadData = async () => {
      const [menuData, itemsData, groupsData, subsData, logoData, nutData] = await Promise.all([
        storage.getMenu(),
        storage.getItems(),
        storage.getConfig(),
        storage.getSubstitutions(),
        storage.getLogo(),
        storage.getNutricionista(),
      ]);
      let snapshotsData: MenuSnapshot[] = [];
      try { snapshotsData = await storage.getMenuSnapshots(); } catch (_) { /* permission denied — ignore */ }
      let subcatsData: CategorySubcategories = {};
      try { subcatsData = await storage.getCategorySubcategories(); } catch (_) { /* ignore */ }
      setMenuDays(menuData);
      setItems(itemsData);
      setGroups(groupsData);
      setPrintGroups(new Set(groupsData.map((g: GroupConfig) => g.id)));
      setSubstitutions(subsData);
      setLogo(logoData);
      setNutricionista(nutData);
      setSnapshots(snapshotsData);
      setCategorySubcategories(subcatsData);
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
    const resolvedCategory = resolveMainCategory(category, categorySubcategories);
    return items.filter((it: Item) => (it.categorias?.length ? it.categorias : [it.categoria]).includes(resolvedCategory)).sort((a: Item, b: Item) => a.nome.localeCompare(b.nome));
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
    showConfirm(
      'Limpar Mês',
      `Tem certeza que deseja limpar todo o cardápio deste mês para o grupo ${selectedGroup.nomeCompleto}?`,
      () => {
        const updatedMenu = menuDays.filter((d: MenuDay) => !(isSameMonth(new Date(d.data), currentDate) && d.id.includes(selectedGroup!.id)));
        setMenuDays(updatedMenu);
        storage.saveMenu(updatedMenu);
        showToast('Mês limpo!');
      }
    );
  };

  const copyPreviousMonth = () => {
    if (!selectedGroup) return;
    const prevMonth = subMonths(currentDate, 1);
    const prevMonthMenu = menuDays.filter(d => isSameMonth(new Date(d.data), prevMonth) && d.id.includes(selectedGroup.id));
    
    if (prevMonthMenu.length === 0) {
      showToast(`Não há cardápio no mês anterior para o grupo ${selectedGroup.nomeCompleto}.`);
      return;
    }

    const prevLabel = format(prevMonth, 'MMMM yyyy', { locale: ptBR }).toUpperCase();
    const currLabel = format(currentDate, 'MMMM yyyy', { locale: ptBR }).toUpperCase();
    showConfirm(
      'Copiar Mês Anterior',
      <span>Copiar o cardápio de <strong>{prevLabel}</strong> para <strong>{currLabel}</strong> ({selectedGroup.nomeCompleto})? Os dias já planejados serão substituídos.</span>,
      () => {
        const newDays = daysInMonth
          .filter(date => !isWeekend(date))
          .map(date => {
            const dayNum = format(date, 'd');
            const sourceDay = prevMonthMenu.find((d: MenuDay) => format(new Date(d.data), 'd') === dayNum);
            const copiedFields: any = {};
            if (sourceDay) {
              selectedGroup!.colunas.forEach((col: MenuColumn) => {
                const fieldId = getFieldIdFromColumn(col.categoria);
                copiedFields[fieldId] = (sourceDay as any)[fieldId];
              });
              copiedFields.isFeriado = sourceDay.isFeriado;
            }
            return {
              id: `day-${date.getTime()}-${selectedGroup!.id}`,
              data: date.toISOString(),
              diaSemana: format(date, 'EEEE', { locale: ptBR }),
              ...copiedFields
            };
          });
        const updatedMenu = [...menuDays.filter((d: MenuDay) => !(isSameMonth(new Date(d.data), currentDate) && d.id.includes(selectedGroup!.id))), ...newDays];
        setMenuDays(updatedMenu);
        storage.saveMenu(updatedMenu);
        showToast('Mês anterior copiado!');
      },
      'primary'
    );
  };

  const getAIQuotaMessage = (): string => {
    const lastQuotaErrorTime = localStorage.getItem('gemini_last_quota_error');
    if (!lastQuotaErrorTime) {
      return '❌ Cota da API excedida. Aguarde ~1 minuto para tentar novamente.';
    }

    const lastError = parseInt(lastQuotaErrorTime, 10);
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - lastError) / 1000);
    const waitSeconds = Math.max(0, 60 - elapsedSeconds); // Reset por minuto

    if (waitSeconds === 0) {
      localStorage.removeItem('gemini_last_quota_error');
      return '✅ Cota reposta! Você pode tentar novamente.';
    }

    const minutesText = waitSeconds > 30 ? Math.ceil(waitSeconds / 60) : waitSeconds;
    const unit = waitSeconds > 30 ? 'min' : 's';
    
    return `⏳ Cota temporariamente excedida. Tente novamente em ${minutesText}${unit}. (Último uso: ${elapsedSeconds}s atrás)`;
  };

  const recordAIQuotaError = () => {
    localStorage.setItem('gemini_last_quota_error', Date.now().toString());
  };
    if (!selectedGroup) return;
    const apiKey = localStorage.getItem('gemini_api_key') || (import.meta as any).env?.VITE_GEMINI_API_KEY || '';
    if (!apiKey) {
      showToast('Configure a chave Gemini API em Configurações.');
      setIsAIModalOpen(false);
      return;
    }
    setAiStep('generating');
    try {
      const workdays = daysInMonth.filter(d => !isWeekend(d));
      if (workdays.length === 0) {
        showToast('Nenhum dia útil neste mês.');
        setAiStep('directives');
        return;
      }

      const ai = new GoogleGenAI({ apiKey });

      // Otimização 1: Pegar apenas itens relevantes para as COLUNAS do grupo
      const colunasInfo = selectedGroup.colunas.map(col => ({
        displayName: col.subcategoria || col.categoria,
        categoria: col.categoria,
        fieldId: col.categoria.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, '') + 'Id'
      }));

      // Otimização 2: REDUZIR itens para apenas os relevantes (6 por coluna)
      const itemsByColuna: Record<string, string[]> = {};
      colunasInfo.forEach(col => {
        const colItems = items
          .filter(it => {
            const cats = it.categorias?.length ? it.categorias : [it.categoria];
            return cats.includes(col.categoria);
          })
          .slice(0, 6)  // APENAS 6
          .map(it => it.nome);
        itemsByColuna[col.displayName] = colItems;
      });

      // Otimização 3: PROMPT MINIMALISTA para retornar sequências cíclicas
      const prompt = `Você é nutricionista. Crie uma SEQUÊNCIA CÍCLICA de itens para ${selectedGroup.nomeCompleto}${selectedGroup.restricao ? ` (${selectedGroup.restricao})` : ''}.

Directives: ${aiDirectives.trim() || 'Varie. Não repita na mesma semana.'}

Colunas e itens:
${colunasInfo.map(col => `${col.displayName}: ${itemsByColuna[col.displayName].join(', ')}`).join('\n')}

Retorne APENAS JSON (sem markdown):
{
  "sequences": {
    "Coluna1": ["item1", "item2", "item3"],
    "Coluna2": ["item1", "item2", "item3"]
  }
}

Regras:
- Cada sequência será alternada ciclicamente para cada dia útil
- Use apenas nomes de itens da lista fornecida
- Minimo 3 itens por sequência`;

      const response = await ai.models.generateContent({ 
        model: 'gemini-2.0-flash', 
        contents: prompt 
      });
      
      const text = response.text || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Resposta inválida. Tente novamente.');

      const parsed = JSON.parse(jsonMatch[0]);
      const sequences = parsed.sequences || {};

      // ===============================================
      // EXECUTOR: Aplica sequências de forma cíclica
      // ===============================================
      const itemNameToId: Record<string, string> = {};
      items.forEach(it => {
        itemNameToId[it.nome.toLowerCase()] = it.id;
      });

      const updated = [...menuDays];
      workdays.forEach((date, dayIdx) => {
        const assignments: any = {};

        // Para cada coluna, pega o item da sequência usando índice cíclico
        colunasInfo.forEach(col => {
          const sequence = sequences[col.displayName] || [];
          if (sequence.length === 0) return;

          const itemName = sequence[dayIdx % sequence.length];
          const itemId = itemNameToId[itemName.toLowerCase()];
          
          if (itemId) {
            assignments[col.fieldId] = itemId;
          }
        });

        if (Object.keys(assignments).length === 0) return;

        // Salva ou atualiza o dia
        const idx = updated.findIndex(d => 
          isSameDay(new Date(d.data), date) && d.id.includes(selectedGroup.id)
        );
        if (idx >= 0) {
          updated[idx] = { ...updated[idx], ...assignments };
        } else {
          updated.push({
            id: `day-${date.getTime()}-${selectedGroup.id}`,
            data: date.toISOString(),
            diaSemana: format(date, 'EEEE', { locale: ptBR }),
            ...assignments
          });
        }
      });

      setMenuDays(updated);
      await storage.saveMenu(updated);
      setIsAIModalOpen(false);
      setAiStep('directives');
      showToast(`✅ Padrão aplicado para ${workdays.length} dias úteis!`);

    } catch (e: any) {
      console.error('Erro IA:', e);
      
      const isQuotaError = e?.message?.includes('quota') || e?.message?.includes('429') || e?.message?.includes('RESOURCE_EXHAUSTED');
      
      if (isQuotaError) {
        recordAIQuotaError();
      }

      const msg = e?.message?.includes('API_KEY') || e?.message?.includes('API key')
        ? '❌ Chave Gemini API inválida. Verifique em Configurações.'
        : isQuotaError
        ? getAIQuotaMessage()
        : `❌ Erro: ${e?.message || 'verifique o console (F12)'}`;
      showToast(msg);
      setAiStep('directives');
    }
  };

  const mesAno = format(currentDate, 'MMMM yyyy', { locale: ptBR }).toUpperCase();

  return (
    <div className="p-6 w-full">
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
              <div style={{backgroundColor:'#f27205',padding:'6px 12px',display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'8px',gap:'12px'}}>
                <div style={{color:'white',minWidth:'0'}}>
                  <div style={{fontSize:'8px',fontWeight:'bold',textTransform:'uppercase',opacity:0.85,lineHeight:'1'}}>Canteen</div>
                  <div style={{fontSize:'15px',fontWeight:'900',textTransform:'uppercase',lineHeight:'1.1'}}>{group.nomeCompleto}</div>
                  <div style={{fontSize:'10px',textTransform:'uppercase',opacity:0.9,lineHeight:'1'}}>{mesAno}</div>
                </div>
                {logo && <img src={logo} alt="logo" style={{maxHeight:'48px',objectFit:'contain',flexShrink:0}} />}
                <div style={{color:'white',textAlign:'right',fontSize:'9px',flexShrink:0}}>
                  <div style={{fontWeight:'bold',lineHeight:'1.2'}}>{nutricionista.nome}</div>
                  {nutricionista.crn && <div style={{fontSize:'8px',lineHeight:'1'}}>CRN {nutricionista.crn}</div>}
                </div>
              </div>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:'10px',lineHeight:'1.3'}}>
                <thead>
                  <tr style={{backgroundColor:'#404040',color:'white'}}>
                    <th style={{padding:'4px 6px',textAlign:'left',border:'1px solid #ccc',whiteSpace:'nowrap',fontWeight:'bold',fontSize:'10px',minWidth:'60px'}}>Data</th>
                    {group.colunas.map(col => (
                      <th key={col.categoria} style={{padding:'4px 3px',textAlign:'left',border:'1px solid #ccc',fontWeight:'bold',fontSize:'9px'}}>{col.subcategoria || col.categoria}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {groupMonthMenu.filter(d => !isWeekend(new Date(d.data))).map((day, idx) => (
                    <tr key={day.id} style={{backgroundColor: day.isFeriado ? '#fff3e0' : idx % 2 === 0 ? '#fff' : '#f9f9f9',height:'18px'}}>
                      <td style={{padding:'2px 6px',border:'1px solid #eee',whiteSpace:'nowrap',fontWeight: day.isFeriado ? 'bold' : 'normal',fontSize:'10px',lineHeight:'1.1',minWidth:'60px'}}>
                        <span style={{fontWeight:'bold'}}>{format(new Date(day.data), 'dd/MM')}</span>
                        {' '}
                        <span style={{color:'#888',fontSize:'8px',textTransform:'capitalize'}}>{format(new Date(day.data), 'EEE', { locale: ptBR })}</span>
                      </td>
                      {group.colunas.map(col => {
                        const fieldId = getFieldIdFromColumn(col.categoria);
                        const itemId = day[fieldId as keyof MenuDay] as string;
                        return (
                          <td key={col.categoria} style={{padding:'2px 3px',border:'1px solid #eee',fontWeight: day.isFeriado ? 'bold' : 'normal',color: day.isFeriado ? '#f27205' : 'inherit',fontSize:'9.5px',lineHeight:'1.2'}}>
                            {day.isFeriado ? '🏖️' : (getItemName(itemId) || '')}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={group.colunas.length + 1} style={{paddingTop:'3px',paddingBottom:'2px',borderTop:'1px solid #ccc',fontSize:'8px',color:'#666'}}>
                      <div style={{display:'flex',justifyContent:'space-between',lineHeight:'1.2'}}>
                        <span>{nutricionista.nome}{nutricionista.crn ? ` — Nutricionista — CRN ${nutricionista.crn}` : ''}</span>
                        <span>Canteen</span>
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
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
          {/* Custom group selector */}
          <div className="relative">
            {isGroupDropdownOpen && (
              <div className="fixed inset-0 z-10" onClick={() => setIsGroupDropdownOpen(false)} />
            )}
            <button
              onClick={() => setIsGroupDropdownOpen((o: boolean) => !o)}
              className="bg-white border border-slate-200 px-5 py-3 rounded-2xl flex items-center gap-3 transition-all shadow-sm hover:bg-slate-50 min-w-[220px] relative z-20"
            >
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: selectedGroup?.cor || '#94a3b8' }} />
              <span className="flex-1 text-left font-black text-sm text-brand-blue uppercase tracking-widest truncate">
                {selectedGroup?.nomeCompleto || 'Selecionar grupo'}
              </span>
              <ChevronDown size={16} className={cn("text-slate-400 transition-transform shrink-0", isGroupDropdownOpen && "rotate-180")} />
            </button>
            {isGroupDropdownOpen && (
              <div className="absolute top-full mt-2 left-0 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 overflow-hidden min-w-[260px] py-1">
                {groups.map((g: GroupConfig) => (
                  <button
                    key={g.id}
                    onClick={() => { setSelectedGroup(g); setIsGroupDropdownOpen(false); }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50",
                      selectedGroup?.id === g.id ? "bg-brand-blue/5" : ""
                    )}
                  >
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: g.cor }} />
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm text-brand-blue uppercase tracking-widest truncate">{g.nomeCompleto}</p>
                      {g.nomeCurto !== g.nomeCompleto && (
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{g.nomeCurto}</p>
                      )}
                    </div>
                    {selectedGroup?.id === g.id && <CheckCircle2 size={14} className="text-brand-blue shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button 
            onClick={copyPreviousMonth}
            className="bg-white hover:bg-slate-50 text-brand-lime border border-slate-200 px-6 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-sm font-black text-sm uppercase tracking-widest"
          >
            <Copy size={20} />
            Copiar Mês Anterior
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
            onClick={() => setIsHistoryOpen(true)}
            className="bg-white hover:bg-slate-50 text-slate-500 border border-slate-200 px-4 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-sm font-black text-sm uppercase tracking-widest"
          >
            <History size={20} />
          </button>
          <button
            onClick={() => { setAiStep('directives'); setAiDirectives(''); setIsAIModalOpen(true); }}
            className="bg-brand-blue hover:bg-brand-blue/90 text-white px-6 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-lg shadow-brand-blue/20 font-black text-sm uppercase tracking-widest"
          >
            <Sparkles size={20} />
            Gerar com IA
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
        {!selectedGroup && (
          <div className="text-center py-16 text-slate-400 font-bold text-sm">Nenhum grupo configurado. Acesse Configurações para criar grupos.</div>
        )}
        {selectedGroup && currentMonthMenu.map((day: MenuDay) => {
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
                  "py-2 px-4 flex items-center gap-3 border-r transition-colors shrink-0 min-w-[160px]",
                  day.isFeriado ? "bg-brand-orange/10 border-brand-orange/20" : "bg-slate-50/50 border-slate-100 group-hover:bg-brand-blue/5"
                )}>
                  <span className="text-base font-black text-brand-blue tabular-nums whitespace-nowrap">{format(new Date(day.data), 'dd/MM')}</span>
                  <span className="text-sm font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                    {(() => { const s = format(new Date(day.data), 'EEEE', { locale: ptBR }).split('-')[0].trim(); return `- ${s.charAt(0).toUpperCase()}${s.slice(1)}`; })()}
                  </span>
                  {day.isFeriado && (
                    <span className="ml-2 px-2 py-0.5 rounded-full bg-brand-orange text-white text-[8px] font-black uppercase">FER</span>
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
                            <CompactMealSlot label={col.subcategoria || col.categoria} itemName={itemName} />
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
                          label={col.subcategoria || col.categoria}
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
      {/* AI Generation Modal */}
      {isAIModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-brand-blue/5 rounded-2xl text-brand-blue"><Sparkles size={24} /></div>
                <div>
                  <h2 className="text-xl font-black text-brand-blue uppercase tracking-tight">Gerar com IA</h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{selectedGroup?.nomeCompleto} — {format(currentDate, 'MMMM yyyy', { locale: ptBR })}</p>
                </div>
              </div>
              {aiStep !== 'generating' && (
                <button onClick={() => setIsAIModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <X size={24} className="text-slate-400" />
                </button>
              )}
            </div>

            {/* Step 1: Directives */}
            {aiStep === 'directives' && (
              <>
                <div className="flex-1 overflow-y-auto p-8 space-y-6">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Diretrizes para a IA</label>
                    <textarea
                      className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 font-medium text-slate-900 resize-none text-sm leading-relaxed"
                      rows={7}
                      placeholder={`Descreva suas diretrizes para o cardápio deste grupo...

Exemplos:
• Manter a categoria Fruta como Seleção da Estação
• Variar proteínas ao longo da semana (não repetir na mesma semana)
• Priorizar carboidratos integrais às sextas-feiras
• Este grupo prefere feijão-preto a lentilha`}
                      value={aiDirectives}
                      onChange={e => setAiDirectives(e.target.value)}
                    />
                  </div>
                  <div className="bg-brand-blue/5 rounded-2xl p-4 flex gap-3">
                    <Sparkles size={16} className="text-brand-blue shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-black text-brand-blue uppercase tracking-widest mb-1">✨ Novo Modo: Padrão + Executor</p>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        A IA cria <strong>sequências cíclicas</strong> para cada coluna. Um executor interno aplica automaticamente ao mês inteiro!
                        <br />
                        <br />
                        <strong>Exemplo:</strong> Fruta = [Maçã, Pera, Banana] → Dia 1: Maçã, Dia 2: Pera, Dia 3: Banana, Dia 4: Maçã...
                        <br />
                        <br />
                        <strong>Benefícios:</strong> -80% tokens | Mais rápido | Sem erros de alternância
                      </p>
                    </div>
                  </div>
                  {(() => {
                    const lastQuotaErrorTime = localStorage.getItem('gemini_last_quota_error');
                    if (!lastQuotaErrorTime) return null;
                    const elapsedSeconds = Math.floor((Date.now() - parseInt(lastQuotaErrorTime, 10)) / 1000);
                    const waitSeconds = Math.max(0, 60 - elapsedSeconds);
                    if (waitSeconds === 0) return null;
                    return (
                      <div className="bg-brand-orange/10 border border-brand-orange/30 rounded-2xl p-3 flex gap-2">
                        <div className="text-brand-orange mt-0.5">⏳</div>
                        <p className="text-xs text-brand-orange leading-relaxed">
                          <strong>Cota em repouso:</strong> Tente novamente em {waitSeconds > 30 ? Math.ceil(waitSeconds / 60) + ' min' : waitSeconds + 's'} (último uso: {elapsedSeconds}s atrás)
                        </p>
                      </div>
                    );
                  })()}
                </div>
                <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
                  <button onClick={() => setIsAIModalOpen(false)} className="flex-1 py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-slate-500 hover:bg-slate-200 transition-all">
                    Cancelar
                  </button>
                  <button onClick={generateAIPreview} className="flex-[2] bg-brand-blue hover:bg-brand-blue/90 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-brand-blue/20">
                    <Sparkles size={18} />
                    Gerar Padrão do Mês
                  </button>
                </div>
              </>
            )}

            {/* Step 2: Generating */}
            {aiStep === 'generating' && (
              <div className="flex-1 flex flex-col items-center justify-center py-24 gap-6">
                <div className="w-20 h-20 rounded-3xl bg-brand-blue/10 flex items-center justify-center text-brand-blue">
                  <Sparkles size={36} className="animate-pulse" />
                </div>
                <div className="text-center space-y-2">
                  <p className="font-black text-xl text-brand-blue uppercase tracking-tight">Gerando Padrões...</p>
                  <p className="text-sm text-slate-400">IA criando sequências cíclicas. Executor aplicando ao mês...</p>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* History Modal */}
      {isHistoryOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-blue/5 rounded-xl text-brand-blue"><History size={18} /></div>
                <h2 className="text-lg font-black text-brand-blue uppercase tracking-tight">Histórico IA</h2>
              </div>
              <button onClick={() => setIsHistoryOpen(false)} className="p-2 hover:bg-slate-100 rounded-full">
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {snapshots.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm font-bold">Nenhum histórico ainda.</div>
              ) : (
                snapshots.map((snap: MenuSnapshot) => (
                  <div key={snap.id} className="flex items-center justify-between gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div>
                      <p className="font-black text-sm text-brand-blue uppercase tracking-widest">{snap.label}</p>
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">{new Date(snap.createdAt).toLocaleString('pt-BR')}</p>
                    </div>
                    <button
                      onClick={() => showConfirm(
                        'Restaurar Snapshot',
                        `Restaurar "${snap.label}"? Os dias desse mês serão substituídos pela versão salva.`,
                        async () => {
                          const otherDays = menuDays.filter((d: MenuDay) => !snap.menuDays.some((sd: MenuDay) => sd.id === d.id));
                          const restored = [...otherDays, ...snap.menuDays];
                          setMenuDays(restored);
                          await storage.saveMenu(restored);
                          setIsHistoryOpen(false);
                          showToast('Snapshot restaurado!');
                        },
                        'primary'
                      )}
                      className="px-4 py-2 bg-brand-blue text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-brand-blue/90 transition-colors shrink-0"
                    >
                      Restaurar
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden">
            <div className="p-8 text-center space-y-3">
              <h3 className="text-lg font-black text-brand-blue uppercase tracking-tight">{confirmModal.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{confirmModal.message}</p>
            </div>
            <div className="px-8 pb-8 flex gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 py-3 rounded-2xl font-black text-sm uppercase tracking-widest text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => { confirmModal.onConfirm(); setConfirmModal(null); }}
                className={cn(
                  "flex-[2] py-3 rounded-2xl font-black text-sm uppercase tracking-widest text-white transition-all",
                  confirmModal.variant === 'destructive'
                    ? "bg-brand-orange hover:bg-brand-orange/90 shadow-lg shadow-brand-orange/20"
                    : "bg-brand-blue hover:bg-brand-blue/90 shadow-lg shadow-brand-blue/20"
                )}
              >
                Confirmar
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
      <span className="text-sm font-black uppercase tracking-widest text-slate-400 whitespace-nowrap">{label}:</span>
      {itemName
        ? <span className="text-sm font-black text-slate-800 truncate">{itemName}</span>
        : <span className="text-sm text-slate-300 italic">—</span>
      }
    </div>
  );
}
