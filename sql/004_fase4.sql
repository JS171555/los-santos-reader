-- FASE 4: XP validado no servidor, níveis, ranking, conquistas, metas, notificações. Rode após a 003.
alter table public.books add column sec_per_page int not null default 30 check(sec_per_page between 5 and 600);
alter table public.reading_progress add column credited_pages int not null default 0, add column time_pool int not null default 0;
create table public.user_xp(user_id uuid primary key references public.profiles(id) on delete cascade,total_xp int not null default 0,level int not null default 1,pages_read int not null default 0,updated_at timestamptz not null default now());
create table public.xp_transactions(id bigserial primary key,user_id uuid not null references public.profiles(id) on delete cascade,book_id uuid references public.books(id) on delete set null,
 kind text not null check(kind in('pages','completion','daily','goal')),xp int not null check(xp>=0),pages int not null default 0,created_at timestamptz not null default now());
create index on public.xp_transactions(user_id,created_at desc);create index on public.xp_transactions(created_at);
create table public.achievements(code text primary key,name text not null,description text not null,icon text not null,metric text not null,threshold int not null,sort int not null default 0);
create table public.user_achievements(user_id uuid references public.profiles(id) on delete cascade,code text references public.achievements(code) on delete cascade,unlocked_at timestamptz not null default now(),primary key(user_id,code));
create table public.reading_goals(user_id uuid primary key default auth.uid() references public.profiles(id) on delete cascade,daily_pages int not null default 5 check(daily_pages between 1 and 500));
create table public.notifications(id bigserial primary key,user_id uuid not null references public.profiles(id) on delete cascade,type text not null,title text not null,body text,read boolean not null default false,created_at timestamptz not null default now());
create index on public.notifications(user_id,read);
alter table public.user_xp enable row level security;alter table public.xp_transactions enable row level security;alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;alter table public.reading_goals enable row level security;alter table public.notifications enable row level security;
create policy "xp proprio" on public.user_xp for select to authenticated using(user_id=auth.uid());
create policy "tx proprias" on public.xp_transactions for select to authenticated using(user_id=auth.uid());
create policy "conquistas leitura" on public.achievements for select to authenticated using(true);
create policy "uc proprias" on public.user_achievements for select to authenticated using(user_id=auth.uid());
create policy "meta propria" on public.reading_goals for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy "notif leitura" on public.notifications for select to authenticated using(user_id=auth.uid());
create policy "notif marcar lida" on public.notifications for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
insert into public.achievements(code,name,description,icon,metric,threshold,sort) values
('primeiro-livro-iniciado','Primeiro livro iniciado','Abra seu primeiro livro.','book-open','books_started',1,1),
('primeiro-livro-concluido','Primeiro livro concluído','Chegue ao fim de um livro.','flag-checkered','books_finished',1,2),
('paginas-100','100 páginas lidas','Leia 100 páginas validadas.','file-lines','pages',100,3),
('paginas-500','500 páginas lidas','Leia 500 páginas validadas.','layer-group','pages',500,4),
('paginas-1000','1.000 páginas lidas','Leia 1.000 páginas validadas.','mountain','pages',1000,5),
('sequencia-7','Leitor de 7 dias','Leia 7 dias seguidos.','fire','streak',7,6),
('sequencia-30','Leitor de 30 dias','Leia 30 dias seguidos.','fire-flame-curved','streak',30,7),
('explorador-categorias','Explorador de categorias','Leia livros de 5 categorias.','compass','categories',5,8),
('leitor-dedicado','Leitor dedicado','Acumule 10 horas de leitura ativa.','hourglass-half','hours',10,9);
create function public.level_for(x int) returns int language sql immutable as $$ select floor(sqrt(x/100.0))::int+1 $$;
create function public.streak_for(u uuid) returns int language sql stable security definer set search_path=public as $$
 with d as(select distinct (created_at at time zone 'America/Sao_Paulo')::date as reading_day from xp_transactions where user_id=u and pages>0),
 g as(select reading_day,reading_day-(row_number() over(order by reading_day))::int as grp from d),
 l as(select grp,reading_day from g order by reading_day desc limit 1)
 select case when (select reading_day from l)>=(now() at time zone 'America/Sao_Paulo')::date-1 then (select count(*)::int from g where grp=(select grp from l)) else 0 end $$;
create function public.check_achievements(u uuid) returns void language plpgsql security definer set search_path=public as $$
declare bs int;bf int;hr int;pg int;st int;cat int;a record;v int;
begin
 select count(*),count(*) filter(where status='finished'),(coalesce(sum(seconds_read),0)/3600)::int into bs,bf,hr from reading_progress where user_id=u;
 select coalesce(pages_read,0) into pg from user_xp where user_id=u;pg:=coalesce(pg,0);st:=streak_for(u);
 select count(distinct bc.category_id) into cat from reading_progress r join book_categories bc on bc.book_id=r.book_id where r.user_id=u;
 for a in select * from achievements where code not in(select code from user_achievements where user_id=u) loop
  v:=case a.metric when 'books_started' then bs when 'books_finished' then bf when 'pages' then pg when 'streak' then st when 'categories' then cat when 'hours' then hr else 0 end;
  if v>=a.threshold then insert into user_achievements(user_id,code) values(u,a.code);insert into notifications(user_id,type,title,body) values(u,'achievement','Conquista desbloqueada!',a.name);end if;
 end loop;
end $$;
-- Algoritmo de validação: página só conta se (a) já foi concluída (passou dela), (b) nunca foi creditada antes e
-- (c) há tempo ativo acumulado suficiente (metade do tempo estimado por página). Máx. 10 páginas por salvamento e 600 XP/dia.
create function public.progress_xp() returns trigger language plpgsql security definer set search_path=public as $$
declare tz constant text:='America/Sao_Paulo';cap constant int:=600;spp int;pool int;ds int;c0 int;fwd int;cr int:=0;px int;gain int:=0;mid timestamptz;tx int;dp int;goal int;lo int;ln int;
begin
 select greatest(5,round(sec_per_page*0.5)::int) into spp from books where id=new.book_id;spp:=coalesce(spp,15);
 if tg_op='UPDATE' then c0:=old.credited_pages;pool:=old.time_pool;ds:=new.seconds_read-old.seconds_read;else c0:=0;pool:=0;ds:=new.seconds_read;end if;
 pool:=pool+greatest(ds,0);
 fwd:=greatest(0,least(new.total_pages,new.last_page-1+(case when new.status='finished' and new.last_page>=new.total_pages then 1 else 0 end))-c0);
 cr:=least(fwd,pool/spp,10);new.credited_pages:=c0+cr;new.time_pool:=least(pool-cr*spp,900);
 mid:=date_trunc('day',now() at time zone tz) at time zone tz;
 select coalesce(sum(xp),0) into tx from xp_transactions where user_id=new.user_id and created_at>=mid;
 if cr>0 then
  px:=least(cr*10,greatest(0,cap-tx));insert into xp_transactions(user_id,book_id,kind,xp,pages) values(new.user_id,new.book_id,'pages',px,cr);gain:=px;
  if not exists(select 1 from xp_transactions where user_id=new.user_id and kind='daily' and created_at>=mid) then insert into xp_transactions(user_id,kind,xp) values(new.user_id,'daily',20);gain:=gain+20;end if;
  select daily_pages into goal from reading_goals where user_id=new.user_id;
  select coalesce(sum(pages),0) into dp from xp_transactions where user_id=new.user_id and created_at>=mid;
  if goal is not null and dp>=goal and not exists(select 1 from xp_transactions where user_id=new.user_id and kind='goal' and created_at>=mid) then insert into xp_transactions(user_id,kind,xp) values(new.user_id,'goal',25);gain:=gain+25;end if;
 end if;
 if new.status='finished' and new.credited_pages>=new.total_pages*0.8 and not exists(select 1 from xp_transactions where user_id=new.user_id and book_id=new.book_id and kind='completion') then
  insert into xp_transactions(user_id,book_id,kind,xp) values(new.user_id,new.book_id,'completion',100);gain:=gain+100;end if;
 if cr>0 or gain>0 then
  select level into lo from user_xp where user_id=new.user_id;
  insert into user_xp(user_id,total_xp,level,pages_read) values(new.user_id,gain,level_for(gain),cr)
   on conflict(user_id) do update set total_xp=user_xp.total_xp+gain,pages_read=user_xp.pages_read+cr,level=level_for(user_xp.total_xp+gain),updated_at=now() returning level into ln;
  if ln>coalesce(lo,1) then insert into notifications(user_id,type,title,body) values(new.user_id,'level','Subiu de nível!','Você chegou ao nível '||ln||'.');end if;
 end if;
 return new;
end $$;
create trigger progress_xp_t before insert or update on public.reading_progress for each row execute function public.progress_xp();
create function public.after_progress() returns trigger language plpgsql security definer set search_path=public as $$ begin perform check_achievements(new.user_id);return null;end $$;
create trigger progress_ach_t after insert or update on public.reading_progress for each row execute function public.after_progress();
revoke all on function public.check_achievements(uuid),public.streak_for(uuid) from public,anon,authenticated;
create function public.my_stats() returns json language sql stable security definer set search_path=public as $$
 select json_build_object('streak',streak_for(auth.uid()),'today_pages',(select coalesce(sum(pages),0) from xp_transactions where user_id=auth.uid() and created_at>=date_trunc('day',now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo')) $$;
create function public.get_ranking(p_period text) returns table(r_pos bigint,r_uid uuid,r_name text,r_avatar text,r_xp bigint,r_level int,r_me boolean) language sql stable security definer set search_path=public as $$
 with s as(select x.user_id uid,sum(x.xp)::bigint xp from xp_transactions x where p_period='all' or x.created_at>=(case p_period when 'week' then date_trunc('week',now() at time zone 'America/Sao_Paulo') else date_trunc('month',now() at time zone 'America/Sao_Paulo') end at time zone 'America/Sao_Paulo') group by x.user_id having sum(x.xp)>0),
 r as(select s.uid,s.xp,rank() over(order by s.xp desc) pos from s join profiles p on p.id=s.uid where p.show_in_ranking and p.status='active')
 select r.pos,r.uid,p.display_name,p.avatar_url,r.xp,(select u.level from user_xp u where u.user_id=r.uid),r.uid=auth.uid() from r join profiles p on p.id=r.uid where r.pos<=50 or r.uid=auth.uid() order by r.pos $$;
create function public.admin_top() returns json language sql stable security definer set search_path=public as $$
 select case when is_admin() then json_build_object(
 'users',(select coalesce(json_agg(t),'[]'::json) from(select p.display_name as name,u.total_xp as xp from user_xp u join profiles p on p.id=u.user_id order by u.total_xp desc limit 5) t),
 'books',(select coalesce(json_agg(t),'[]'::json) from(select b.title,count(*) as reads from reading_progress r join books b on b.id=r.book_id group by b.id,b.title order by reads desc limit 5) t)) end $$;
