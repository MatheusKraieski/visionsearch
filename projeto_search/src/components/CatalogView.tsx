import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Product, Supplier } from '../types';
import { ProductCard } from './ProductCard';
import { EmptyState } from './ui';
import { Icon } from './Icon';

const CATEGORIES = [
  { id: 'lighting', label: 'Iluminação' },
  { id: 'electronics', label: 'Eletrônicos' },
  { id: 'furniture', label: 'Móveis' },
  { id: 'other', label: 'Outros' },
];

export function CatalogView() {
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState('all');
  const [allProducts, setAllProducts] = useState<{ product: Product; supplier: Supplier }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const { data } = await supabase.from('products').select('*, supplier:suppliers(*)').order('created_at', { ascending: false });
    setAllProducts(
      (data ?? []).map((row: any) => ({
        product: { id: row.id, name: row.name, code: row.code, price: row.price, imageUrl: row.image_url, supplierId: row.supplier_id, category: row.category, tags: row.tags },
        supplier: row.supplier,
      }))
    );
    setLoading(false);
  };

  const filtered = allProducts.filter(({ product }) => {
    if (cat !== 'all' && product.category !== cat) return false;
    if (query) {
      const q = query.toLowerCase();
      return (
        product.name.toLowerCase().includes(q) ||
        product.code.toLowerCase().includes(q) ||
        (product.tags ?? []).some((t) => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const countByCategory = (id: string) => allProducts.filter(({ product }) => product.category === id).length;

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="text-[11px] mono uppercase tracking-widest text-slate-400 mb-2">Catálogo Completo</div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">
            {allProducts.length} produto{allProducts.length !== 1 ? 's' : ''} em estoque
          </h1>
          <p className="text-sm text-slate-500">Navegue, filtre por categoria ou busque por nome, SKU ou tag.</p>
        </div>
        <button onClick={fetchAll} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors" title="Atualizar">
          <Icon name="refreshCw" size={16} />
        </button>
      </div>

      <div className="card p-3 mb-6 flex flex-wrap items-center gap-2">
        <div className="flex-1 min-w-[240px] relative">
          <Icon name="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome, SKU ou tag..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-[var(--accent)] focus:bg-white focus:ring-2 focus:ring-[var(--accent-ring)]"
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-md p-1">
          {[{ id: 'all', label: 'Todos', count: allProducts.length }, ...CATEGORIES.map((c) => ({ ...c, count: countByCategory(c.id) }))].map((c) => (
            <button
              key={c.id}
              onClick={() => setCat(c.id)}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${cat === c.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
            >
              {c.label}
              <span className="ml-1.5 text-[10px] text-slate-400 mono">{c.count}</span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card overflow-hidden">
              <div className="aspect-[4/3] shimmer" />
              <div className="p-4 space-y-2">
                <div className="h-3 w-16 rounded shimmer" />
                <div className="h-4 w-full rounded shimmer" />
                <div className="h-3 w-3/4 rounded shimmer" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="search"
          title="Nenhum resultado"
          message={query ? `Não encontramos produtos para "${query}". Tente outros termos.` : 'Nenhum produto nesta categoria.'}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(({ product, supplier }, i) => (
            <div key={product.id} className="anim-fade-up" style={{ animationDelay: `${i * 30}ms` }}>
              <ProductCard product={product} supplier={supplier} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
