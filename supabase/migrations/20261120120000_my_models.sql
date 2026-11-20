-- My Model analysis cards and private chart storage.
-- The application uses server-side session cookies for its API. Its API checks
-- user ownership on every request; these policies also scope direct Supabase
-- access when a JWT subject matches model_results.user_id.

create table if not exists public.model_results (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  category text not null default 'Chart analysis',
  instrument text not null default '',
  timeframes text[] not null default '{}',
  title text not null,
  subtitle text not null default '',
  model_date date not null default current_date,
  type text not null default 'backtest',
  notes text not null default '',
  image_paths text[] not null default '{}',
  outcome text,
  result_r numeric,
  entry numeric,
  stop_loss numeric,
  take_profit numeric,
  created_at timestamptz not null default now(),
  constraint model_results_type_check check (type in ('backtest', 'forward')),
  constraint model_results_category_check check (category in ('Chart analysis', 'Backtest', 'Forward test', 'Trade idea', 'Case study')),
  constraint model_results_outcome_check check (outcome is null or outcome in ('win', 'loss', 'breakeven'))
);

alter table public.model_results add column if not exists user_id text;
alter table public.model_results add column if not exists category text not null default 'Chart analysis';
alter table public.model_results add column if not exists instrument text not null default '';
alter table public.model_results add column if not exists timeframes text[] not null default '{}';
alter table public.model_results add column if not exists title text not null default '';
alter table public.model_results add column if not exists subtitle text not null default '';
alter table public.model_results add column if not exists model_date date not null default current_date;
alter table public.model_results add column if not exists type text not null default 'backtest';
alter table public.model_results add column if not exists notes text not null default '';
alter table public.model_results add column if not exists image_paths text[] not null default '{}';
alter table public.model_results add column if not exists outcome text;
alter table public.model_results add column if not exists result_r numeric;
alter table public.model_results add column if not exists entry numeric;
alter table public.model_results add column if not exists stop_loss numeric;
alter table public.model_results add column if not exists take_profit numeric;
alter table public.model_results add column if not exists created_at timestamptz not null default now();

create index if not exists model_results_user_date_idx
  on public.model_results (user_id, model_date desc);

alter table public.model_results enable row level security;

drop policy if exists "Users can read their own model results" on public.model_results;
create policy "Users can read their own model results"
  on public.model_results for select to authenticated
  using (user_id = (auth.jwt() ->> 'sub'));

drop policy if exists "Users can insert their own model results" on public.model_results;
create policy "Users can insert their own model results"
  on public.model_results for insert to authenticated
  with check (user_id = (auth.jwt() ->> 'sub'));

drop policy if exists "Users can update their own model results" on public.model_results;
create policy "Users can update their own model results"
  on public.model_results for update to authenticated
  using (user_id = (auth.jwt() ->> 'sub'))
  with check (user_id = (auth.jwt() ->> 'sub'));

drop policy if exists "Users can delete their own model results" on public.model_results;
create policy "Users can delete their own model results"
  on public.model_results for delete to authenticated
  using (user_id = (auth.jwt() ->> 'sub'));

grant select, insert, update, delete on public.model_results to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'model-charts',
  'model-charts',
  false,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp']::text[]
)
on conflict (id) do update set
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp']::text[];

drop policy if exists "Users can read their own model charts" on storage.objects;
create policy "Users can read their own model charts"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'model-charts'
    and (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
    and exists (
      select 1 from public.model_results mr
      where mr.id::text = (storage.foldername(name))[2]
        and mr.user_id = (auth.jwt() ->> 'sub')
    )
  );

drop policy if exists "Users can upload their own model charts" on storage.objects;
create policy "Users can upload their own model charts"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'model-charts'
    and (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
    and exists (
      select 1 from public.model_results mr
      where mr.id::text = (storage.foldername(name))[2]
        and mr.user_id = (auth.jwt() ->> 'sub')
    )
  );

drop policy if exists "Users can delete their own model charts" on storage.objects;
create policy "Users can delete their own model charts"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'model-charts'
    and (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
    and exists (
      select 1 from public.model_results mr
      where mr.id::text = (storage.foldername(name))[2]
        and mr.user_id = (auth.jwt() ->> 'sub')
    )
  );
