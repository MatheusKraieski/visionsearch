import { Product, Supplier } from '../types';
import { Icon } from './Icon';
import { Badge, formatBRL, categoryLabel } from './ui';

interface ProductCardProps {
  product: Product;
  supplier?: Supplier;
  matchTags?: string[];
  confidence?: number | null;
}

export function ProductCard({ product, supplier, matchTags = [], confidence = null }: ProductCardProps) {
  const matchedTagSet = new Set(matchTags);

  return (
    <div className="card overflow-hidden flex flex-col group hover:shadow-lg hover:border-slate-300 transition-all">
      <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400 flex-col gap-2">
            <Icon name="package" size={32} />
            <span className="text-[10px] uppercase font-bold mono">Sem Imagem</span>
          </div>
        )}

        <div className="absolute top-3 right-3">
          <Badge tone="mono" className="shadow-sm">{product.code}</Badge>
        </div>

        {confidence !== null && (
          <div className="absolute top-3 left-3">
            <div
              className="px-2 py-1 rounded-md text-[11px] font-semibold mono text-white flex items-center gap-1 shadow-sm"
              style={{ background: 'var(--accent)' }}
            >
              <Icon name="sparkles" size={11} />
              {(confidence * 100).toFixed(0)}% match
            </div>
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col flex-1">
        <div className="text-[11px] mono uppercase tracking-wider text-slate-400 mb-1">
          {categoryLabel(product.category)}
        </div>
        <h3 className="font-semibold text-slate-900 text-sm leading-snug mb-3 line-clamp-2">
          {product.name}
        </h3>

        {product.tags && product.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {product.tags.slice(0, 4).map((t) => (
              <span
                key={t}
                className={`text-[10px] px-1.5 py-0.5 rounded border ${
                  matchedTagSet.has(t)
                    ? 'border-[var(--accent-ring)] text-[var(--accent-dark)] bg-[var(--accent-soft)] font-semibold'
                    : 'border-slate-200 text-slate-500'
                }`}
              >
                {t}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto pt-3 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[10px] mono uppercase text-slate-400">Fornecedor</div>
              <div className="text-xs font-semibold text-slate-900 truncate">{supplier?.name ?? 'N/A'}</div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-[10px] mono uppercase text-slate-400">Preço</div>
              <div className="text-sm font-bold text-emerald-700 mono">{formatBRL(product.price)}</div>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button className="flex-1 btn-primary rounded-md py-2 text-xs font-semibold flex items-center justify-center gap-1.5">
              <Icon name="message" size={12} />
              Falar com vendedor
            </button>
            <button
              onClick={() => navigator.clipboard.writeText(product.code)}
              className="w-9 h-9 rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 flex items-center justify-center"
              title="Copiar SKU"
            >
              <Icon name="copy" size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
