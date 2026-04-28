# Plano de Lançamento — VisionSearch

## Visão Geral

VisionSearch é um sistema de busca visual de produtos por IA que permite identificar
fornecedores, SKU e preço a partir de uma foto. Este documento cobre os custos reais
para lançar o projeto e o passo a passo completo de produção.

---

## 1. Custos por Serviço

### Supabase (Banco de dados + Storage + Auth)
| Plano       | Preço          | Limites                                                    |
|-------------|----------------|------------------------------------------------------------|
| Free        | R$ 0/mês       | 500 MB banco, 1 GB storage, 50.000 usuários auth           |
| Pro         | ~R$ 150/mês    | 8 GB banco, 100 GB storage, usuários ilimitados            |
| Team        | ~R$ 450/mês    | Banco ilimitado, suporte prioritário, SLA                  |

**Recomendação:** Free para MVP, Pro quando passar de 500 MB de dados ou precisar de backup automático.

---

### Vercel (Hospedagem + Deploy + CDN)
| Plano       | Preço          | Limites                                                    |
|-------------|----------------|------------------------------------------------------------|
| Hobby       | R$ 0/mês       | Uso pessoal, sem domínio customizado em times, 100 GB banda|
| Pro         | ~R$ 120/mês    | Domínios ilimitados, analytics, 1 TB banda, SLA 99.99%     |
| Enterprise  | Sob consulta   | Contratos, suporte dedicado                                |

**Recomendação:** Hobby para testes. Pro para produção com clientes reais.

> Atenção: o plano Hobby não pode ser usado comercialmente pelos termos da Vercel.
> Para uso empresarial, mesmo que gratuito, use o plano Pro.

---

### Groq (IA de análise de imagens — Llama 4 Scout Vision)
| Plano       | Preço          | Limites                                                    |
|-------------|----------------|------------------------------------------------------------|
| Free        | R$ 0/mês       | 30 req/min · 1.000 req/dia · 14.400 tokens/min             |
| Pay-as-you-go | ~R$ 0,03/1K tokens | Sem limite, paga pelo uso                            |

**Estimativa de custo por busca:** ~1.500 tokens por imagem analisada = ~R$ 0,05/busca

| Volume mensal | Custo estimado |
|---------------|----------------|
| Até 200 buscas/mês  | Grátis (free tier)     |
| 1.000 buscas/mês    | ~R$ 50/mês             |
| 5.000 buscas/mês    | ~R$ 250/mês            |
| 20.000 buscas/mês   | ~R$ 1.000/mês          |

---

### HuggingFace (Embeddings para busca vetorial)
| Plano       | Preço          | Limites                                                    |
|-------------|----------------|------------------------------------------------------------|
| Free        | R$ 0/mês       | Rate limited, pode ter fila nos horários de pico           |
| PRO         | ~R$ 55/mês     | Prioridade de inferência, sem fila                         |
| Inference Endpoints | ~R$ 60-300/mês | Endpoint dedicado, latência garantida              |

**Alternativa gratuita sem limite:** rodar o modelo de embeddings localmente no servidor
com `ollama` ou `transformers` — custo zero, mas exige servidor próprio.

---

### Domínio
| Opção       | Preço          | Onde comprar                                               |
|-------------|----------------|------------------------------------------------------------|
| .com.br     | ~R$ 50/ano     | Registro.br (único registrador oficial)                    |
| .com        | ~R$ 70-90/ano  | Cloudflare Registrar, Namecheap, GoDaddy                   |
| .app / .io  | ~R$ 120-200/ano| Cloudflare Registrar                                       |

---

## 2. Cenários de Custo Mensal

### Cenário A — MVP / Testes internos
*Equipe pequena, uso interno, sem clientes pagantes*

| Serviço         | Plano  | Custo     |
|-----------------|--------|-----------|
| Supabase        | Free   | R$ 0      |
| Vercel          | Hobby  | R$ 0      |
| Groq            | Free   | R$ 0      |
| HuggingFace     | Free   | R$ 0      |
| Domínio         | —      | R$ 0      |
| **Total**       |        | **R$ 0/mês** |

---

### Cenário B — Lançamento Comercial (até ~500 buscas/mês)
*Produto lançado, primeiros clientes, uso moderado*

| Serviço         | Plano        | Custo       |
|-----------------|--------------|-------------|
| Supabase        | Free ou Pro  | R$ 0–150    |
| Vercel          | Pro          | R$ 120      |
| Groq            | Free         | R$ 0        |
| HuggingFace     | Free         | R$ 0        |
| Domínio .com.br | Registro.br  | ~R$ 4/mês   |
| **Total**       |              | **~R$ 124–274/mês** |

---

### Cenário C — Escala Média (até ~3.000 buscas/mês)
*Produto consolidado, múltiplos usuários ativos*

| Serviço         | Plano           | Custo       |
|-----------------|-----------------|-------------|
| Supabase        | Pro             | R$ 150      |
| Vercel          | Pro             | R$ 120      |
| Groq            | Pay-as-you-go   | ~R$ 150     |
| HuggingFace     | Free ou PRO     | R$ 0–55     |
| Domínio         | .com.br         | R$ 4        |
| **Total**       |                 | **~R$ 424–479/mês** |

---

### Cenário D — Alta Escala (10.000+ buscas/mês)
*Volume alto, SLA necessário, múltiplas empresas clientes*

| Serviço         | Plano                  | Custo        |
|-----------------|------------------------|--------------|
| Supabase        | Pro ou Team            | R$ 150–450   |
| Vercel          | Pro                    | R$ 120       |
| Groq            | Pay-as-you-go          | ~R$ 500+     |
| HuggingFace     | Inference Endpoint     | ~R$ 200      |
| Domínio         | .com                   | R$ 7         |
| **Total**       |                        | **~R$ 977–1.277/mês** |

---

## 3. Passo a Passo para Lançamento

### Etapa 1 — Preparar o Supabase para Produção
*Tempo estimado: 30 minutos*

- [ ] Acessar o projeto em supabase.com
- [ ] Ativar a extensão `vector` no SQL Editor:
  ```sql
  CREATE EXTENSION IF NOT EXISTS vector;
  ALTER TABLE products ADD COLUMN IF NOT EXISTS embedding vector(384);
  ```
- [ ] Criar a função `match_products` (SQL do arquivo do projeto)
- [ ] Verificar as políticas RLS (Row Level Security) estão corretas
- [ ] Em Storage → criar bucket `product-images` com visibilidade Public
- [ ] Em Authentication → Providers → ativar **Google** com Client ID e Secret
- [ ] Em Authentication → URL Configuration → adicionar o domínio de produção

---

### Etapa 2 — Configurar Google OAuth
*Tempo estimado: 20 minutos*

- [ ] Acessar console.cloud.google.com
- [ ] Criar projeto (ou usar existente)
- [ ] APIs & Services → Credentials → Create OAuth 2.0 Client ID
- [ ] Tipo: Web application
- [ ] Authorized redirect URIs: `https://<seu-projeto>.supabase.co/auth/v1/callback`
- [ ] Copiar Client ID e Client Secret → colar no Supabase → Authentication → Google

---

### Etapa 3 — Criar conta e projeto na Vercel
*Tempo estimado: 15 minutos*

- [ ] Criar conta em vercel.com (pode usar conta GitHub)
- [ ] New Project → Import o repositório do GitHub (ou fazer push antes)
- [ ] Framework: Vite (detectado automaticamente)
- [ ] Configurar todas as variáveis de ambiente:

```
VITE_SUPABASE_URL        = https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY   = sb_publishable_xxx
GROQ_API_KEY             = gsk_xxx
HF_TOKEN                 = hf_xxx
```

- [ ] Deploy → aguardar build completar
- [ ] Testar a URL gerada pela Vercel (ex: visionsearch.vercel.app)

---

### Etapa 4 — Configurar Domínio
*Tempo estimado: 30 minutos + propagação DNS (até 24h)*

- [ ] Registrar domínio em registro.br (para .com.br) ou cloudflare.com (para .com)
- [ ] Na Vercel → Project Settings → Domains → Add Domain
- [ ] Adicionar os registros DNS indicados pela Vercel no painel do registrador
- [ ] Aguardar propagação (geralmente 15 min a 2 horas)
- [ ] Verificar se HTTPS está ativo (Vercel faz isso automático)

---

### Etapa 5 — Ajustar URLs de produção no Supabase
*Tempo estimado: 10 minutos*

- [ ] Supabase → Authentication → URL Configuration
- [ ] Site URL: `https://seudominio.com.br`
- [ ] Redirect URLs: adicionar `https://seudominio.com.br`
- [ ] No Google Cloud Console → atualizar Authorized redirect URIs com o novo domínio

---

### Etapa 6 — Popular o banco com produtos reais
*Tempo estimado: variável (depende do catálogo)*

- [ ] Acessar o app em produção com login admin
- [ ] Admin → cadastrar fornecedores reais
- [ ] Admin → cadastrar produtos com fotos reais (upload via Supabase Storage)
- [ ] Admin → Seed & Import → **Gerar embeddings** para todos os produtos
- [ ] Testar busca por imagem com fotos reais do catálogo

---

### Etapa 7 — Testes finais antes de liberar
*Tempo estimado: 1–2 horas*

- [ ] Testar login com Google em produção
- [ ] Testar upload de imagem e análise pela IA
- [ ] Verificar se a busca retorna resultados corretos
- [ ] Testar em dispositivo móvel (responsividade)
- [ ] Verificar se o admin consegue adicionar/remover produtos
- [ ] Confirmar que usuários não-admin não têm acesso ao painel

---

## 4. Resumo de Tempo Total

| Etapa                             | Tempo Estimado |
|-----------------------------------|----------------|
| Supabase produção                 | 30 min         |
| Google OAuth                      | 20 min         |
| Deploy Vercel                     | 15 min         |
| Domínio + DNS                     | 30 min + 2h propagação |
| URLs de produção                  | 10 min         |
| Popular banco com dados reais     | 2–8 horas      |
| Testes finais                     | 1–2 horas      |
| **Total (sem cadastro de produtos)** | **~2–3 horas** |

---

## 5. Recomendação de Lançamento

Para um primeiro lançamento com custo zero ou mínimo:

1. **Use o plano gratuito de tudo** — Supabase Free + Vercel Hobby + Groq Free + HuggingFace Free
2. **Registre um domínio .com.br** (R$ 50/ano) para dar credibilidade
3. **Migre para Vercel Pro** (~R$ 120/mês) assim que houver clientes pagando,
   pois o Hobby não é para uso comercial
4. **Monitore o consumo do Groq** — o free tier aguenta bem até ~200 buscas/mês.
   Com mais volume, passe para pay-as-you-go

**Custo para lançar hoje: R$ 50/ano de domínio + R$ 0/mês de infraestrutura**

---

*Documento gerado em abril de 2026. Preços em dólar convertidos a R$ 6,00.*
*Verificar preços atuais diretamente nos sites dos provedores antes de contratar.*
