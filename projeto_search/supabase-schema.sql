-- Execute este arquivo no SQL Editor do Supabase
-- https://supabase.com/dashboard → seu projeto → SQL Editor

-- Tabela de fornecedores
create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact text not null,
  address text,
  created_at timestamptz default now()
);

-- Tabela de produtos
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null,
  price numeric not null check (price >= 0),
  image_url text,
  supplier_id uuid references suppliers(id) on delete cascade,
  category text,
  tags text[] default '{}',
  created_at timestamptz default now()
);

-- Habilitar Row Level Security
alter table suppliers enable row level security;
alter table products enable row level security;

-- Qualquer usuário autenticado pode ler
create policy "authenticated can read suppliers"
  on suppliers for select to authenticated using (true);

create policy "authenticated can read products"
  on products for select to authenticated using (true);

-- Apenas admin pode escrever (troque pelo seu email se necessário)
create policy "admin can write suppliers"
  on suppliers for all to authenticated
  using (auth.jwt() ->> 'email' = 'mathkraieski@gmail.com')
  with check (auth.jwt() ->> 'email' = 'mathkraieski@gmail.com');

create policy "admin can write products"
  on products for all to authenticated
  using (auth.jwt() ->> 'email' = 'mathkraieski@gmail.com')
  with check (auth.jwt() ->> 'email' = 'mathkraieski@gmail.com');
