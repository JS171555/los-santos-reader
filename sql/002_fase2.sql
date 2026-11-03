-- FASE 2: livros, categorias, favoritos, Storage e estatísticas. Rode após a 001.
create function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at:=now(); return new; end $$;
create table public.categories(id uuid primary key default gen_random_uuid(),name text not null unique check(char_length(name) between 2 and 40),description text,created_at timestamptz not null default now());
create table public.books(id uuid primary key default gen_random_uuid(),title text not null check(char_length(title) between 1 and 200),author text not null check(char_length(author) between 1 and 120),
 description text,cover_path text,pdf_path text,tags text[] not null default '{}',published_at date,pages int check(pages>0),is_published boolean not null default false,is_featured boolean not null default false,
 created_by uuid default auth.uid() references public.profiles(id) on delete set null,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 constraint publicado_exige_pdf check(not is_published or pdf_path is not null));
create index books_pub_idx on public.books(is_published,created_at desc);
create trigger books_updated before update on public.books for each row execute function public.set_updated_at();
create table public.book_categories(book_id uuid references public.books(id) on delete cascade,category_id uuid references public.categories(id) on delete cascade,primary key(book_id,category_id));
create index on public.book_categories(category_id);
create table public.favorites(user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,book_id uuid references public.books(id) on delete cascade,created_at timestamptz not null default now(),primary key(user_id,book_id));
alter table public.categories enable row level security;alter table public.books enable row level security;alter table public.book_categories enable row level security;alter table public.favorites enable row level security;
create policy "cat leitura" on public.categories for select to authenticated using(true);
create policy "cat admin" on public.categories for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "livros leitura" on public.books for select to authenticated using(is_published or public.is_admin());
create policy "livros admin" on public.books for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "bc leitura" on public.book_categories for select to authenticated using(exists(select 1 from public.books b where b.id=book_id and (b.is_published or public.is_admin())));
create policy "bc admin" on public.book_categories for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "fav proprios" on public.favorites for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create function public.admin_stats() returns json language sql stable security definer set search_path=public as $$
 select case when public.is_admin() then json_build_object('users',(select count(*) from profiles),'books',(select count(*) from books),'published',(select count(*) from books where is_published),'categories',(select count(*) from categories),'favorites',(select count(*) from favorites)) end $$;
-- Storage: capas públicas; PDFs privados (só admin escreve; leitores só PDFs de livros publicados)
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('covers','covers',true,5242880,array['image/jpeg','image/png','image/webp']),
 ('pdfs','pdfs',false,52428800,array['application/pdf']) on conflict (id) do nothing;
create policy "capas leitura" on storage.objects for select using(bucket_id='covers');
create policy "capas admin" on storage.objects for all to authenticated using(bucket_id='covers' and public.is_admin()) with check(bucket_id='covers' and public.is_admin());
create policy "pdf admin" on storage.objects for all to authenticated using(bucket_id='pdfs' and public.is_admin()) with check(bucket_id='pdfs' and public.is_admin());
create policy "pdf leitores" on storage.objects for select to authenticated using(bucket_id='pdfs' and exists(select 1 from public.books b where b.pdf_path=name and b.is_published));
