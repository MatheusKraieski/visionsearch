import { useState, useRef, ChangeEvent } from 'react';
import { supabase } from '../lib/supabase';
import { analyzeProductImage } from '../lib/gemini';
import { Product, Supplier } from '../types';
import { ProductCard } from './ProductCard';
import { Button, EmptyState } from './ui';
import { Icon } from './Icon';

type Phase = 'idle' | 'preview' | 'analyzing' | 'results';

interface ImageMeta { url: string; name: string; size: number; base64: string; mimeType: string; }
interface ResultItem { product: Product; supplier: Supplier; confidence: number; }
interface Analysis { productName: string; category: string; tags: string[]; }

const SAMPLE_IMAGES = [
  'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=200&q=80',
  'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=200&q=80',
  'https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=200&q=80',
  'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&q=80',
];

const STEPS = [
  'Fazendo upload da imagem',
  'Gemini analisando conteúdo visual',
  'Extraindo categoria e tags',
  'Buscando produtos no Supabase',
];

export function SearchView() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [imageMeta, setImageMeta] = useState<ImageMeta | null>(null);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState(0);
  const [foundTags, setFoundTags] = useState<string[]>([]);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [results, setResults] = useState<ResultItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const reset = () => {
    setPhase('idle'); setImageMeta(null); setProgress(0);
    setStep(0); setFoundTags([]); setAnalysis(null); setResults([]); setError(null);
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const base64 = dataUrl.split(',')[1];
      const mimeType = dataUrl.split(';')[0].split(':')[1];
      setImageMeta({ url: dataUrl, name: file.name, size: file.size, base64, mimeType });
      setPhase('preview');
    };
    reader.readAsDataURL(file);
  };

  const handleSampleImage = async (src: string, idx: number) => {
    const res = await fetch(src);
    const blob = await res.blob();
    const file = new File([blob], `exemplo-${idx + 1}.jpg`, { type: blob.type });
    handleFile(file);
  };

  const analyze = async () => {
    if (!imageMeta) return;
    setPhase('analyzing');
    setProgress(0); setStep(0); setFoundTags([]); setError(null);

    // Start progress animation
    let p = 0;
    const tick = setInterval(() => {
      p += 2;
      setProgress(Math.min(p, 85));
      if (p === 15) setStep(1);
      if (p === 45) setStep(2);
      if (p === 70) setStep(3);
    }, 60);

    try {
      const geminiResult = await analyzeProductImage(imageMeta.base64, imageMeta.mimeType);
      const analysisData: Analysis = {
        productName: geminiResult.productName ?? 'Produto identificado',
        category: geminiResult.category ?? 'other',
        tags: geminiResult.tags ?? [],
      };

      // Animate tags appearing
      for (let i = 0; i < analysisData.tags.length; i++) {
        await new Promise((r) => setTimeout(r, 80));
        setFoundTags((prev) => [...prev, analysisData.tags[i]]);
      }

      // Query Supabase
      let { data } = await supabase
        .from('products')
        .select('*, supplier:suppliers(*)')
        .eq('category', analysisData.category);

      if (!data || data.length === 0) {
        const { data: tagData } = await supabase
          .from('products')
          .select('*, supplier:suppliers(*)')
          .overlaps('tags', analysisData.tags);
        data = tagData;
      }

      const scored: ResultItem[] = (data ?? []).map((row: any) => {
        const product: Product = {
          id: row.id, name: row.name, code: row.code, price: row.price,
          imageUrl: row.image_url, supplierId: row.supplier_id,
          category: row.category, tags: row.tags,
        };
        const supplier: Supplier = row.supplier;
        const overlap = (row.tags ?? []).filter((t: string) =>
          analysisData.tags.some((at) => at.toLowerCase() === t.toLowerCase())
        ).length;
        const confidence = Math.min(0.98, 0.55 + overlap * 0.09);
        return { product, supplier, confidence };
      }).sort((a: ResultItem, b: ResultItem) => b.confidence - a.confidence);

      clearInterval(tick);
      setProgress(100);
      setStep(4);
      setAnalysis(analysisData);
      setResults(scored);
      await new Promise((r) => setTimeout(r, 400));
      setPhase('results');
    } catch (err: any) {
      clearInterval(tick);
      setError(err.message ?? 'Erro ao analisar imagem.');
      setPhase('preview');
    }
  };

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="text-[11px] mono uppercase tracking-widest text-slate-400 mb-2">Busca Visual</div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">Encontre o fornecedor por foto</h1>
          <p className="text-sm text-slate-500 max-w-xl">
            Envie uma imagem do produto. A IA identifica o item, compara com o catálogo e retorna o fornecedor, SKU e preço.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 mono hidden md:flex">
          <Icon name="database" size={14} />
          Banco de produtos ativo
        </div>
      </div>

      {error && (
        <div className="mb-6 card p-4 flex items-center gap-3 text-red-600 bg-red-50 border-red-100">
          <Icon name="info" size={18} />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* IDLE: Dropzone */}
      {phase === 'idle' && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          onClick={() => fileRef.current?.click()}
          className={`dropzone relative cursor-pointer rounded-xl border-2 border-dashed transition-all ${
            drag ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-slate-300 hover:border-slate-400'
          }`}
        >
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={(e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          <div className="py-16 px-8 text-center">
            <div className="inline-flex w-14 h-14 rounded-full bg-white border border-slate-200 items-center justify-center text-slate-500 mb-4 shadow-sm">
              <Icon name="upload" size={22} />
            </div>
            <h3 className="text-base font-semibold text-slate-900 mb-1">Arraste uma foto ou clique para selecionar</h3>
            <p className="text-sm text-slate-500 mb-4">PNG, JPG ou WEBP · até 10 MB</p>
            <div className="flex items-center justify-center gap-2 text-[11px] mono text-slate-400">
              <span>PRODUTO ÚNICO NA FOTO</span><span>·</span><span>BOA ILUMINAÇÃO</span><span>·</span><span>FUNDO NEUTRO</span>
            </div>
          </div>
          <div className="border-t border-dashed border-slate-300 px-6 py-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Ou teste com um exemplo:</span>
              <div className="flex gap-2">
                {SAMPLE_IMAGES.map((src, i) => (
                  <button
                    key={i}
                    onClick={(e) => { e.stopPropagation(); handleSampleImage(src, i); }}
                    className="w-11 h-11 rounded-md overflow-hidden border border-slate-200 hover:border-[var(--accent)] hover:scale-105 transition-all"
                  >
                    <img src={src} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PREVIEW */}
      {phase === 'preview' && imageMeta && (
        <div className="card overflow-hidden anim-fade-in">
          <div className="grid grid-cols-[1fr_340px]">
            <div className="relative bg-slate-50 aspect-[4/3] flex items-center justify-center p-6">
              <img src={imageMeta.url} className="max-w-full max-h-full object-contain rounded-md" />
            </div>
            <div className="p-6 flex flex-col">
              <div className="text-[11px] mono uppercase tracking-widest text-slate-400 mb-3">Imagem pronta</div>
              <div className="space-y-2.5 text-sm mb-6">
                {[
                  ['Arquivo', <span className="mono text-xs truncate min-w-0" title={imageMeta.name}>{imageMeta.name}</span>],
                  ['Tamanho', <span className="mono text-xs">{(imageMeta.size / 1024).toFixed(1)} KB</span>],
                  ['Modelo', <span className="mono text-xs">gemini-1.5-flash</span>],
                  ['Custo est.', <span className="mono text-xs">~R$ 0,003</span>],
                ].map(([label, value]) => (
                  <div key={String(label)} className="flex justify-between items-center gap-3">
                    <span className="text-slate-500 flex-shrink-0">{label}</span>
                    <span className="text-slate-900 font-medium text-right">{value}</span>
                  </div>
                ))}
              </div>

              <Button onClick={analyze} className="w-full" size="lg">
                <Icon name="sparkles" size={14} />
                Pesquisar no banco
              </Button>
              <button onClick={reset} className="mt-2 w-full text-xs text-slate-500 hover:text-slate-900 py-2">
                Trocar imagem
              </button>

              <div className="mt-auto pt-6 border-t border-slate-100 text-[11px] text-slate-400 leading-relaxed">
                A imagem é enviada ao endpoint seguro <span className="mono">/api/analyze</span>. Não é armazenada.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ANALYZING */}
      {phase === 'analyzing' && imageMeta && (
        <div className="relative rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="grid grid-cols-[1fr_360px]">
            <div className="relative bg-slate-900 aspect-[4/3] overflow-hidden">
              <img src={imageMeta.url} className="w-full h-full object-contain" />
              <div
                className="absolute inset-0 opacity-30"
                style={{
                  backgroundImage: 'linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)',
                  backgroundSize: '32px 32px',
                }}
              />
              {step < 3 && <div className="scan-line" />}
              {[
                { top: 12, left: 12, borders: 'border-t-2 border-l-2' },
                { top: 12, right: 12, borders: 'border-t-2 border-r-2' },
                { bottom: 12, left: 12, borders: 'border-b-2 border-l-2' },
                { bottom: 12, right: 12, borders: 'border-b-2 border-r-2' },
              ].map((c, i) => (
                <div key={i} style={{ top: c.top, left: (c as any).left, right: (c as any).right, bottom: (c as any).bottom, borderColor: 'var(--accent)' }}
                  className={`absolute w-6 h-6 ${c.borders}`} />
              ))}
              <div className="absolute top-3 left-3 mono text-[10px] text-white/80 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--accent)' }} />
                VISION · {String(progress).padStart(3, '0')}%
              </div>
              <div className="absolute bottom-3 left-3 mono text-[10px] text-white/60">gemini-1.5-flash</div>
            </div>

            <div className="p-6 flex flex-col">
              <div className="text-[11px] mono uppercase tracking-widest text-slate-400 mb-3">Análise em andamento</div>
              <div className="space-y-3 mb-6">
                {STEPS.map((s, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                      style={
                        i < step ? { background: 'var(--accent)' }
                        : i === step ? { background: 'var(--accent-soft)', border: '2px solid var(--accent)' }
                        : { background: '#f1f5f9' }
                      }
                    >
                      {i < step
                        ? <Icon name="check" size={12} className="text-white" strokeWidth={3} />
                        : i === step
                        ? <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--accent)' }} />
                        : null}
                    </div>
                    <span className={`text-sm ${i <= step ? 'text-slate-900 font-medium' : 'text-slate-400'}`}>{s}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-100 pt-5">
                <div className="text-[11px] mono uppercase tracking-widest text-slate-400 mb-3">Tags detectadas</div>
                <div className="flex flex-wrap gap-1.5 min-h-[60px]">
                  {foundTags.length === 0 ? (
                    <><div className="h-6 w-20 rounded-full shimmer" /><div className="h-6 w-16 rounded-full shimmer" /><div className="h-6 w-24 rounded-full shimmer" /></>
                  ) : (
                    foundTags.map((t, i) => (
                      <span key={t} className="chip chip-accent anim-fade-up" style={{ animationDelay: `${i * 60}ms` }}>{t}</span>
                    ))
                  )}
                </div>
              </div>

              <div className="mt-auto pt-6">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-slate-500 mono">{progress}% concluído</span>
                  <span className="text-slate-400 mono">{(progress * 14).toFixed(0)}ms</span>
                </div>
                <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full transition-all duration-200" style={{ width: `${progress}%`, background: 'var(--accent)' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RESULTS */}
      {phase === 'results' && analysis && (
        <div className="anim-fade-in">
          <div className="card p-5 mb-6">
            <div className="flex items-start gap-5">
              <div className="w-24 h-24 rounded-lg overflow-hidden border border-slate-200 flex-shrink-0">
                <img src={imageMeta!.url} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-[11px] mono uppercase tracking-widest text-slate-400 mb-2">
                  <Icon name="sparkles" size={11} style={{ color: 'var(--accent)' }} />
                  <span>Análise concluída · {results.length} correspondência{results.length !== 1 ? 's' : ''}</span>
                </div>
                <h2 className="text-lg font-bold text-slate-900 mb-1">{analysis.productName}</h2>
                <div className="text-sm text-slate-500 mb-3">
                  Categoria: <span className="font-semibold text-slate-900">{analysis.category}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.tags.map((t) => (
                    <span key={t} className="chip chip-accent">{t}</span>
                  ))}
                </div>
              </div>
              <button
                onClick={reset}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md"
              >
                <Icon name="x" size={14} />
                Nova busca
              </button>
            </div>
          </div>

          {results.length === 0 ? (
            <EmptyState
              icon="search"
              title="Nenhum produto correspondente"
              message="Tente uma foto com melhor iluminação ou um ângulo mais claro."
              action={<Button variant="secondary" onClick={reset}>Tentar novamente</Button>}
            />
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-900">{results.length} produto{results.length !== 1 ? 's' : ''} encontrado{results.length !== 1 ? 's' : ''}</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.map(({ product, supplier, confidence }, i) => (
                  <div key={product.id} className="anim-fade-up" style={{ animationDelay: `${i * 50}ms` }}>
                    <ProductCard product={product} supplier={supplier} matchTags={analysis.tags} confidence={confidence} />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
