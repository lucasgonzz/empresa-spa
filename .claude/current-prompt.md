# Prompt 513 — Migraciones aditivas: precios con IVA incluido por compra/proveedor + costos extra facturados (empresa-api)

## Estado

pendiente

## Descripción

Base del fix de IVA de la factura de compra documentado en `refactor_empresa/compras.md`
("REVISIÓN EN PRUEBAS 18/7"). Solo migraciones **aditivas y retrocompatibles** (los 40 clientes
en producción no deben cambiar de comportamiento: todos los defaults = comportamiento actual).

Agrega:

1. **`provider_orders.precios_incluyen_iva`** (bool, default `false`): indica si los precios cargados
   en esa compra ya vienen con el IVA incluido por parte del proveedor. `false` = comportamiento
   actual (el precio es neto y se le suma IVA para la factura).
2. **`providers.precios_incluyen_iva`** (bool, default `false`): default a nivel proveedor, que
   pre-completa el flag de la orden al elegir ese proveedor (la convención suele ser estable por
   proveedor). El de la orden manda; este solo pre-carga.
3. En **`provider_order_extra_costs`** (los costos extra: flete, seguro, etc.):
   - `facturado` (bool, default `false`): si ese costo extra vino facturado (genera IVA crédito) o no.
   - `iva_id` (nullable, FK a `ivas`): alícuota con la que se facturó ese costo extra (solo aplica si
     `facturado` = true).
   - `en_factura_compra` (bool, default `true`): si el costo va DENTRO de la misma factura de la
     compra (`true`) o en una **factura aparte** (`false`, caso flete tercerizado por otro emisor).
   - `emisor_cuit` (nullable string): CUIT del emisor de la factura aparte (cuando `en_factura_compra`
     = false y `facturado` = true; ej. la empresa de transporte tercerizada).
   - `emisor_razon_social` (nullable string): razón social del emisor de la factura aparte.

## Ejecución sugerida

cursor

## Modelo sugerido

auto — son migraciones aditivas simples, sin lógica. Alcanza con auto.

## Repositorios y ramas

`empresa-api` (rama `refractor`). Trabajar y pushear en `refractor`. NO develop, NO master.

## Ramas

- empresa-api: refractor

## Dependencias

Ninguna. Es la base del resto del grupo 124 (514–517 dependen de este).

## Checker sugerido

sonnet. Revisar solo que las migraciones sean aditivas, con defaults que preserven el comportamiento
actual (todos los flags nuevos en el valor "como hoy"), FK `iva_id` nullable con `onDelete` seguro, y
que existan los `down()` para revertir. No hay lógica de negocio que chequear acá.

---

## Constraint PHP 7.4 (empresa-api)

Producción corre **PHP 7.4**. PROHIBIDO: `?->` (nullsafe), `match`, `str_contains`,
`str_starts_with`, `str_ends_with`, named arguments, union types, constructor promotion, `readonly`,
`enum`, atributos `#[...]`, tipos de retorno `mixed`/`never`/`static`. Usar `isset()`, `strpos()`,
`switch`, ternarios clásicos. Violar esto rompió producción varias veces.

---

## Contexto técnico (rama refractor)

- Modelo `@app/Models/ProviderOrder.php` — la orden de compra. Ya tiene `modo_facturacion`,
  `total_with_iva`, `total_from_provider_order_afip_tickets`, relación `extra_costs`, `discounts`,
  `current_acount`.
- Modelo `@app/Models/Provider.php` — el proveedor. Ya tiene `provider_discounts`.
- Tabla `provider_order_extra_costs` — los costos extra de la orden (flete/seguro). Buscar su
  migración y modelo actuales para agregarle las columnas sin romper los usos existentes.
- Tabla `ivas` — catálogo de alícuotas (0, 10.5, 21, 27, etc.). La FK `iva_id` apunta acá; mismo
  patrón que el `iva_id` que ya usan los artículos.
- Mirar cómo están hechas las migraciones aditivas recientes del refactor (ej. la que agregó
  `provider_id` a `article_discounts`, prompt 305) para respetar el estilo.

## Tareas

1. Migración aditiva para `provider_orders`: agregar `precios_incluyen_iva` boolean, default false,
   after de una columna estable.
2. Migración aditiva para `providers`: agregar `precios_incluyen_iva` boolean, default false.
3. Migración aditiva para `provider_order_extra_costs`: agregar `facturado` (bool default false),
   `iva_id` (unsignedBigInteger nullable + FK a `ivas`, `nullOnDelete`), `en_factura_compra` (bool
   default true), `emisor_cuit` (string nullable), `emisor_razon_social` (string nullable).
4. Sumar los campos nuevos a `$fillable` (y casts booleanos donde corresponda) en los modelos
   `ProviderOrder`, `Provider` y el modelo del extra cost.
5. `down()` de cada migración que revierta limpio (dropForeign antes de dropColumn en el caso de
   `iva_id`).

NO agregar lógica de cálculo en este prompt: solo esquema + fillable/casts. La lógica va en 514–516.
NO es una ExtencionEmpresa ni un permiso, así que no requiere seeders (los defaults ya dejan a los
clientes existentes en el comportamiento actual).

## Criterio de éxito

- `php artisan migrate` corre limpio; `migrate:rollback` revierte limpio.
- Un `provider_order` existente queda con `precios_incluyen_iva = false` (sin cambio de comportamiento).
- Un `provider_order_extra_cost` existente queda con `facturado = false`, `en_factura_compra = true`,
  `iva_id = null` (sin cambio de comportamiento).
- Los campos nuevos son asignables (fillable) y los booleanos castean a bool.

---

Al terminar, pushea empresa.

