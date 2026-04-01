import React, { useState, useMemo, useEffect } from 'react';
import { Search, Plus, Filter, Edit2, Trash2, Egg, Milk, Wheat, X, Save, Copy, Settings, CheckCircle2 } from 'lucide-react';
import { storage } from '../services/storage';
import { Item, Category } from '../types';
import { cn } from '../lib/utils';

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
  const [selectedCategory, setSelectedCategory] = useState<string | 'Todas'>('Todas');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<Item> | null>(null);
  const [newCategory, setNewCategory] = useState('');
  const [inheritFromCategory, setInheritFromCategory] = useState('');

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.nome.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'Todas' || item.categoria === selectedCategory;
      return matchesSearch && matchesCategory;
    }).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [items, searchTerm, selectedCategory]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem?.nome || !editingItem?.categoria) return;

    let updatedItems: Item[];
    if (editingItem.id) {
      updatedItems = items.map(it => it.id === editingItem.id ? editingItem as Item : it);
    } else {
      const newItem: Item = {
        ...editingItem as Item,
        id: `item-${Date.now()}`,
      };
      updatedItems = [...items, newItem];
    }

    setItems(updatedItems);
    storage.saveItems(updatedItems);
    setIsModalOpen(false);
    setEditingItem(null);
    showToast(editingItem.id ? 'Item atualizado!' : 'Item criado!');
  };

  const handleDelete = (id: string) => {
    if (!confirm('Deseja realmente excluir este item?')) return;
    const updatedItems = items.filter(it => it.id !== id);
    setItems(updatedItems);
    storage.saveItems(updatedItems);
  };

  const handleDuplicate = (item: Item) => {
    const newItem: Item = {
      ...item,
      id: `item-${Date.now()}`,
      nome: `${item.nome} (Cópia)`,
    };
    const updatedItems = [...items, newItem];
    setItems(updatedItems);
    storage.saveItems(updatedItems);
  };

  const openModal = (item?: Item) => {
    setEditingItem(item || {
      nome: '',
      categoria: categories[0] || '',
      contemOvo: false,
      contemLactose: false,
      contemGluten: false,
      negrito: false,
      corFundo: '#ffffff'
    });
    setIsModalOpen(true);
  };

  const [editingCategory, setEditingCategory] = useState<{old: string, new: string} | null>(null);
  const [cloningCategory, setCloningCategory] = useState<{source: string, newName: string} | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const handleAddCategory = async () => {
    const name = newCategory.trim();
    if (!name || categories.includes(name)) return;
    const updated = [...categories, name];
    setCategories(updated);
    await storage.saveCategories(updated);
    if (inheritFromCategory) {
      const sourceItems = items.filter(i => i.categoria === inheritFromCategory);
      const copied = sourceItems.map(i => ({
        ...i,
        id: `item-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        categoria: name
      }));
      if (copied.length > 0) {
        const updatedItems = [...items, ...copied];
        setItems(updatedItems);
        await storage.saveItems(updatedItems);
        showToast(`Categoria criada com ${copied.length} itens herdados!`);
      } else {
        showToast('Categoria adicionada!');
      }
    } else {
      showToast('Categoria adicionada!');
    }
    setNewCategory('');
    setInheritFromCategory('');
  };

  const handleEditCategory = () => {
    if (!editingCategory || !editingCategory.new || categories.includes(editingCategory.new)) return;
    
    const updatedCategories = categories.map(c => c === editingCategory.old ? editingCategory.new : c);
    const updatedItems = items.map(it => it.categoria === editingCategory.old ? { ...it, categoria: editingCategory.new } : it);
    
    setCategories(updatedCategories);
    setItems(updatedItems);
    storage.saveCategories(updatedCategories);
    storage.saveItems(updatedItems);
    setEditingCategory(null);
  };

  const handleCloneCategory = () => {
    if (!cloningCategory || !cloningCategory.newName.trim()) return;
    const newName = cloningCategory.newName.trim();
    if (categories.includes(newName)) { alert(`Categoria "${newName}" já existe.`); return; }
    const updatedCategories = [...categories, newName];
    const newItems: Item[] = items
      .filter((it: Item) => it.categoria === cloningCategory.source)
      .map((it: Item) => ({ ...it, id: `item-${Date.now()}-${Math.random().toString(36).slice(2)}`, categoria: newName }));
    const updatedItems = [...items, ...newItems];
    setCategories(updatedCategories);
    setItems(updatedItems);
    storage.saveCategories(updatedCategories);
    storage.saveItems(updatedItems);
    setCloningCategory(null);
    showToast(`Categoria "${newName}" criada com ${newItems.length} itens!`);
  };

  const handleDeleteCategory = (cat: string) => {
    if (confirm(`Deseja excluir a categoria "${cat}"? Itens nesta categoria não serão excluídos, mas ficarão sem categoria válida.`)) {
      const updated = categories.filter(c => c !== cat);
      setCategories(updated);
      storage.saveCategories(updated);
      if (selectedCategory === cat) setSelectedCategory('Todas');
    }
  };

  return (
    <div className="p-6 w-full">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-brand-lime text-white px-6 py-3 rounded-2xl shadow-lg font-black text-sm uppercase tracking-widest flex items-center gap-2">
          <CheckCircle2 size={18} /> {toast}
        </div>
      )}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
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

      {/* Filters */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Pesquisar item..." 
            className="w-full pl-12 pr-4 py-3 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-brand-blue/20 transition-all font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
          <Filter size={18} className="text-brand-blue shrink-0 ml-2" />
          <button 
            onClick={() => setSelectedCategory('Todas')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap",
              selectedCategory === 'Todas' 
                ? "bg-brand-blue text-white shadow-md shadow-brand-blue/20" 
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            )}
          >
            Todas
          </button>
          {categories.map(cat => (
            <button 
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap",
                selectedCategory === cat 
                  ? "bg-brand-blue text-white shadow-md shadow-brand-blue/20" 
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map(item => (
          <div 
            key={item.id} 
            className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
            style={item.corFundo && item.corFundo !== '#ffffff' ? { borderLeft: `8px solid ${item.corFundo}` } : { borderLeft: '8px solid #e2e8f0' }}
          >
            <div className="flex justify-between items-start mb-4">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue bg-brand-blue/5 px-3 py-1 rounded-full">
                {item.categoria}
              </span>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => handleDuplicate(item)}
                  title="Duplicar"
                  className="p-2 text-brand-lime hover:bg-brand-lime/5 rounded-xl transition-colors"
                >
                  <Copy size={16} />
                </button>
                <button 
                  onClick={() => openModal(item)}
                  title="Editar"
                  className="p-2 text-brand-blue hover:bg-brand-blue/5 rounded-xl transition-colors"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={() => handleDelete(item.id)}
                  title="Excluir"
                  className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            
            <h3 className={cn("text-slate-900 text-lg mb-4 leading-tight", item.negrito ? "font-black" : "font-bold")}>
              {item.nome}
            </h3>

            <div className="flex flex-wrap gap-2">
              {item.contemOvo && (
                <div className="flex items-center gap-1.5 text-[10px] font-black text-brand-orange bg-brand-orange/10 px-3 py-1 rounded-lg uppercase tracking-widest">
                  <Egg size={12} /> OVO
                </div>
              )}
              {item.contemLactose && (
                <div className="flex items-center gap-1.5 text-[10px] font-black text-brand-blue bg-brand-blue/10 px-3 py-1 rounded-lg uppercase tracking-widest">
                  <Milk size={12} /> LAC
                </div>
              )}
              {item.contemGluten && (
                <div className="flex items-center gap-1.5 text-[10px] font-black text-amber-600 bg-amber-50 px-3 py-1 rounded-lg uppercase tracking-widest">
                  <Wheat size={12} /> GLU
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
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
                  autoFocus
                  required
                  type="text" 
                  className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-brand-blue/20 font-bold text-slate-900"
                  value={editingItem?.nome}
                  onChange={e => setEditingItem({...editingItem, nome: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Categoria</label>
                  <select 
                    required
                    className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-brand-blue/20 font-bold text-slate-900 appearance-none"
                    value={editingItem?.categoria}
                    onChange={e => setEditingItem({...editingItem, categoria: e.target.value})}
                  >
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Cor de Destaque</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="color" 
                      className="w-full h-[56px] rounded-2xl bg-slate-50 border-none cursor-pointer p-1"
                      value={editingItem?.corFundo}
                      onChange={e => setEditingItem({...editingItem, corFundo: e.target.value})}
                    />
                  </div>
                </div>
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
                      key={opt.key}
                      type="button"
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
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-[2] bg-brand-lime hover:bg-brand-lime/90 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-lg shadow-brand-lime/20 flex items-center justify-center gap-2"
                >
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
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nova categoria..."
                    className="flex-1 px-5 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-brand-blue/20 font-bold text-slate-900"
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value)}
                    onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && handleAddCategory()}
                  />
                  <button
                    onClick={handleAddCategory}
                    className="bg-brand-blue text-white p-4 rounded-2xl hover:bg-brand-blue/90 transition-all"
                  >
                    <Plus size={24} />
                  </button>
                </div>
                <select
                  value={inheritFromCategory}
                  onChange={e => setInheritFromCategory(e.target.value)}
                  className="w-full px-5 py-3 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-brand-blue/20 font-bold text-slate-700 text-sm appearance-none"
                >
                  <option value="">Herdar itens de (opcional)...</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {categories.map(cat => (
                  <div key={cat} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl group">
                    {editingCategory?.old === cat ? (
                      <div className="flex-1 flex gap-2">
                        <input 
                          type="text" 
                          className="flex-1 px-3 py-2 rounded-xl bg-white border border-slate-200 font-bold text-slate-900"
                          value={editingCategory.new}
                          onChange={e => setEditingCategory({...editingCategory, new: e.target.value})}
                          onKeyPress={e => e.key === 'Enter' && handleEditCategory()}
                        />
                        <button onClick={handleEditCategory} className="p-2 text-brand-lime hover:bg-brand-lime/5 rounded-xl">
                          <Save size={18} />
                        </button>
                        <button onClick={() => setEditingCategory(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl">
                          <X size={18} />
                        </button>
                      </div>
                    ) : cloningCategory?.source === cat ? (
                      <div className="flex-1 flex gap-2">
                        <input
                          autoFocus
                          type="text"
                          placeholder="Nome da nova categoria..."
                          className="flex-1 px-3 py-2 rounded-xl bg-white border border-slate-200 font-bold text-slate-900 text-sm"
                          value={cloningCategory.newName}
                          onChange={e => setCloningCategory({...cloningCategory, newName: e.target.value})}
                          onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && handleCloneCategory()}
                        />
                        <button onClick={handleCloneCategory} className="p-2 text-brand-lime hover:bg-brand-lime/5 rounded-xl" title="Confirmar">
                          <Save size={18} />
                        </button>
                        <button onClick={() => setCloningCategory(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl">
                          <X size={18} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="font-bold text-slate-700">{cat}</span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => setCloningCategory({ source: cat, newName: `${cat} (Cópia)` })}
                            className="p-2 text-slate-300 hover:text-brand-lime hover:bg-brand-lime/5 rounded-xl transition-all"
                            title="Clonar categoria com todos os itens"
                          >
                            <Copy size={18} />
                          </button>
                          <button
                            onClick={() => setEditingCategory({ old: cat, new: cat })}
                            className="p-2 text-slate-300 hover:text-brand-blue hover:bg-brand-blue/5 rounded-xl transition-all"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(cat)}
                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                          >
                            <Trash2 size={18} />
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

      {filteredItems.length === 0 && (
        <div className="text-center py-20">
          <div className="bg-slate-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Search size={40} className="text-slate-300" />
          </div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Nenhum item encontrado</h3>
          <p className="text-slate-500 font-medium">Tente ajustar sua busca ou filtros.</p>
        </div>
      )}
    </div>
  );
}
