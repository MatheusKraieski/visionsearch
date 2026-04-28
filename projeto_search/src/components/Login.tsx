import { useState } from 'react';
import { Icon } from './Icon';

interface LoginProps {
  onLogin: () => void;
}

export function Login({ onLogin }: LoginProps) {
  const [loading, setLoading] = useState(false);

  const handleGoogle = () => {
    setLoading(true);
    onLogin();
  };

  return (
    <div className="min-h-screen flex">
      {/* Left: form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2.5 mb-12">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent)' }}>
              <Icon name="scan" size={20} className="text-white" strokeWidth={2.5} />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-bold text-base tracking-tight">VisionSearch</span>
              <span className="mono text-[10px] text-slate-400">v1.0</span>
            </div>
          </div>

          <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">Bem-vindo de volta</h1>
          <p className="text-sm text-slate-500 mb-8 leading-relaxed">
            Acesse o banco de fornecedores e busque produtos a partir de uma foto.
            Powered by Llama 4 Scout Vision.
          </p>

          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-900 hover:bg-slate-50 hover:border-slate-400 disabled:opacity-60 transition-all"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
                Conectando...
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Entrar com Google
              </>
            )}
          </button>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-slate-200"></div>
            <span className="text-xs text-slate-400 mono">OU</span>
            <div className="flex-1 h-px bg-slate-200"></div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1.5 block">E-mail corporativo</label>
              <input
                type="email"
                placeholder="voce@empresa.com.br"
                className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-ring)]"
              />
            </div>
            <button
              disabled
              className="w-full px-4 py-2.5 bg-slate-100 text-slate-400 rounded-lg text-sm font-semibold cursor-not-allowed"
            >
              Continuar com e-mail
            </button>
            <p className="text-[11px] text-slate-400 text-center">
              Login por e-mail em breve. Use o Google por enquanto.
            </p>
          </div>

          <div className="mt-12 pt-6 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-400">
            <span className="mono">Supabase Auth · OAuth 2.0</span>
            <a href="#" className="hover:text-slate-600">Política de privacidade</a>
          </div>
        </div>
      </div>

      {/* Right: hero */}
      <div className="hidden lg:block flex-1 relative overflow-hidden border-l border-slate-200" style={{ background: 'var(--accent)' }}>
        <div className="absolute inset-0 grid-bg opacity-20"></div>
        <div className="relative h-full flex flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-2 text-xs mono opacity-80">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
            LIVE · Supabase + Llama 4 Scout
          </div>

          <div>
            <div className="text-[11px] mono uppercase tracking-widest opacity-70 mb-4">Como funciona</div>
            <h2 className="text-3xl font-bold tracking-tight mb-8 leading-tight">
              Uma foto.<br/>O fornecedor certo.
            </h2>

            <div className="space-y-5">
              {[
                ['01', 'Envie uma imagem', 'PNG, JPG ou WEBP até 10 MB'],
                ['02', 'IA analisa em segundos', 'Llama 4 Scout extrai categoria e tags visuais'],
                ['03', 'Receba o match', 'Produto, SKU, preço e contato do fornecedor'],
              ].map(([num, title, desc]) => (
                <div key={num} className="flex gap-4">
                  <div className="mono text-xs opacity-60 pt-0.5 w-8">{num}</div>
                  <div>
                    <div className="font-semibold text-sm mb-0.5">{title}</div>
                    <div className="text-sm opacity-70">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] mono opacity-70">
            <span>VisionSearch © 2026</span>
            <span>Hortti Sourcing Platform</span>
          </div>
        </div>
      </div>
    </div>
  );
}
