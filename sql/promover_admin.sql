-- Troque SEU@EMAIL pelo e-mail da conta já cadastrada em login.html
update public.profiles set role='admin' where id=(select id from auth.users where email='SEU@EMAIL');
select id, display_name, role from public.profiles where role='admin'; -- deve listar você
