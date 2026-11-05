-- A database user for the running SmartPOS server that can read and write rows
-- but cannot create, change or drop tables. Run once as the database owner
-- (e.g. in your provider's SQL console). Replace the password first.
--
-- Then:
--   PROD_DATABASE_URL           = this user  (the running server)
--   PROD_MIGRATION_DATABASE_URL = the owner  (only for `npm run migration:run`)
--   MIGRATIONS_RUN=off          (the server no longer changes tables itself)

CREATE ROLE smartpos_app LOGIN PASSWORD 'change-me-to-a-long-random-password';

DO $$ BEGIN
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO smartpos_app', current_database());
END $$;
GRANT USAGE ON SCHEMA public TO smartpos_app;

-- Rows only: no CREATE, ALTER, DROP or TRUNCATE.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO smartpos_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO smartpos_app;

-- Tables that future migrations create get the same rights.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO smartpos_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO smartpos_app;

-- The migrations table is only written by migrations.
REVOKE INSERT, UPDATE, DELETE ON TABLE migrations FROM smartpos_app;
