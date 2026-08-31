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
| `circuito-compra.spec.js` | **El circuito operativo de una compra** (ver abajo): cantidad pedida vs recibida, flete prorrateado, importacion de Excel, edicion de la compra ya confirmada y pago al proveedor. |
| `buscador-filtros-invalidan-busqueda.spec.js` · `estado-vacio-centrado.spec.js` · `limpiar-filtros-desde-columna.spec.js` · `menu-crear-submenu-importacion.spec.js` | Comportamientos puntuales de la interfaz. |

### Una prueba grande se parte en archivos seriales, no en un test gigante ni en tests sueltos

Es la forma de todos los circuitos de este harness y conviene entender por que, porque las dos
alternativas se ven razonables y las dos son peores.

**Un solo test que haga todo el recorrido no sirve.** El timeout, el trace y la captura de
Playwright son POR TEST. Un test de sesenta maniobras deja, cuando se rompe, una linea roja y un
trace enorme, sin decir cual de las cincuenta aserciones anteriores es la regresion.

**Tests totalmente independientes tampoco.** Cada uno tendria que reconstruir su precondicion POR LA
INTERFAZ (crear la compra, confirmarla, facturarla), lo que multiplica la corrida por el camino mas
lento. Y peor: la mitad de lo que hay que verificar ES estado acumulado --que la cuenta corriente
tenga la compra, que al borrar la venta vuelva el stock, una nota de credito sobre una venta
facturada--. Aislar eso obliga a falsear la precondicion, que es justo lo que ya hace la suite de
PHPUnit de `empresa-api`, mucho mas rapido y sin navegador.

**Lo que si funciona:** un archivo por circuito, cada uno un `test.describe.serial`, y cada paso un
`test()` con nombre propio. Los pasos comparten estado por un objeto `contexto` a nivel de modulo,
cada uno tiene su propio trace y su propio presupuesto de tiempo, y si uno falla los que siguen se
saltean --que es lo correcto: reportarian fallas derivadas y taparian la causa--.

Y la regla que hace que todo esto se pueda correr dos veces sobre la misma base: **todo lo
acumulativo se verifica por DIFERENCIA**. El primer test de cada archivo no verifica nada, saca la
foto previa (stock, saldos, cantidad de movimientos) y todas las aserciones son sobre el delta.

### `circuito-compra.spec.js`

Cubre lo que una compra mueve cuando se la carga como la carga una persona, y arranca donde
`compra-costeo-facturacion.spec.js` no llega: no repite el costeo ni la facturacion, sino la
operatoria.

1. **El alta** — proveedor con bonificaciones, tres articulos que ya existen, uno creado al vuelo
   desde el buscador con los dos Enter, costos cambiados a mano y las tres opciones irreversibles.
2. **Cantidad pedida vs recibida**, en sus tres caminos, que es el corazon del archivo:

   | renglon | pedida | recibida | que entra al stock |
   |---|---|---|---|
   | Pinza | 10 | (vacia) | 10 — cae a la pedida |
   | Martillo acero | 8 | 5 | 5 — manda la recibida |
   | Alicate | 6 | **0 explicito** | **0 — no se mueve nada** |

   🔴 El cero explicito es el unico de los tres que puede romperse sin que los otros dos se enteren.
   `NewProviderOrderHelper::interpretar_cantidad_real()` usa `received` **incluido el 0**, y cae a
   `amount` solo si es `null` o `''`. Un `if ($received)` en vez de un `is_null($received)` haria
   que el cero se comporte como "no indicado" y sume la cantidad pedida. El test lo verifica dos
   veces: por el stock y por la AUSENCIA de movimiento.

   La misma regla se verifica ademas a nivel de totales: el subtotal de la compra da **27.300** con
   la cantidad efectiva y daria **36.600** con la pedida. Son dos numeros que no se pueden confundir.
3. **El flete** — un costo extra de tipo `transporte`, y que el recargo unitario que le toca a cada
   articulo sea `flete x (subtotal del renglon / subtotal de la compra) / cantidad efectiva`.

   🔴 Dos consecuencias no obvias que el test fija: la base del reparto es el subtotal **bruto**
   (antes de las bonificaciones), y **el renglon con cantidad efectiva 0 no participa del reparto**
   (el backend lo saltea antes de tocarlo). Si algun dia participara, el flete de los demas bajaria
   sin que nada lo avise.
4. **La cuenta corriente del proveedor** — que la compra quede como deuda por el total CON el costo
   extra, porque un costo extra suma siempre al total, prorratee o no.
5. **La importacion de Excel** — tres filas que ejercitan los tres caminos del matcheo: un articulo
   que ya esta en la compra (la actualiza), uno que existe en el sistema pero no en la compra (la
   agrega) y uno que no existe (lo da de alta).
6. **Editar la compra ya confirmada** subiendo la cantidad recibida: que el stock suba solo por la
   DIFERENCIA (no por la cantidad entera de nuevo), y que la cuenta corriente se mueva exactamente
   lo que subio el total.
7. **El pago** — su imputacion en la cuenta corriente y la salida de la caja.

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
  `-retencion-ganancias`, `-saldo-iva`, `-saldo-iibb`, `-iva-debito`) **con `data-monto`**, y
  `data-tipo` en los saldos. 🔴 El `data-monto` no es redundante con el texto: el reporte formatea
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

### Agregados el 31/8/2026 (mision del circuito e2e completo)

Todos genericos y retrocompatibles, y todos con el discriminante AL PRINCIPIO por la regla de mas
arriba (un testid nuevo no puede compartir el comienzo con uno que ya existe):

- **Boton "Agregar X" de cualquier `has_many`**: `btn-agregar-has-many-<prop.key>`
  (`common-vue/components/model/HasMany.vue`). Discriminado por `prop.key` y **no** por el nombre
  del modelo, por la misma razon que el `data-tour` que ya vivia ahi: la solapa "Descuentos y
  recargos" de una compra tiene DOS `has_many` --los descuentos y los costos extra-- y con el
  modelo el testid se duplicaria.

  🔴 Por que no se llama `btn-crear-<model_name>`: ya existe `btn-crear-provider_order`
  (`BtnCreate.vue`) y `btn-crear-provider_order_extra_cost` **empieza igual**.
- **Modal de importacion** (`common-vue/components/import/Index.vue`), que no tenia ninguno:
  `import-fila-desde` (la fila a partir de la cual importar, que viene en 2),
  `input-excel-<model_name>` y `btn-confirmar-importacion`.

  🔴 `input-excel-` y no `input-file-`: el `id` de al lado es `input-file-<model_name>`, pero
  `input-file-` es tambien el comienzo de los ids que BootstrapVue genera para otros `b-form-file`.
  Y `btn-confirmar-importacion` y no `btn-importar-...` porque el boton de la FILA (el que ABRE
  este modal) ya se llama `btn-importar-excel-<id>`.
- **Boton "Importar excel" de la fila de una compra**: `btn-importar-excel-<provider_order_id>`
  (`components/provider/components/orders/BtnImport.vue`). Lleva el id porque el bloque de botones
  se repite en cada fila, mismo criterio que `btn-stock-movements-<id>`.
- **Estado de la tabla de movimientos de stock**: `estado-movimientos-stock`, con
  `data-estado="cargando|listo"` y `data-cantidad`
  (`components/listado/modals/stock-movement-modal-info/TableComponent.vue`). Mismo patron que
  `download-resources/Index.vue`.

  🔴 Hace falta porque mientras la tabla carga se dibuja un `<b-skeleton-table>` y despues puede
  quedar la tabla O el cartel "No hay movimientos": contar filas apenas se abre el modal da CERO y
  no distingue *"todavia no llegaron"* de *"no hay ninguno"*. Esa es exactamente la diferencia que
  hay que poder afirmar cuando se compra con cantidad recibida 0.

### 🔴 Un boton "Crear" apretado antes de tiempo no hace NADA, y no avisa

Sintoma: se clickea `[data-testid="btn-crear-<modelo>"]` apenas se entra al modulo y no se abre
ningun modal. Sin error de consola, sin toast, sin nada tapando el boton --`elementFromPoint`
devuelve el propio boton-- y `#<modelo>___BV_modal_outer_` nunca llega a existir en el DOM.

`BtnCreate.create()` llama a `setModel()` (`common-vue/mixins/display.js`), que adentro de un
`setTimeout(..., 30)` hace `$bvModal.show(model_name)`. Si el `<model>` --que es un componente
async-- todavia no termino de cargar su chunk, ese `show()` es un **no-op silencioso** de
BootstrapVue: pedirle mostrar un id que nadie registro no tira error.

Lo dispara en la practica entrar al modulo y clickear mientras corre la descarga de recursos del
arranque. La solucion es la de siempre --esperar `recursos-estado` en `listo`-- **mas** reintentar
el click hasta que el modal exista, que es lo que hace `abrir_alta_de_compra()` en
`circuito-compra.spec.js`.

⚠️ Y una trampa de diagnostico: `elemento.offsetParent !== null` NO sirve para saber si un modal
esta visible. Un `.modal` de Bootstrap tiene `position: fixed`, y para un elemento fijo
`offsetParent` es **siempre** null. La condicion correcta es la existencia del outer.

### 🔴 Un `has_many` cargado sobre un modelo SIN GUARDAR se descarta en silencio

Con el formulario de compra nuevo (`model.id === null`), "Agregar Costo Extra" abre su modal
anidado, deja completar todo, y al apretar "Guardar y cerrar" **no pasa nada**: el modal queda
abierto, la tabla sigue diciendo "No hay Costos Extra", no hay error ni toast. Verificado en el
store: `provider_order.model.provider_order_extra_costs.length === 0`.

Consecuencia para cualquier spec: el flete (y cualquier `has_many` que no venga precargado) se
carga **despues** de guardar, reabriendo el modelo desde su fila.

### 🔴 La lupa del filtro de una columna no se puede clickear sin pasar el mouse por el encabezado

Esta era la causa real del rojo de `limpiar-filtros-desde-columna.spec.js`, que arrastraba desde el
15/8/2026 y **quedo arreglado el 31/8/2026**. La nota anterior de este README apuntaba al lado
equivocado: decia que el spec clickeaba "sin esperar a que la pantalla se asiente" y que lo tapaba
el cartel de progreso `#offline-articles-progress`. No era eso.

Medido el 31/8/2026 sobre el `<th>` de la columna Proveedor del listado, con la pantalla quieta y
los recursos ya descargados:

```
.cont-filter-buttons  ->  max-width: 0px   opacity: 0   pointer-events: none
```

O sea que **el boton existe en el DOM, esta "visible" para Playwright y es inclickeable**: vive
dentro de un contenedor con `overflow: hidden` y ancho CERO. Por eso `elementFromPoint` sobre el
centro del boton devuelve `.cont-th` --que es su propio ANCESTRO--, y Playwright lo reporta como
*"`<div class="cont-th">` intercepts pointer events"*, un mensaje que hace pensar en un elemento
encima cuando en realidad no hay nada encima.

Lo que lo abre es una regla de CSS y nada mas (`display/table/Index.vue`):

```sass
th
    &:hover
        .cont-filter-buttons
            opacity: 1
            pointer-events: auto
```

Entonces el recorrido correcto es el de una persona: **pasar el mouse por el encabezado y recien
ahi clickear la lupa**, las dos cosas seguidas y en el mismo test para que el puntero no se vaya:

```js
const th = page.locator('th').filter({ has: page.locator('[data-testid="btn-abrir-filtro-provider_id"]') })
await th.hover()
await page.locator('[data-testid="btn-abrir-filtro-provider_id"]').click()
```

⚠️ Y hay que esperar a que TERMINE de abrirse. El contenedor abre con una transicion de 0,2 s
(`transition: max-width 0.2s`) y mientras corre el boton se mueve, asi que Playwright lo rechaza con
**`element is not stable`** hasta agotar el timeout — un rojo que no menciona ni el hover ni la
transicion. La condicion observable es el contenedor con `pointer-events: auto` y ancho > 0:

```js
await page.waitForFunction(() => {
    const boton = document.querySelector('[data-testid="btn-abrir-filtro-provider_id"]')
    const contenedor = boton && boton.closest('.cont-filter-buttons')
    return contenedor
        && getComputedStyle(contenedor).pointerEvents === 'auto'
        && boton.getBoundingClientRect().width > 0
}, null, { timeout: 5000 })
```

Y conviene reintentar el par hover+click entero: si el ancho de la columna cambia al abrirse, el
puntero puede quedar afuera y el contenedor se vuelve a cerrar.

Nota aparte: el boton tambien se muestra sin hover cuando el filtro YA esta en uso, por la clase
`force-show` (`:class="{ 'force-show': filter_is_used(field.key) }"`). O sea que el segundo click
sobre la misma columna no necesita hover, y el primero si.

### Agregados el 31/8/2026, segunda tanda (circuito del listado)

Ninguna de estas dos pantallas tenia un solo `data-testid`.

**Filtro de una columna** (`display/table/BtnFilter.vue`, `display/table/filter/BtnBuscar.vue`,
`display/table/filter/Select.vue`), todos con la key de la columna:

- `btn-abrir-filtro-<key>` — la lupa del encabezado (ver la trampa del hover, arriba).
- `btn-limpiar-filtro-<key>` — la flechita que borra ese filtro. Solo existe si el filtro esta en uso.
- `filtro-select-<key>` — el select del panel, para las columnas de tipo relacion.
- `btn-aplicar-filtro-<key>` — el boton "Filtrar" del panel.

**Actualizacion masiva** (`opciones-filtrados-seleccion/`):

- `masiva-dropdown-filtrados` / `masiva-dropdown-seleccion` y
  `masiva-opcion-actualizar-filtrados` / `masiva-opcion-actualizar-seleccion`.

  🔴 El sufijo no sobra: `OptionsDropdown.vue` se dibuja **dos veces** en la misma pantalla --una
  para el conjunto filtrado y otra para la seleccion manual-- y los `id` de sus items
  (`btn_actualizar`, `btn_eliminar`) quedan **duplicados en el documento**. El testid es lo unico
  que distingue por cual de los dos se entro.

  ⚠️ La opcion "Actualizar" viene **deshabilitada** (`aria-disabled="true"`) mientras no haya un
  filtro aplicado. Un test que la clickee antes de filtrar no recibe ningun error: no pasa nada.
- `masiva-campo-<prop_key>` — la tarjeta de cada propiedad dentro del modal.
- `masiva-modo-<prop_key>-<modo>` — los botones de modo de un campo numerico
  (`decrement` / `increment` / `set`).
- `masiva-valor-<prop_key>` — el input del modo activo. Es UNO solo aunque haya tres inputs en el
  codigo: solo se renderiza el del modo elegido.
- `masiva-checkbox-<prop_key>-<sin-cambio|activar|desactivar>` — los tres botones de un campo
  booleano. Los valores reales son `''`, `1` y `0`; se traducen a palabras para que el testid se
  pueda leer (y para que el vacio no deje el nombre terminado en guion).
- `masiva-select-<prop_key>` y `btn-confirmar-masiva`.

🔴 Todos se arman con `field_card.prop_key` y **no** con `field_card.uid`, que es un identificador
generado y cambia entre renders: un testid que cambia solo no sirve para nada.

### 🔴 El campo "Disponible en la tienda" no existe si la cuenta no tiene la extension `online`

`src/models/article.js` declara `online` con `if_has_extencion: 'online'`, y
`common-vue/mixins/generals.js` filtra de plano las props cuya extension el usuario no tiene. Sin
esa extension el campo **no aparece en ningun lado**: ni en el formulario del articulo ni en la
actualizacion masiva. Y el dato igual existe en la base, con el default 1 de la migracion.

El fixture no sembraba ninguna extension (`extencion_empresas` y `extencion_empresa_user` en cero),
asi que no habia forma de verificar por interfaz que la masiva prenda y apague la disponibilidad en
el ecommerce. Lo tapa `TestingFerreteriaSeeder::seed_extencion_online()`, que habilita **solo** esa
extension: cada extension cambia lo que la SPA dibuja, y prender de mas mueve pantallas que ningun
test pidio.

### 🔴 Un `search-component` sin `id` publica el NOMBRE DEL MODELO como testid

`common-vue/components/search/Index.vue` arma su `_id` con el `id` que le pasen y, si no le pasan
ninguno, **cae al `model_name`**. Así que un buscador declarado sin `id` publica
`data-testid="article"` a secas: el campo más usado del formulario de artículo se llamaba igual que
el modelo entero.

Es confuso y además rompe cualquier selector de prefijo: `[data-testid^="article-"]` **no lo
encuentra**, porque no tiene guion.

Se arregló donde estaba (`listado/components/NameInput.vue` pasa `id="article-name"`), pero la
regla vale para todos: **un `search-component` nuevo lleva siempre `id` explícito**, con la
convención `<model_name>-<key>`. `model/form/FieldSearchInput.vue` --el camino genérico de
ModelForm-- ya lo hace bien; los buscadores hardcodeados de un módulo son los que hay que mirar.

### 🔴 El nombre de un artículo nuevo es un BUSCADOR, no un campo de texto

`listado/components/NameInput.vue` dibuja dos cosas distintas según el estado del modelo:

| Cuándo | Qué dibuja |
|---|---|
| Sin código de barras **y** sin código de proveedor | Un **buscador de artículos**, para que no des de alta uno que ya existe. La pantalla dice *"Preciona ENTER para usar este nombre"* |
| Con alguno de los dos | Un `<textarea>` común |

Los dos publican `article-name`, así que el selector es el mismo; lo que cambia es **cómo se
completa**. En el caso del buscador son **dos Enter**: el primero busca y despliega las
coincidencias, el segundo confirma que ese nombre se use para un artículo nuevo. Es exactamente el
flujo de **`crear_desde_buscador(page, 'article-name', nombre)`**, que se puede reusar tal cual: el
campo se ve inline en el formulario, pero al clickearlo abre el modal de búsqueda de siempre
(`#article-name-search-modal`), igual que cualquier otro campo `search`.

El nombre viaja como la *query* del buscador y el modelo lo toma recién al guardar
(`set_model_on_click_or_prop_with_query_if_null`), así que un `fill()` sobre el input inline deja el
modelo sin nombre.

Está documentado desde el lado del usuario en `manual_sistema/listado/identificacion.md`, sección
"Campo Nombre — comportamiento dual".

### 🔴 Después de cada guardado, refrescá el contexto con lo que devolvió el servidor

Regla de escritura de specs, no de la aplicación, y cuesta una corrida cuando se olvida.

`circuito-compra.spec.js` guardaba la compra (POST), guardaba el flete después (PUT) y seguía
midiendo deltas contra el total del POST — que no tenía el flete adentro — mientras la cuenta
corriente sí lo tenía contado. Dos pasos más abajo el test daba **25.390 esperado contra 15.390
recibido**: exactamente los 10.000 del flete, contados dos veces.

El síntoma manda a buscar el error en la cuenta corriente, que estaba perfecta. Cada vez que un test
guarda, el objeto `contexto` se pisa con el modelo de la respuesta; recalcular el total a mano en el
test es justamente lo que hace que dos pasos dejen de hablar del mismo número.

### 🔴 La ruta del módulo de cajas es `/caja`, en SINGULAR — y `/cajas` deja la página en blanco

`router/routes.js` declara el ítem del menú con `path: '/cajas'`, pero la ruta que el router
**registra** es `/caja/:view?/:sub_view?`.

Entrar a `/cajas` no matchea ninguna ruta, y el resultado no se parece a un error: la página queda
**en blanco**, con la nav dibujada y el `<router-view/>` vacío. Sin error de consola, sin 404, sin
redirección. Desde afuera se ve como un módulo que no carga: el store tiene las cajas, `can('caja.index')`
devuelve `true`, y no hay ni un solo `data-testid` en pantalla. Lo único que lo delata es que
`$route.matched` queda **vacío**.

Vale para cualquier spec: si un módulo aparece completamente vacío y sin errores, lo primero a mirar
es si la URL matchea una ruta, no el componente.

### 🔴 Un selector de caja vacío no significa que falte la caja: significa que está CERRADA

El select de caja de un cobro y el de un pago ofrecen **solo las cajas abiertas** (`cajas_abiertas`
en `src/mixins/vender/cajas.js`). Con las cajas cerradas el select existe, se dibuja habilitado, y
no tiene ni una opción.

Playwright lo reporta como **`did not find some options`**, que manda a revisar el nombre de la caja
o el vínculo caja ↔ método de pago. No es ninguno de los dos.

El fixture deja `Caja Efectivo` abierta desde el 31/8/2026
(`TestingFerreteriaSeeder::abrir_caja_efectivo()`), con el helper de producción y no tocando
columnas a mano: abrir una caja es crear su `apertura_caja` **y** marcarla, y una caja marcada
abierta sin apertura es un estado que en una cuenta real no existe. Las otras dos siguen cerradas a
propósito, de contraste.

### El filtro de una columna cambia de forma según el tipo de la columna

`display/table/filter/Index.vue` reparte entre varios sub-filtros según `field.type`, y los dos que
importan para una relación no se parecen:

| Tipo de la columna | Qué dibuja | testid | ¿Botón "Filtrar"? |
|---|---|---|---|
| `select` | un `<select>` | `filtro-select-<key>` | sí (`btn-aplicar-filtro-<key>`) |
| `search` | un **buscador** con su modal | `filtro-search-<key>` | **no**: elegir ya aplica el filtro |

La columna "Proveedor" del listado de artículos es `type: 'search'` (ver `src/models/article.js`),
así que va por la segunda fila: `search_and_select(page, 'filtro-search-provider_id', ...)` y nada
de botón.

🔴 Ese buscador **tampoco tenía `id`**, así que publicaba `data-testid="provider"` — el nombre del
*modelo relacionado*. Es la tercera vez que aparece la misma caída al `model_name`, y por eso la
regla del `id` explícito en cada `search-component` está escrita más arriba.

### 🔴 La tabla de movimientos de stock trae solo los ÚLTIMOS 10

`store/article/stock_movement.js` arranca con `ultimos_movimientos: 10`, y ese número viaja en la
propia URL del endpoint (`stock-movement/{article_id}/{ultimos_movimientos}/{concepto_id}`). O sea
que la lista está **capada**, y el usuario puede cambiar el número desde la nav del modal.

Consecuencia para un spec: **contar movimientos no es una señal estable**. Un artículo del fixture
pasa los 10 después de unas pocas corridas y desde ahí el conteo deja de crecer: un test que mida
"cuántos movimientos agregó esta compra" empieza a dar 0 y acusa a la compra de no haber movido
nada. Pasó el 31/8/2026 con "Pinza", que ya llevaba 13.

Lo que sí es estable es mirar el **primer** movimiento, que es el más nuevo. Y para afirmar que algo
**no** movió stock, la señal correcta es el delta del stock del artículo, no la ausencia de una fila.

### 🔴 En el listado los filtros se abren en un MODAL, y elegir el valor no lo cierra

La vista del listado pasa `show_filter_modal`, así que el panel de filtros de una columna es
`#filter-modal-article`. Elegir el proveedor **aplica el filtro pero deja el modal abierto**, y
desde ahí todo lo que se clickee falla con *"subtree intercepts pointer events"* nombrando a ese
modal.

Lo cruel es cuándo aparece: no al filtrar —eso anda— sino varios pasos después, al tocar otra cosa
(el dropdown de la masiva, en este caso), así que el error manda a mirar el elemento equivocado. Hay
que cerrarlo explícitamente y esperar a que se vaya.

### 🔴 Elegir el valor de un filtro NO filtra: hay que apretar "Filtrar"

El modal de filtros del listado tiene **dos botones** en el pie, y no son intercambiables — lo
explica el propio componente (`display/table/filter/FilterModal.vue`):

| Botón | testid | Qué hace |
|---|---|---|
| Agregar filtro | `btn-modal-agregar-filtro` | Guarda el criterio y **no** busca |
| Filtrar | `btn-modal-filtrar` | Sale a buscar con **todo lo acumulado** |

Cerrar el modal sin apretar ninguno deja el criterio cargado y **el listado sin filtrar**. Y el
engaño es bueno: el botón de limpiar el filtro de esa columna (`btn-limpiar-filtro-<key>`) **igual
aparece**, porque mira si el filtro tiene valor, no si llegó a correr. Desde afuera se ve filtrado.

Lo que delata el problema aparece tres pasos más adelante y no se parece en nada a la causa: la
opción **"Actualizar" de la masiva sigue deshabilitada**, porque el store todavía tiene
`filtered_without_filter_form` en `true` — el flag que sólo se apaga cuando el filtrado corre de
verdad. Costó una corrida entera perseguir eso creyendo que el problema estaba en el dropdown.

**Regla:** la condición observable de "el listado está filtrado" NO es que aparezca el botón de
limpiar. Lo más directo es mirar **los datos**: que todas las filas visibles sean del valor
filtrado. Y hay que reintentarlo, porque la grilla se recarga por su cuenta después del filtro y lo
que se espera es que TERMINE de recargarse.

Esto costó una corrida entera: el spec leía la línea de base con el botón de limpiar ya visible pero
la grilla todavía sin refrescar, se llevaba artículos de otros proveedores, y fallaba varios pasos
después sobre *"Pata de cama"* — un artículo de Rosario que nunca tuvo que haber estado ahí. El
mensaje acusaba a la actualización masiva de no haber aplicado el aumento, cuando la masiva había
hecho exactamente lo correcto sobre el conjunto correcto.

### El modal de la actualización masiva también tiene grupos, y abre en el primero

`opciones-filtrados-seleccion/Update.vue` reparte los campos en los mismos grupos que el formulario
del modelo (Datos generales · Precio · Stock · Categoría · Tienda online) y **sólo renderiza los del
grupo activo**, igual que `ModelForm`. Abre siempre en el primero.

O sea que buscar `masiva-campo-cost` o `masiva-campo-online` recién abierto el modal se va en
timeout apuntando a un campo que existe en el modelo y no en la pantalla. Hay que cambiar de grupo
primero.

⚠️ Y no sirve `abrir_pestania()` de `helpers/formulario.js`: ese helper se acota a
`#<model_name>___BV_modal_outer_`, y este modal **no se llama como el modelo** — se llama
`article-update-models`. Acotarlo importa igual, porque la nav del módulo que quedó detrás usa el
mismo componente y los mismos `nav-item-<nombre>`.

### 🔴 El entorno e2e necesita un WORKER DE COLA, y sin él nada avisa

Varias acciones del sistema **no se ejecutan en el request**: lo encolan y responden 200 al toque.
La más visible es la **actualización masiva del listado**, que dispara un `ProcessMasiveUpdateJob`
(el log de la API lo dice con todas las letras: *"actualizacion masiva encolada"*).

Sin un worker corriendo, el job queda en `pending` **para siempre**: la petición vuelve 200, la
pantalla no muestra ni un error, y los costos simplemente no cambian. Un spec que verifique el
resultado falla acusando a la masiva de no aplicar nada, y lo primero que uno revisa es el
formulario — que está perfecto. Lo que lo delata es mirar la fila de `masive_updates` en la base y
verla en `pending`, o la tabla `jobs` con el trabajo esperando.

Además de los dos servidores, entonces:

```
cd <slot>\empresa-api; $env:APP_ENV='testing'; php artisan queue:work --tries=1
```

`e2e/setup-slot.ps1` lo imprime junto con los otros dos desde el 31/8/2026.

**Y los specs que disparan una acción encolada tienen que ESPERARLA**, no verificar de una: la
verificación va adentro de un `expect(...).toPass()` que vuelve a leer hasta que el job terminó.
Esos tests llevan su propio `test.setTimeout()` más alto, y eso está justificado por una causa
entendida — no es tapar lentitud de la interfaz.

### 🔴 Un spec que carga FLETE contamina para siempre los articulos de esa compra

Un costo extra prorrateado deja un `article_surchage` de transporte **grabado en el articulo**, que
sobrevive a la compra — lo dice el manual: *borrar el costo extra no borra el recargo que ya quedo
grabado en el articulo*. O sea que el articulo queda con un costo real distinto para siempre.

Consecuencia entre specs: **un spec que carga flete no puede compartir articulos con uno que afirme
costos absolutos**. Paso el 31/8/2026 en la primera corrida de la suite completa:
`circuito-compra.spec.js` usaba "Pinza", y `compra-costeo-facturacion.spec.js` --que afirma que el
costo real de "Pinza" es 855-- lo veia en 1141,98. El mensaje ("costo real del articulo 2") no
apuntaba a ningun lado, y el spec acusado no tenia nada mal.

Se resolvio sacando "Pinza" del circuito con flete. Vale la pena tenerlo presente al agregar specs:
de los articulos del proveedor "Buenos Aires", **"Pinza" es el unico con expectativas absolutas de
otro spec**.

### 🔴 Un importe deterministico se repite entre corridas: buscar por valor agarra el registro viejo

`circuito-compra.spec.js` carga siempre la misma compra, asi que su total es **identico en todas las
corridas**. Cuando el spec del pago buscaba el movimiento de cuenta corriente "cuyo haber es el
total", a partir de la segunda corrida habia varios candidatos y se quedaba con el primero — el de
una corrida vieja, cuyo saldo acumulado es otro.

El rojo dice *"el pago tenia que bajar el saldo acumulado"* con dos numeros que no se parecen en
nada, y manda a revisar la cuenta corriente. Está perfecta: lo que estaba mal era la busqueda.

**Regla:** cuando se busca un registro por un valor que puede repetirse entre corridas, hay que
desempatar por el id mas alto (o guardarse el id de la respuesta del POST). Vale para pagos, ventas,
comprobantes: todo lo que este harness crea con datos fijos.

⚠️ `compra-costeo-facturacion.spec.js` tenia el mismo bug LATENTE desde que se escribio, y recien
aparecio el 31/8/2026 --en la primera corrida de la suite completa que llego hasta ahi con historia
suficiente--. Es la clase de rojo que no se puede reproducir en una base recien sembrada: aparece
solo, mucho despues, y culpa al sistema.
