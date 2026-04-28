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
| Ícones | Custom `Icon.tsx` (SVG inline) | — |
| Utilitários CSS | clsx + tailwind-merge | — |

> **Nota:** Não há dependência do Lucide React. Os ícones são um componente customizado `Icon.tsx` com paths SVG inline para manter o bundle leve.

---

## Estrutura de Arquivos

```
projeto_search/
├── api/
│   └── analyze.ts              # Serverless function Vercel — chama Gemini API
├── src/
│   ├── App.tsx                 # Componente raiz — auth, routing de views, footer
│   ├── main.tsx                # Entry point React
│   ├── index.css               # Design tokens Tailwind (cores, fontes, animações)
│   ├── types.ts                # Interfaces TypeScript (Product, Supplier, SearchResult)
│   ├── components/
│   │   ├── Login.tsx           # Tela de login (Google OAuth + email placeholder)
│   │   ├── SearchView.tsx      # View de busca visual (phases: idle/preview/analyzing/results)
│   │   ├── CatalogView.tsx     # View de catálogo completo com filtros
│   │   ├── AdminView.tsx       # View admin (tabs: produtos/fornecedores/seed, modais, toast)
│   │   ├── ProductCard.tsx     # Card de produto com confidence badge e tag highlight
│   │   ├── Icon.tsx            # Sistema de ícones SVG inline (sem Lucide)
│   │   └── ui.tsx              # Componentes compartilhados: Button, Badge, Modal, Field,
│   │                           #   TopBar, EmptyState, formatBRL, categoryLabel, inputCls
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
- **Admin:** Usuário com email `mathkraieski@gmail.com` — vê aba "Admin" na TopBar e tem acesso ao AdminView
- **Login por email:** Campo presente na tela de Login mas desabilitado (placeholder "Em breve")
- **View persistida:** última view ativa salva em `localStorage['vs.view']`, restaurada no próximo acesso

---

## Fluxo de Busca Visual

```
1. Usuário faz upload de imagem (PNG/JPG/WEBP)
   └── FileReader converte para base64

2. Clica em "PESQUISAR NO BANCO"
   └── Chama POST /api/analyze com { base64Image, mimeType }

3. /api/analyze (serverless / vite middleware)
   └── Chama Gemini API (gemini-2.0-flash)
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
- Modelo: `gemini-2.0-flash`
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
Componente raiz enxuto — apenas auth, routing de views e footer. Estados:
- `session` — sessão Supabase (`Session | null`)
- `loading` — estado de carregamento inicial do auth
- `view` — `'search' | 'catalog' | 'admin'` (persistido em `localStorage` via key `vs.view`)

Lógica delegada para componentes de view. Admin identificado pelo email `mathkraieski@gmail.com`. Renderiza `<AdminView>` apenas se `isAdmin === true`.

Footer: `© 2026 Hortti — v1.0.0` (produto da Hortti Sourcing Platform).

---

### `Login.tsx`
Layout dois painéis:
- **Esquerda:** botão Google OAuth (funcional) + campo email/password (desabilitado, "Em breve")
- **Direita (lg+):** painel hero com explicação 3 passos (visível apenas desktop)

---

### `SearchView.tsx`
Máquina de estados com 4 fases (`Phase = 'idle' | 'preview' | 'analyzing' | 'results'`):

| Fase | Descrição |
|------|-----------|
| `idle` | Dropzone com drag-and-drop + 4 imagens de exemplo do Unsplash |
| `preview` | Thumbnail da imagem + metadados (nome, tamanho, modelo, custo estimado ~R$0,003) |
| `analyzing` | Overlay de análise com progress bar, 4 steps animados, tags aparecendo uma a uma |
| `results` | Resumo da análise + grid de ProductCards com scores de confiança |

**Scoring de confiança:**
```typescript
const overlap = tags_do_produto.filter(t => tags_do_gemini.includes(t)).length;
const confidence = Math.min(0.98, 0.55 + overlap * 0.09);
```
Resultados ordenados por `confidence` desc. Exibido como badge `XX% match` no canto superior esquerdo da imagem no card.

**Imagens de exemplo:** 4 URLs do Unsplash (pendente, smartphone, cadeira, fone) que são baixadas via `fetch` e convertidas em `File` para simular um upload real.

---

### `CatalogView.tsx`
- Busca por nome, SKU **ou tag** (full-text no campo único)
- Filtro por categoria via segmented control: Todos / Iluminação / Eletrônicos / Móveis / Outros
- Skeleton shimmer em grid 3-col durante loading
- Botão de refresh manual no header
- Ordenação por `created_at DESC` (mais novos primeiro)

---

### `AdminView.tsx`
View restrita ao admin com 3 abas:

**Aba Produtos:**
- Tabela com imagem thumbnail, nome, SKU, categoria, fornecedor, preço, botão delete
- Confirmação inline (delete direto via Supabase)

**Aba Fornecedores:**
- Grid 2 colunas com cards: avatar de iniciais, badge "Ativo", contato, endereço, contador de produtos vinculados

**Aba Seed & Import:**
- Botão "Executar seed" (mesmo que o do header)
- Card "Importar CSV" — placeholder desabilitado ("Em breve")

**Elementos globais do AdminView:**
- Stats cards no topo (4 métricas: Produtos, Fornecedores, Categorias, Admin)
- Modal `AddProductModal` — campos: nome, SKU, preço, categoria, fornecedor, URL imagem, tags CSV
- Modal `AddSupplierModal` — campos: razão social, contato, endereço
- Toast de feedback (2,5s, canto inferior direito)
- Botão contextual no header muda de "Novo produto" para "Novo fornecedor" conforme a aba ativa

---

### `ProductCard.tsx`
Layout `flex flex-col` com image area `aspect-[4/3]`:
- Hover: `scale-105` na imagem (500ms) + shadow elevada no card
- Badge SKU no canto superior direito (tom `mono` — fundo preto)
- Badge de confiança `XX% match` no canto superior esquerdo (apenas quando `confidence !== null`)
- Tags (até 4): as que fazem match com a busca ficam destacadas em cor accent
- Botão "Falar com vendedor" (placeholder) + botão copiar SKU (via `navigator.clipboard`)

---

### `Icon.tsx`
Componente SVG inline customizado — não depende de biblioteca externa. Props: `name`, `size`, `className`, `strokeWidth`, `style`.

Ícones disponíveis: `search`, `upload`, `sparkles`, `zap`, `grid`, `x`, `check`, `message`, `phone`, `mapPin`, `plus`, `logout`, `database`, `edit`, `trash`, `info`, `history`, `camera`, `copy`, `mail`, `building`, `scan`, `package`, `shield`, `arrowRight`, `refreshCw`, `users`.

---

### `ui.tsx` — Componentes compartilhados

| Export | Descrição |
|--------|-----------|
| `Button` | variants: `primary`, `secondary`, `ghost`, `danger`; sizes: `sm`, `md`, `lg` |
| `Badge` | tones: `neutral`, `accent`, `success`, `warning`, `mono` |
| `EmptyState` | ícone + título + mensagem + action opcional |
| `Modal` | overlay + card centrado, fecha ao clicar fora |
| `Field` | label + children + hint opcional |
| `TopBar` | Header sticky com blur, logo, nav tabs, avatar, botão logout |
| `inputCls` | string de classes Tailwind para inputs padronizados |
| `formatBRL` | `n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })` |
| `categoryLabel` | mapeia `'lighting'→'Iluminação'`, `'electronics'→'Eletrônicos'`, etc. |

**TopBar:** sticky top-0, backdrop-blur, tabs `Busca Visual / Catálogo / Admin` (Admin só para isAdmin), avatar com iniciais, indicador "Gemini 1.5 Flash" (dot verde), botão logout.

---

### `src/lib/gemini.ts`
Wrapper que faz `fetch('POST /api/analyze')`. Não chama Gemini diretamente — delega ao endpoint seguro.

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

O botão "Popular banco" (aba Seed & Import ou header do AdminView) insere automaticamente:

**3 Fornecedores:**
- Distribuidora Global Tech (São Paulo — eletrônicos)
- Móveis & Design Ltda (Rio de Janeiro — móveis)
- Iluminar Comércio de Luminárias (São Paulo — iluminação)

**12 Produtos:**

| SKU | Nome | Categoria | Fornecedor |
|-----|------|-----------|------------|
| LUM-PND-001 | Pendente Bulbo Industrial Preto | lighting | Iluminar |
| LUM-PND-014 | Pendente Cúpula Latão Escovado | lighting | Iluminar |
| LUM-PND-022 | Pendente Globo Vidro Fumê | lighting | Iluminar |
| LUM-PND-031 | Pendente Geométrico Dourado | lighting | Iluminar |
| LUM-PND-040 | Pendente Rattan Natural | lighting | Iluminar |
| LUM-MES-008 | Luminária de Mesa Articulável | lighting | Iluminar |
| ELT-SMG-S24U | Samsung Galaxy S24 Ultra 256GB | electronics | Global Tech |
| ELT-FON-NC01 | Fone Over-Ear Noise Cancelling | electronics | Global Tech |
| ELT-NTB-PRO14 | Notebook Pro 14" M3 512GB | electronics | Global Tech |
| MOB-CAD-PRES | Cadeira Ergonômica Presidente | furniture | Móveis & Design |
| MOB-MES-CVL6 | Mesa de Jantar Carvalho 6 Lugares | furniture | Móveis & Design |
| MOB-POL-VRD | Poltrona Veludo Verde Musgo | furniture | Móveis & Design |

Todas as imagens são do Unsplash (URLs públicas, `w=600&q=80`).

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
