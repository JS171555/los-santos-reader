-- FASE 1: perfis, papéis e RLS. Execute no SQL Editor do Supabase.
create type public.user_role as enum ('user','admin');
create type public.account_status as enum ('active','suspended');
create table public.profiles(
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null check (char_length(display_name) between 2 and 40),
 avatar_url text,
 role public.user_role not null default 'user',
 status public.account_status not null default 'active',
 profile_public boolean not null default true,
 show_in_ranking boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now());
create function public.is_admin() returns boolean language sql stable security definer set search_path=public as
$$ select exists(select 1 from public.profiles where id=auth.uid() and role='admin' and status='active') $$;
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into public.profiles(id,display_name) values(new.id,
  left(coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'),''),split_part(new.email,'@',1)),40));
 return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
-- usuário comum não consegue alterar role/status (nem via API direta)
create function public.protect_profile() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is not null and not public.is_admin() then new.role:=old.role; new.status:=old.status; end if;
 new.updated_at:=now(); return new;
end $$;
create trigger profiles_protect before update on public.profiles for each row execute function public.protect_profile();
alter table public.profiles enable row level security;
create policy "ver proprio perfil ou admin" on public.profiles for select using (id=auth.uid() or public.is_admin());
create policy "editar proprio perfil ou admin" on public.profiles for update using (id=auth.uid() or public.is_admin()) with check (id=auth.uid() or public.is_admin());
-- Primeiro admin (rode manualmente, trocando o e-mail):
-- update public.profiles set role='admin' where id=(select id from auth.users where email='SEU@EMAIL');
