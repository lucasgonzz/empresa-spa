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

🔴 **El fixture siembra las monedas desde el 19/8/2026.** Antes no, y sin ellas la lista de
proveedores del SPA quedaba inusable en cuanto una compra generaba cuenta corriente:
`credit_accounts` nace con `moneda_id`, `ProviderController` eager-loadea `credit_accounts.moneda`,
y `components/common/BtnCurrentAcounts.vue` renderiza `credit_account.moneda.name` sin chequear
null → *"Cannot read properties of null (reading 'name')"*, 82 errores de consola y el boton C/C
sin renderizar. En una cuenta real `monedas` siempre esta sembrada, asi que era un hueco del
fixture, no del producto. Lo arregla `TestingFerreteriaSeeder::seed_base_data()`, que ahora llama a
`MonedaSeeder` detras de un chequeo de existencia (ese seeder usa `create()`, no `firstOrCreate`).

Y una variable que el `.env.local` **tiene que** llevar: `VUE_APP_PUSHER_KEY` (y `_CLUSTER`). Sin
ella `src/main.js` tira `You must pass your app key when you instantiate Pusher` antes de montar la
app: la página queda en blanco, sin un solo `data-testid`, y desde el test se ve como "no encuentro
el input de login".

> ⚠️ **Estado de la suite (19/8/2026): 18 pasan, 1 falla.** Reemplaza al estado del 17/8. Medido en
> el slot s8 sobre base recién sembrada: **10,9 minutos** la corrida completa, con la descarga de
> recursos en 15-20 s por spec (los 35-45 s que decía la nota anterior eran con la máquina cargada).
>
> El único rojo es **`limpiar-filtros-desde-columna`**, que sigue igual que el 15/8: el clic sobre la
> lupa de la columna "Nombre" lo intercepta un elemento que queda encima. Hoy el que intercepta es el
> cartel de progreso `#offline-articles-progress` ("Actualizados: 0 | Eliminados: 0"), no `.cont-th`
> como decía la nota vieja — o sea que el problema no es *qué* tapa el botón sino que el spec clickea
> sin esperar a que la pantalla se asiente. Ojo además que ubica la columna por texto visible
> (`hasText: 'Nombre'`), que es justo lo que la convención de más abajo prohíbe.
>
> El hallazgo `20260815-dos-specs-e2e-que-nacieron-en-rojo` queda válido para ese spec.
>
> `compra-costeo-facturacion` (8 tests) entró en verde el 19/8/2026, y se verificó además que pasa
> **dos veces seguidas sobre la misma base** sin volver a sembrar — ver "Posicion Fiscal se verifica
> por DIFERENCIA" más abajo.

---

## Los specs, y que verifica cada uno

| Spec | Que cubre |
|---|---|
| `alta-compra.spec.js` | Alta de una compra con 10 articulos, costos actualizados y facturacion automatica. Verifica **coherencia** pantalla ↔ servidor, no numeros absolutos. |
| `alta-articulo-desde-buscador.spec.js` | Crear un articulo que no existe desde el buscador de articulos, adentro de una compra. |
| `compra-costeo-facturacion.spec.js` | **El circuito completo de una compra**, de punta a punta (ver abajo). |
| `buscador-filtros-invalidan-busqueda.spec.js` · `estado-vacio-centrado.spec.js` · `limpiar-filtros-desde-columna.spec.js` · `menu-crear-submenu-importacion.spec.js` | Comportamientos puntuales de la interfaz. |

### `compra-costeo-facturacion.spec.js`

Es el recorrido que Lucas hace a mano con calculadora: carga una compra y despues sigue el rastro
que dejo en las cinco puntas que una compra mueve.

1. **La compra** — proveedor con bonificaciones (10% y 5%, que la compra hereda sola), un articulo
   creado al vuelo desde el buscador y otro que ya existia, "los precios ya incluyen IVA" apagado,
   deposito, y las tres opciones irreversibles prendidas (actualizar precios, generar movimientos
   de stock, generar movimiento en cuenta corriente). Facturacion automatica.
2. **La factura** que el modo automatico genera sola: se le cargan percepciones y retenciones
   derivadas del propio comprobante (percepcion de IVA 3% del neto, retencion de IVA 50% del IVA
   facturado, etc.).
3. **El costeo en el listado** — la cadena entera, con la cuenta hecha en el test y comparada
   contra la pantalla y contra el servidor:

   ```
   costo bruto 1000
     x (1 - 10%) x (1 - 5%)   bonificaciones del proveedor, EN CASCADA  -> costo real 855
     x (1 + 40%)              margen de ganancia del articulo
     / (1 - 3%)               impuestos sobre ventas (IIBB): division, no suma
     x (1 + 21%)              IVA de venta (RRII: va al final, no al costo)
                                                                        -> precio final 1493,16
   ```

4. **El stock** — que las 10 unidades entren al deposito de la compra y que quede el movimiento
   ("Compra a proveedor", con su cantidad, deposito destino y stock resultante).
5. **La plata** — la deuda en la cuenta corriente del proveedor, el pago por el total de la compra,
   y los renglones de **Posicion Fiscal** (IVA credito, percepciones y retenciones sufridas).

Tres cosas de este spec que conviene saber antes de tocarlo:

- **Es serial y comparte estado** (`test.describe.serial`). El circuito es secuencial: no se puede
  verificar la factura de una compra que todavia no existe. Si un test falla, los que siguen se
  saltean, que es lo correcto — reportarian fallas derivadas.
- **Posicion Fiscal se verifica por DIFERENCIA.** Ese reporte suma todos los comprobantes del
  periodo, asi que el primer test del archivo no verifica nada: solo saca la foto previa. Sin eso,
  una segunda corrida sobre la misma base veria el doble y daria rojo sin que haya nada mal.
- **El spec apaga "Aplicar margen de ganancia del proveedor" en los dos articulos.** El proveedor
  del fixture tiene `percentage_gain = 100`, y un articulo nacido desde el buscador de una compra
  queda con ese flag prendido (lo hace `check_article_status()`), mientras que uno que ya existia
  lo tiene apagado: sin nivelarlo, dos articulos con el mismo costo y el mismo margen darian
  precios distintos y el numero esperado dependeria de un flag que este spec no vino a probar.

### Helpers compartidos

| Helper | Para que |
|---|---|
| `helpers/recursos.js` | Esperar la descarga de catalogos del arranque (ver mas abajo). **Todo spec lo necesita.** |
| `helpers/entorno.js` | Aislar los broadcasts de Pusher. Ya viene puesto por `fixtures.js`. |
| `helpers/formulario.js` | `abrir_pestania`, `search_and_select`, `elegir_primer_resultado`, `crear_desde_buscador` y `completar_campo`: las maniobras del formulario generico, con sus trampas documentadas. Nacieron inline en `alta-compra.spec.js` y se extrajeron el 19/8/2026. |
| `helpers/numeros.js` | `numero_de_pantalla` (lo que se muestra, es-AR) y `numero_de_dato` (lo que es dato, punto decimal), mas `redondear`. **Cual usar no es opcional**, ver abajo. |
| `helpers/informe-de-fallo.js` | Imprime el detalle del fallo en el momento, sin esperar el resumen final. |

Y un chequeo que no es un test, para correr **antes** de agregar un `data-testid` nuevo:

```
node e2e/chequear-prefijos-de-testid.js
```

Lista los testids que caen adentro de algun prefijo que los specs usan con `^=`. Ver el porque en
el propio archivo y en la nota sobre `celda-` de mas abajo.

⚠️ **`alta-articulo-desde-buscador.spec.js` todavia tiene su propia copia inline** del click con
reintento sobre el resultado de busqueda. Si lo tocas, hacelo apuntar a `helpers/formulario.js`.

### 🔴 Un `fill()` puede perderse sin que nada avise

Los inputs de `ModelForm` son **controlados**: `FieldTextInput.local_value` es un computed que lee
de la prop `value` y emite `input`, sin estado propio. Si el modal todavia esta terminando de cargar
el modelo cuando el test escribe, el valor tipeado se pisa con el del store y el input vuelve solo
al valor viejo — sin error, sin warning.

El sintoma es cruel: el formulario se guarda, el `PUT` sale 200, **y el servidor devuelve el valor
anterior**. La asercion falla veinte lineas mas abajo (*"esperaba 3, recibi 3.5"*) y nada apunta al
`fill`. Paso el 19/8/2026 con la alicuota del impuesto sobre ventas.

Para campos cuyo valor se verifica *despues* (o peor: se usa para calcular otra cosa), usar
`completar_campo(page, testid, valor)` de `helpers/formulario.js`, que reintenta el `fill` hasta que
el campo efectivamente lo tiene.

### 🔴 Los modulos que se ven por fecha no cargan nada hasta que clickeas un dia

Compras, Ventas, Pedidos, Gastos, Cheques y Presupuestos **no disparan el listado al montarse**.
`view/Index.vue` los saltea a proposito —lo dice su propio `disparar_listado_por_defecto()`— porque
el flujo de esos modulos es *entrar por dia/rango*. Entonces:

```js
await page.goto('/proveedores/compras')
await esperar_recursos_descargados(page, { abrir_panel: false })
await page.locator('[data-testid="provider_order-row-2"]').click()   // ← timeout de 4 minutos
```

La tabla dice **"No hay Compras"** con las compras en la base, y el fallo apunta al selector de la
fila, que no tiene nada de malo. Pasó el 19/8/2026 y costo una corrida entera.

Lo que falta es el paso que hace una persona: elegir el dia.

```js
await page.goto('/proveedores/compras')
await esperar_recursos_descargados(page, { abrir_panel: false })
await page.locator('[data-testid="control-fecha-dia"][data-fecha="2026-08-19"]').click()
```

`ControlFecha.vue` publica una celda por dia con `data-testid="control-fecha-dia"`, su
`data-fecha` en `YYYY-MM-DD` y `data-activo="si|no"`; y los dos modos con
`control-fecha-modo-por-fecha` / `control-fecha-modo-historico` (Historico trae todo, sin filtro de
fecha). El dia de HOY siempre se puede clickear; los demas solo si ya tienen movimientos
(`clickDia()` corta con un toast si no).

`compra-costeo-facturacion.spec.js` lo envuelve en `abrir_compras_del_dia()`.

### 🔴 Lo que se MUESTRA va en es-AR; lo que es un DATO va con punto

Desde el **21/8/2026** toda la interfaz imprime los numeros con la convencion argentina: punto para
los miles, coma para los decimales.

| Columna | Se ve |
|---|---|
| Costo base | `$2.000,00` |
| Costo Real | `$2.000,00` |
| Precio final | `$4.145,08` |
| Stock | `10,00` |

Hasta esa fecha las tres primeras convivian con dos formatos distintos en la misma fila, porque
`price_variable_decimals()` devolvia el `numeral(p).format(pattern)` crudo (en-US) y `price()` si
daba vuelta los separadores. Se unifico: los dos caminos pasan por `separadores_es()` de
`src/common-vue/helpers/formato_numero.js`, que es el unico lugar del sistema que decide como se ve
un numero.

**Lo que NO cambio** son los campos editables: un `&lt;input&gt;` se sigue escribiendo con punto decimal,
y lo mismo vale para los atributos `data-*` que el sistema expone para que otro proceso los lea.

🔴 **No hay forma de adivinar el formato mirando el texto**, y es importante entenderlo antes de
escribir un test que lea importes:

```
"$20.691"   ->  pantalla: veinte mil seiscientos noventa y uno   (price() recorta el ",00")
"$20.691"   ->  dato:     veinte con seiscientos noventa y uno
```

El mismo texto, dos numeros. Por eso `helpers/numeros.js` expone **dos** funciones, y quien lee
tiene que saber si esta leyendo pantalla o dato:

| Funcion | Para |
|---|---|
| `numero_de_pantalla` | Cualquier celda, chip o texto de la interfaz. Miles `.`, decimal `,`. |
| `numero_de_dato` | El `value` de un `&lt;input&gt;` (`inputValue()`) y los atributos `data-*`. Decimal `.`, sin miles. |

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

## Cuando un test falla, que mirar

Un test en rojo imprime **en el momento** un bloque con el nombre del test, el archivo y la línea,
el mensaje del error (locator, esperado, recibido y el call log) y dónde quedan la captura y el
trace. Antes eso solo salía en el resumen del final de la corrida: entre la cruz y el detalle
pasaban minutos, y si uno cortaba con `Ctrl+C` al ver la cruz, el resumen no se imprimía nunca y la
consola quedaba sin ninguna información. Lo engancha `e2e/fixtures.js` (y `e2e/auth.setup.js` por
su cuenta) llamando a `e2e/helpers/informe-de-fallo.js`.

Además de eso quedan, para cada fallo:

```
npx playwright show-report                          # el informe html de toda la corrida
npx playwright show-trace test-results/<carpeta>/trace.zip   # el trace navegable de un fallo
```

El trace es lo que evita repetir los ~11 minutos: trae el DOM de cada paso, la red y la consola.

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

### El `setup` de login NO espera los recursos

`auth.setup.js` hace login, guarda el `storageState` y se va. **No espera la descarga**, y eso es a
propósito desde el 17/8/2026.

El `storageState` guarda cookies y localStorage, **no** el store de Vuex: los ~68 catálogos no
quedan guardados en ningún lado. Esperarlos en el setup era pagar 35-45 segundos por una descarga
que se tiraba dos segundos después, cuando ese navegador se cerraba — y el primer spec arrancaba en
una página nueva y la volvía a hacer igual. La espera pertenece a cada spec que entra a la interfaz
de un módulo, como primer paso después de su `page.goto()`, y ahí está.

El recorrido completo por la tarjeta y el panel (el helper sin `{ abrir_panel: false }`), que antes
también se hacía en el setup, lo cubre `alta-compra.spec.js`.

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
- **Celda de una fila que se edita en linea porque el modelo esta incompleto (`Tr.vue`,
  `show_in_input_if`)**: `data-testid="<model_name>-<key>-<id>-editable"`. Ejemplo:
  `article-name-47-editable` (el nombre de un articulo recien creado, que nace con
  `status = 'inactive'`). El sufijo `-editable` no es decorativo: sin el, el testid seria
  identico al de una columna del pivote, y la misma key puede existir en los dos lados a la vez
  (por eso `form/BelongsToManyTable.vue` desambigua las etiquetas con "(pivot)"). **Estas celdas
  se leen con `toHaveValue`, no con `toContainText`**: el `value` de un input no es texto, y una
  asercion sobre el `<tr>` las ve vacias con la interfaz andando bien.
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

### Agregados el 19/8/2026 (mision del circuito completo de compra)

Todos genericos y retrocompatibles, en la misma linea que los de arriba:

- **Celda de tabla (solo lectura)**: `data-testid="celda-<model_name>-<key>-<id>"`. Es la unica
  forma de leer por testid un valor que la tabla muestra como TEXTO —costo real, precio final,
  stock, saldo de cuenta corriente—.

  🔴 **Va en los DOS componentes de tabla del sistema**, y es facil no darse cuenta de que son dos:
  `display/table/Tr.vue` (el que usa el listado de articulos) y `display/TableComponent.vue`
  —una `b-table`, via `tdAttr`— que usa, entre otros, la cuenta corriente. Desde afuera no se
  distinguen. Un testid que exista en una sola de las dos es peor que no tenerlo: el test anda en
  un modulo y en el de al lado se va en timeout buscando una celda que en ese camino de render
  nunca existio (paso el 19/8/2026 con `celda-current_acount-debe-4`). **Si se toca uno, se toca
  el otro.**

  🔴 **El discriminante va al PRINCIPIO, no al final, y eso lo enseño un rojo.** La primera version
  uso `<model>-<key>-<id>-celda` y dejo `alta-articulo-desde-buscador.spec.js` en rojo: ese spec
  ubica la fila recien agregada con `[data-testid^="article-amount-"]` (prefijo, porque no conoce el
  id de antemano) y el sufijo `-celda` tambien empieza con `article-amount-`, asi que el selector
  paso a ver 2 elementos donde habia 1. **Regla que queda: un `data-testid` nuevo nunca puede
  compartir el comienzo con uno que ya existe**, porque los selectores de prefijo son la forma
  estandar de este harness de encontrar una fila sin saber su id.
- **Campo de fecha**: `data-testid="<model_name>-<key>"` en `model/form/DatePicker.vue`. Era el
  unico tipo de campo del formulario generico sin testid (el `id` que ya tenia usa `_` en vez de
  `-`, por razones historicas).
- **Margen de ganancia del articulo**: `article-percentage_gain` en
  `listado/components/modal-props/PercentageGainInput.vue`. Ese campo se renderiza por slot con un
  componente propio, asi que no heredaba el testid generico de `ModelForm`.
- **Posicion Fiscal**: un `data-testid` por renglon (`posicion-fiscal-iva-credito`,
  `-percepcion-iva`, `-retencion-iva`, `-iibb-determinado`, `-percepcion-iibb`, `-retencion-iibb`,
  `-retencion-ganancias`, `-saldo-iva`, `-saldo-iibb`, `-iva-debito`,
  `-iva-notas-credito`) **con `data-monto`**, y `data-tipo` en los saldos. 🔴 El `data-monto` no es redundante con el texto: el reporte formatea
  con `price(valor, false, false)`, que SIEMPRE recorta los dos decimales, asi que una retencion de
  1795,50 se imprime `$1.795` y del texto no se puede sacar el numero. Mismo patron que
  `download-resources/Index.vue` (`data-estado`/`data-descargados`/`data-total`).
- **Movimientos de stock**: `data-testid="stock-movement-row"` por fila, con `data-concepto`,
  `data-cantidad`, `data-stock-resultante` y `data-deposito-destino`
  (`stock-movement-modal-info/TableComponent.vue`). Esa tabla es una `b-table` armada a mano: no
  pasa por `Tr.vue` y no heredaba nada.
- **Boton de movimientos de stock del listado**: `btn-stock-movements-<id>`. Lleva el id porque el
  bloque de botones se repite en cada fila.
- **Cuenta corriente**: `btn-current-acount-<model_id>-<moneda_id>` (el `id` que ya existia se
  repite cuando el proveedor tiene cuenta en pesos y en dolares; el testid no repite ese error),
  `btn-registrar-pago` (con `data-precargado="si|no"` segun haya un movimiento seleccionado),
  `current-acount-pago-total`, y `pago-metodo-<i>` / `pago-monto-<i>` / `pago-caja-<i>` por cada
  metodo de pago del pago.

Al agregar tests nuevos: si el campo es parte de un `ModelForm` generico o una fila
`belongs_to_many`, ya tiene `data-testid` con esta convencion — no hace falta tocar nada. Si es
un componente puntual de un modulo (como `Total.vue` de compras), agregar el `data-testid`
directamente en ese componente, hardcodeado, describiendo que es (`modulo-elemento`).
