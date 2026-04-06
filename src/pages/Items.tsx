import React, { useState, useMemo, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, Egg, Milk, Wheat, X, Save, Copy, Settings, CheckCircle2, SortAsc, Tag, Clock } from 'lucide-react';
import { storage } from '../services/storage';
import { Item, Category } from '../types';
import { cn } from '../lib/utils';

type SortMode = 'category' | 'alpha' | 'recent';

export default function Items() {
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const [itemsData, categoriesData] = await Promise.all([
        storage.getItems(),
        storage.getCategories()
      ]);
      setItems(itemsData);
      setCategories(categoriesData);
    };
    loadData();
  }, []);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [sortMode, setSortMode] = useState<SortMode>('category');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isInheritModalOpen, setIsInheritModalOpen] = useState(false);
  const [inheritTargetCategory, setInheritTargetCategory] = useState('');
  const [inheritSourceCategory, setInheritSourceCategory] = useState('');
  const [inheritSelected, setInheritSelected] = useState<Set<string>>(new Set());
  const [editingItem, setEditingItem] = useState<Partial<Item> | null>(null);
  const [newCategory, setNewCategory] = useState('');
  const [editingCategory, setEditingCategory] = useState<{old: string, new: string} | null>(null);
  const [cloningCategory, setCloningCategory] = useState<{source: string, newName: string} | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const showConfirm = (title: string, message: string, onConfirm: () => void) => setConfirmModal({ title, message, onConfirm });

  const filteredItems = useMemo(() => {
    const base = items.filter((item: Item) => {
      const matchesSearch = item.nome.toLowerCase().includes(searchTerm.toLowerCase());
      const allCats = item.categorias?.length ? item.categorias : [item.categoria];
      const matchesCategory = selectedCategory === 'Todas' || allCats.includes(selectedCategory);
      return matchesSearch && matchesCategory;
    });
    if (sortMode === 'alpha') return [...base].sort((a, b) => a.nome.localeCompare(b.nome));
    if (sortMode === 'recent') {
      return [...base].sort((a, b) => {
        const tsA = parseInt(a.id.split('-')[1] || '0');
        const tsB = parseInt(b.id.split('-')[1] || '0');
        return tsB - tsA;
      });
    }
    // category: group by category, each group alphabetical
    return [...base].sort((a, b) => a.categoria.localeCompare(b.categoria) || a.nome.localeCompare(b.nome));
  }, [items, searchTerm, selectedCategory, sortMode]);

  const groupedItems = useMemo(() => {
    if (sortMode !== 'category') return null;
    const map: Record<string, Item[]> = {};
    filteredItems.forEach((item: Item) => {
      const cats = item.categorias?.length ? item.categorias : [item.categoria];
      cats.forEach((cat: string) => {
        if (!map[cat]) map[cat] = [];
        map[cat].push(item);
      });
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredItems, sortMode]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cats = (editingItem as any)?.categorias as string[] | undefined;
    if (!editingItem?.nome || (!editingItem?.categoria && !cats?.length)) return;
    // keep categoria in sync with first selected category
    const primaryCat = cats?.length ? cats[0] : editingItem.categoria;
    const itemToSave: Item = {
      ...(editingItem as Item),
      categoria: primaryCat,
      categorias: cats?.length ? cats : [primaryCat],
    };
    let updatedItems: Item[];
    if (editingItem.id) {
      updatedItems = items.map((it: Item) => it.id === editingItem.id ? itemToSave : it);
    } else {
      updatedItems = [...items, { ...itemToSave, id: `item-${Date.now()}` }];
    }
    setItems(updatedItems);
    storage.saveItems(updatedItems);
    setIsModalOpen(false);
    setEditingItem(null);
    showToast(editingItem.id ? 'Item atualizado!' : 'Item criado!');
  };

  const handleDelete = (id: string) => {
    showConfirm('Excluir Item', 'Deseja realmente excluir este item?', () => {
      const updatedItems = items.filter(it => it.id !== id);
      setItems(updatedItems);
      storage.saveItems(updatedItems);
    });
  };

  const handleDuplicate = (item: Item) => {
    const newItem: Item = { ...item, id: `item-${Date.now()}`, nome: `${item.nome} (Cópia)` };
    const updatedItems = [...items, newItem];
    setItems(updatedItems);
    storage.saveItems(updatedItems);
  };

  const openModal = (item?: Item) => {
    const base = item || { nome: '', categoria: categories[0] || '', contemOvo: false, contemLactose: false, contemGluten: false, negrito: false, corFundo: '#ffffff' };
    const baseWithCats = { ...base, categorias: (base as Item).categorias?.length ? (base as Item).categorias : [(base as Item).categoria].filter(Boolean) };
    setEditingItem(baseWithCats);
    setIsModalOpen(true);
  };

  const handleAddCategory = async () => {
    const name = newCategory.trim();
    if (!name || categories.includes(name)) return;
    const updated = [...categories, name];
    setCategories(updated);
    await storage.saveCategories(updated);
    setNewCategory('');
    showToast('Categoria adicionada!');
  };

  const handleEditCategory = () => {
    if (!editingCategory || !editingCategory.new || categories.includes(editingCategory.new)) return;
    const updatedCategories = categories.map((c: string) => c === editingCategory.old ? editingCategory.new : c);
    const updatedItems = items.map((it: Item) => {
      const cats = it.categorias?.length ? it.categorias : [it.categoria];
      const newCats = cats.map((c: string) => c === editingCategory.old ? editingCategory.new : c);
      return { ...it, categoria: newCats[0], categorias: newCats };
    });
    setCategories(updatedCategories);
    setItems(updatedItems);
    storage.saveCategories(updatedCategories);
    storage.saveItems(updatedItems);
    setEditingCategory(null);
  };

  const handleCloneCategory = () => {
    if (!cloningCategory || !cloningCategory.newName.trim()) return;
    const newName = cloningCategory.newName.trim();
    if (categories.includes(newName)) { showToast(`Categoria "${newName}" já existe.`); return; }
    const updatedCategories = [...categories, newName];
    const newItems: Item[] = items
      .filter((it: Item) => (it.categorias?.length ? it.categorias : [it.categoria]).includes(cloningCategory.source))
      .map((it: Item) => ({ ...it, id: `item-${Date.now()}-${Math.random().toString(36).slice(2)}`, categoria: newName, categorias: [newName] }));
    const updatedItems = [...items, ...newItems];
    setCategories(updatedCategories);
    setItems(updatedItems);
    storage.saveCategories(updatedCategories);
    storage.saveItems(updatedItems);
    setCloningCategory(null);
    showToast(`Categoria "${newName}" criada com ${newItems.length} itens!`);
  };

  const handleDeleteCategory = (cat: string) => {
    showConfirm(
      'Excluir Categoria',
      `Deseja excluir a categoria "${cat}"? Itens nesta categoria não serão excluídos.`,
      () => {
        const updated = categories.filter((c: string) => c !== cat);
        setCategories(updated);
        storage.saveCategories(updated);
        if (selectedCategory === cat) setSelectedCategory('Todas');
      }
    );
  };

  // Inherit items modal
  const inheritSourceItems = useMemo(() => {
    if (!inheritSourceCategory) return [];
    return items.filter((i: Item) => (i.categorias?.length ? i.categorias : [i.categoria]).includes(inheritSourceCategory)).sort((a: Item, b: Item) => a.nome.localeCompare(b.nome));
  }, [inheritSourceCategory, items]);

  const handleOpenInherit = (targetCategory: string) => {
    setInheritTargetCategory(targetCategory);
    setInheritSourceCategory('');
    setInheritSelected(new Set());
    setIsInheritModalOpen(true);
  };

  const handleInheritConfirm = async () => {
    if (!inheritSourceCategory || inheritSelected.size === 0) return;
    const copied: Item[] = Array.from(inheritSelected).map(id => {
      const src = items.find((i: Item) => i.id === id)!;
      return { ...src, id: `item-${Date.now()}-${Math.random().toString(36).slice(2)}`, categoria: inheritTargetCategory };
    });
    const updatedItems = [...items, ...copied];
    setItems(updatedItems);
    await storage.saveItems(updatedItems);
    setIsInheritModalOpen(false);
    showToast(`${copied.length} itens herdados para "${inheritTargetCategory}"!`);
  };

  const ItemRow = ({ item, index }: { item: Item; index: number }) => (
    <div className={cn(
      "flex items-center gap-3 px-4 py-2.5 border-b border-slate-50 last:border-0 hover:bg-brand-blue/5 group transition-colors",
      index % 2 === 0 ? "bg-white" : "bg-slate-100"
    )}>
      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.corFundo && item.corFundo !== '#ffffff' ? item.corFundo : '#e2e8f0' }} />
      <span className={cn("flex-1 text-sm text-slate-800 truncate", item.negrito ? "font-black" : "font-medium")}>
        {item.nome}
      </span>
      {sortMode !== 'category' && (
        <span className="hidden md:inline text-[9px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full uppercase tracking-widest shrink-0">
          {item.categoria}
        </span>
      )}
      {(item.categorias?.length ?? 0) > 1 && (
        <span className="hidden md:inline text-[9px] font-black text-brand-blue bg-brand-blue/10 px-2 py-0.5 rounded-full uppercase tracking-widest shrink-0">
          +{item.categorias!.length - 1}
        </span>
      )}
      <div className="flex items-center gap-1 shrink-0">
        {item.contemOvo && <span className="text-[8px] font-black text-brand-orange bg-brand-orange/10 px-1.5 py-0.5 rounded uppercase">OVO</span>}
        {item.contemLactose && <span className="text-[8px] font-black text-brand-blue bg-brand-blue/10 px-1.5 py-0.5 rounded uppercase">LAC</span>}
        {item.contemGluten && <span className="text-[8px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded uppercase">GLU</span>}
      </div>
      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button onClick={() => handleDuplicate(item)} className="p-1.5 text-slate-300 hover:text-brand-lime hover:bg-brand-lime/5 rounded-lg transition-colors">
          <Copy size={13} />
        </button>
        <button onClick={() => openModal(item)} className="p-1.5 text-slate-300 hover:text-brand-blue hover:bg-brand-blue/5 rounded-lg transition-colors">
          <Edit2 size={13} />
        </button>
        <button onClick={() => handleDelete(item.id)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="p-6 w-full">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-brand-lime text-white px-6 py-3 rounded-2xl shadow-lg font-black text-sm uppercase tracking-widest flex items-center gap-2">
          <CheckCircle2 size={18} /> {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-brand-blue uppercase tracking-tight">Banco de Itens</h1>
          <p className="text-slate-500 font-medium">Gerencie os alimentos disponíveis para o cardápio.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="bg-white hover:bg-slate-50 text-brand-blue border border-slate-200 px-6 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-sm font-black text-sm uppercase tracking-widest"
          >
            <Settings size={20} />
            Categorias
          </button>
          <button
            onClick={() => openModal()}
            className="bg-brand-orange hover:bg-brand-orange/90 text-white px-6 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-lg shadow-brand-orange/20 font-black text-sm uppercase tracking-widest"
          >
            <Plus size={20} />
            Novo Item
          </button>
        </div>
      </div>

      {/* Search — large, prominent */}
      <div className="relative mb-4">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input
          type="text"
          placeholder="Pesquisar item..."
          className="w-full pl-14 pr-5 py-4 rounded-2xl bg-white border border-slate-200 shadow-sm text-base focus:ring-2 focus:ring-brand-blue/20 transition-all font-medium text-slate-900"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Sort + Category filter bar */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-5">
        {/* Sort pills */}
        <div className="flex items-center gap-1.5 shrink-0">
          {([
            { key: 'category', icon: Tag, label: 'Categoria' },
            { key: 'alpha', icon: SortAsc, label: 'A–Z' },
            { key: 'recent', icon: Clock, label: 'Recentes' },
          ] as { key: SortMode, icon: any, label: string }[]).map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setSortMode(key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                sortMode === key ? "bg-brand-blue text-white shadow-sm" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              )}
            >
              <Icon size={12} />
              {label}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-slate-200 hidden md:block shrink-0" />

        {/* Category filter pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 flex-1">
          <button
            onClick={() => setSelectedCategory('Todas')}
            className={cn(
              "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
              selectedCategory === 'Todas' ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            )}
          >
            Todas
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                selectedCategory === cat ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Item count */}
      {filteredItems.length > 0 && (
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
          {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'itens'}
        </p>
      )}

      {/* Items list */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <Search size={32} className="text-slate-200 mx-auto mb-3" />
          <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">Nenhum item encontrado</h3>
          <p className="text-slate-500 font-medium text-sm">Tente ajustar sua busca ou filtros.</p>
        </div>
      ) : groupedItems ? (
        <div className="space-y-3">
          {groupedItems.map(([category, catItems]) => (
            <div key={category} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                <span className="text-[10px] font-black text-brand-blue uppercase tracking-widest">{category}</span>
                <span className="text-[9px] font-bold text-slate-400">{catItems.length}</span>
              </div>
              {catItems.map((item: Item, i: number) => <ItemRow key={item.id} item={item} index={i} />)}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {filteredItems.map((item: Item, i: number) => <ItemRow key={item.id} item={item} index={i} />)}
        </div>
      )}

      {/* Item Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-xl font-black text-brand-blue uppercase tracking-tight">
                {editingItem?.id ? 'Editar Item' : 'Novo Item'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={24} className="text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Nome do Alimento</label>
                <input
                  autoFocus required type="text"
                  className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-brand-blue/20 font-bold text-slate-900"
                  value={editingItem?.nome}
                  onChange={e => setEditingItem({...editingItem, nome: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">
                  Categorias <span className="text-brand-blue normal-case font-bold">({((editingItem as any)?.categorias as string[] | undefined)?.length ?? 0} selecionada{((editingItem as any)?.categorias as string[] | undefined)?.length === 1 ? '' : 's'})</span>
                </label>
                <div className="max-h-40 overflow-y-auto rounded-2xl bg-slate-50 p-3 space-y-1">
                  {categories.map((cat: string) => {
                    const selected: string[] = (editingItem as any)?.categorias ?? [];
                    const isOn = selected.includes(cat);
                    return (
                      <label key={cat} className={cn("flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-colors", isOn ? "bg-brand-blue/10" : "hover:bg-slate-100")}>
                        <input
                          type="checkbox"
                          className="w-4 h-4 accent-brand-blue"
                          checked={isOn}
                          onChange={() => {
                            const next = isOn ? selected.filter(c => c !== cat) : [...selected, cat];
                            setEditingItem({...editingItem, categorias: next, categoria: next[0] ?? ''} as any);
                          }}
                        />
                        <span className={cn("text-sm font-bold", isOn ? "text-brand-blue" : "text-slate-700")}>{cat}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Cor de Destaque</label>
                <input
                  type="color"
                  className="w-full h-[48px] rounded-2xl bg-slate-50 border-none cursor-pointer p-1"
                  value={editingItem?.corFundo}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingItem({...editingItem, corFundo: e.target.value})}
                />
              </div>
              <div className="space-y-4 pt-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Restrições e Estilo</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'contemOvo', label: 'Contém Ovo', icon: Egg },
                    { key: 'contemLactose', label: 'Contém Lactose', icon: Milk },
                    { key: 'contemGluten', label: 'Contém Glúten', icon: Wheat },
                    { key: 'negrito', label: 'Texto em Negrito', icon: Plus },
                  ].map(opt => (
                    <button
                      key={opt.key} type="button"
                      onClick={() => setEditingItem({...editingItem, [opt.key]: !editingItem?.[opt.key as keyof typeof editingItem]})}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all font-bold text-sm",
                        editingItem?.[opt.key as keyof typeof editingItem]
                          ? "bg-brand-blue/5 border-brand-blue text-brand-blue"
                          : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                      )}
                    >
                      <opt.icon size={18} />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-all">
                  Cancelar
                </button>
                <button type="submit" className="flex-[2] bg-brand-lime hover:bg-brand-lime/90 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-lg shadow-brand-lime/20 flex items-center justify-center gap-2">
                  <Save size={20} />
                  Salvar Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Management Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-xl font-black text-brand-blue uppercase tracking-tight">Gerenciar Categorias</h2>
              <button onClick={() => setIsCategoryModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={24} className="text-slate-400" />
              </button>
            </div>
            <div className="p-8 space-y-6">
              {/* Add new category */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nova categoria..."
                  className="flex-1 px-5 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-brand-blue/20 font-bold text-slate-900"
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
                  onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && handleAddCategory()}
                />
                <button onClick={handleAddCategory} className="bg-brand-blue text-white p-4 rounded-2xl hover:bg-brand-blue/90 transition-all">
                  <Plus size={24} />
                </button>
              </div>

              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                {categories.map(cat => (
                  <div key={cat} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl group">
                    {editingCategory?.old === cat ? (
                      <div className="flex-1 flex gap-2">
                        <input
                          type="text"
                          className="flex-1 px-3 py-2 rounded-xl bg-white border border-slate-200 font-bold text-slate-900"
                          value={editingCategory.new}
                          onChange={e => setEditingCategory({...editingCategory, new: e.target.value})}
                          onKeyPress={e => e.key === 'Enter' && handleEditCategory()}
                        />
                        <button onClick={handleEditCategory} className="p-2 text-brand-lime hover:bg-brand-lime/5 rounded-xl"><Save size={18} /></button>
                        <button onClick={() => setEditingCategory(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl"><X size={18} /></button>
                      </div>
                    ) : cloningCategory?.source === cat ? (
                      <div className="flex-1 flex gap-2">
                        <input
                          autoFocus type="text"
                          placeholder="Nome da nova categoria..."
                          className="flex-1 px-3 py-2 rounded-xl bg-white border border-slate-200 font-bold text-slate-900 text-sm"
                          value={cloningCategory.newName}
                          onChange={e => setCloningCategory({...cloningCategory, newName: e.target.value})}
                          onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && handleCloneCategory()}
                        />
                        <button onClick={handleCloneCategory} className="p-2 text-brand-lime hover:bg-brand-lime/5 rounded-xl"><Save size={18} /></button>
                        <button onClick={() => setCloningCategory(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl"><X size={18} /></button>
                      </div>
                    ) : (
                      <>
                        <span className="font-bold text-slate-700 text-sm flex-1">{cat}</span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleOpenInherit(cat)}
                            className="p-1.5 text-slate-300 hover:text-brand-orange hover:bg-brand-orange/5 rounded-xl transition-all"
                            title="Herdar itens de outra categoria"
                          >
                            <Plus size={15} />
                          </button>
                          <button
                            onClick={() => setCloningCategory({ source: cat, newName: `${cat} (Cópia)` })}
                            className="p-1.5 text-slate-300 hover:text-brand-lime hover:bg-brand-lime/5 rounded-xl transition-all"
                            title="Clonar categoria"
                          >
                            <Copy size={15} />
                          </button>
                          <button
                            onClick={() => setEditingCategory({ old: cat, new: cat })}
                            className="p-1.5 text-slate-300 hover:text-brand-blue hover:bg-brand-blue/5 rounded-xl transition-all"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(cat)}
                            className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inherit Items Modal */}
      {isInheritModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h2 className="text-lg font-black text-brand-blue uppercase tracking-tight">Herdar Itens</h2>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Para: <span className="font-black text-brand-orange">{inheritTargetCategory}</span></p>
              </div>
              <button onClick={() => setIsInheritModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Copiar de</label>
                <select
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-brand-blue/20 font-bold text-slate-900 appearance-none"
                  value={inheritSourceCategory}
                  onChange={e => { setInheritSourceCategory(e.target.value); setInheritSelected(new Set()); }}
                >
                  <option value="">— Selecione uma categoria —</option>
                  {categories.filter(c => c !== inheritTargetCategory).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {inheritSourceCategory && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Itens ({inheritSelected.size}/{inheritSourceItems.length} selecionados)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        if (inheritSelected.size === inheritSourceItems.length) setInheritSelected(new Set());
                        else setInheritSelected(new Set(inheritSourceItems.map(i => i.id)));
                      }}
                      className="text-[10px] font-black text-brand-blue uppercase tracking-widest hover:underline"
                    >
                      {inheritSelected.size === inheritSourceItems.length ? 'Desmarcar todos' : 'Selecionar todos'}
                    </button>
                  </div>
                  <div className="max-h-[280px] overflow-y-auto space-y-1 bg-slate-50 rounded-2xl p-2">
                    {inheritSourceItems.map(item => (
                      <label key={item.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white cursor-pointer transition-colors group">
                        <div className={cn(
                          "w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all",
                          inheritSelected.has(item.id) ? "bg-brand-blue border-brand-blue" : "border-slate-300 group-hover:border-brand-blue"
                        )}>
                          {inheritSelected.has(item.id) && <div className="w-2 h-1.5 rounded-sm bg-white" />}
                        </div>
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={inheritSelected.has(item.id)}
                          onChange={() => {
                            const next = new Set(inheritSelected);
                            if (next.has(item.id)) next.delete(item.id); else next.add(item.id);
                            setInheritSelected(next);
                          }}
                        />
                        <span className="text-sm font-medium text-slate-700">{item.nome}</span>
                        <div className="flex gap-1 ml-auto">
                          {item.contemOvo && <span className="text-[8px] font-black text-brand-orange bg-brand-orange/10 px-1.5 py-0.5 rounded">OVO</span>}
                          {item.contemLactose && <span className="text-[8px] font-black text-brand-blue bg-brand-blue/10 px-1.5 py-0.5 rounded">LAC</span>}
                          {item.contemGluten && <span className="text-[8px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">GLU</span>}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsInheritModalOpen(false)} className="flex-1 py-3 rounded-2xl font-black text-sm uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-all">
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={inheritSelected.size === 0}
                  onClick={handleInheritConfirm}
                  className="flex-[2] bg-brand-lime hover:bg-brand-lime/90 disabled:opacity-40 text-white py-3 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                >
                  <Plus size={18} />
                  Herdar {inheritSelected.size > 0 ? `${inheritSelected.size} ` : ''}Itens
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden">
            <div className="p-8 text-center space-y-3">
              <h3 className="text-lg font-black text-brand-blue uppercase tracking-tight">{confirmModal.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{confirmModal.message}</p>
            </div>
            <div className="px-8 pb-8 flex gap-3">
              <button onClick={() => setConfirmModal(null)} className="flex-1 py-3 rounded-2xl font-black text-sm uppercase tracking-widest text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all">Cancelar</button>
              <button onClick={() => { confirmModal.onConfirm(); setConfirmModal(null); }}
                className="flex-[2] py-3 rounded-2xl font-black text-sm uppercase tracking-widest text-white bg-brand-orange hover:bg-brand-orange/90 shadow-lg shadow-brand-orange/20 transition-all">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
