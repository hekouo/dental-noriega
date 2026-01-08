-- Agregar columnas de envío a la tabla products
-- Permite almacenar peso y dimensiones de cada producto para cotizaciones precisas

-- Verificar si las columnas ya existen antes de agregarlas (idempotente)
DO $$
BEGIN
  -- shipping_weight_g: peso del producto en gramos
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'products' 
    AND column_name = 'shipping_weight_g'
  ) THEN
    ALTER TABLE public.products 
    ADD COLUMN shipping_weight_g INTEGER DEFAULT NULL;
    COMMENT ON COLUMN public.products.shipping_weight_g IS 'Peso del producto para envío en gramos. Usado para cotizaciones precisas de Skydropx.';
  END IF;

  -- shipping_length_cm: largo del producto en centímetros
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'products' 
    AND column_name = 'shipping_length_cm'
  ) THEN
    ALTER TABLE public.products 
    ADD COLUMN shipping_length_cm INTEGER DEFAULT NULL;
    COMMENT ON COLUMN public.products.shipping_length_cm IS 'Largo del producto para envío en centímetros. Usado para cotizaciones precisas de Skydropx.';
  END IF;

  -- shipping_width_cm: ancho del producto en centímetros
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'products' 
    AND column_name = 'shipping_width_cm'
  ) THEN
    ALTER TABLE public.products 
    ADD COLUMN shipping_width_cm INTEGER DEFAULT NULL;
    COMMENT ON COLUMN public.products.shipping_width_cm IS 'Ancho del producto para envío en centímetros. Usado para cotizaciones precisas de Skydropx.';
  END IF;

  -- shipping_height_cm: alto del producto en centímetros
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'products' 
    AND column_name = 'shipping_height_cm'
  ) THEN
    ALTER TABLE public.products 
    ADD COLUMN shipping_height_cm INTEGER DEFAULT NULL;
    COMMENT ON COLUMN public.products.shipping_height_cm IS 'Alto del producto para envío en centímetros. Usado para cotizaciones precisas de Skydropx.';
  END IF;

  -- shipping_profile: perfil recomendado de empaque (ENVELOPE, BOX_S, BOX_M, CUSTOM)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'products' 
    AND column_name = 'shipping_profile'
  ) THEN
    ALTER TABLE public.products 
    ADD COLUMN shipping_profile TEXT DEFAULT NULL;
    COMMENT ON COLUMN public.products.shipping_profile IS 'Perfil recomendado de empaque: ENVELOPE, BOX_S, BOX_M, o CUSTOM. Usado como sugerencia al seleccionar empaque en pedidos.';
  END IF;
END $$;
