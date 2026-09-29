-- Update the kalboss account: email -> Dcc@gmail.com, password -> dcc@1234.
-- Targets the auth.users row currently at kalboss@gmail.com. The other boss
-- account (boss@gmail.com) is intentionally left alone.

create extension if not exists pgcrypto with schema extensions;

update auth.users
set email = 'Dcc@gmail.com',
    email_confirmed_at = coalesce(email_confirmed_at, now()),
    encrypted_password = extensions.crypt('dcc@1234', extensions.gen_salt('bf')),
    updated_at = now()
where lower(email) = 'kalboss@gmail.com';

update public.profiles
set email = 'Dcc@gmail.com'
where id = (select id from auth.users where lower(email) = 'dcc@gmail.com');
