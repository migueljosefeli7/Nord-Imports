-- Troque o e-mail abaixo pelo e-mail usado no cadastro da Nord Imports.
insert into public.user_roles (user_id, role)
select id, 'admin' from auth.users where email = 'SEU_EMAIL_AQUI'
on conflict (user_id, role) do nothing;
