# PR-S2.4 - Entrega del paquete: solo Drop-off

## Objetivo

Simplificar la sección de admin para usar **solo Drop-off** temporalmente y evitar confusión mientras Pickup está pausado.

## Cambios

- Se desactiva la interacción de Pickup en UI:
  - Sin botón activo para programar/confirmar pickup.
  - Se muestra mensaje: **"Recolección a domicilio pausada temporalmente. Usa Drop-off por ahora."**
  - No se abre formulario ni se dispara request a `/api/admin/shipping/skydropx/pickups`.
- Se fortalece tarjeta de Drop-off con contexto operativo:
  - Título: **Entrega en sucursal / punto autorizado**
  - Paquetería y servicio visibles.
  - Instrucciones claras para imprimir guía, entregar y conservar comprobante.
  - Links de **Abrir guía** y **Buscar sucursales de {carrier}** según carrier.
  - Tracking visible si existe.
- Se mantiene flujo de estado Drop-off:
  - `Usar Drop-off`
  - `Guardar notas`
  - `Marcar como entregado en sucursal`
- Se actualiza placeholder de notas con ejemplos reales de sucursal/entrega.

## QA

1. Orden con guía muestra paquetería y servicio.
2. Link **Abrir guía** funciona.
3. Link **Buscar sucursales** usa carrier.
4. **Usar Drop-off** guarda estado.
5. **Marcar entregado** persiste al recargar.
6. Pickup ya no dispara request ni abre form.
