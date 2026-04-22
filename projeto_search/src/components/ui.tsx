import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon } from './Icon';

// ── Button ──────────────────────────────────────────────────────────────────

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children?: ReactNode;
  className?: string;
}

export function Button({ children, variant = 'primary', size = 'md', className = '', ...props }: ButtonProps) {
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2.5 text-sm', lg: 'px-6 py-3 text-sm' };
  const variants = {
    primary: 'btn-primary rounded-lg font-semibold',
    secondary: 'bg-white border border-slate-200 text-slate-900 hover:bg-slate-50 rounded-lg font-semibold transition-colors',
    ghost: 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg font-medium transition-colors',
    danger: 'bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-lg font-semibold transition-colors',
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

// ── Badge ────────────────────────────────────────────────────────────────────

interface BadgeProps {
  children: ReactNode;
  tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'mono';
  className?: string;
}

export function Badge({ children, tone = 'neutral', className = '' }: BadgeProps) {
  const tones = {
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
    accent: 'text-white border-transparent',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    mono: 'bg-slate-900 text-white border-slate-900 mono',
  };
  const accentStyle = tone === 'accent' ? { background: 'var(--accent)' } : {};
  return (
    <span
      style={accentStyle}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

// ── EmptyState ───────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon?: string;
  title: string;
  message: string;
  action?: ReactNode;
}

export function EmptyState({ icon = 'info', title, message, action }: EmptyStateProps) {
  return (
    <div className="text-center py-16 px-6">
      <div className="inline-flex w-12 h-12 rounded-full bg-slate-100 items-center justify-center text-slate-400 mb-4">
        <Icon name={icon} size={22} />
      </div>
      <h3 className="text-sm font-semibold text-slate-900 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 mb-4 max-w-sm mx-auto">{message}</p>
      {action}
    </div>
  );
}

// ── Modal ────────────────────────────────────────────────────────────────────

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ title, onClose, children }: ModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 anim-fade-in p-6"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg anim-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-900 rounded">
            <Icon name="x" size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Field ────────────────────────────────────────────────────────────────────

interface FieldProps {
  label: string;
  hint?: string;
  children: ReactNode;
}

export function Field({ label, hint, children }: FieldProps) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-700 mb-1.5 block">{label}</label>
      {children}
      {hint && <div className="text-[11px] text-slate-400 mt-1">{hint}</div>}
    </div>
  );
}

export const inputCls = 'w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-ring)]';

// ── TopBar ───────────────────────────────────────────────────────────────────

interface TopBarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onLogout: () => void;
  userName: string;
  userEmail: string;
  isAdmin: boolean;
}

export function TopBar({ currentView, onNavigate, onLogout, userName, userEmail, isAdmin }: TopBarProps) {
  const tabs = [
    { id: 'search', label: 'Busca Visual', icon: 'camera' },
    { id: 'catalog', label: 'Catálogo', icon: 'grid' },
    ...(isAdmin ? [{ id: 'admin', label: 'Admin', icon: 'shield' }] : []),
  ];

  const initials = userName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200">
      <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center gap-8">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent)' }}>
            <Icon name="scan" size={18} className="text-white" strokeWidth={2.5} />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-bold text-[15px] tracking-tight text-slate-900">VisionSearch</span>
            <span className="mono text-[10px] text-slate-400">v1.0</span>
          </div>
        </div>

        <nav className="flex items-center gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => onNavigate(t.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                currentView === t.id
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon name={t.icon} size={14} />
              {t.label}
            </button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Gemini 1.5 Flash
          </div>
          <div className="w-px h-6 bg-slate-200"></div>
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold"
              style={{ background: 'var(--accent)' }}
            >
              {initials}
            </div>
            <div className="hidden md:block">
              <div className="text-xs font-semibold text-slate-900 leading-tight">{userName}</div>
              <div className="text-[11px] text-slate-500 leading-tight">{isAdmin ? 'Admin' : 'Usuário'}</div>
            </div>
          </div>
          <button
            onClick={onLogout}
            title="Sair"
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
          >
            <Icon name="logout" size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

export const formatBRL = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });

export const categoryLabel = (id?: string) => {
  const map: Record<string, string> = {
    lighting: 'Iluminação',
    electronics: 'Eletrônicos',
    furniture: 'Móveis',
    other: 'Outros',
  };
  return map[id ?? ''] ?? id ?? '';
};
