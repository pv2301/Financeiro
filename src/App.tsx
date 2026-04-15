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
  Printer,
  BarChart3
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
import Reports from './pages/Reports';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
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
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const LoginRoute = () => {
  const { user } = useAuth();
  if (user) return <Navigate to="/" replace />;
  return <Login />;
};

// Dashboard movido para src/pages/Dashboard.tsx

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
  const { user } = useAuth();
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
          <NavItem to="/reports" icon={BarChart3} label="Relatórios" />
          <NavItem to="/config" icon={Settings} label="Configurações" />

          <div className="mx-2 my-2 border-t border-slate-100" />
          <div className="px-5 py-2">
            <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-0.5">Nutricionista</p>
            <p className="text-sm text-brand-blue font-black leading-tight">{nutricionista.nome || 'Nutricionista'}</p>
            <p className="text-[10px] text-brand-orange font-bold">{nutricionista.crn ? `CRN ${nutricionista.crn}` : 'Configure em Configurações'}</p>
          </div>
          <div className="px-5 py-2">
            <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-0.5">Logado como</p>
            <p className="text-xs text-brand-blue font-bold truncate">{user?.displayName || user?.email || '—'}</p>
          </div>
          <button
            onClick={() => signOut(auth)}
            className="flex items-center gap-3 px-5 py-4 rounded-2xl text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all w-full mt-1"
          >
            <LogOut size={20} />
            <span className="text-sm font-black uppercase tracking-widest">Sair</span>
          </button>
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
            <Route path="/login" element={<LoginRoute />} />
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
                    <Route path="/reports" element={<Reports />} />
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
