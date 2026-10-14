-- Add 'superadmin' to the user_role enum so the Superadmin Console account
-- can be created. Postgres requires ALTER TYPE … ADD VALUE outside a
-- transaction; split into its own migration so it runs cleanly.

alter type public.user_role add value if not exists 'superadmin';
