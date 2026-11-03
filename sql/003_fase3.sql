-- FASE 3: progresso, sessões e marcadores. Rode após a 002.
create table public.reading_progress(user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,book_id uuid references public.books(id) on delete cascade,
 last_page int not null default 1 check(last_page>=1),total_pages int not null check(total_pages>=1),status text not null default 'reading' check(status in('reading','finished')),
 seconds_read int not null default 0,started_at timestamptz not null default now(),finished_at timestamptz,updated_at timestamptz not null default now(),primary key(user_id,book_id));
create table public.reading_sessions(id uuid primary key,user_id uuid not null references public.profiles(id) on delete cascade,book_id uuid not null references public.books(id) on delete cascade,
 started_at timestamptz not null default now(),ended_at timestamptz not null default now(),active_seconds int not null default 0,last_page int not null);
create index on public.reading_sessions(user_id,started_at desc);
create table public.bookmarks(id uuid primary key default gen_random_uuid(),user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
 book_id uuid not null references public.books(id) on delete cascade,page int not null check(page>=1),created_at timestamptz not null default now(),unique(user_id,book_id,page));
alter table public.reading_progress enable row level security;alter table public.reading_sessions enable row level security;alter table public.bookmarks enable row level security;
create policy "progresso proprio" on public.reading_progress for select to authenticated using(user_id=auth.uid());
create policy "sessoes proprias" on public.reading_sessions for select to authenticated using(user_id=auth.uid());
create policy "marcadores proprios" on public.bookmarks for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
-- Progresso e sessões só são gravados por esta função (valida e limita no servidor; base para o XP da Fase 4)
create function public.save_progress(p_book uuid,p_session uuid,p_page int,p_total int,p_seconds int) returns json language plpgsql security definer set search_path=public as $$
declare u uuid:=auth.uid(); sec int:=greatest(0,least(coalesce(p_seconds,0),120)); tot int:=greatest(1,least(coalesce(p_total,1),20000)); pg int; st text;
begin
 if u is null then raise exception 'não autenticado'; end if;
 if not exists(select 1 from books where id=p_book and (is_published or is_admin())) then raise exception 'livro indisponível'; end if;
 pg:=greatest(1,least(coalesce(p_page,1),tot));
 insert into reading_sessions(id,user_id,book_id,active_seconds,last_page) values(p_session,u,p_book,sec,pg)
  on conflict(id) do update set active_seconds=reading_sessions.active_seconds+sec,last_page=pg,ended_at=now() where reading_sessions.user_id=u;
 insert into reading_progress(user_id,book_id,last_page,total_pages,seconds_read,status,finished_at)
  values(u,p_book,pg,tot,sec,case when pg>=tot then 'finished' else 'reading' end,case when pg>=tot then now() end)
 on conflict(user_id,book_id) do update set last_page=pg,total_pages=tot,seconds_read=reading_progress.seconds_read+sec,updated_at=now(),
  status=case when reading_progress.status='finished' or pg>=tot then 'finished' else 'reading' end,
  finished_at=coalesce(reading_progress.finished_at,case when pg>=tot then now() end);
 select status into st from reading_progress where user_id=u and book_id=p_book;
 return json_build_object('status',st);
end $$;
revoke all on function public.save_progress(uuid,uuid,int,int,int) from public,anon;grant execute on function public.save_progress(uuid,uuid,int,int,int) to authenticated;
-- Estatísticas do admin agora incluem leituras
create or replace function public.admin_stats() returns json language sql stable security definer set search_path=public as $$
 select case when public.is_admin() then json_build_object('users',(select count(*) from profiles),'books',(select count(*) from books),'published',(select count(*) from books where is_published),
 'categories',(select count(*) from categories),'favorites',(select count(*) from favorites),'reads_started',(select count(*) from reading_progress),
 'reads_finished',(select count(*) from reading_progress where status='finished'),'pages_read',(select coalesce(sum(last_page),0) from reading_progress)) end $$;
