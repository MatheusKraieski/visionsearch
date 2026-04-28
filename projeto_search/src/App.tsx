import { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import { Login } from './components/Login';
import { TopBar, BottomNav } from './components/ui';
import { SearchView } from './components/SearchView';
import { CatalogView } from './components/CatalogView';
import { AdminView } from './components/AdminView';

const ADMIN_EMAIL = 'mathkraieski@gmail.com';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'search' | 'catalog' | 'admin'>(() =>
    (localStorage.getItem('vs.view') as any) ?? 'search'
  );

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    localStorage.setItem('vs.view', view);
  }, [view]);

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <Login onLogin={handleLogin} />;
  }

  const user = session.user;
  const userName = user.user_metadata?.full_name ?? user.email ?? 'Usuário';
  const userEmail = user.email ?? '';
  const isAdmin = userEmail === ADMIN_EMAIL;

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar
        currentView={view}
        onNavigate={(v) => setView(v as any)}
        onLogout={handleLogout}
        userName={userName}
        userEmail={userEmail}
        isAdmin={isAdmin}
      />

      <main className="flex-1 pb-16 md:pb-0">
        {view === 'search' && <SearchView />}
        {view === 'catalog' && <CatalogView />}
        {view === 'admin' && isAdmin && <AdminView userEmail={userEmail} />}
        {view === 'admin' && !isAdmin && (
          <div className="max-w-[1280px] mx-auto px-6 py-16 text-center text-slate-500">
            Acesso restrito a administradores.
          </div>
        )}
      </main>

      <footer className="hidden md:block border-t border-slate-200 mt-8">
        <div className="max-w-[1280px] mx-auto px-6 py-6 flex items-center justify-between text-[11px] text-slate-400 mono">
          <span>VisionSearch · React 19 · Supabase · Llama 4 Scout</span>
          <span>© 2026 Hortti — v1.0.0</span>
        </div>
      </footer>

      <BottomNav
        currentView={view}
        onNavigate={(v) => setView(v as any)}
        isAdmin={isAdmin}
      />
    </div>
  );
}
