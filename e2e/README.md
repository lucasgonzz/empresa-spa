# E2E (Playwright) — empresa-spa

Harness de tests end-to-end del prompt 617 (grupo 184). Prueba pocos recorridos representativos
de punta a punta contra la interfaz real; el calculo numerico (costeo, descuentos, flete) ya esta
cubierto por la suite PHPUnit de `empresa-api` (prompts 614-616). **No** repite esa matriz aca.

## Setup en un slot del sistema paralelo (`C:\cc-worktrees\sN`) — usá esto

Un slot **no puede** usar el setup manual de más abajo: apunta a `localhost:8080` y a la base de la
carpeta fija `C:\wamp64\www\empresa`, que es donde Lucas prueba a mano y que el slot tiene prohibido
tocar (ver el hallazgo `20260805-playwright-no-ejecutable-desde-un-slot`). Para eso está
**`e2e/setup-slot.ps1`**, que deja el worktree corriendo por su cuenta:

```
powershell -NoProfile -ExecutionPolicy Bypass -File <raiz_slot>\empresa-spa\e2e\setup-slot.ps1
```

Hace, en este orden: `npm install` + `npx playwright install chromium`; apunta el `.env.testing` de
`empresa-api` a los puertos del slot; `migrate:fresh` + `TestingFerreteriaSeeder` sobre la base del
slot (`empresa_testing_sN`, la que declara `.claude\SLOT.json`); corrige tres datos del usuario del
fixture; y escribe `.env.local` y `e2e/.env.e2e`. Al terminar imprime los dos comandos para levantar
los servidores.

**Convención de puertos** (para que N slots convivan y ninguno pise el 8000/8080 de la carpeta fija):
API = `8100 + N`, SPA = `8180 + N`. Slot 1: `8101` y `8181`.

Las tres cosas que el script corrige en la base y que no son obvias:

| Qué | Por qué |
|---|---|
| `users.default_version` → la SPA del slot | `src/mixins/check_version.js` compara el origin actual contra `default_version` y **redirige** si difieren. `UserSeeder` lo siembra en `:8080`, así que el primer login sacaba al navegador del slot y lo metía en el entorno de Lucas |
| `users.activity_minutes = 0` | Es el lock de sesión única (`AuthHelper::ya_paso_el_tiempo`). Cada corrida hace un login con `session_id` nuevo, así que con el valor por defecto (60) la **segunda** corrida no puede loguear por una hora. El síntoma es un login que se queda en `/login` sin ningún error visible |
| `session_id` y `last_activity` → `null` | Libera el lock que dejó la corrida anterior |

Y una variable que el `.env.local` **tiene que** llevar: `VUE_APP_PUSHER_KEY` (y `_CLUSTER`). Sin
ella `src/main.js` tira `You must pass your app key when you instantiate Pusher` antes de montar la
app: la página queda en blanco, sin un solo `data-testid`, y desde el test se ve como "no encuentro
el input de login".

> ⚠️ **Estado conocido (10/8/2026):** con la API servida por `php artisan serve` la suite todavía no
> corre entera. Ese servidor atiende **un request por vez** y el arranque de la SPA son ~73 llamadas:
> medido, la descarga de recursos no termina en 120 s (a los 117 s iba por 35 de 73) y una búsqueda
> lanzada en el medio tarda ~9 s en responder. El proyecto `setup` (login) pasa; los dos specs mueren
> compitiendo con esa cola. Está registrado como hallazgo y escalado: la salida pasa por servir la
> API con concurrencia o por achicar el arranque, y ninguna de las dos es del harness.

---

## Setup manual (carpeta fija de Lucas)

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

## Esperar la descarga de recursos del arranque

**Todo test que entre al sistema tiene que esperar esto antes de tocar nada.** Apenas hay sesión,
`common-vue/components/download-resources/Index.vue` se pone a bajar los catálogos del arranque
(rubros, proveedores, tipos de precio, preferencias de columnas de las tablas). Hasta que no
termina, los selects vienen vacíos y las grillas todavía no saben con qué columnas dinámicas
trabajar: un test que arranca antes no encuentra un bug, encuentra el sistema a medio cargar.

```js
const { esperar_recursos_descargados } = require('../helpers/recursos')

test.beforeEach(async ({ page }) => {
	await page.goto('/proveedores/compras')
	await esperar_recursos_descargados(page)
})
```

Por defecto el helper hace el recorrido de una persona: clickea la tarjeta de progreso de arriba a
la derecha, mira el detalle recurso por recurso en el panel lateral, espera a que diga *Todo listo*
y lo cierra. Con `{ abrir_panel: false }` solo espera, sin abrir nada.

**Lo que NO hay que hacer es esperar a que la tarjeta desaparezca.** Se esconde sola 3 segundos
después de terminar, o sea que "no está" tanto cuando la descarga terminó como cuando todavía no
empezó (aparece recién ~1 s después de montar el componente). La condición estable es
`[data-testid="recursos-estado"]` con `data-estado="listo"`: es el elemento raíz de
`download-resources/Index.vue` y vive mientras viva la nav. Lleva además `data-descargados` y
`data-total`, y el panel publica una fila por recurso en `[data-testid="recursos-panel-fila"]`
con `data-recurso` y `data-estado`.

⚠️ `listo` quiere decir *"ya no se espera a nadie"*, no *"llegaron todos los datos"*: un catálogo
que falló se marca igual (ver `marcar_descargado` en `Index.vue` y el hallazgo
`20260812-una-descarga-fallida-del-arranque-queda-marcada-como-lista`).

El `storageState` guarda cookies y localStorage, **no** el store de Vuex, así que cada spec baja
los recursos de nuevo en su propia página. Que `auth.setup.js` ya haya esperado no exime al spec.

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
