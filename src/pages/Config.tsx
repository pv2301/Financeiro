import React, { useState, useEffect, useRef } from 'react';
import {
  Save,
  Plus,
  Trash2,
  Palette,
  Users,
  CheckCircle2,
  LayoutGrid,
  ShieldAlert,
  Image as ImageIcon,
  Upload,
  Download,
  ChevronDown,
  ChevronUp,
  Edit2,
  Sparkles
} from 'lucide-react';
import { storage } from '../services/storage';
import { storage as firebaseStorage } from '../firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { GroupConfig, Restriction, Item, Recipe, Substitution, CategorySubcategories } from '../types';
import { cn } from '../lib/utils';
import * as XLSX from 'xlsx';
import excelData from '../../public/excel_data.json';

export default function Config() {
  const [configs, setConfigs] = useState<GroupConfig[]>([]);
  const [restrictions, setRestrictions] = useState<Restriction[]>([]);
  const [logo, setLogo] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };
  const [isPopulating, setIsPopulating] = useState(false);
  const [nutricionista, setNutricionista] = useState<{nome: string, crn: string}>({nome: '', crn: ''});
  const [isEditingNutricionista, setIsEditingNutricionista] = useState(false);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const groupRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [geminiKey, setGeminiKey] = useState('');
  const [isAICardOpen, setIsAICardOpen] = useState(false);
  const [isSubcatCardOpen, setIsSubcatCardOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const showConfirm = (title: string, message: string, onConfirm: () => void) => setConfirmModal({ title, message, onConfirm });
  const [categorySubcategories, setCategorySubcategories] = useState<CategorySubcategories>({});
  const [newSubcatInputs, setNewSubcatInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadData = async () => {
      const [configData, restrictionsData, logoData, categoriesData, nutData, subcatsData] = await Promise.all([
        storage.getConfig(),
        storage.getRestrictions(),
        storage.getLogo(),
        storage.getCategories(),
        storage.getNutricionista(),
        storage.getCategorySubcategories(),
      ]);
      setConfigs(configData);
      setRestrictions(restrictionsData);
      setLogo(logoData);
      setCategories(categoriesData);
      setNutricionista(nutData);
      setCategorySubcategories(subcatsData);
      const geminiKeyData = await storage.getGeminiApiKey();
      setGeminiKey(geminiKeyData);
    };
    loadData();
  }, []);

  const addGroup = () => {
    const newGroup: GroupConfig = {
      id: `group-${Date.now()}`,
      nomeCurto: 'NOVO',
      nomeCompleto: 'Novo Grupo de Cardápio',
      colunas: [{ categoria: categories[0] || 'Fruta' }],
      cor: '#FF6B00',
    };
    const updated = [...configs, newGroup];
    setConfigs(updated);
    storage.saveConfig(updated);
    setExpandedGroupId(newGroup.id);
    setTimeout(() => groupRefs.current[newGroup.id]?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  const updateGroup = (id: string, updates: Partial<GroupConfig>) => {
    const updated = configs.map(c => c.id === id ? { ...c, ...updates } : c);
    setConfigs(updated);
    storage.saveConfig(updated);
  };

  const deleteGroup = (id: string) => {
    showConfirm('Excluir Grupo', 'Tem certeza que deseja excluir este grupo?', () => {
      const updated = configs.filter((c: GroupConfig) => c.id !== id);
      setConfigs(updated);
      storage.saveConfig(updated);
      setExpandedGroupId(null);
    });
  };

  const handleSave = async () => {
    let logoUrl = logo;

    // Se o logo for base64 (DataURL), faz upload para o Firebase Storage
    if (logo && logo.startsWith('data:')) {
      try {
        const logoRef = ref(firebaseStorage, 'logo/logo.png');
        await uploadString(logoRef, logo, 'data_url');
        logoUrl = await getDownloadURL(logoRef);
      } catch (err) {
        console.error('Erro ao fazer upload da logo:', err);
      }
    }

    try {
      await Promise.all([
        storage.saveLogo(logoUrl),
        storage.saveNutricionista(nutricionista),
        storage.saveGeminiApiKey(geminiKey),
      ]);
      window.dispatchEvent(new CustomEvent('cardapio:logoUpdated', { detail: logoUrl }));
      window.dispatchEvent(new CustomEvent('cardapio:nutricionistaUpdated', { detail: nutricionista }));
      showToast('Configurações salvas!');
    } catch (err) {
      showToast(`Erro ao salvar: ${err instanceof Error ? err.message : 'verifique o console'}`);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePopulateFromExcel = async () => {
    console.log('Iniciando importação do Excel...');
    setIsPopulating(true);
    try {
      console.log('Dados do Excel carregados:', Object.keys(excelData));

      // 1. Recipes
      console.log('Processando receitas...');
      const recipes: Recipe[] = [];
      const recipeRows = excelData['RECEITAS'] || [];
      for (const row of recipeRows) {
        if (row['__EMPTY'] && row['__EMPTY'] !== 'Nome da Receita') {
          recipes.push({
            id: `recipe-${row['BANCO DE RECEITAS — Canteen']}`,
            nome: row['__EMPTY'],
            ingredientes: row['__EMPTY_1'] || '',
            modoPreparo: row['__EMPTY_2'] || '',
            porcoes: Number(row['__EMPTY_3']) || 0
          });
        }
      }
      console.log(`${recipes.length} receitas processadas.`);

      // 2. Items
      console.log('Processando itens...');
      const items: Item[] = [];
      const itemRows = excelData['BANCO DE ITENS'] || [];
      const newCategories = new Set<string>();
      for (const row of itemRows) {
        if (row['__EMPTY'] && row['__EMPTY'] !== 'Nome do Item') {
          const category = row['__EMPTY_1'] || 'Geral';
          newCategories.add(category);
          
          const linkedRecipeName = row['__EMPTY_5'];
          const recipe = recipes.find(r => r.nome.toLowerCase() === linkedRecipeName?.toLowerCase());

          items.push({
            id: `item-${row['BANCO DE ITENS — Canteen']}`,
            nome: row['__EMPTY'],
            categoria: category,
            contemOvo: row['__EMPTY_2'] === 'Sim',
            contemLactose: row['__EMPTY_3'] === 'Sim',
            contemGluten: row['__EMPTY_4'] === 'Sim',
            receitaVinculadaId: recipe ? recipe.id : undefined
          });
        }
      }
      console.log(`${items.length} itens processados.`);

      // 3. Groups
      console.log('Processando grupos...');
      const groups: GroupConfig[] = [];
      const configRows = excelData['CONFIG'] || [];
      let isGroupSection = false;
      
      for (const row of configRows) {
        if (row['CONFIGURAÇÕES — Canteen']?.includes('GRUPOS DO CARDÁPIO')) {
          isGroupSection = true;
          continue;
        }
        if (isGroupSection && row['__EMPTY']) {
          if (row['CONFIGURAÇÕES — Canteen'] === 'Nome da Aba') continue;
          
          const colunas = [];
          if (row['__EMPTY_1']) colunas.push({ categoria: row['__EMPTY_1'] });
          if (row['__EMPTY_2']) colunas.push({ categoria: row['__EMPTY_2'] });
          if (row['__EMPTY_3']) colunas.push({ categoria: row['__EMPTY_3'] });
          if (row['__EMPTY_4']) colunas.push({ categoria: row['__EMPTY_4'] });

          groups.push({
            id: row['CONFIGURAÇÕES — Canteen'].toLowerCase().replace(/[^a-z0-9]/g, '-'),
            nomeCurto: row['CONFIGURAÇÕES — Canteen'],
            nomeCompleto: row['__EMPTY'],
            colunas: colunas,
            cor: row['__EMPTY_5'] || '#000000'
          });
        }
      }
      console.log(`${groups.length} grupos processados.`);

      // 4. Substitutions
      console.log('Processando substituições...');
      const substitutions: Substitution[] = [];
      const subRows = excelData['SUBSTITUIÇÕES'] || [];
      for (const row of subRows) {
        if (row['__EMPTY'] && row['__EMPTY'] !== 'Item Original') {
          const originalItem = items.find(i => i.nome.toLowerCase() === row['__EMPTY'].toLowerCase());
          const substituteItem = items.find(i => i.nome.toLowerCase() === row['__EMPTY_2']?.toLowerCase());
          
          if (originalItem && substituteItem) {
            substitutions.push({
              id: `sub-${row['MAPA DE SUBSTITUIÇÕES — Canteen']}`,
              itemOriginalId: originalItem.id,
              restricao: row['__EMPTY_1'],
              itemSubstitutoId: substituteItem.id,
              grupoDestino: row['__EMPTY_3'] || ''
            });
          }
        }
      }
      console.log(`${substitutions.length} substituições processadas.`);

      // Save all
      console.log('Salvando dados no Firestore...');
      await Promise.all([
        storage.saveConfig(groups),
        storage.saveRecipes(recipes),
        storage.saveItems(items),
        storage.saveSubstitutions(substitutions),
        storage.saveCategories(Array.from(newCategories)),
        storage.saveRestrictions([
          { id: '1', nome: 'Sem Ovo' },
          { id: '2', nome: 'Sem Lactose' },
          { id: '3', nome: 'Sem Glúten' }
        ])
      ]);
      console.log('Dados salvos com sucesso.');

      setConfigs(groups);
      setCategories(Array.from(newCategories));
      showToast('Dados importados do Excel com sucesso!');
    } catch (error) {
      console.error('Erro ao importar dados:', error);
      showToast(`Erro ao importar: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsPopulating(false);
    }
  };

  const handleExportBackup = async () => {
    try {
      const [items, recipes, substitutions, groups, categories, restrictions] = await Promise.all([
        storage.getItems(),
        storage.getRecipes(),
        storage.getSubstitutions(),
        storage.getConfig(),
        storage.getCategories(),
        storage.getRestrictions(),
      ]);

      const wb = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(items), 'Itens');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(recipes), 'Receitas');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(substitutions), 'Substituições');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
        groups.map(g => ({ id: g.id, nomeCompleto: g.nomeCompleto, nomeCurto: g.nomeCurto, cor: g.cor, restricao: g.restricao || '', colunas: g.colunas.map(c => c.categoria).join(', ') }))
      ), 'Grupos');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(categories.map(c => ({ categoria: c }))), 'Categorias');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(restrictions), 'Restrições');

      const date = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `backup-cardapio-${date}.xlsx`);
    } catch (error) {
      showToast(`Erro ao exportar backup: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const addColumn = (groupId: string) => {
    const config = configs.find(c => c.id === groupId);
    if (!config || config.colunas.length >= 6) return;
    const newColumns = [...config.colunas, { categoria: categories[0] || '' }];
    updateGroup(groupId, { colunas: newColumns });
  };

  const removeColumn = (groupId: string, index: number) => {
    const config = configs.find(c => c.id === groupId);
    if (!config) return;
    const newColumns = config.colunas.filter((_, i) => i !== index);
    updateGroup(groupId, { colunas: newColumns });
  };

  const updateColumn = (groupId: string, index: number, updates: Partial<{ categoria: string; subcategoria: string | undefined }>) => {
    const config = configs.find(c => c.id === groupId);
    if (!config) return;
    const newColumns = config.colunas.map((col, i) => i === index ? { ...col, ...updates } : col);
    updateGroup(groupId, { colunas: newColumns });
  };

  return (
    <div className="p-6 w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-brand-blue uppercase tracking-tight">Configurações</h1>
          <p className="text-slate-500 font-medium">Personalize os grupos e colunas do seu sistema.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportBackup}
            className="bg-white hover:bg-slate-50 text-brand-blue border border-slate-200 px-6 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-sm font-black text-sm uppercase tracking-widest"
          >
            <Download size={20} />
            Exportar Backup
          </button>
          <button
            onClick={handlePopulateFromExcel}
            disabled={isPopulating}
            className="bg-white hover:bg-slate-50 text-brand-orange border border-slate-200 px-6 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-sm font-black text-sm uppercase tracking-widest disabled:opacity-50"
          >
            <Upload size={20} />
            {isPopulating ? 'Importando...' : 'Importar Excel'}
          </button>
          <button
            onClick={addGroup}
            className="bg-brand-orange hover:bg-brand-orange/90 text-white px-6 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-lg shadow-brand-orange/20 font-black text-sm uppercase tracking-widest"
          >
            <Plus size={20} />
            Novo Grupo
          </button>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-brand-lime text-white px-6 py-3 rounded-2xl shadow-lg font-black text-sm uppercase tracking-widest flex items-center gap-2">
          <CheckCircle2 size={18} /> {toast}
        </div>
      )}

      {/* Logo + Nutricionista side by side */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden mb-8 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-100">
        {/* Logo */}
        <div className="flex-1 p-8 flex flex-col gap-5">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
            <ImageIcon size={16} className="text-brand-blue" />
            Logo do Sistema
          </h3>
          <div className="flex items-center gap-6">
            <div className="w-32 h-16 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
              {logo ? (
                <img src={logo} alt="Logo Preview" className="max-w-full max-h-full object-contain" />
              ) : (
                <ImageIcon size={24} className="text-slate-200" />
              )}
            </div>
            <div className="flex flex-col gap-2">
              <label className="cursor-pointer bg-brand-blue hover:bg-brand-blue/90 text-white px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-brand-blue/20 w-fit">
                <Upload size={20} />
                Fazer Upload
                <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
              </label>
              {logo && (
                <button onClick={() => setLogo(null)} className="text-[10px] font-black text-brand-orange uppercase tracking-widest hover:underline w-fit">
                  Remover Logo
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Nutricionista */}
        <div className="flex-1 p-8 flex flex-col gap-5">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
            <Users size={16} className="text-brand-blue" />
            Dados da Nutricionista
          </h3>
          <div className="flex items-start gap-4">
            {isEditingNutricionista ? (
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nome Completo</label>
                  <input
                    type="text"
                    placeholder="Ex: Simone Carneiro da Cunha"
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-brand-blue/20 font-bold text-slate-900 text-sm"
                    value={nutricionista.nome}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNutricionista({...nutricionista, nome: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">CRN</label>
                  <input
                    type="text"
                    placeholder="Ex: 1377"
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-brand-blue/20 font-bold text-slate-900 text-sm"
                    value={nutricionista.crn}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNutricionista({...nutricionista, crn: e.target.value})}
                  />
                </div>
              </div>
            ) : (
              <div className="flex-1">
                <p className="text-xl font-black text-slate-900">
                  {nutricionista.nome || <span className="text-slate-300 italic font-medium text-base">Não informado</span>}
                </p>
                {nutricionista.crn && <p className="text-sm font-bold text-brand-orange mt-0.5">CRN {nutricionista.crn}</p>}
              </div>
            )}
            <button
              onClick={() => setIsEditingNutricionista(!isEditingNutricionista)}
              className="p-2.5 text-brand-blue hover:bg-brand-blue/5 rounded-xl transition-all shrink-0"
              title={isEditingNutricionista ? 'Concluir' : 'Editar'}
            >
              {isEditingNutricionista ? <CheckCircle2 size={18} /> : <Edit2 size={18} />}
            </button>
          </div>
        </div>
      </div>

      {/* Gemini API Key */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden mb-8">
        <button
          onClick={() => setIsAICardOpen((o: boolean) => !o)}
          className="w-full flex items-center gap-4 p-6 hover:bg-slate-50/60 transition-colors text-left"
        >
          <div className="p-3 bg-brand-blue/5 rounded-2xl text-brand-blue shrink-0"><Sparkles size={20} /></div>
          <div className="flex-1">
            <p className="text-sm font-black text-brand-blue uppercase tracking-tight">Inteligência Artificial</p>
            <p className="text-[10px] text-slate-400 font-medium">
              {geminiKey ? 'Chave configurada' : 'Chave não configurada — clique para configurar'}
            </p>
          </div>
          {isAICardOpen ? <ChevronUp size={18} className="text-slate-400 shrink-0" /> : <ChevronDown size={18} className="text-slate-400 shrink-0" />}
        </button>
        {isAICardOpen && (
          <div className="px-8 pb-8 border-t border-slate-100">
            <div className="flex gap-3 mt-6">
              <input
                type="password"
                placeholder="AIza..."
                className="flex-1 px-5 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-brand-blue/20 font-mono text-sm text-slate-700"
                value={geminiKey}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGeminiKey(e.target.value)}
              />
              <button
                onClick={async () => { await storage.saveGeminiApiKey(geminiKey); showToast('Chave salva!'); }}
                className="bg-brand-blue text-white px-6 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-brand-blue/90 transition-all"
              >
                Salvar
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-3">
              Obtenha sua chave em <span className="font-black text-brand-blue">aistudio.google.com</span>. A chave é salva no servidor e acessível a todos os usuários.
            </p>
          </div>
        )}
      </div>

      {/* Subcategorias */}
      {categories.length > 0 && (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden mb-8">
          <button
            onClick={() => setIsSubcatCardOpen((o: boolean) => !o)}
            className="w-full flex items-center gap-4 p-6 hover:bg-slate-50/60 transition-colors text-left"
          >
            <div className="p-3 bg-brand-lime/10 rounded-2xl text-brand-lime shrink-0"><LayoutGrid size={20} /></div>
            <div className="flex-1">
              <p className="text-sm font-black text-brand-lime uppercase tracking-tight">Subcategorias</p>
              <p className="text-[10px] text-slate-400 font-medium">Nomes alternativos de exibição para cada categoria. Ex: "Lanche" → "Lanche Manhã" / "Lanche Tarde".</p>
            </div>
            {isSubcatCardOpen ? <ChevronUp size={18} className="text-slate-400 shrink-0" /> : <ChevronDown size={18} className="text-slate-400 shrink-0" />}
          </button>
          {isSubcatCardOpen && (
          <div className="p-8 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((cat: string) => (
              <div key={cat} className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-brand-blue">{cat}</p>
                <div className="flex flex-wrap gap-2 min-h-[28px]">
                  {(categorySubcategories[cat] || []).map((sub: string) => (
                    <span key={sub} className="flex items-center gap-1 bg-brand-blue/10 text-brand-blue px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide">
                      {sub}
                      <button
                        onClick={() => {
                          const updated = { ...categorySubcategories, [cat]: categorySubcategories[cat].filter((s: string) => s !== sub) };
                          setCategorySubcategories(updated);
                          storage.saveCategorySubcategories(updated);
                        }}
                        className="ml-1 hover:text-brand-orange transition-colors"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nova subcategoria..."
                    value={newSubcatInputs[cat] || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSubcatInputs({ ...newSubcatInputs, [cat]: e.target.value })}
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                      if (e.key === 'Enter') {
                        const val = (newSubcatInputs[cat] || '').trim();
                        if (!val) return;
                        const existing = categorySubcategories[cat] || [];
                        if (existing.includes(val)) return;
                        const updated = { ...categorySubcategories, [cat]: [...existing, val] };
                        setCategorySubcategories(updated);
                        setNewSubcatInputs({ ...newSubcatInputs, [cat]: '' });
                        storage.saveCategorySubcategories(updated);
                      }
                    }}
                    className="flex-1 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-brand-blue/20"
                  />
                  <button
                    onClick={() => {
                      const val = (newSubcatInputs[cat] || '').trim();
                      if (!val) return;
                      const existing = categorySubcategories[cat] || [];
                      if (existing.includes(val)) return;
                      const updated = { ...categorySubcategories, [cat]: [...existing, val] };
                      setCategorySubcategories(updated);
                      setNewSubcatInputs({ ...newSubcatInputs, [cat]: '' });
                      storage.saveCategorySubcategories(updated);
                    }}
                    className="p-2 bg-brand-blue text-white rounded-xl hover:bg-brand-blue/90 transition-all"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
      )}

      <div className="space-y-8 pb-20">
        {/* Summary Table (As requested by user) */}
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-100 bg-slate-50/30">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
              <LayoutGrid size={16} className="text-brand-blue" />
              Resumo de Configuração dos Grupos
            </h3>
          </div>
          {(() => {
            const maxCols = Math.max(...configs.map(c => c.colunas.length), 4);
            return (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-brand-blue text-white">
                      <th className="p-4 text-[10px] font-black uppercase tracking-widest border-r border-white/10">Nome Completo</th>
                      {Array.from({length: maxCols}, (_, i) => (
                        <th key={i} className="p-4 text-[10px] font-black uppercase tracking-widest border-r border-white/10">Coluna {i+1}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {configs.map((config) => (
                      <tr
                        key={config.id}
                        className="border-b border-slate-100 hover:bg-brand-blue/5 transition-colors cursor-pointer"
                        onClick={() => {
                          const next = expandedGroupId === config.id ? null : config.id;
                          setExpandedGroupId(next);
                          if (next) setTimeout(() => groupRefs.current[next]?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
                        }}
                      >
                        <td className="p-4 text-sm font-black text-brand-blue uppercase">
                          <div className="flex items-center gap-2">
                            {expandedGroupId === config.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            {config.nomeCompleto}
                          </div>
                        </td>
                        {Array.from({length: maxCols}, (_, idx) => (
                          <td key={idx} className="p-4 border-l border-slate-100">
                            {config.colunas[idx]
                              ? <p className="text-[10px] font-black text-slate-700 uppercase">{config.colunas[idx].subcategoria || config.colunas[idx].categoria}</p>
                              : <span className="text-[10px] text-slate-300 italic">-</span>
                            }
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>

        {configs.map((config) => expandedGroupId === config.id ? (
          <div key={config.id} ref={(el: HTMLDivElement | null) => { groupRefs.current[config.id] = el; }} className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden group hover:border-brand-blue/30 transition-all">
            <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center gap-6 bg-slate-50/30">
              <div 
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0" 
                style={{ backgroundColor: config.cor }}
              >
                <Users size={32} />
              </div>
              <div className="flex-1 space-y-1">
                <input 
                  type="text" 
                  value={config.nomeCompleto}
                  onChange={(e) => updateGroup(config.id, { nomeCompleto: e.target.value })}
                  className="text-xl font-black text-brand-blue bg-transparent border-none focus:ring-0 p-0 w-full uppercase tracking-tight"
                  placeholder="Nome do Grupo"
                />
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome Curto:</span>
                  <input 
                    type="text" 
                    value={config.nomeCurto}
                    onChange={(e) => updateGroup(config.id, { nomeCurto: e.target.value })}
                    className="text-[10px] font-black text-brand-orange bg-transparent border-none focus:ring-0 p-0 uppercase tracking-widest w-40"
                    placeholder="EX: AGNES"
                  />
                  <span className="text-[9px] text-slate-400 italic font-medium">(Usado nas abas)</span>
                </div>
              </div>
              <button 
                onClick={() => deleteGroup(config.id)}
                className="p-3 text-slate-300 hover:text-brand-orange hover:bg-brand-orange/5 rounded-xl transition-all self-start md:self-center"
              >
                <Trash2 size={20} />
              </button>
            </div>

            <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-10">
              {/* Appearance */}
              <div className="space-y-6">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Palette size={16} className="text-brand-orange" />
                  Aparência
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Cor de Destaque</label>
                    <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <input 
                        type="color" 
                        value={config.cor}
                        onChange={(e) => updateGroup(config.id, { cor: e.target.value })}
                        className="w-12 h-12 rounded-xl border-none p-0 overflow-hidden cursor-pointer shadow-sm"
                      />
                      <span className="text-sm font-mono font-black text-slate-600 uppercase">{config.cor}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Restrição Global</label>
                    <select 
                      value={config.restricao || ''}
                      onChange={(e) => updateGroup(config.id, { restricao: e.target.value })}
                      className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-brand-blue/20 font-bold text-slate-900 appearance-none"
                    >
                      <option value="">Nenhuma</option>
                      {restrictions.map(r => (
                        <option key={r.id} value={r.nome}>{r.nome}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Columns */}
              <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                    <LayoutGrid size={16} className="text-brand-lime" />
                    Colunas Visíveis no Cardápio
                  </h3>
                  <button 
                    onClick={() => addColumn(config.id)}
                    className="text-[10px] font-black text-brand-blue uppercase tracking-widest flex items-center gap-1 hover:bg-brand-blue/5 px-3 py-1 rounded-lg transition-all"
                  >
                    <Plus size={14} />
                    Adicionar Coluna
                  </button>
                </div>
                
                <div className="space-y-3">
                  {config.colunas.map((col, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 group/col">
                      <div className="flex-1 space-y-2">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Categoria de Itens</label>
                        <select
                          value={col.categoria}
                          onChange={(e) => updateColumn(config.id, idx, { categoria: e.target.value, subcategoria: undefined })}
                          className="w-full px-4 py-2 rounded-xl bg-white border border-slate-200 focus:ring-2 focus:ring-brand-blue/20 font-bold text-slate-900 text-sm appearance-none"
                        >
                          {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                        {(categorySubcategories[col.categoria]?.length ?? 0) > 0 && (
                          <div className="space-y-2 mt-3 flex items-start gap-3">
                            {/* Seta em L */}
                            <svg width="20" height="40" viewBox="0 0 20 40" className="flex-shrink-0 mt-1">
                              <path d="M 4 0 L 4 30 L 16 30" stroke="#94a3b8" strokeWidth="2" fill="none" strokeLinecap="round" />
                            </svg>
                            <div className="flex-1 space-y-1">
                              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Nome de Exibição</label>
                              <select
                                value={col.subcategoria || ''}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateColumn(config.id, idx, { subcategoria: e.target.value || undefined })}
                                className="w-full px-4 py-2 rounded-xl bg-white border border-slate-200 focus:ring-2 focus:ring-brand-blue/20 font-bold text-slate-900 text-sm appearance-none"
                              >
                                <option value="">Padrão ({col.categoria})</option>
                                {categorySubcategories[col.categoria].map((sub: string) => (
                                  <option key={sub} value={sub}>{sub}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => removeColumn(config.id, idx)}
                        className="p-2 text-slate-300 hover:text-brand-orange hover:bg-brand-orange/5 rounded-xl transition-all self-end mb-1"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                  {config.colunas.length === 0 && (
                    <div className="text-center py-8 border-2 border-dashed border-slate-100 rounded-2xl">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nenhuma coluna definida</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : null)}

        {configs.length === 0 && (
          <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-200">
              <Users size={40} />
            </div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Nenhum grupo configurado</h3>
            <p className="text-slate-500 mb-8">Crie grupos para organizar diferentes cardápios.</p>
            <button
              onClick={addGroup}
              className="bg-brand-blue hover:bg-brand-blue/90 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-lg shadow-brand-blue/20"
            >
              Adicionar Primeiro Grupo
            </button>
          </div>
        )}
      </div>

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
