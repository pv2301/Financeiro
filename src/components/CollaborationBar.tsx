import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { presenceService, finance } from '../services/finance';
import { UserPresence } from '../types';

const PAGE_LABELS: Record<string, string> = {
  '/':          'Visão Geral',
  '/invoices':  'Financeiro',
  '/monthly':   'Fechamento Mensal',
  '/students':  'Alunos',
  '/classes':   'Turmas',
  '/snacks':    'Tabela Lanches',
  '/config':    'Configurações',
  '/reports':   'Relatórios',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(n => n[0].toUpperCase())
    .join('');
}

function getAvatarColor(uid: string): string {
  const colors = [
    'bg-sky-500',
    'bg-emerald-500',
    'bg-amber-500',
    'bg-rose-500',
    'bg-indigo-500',
    'bg-teal-500',
    'bg-orange-500',
  ];
  let hash = 0;
  for (const ch of uid) hash = (hash * 31 + ch.charCodeAt(0)) % colors.length;
  return colors[hash];
}

// Each user card manages its own tooltip and image state — fully isolated.
function UserCard({ u }: { u: UserPresence }) {
  const [imgFailed, setImgFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close tooltip when clicking outside this card
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const avatar = u.photoURL && !imgFailed ? (
    <img
      src={u.photoURL}
      alt={u.displayName || 'Usuário'}
      className="w-7 h-7 rounded-full ring-2 ring-white object-cover"
      onError={() => setImgFailed(true)}
    />
  ) : (
    <div className={`w-7 h-7 rounded-full ring-2 ring-white flex items-center justify-center text-white text-[10px] font-black ${getAvatarColor(u.uid)}`}>
      {getInitials(u.displayName || 'U')}
    </div>
  );

  return (
    <div
      ref={ref}
      className="relative shrink-0 cursor-pointer"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onClick={() => setOpen(prev => !prev)}
    >
      {avatar}

      <div className={`absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-bold rounded-lg px-3 py-2 whitespace-nowrap z-50 shadow-xl transition-all duration-150 ${open ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-1 pointer-events-none'}`}>
        <p className="font-black">{u.displayName || 'Usuário'}</p>
        <p className="text-slate-300 mt-0.5">📍 {PAGE_LABELS[u.currentPage] || u.currentPage || 'Navegando...'}</p>
        <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-800 rotate-45" />
      </div>
    </div>
  );
}

export default function CollaborationBar() {
  const { user } = useAuth();
  const location = useLocation();
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]);
  const [presenceEnabled, setPresenceEnabled] = useState(true);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    finance.getGlobalConfig().then(cfg => {
      setPresenceEnabled(cfg?.presenceEnabled ?? true);
    }).catch(() => {});
  }, []);

  const updatePresence = () => {
    if (!user?.uid) return;
    try {
      presenceService.update(
        user.uid,
        user.displayName || user.email || 'Usuário',
        user.email || '',
        location.pathname || '/',
        user.photoURL || undefined
      );
    } catch (err) {
      console.error("Failed to update presence:", err);
    }
  };

  useEffect(() => {
    if (!user?.uid) return;

    updatePresence();
    heartbeatRef.current = setInterval(updatePresence, 60_000);

    const events = ['mousemove', 'keydown', 'click', 'scroll'];
    let lastActivity = 0;
    const onActivity = () => {
      const now = Date.now();
      if (now - lastActivity > 30_000) {
        lastActivity = now;
        updatePresence();
      }
    };
    events.forEach(ev => window.addEventListener(ev, onActivity, { passive: true }));

    let unsub = () => {};
    try {
      unsub = presenceService.subscribe(users => {
        if (Array.isArray(users)) {
          setOnlineUsers(users.filter(u => u && u.uid && u.uid !== user.uid));
        }
      });
    } catch (err) {
      console.error("Presence subscribe error:", err);
    }

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      events.forEach(ev => window.removeEventListener(ev, onActivity));
      unsub();
      try {
        presenceService.remove(user.uid);
      } catch (err) {
        // Ignore removal errors on cleanup
      }
    };
  }, [user?.uid, location.pathname]);

  if (!presenceEnabled || !user || onlineUsers.length === 0) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm border-b border-slate-100 print:hidden overflow-hidden h-11 shrink-0">
      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-1 shrink-0">Online Agora:</span>
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {onlineUsers.map(u => {
          if (!u || !u.uid) return null;
          return <UserCard key={u.uid} u={u} />;
        })}
      </div>
    </div>
  );
}
