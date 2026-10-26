-- Extensiones obligatorias del dominio (UUIDs y constraints de exclusión GiST)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- Rol operativo de la aplicación (sujeto a FORCE ROW LEVEL SECURITY sin BYPASSRLS)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'centris_app_user') THEN
    CREATE ROLE centris_app_user WITH
      LOGIN
      PASSWORD 'centris_app_pass'
      NOSUPERUSER
      NOCREATEDB
      NOCREATEROLE
      NOBYPASSRLS;
  END IF;
END
$$;

GRANT CONNECT ON DATABASE centris_db TO centris_app_user;
GRANT USAGE ON SCHEMA public TO centris_app_user;

ALTER DEFAULT PRIVILEGES FOR ROLE centris_owner IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO centris_app_user;

ALTER DEFAULT PRIVILEGES FOR ROLE centris_owner IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO centris_app_user;
