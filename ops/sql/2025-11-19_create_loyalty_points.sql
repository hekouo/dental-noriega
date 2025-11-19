-- Ejecutar manualmente en Supabase: account_points para puntos de clientes
-- Crea la tabla account_points para gestionar el sistema de puntos de lealtad

-- Tabla de puntos de cuenta
CREATE TABLE IF NOT EXISTS public.account_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  points_balance INTEGER NOT NULL DEFAULT 0,
  lifetime_earned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT account_points_email_lower_unique UNIQUE (lower(user_email))
);

-- Índices para búsquedas eficientes
CREATE INDEX IF NOT EXISTS idx_account_points_user_email ON public.account_points(lower(user_email));

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_account_points_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_account_points_updated_at
  BEFORE UPDATE ON public.account_points
  FOR EACH ROW
  EXECUTE FUNCTION update_account_points_updated_at();

-- Comentarios para documentación
COMMENT ON TABLE public.account_points IS 'Puntos de lealtad de clientes (identificados por email)';
COMMENT ON COLUMN public.account_points.user_email IS 'Email del usuario (normalizado a lowercase)';
COMMENT ON COLUMN public.account_points.points_balance IS 'Puntos disponibles actuales del usuario';
COMMENT ON COLUMN public.account_points.lifetime_earned IS 'Total de puntos ganados históricamente (incluye los gastados)';

