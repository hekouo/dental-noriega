-- Función para actualizar el balance de puntos
-- Ejecutar en Supabase SQL Editor

create or replace function update_points_balance(user_id uuid, points_delta int)
returns void as $$
begin
  update public.user_profiles
  set points_balance = points_balance + points_delta
  where id = user_id;
end;
$$ language plpgsql security definer;

