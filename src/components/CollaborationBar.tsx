import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../App';
import { presenceService } from '../services/finance';
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

export default function CollaborationBar() {
  const { user } = useAuth();
  const location = useLocation();
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]);
  const [tooltip, setTooltip] = useState<string | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Update presence whenever page changes or user activity happens
  const updatePresence = () => {
    if (!user) return;
    presenceService.update(
      user.uid,
      user.displayName || user.email || 'Usuário',
      user.email || '',
      location.pathname,
      user.photoURL || undefined
    );
  };

  useEffect(() => {
    if (!user) return;

    // Initial update
    updatePresence();

    // Heartbeat every 60s
    heartbeatRef.current = setInterval(updatePresence, 60_000);

    // Update on user activity
    const events = ['mousemove', 'keydown', 'click', 'scroll'];
    let lastActivity = 0;
    const onActivity = () => {
      const now = Date.now();
      // Throttle to once per 30s
      if (now - lastActivity > 30_000) {
        lastActivity = now;
        updatePresence();
      }
    };
    events.forEach(ev => window.addEventListener(ev, onActivity, { passive: true }));

    // Listen for other users
    const unsub = presenceService.subscribe(users => {
      setOnlineUsers(users.filter(u => u.uid !== user.uid));
    });

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      events.forEach(ev => window.removeEventListener(ev, onActivity));
      unsub();
      presenceService.remove(user.uid);
    };
  }, [user, location.pathname]);

  if (onlineUsers.length === 0) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm border-b border-slate-100 print:hidden">
      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-1">Online:</span>
      <div className="flex items-center gap-1.5">
        {onlineUsers.map(u => (
          <div
            key={u.uid}
            className="relative"
            onMouseEnter={() => setTooltip(u.uid)}
            onMouseLeave={() => setTooltip(null)}
          >
            {u.photoURL ? (
              <img
                src={u.photoURL}
                alt={u.displayName}
                className="w-7 h-7 rounded-full ring-2 ring-white object-cover cursor-pointer"
              />
            ) : (
              <div
                className={`w-7 h-7 rounded-full ring-2 ring-white flex items-center justify-center text-white text-[10px] font-black cursor-pointer ${getAvatarColor(u.uid)}`}
              >
                {getInitials(u.displayName)}
              </div>
            )}

            {tooltip === u.uid && (
              <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-bold rounded-lg px-3 py-2 whitespace-nowrap z-50 shadow-xl">
                <p className="font-black">{u.displayName}</p>
                <p className="text-slate-300 mt-0.5">📍 {PAGE_LABELS[u.currentPage] || u.currentPage}</p>
                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-800 rotate-45" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
