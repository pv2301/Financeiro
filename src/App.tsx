import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Utensils,
  BookOpen,
  CalendarDays,
  Users,
  Settings,
  ChevronRight,
  Apple,
  Clock,
  Sparkles,
  RefreshCw,
  ArrowRight,
  Plus,
  Repeat,
  ShoppingCart,
  LogOut,
  Printer
} from 'lucide-react';
import { cn } from './lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Items from './pages/Items';
import Recipes from './pages/Recipes';
import Menu from './pages/Menu';
import Groups from './pages/Groups';
import Config from './pages/Config';
import Substitutions from './pages/Substitutions';
import ShoppingList from './pages/ShoppingList';
import Login from './pages/Login';
import { storage } from './services/storage';
import { GoogleGenAI } from "@google/genai";
import { auth } from './firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { ErrorBoundary } from './components/ErrorBoundary';

// Auth Context
interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export const useAuth = () => useContext(AuthContext);

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  // Desativado temporariamente conforme solicitado
  return <>{children}</>;
};

const Dashboard = () => {
  const [items, setItems] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [menu, setMenu] = useState<any[]>([]);
  const [substitutions, setSubstitutions] = useState<any[]>([]);
  
  useEffect(() => {
    const loadData = async () => {
      const [itemsData, recipesData, menuData, substitutionsData] = await Promise.all([
        storage.getItems(),
        storage.getRecipes(),
        storage.getMenu(),
        storage.getSubstitutions()
      ]);
      setItems(itemsData);
      setRecipes(recipesData);
      setMenu(menuData);
      setSubstitutions(substitutionsData);
    };
    loadData();
  }, []);

  const stats = [
    { label: 'Dias Planejados', value: menu.length.toString(), icon: CalendarDays, color: 'bg-brand-lime', shadow: 'shadow-brand-lime/20', to: null },
    { label: 'Itens no Banco', value: items.length.toString(), icon: Apple, color: 'bg-brand-orange', shadow: 'shadow-brand-orange/20', to: '/items' },
    { label: 'Substituições', value: substitutions.length.toString(), icon: Repeat, color: 'bg-brand-dark', shadow: 'shadow-brand-dark/20', to: '/substitutions' },
    { label: 'Receitas', value: recipes.length.toString(), icon: BookOpen, color: 'bg-brand-blue', shadow: 'shadow-brand-blue/20', to: '/recipes' },
  ];

  const [nutritionalTip, setNutritionalTip] = useState<string>('Carregando dica nutricional...');
const [isLoadingTip, setIsLoadingTip] = useState(false);

const fetchTipsBatch = async () => {
  setIsLoadingTip(true);
  try {
    const ai = new GoogleGenAI({ apiKey: (import.meta as any).env?.VITE_GEMINI_API_KEY || '' });

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Gere 10 dicas nutricionais curtas (máx 150 caracteres) para alimentação infantil. Separe cada dica por quebra de linha.",
    });

    const tips = response.text
      ?.split('\n')
      .map(t => t.trim())
      .filter(Boolean) || [];

    localStorage.setItem('tipsPool', JSON.stringify(tips));

    return tips;
  } catch (error) {
    console.error(error);
    return [];
  } finally {
    setIsLoadingTip(false);
  }
};

const getTodayTip = async () => {
const today = new Date().toISOString().slice(0, 10);

let tips = JSON.parse(localStorage.getItem('tipsPool') || '[]');
let index = Number(localStorage.getItem('tipIndex') || 0);
const storedDate = localStorage.getItem('tipDate');

// Se não tem dicas, busca
if (!tips || tips.length === 0) {
  tips = await fetchTipsBatch();
  index = 0;
}

// Se mudou o dia, avança
if (storedDate !== today) {
  index++;

  // 🔥 Se acabou, busca novas automaticamente
  if (index >= tips.length) {
    tips = await fetchTipsBatch();
    index = 0;
  }

  localStorage.setItem('tipIndex', index.toString());
  localStorage.setItem('tipDate', today);
}

return tips[index] || 'Ofereça variedade de cores no prato.';
};

useEffect(() => {
const loadTip = async () => {
  const tip = await getTodayTip();
  setNutritionalTip(tip);
};

loadTip();
}, []);

  return (
    <div className="p-6 w-full space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-brand-blue uppercase tracking-tight">Bem-vindo ao Cardápio Baby</h1>
          <p className="text-slate-500 font-medium">Aqui está o resumo do seu planejamento nutricional.</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-brand-lime/10 flex items-center justify-center text-brand-lime">
            <CalendarDays size={20} />
          </div>
          <div className="pr-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hoje é</p>
            <p className="text-sm font-bold text-brand-blue">{format(new Date(), "dd 'de' MMMM, yyyy", { locale: ptBR })}</p>
          </div>
        </div>
      </header>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => {
          const inner = (
            <>
              <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg group-hover:scale-110 transition-transform", stat.color, stat.shadow)}>
                <stat.icon size={28} />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{stat.label}</p>
              <p className="text-3xl font-black text-brand-blue">{stat.value}</p>
            </>
          );
          return stat.to ? (
            <Link key={i} to={stat.to} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:border-brand-blue/20 transition-all group cursor-pointer">
              {inner}
            </Link>
          ) : (
            <div key={i} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
              {inner}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-brand-blue uppercase tracking-tight flex items-center gap-2">
              <Clock size={24} className="text-brand-orange" />
              Próximos Dias
            </h2>
            <Link to="/menu" className="text-[10px] font-black text-brand-blue uppercase tracking-widest hover:underline flex items-center gap-1">
              Ver Cardápio Completo <ChevronRight size={14} />
            </Link>
          </div>
          
          <div className="space-y-4">
            {menu.filter(d => new Date(d.data) >= new Date()).slice(0, 3).map((day, i) => (
              <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-brand-blue/30 transition-all">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-slate-50 flex flex-col items-center justify-center border border-slate-100 group-hover:bg-brand-blue/5 transition-colors">
                    <span className="text-[10px] font-black text-slate-400 uppercase">{format(new Date(day.data), 'MMM', { locale: ptBR })}</span>
                    <span className="text-2xl font-black text-brand-blue">{format(new Date(day.data), 'dd')}</span>
                  </div>
                  <div>
                    <p className="text-sm font-black text-brand-blue uppercase tracking-tight mb-1">
                      {format(new Date(day.data), 'EEEE', { locale: ptBR })}
                    </p>
                    <div className="flex gap-2">
                      {(() => {
                        const mealCount = [
                          day.frutaId, day.lancheManhaId, day.sucoManhaId,
                          day.entradaId, day.pratoPrincipalId, day.acompanhamentoId,
                          day.lancheTardeId, day.sucoTardeId, day.ceiaId
                        ].filter(Boolean).length;
                        
                        return mealCount > 0 ? (
                          <span className="text-[10px] font-bold text-brand-lime bg-brand-lime/10 px-2 py-0.5 rounded-full uppercase tracking-widest">
                            {mealCount} Itens Planejados
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full uppercase tracking-widest">
                            Vazio
                          </span>
                        );
                      })()}
                      {day.isFeriado && (
                        <span className="text-[10px] font-bold text-brand-orange bg-brand-orange/10 px-2 py-0.5 rounded-full uppercase tracking-widest">
                          Feriado
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Link to="/menu" className="p-3 rounded-xl bg-slate-50 text-slate-400 group-hover:bg-brand-blue group-hover:text-white transition-all">
                  <ArrowRight size={20} />
                </Link>
              </div>
            ))}
            {menu.length === 0 && (
              <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] p-12 text-center">
                <CalendarDays size={48} className="mx-auto text-slate-200 mb-4" />
                <p className="text-slate-500 font-bold">Nenhum dia planejado ainda.</p>
                <Link to="/menu" className="mt-4 inline-block bg-brand-blue text-white px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest">Começar Planejamento</Link>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-black text-brand-blue uppercase tracking-tight flex items-center gap-2">
            <Sparkles size={24} className="text-brand-lime" />
            Dica Nutricional
          </h2>
          <div className="bg-gradient-to-br from-brand-blue to-brand-dark p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-white/10 transition-all" />
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center">
                  <Apple size={24} className="text-brand-lime" />
                </div>
                <button 
                  onClick={async () => {
                    const tips = await fetchTipsBatch();
                    if (tips.length > 0) {
                      localStorage.setItem('tipIndex', '0');
                      localStorage.setItem('tipDate', new Date().toISOString().slice(0, 10));
                      setNutritionalTip(tips[0]);
                    }
                  }}
                  disabled={isLoadingTip}
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={16} className={cn(isLoadingTip && "animate-spin")} />
                </button>
              </div>
              <p className="text-lg font-bold leading-relaxed mb-6 italic">
                "{nutritionalTip}"
              </p>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-brand-lime">
                <div className="w-4 h-px bg-brand-lime" />
                Dica do Dia
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Ações Rápidas</h3>
            <Link to="/items" className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-brand-orange/5 group transition-all">
              <span className="text-sm font-bold text-brand-blue group-hover:text-brand-orange transition-colors">Adicionar Novo Alimento</span>
              <Plus size={18} className="text-slate-300 group-hover:text-brand-orange" />
            </Link>
            <Link to="/menu" className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-brand-lime/5 group transition-all">
              <span className="text-sm font-bold text-brand-blue group-hover:text-brand-lime transition-colors">Planejar Próxima Semana</span>
              <CalendarDays size={18} className="text-slate-300 group-hover:text-brand-lime" />
            </Link>
            <Link to="/shopping?print=1" className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-brand-blue/5 group transition-all">
              <span className="text-sm font-bold text-brand-blue transition-colors">Imprimir Lista de Compras</span>
              <Printer size={18} className="text-slate-300 group-hover:text-brand-blue" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

const NavItem = ({ to, icon: Icon, label }: { to: string, icon: any, label: string }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  return (
    <Link 
      to={to} 
      className={cn(
        "flex items-center gap-3 px-5 py-4 rounded-2xl transition-all duration-300 group",
        isActive 
          ? "bg-brand-blue text-white shadow-xl shadow-brand-blue/20" 
          : "text-slate-500 hover:bg-slate-100"
      )}
    >
      <Icon size={20} className={cn(isActive ? "text-white" : "text-brand-blue/40 group-hover:text-brand-blue")} />
      <span className={cn("text-sm font-black uppercase tracking-widest", isActive ? "text-white" : "text-slate-500")}>{label}</span>
      {isActive && <ChevronRight size={16} className="ml-auto" />}
    </Link>
  );
};

const Layout = ({ children }: { children: React.ReactNode }) => {
  const [logo, setLogo] = useState<string | null>(null);
  const [nutricionista, setNutricionista] = useState<{nome: string, crn: string}>({nome: '', crn: ''});

  useEffect(() => {
    const loadData = async () => {
      const [logoData, nutData] = await Promise.all([storage.getLogo(), storage.getNutricionista()]);
      setLogo(logoData);
      setNutricionista(nutData);
    };
    loadData();
    const logoHandler = (e: CustomEvent) => setLogo(e.detail);
    const nutHandler = (e: CustomEvent) => setNutricionista(e.detail);
    window.addEventListener('cardapio:logoUpdated', logoHandler as EventListener);
    window.addEventListener('cardapio:nutricionistaUpdated', nutHandler as EventListener);
    return () => {
      window.removeEventListener('cardapio:logoUpdated', logoHandler as EventListener);
      window.removeEventListener('cardapio:nutricionistaUpdated', nutHandler as EventListener);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-72 bg-white border-r border-slate-200 p-4 flex flex-col gap-2 shadow-sm z-20 print:hidden">
        <div className="px-4 py-6 mb-4 flex flex-col items-center text-center">
          <div className="w-full max-w-[200px] mb-4 flex items-center justify-center min-h-[80px]">
            {logo ? (
              <img 
                src={logo} 
                alt="Logo" 
                className="max-w-full max-h-20 object-contain"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-20 bg-slate-100 rounded-2xl flex items-center justify-center border-2 border-dashed border-slate-200">
                <Utensils size={32} className="text-slate-300" />
              </div>
            )}
          </div>
          <h2 className="text-xl font-black text-brand-blue flex items-center gap-2">
            Cardápio Baby
          </h2>
          <p className="text-[10px] text-brand-orange font-black mt-1 uppercase tracking-[0.2em]">Gestão Nutricional</p>
        </div>
        
        <nav className="flex flex-col gap-1">
          <NavItem to="/" icon={LayoutDashboard} label="Visão Geral" />
          <NavItem to="/menu" icon={CalendarDays} label="Cardápio Mensal" />
          <NavItem to="/groups" icon={Users} label="Grupos" />
          <NavItem to="/items" icon={Utensils} label="Banco de Itens" />
          <NavItem to="/recipes" icon={BookOpen} label="Receitas" />
          <NavItem to="/substitutions" icon={Settings} label="Substituições" />
          <NavItem to="/shopping" icon={ShoppingCart} label="Lista de Compras" />
          <NavItem to="/config" icon={Settings} label="Configurações" />

          <div className="mx-2 my-2 border-t border-slate-100" />
          <div className="px-5 py-2">
            <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-0.5">Nutricionista</p>
            <p className="text-sm text-brand-blue font-black leading-tight">{nutricionista.nome || 'Nutricionista'}</p>
            <p className="text-[10px] text-brand-orange font-bold">{nutricionista.crn ? `CRN ${nutricionista.crn}` : 'Configure em Configurações'}</p>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="/*" element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/items" element={<Items />} />
                    <Route path="/recipes" element={<Recipes />} />
                    <Route path="/menu" element={<Menu />} />
                    <Route path="/groups" element={<Groups />} />
                    <Route path="/substitutions" element={<Substitutions />} />
                    <Route path="/shopping" element={<ShoppingList />} />
                    <Route path="/config" element={<Config />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            } />
          </Routes>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}
