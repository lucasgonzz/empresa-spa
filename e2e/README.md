# E2E (Playwright) — empresa-spa

Harness de tests end-to-end del prompt 617 (grupo 184). Prueba pocos recorridos representativos
de punta a punta contra la interfaz real; el calculo numerico (costeo, descuentos, flete) ya esta
cubierto por la suite PHPUnit de `empresa-api` (prompts 614-616). **No** repite esa matriz aca.

## Setup

1. Tener corriendo en local:
   - `empresa-api` (`php artisan serve` o Valet/Wamp) con la base sembrada con el fixture
     determinista del prompt 613 (proveedores Buenos Aires + otro, 5 articulos cada uno,
     descuentos de proveedor 10%/5%).
   - `empresa-spa`: `npm run serve` (default `http://localhost:8080`).
2. Copiar `e2e/.env.e2e.example` a `e2e/.env.e2e` y completar:
   - `E2E_BASE_URL` (default `http://localhost:8080`, cambiar solo si `npm run serve` corre en
     otro puerto).
   - `E2E_EMAIL` / `E2E_PASSWORD`: credenciales de un usuario owner de prueba sembrado por el
     fixture (el login de empresa-spa es por "Numero de documento", no email real).
   - **Nunca commitear `e2e/.env.e2e`** (ya esta en `.gitignore`, junto con `e2e/.auth/`, donde
     queda la sesion guardada tras el primer login).

## Comandos

```
npm run test:e2e           # corre los specs una vez, en Chromium, sin UI
npm run test:e2e:ui        # modo interactivo (Playwright UI), para debuggear paso a paso
npm run test:e2e:codegen   # grabador: abre el navegador y genera el codigo del test al interactuar
```

## Convencion de selectores: `data-testid`

Los tests **siempre** seleccionan por `data-testid`. Nunca por clase de Bootstrap, posicion o
texto visible (el texto cambia y rompe tests sin que se rompa nada real).

Este harness es el primero del repo y establece dos patrones, agregados de forma generica y
retrocompatible en los componentes reusables de `common-vue` (no se hardcodeo un string suelto
por campo — se sigue la misma convencion que ya usaban los atributos `id`/`dusk` existentes):

- **Campo simple de un formulario generico (`ModelForm.vue`)**: `data-testid="<model_name>-<key>"`.
  Ejemplos usados en estos tests: `provider_order-provider_id` (buscador de proveedor),
  `provider_order-address_id` (select de deposito), `provider_order-articles` (buscador de
  articulos), `provider_order-modo_facturacion` (select de facturacion).
- **Celda editable de una fila de tabla `belongs_to_many` (`PivotProp.vue`)**:
  `data-testid="<model_name_de_la_fila>-<key>-<id_de_la_fila>"`. Ejemplos: `article-amount-123`,
  `article-received-123`, `article-cost-123` (cantidad/recibida/costo del articulo con id 123 en
  la compra). Como el id real de un articulo recien creado no se conoce de antemano, los tests
  ubican la fila recien agregada con `.last()` sobre `[data-testid^="article-amount-"]` (las
  filas se agregan siempre al final, ver `ModelForm.vue` linea ~1311).
- **Boton de guardar/crear generico**: `btn-guardar-<model_name>` y `btn-crear-<model_name>`
  (mismo criterio que los atributos `dusk` ya existentes `btn_guardar_<model_name>` /
  `btn_create_<model_name>`, agregados en paralelo).
- **Fila de resultado en el modal de busqueda** (`Tr.vue`, cuando `select_mode == 'single'`):
  `data-testid="search-result-row"`.
- Componentes puntuales de este modulo (no genericos, hardcodeados porque son de un solo
  lugar): `compra-total` (`Total.vue`, total mostrado en el formulario de la compra),
  `provider_order-precios_incluyen_iva` (toggle "los precios ya incluyen IVA").
- Login: `login-doc-number`, `login-password`, `login-submit` (`LoginForm.vue`).

**Nota sobre el prompt original:** el prompt pedia nombres puntuales como
`compra-proveedor-select` o `buscador-articulo-input` para cada campo. Se opto por la convencion
generica de arriba (`<model_name>-<key>`) porque ya existia el mismo patron para `id`/`dusk` en
estos mismos componentes compartidos (`ModelForm.vue`, `PivotProp.vue`, `model/Index.vue`) y
agregar nombres sueltos por campo hubiera significado tocar `provider_order.js` (el modelo
declarativo) con flags ad-hoc solo para este modulo. La convencion generica es reusable de
entrada por cualquier test futuro de cualquier otro modulo basado en `ModelForm`, sin tocar nada
mas. Ver el reporte del prompt 617 para el detalle completo de archivos tocados.

Al agregar tests nuevos: si el campo es parte de un `ModelForm` generico o una fila
`belongs_to_many`, ya tiene `data-testid` con esta convencion — no hace falta tocar nada. Si es
un componente puntual de un modulo (como `Total.vue` de compras), agregar el `data-testid`
directamente en ese componente, hardcodeado, describiendo que es (`modulo-elemento`).
