# VisionSearch — Contexto Completo do Projeto

## Visão Geral

**VisionSearch** é uma aplicação web de busca visual de produtos por imagem. O usuário faz upload de uma foto de um produto e o sistema usa IA (Google Gemini) para analisar a imagem, extrair categoria e tags descritivas, e então busca produtos correspondentes no banco de dados, retornando o produto e os dados do fornecedor.

**Caso de uso principal:** Um comprador fotografa um produto que viu em algum lugar e quer saber qual fornecedor vende aquele item, qual o código SKU e o preço.

---

## Stack Técnica

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Frontend | React | 19.0.0 |
| Linguagem | TypeScript | ~5.8.2 |
| Build tool | Vite | 6.2.0 |
| Estilo | Tailwind CSS | 4.1.14 |
| Animações | Motion (Framer Motion) | 12.23.24 |
| Banco de dados | Supabase (PostgreSQL) | 2.49.4 |
| Autenticação | Supabase Auth (Google OAuth) | — |
| IA / Visão | Google Gemini API | 1.29.0 |
| Deploy | Vercel (SPA + Serverless) | — |
| Ícones | Lucide React | 0.546.0 |
| Utilitários CSS | clsx + tailwind-merge | — |

---

## Estrutura de Arquivos

```
projeto_search/
├── api/
│   └── analyze.ts              # Serverless function Vercel — chama Gemini API
├── src/
│   ├── App.tsx                 # Componente raiz — toda a lógica principal
│   ├── main.tsx                # Entry point React
│   ├── index.css               # Design tokens Tailwind (cores, fontes)
│   ├── types.ts                # Interfaces TypeScript (Product, Supplier, SearchResult)
│   ├── components/
│   │   └── ProductCard.tsx     # Card de exibição de produto + fornecedor
│   ├── lib/
│   │   ├── supabase.ts         # Cliente Supabase (createClient)
│   │   ├── gemini.ts           # Chamada ao endpoint /api/analyze
│   │   └── utils.ts            # Função cn() para merge de classes Tailwind
│   └── vite-env.d.ts           # Types Vite
├── .env.local                  # Credenciais locais (não vai para o git)
├── .env.example                # Template de variáveis de ambiente
├── .gitignore                  # Ignora node_modules, dist, .env*
├── vercel.json                 # Configuração de deploy Vercel
├── vite.config.ts              # Config Vite + middleware dev /api/analyze
├── tsconfig.json               # Config TypeScript
├── package.json                # Dependências e scripts
├── supabase-schema.sql         # Schema SQL para criar tabelas no Supabase
└── CONTEXT.md                  # Este arquivo
```

---

## Variáveis de Ambiente

### `.env.local` (desenvolvimento local)
```env
VITE_SUPABASE_URL="https://xmrraysovqrpetufzeej.supabase.co"
VITE_SUPABASE_ANON_KEY="sb_publishable_CcU13yUJD-wwEOvtAcjJVg_2ST3DbdW"
GEMINI_API_KEY="AIzaSyCIcA3HyFNFJ_yC44pTMEGC_nplawh0dlU"
```

### Variáveis no Vercel (produção)
- `GEMINI_API_KEY` — só no servidor (nunca exposta no bundle)
- `VITE_SUPABASE_URL` — exposta no frontend (seguro com RLS)
- `VITE_SUPABASE_ANON_KEY` — exposta no frontend (seguro com RLS)

**Importante:** `VITE_` prefix = exposta ao browser pelo Vite. `GEMINI_API_KEY` não tem o prefix pois só é usada no servidor (vite middleware em dev, serverless function em prod).

---

## Banco de Dados — Supabase

**Projeto:** `xmrraysovqrpetufzeej`
**URL:** `https://xmrraysovqrpetufzeej.supabase.co`
**Auth provider:** Google OAuth

### Tabelas

#### `suppliers`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid (PK) | Gerado automaticamente |
| name | text NOT NULL | Nome do fornecedor |
| contact | text NOT NULL | Email / telefone |
| address | text | Endereço físico |
| created_at | timestamptz | Auto |

#### `products`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid (PK) | Gerado automaticamente |
| name | text NOT NULL | Nome do produto |
| code | text NOT NULL | SKU / código único |
| price | numeric NOT NULL | Preço em R$ |
| image_url | text | URL da imagem do produto |
| supplier_id | uuid (FK) | Referência a `suppliers.id` |
| category | text | Ex: lighting, electronics, furniture, other |
| tags | text[] | Array de palavras-chave para busca |
| created_at | timestamptz | Auto |

### Row Level Security (RLS)

| Tabela | Operação | Quem pode |
|--------|----------|-----------|
| suppliers | SELECT | Qualquer usuário autenticado |
| suppliers | INSERT/UPDATE/DELETE | Apenas admin (`mathkraieski@gmail.com`) |
| products | SELECT | Qualquer usuário autenticado |
| products | INSERT/UPDATE/DELETE | Apenas admin (`mathkraieski@gmail.com`) |

---

## Autenticação

- **Provider:** Google OAuth via Supabase Auth
- **Fluxo:** Redirect (não popup) — `signInWithOAuth({ provider: 'google' })`
- **Após login:** Supabase redireciona de volta para `window.location.origin`
- **Estado:** Gerenciado via `supabase.auth.onAuthStateChange` + `getSession()`
- **Admin:** Usuário com email `mathkraieski@gmail.com` vê "Admin Tools" com botões para popular e adicionar produtos

---

## Fluxo de Busca Visual

```
1. Usuário faz upload de imagem (PNG/JPG/WEBP)
   └── FileReader converte para base64

2. Clica em "PESQUISAR NO BANCO"
   └── Chama POST /api/analyze com { base64Image, mimeType }

3. /api/analyze (serverless / vite middleware)
   └── Chama Gemini API (gemini-1.5-flash)
   └── Prompt: identificar nome, categoria e 5-10 tags
   └── Retorna JSON: { productName, category, tags[] }

4. App.tsx recebe análise do Gemini
   └── Query primária: busca produtos onde category = analysis.category
   └── Query fallback: busca produtos onde tags OVERLAP analysis.tags
   └── Cada query usa JOIN com suppliers (uma única query SQL)

5. Exibe ProductCard para cada resultado
```

---

## Integração com Gemini AI

### Endpoint de produção: `api/analyze.ts`
- Rota: `POST /api/analyze`
- Runtime: Node.js 20.x (Vercel Serverless)
- Usa `GEMINI_API_KEY` do ambiente do servidor
- Modelo: `gemini-1.5-flash`
- Retorna: `{ productName: string, category: string, tags: string[] }`

### Desenvolvimento local: `vite.config.ts`
- Plugin customizado `api-dev-middleware`
- Intercepta `POST /api/analyze` no servidor Vite
- Importa `@google/genai` dinamicamente em Node.js
- Lê `GEMINI_API_KEY` via `loadEnv(mode, '.', '')`
- Mesma lógica do serverless, funciona com `npm run dev`

---

## Queries Supabase no App

```typescript
// Busca por categoria com JOIN de fornecedor (query primária)
supabase
  .from('products')
  .select('*, supplier:suppliers(*)')
  .eq('category', analysis.category)

// Busca por overlap de tags (fallback)
supabase
  .from('products')
  .select('*, supplier:suppliers(*)')
  .overlaps('tags', analysis.tags)

// Catálogo completo
supabase
  .from('products')
  .select('*, supplier:suppliers(*)')

// Insert produto
supabase.from('products').insert({ name, code, price, image_url, supplier_id, category, tags })
```

**Mapeamento DB → App:** Supabase usa `snake_case` (image_url, supplier_id), o app usa `camelCase` (imageUrl, supplierId). O mapeamento acontece em `App.tsx` ao receber os dados.

---

## Componentes Principais

### `App.tsx`
Toda a lógica da aplicação em um único componente. Estados principais:
- `session` — sessão Supabase (`Session | null`)
- `results` — resultados da busca visual
- `allProducts` — catálogo completo
- `view` — `'search' | 'catalog'`
- `selectedImage` — base64 da imagem carregada
- `searching` — loading state da busca

Duas views principais:
- **BUSCA VISUAL:** Upload de imagem + botão de busca + resultados
- **CATÁLOGO:** Listagem com filtro por nome/SKU e por categoria

### `ProductCard.tsx`
Card visual com layout `grid-cols-[180px_1fr]`:
- Imagem do produto (180px, object-cover)
- Badge com SKU (canto superior direito da imagem)
- Grid 2 colunas: Produto, Código, Fornecedor, Preço (badge verde)
- Contato do fornecedor (full width)
- Botão "Falar com Vendedor" (placeholder)

### `src/lib/gemini.ts`
Wrapper simples que faz `fetch('POST /api/analyze')`. Não chama Gemini diretamente — delega ao endpoint seguro.

### `src/lib/supabase.ts`
```typescript
import { createClient } from '@supabase/supabase-js';
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

---

## Design System

Definido em `src/index.css` via `@theme` do Tailwind v4:

| Token | Valor | Uso |
|-------|-------|-----|
| `--color-primary` | `#2563EB` | Azul principal, botões, links |
| `--color-primary-dark` | `#1E40AF` | Hover de botões |
| `--color-bg` | `#F8FAFC` | Background da página |
| `--color-card` | `#FFFFFF` | Background dos cards |
| `--color-text-main` | `#1E293B` | Texto principal |
| `--color-text-muted` | `#64748B` | Texto secundário/labels |
| `--color-border` | `#E2E8F0` | Bordas |
| `--color-accent` | `#F1F5F9` | Hover backgrounds suaves |
| `--font-sans` | Segoe UI, Roboto... | Fonte padrão |

---

## Scripts

```bash
npm run dev      # Vite dev server na porta 3000 (com middleware /api/analyze)
npm run build    # Build de produção → dist/
npm run preview  # Preview do build local
npm run lint     # TypeScript check (tsc --noEmit)
npm run clean    # Remove dist/
```

---

## Deploy (Vercel)

- **Frontend:** SPA estática buildada pelo Vite → `dist/`
- **API:** `api/analyze.ts` → Vercel Serverless Function (Node.js 20.x)
- **CI/CD:** Conectar repo GitHub no painel Vercel para auto-deploy
- **Env vars em prod:** Configurar `GEMINI_API_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` em Vercel → Settings → Environment Variables

```bash
npx vercel --prod   # Deploy manual
```

---

## Dados de Teste (Seed)

O botão "Popular Banco de Dados" (visível apenas para admin) insere automaticamente:

**3 Fornecedores:**
- Distribuidora Global Tech (São Paulo)
- Móveis & Design Ltda (Rio de Janeiro)
- Fornecedor Padrão (Zona Industrial)

**9 Produtos:**
- 6 pendentes de iluminação (category: `lighting`)
- 1 smartphone Samsung Galaxy S24 Ultra (category: `electronics`)
- 1 cadeira ergonômica (category: `furniture`)
- 1 fone de ouvido noise cancelling (category: `electronics`)

---

## Segurança

- `GEMINI_API_KEY` nunca é exposta no bundle do browser
- Em dev: lida via `loadEnv` no Vite server-side
- Em prod: lida via variável de ambiente do Vercel server-side
- Supabase RLS garante que apenas autenticados leem dados
- Apenas `mathkraieski@gmail.com` pode escrever (insert/update/delete)
- `.env.local` está no `.gitignore` (`.env*` com exceção de `.env.example`)

---

## Repositório Git

- **URL:** https://github.com/MatheusKraieski/visionsearch
- **Branch principal:** `main`
- **Remote:** `origin`

---

## Pontos de Melhoria Futuros

- [ ] Busca vetorial (embeddings) para maior precisão de matching de imagens
- [ ] Upload de imagem para Supabase Storage em vez de URL externa
- [ ] Paginação no catálogo
- [ ] Botão "Falar com Vendedor" funcional (WhatsApp / email)
- [ ] Múltiplos fornecedores por produto
- [ ] Dashboard de analytics (buscas mais frequentes, produtos mais encontrados)
- [ ] Importação em massa de produtos via CSV
- [ ] Busca por texto além de imagem
