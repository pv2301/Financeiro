import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Settings,
  ChevronRight,
  ChevronLeft,
  Utensils,
  Calculator,
  Receipt,
  GraduationCap,
  LogOut,
  BarChart3,
  Shield,
  Moon,
  Sun,
  Lock, 
  ShieldCheck, 
  Key, 
  History, 
  Trash, 
  Download, 
  ArrowRight,
  Fingerprint, 
  Eye, 
  Ghost, 
  Terminal, 
  Cpu, 
  MousePointer2,
  Server, 
  HardDrive, 
  ToggleLeft, 
  ToggleRight, 
  Globe,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Config from './pages/Config';
import Students from './pages/Students';
import Classes from './pages/Classes';
import MonthlyProcessing from './pages/MonthlyProcessing';
import Invoices from './pages/Invoices';
import Snacks from './pages/Snacks';
import Reports from './pages/Reports';
import SystemCenter from './pages/SystemCenter';
import { finance } from './services/finance';
import { auth } from './firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import CollaborationBar from './components/CollaborationBar';
import { LogoManagerModal } from './components/LogoManagerModal';
import ErrorBoundary from './components/ErrorBoundary';

import { AuthProvider, useAuth } from './hooks/useAuth';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, profile } = useAuth();
  
  if (!user) return <Navigate to="/login" replace />;

  // Se o usuário está logado mas ainda não foi aprovado
  if (profile?.status === 'PENDING') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-12 rounded-[3rem] shadow-2xl border border-slate-100 max-w-lg w-full text-center">
          <div className="w-20 h-20 bg-brand-blue/10 text-brand-blue rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Shield size={40} className="animate-pulse" />
          </div>
          <h1 className="text-2xl font-black text-brand-blue uppercase tracking-tight mb-4">Acesso em Análise</h1>
          <p className="text-slate-600 font-medium mb-8 leading-relaxed">
            Seu cadastro foi recebido com sucesso! <br/>
            Por questões de segurança, um administrador precisa aprovar seu acesso antes de você visualizar os dados financeiros.
          </p>
          <div className="bg-slate-50 p-4 rounded-2xl mb-8">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">E-mail Cadastrado</p>
            <p className="text-sm font-bold text-slate-700">{user.email}</p>
          </div>
          <button 
            onClick={() => signOut(auth)}
            className="text-sm font-black text-red-500 uppercase tracking-widest hover:underline"
          >
            Sair da conta
          </button>
        </div>
      </div>
    );
  }

  if (profile?.status === 'BLOCKED') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-12 rounded-[3rem] shadow-2xl border border-red-100 max-w-lg w-full text-center">
          <div className="w-20 h-20 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <LogOut size={40} />
          </div>
          <h1 className="text-2xl font-black text-red-900 uppercase tracking-tight mb-4">Acesso Bloqueado</h1>
          <p className="text-slate-600 font-medium mb-8">
            Sua conta foi desativada por um administrador.
          </p>
          <button onClick={() => signOut(auth)} className="bg-red-600 text-white px-8 py-3 rounded-xl font-bold">
            Sair
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

const RoleProtectedRoute = ({ children, roles }: { children: React.ReactNode, roles: ('ADMIN' | 'EDITOR' | 'VIEWER' | 'NONE')[] }) => {
  const { profile } = useAuth();
  if (!profile || !roles.includes(profile.role)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

const LoginRoute = () => {
  const { user } = useAuth();
  if (user) return <Navigate to="/" replace />;
  return <Login />;
};

const NavItem = ({ to, icon: Icon, label, collapsed }: { to: string, icon: any, label: string, collapsed: boolean }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  return (
    <Link 
      to={to} 
      title={collapsed ? label : ""}
      className={cn(
        "flex items-center gap-3 rounded-2xl transition-all duration-300 group",
        collapsed ? "px-0 justify-center h-12 w-12 mx-auto" : "px-4 py-3",
        isActive 
          ? "bg-brand-blue text-white shadow-xl shadow-brand-blue/20" 
          : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
      )}
    >
      <Icon size={collapsed ? 24 : 18} className={cn(isActive ? "text-white" : "text-brand-blue/40 group-hover:text-brand-blue dark:text-brand-blue/60")} />
      {!collapsed && (
        <span className={cn("text-sm font-black uppercase tracking-wider", isActive ? "text-white" : "text-slate-500")}>
          {label}
        </span>
      )}
      {isActive && !collapsed && <ChevronRight size={14} className="ml-auto" />}
    </Link>
  );
};

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { user, profile } = useAuth();
  const [logo, setLogo] = useState<string | null>(null);
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar_collapsed');
    return saved === 'true';
  });
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('dark_mode');
    return saved === 'true';
  });
  const [globalError, setGlobalError] = useState<string | null>(null);

  useEffect(() => {
    const handleError = (e: any) => {
      const message = e.detail?.message || "Ocorreu um erro inesperado.";
      setGlobalError(message);
      setTimeout(() => setGlobalError(null), 5000);
    };

    window.addEventListener('hub-error', handleError as EventListener);
    return () => window.removeEventListener('hub-error', handleError as EventListener);
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('dark_mode', String(isDarkMode));
  }, [isDarkMode]);

  const isAdmin = profile?.role === 'ADMIN' || user?.email === 'paulovictorsilva2301@gmail.com';

  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', String(isCollapsed));
  }, [isCollapsed]);

  useEffect(() => {
    const loadData = async () => {
      const logoData = await finance.getLogo();
      setLogo(logoData);
    };
    loadData();
    const logoHandler = (e: CustomEvent) => setLogo(e.detail);
    window.addEventListener('cardapio:logoUpdated', logoHandler as EventListener);
    return () => {
      window.removeEventListener('cardapio:logoUpdated', logoHandler as EventListener);
    };
  }, []);

  const location = useLocation();
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row overflow-hidden font-sans">
      <LogoManagerModal isOpen={isLogoModalOpen} onClose={() => setIsLogoModalOpen(false)} />
      
      {/* Mobile Header */}
      <div className="md:hidden bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800 p-4 flex items-center justify-between sticky top-0 z-[100] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-blue/10 rounded-xl flex items-center justify-center text-brand-blue border border-brand-blue/10">
            <Receipt size={22} />
          </div>
          <span className="font-black text-brand-blue uppercase tracking-tight text-sm">Financeiro Canteen</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="w-10 h-10 flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
        >
          <Settings size={22} />
        </button>
      </div>

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[80] md:hidden"
          />
        )}
      </AnimatePresence>

      <aside 
        className={cn(
          "bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 flex flex-col transition-all duration-500 relative z-[90] md:z-[10] h-screen shrink-0",
          "fixed inset-y-0 left-0 md:relative md:translate-x-0 transition-transform",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0 shadow-2xl md:shadow-none",
          isCollapsed ? "w-24" : "w-80"
        )}
      >
        {/* Toggle Button (Desktop only) */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex absolute -right-4 top-10 w-8 h-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl items-center justify-center text-slate-400 hover:text-brand-blue hover:border-brand-blue shadow-xl z-30 transition-all group"
          title={isCollapsed ? "Expandir Menu" : "Recolher Menu"}
        >
          <motion.div animate={{ rotate: isCollapsed ? 0 : 180 }}>
            <ChevronRight size={16} />
          </motion.div>
        </button>

        <div className={cn(
          "py-10 flex flex-col items-center transition-all",
          isCollapsed ? "px-0" : "px-8"
        )}>
          <motion.div 
            whileHover={{ scale: 1.05 }}
            onClick={() => isAdmin && setIsLogoModalOpen(true)}
            className={cn(
              "w-full mb-8 flex items-center justify-center transition-all relative group/logo",
              isCollapsed ? "max-w-[48px]" : "max-w-[220px]",
              isAdmin ? "cursor-pointer" : "cursor-default"
            )}
          >
            {logo ? (
              <img 
                src={logo} 
                alt="Logo" 
                className={cn("object-contain transition-all filter drop-shadow-lg", isCollapsed ? "max-h-12" : "max-h-24")}
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className={cn(
                "bg-slate-50 dark:bg-slate-950 rounded-2xl flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 transition-all group-hover/logo:border-brand-blue",
                isCollapsed ? "w-12 h-12 rounded-xl" : "w-full h-24"
              )}>
                <Receipt size={isCollapsed ? 24 : 40} className="text-slate-300 group-hover/logo:text-brand-blue/30 transition-colors" />
              </div>
            )}
            
            {isAdmin && (
              <div className="absolute inset-0 bg-brand-blue/0 group-hover/logo:bg-brand-blue/5 rounded-2xl transition-colors flex items-center justify-center">
                <Settings className="text-brand-blue opacity-0 group-hover/logo:opacity-100 transition-all transform scale-50 group-hover/logo:scale-100" size={24} />
              </div>
            )}
          </motion.div>
          
          {!isCollapsed && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center w-full">
              <h2 className="text-2xl font-black text-brand-blue tracking-tighter uppercase leading-none">
                Financeiro
              </h2>
              <div className="h-0.5 w-12 bg-brand-orange mx-auto mt-2 rounded-full" />
              <p className="text-[10px] text-slate-400 font-black mt-3 uppercase tracking-[0.4em] ml-1">Canteen System</p>
            </motion.div>
          )}
        </div>
        
        <nav className="flex flex-col gap-1 px-4 overflow-y-auto max-h-[calc(100vh-320px)] no-scrollbar">
          <NavItem to="/" icon={LayoutDashboard} label="Dashboard" collapsed={isCollapsed} />
          <NavItem to="/invoices" icon={Receipt} label="Faturas" collapsed={isCollapsed} />
          <NavItem to="/monthly" icon={Calculator} label="Fechamento" collapsed={isCollapsed} />

          <div className="my-4 px-4 flex items-center gap-2">
            {!isCollapsed && <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Cadastros</span>}
            <div className="h-px bg-slate-50 dark:bg-slate-800 flex-1" />
          </div>

          <NavItem to="/students" icon={Users} label="Alunos" collapsed={isCollapsed} />
          <NavItem to="/classes" icon={GraduationCap} label="Turmas" collapsed={isCollapsed} />
          <NavItem to="/snacks" icon={Utensils} label="Serviços" collapsed={isCollapsed} />

          <div className="my-4 px-4 flex items-center gap-2">
            {!isCollapsed && <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Análise</span>}
            <div className="h-px bg-slate-50 dark:bg-slate-800 flex-1" />
          </div>

          <NavItem to="/reports" icon={BarChart3} label="Relatórios" collapsed={isCollapsed} />
          <NavItem to="/config" icon={Settings} label="Configurações" collapsed={isCollapsed} />

          {isAdmin && (
            <NavItem to="/system-center" icon={Shield} label="Central do Sistema" collapsed={isCollapsed} />
          )}
        </nav>

        <div className="mt-auto p-4 space-y-2">
          <div className="mx-4 my-4 border-t border-slate-50 dark:border-slate-800" />

          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={cn(
              "flex items-center gap-3 rounded-2xl transition-all duration-300 group",
              isCollapsed ? "px-0 justify-center h-12 w-12 mx-auto" : "px-4 py-3 w-full",
              isDarkMode ? "bg-slate-800 text-amber-400 hover:bg-slate-700 shadow-lg shadow-amber-900/10" : "bg-slate-50 text-slate-500 hover:bg-slate-100"
            )}
            title={isDarkMode ? "Modo Claro" : "Modo Noturno"}
          >
            <div className={cn("transition-transform group-hover:rotate-12", isCollapsed ? "scale-110" : "")}>
              {isDarkMode ? <Sun size={isCollapsed ? 24 : 18} /> : <Moon size={isCollapsed ? 24 : 18} />}
            </div>
            {!isCollapsed && (
              <span className="text-[10px] font-black uppercase tracking-widest">
                {isDarkMode ? "Modo Claro" : "Modo Noturno"}
              </span>
            )}
          </button>

          <button
            onClick={() => signOut(auth)}
            className={cn(
              "flex items-center gap-3 rounded-2xl transition-all duration-300 group",
              isCollapsed ? "px-0 justify-center h-12 w-12 mx-auto" : "px-4 py-3 w-full",
              "text-slate-400 hover:bg-red-50 hover:text-red-500"
            )}
            title={isCollapsed ? "Sair" : ""}
          >
            <LogOut size={isCollapsed ? 24 : 18} className="group-hover:translate-x-0.5 transition-transform" />
            {!isCollapsed && <span className="text-[10px] font-black uppercase tracking-widest">Desconectar</span>}
          </button>

          {!isCollapsed && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="px-4 py-3 bg-slate-50 dark:bg-slate-950/50 rounded-[1.5rem] border border-slate-100 dark:border-slate-800">
              <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1 opacity-50">Operador</p>
              <div className="flex items-center justify-between gap-2">
                <span className="font-black text-xs leading-none text-slate-700 dark:text-slate-200 tracking-tight truncate">
                  {profile?.displayName && profile.displayName !== 'Usuário' 
                    ? profile.displayName.split(' ').slice(0, 2).join(' ') 
                    : (isAdmin ? 'Paulo Victor' : 'Usuário')}
                </span>
                <span className={cn(
                  "text-[8px] font-black px-2 py-1 rounded-lg uppercase tracking-tighter",
                  isAdmin ? "bg-amber-100 text-amber-600 border border-amber-200 shadow-sm" : "bg-white text-slate-400 border border-slate-100 shadow-sm"
                )}>
                  {isAdmin ? 'Admin' : 'User'}
                </span>
              </div>
            </motion.div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-950 transition-colors duration-500 relative">
        <CollaborationBar />
        <div className="relative min-h-screen">
          {children}
        </div>
      </main>
      {/* Global Error Toast */}
      <AnimatePresence>
        {globalError && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[1000] min-w-[320px] max-w-[90vw]"
          >
            <div className="bg-rose-600 text-white p-5 rounded-[2rem] shadow-2xl flex items-start gap-4 border border-rose-500/50 backdrop-blur-xl">
              <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div className="flex-1 pr-2">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Erro de Sistema</p>
                <p className="text-xs font-bold leading-relaxed">{globalError}</p>
              </div>
              <button onClick={() => setGlobalError(null)} className="text-white/40 hover:text-white transition-colors">
                <LogOut size={16} className="rotate-90" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
                    <Route path="/invoices" element={<Invoices />} />
                    <Route path="/monthly" element={<MonthlyProcessing />} />
                    <Route path="/students" element={<Students />} />
                    <Route path="/classes" element={<Classes />} />
                    <Route path="/snacks" element={<Snacks />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/config" element={<Config />} />
                    <Route path="/system-center" element={
                      <RoleProtectedRoute roles={['ADMIN']}>
                        <SystemCenter />
                      </RoleProtectedRoute>
                    } />
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
