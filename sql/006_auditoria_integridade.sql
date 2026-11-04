-- FASE 6: endurecimento de integridade, privacidade e grants.
-- Execute somente depois de 001..005. Antes, preencha books.pages para todo livro
-- publicado; consulte o SELECT abaixo. Não inferimos essa contagem de progresso legado,
-- pois esse valor era informado pelo cliente e não é uma fonte confiável.
select id, title from public.books where is_published and pages is null;

-- Um livro publicado precisa ter a contagem canônica de páginas definida no catálogo.
-- NOT VALID permite aplicar a regra sem falhar por registros legados; novos valores e
-- atualizações passam a obedecer à restrição. Corrija os registros listados acima.
alter table public.books add constraint published_book_requires_page_count
 check (not is_published or pages is not null) not valid;

-- Limita RPCs SECURITY DEFINER à função autenticada mesmo em instalações que tenham
-- aplicado parcialmente etapas anteriores. A fase 005 concede novamente a authenticated.
revoke all on function public.my_stats() from public, anon;
revoke all on function public.get_ranking(text) from public, anon;
revoke all on function public.admin_stats() from public, anon;
revoke all on function public.admin_top() from public, anon;
revoke all on function public.my_activity() from public, anon;
grant execute on function public.my_stats() to authenticated;
grant execute on function public.get_ranking(text) to authenticated;
grant execute on function public.admin_stats() to authenticated;
grant execute on function public.admin_top() to authenticated;
grant execute on function public.my_activity() to authenticated;

-- `p_total` permanece na assinatura para compatibilidade, mas é ignorado. A fonte
-- canônica é books.pages, definida pelo administrador no catálogo, não pelo navegador.
create or replace function public.save_progress(p_book uuid,p_session uuid,p_page int,p_total int,p_seconds int)
returns json language plpgsql security definer set search_path=public as $$
declare
 u uuid:=auth.uid(); sec int:=greatest(0,least(coalesce(p_seconds,0),120));
 tot int; pg int; st text;
begin
 if u is null then raise exception 'não autenticado'; end if;
 select b.pages into tot from public.books b
  where b.id=p_book and (b.is_published or public.is_admin());
 if not found then raise exception 'livro indisponível'; end if;
 if tot is null then raise exception 'contagem de páginas ausente no catálogo'; end if;
 if tot>20000 then raise exception 'contagem de páginas excede o limite suportado'; end if;
 pg:=greatest(1,least(coalesce(p_page,1),tot));
 -- Serializa salvamentos do mesmo usuário para que chamadas concorrentes em livros
 -- diferentes não ultrapassem o orçamento diário de XP.
 perform pg_advisory_xact_lock(hashtextextended(u::text,0));
 insert into public.reading_sessions(id,user_id,book_id,active_seconds,last_page)
  values(p_session,u,p_book,sec,pg)
  on conflict(id) do update set active_seconds=public.reading_sessions.active_seconds+sec,last_page=pg,ended_at=now()
  where public.reading_sessions.user_id=u and public.reading_sessions.book_id=p_book;
 insert into public.reading_progress(user_id,book_id,last_page,total_pages,seconds_read,status,finished_at)
  values(u,p_book,pg,tot,sec,case when pg>=tot then 'finished' else 'reading' end,case when pg>=tot then now() end)
 on conflict(user_id,book_id) do update set last_page=pg,total_pages=tot,seconds_read=public.reading_progress.seconds_read+sec,updated_at=now(),
  status=case when public.reading_progress.status='finished' or pg>=tot then 'finished' else 'reading' end,
  finished_at=coalesce(public.reading_progress.finished_at,case when pg>=tot then now() end);
 select status into st from public.reading_progress where user_id=u and book_id=p_book;
 return json_build_object('status',st);
end $$;
revoke all on function public.save_progress(uuid,uuid,int,int,int) from public,anon;
grant execute on function public.save_progress(uuid,uuid,int,int,int) to authenticated;

-- Atualiza as relações de categoria numa única transação; uma inserção inválida não
-- apaga a seleção anterior. SECURITY DEFINER exige a checagem explícita de admin.
create or replace function public.set_book_categories(p_book uuid,p_categories uuid[])
returns void language plpgsql security definer set search_path=public as $$
begin
 if not public.is_admin() then raise exception 'acesso restrito a administradores'; end if;
 if not exists(select 1 from public.books where id=p_book) then raise exception 'livro não encontrado'; end if;
 delete from public.book_categories where book_id=p_book;
 insert into public.book_categories(book_id,category_id)
  select p_book,x from (select distinct unnest(coalesce(p_categories,'{}'::uuid[])) as x) c;
end $$;
revoke all on function public.set_book_categories(uuid,uuid[]) from public,anon;
grant execute on function public.set_book_categories(uuid,uuid[]) to authenticated;

-- Aplica o limite de 600 XP/dia a páginas e a todos os bônus, inclusive conclusão.
create or replace function public.progress_xp() returns trigger language plpgsql security definer set search_path=public as $$
declare
 tz constant text:='America/Sao_Paulo'; cap constant int:=600;
 spp int; pool int; ds int; c0 int; fwd int; cr int:=0; px int; gain int:=0;
 mid timestamptz; tx int; dp int; goal int; lo int; ln int; budget int; award int;
begin
 select greatest(5,round(sec_per_page*0.5)::int) into spp from public.books where id=new.book_id;
 spp:=coalesce(spp,15);
 if tg_op='UPDATE' then c0:=old.credited_pages;pool:=old.time_pool;ds:=new.seconds_read-old.seconds_read;
 else c0:=0;pool:=0;ds:=new.seconds_read;end if;
 pool:=pool+greatest(ds,0);
 fwd:=greatest(0,least(new.total_pages,new.last_page-1+(case when new.status='finished' and new.last_page>=new.total_pages then 1 else 0 end))-c0);
 cr:=least(fwd,pool/spp,10);new.credited_pages:=c0+cr;new.time_pool:=least(pool-cr*spp,900);
 mid:=date_trunc('day',now() at time zone tz) at time zone tz;
 select coalesce(sum(xp),0) into tx from public.xp_transactions where user_id=new.user_id and created_at>=mid;
 budget:=greatest(0,cap-tx);
 if cr>0 then
  px:=least(cr*10,budget);
  insert into public.xp_transactions(user_id,book_id,kind,xp,pages) values(new.user_id,new.book_id,'pages',px,cr);
  gain:=gain+px;budget:=budget-px;
  if not exists(select 1 from public.xp_transactions where user_id=new.user_id and kind='daily' and created_at>=mid) then
   award:=least(20,budget);
   if award>0 then insert into public.xp_transactions(user_id,kind,xp) values(new.user_id,'daily',award);gain:=gain+award;budget:=budget-award;end if;
  end if;
  select daily_pages into goal from public.reading_goals where user_id=new.user_id;
  select coalesce(sum(pages),0) into dp from public.xp_transactions where user_id=new.user_id and created_at>=mid;
  if goal is not null and dp>=goal and not exists(select 1 from public.xp_transactions where user_id=new.user_id and kind='goal' and created_at>=mid) then
   award:=least(25,budget);
   if award>0 then insert into public.xp_transactions(user_id,kind,xp) values(new.user_id,'goal',award);gain:=gain+award;budget:=budget-award;end if;
  end if;
 end if;
 if new.status='finished' and new.credited_pages>=new.total_pages*0.8 and not exists(
  select 1 from public.xp_transactions where user_id=new.user_id and book_id=new.book_id and kind='completion') then
  award:=least(100,greatest(0,cap-tx-gain));
  insert into public.xp_transactions(user_id,book_id,kind,xp) values(new.user_id,new.book_id,'completion',award);
  gain:=gain+award;
 end if;
 if cr>0 or gain>0 then
  select level into lo from public.user_xp where user_id=new.user_id;
  insert into public.user_xp(user_id,total_xp,level,pages_read) values(new.user_id,gain,public.level_for(gain),cr)
   on conflict(user_id) do update set total_xp=public.user_xp.total_xp+gain,
   pages_read=public.user_xp.pages_read+cr,level=public.level_for(public.user_xp.total_xp+gain),updated_at=now()
   returning level into ln;
  if ln>coalesce(lo,1) then
   insert into public.notifications(user_id,type,title,body)
   values(new.user_id,'level','Subiu de nível!','Você chegou ao nível '||ln||'.');
  end if;
 end if;
 return new;
end $$;

-- Para terceiros com perfil privado, não devolve identificador estável. Ranking próprio
-- continua identificável para que a interface mantenha o rótulo "você".
create or replace function public.get_ranking(p_period text)
returns table(r_pos bigint,r_uid uuid,r_name text,r_avatar text,r_xp bigint,r_level int,r_me boolean)
language sql stable security definer set search_path=public as $$
 with s as (
  select x.user_id uid,sum(x.xp)::bigint xp from public.xp_transactions x
  where p_period='all' or x.created_at>=(case p_period when 'week'
   then date_trunc('week',now() at time zone 'America/Sao_Paulo')
   else date_trunc('month',now() at time zone 'America/Sao_Paulo') end at time zone 'America/Sao_Paulo')
  group by x.user_id having sum(x.xp)>0
 ), r as (
  select s.uid,s.xp,rank() over(order by s.xp desc) pos from s
  join public.profiles p on p.id=s.uid where p.show_in_ranking and p.status='active'
 )
 select r.pos,case when p.profile_public or r.uid=auth.uid() then r.uid end,
  case when p.profile_public or r.uid=auth.uid() then p.display_name else 'Leitor anônimo' end,
  case when p.profile_public or r.uid=auth.uid() then p.avatar_url end,
  r.xp,(select u.level from public.user_xp u where u.user_id=r.uid),r.uid=auth.uid()
 from r join public.profiles p on p.id=r.uid where r.pos<=50 or r.uid=auth.uid() order by r.pos
$$;
revoke all on function public.get_ranking(text) from public,anon;
grant execute on function public.get_ranking(text) to authenticated;
