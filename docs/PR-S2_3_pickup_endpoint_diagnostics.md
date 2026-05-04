# PR-S2.3 - Diagnóstico y fallback de endpoint Pickup Skydropx

## Objetivo

Corregir y diagnosticar errores `404` de Skydropx al crear pickup desde:

- `POST /api/admin/shipping/skydropx/pickups`

Sin tocar checkout y sin cambios SQL.

## Fallback de URLs (orden exacto)

El endpoint de pickup intenta en este orden:

1. `https://app.skydropx.com/api/v1/pickups/`
2. `https://app.skydropx.com/api/v1/pickups`
3. `https://pro.skydropx.com/api/v1/pickups/`
4. `https://pro.skydropx.com/api/v1/pickups`
5. `https://api-pro.skydropx.com/api/v1/pickups/`
6. `https://api-pro.skydropx.com/api/v1/pickups`

En la primera respuesta `2xx`, se toma como válida y se persiste:

- `metadata.shipping.handoff.pickup.endpoint_used`

## Diagnóstico en respuesta (cuando falla)

La API ahora devuelve estructura diagnóstica segura:

- `ok`
- `message`
- `skydropx_status`
- `skydropx_url_used`
- `skydropx_response_sample` (safe + truncado)
- `attempts` con `{ url, status, message }`

No se exponen tokens.

## Payload revisado

Se mantiene wrapper `pickup` y campos principales:

- `packages`
- `total_weight`
- `scheduled_from`
- `scheduled_to`
- `shipment_id`
- `reference_shipment_id` usando `metadata.shipping.shipment_id` cuando existe

## Qué revisar en Network Response

1. `status` HTTP de backend (propaga último status upstream cuando aplica).
2. `skydropx_url_used` para validar host/path realmente usados.
3. `attempts` para identificar en qué URL respondió 404/422.
4. `skydropx_response_sample` para mensaje resumen de Skydropx.
