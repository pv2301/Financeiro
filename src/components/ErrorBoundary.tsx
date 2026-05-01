import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-white rounded-[3rem] shadow-2xl border border-slate-100 p-10 text-center space-y-8">
            <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
              <AlertTriangle size={40} className="text-rose-500" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Ops! Algo deu errado.</h1>
              <p className="text-slate-500 text-sm font-medium">
                Ocorreu um erro inesperado na interface. Mas não se preocupe, seus dados estão seguros.
              </p>
            </div>

            {process.env.NODE_ENV === 'development' && (
              <div className="p-4 bg-slate-50 rounded-2xl text-left overflow-auto max-h-32 border border-slate-100">
                <code className="text-[10px] text-rose-600 font-mono break-all">
                  {this.state.error?.message}
                </code>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-3 shadow-xl shadow-slate-900/10"
              >
                <RefreshCw size={16} /> Recarregar Sistema
              </button>
              
              <button
                onClick={() => {
                  window.location.href = '/';
                  this.setState({ hasError: false, error: null });
                }}
                className="w-full py-4 bg-white text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 border border-slate-100 transition-all flex items-center justify-center gap-3"
              >
                <Home size={16} /> Voltar ao Início
              </button>
            </div>
            
            <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">HUB Error Protection System</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
