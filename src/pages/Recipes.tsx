import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Save,
  Clock,
  Users,
  ChefHat,
  Eye,
  Image as ImageIcon,
  CheckCircle2,
  ChevronRight,
  Printer
} from 'lucide-react';
import { storage } from '../services/storage';
import { Recipe, Item } from '../types';
import { cn } from '../lib/utils';

export default function Recipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [logo, setLogo] = useState<string | null>(null);
  const [nutricionista, setNutricionista] = useState<{nome: string, crn: string}>({nome: '', crn: ''});

  useEffect(() => {
    const loadData = async () => {
      const [recipesData, itemsData, logoData, nutData] = await Promise.all([
        storage.getRecipes(),
        storage.getItems(),
        storage.getLogo(),
        storage.getNutricionista()
      ]);
      setRecipes(recipesData);
      setItems(itemsData);
      setLogo(logoData);
      setNutricionista(nutData);
    };
    loadData();
  }, []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Partial<Recipe> | null>(null);
  const [viewingRecipe, setViewingRecipe] = useState<Recipe | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecipe?.nome) return;

    const newRecipe: Recipe = {
      id: editingRecipe.id || `recipe-${Date.now()}`,
      nome: editingRecipe.nome,
      ingredientes: editingRecipe.ingredientes || '',
      modoPreparo: editingRecipe.modoPreparo || '',
      porcoes: editingRecipe.porcoes || 1,
      itemVinculadoId: editingRecipe.itemVinculadoId,
      fotoUrl: editingRecipe.fotoUrl
    };

    const updated = editingRecipe.id 
      ? recipes.map(r => r.id === editingRecipe.id ? newRecipe : r)
      : [...recipes, newRecipe];
    
    setRecipes(updated);
    storage.saveRecipes(updated);
    setIsModalOpen(false);
    setEditingRecipe(null);
  };

  const handleDelete = (id: string) => {
    if (confirm('Deseja remover esta receita?')) {
      const updated = recipes.filter(r => r.id !== id);
      setRecipes(updated);
      storage.saveRecipes(updated);
    }
  };

  const filteredRecipes = recipes.filter(r => 
    r.nome.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => a.nome.localeCompare(b.nome));

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-brand-blue uppercase tracking-tight">Banco de Receitas</h1>
          <p className="text-slate-500 font-medium">Instruções de preparo vinculadas aos itens do cardápio.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => window.print()}
            className="bg-white hover:bg-slate-50 text-brand-blue border border-slate-200 px-6 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-sm font-black text-sm uppercase tracking-widest no-print"
          >
            <Printer size={20} />
            Imprimir
          </button>
          <button
            onClick={() => { setEditingRecipe({ porcoes: 1 }); setIsModalOpen(true); }}
            className="bg-brand-orange hover:bg-brand-orange/90 text-white px-6 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-lg shadow-brand-orange/20 font-black text-sm uppercase tracking-widest no-print"
          >
            <Plus size={20} />
            Nova Receita
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-[2rem] border border-slate-200 shadow-sm mb-8">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por nome da receita..."
            className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-brand-blue/20 font-bold text-slate-900"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Recipes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredRecipes.map((recipe) => (
          <div key={recipe.id} className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden group hover:border-brand-blue/30 hover:shadow-xl hover:shadow-brand-blue/5 transition-all flex flex-col">
            <div className="h-48 bg-slate-100 relative overflow-hidden">
              {recipe.fotoUrl ? (
                <img src={recipe.fotoUrl} alt={recipe.nome} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300">
                  <ChefHat size={64} />
                </div>
              )}
              <div className="absolute top-4 right-4 flex gap-2">
                <button 
                  onClick={() => { setEditingRecipe(recipe); setIsModalOpen(true); }}
                  className="p-2 bg-white/90 backdrop-blur-sm text-slate-600 hover:text-brand-blue rounded-xl shadow-sm transition-all"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={() => handleDelete(recipe.id)}
                  className="p-2 bg-white/90 backdrop-blur-sm text-slate-600 hover:text-brand-orange rounded-xl shadow-sm transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div className="p-6 flex-1 flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 rounded-full bg-brand-lime/10 text-brand-lime text-[8px] font-black uppercase tracking-widest">
                  {recipe.porcoes} {recipe.porcoes === 1 ? 'Porção' : 'Porções'}
                </span>
              </div>
              <h3 className="text-lg font-black text-brand-blue uppercase tracking-tight mb-4 line-clamp-1">{recipe.nome}</h3>
              
              <div className="space-y-4 mb-6">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Ingredientes</p>
                  <p className="text-xs text-slate-500 line-clamp-2 font-medium leading-relaxed">{recipe.ingredientes}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Preparo</p>
                  <p className="text-xs text-slate-500 line-clamp-2 font-medium leading-relaxed italic">{recipe.modoPreparo}</p>
                </div>
              </div>

              <button 
                onClick={() => { setViewingRecipe(recipe); setIsViewModalOpen(true); }}
                className="mt-auto w-full py-3 rounded-xl bg-slate-50 text-brand-blue font-black text-[10px] uppercase tracking-widest hover:bg-brand-blue hover:text-white transition-all flex items-center justify-center gap-2"
              >
                <Eye size={16} />
                Ver Receita Completa
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredRecipes.length === 0 && (
        <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-200">
            <ChefHat size={40} />
          </div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Nenhuma receita encontrada</h3>
          <p className="text-slate-500">Tente ajustar sua busca ou cadastre uma nova receita.</p>
        </div>
      )}

      {/* Edit Modal */}
      {isModalOpen && editingRecipe && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-brand-orange/10 rounded-2xl text-brand-orange">
                  <ChefHat size={24} />
                </div>
                <h2 className="text-xl font-black text-brand-blue uppercase tracking-tight">
                  {editingRecipe.id ? 'Editar Receita' : 'Nova Receita'}
                </h2>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={24} className="text-slate-400" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nome da Receita</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-brand-blue/20 font-bold text-slate-900"
                      value={editingRecipe.nome || ''}
                      onChange={(e) => setEditingRecipe({...editingRecipe, nome: e.target.value})}
                      placeholder="Ex: Arroz Integral com Legumes"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Porções</label>
                      <input 
                        type="number" 
                        className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-brand-blue/20 font-bold text-slate-900"
                        value={editingRecipe.porcoes || 1}
                        onChange={(e) => setEditingRecipe({...editingRecipe, porcoes: parseInt(e.target.value)})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Item Vinculado</label>
                      <select 
                        className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-brand-blue/20 font-bold text-slate-900 appearance-none"
                        value={editingRecipe.itemVinculadoId || ''}
                        onChange={(e) => setEditingRecipe({...editingRecipe, itemVinculadoId: e.target.value})}
                      >
                        <option value="">Nenhum</option>
                        {items.map(it => <option key={it.id} value={it.id}>{it.nome}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Foto da Receita</label>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="relative">
                        <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input 
                          type="url" 
                          className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-brand-blue/20 font-bold text-slate-900"
                          value={editingRecipe.fotoUrl || ''}
                          onChange={(e) => setEditingRecipe({...editingRecipe, fotoUrl: e.target.value})}
                          placeholder="URL da foto (opcional)"
                        />
                      </div>
                      <div className="flex items-center gap-4">
                        <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl cursor-pointer transition-all font-bold text-xs">
                          <Plus size={16} />
                          Fazer Upload
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setEditingRecipe({...editingRecipe, fotoUrl: reader.result as string});
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                        {editingRecipe.fotoUrl && (
                          <button 
                            type="button"
                            onClick={() => setEditingRecipe({...editingRecipe, fotoUrl: undefined})}
                            className="p-3 text-brand-orange hover:bg-brand-orange/10 rounded-xl transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Ingredientes</label>
                    <textarea 
                      className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-brand-blue/20 font-bold text-slate-900 min-h-[150px]"
                      value={editingRecipe.ingredientes || ''}
                      onChange={(e) => setEditingRecipe({...editingRecipe, ingredientes: e.target.value})}
                      placeholder="Liste os ingredientes, um por linha..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Modo de Preparo</label>
                    <textarea 
                      className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-brand-blue/20 font-bold text-slate-900 min-h-[150px]"
                      value={editingRecipe.modoPreparo || ''}
                      onChange={(e) => setEditingRecipe({...editingRecipe, modoPreparo: e.target.value})}
                      placeholder="Descreva o passo a passo..."
                    />
                  </div>
                </div>
              </div>
            </form>

            <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-slate-500 hover:bg-slate-200 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSave}
                className="flex-[2] bg-brand-lime hover:bg-brand-lime/90 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-lg shadow-brand-lime/20 flex items-center justify-center gap-2"
              >
                <Save size={20} />
                Salvar Receita
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {isViewModalOpen && viewingRecipe && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="relative h-64 bg-slate-100">
              {viewingRecipe.fotoUrl ? (
                <img src={viewingRecipe.fotoUrl} alt={viewingRecipe.nome} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-200">
                  <ChefHat size={80} />
                </div>
              )}
              <button 
                onClick={() => setIsViewModalOpen(false)}
                className="absolute top-6 right-6 p-3 bg-white/90 backdrop-blur-sm text-slate-900 rounded-full shadow-xl hover:bg-white transition-all"
              >
                <X size={24} />
              </button>
              <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/60 to-transparent">
                <h2 className="text-3xl font-black text-white uppercase tracking-tight">{viewingRecipe.nome}</h2>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 md:grid-cols-3 gap-12">
              <div className="md:col-span-1 space-y-8">
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-brand-blue uppercase tracking-widest flex items-center gap-2">
                    <Users size={18} className="text-brand-orange" />
                    Rendimento
                  </h3>
                  <p className="text-lg font-bold text-slate-700">{viewingRecipe.porcoes} {viewingRecipe.porcoes === 1 ? 'Porção' : 'Porções'}</p>
                </div>
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-brand-blue uppercase tracking-widest flex items-center gap-2">
                    <Clock size={18} className="text-brand-lime" />
                    Ingredientes
                  </h3>
                  <ul className="space-y-3">
                    {viewingRecipe.ingredientes.split('\n').filter(Boolean).map((ing, i) => (
                      <li key={i} className="flex gap-3 text-sm font-medium text-slate-600 leading-relaxed">
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-orange mt-2 shrink-0" />
                        {ing}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="md:col-span-2 space-y-6">
                <h3 className="text-sm font-black text-brand-blue uppercase tracking-widest flex items-center gap-2">
                  <ChefHat size={18} className="text-brand-orange" />
                  Modo de Preparo
                </h3>
                <div className="space-y-6">
                  {viewingRecipe.modoPreparo.split('\n').filter(Boolean).map((step, i) => (
                    <div key={i} className="flex gap-6">
                      <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-brand-blue font-black shrink-0">
                        {i + 1}
                      </div>
                      <p className="text-slate-600 font-medium leading-relaxed pt-2">
                        {step}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setIsViewModalOpen(false)}
                className="bg-brand-blue text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-brand-blue/20"
              >
                Fechar Receita
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== PRINT TEMPLATE ===== */}
      <div className="hidden print:block text-[11px]">
        <div style={{backgroundColor:'#f27205',padding:'10px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'12px'}}>
          <div style={{color:'white'}}>
            <div style={{fontSize:'9px',fontWeight:'bold',textTransform:'uppercase',opacity:0.8}}>Canteen</div>
            <div style={{fontSize:'18px',fontWeight:'900',textTransform:'uppercase',lineHeight:'1.1'}}>Banco de Receitas</div>
            <div style={{fontSize:'11px',opacity:0.9}}>{new Date().toLocaleDateString('pt-BR')}</div>
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
              <th style={{padding:'6px 8px',textAlign:'left',border:'1px solid #ccc',width:'20%'}}>Receita</th>
              <th style={{padding:'6px 8px',textAlign:'center',border:'1px solid #ccc',width:'6%'}}>Porções</th>
              <th style={{padding:'6px 8px',textAlign:'left',border:'1px solid #ccc',width:'30%'}}>Ingredientes</th>
              <th style={{padding:'6px 8px',textAlign:'left',border:'1px solid #ccc',width:'44%'}}>Modo de Preparo</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecipes.map((recipe, idx) => (
              <tr key={recipe.id} style={{backgroundColor: idx % 2 === 0 ? '#fff' : '#f9f9f9', verticalAlign:'top'}}>
                <td style={{padding:'6px 8px',border:'1px solid #eee',fontWeight:'bold'}}>{recipe.nome}</td>
                <td style={{padding:'6px 8px',border:'1px solid #eee',textAlign:'center'}}>{recipe.porcoes}</td>
                <td style={{padding:'6px 8px',border:'1px solid #eee',whiteSpace:'pre-line'}}>{recipe.ingredientes}</td>
                <td style={{padding:'6px 8px',border:'1px solid #eee',whiteSpace:'pre-line'}}>{recipe.modoPreparo}</td>
              </tr>
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
