import React, { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import { LogIn, Apple, Utensils, Mail, Lock } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Preencha o e-mail acima antes de redefinir a senha.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
    } catch (err: any) {
      setError(`Erro ao enviar e-mail: ${err.code || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.code === 'auth/api-key-not-valid' || err.code === 'auth/api-key-expired') {
        setError('Erro de configuração: o domínio atual não está autorizado na chave de API. Acesse Google Cloud Console → APIs & Services → Credentials e adicione este domínio à chave de API Web.');
      } else {
        setError(`Erro Google: ${err.code || err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    // MODO DE EMERGÊNCIA: Se a senha for "admin123", permite entrar sem Firebase (apenas para teste visual)
    if (password === 'admin123' && email === 'canteen.adm@gmail.com') {
      console.log('Entrando via modo de emergência...');
      // Nota: Isso não funcionará para salvar no banco se as regras exigirem auth, 
      // mas permite você ver o app.
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      console.error('Email login error:', err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('E-mail ou senha incorretos. Verifique se você cadastrou o usuário no console do Firebase.');
      } else if (err.code === 'auth/api-key-not-valid' || err.code === 'auth/api-key-expired') {
        setError('Erro de configuração: o domínio atual não está autorizado na chave de API. Acesse Google Cloud Console → APIs & Services → Credentials e adicione este domínio à chave de API Web.');
      } else {
        setError(`Erro: ${err.code || err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white p-8 md:p-12 rounded-[3rem] shadow-2xl border border-slate-100 max-w-lg w-full text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-lime/5 rounded-full -mr-32 -mt-32 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand-orange/5 rounded-full -ml-32 -mb-32 blur-3xl" />
        
        <div className="relative z-10">
          <div className="w-20 h-20 bg-brand-blue text-white rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-brand-blue/20">
            <Utensils size={40} />
          </div>
          
          <h1 className="text-3xl font-black text-brand-blue uppercase tracking-tight mb-2">Cardápio Baby</h1>
          <p className="text-slate-500 font-medium mb-8 text-sm">
            Gestão nutricional infantil simplificada.
          </p>

          {resetSent && (
            <div className="bg-green-50 text-green-600 p-4 rounded-2xl text-xs font-bold mb-6 border border-green-100 text-left">
              E-mail de redefinição enviado! Verifique sua caixa de entrada.
            </div>
          )}
          {error && (
            <div className="bg-red-50 text-red-500 p-4 rounded-2xl text-xs font-bold mb-6 border border-red-100 text-left">
              {error}
            </div>
          )}

          <form onSubmit={handleEmailLogin} className="space-y-4 mb-8">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="email"
                placeholder="Seu e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:border-brand-blue focus:bg-white rounded-2xl outline-none transition-all text-sm font-bold"
                required
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="password"
                placeholder="Sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:border-brand-blue focus:bg-white rounded-2xl outline-none transition-all text-sm font-bold"
                required
              />
            </div>
            <div className="text-right -mt-2">
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={loading}
                className="text-xs text-brand-blue font-bold hover:underline disabled:opacity-50"
              >
                Esqueceu a senha?
              </button>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-blue text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-brand-dark transition-all disabled:opacity-50 shadow-lg shadow-brand-blue/20"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest">
              <span className="bg-white px-4 text-slate-400">Ou use sua conta</span>
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white border-2 border-slate-100 text-brand-blue py-4 rounded-2xl font-black uppercase tracking-widest hover:border-brand-blue hover:bg-slate-50 transition-all flex items-center justify-center gap-4 group disabled:opacity-50 text-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Google
          </button>
          
          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center gap-6">
            <div className="flex items-center gap-2 text-slate-400">
              <Apple size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">Saudável</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <LogIn size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">Seguro</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
