-- Local development identities only. Never apply this seed to production.
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'bernardo@example.test', extensions.crypt('babyfoot-local', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Bernardo"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'lucas@example.test', extensions.crypt('babyfoot-local', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Lucas"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'thomas@example.test', extensions.crypt('babyfoot-local', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Thomas"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'hugo@example.test', extensions.crypt('babyfoot-local', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Hugo"}', now(), now())
on conflict (id) do nothing;

-- All local accounts intentionally share this non-production password: babyfoot-local
