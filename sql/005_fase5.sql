-- FASE 5: perfil, preferências, avatares, atividade e endurecimento de segurança. Rode após a 004.
alter table public.profiles
 add column reader_theme text not null default 'dark' check(reader_theme in('dark','light')),
 add column reader_fit text not null default 'width' check(reader_fit in('width','height')),
 add column notify_achievements boolean not null default true,
 add column notify_xp boolean not null default true,
 add constraint avatar_path check(avatar_url is null or avatar_url ~ '^[0-9a-f-]{36}/avatar-');
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('avatars','avatars',true,2097152,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy "avatares leitura" on storage.objects for select using(bucket_id='avatars');
create policy "avatares proprios" on storage.objects for all to authenticated
 using(bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text) with check(bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);
create function public.my_activity() returns table(day date,pages int,minutes int) language sql stable security definer set search_path=public as $$
 select d::date,
  coalesce((select sum(x.pages) from xp_transactions x where x.user_id=auth.uid() and (x.created_at at time zone 'America/Sao_Paulo')::date=d::date),0)::int,
  coalesce((select sum(s.active_seconds)/60 from reading_sessions s where s.user_id=auth.uid() and (s.started_at at time zone 'America/Sao_Paulo')::date=d::date),0)::int
 from generate_series((now() at time zone 'America/Sao_Paulo')::date-13,(now() at time zone 'America/Sao_Paulo')::date,interval '1 day') d $$;
-- Ranking agora respeita "perfil público": quem não é público aparece como anônimo (e sem foto) para os outros
create or replace function public.get_ranking(p_period text) returns table(r_pos bigint,r_uid uuid,r_name text,r_avatar text,r_xp bigint,r_level int,r_me boolean) language sql stable security definer set search_path=public as $$
 with s as(select x.user_id uid,sum(x.xp)::bigint xp from xp_transactions x where p_period='all' or x.created_at>=(case p_period when 'week' then date_trunc('week',now() at time zone 'America/Sao_Paulo') else date_trunc('month',now() at time zone 'America/Sao_Paulo') end at time zone 'America/Sao_Paulo') group by x.user_id having sum(x.xp)>0),
 r as(select s.uid,s.xp,rank() over(order by s.xp desc) pos from s join profiles p on p.id=s.uid where p.show_in_ranking and p.status='active')
 select r.pos,r.uid,case when p.profile_public or r.uid=auth.uid() then p.display_name else 'Leitor anônimo' end,case when p.profile_public or r.uid=auth.uid() then p.avatar_url end,
  r.xp,(select u.level from user_xp u where u.user_id=r.uid),r.uid=auth.uid() from r join profiles p on p.id=r.uid where r.pos<=50 or r.uid=auth.uid() order by r.pos $$;
-- Segurança: funções expostas só para usuários autenticados (anon não executa)
revoke execute on function public.admin_stats(),public.admin_top(),public.my_stats(),public.get_ranking(text),public.my_activity() from public,anon;
grant execute on function public.admin_stats(),public.admin_top(),public.my_stats(),public.get_ranking(text),public.my_activity() to authenticated;
