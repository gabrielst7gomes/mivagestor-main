
-- PROFILES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- RECEITAS
create table public.receitas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  descricao text not null,
  valor numeric(10,2) not null,
  tipo text not null check (tipo in ('salario', 'extra')),
  data_recebimento date not null,
  created_at timestamptz not null default now()
);

alter table public.receitas enable row level security;

create policy "Users can view own receitas"
  on public.receitas for select using (auth.uid() = user_id);
create policy "Users can insert own receitas"
  on public.receitas for insert with check (auth.uid() = user_id);
create policy "Users can update own receitas"
  on public.receitas for update using (auth.uid() = user_id);
create policy "Users can delete own receitas"
  on public.receitas for delete using (auth.uid() = user_id);

-- CONTAS
create table public.contas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  descricao text not null,
  categoria text not null,
  valor numeric(10,2) not null,
  data_vencimento date not null,
  pago boolean not null default false,
  data_pagamento date,
  recorrente boolean not null default false,
  origem_recorrente_id uuid,
  created_at timestamptz not null default now()
);

alter table public.contas enable row level security;

create policy "Users can view own contas"
  on public.contas for select using (auth.uid() = user_id);
create policy "Users can insert own contas"
  on public.contas for insert with check (auth.uid() = user_id);
create policy "Users can update own contas"
  on public.contas for update using (auth.uid() = user_id);
create policy "Users can delete own contas"
  on public.contas for delete using (auth.uid() = user_id);

create index idx_contas_user_venc on public.contas(user_id, data_vencimento);
create index idx_receitas_user_data on public.receitas(user_id, data_recebimento);

-- TRIGGER: criar profile automaticamente
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nome)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- FUNÇÃO: replicar contas recorrentes no mês alvo
create or replace function public.replicar_recorrentes(_user_id uuid, _ano int, _mes int)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  alvo_inicio date := make_date(_ano, _mes, 1);
  alvo_fim date := (alvo_inicio + interval '1 month')::date;
  origem record;
  nova_data date;
begin
  if auth.uid() <> _user_id then
    raise exception 'unauthorized';
  end if;

  for origem in
    select distinct on (coalesce(c.origem_recorrente_id, c.id))
      c.id, c.user_id, c.descricao, c.categoria, c.valor, c.data_vencimento,
      coalesce(c.origem_recorrente_id, c.id) as raiz
    from public.contas c
    where c.user_id = _user_id
      and c.recorrente = true
      and c.data_vencimento < alvo_inicio
    order by coalesce(c.origem_recorrente_id, c.id), c.data_vencimento desc
  loop
    nova_data := make_date(_ano, _mes, least(extract(day from origem.data_vencimento)::int,
      extract(day from (alvo_fim - interval '1 day'))::int));

    if not exists (
      select 1 from public.contas
      where user_id = _user_id
        and coalesce(origem_recorrente_id, id) = origem.raiz
        and data_vencimento >= alvo_inicio
        and data_vencimento < alvo_fim
    ) then
      insert into public.contas (user_id, descricao, categoria, valor, data_vencimento, recorrente, origem_recorrente_id)
      values (_user_id, origem.descricao, origem.categoria, origem.valor, nova_data, true, origem.raiz);
    end if;
  end loop;
end;
$$;
