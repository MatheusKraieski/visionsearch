import { useState, useEffect, useRef, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { Product, Supplier } from '../types';
import { Button, Badge, EmptyState, Modal, Field, formatBRL, categoryLabel, inputCls } from './ui';
import { getEmbedding } from '../lib/embeddings';
import { Icon } from './Icon';

const ADMIN_EMAIL = 'mathkraieski@gmail.com';

interface AdminViewProps { userEmail: string; }

export function AdminView({ userEmail }: AdminViewProps) {
  const [tab, setTab] = useState<'products' | 'suppliers' | 'seed'>('products');
  const [modal, setModal] = useState<'add-product' | 'add-supplier' | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [products, setProducts] = useState<(Product & { supplierName?: string })[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: pData }, { data: sData }] = await Promise.all([
      supabase.from('products').select('*, supplier:suppliers(name)').order('created_at', { ascending: false }),
      supabase.from('suppliers').select('*').order('name'),
    ]);
    setProducts((pData ?? []).map((r: any) => ({ ...r, id: r.id, name: r.name, code: r.code, price: r.price, imageUrl: r.image_url, supplierId: r.supplier_id, category: r.category, tags: r.tags, supplierName: r.supplier?.name })));
    setSuppliers((sData ?? []).map((r: any) => ({ id: r.id, name: r.name, contact: r.contact, address: r.address })));
    setLoading(false);
  };

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const backfillEmbeddings = async () => {
    setLoading(true);
    let lastError = '';
    try {
      const { data: all } = await supabase.from('products').select('id, name, tags').is('embedding', null);
      if (!all || all.length === 0) { showToast('Todos os produtos já têm embeddings'); setLoading(false); return; }
      let ok = 0;
      for (const p of all) {
        try {
          const text = `${p.name} ${(p.tags ?? []).join(' ')}`;
          const embedding = await getEmbedding(text);
          await supabase.from('products').update({ embedding }).eq('id', p.id);
          ok++;
        } catch (e: any) {
          lastError = e.message;
        }
      }
      if (ok === 0 && lastError) {
        showToast(`Erro: ${lastError}`);
      } else {
        showToast(`Embeddings gerados: ${ok}/${all.length} produtos`);
      }
    } catch (err: any) {
      showToast('Erro: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const seedData = async () => {
    setLoading(true);
    try {
      const { data: s1 } = await supabase.from('suppliers').insert({ name: 'Distribuidora Global Tech', contact: 'contato@globaltech.com.br | (11) 98888-7777', address: 'Rua das Inovações, 123, São Paulo - SP' }).select('id').single();
      const { data: s2 } = await supabase.from('suppliers').insert({ name: 'Móveis & Design Ltda', contact: 'vendas@moveisdesign.com | (21) 3333-4444', address: 'Av. Estilo, 456, Rio de Janeiro - RJ' }).select('id').single();
      const { data: s3 } = await supabase.from('suppliers').insert({ name: 'Iluminar Comércio de Luminárias', contact: 'contato@iluminar.com.br | (11) 2155-7788', address: 'R. da Consolação, 2450, São Paulo - SP' }).select('id').single();

      await supabase.from('products').insert([
        { name: 'Pendente Bulbo Industrial Preto', code: 'LUM-PND-001', price: 289.90, image_url: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=600&q=80', supplier_id: s3!.id, category: 'lighting', tags: ['pendente', 'luminária', 'preto', 'industrial', 'bulbo', 'teto'] },
        { name: 'Pendente Cúpula Latão Escovado', code: 'LUM-PND-014', price: 549.00, image_url: 'https://images.unsplash.com/photo-1524634126442-357e0eac3c14?w=600&q=80', supplier_id: s3!.id, category: 'lighting', tags: ['pendente', 'latão', 'cúpula', 'dourado', 'elegante', 'sala'] },
        { name: 'Pendente Globo Vidro Fumê', code: 'LUM-PND-022', price: 399.50, image_url: 'https://images.unsplash.com/photo-1565636192335-fcd1b1b85c1b?w=600&q=80', supplier_id: s3!.id, category: 'lighting', tags: ['pendente', 'vidro', 'globo', 'fumê', 'moderno', 'minimalista'] },
        { name: 'Pendente Geométrico Dourado', code: 'LUM-PND-031', price: 679.00, image_url: 'https://images.unsplash.com/photo-1540932239986-30128078f3c5?w=600&q=80', supplier_id: s3!.id, category: 'lighting', tags: ['pendente', 'geométrico', 'dourado', 'decorativo', 'sala', 'jantar'] },
        { name: 'Pendente Rattan Natural', code: 'LUM-PND-040', price: 459.90, image_url: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600&q=80', supplier_id: s3!.id, category: 'lighting', tags: ['pendente', 'rattan', 'natural', 'bege', 'boho', 'orgânico'] },
        { name: 'Luminária de Mesa Articulável', code: 'LUM-MES-008', price: 219.00, image_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80', supplier_id: s3!.id, category: 'lighting', tags: ['luminária', 'mesa', 'articulável', 'escritório', 'preto', 'minimalista'] },
        { name: 'Samsung Galaxy S24 Ultra 256GB', code: 'ELT-SMG-S24U', price: 7499.00, image_url: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=600&q=80', supplier_id: s1!.id, category: 'electronics', tags: ['smartphone', 'samsung', 'galaxy', 'celular', 'android', 'preto'] },
        { name: 'Cadeira Ergonômica Presidente', code: 'MOB-CAD-PRES', price: 1890.00, image_url: 'https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=600&q=80', supplier_id: s2!.id, category: 'furniture', tags: ['cadeira', 'ergonômica', 'escritório', 'preto', 'couro', 'rodízio'] },
        { name: 'Fone Over-Ear Noise Cancelling', code: 'ELT-FON-NC01', price: 1299.00, image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80', supplier_id: s1!.id, category: 'electronics', tags: ['fone', 'headphone', 'bluetooth', 'noise', 'cancelling', 'preto'] },
        { name: 'Mesa de Jantar Carvalho 6 Lugares', code: 'MOB-MES-CVL6', price: 3290.00, image_url: 'https://images.unsplash.com/photo-1615874959474-d609969a20ed?w=600&q=80', supplier_id: s2!.id, category: 'furniture', tags: ['mesa', 'jantar', 'carvalho', 'madeira', 'marrom'] },
        { name: 'Poltrona Veludo Verde Musgo', code: 'MOB-POL-VRD', price: 2150.00, image_url: 'https://images.unsplash.com/photo-1567016526105-22da7c13161a?w=600&q=80', supplier_id: s2!.id, category: 'furniture', tags: ['poltrona', 'veludo', 'verde', 'decoração', 'sala', 'estofado'] },
        { name: 'Notebook Pro 14" M3 512GB', code: 'ELT-NTB-PRO14', price: 12490.00, image_url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&q=80', supplier_id: s1!.id, category: 'electronics', tags: ['notebook', 'laptop', 'pro', 'alumínio', 'cinza', 'profissional'] },
      ]);

      await fetchData();
      showToast('Seed executado · 12 produtos · 3 fornecedores');
    } catch (err: any) {
      showToast('Erro: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteProduct = async (id: string) => {
    await supabase.from('products').delete().eq('id', id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
    showToast('Produto removido');
  };

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 text-[11px] mono uppercase tracking-widest text-slate-400 mb-2">
            <Icon name="shield" size={11} />
            Admin Tools · Restrito
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">Gerenciar base de dados</h1>
          <p className="text-sm text-slate-500">
            Autenticado como <span className="mono text-slate-900">{userEmail}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={seedData} disabled={loading}>
            <Icon name="database" size={14} />
            Popular banco
          </Button>
          <Button onClick={() => setModal(tab === 'suppliers' ? 'add-supplier' : 'add-product')}>
            <Icon name="plus" size={14} />
            {tab === 'suppliers' ? 'Novo fornecedor' : 'Novo produto'}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Produtos', value: products.length, sub: 'cadastrados', icon: 'package' },
          { label: 'Fornecedores', value: suppliers.length, sub: 'ativos', icon: 'building' },
          { label: 'Categorias', value: new Set(products.map((p) => p.category)).size, sub: 'diferentes', icon: 'grid' },
          { label: 'Admin', value: '1', sub: userEmail, icon: 'shield' },
        ].map((s) => (
          <div key={s.label} className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] mono uppercase text-slate-400">{s.label}</span>
              <Icon name={s.icon} size={14} className="text-slate-300" />
            </div>
            <div className="text-2xl font-bold text-slate-900 mono">{s.value}</div>
            <div className="text-xs text-slate-500 mt-1 truncate">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 mb-6 flex gap-6">
        {[
          { id: 'products', label: 'Produtos', count: products.length },
          { id: 'suppliers', label: 'Fornecedores', count: suppliers.length },
          { id: 'seed', label: 'Seed & Import' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`relative pb-3 text-sm font-semibold transition-colors ${tab === t.id ? 'text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
          >
            {t.label}
            {t.count !== undefined && <span className="ml-1.5 text-xs text-slate-400 mono">{t.count}</span>}
            {tab === t.id && <div className="absolute -bottom-px left-0 right-0 h-0.5" style={{ background: 'var(--accent)' }} />}
          </button>
        ))}
      </div>

      {tab === 'products' && (
        loading ? <div className="card p-8 text-center text-slate-400 text-sm">Carregando...</div>
        : products.length === 0 ? <EmptyState icon="package" title="Nenhum produto" message="Use o botão 'Popular banco' para adicionar dados de teste." />
        : (
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['', 'Produto', 'SKU', 'Categoria', 'Fornecedor', 'Preço', ''].map((h, i) => (
                    <th key={i} className="text-left text-[11px] mono uppercase tracking-wider text-slate-500 font-semibold px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 w-12">
                      <div className="w-10 h-10 rounded-md overflow-hidden border border-slate-200 bg-slate-100">
                        {p.imageUrl && <img src={p.imageUrl} className="w-full h-full object-cover" />}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-semibold text-slate-900 line-clamp-1">{p.name}</div>
                      <div className="text-xs text-slate-500 line-clamp-1">{(p.tags ?? []).slice(0, 3).join(' · ')}</div>
                    </td>
                    <td className="px-4 py-3"><span className="mono text-xs text-slate-600">{p.code}</span></td>
                    <td className="px-4 py-3"><Badge>{categoryLabel(p.category)}</Badge></td>
                    <td className="px-4 py-3 text-sm text-slate-700">{(p as any).supplierName ?? '—'}</td>
                    <td className="px-4 py-3 mono text-sm font-semibold text-emerald-700">{formatBRL(p.price)}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => deleteProduct(p.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-white rounded">
                        <Icon name="trash" size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab === 'suppliers' && (
        suppliers.length === 0
          ? <EmptyState icon="building" title="Nenhum fornecedor" message="Use o botão 'Popular banco' para adicionar dados de teste." />
          : (
            <div className="grid grid-cols-2 gap-4">
              {suppliers.map((s) => (
                <div key={s.id} className="card p-5 hover:border-slate-300 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ background: 'var(--accent)' }}>
                      {s.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                    </div>
                    <Badge tone="success">Ativo</Badge>
                  </div>
                  <h3 className="font-bold text-slate-900 text-base mb-1">{s.name}</h3>
                  <div className="space-y-1.5 text-xs mt-3">
                    <div className="flex items-center gap-2 text-slate-600"><Icon name="mail" size={12} className="text-slate-400" />{s.contact}</div>
                    {s.address && <div className="flex items-center gap-2 text-slate-600"><Icon name="mapPin" size={12} className="text-slate-400" />{s.address}</div>}
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
                    {products.filter((p) => p.supplierId === s.id).length} produto(s)
                  </div>
                </div>
              ))}
            </div>
          )
      )}

      {tab === 'seed' && (
        <div className="grid grid-cols-2 gap-4">
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                <Icon name="database" size={18} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Popular com seed</h3>
                <div className="text-xs text-slate-500">3 fornecedores · 12 produtos</div>
              </div>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mb-4">
              Insere dados de teste com imagens reais do Unsplash para você experimentar busca visual imediatamente.
            </p>
            <Button onClick={seedData} className="w-full" disabled={loading}>
              <Icon name="zap" size={14} />
              Executar seed
            </Button>
          </div>
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-slate-100 text-slate-600">
                <Icon name="sparkles" size={18} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Gerar embeddings</h3>
                <div className="text-xs text-slate-500">Busca vetorial por similaridade</div>
              </div>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mb-4">
              Gera vetores de similaridade para todos os produtos sem embedding. Necessário após popular o banco ou ativar o pgvector.
            </p>
            <Button onClick={backfillEmbeddings} className="w-full" disabled={loading}>
              <Icon name="zap" size={14} />
              Gerar para todos os produtos
            </Button>
          </div>
        </div>
      )}

      {modal === 'add-product' && (
        <AddProductModal
          suppliers={suppliers}
          onClose={() => setModal(null)}
          onSave={async (data) => {
            await supabase.from('products').insert(data);
            await fetchData();
            setModal(null);
            showToast('Produto salvo com sucesso!');
          }}
        />
      )}

      {modal === 'add-supplier' && (
        <AddSupplierModal
          onClose={() => setModal(null)}
          onSave={async (data) => {
            await supabase.from('suppliers').insert(data);
            await fetchData();
            setModal(null);
            showToast('Fornecedor adicionado!');
          }}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 text-sm anim-fade-up">
          <Icon name="check" size={14} className="text-emerald-400" />
          {toast}
        </div>
      )}
    </div>
  );
}

// ── Add Product Modal ────────────────────────────────────────────────────────

function AddProductModal({ suppliers, onClose, onSave }: { suppliers: Supplier[]; onClose: () => void; onSave: (data: any) => void }) {
  const [form, setForm] = useState({ name: '', code: '', price: '', category: 'lighting', imageUrl: '', supplierId: suppliers[0]?.id ?? '', tags: '' });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImageFile = (file: File) => {
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setForm((f) => ({ ...f, imageUrl: '' }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setUploading(true);
    try {
      let imageUrl = form.imageUrl;

      if (imageFile) {
        const ext = imageFile.name.split('.').pop();
        const fileName = `${Date.now()}-${form.code.replace(/[^a-zA-Z0-9]/g, '-')}.${ext}`;
        const { error } = await supabase.storage.from('product-images').upload(fileName, imageFile);
        if (!error) {
          const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
          imageUrl = data.publicUrl;
        }
      }

      const tags = form.tags.split(',').map((t) => t.trim()).filter(Boolean);

      let embedding: number[] | undefined;
      try {
        embedding = await getEmbedding(`${form.name} ${tags.join(' ')}`);
      } catch {
        // proceed without embedding if HF token not configured or pgvector not enabled
      }

      onSave({
        name: form.name, code: form.code, price: parseFloat(form.price),
        category: form.category, image_url: imageUrl, supplier_id: form.supplierId,
        tags,
        ...(embedding ? { embedding } : {}),
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal title="Novo produto" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <Field label="Nome do produto">
            <input required className={inputCls} placeholder="Ex: Pendente Geométrico Dourado" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="SKU / Código">
              <input required className={inputCls + ' mono'} placeholder="LUM-PND-042" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            </Field>
            <Field label="Preço (R$)">
              <input required type="number" step="0.01" className={inputCls + ' mono'} placeholder="0,00" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Categoria">
              <select className={inputCls} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option value="lighting">Iluminação</option>
                <option value="electronics">Eletrônicos</option>
                <option value="furniture">Móveis</option>
                <option value="other">Outros</option>
              </select>
            </Field>
            <Field label="Fornecedor">
              <select className={inputCls} value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Imagem do produto">
            <div className="space-y-2">
              {imagePreview && (
                <div className="w-full h-28 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center">
                  <img src={imagePreview} className="max-h-full object-contain" />
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageFile(f); }} />
              <button type="button" onClick={() => fileRef.current?.click()} className={inputCls + ' w-full text-left text-slate-500 cursor-pointer hover:bg-slate-50'}>
                {imageFile ? imageFile.name : 'Selecionar arquivo de imagem...'}
              </button>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-xs text-slate-400">ou URL externa</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>
              <input type="url" className={inputCls + ' mono text-xs'} placeholder="https://..." value={form.imageUrl} onChange={(e) => { setForm({ ...form, imageUrl: e.target.value }); if (e.target.value) { setImageFile(null); setImagePreview(null); } }} />
            </div>
          </Field>
          <Field label="Tags (separadas por vírgula)" hint="Palavras-chave usadas pela busca por similaridade">
            <input className={inputCls} placeholder="pendente, vidro, moderno" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
          </Field>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50 rounded-b-xl">
          <div className="text-[11px] text-slate-500 mono flex items-center gap-1.5">
            <Icon name="info" size={11} />
            RLS · somente admins podem escrever
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" type="button" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={uploading}>{uploading ? 'Salvando...' : 'Salvar produto'}</Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

// ── Add Supplier Modal ───────────────────────────────────────────────────────

function AddSupplierModal({ onClose, onSave }: { onClose: () => void; onSave: (data: any) => void }) {
  const [form, setForm] = useState({ name: '', contact: '', address: '' });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <Modal title="Novo fornecedor" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="p-6 space-y-4">
          <Field label="Razão social / Nome">
            <input required className={inputCls} placeholder="Ex: Iluminar Comércio de Luminárias" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Contato (e-mail / telefone)">
            <input required className={inputCls} placeholder="contato@empresa.com.br | (11) 0000-0000" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
          </Field>
          <Field label="Endereço">
            <input className={inputCls} placeholder="Rua, nº — Cidade, UF" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </Field>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50 rounded-b-xl">
          <Button variant="ghost" type="button" onClick={onClose}>Cancelar</Button>
          <Button type="submit">Salvar fornecedor</Button>
        </div>
      </form>
    </Modal>
  );
}
