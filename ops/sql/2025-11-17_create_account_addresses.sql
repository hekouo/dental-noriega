-- Dante: ejecutar este script en Supabase manualmente (db: producción)
-- Crea la tabla account_addresses para gestionar direcciones de usuarios

-- Tabla de direcciones de cuenta
CREATE TABLE IF NOT EXISTS public.account_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  street TEXT NOT NULL,
  neighborhood TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'México',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para búsquedas eficientes
CREATE INDEX IF NOT EXISTS idx_account_addresses_user_email ON public.account_addresses(user_email);
CREATE INDEX IF NOT EXISTS idx_account_addresses_user_email_default ON public.account_addresses(user_email, is_default) WHERE is_default = true;

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_account_addresses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_account_addresses_updated_at
  BEFORE UPDATE ON public.account_addresses
  FOR EACH ROW
  EXECUTE FUNCTION update_account_addresses_updated_at();

-- Comentarios para documentación
COMMENT ON TABLE public.account_addresses IS 'Direcciones guardadas por usuarios (identificados por email)';
COMMENT ON COLUMN public.account_addresses.user_email IS 'Email del usuario (sin auth completo, usamos email como identificador)';
COMMENT ON COLUMN public.account_addresses.is_default IS 'Si true, esta es la dirección predeterminada del usuario';

