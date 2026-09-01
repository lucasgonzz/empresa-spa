/**
 * Guiones de los tours de la sección S1 — LISTADO.
 *
 * Nueve clips: 1.1, 1.2, 1.2-mt, 1.3, 1.4, 1.5, 1.6, 1.7 y 1.8. Cada uno acompaña al lead a hacer,
 * con sus propios datos, exactamente lo que el video le acaba de explicar.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * POR QUÉ HAY PASOS CON `selector` Y NO CON `ancla`
 *
 * El motor admite las dos formas y prefiere `ancla` (el contrato `data-tour`). Acá se usa
 * `selector` en los casos donde el identificador **ya existe, es estable y no se lo puso nadie
 * para el tour**, porque anclarlos a mano obligaría a tocar `common-vue`, que se despliega a los
 * ~40 clientes reales. Son tres familias:
 *
 * 1. `#form-group-<key>` — lo arma `ModelForm.vue` para CADA campo de CADA modelo. Sirve para
 *    anclar un campo del formulario sin tocar el modelo ni el componente.
 * 2. `[data-testid="nav-item-<grupo>"]` — lo arma `horizontal-nav/Index.vue` para cada pestaña de
 *    grupo del formulario. Es cómo se llega a la solapa "Precio".
 * 3. `#<id-del-modal> .modal-content` — el `id` que ya lleva cada `b-modal`.
 *
 * 🔴 Sobre el punto 3, que es lo menos obvio: un `data-tour` puesto sobre un `<b-modal>` **no le
 * sirve al motor**. `BModal` declara `inheritAttrs: false` y baja los atributos sueltos al div
 * EXTERIOR del portal, que es `position: absolute` y mide 0x0 (adentro solo tiene cosas `fixed`).
 * `buscar_visible()` descarta todo lo que mida menos de 2px de lado, así que ese anclaje nunca se
 * encuentra. El `id` del `b-modal`, en cambio, cae en el `.modal` de verdad, y `.modal-content` es
 * la tarjeta blanca — que es lo que hay que resaltar. Vale para `listado.modal_articulo`,
 * `listado.modal_lista_precio` y todos los demás modales del contrato.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * PASOS PUENTE ANTES DE CAMBIAR DE RUTA (clips 1.3 y 1.5)
 *
 * 🔴 El motor prepara el paso siguiente EN PARALELO con el actual (`enganchar_paso` llama a
 * `preparar_el_siguiente()` apenas se muestra el paso), y preparar incluye `ir_a()`. O sea que un
 * paso que declara otra `ruta` **navega apenas se dibuja el paso anterior**, no cuando el lead
 * termina con él. Para que eso no le arranque la pantalla de abajo de los pies, los dos clips que
 * saltan de vista meten antes un paso puente: un "ahora te llevo a X". Así la navegación anticipada
 * deja de ser un defecto y pasa a ser lo que el paso anuncia.
 *
 * ⚠️ Un paso puente avanza con `'siguiente'`, EXPLÍCITO, y no con `'aparece'`. El motor no puede
 * detectar la aparición del elemento del paso que viene, porque ese elemento vive en otra ruta y lo
 * que lo haría aparecer es justamente el avance que estaría esperando. Desde el 31/8/2026 el motor
 * lo detecta y le devuelve el botón igual, pero declararlo es lo honesto: es lo que va a hacer.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * PASOS QUE PUEDEN NO EXISTIR
 *
 * El motor saltea solo los pasos cuyo elemento no aparece, así que no hay ramas por configuración.
 * Los condicionales de esta sección, para que se entienda por qué están escritos igual:
 *
 * - Con listas de precio prendidas, `percentage_gain`, `price` y el checkbox de margen del
 *   proveedor tienen `if_has_not_extencions` y NO se dibujan (clips 1.1 y 1.2).
 * - Con `ventas_en_dolares` prendida, `OptionsPriceType` no se monta (clip 1.3).
 * - Sin la extensión `costo_en_dolares` no existe el checkbox de costo en dólares (clip 1.4).
 * - `listado.campo_nombre` vive en la rama `v-else` de `NameInput.vue`: en un artículo sin código
 *   de barras ni código de proveedor lo que se dibuja es el buscador, no el textarea (clip 1.1).
 * - El bloque de "artículos sin imagen" solo existe si el lote dejó descartes (clip 1.7).
 * - El selector de hoja del Excel solo aparece si el libro tiene más de una (clip 1.8).
 */

/** Ruta del Listado de artículos. La comparten ocho de los nueve clips. */
const RUTA_LISTADO = { name: 'article' }

/** El ABM de listas de precio, adonde salta el clip 1.3. */
const RUTA_TIPOS_DE_PRECIO = { name: 'abm', params: { view: 'precios', sub_view: 'tipos-de-precio' } }

/** La configuración general, adonde salta el clip 1.5 a buscar la cotización del dólar. */
const RUTA_CONFIGURACION = { name: 'configuration', params: { view: 'general' } }

/** El modal de formulario de artículo (`b-modal :id="model_name"` de `model/Index.vue`). */
const MODAL_ARTICULO = '#article .modal-content'

/** El modal de formulario de una lista de precio, en el ABM. */
const MODAL_LISTA_PRECIO = '#price_type .modal-content'

/** El desglose del precio (`components/common/PriceDescription.vue`). */
const MODAL_CALCULO_PRECIO = '#final-price-description .modal-content'

/** La solapa "Precio" del formulario de artículo. */
const PESTANA_PRECIO = '[data-testid="nav-item-Precio"]'

/**
 * El input del modal de búsqueda de PROVEEDOR del formulario de artículo.
 *
 * 🔴 El id no es un invento: se arma en cuatro saltos y los cuatro están verificados en el código.
 *
 * 1. `common-vue/components/model/ModelForm.vue:109-114` dibuja el buscador de la relación con
 *    `<field-search-input :model_name="model_name">` — para el formulario de artículo, `'article'`.
 * 2. `common-vue/components/model/form/FieldSearchInput.vue:5` le pasa al buscador
 *    `:id="model_name + '-' + prop.key"`, y `models/article.js:85` declara `key: 'provider_id'`:
 *    o sea `article-provider_id`.
 * 3. `common-vue/components/search/Index.vue:296` resuelve `_id` como ese `id`.
 * 4. `common-vue/components/search/Modal.vue:23` arma el input del modal con
 *    `:input_id="_id + '-search-modal-input'"`, y `view/header/buscador-general/Index.vue:39` lo
 *    baja al `<input :id="input_id">`.
 *
 * Se usa un `selector` y no un `data-tour` nuevo justamente por eso: el identificador ya existe, es
 * estable, y ponerle un ancla obligaría a tocar `common-vue`, que se despliega a los ~40 clientes.
 */
const BUSCADOR_PROVEEDOR = '#article-provider_id-search-modal-input'

/**
 * El input del modal de búsqueda que abre el filtro por columna de PROVEEDOR de la tabla.
 *
 * ⚠️ **No es el mismo id que el del formulario, y copiarlo sería un paso muerto.** El buscador del
 * filtro no recibe `id` (`common-vue/components/display/table/filter/Search.vue:6-11` monta el
 * `<search-component>` solo con `:model_name="modelNameFromRelationKey(filter)"`), así que
 * `search/Index.vue:296` cae a su respaldo y `_id` termina siendo el **nombre del modelo**:
 * `modelNameFromRelationKey` (mixins/generals.js:809-819) le saca los tres caracteres de `_id` a
 * `provider_id` y devuelve `provider`.
 */
const BUSCADOR_PROVEEDOR_EN_FILTRO = '#provider-search-modal-input'

/**
 * La FLECHITA del botón "Crear" del Listado, o sea el toggle del desplegable.
 *
 * 🔴 No es lo mismo que `listado.boton_crear_articulo`, y confundirlos le costaba un artículo de más
 * al lead. Ese ancla está puesta sobre el `<b-dropdown split>` **entero**
 * (`common-vue/components/horizontal-nav/ExcelDropDown.vue:75-76`), y la mitad izquierda de un
 * `split` no despliega nada: llama derecho a `call_set_model()` y abre el formulario de un artículo
 * nuevo. Un paso que resalta el botón completo y dice "abrí el menú" tiene el 50% de la superficie
 * haciendo lo contrario. Lo reportó Lucas el 1/9/2026 sobre el clip 1.8.
 *
 * El toggle es un `<button>` aparte que BootstrapVue dibuja adentro del mismo div: en `split`,
 * `dropdown.js` le agrega la clase `dropdown-toggle-split`
 * (`node_modules/bootstrap-vue/src/components/dropdown/dropdown.js:88-96` y el `$toggle` del
 * `render`). Y el div de afuera lleva `:id="'dropdown_'+model_name"`, o sea `#dropdown_article`.
 * Se llega con un `selector` y **sin tocar `common-vue`**, que es la condición.
 */
const FLECHITA_CREAR = '#dropdown_article .dropdown-toggle-split'

/**
 * La primera fila de la tabla de artículos.
 *
 * `Tr.vue` le pone a cada fila `data-testid="<modelo>-row-<id>"`, así que el prefijo alcanza para
 * agarrarla sin saber el id, y `buscar_visible()` del motor devuelve la primera que se pueda
 * señalar — o sea, la primera a la vista.
 *
 * 🔴 Sirve para los pasos que dicen "abrí un artículo". Anclarlos a `listado.tabla`, como estaban
 * hasta el 31/8/2026, dibujaba un recuadro del tamaño de la pantalla que no señalaba nada: Lucas
 * lo reportó sobre el paso 2 del clip 1.4 —"me dice 'abrí uno' y no se entiende qué es lo que me
 * señala para abrir"—, pero el mismo paso está en cinco tours más.
 */
const PRIMERA_FILA = '[data-testid^="article-row-"]'

/**
 * Cuánto se le da a la IA para contestar, en los pasos del clip 1.8.
 *
 * El análisis del Excel recorre el archivo entero y llama a Claude: con un archivo chico —que es
 * el que pide la precondición del clip— vuelve en decenas de segundos, no en dos.
 */
const TECHO_IA = 90000

/** Lo que tarda el resumen de imágenes inteligentes en llegar por Pusher (10-15 s medidos). */
const TECHO_PUSHER = 30000

/** Una búsqueda con filtros contra la API, con el tope de 3.000 registros del clip 1.6. */
const TECHO_BUSQUEDA = 25000

export default {

	/**
	 * CLIP 1.1 — Crear un artículo.
	 *
	 * Precondición: un proveedor buscable por API y al menos una alícuota de IVA en el store.
	 */
	'1.1': {
		ruta: RUTA_LISTADO,
		pasos: [
			{
				ancla: 'listado.contenedor',
				/* Sin "igual que en el video": el tour se puede disparar solo, sin que el lead haya
				 * mirado el clip, y un cartel que da eso por hecho arranca hablando de algo que no
				 * pasó. */
				texto: 'Este es tu catálogo. Vamos a meterle un artículo a mano, de punta a punta.',
				avanza: 'siguiente',
			},
			{
				/**
				 * 🔴 Le pide el camino corto —apretar "Crear"— y no abrir el menú, y es un arreglo,
				 * no una simplificación.
				 *
				 * El botón es un `<b-dropdown split>`: la mitad izquierda llama derecho a
				 * `call_set_model()` y abre el formulario sin desplegar nada. La versión anterior de
				 * este paso mandaba al lead a abrir el menú y elegir "Nuevo artículo", y ahí el
				 * cartel del tour —que va con `z-index: 1000000000`, más que cualquier
				 * `.dropdown-menu` de Bootstrap— le caía justo encima de esa opción. Lo reportó
				 * Lucas el 31/8/2026: "el desplegable aparece debajo de la tarjeta del tour y no
				 * puedo presionar".
				 *
				 * El `lado: 'right'` es la otra mitad del arreglo, también sugerida por él: aunque
				 * el lead abra el menú igual (el gesto vale, el paso avanza cuando aparece el
				 * formulario), el cartel ya no lo tapa. El motor lo elige solo para cualquier
				 * desplegable, pero acá queda declarado porque es el paso donde se midió.
				 */
				ancla: 'listado.boton_crear_articulo',
				texto: 'Tocá el botón "Crear". Se abre el formulario de un artículo nuevo.',
				avanza: 'aparece',
				lado: 'right',
			},
			{
				selector: MODAL_ARTICULO,
				texto: 'Este es el formulario. Son cuatro datos y el artículo queda cargado.',
				avanza: 'siguiente',
			},
			{
				/* `#form-group-bar_code` en vez de un `data-tour` nuevo: el contenedor del campo ya
				 * lo arma ModelForm y sirve igual para el clic, que sobre el input suelto no
				 * siempre se reconoce. */
				selector: '#form-group-bar_code',
				/* El "o tipealo" no es un adorno: la precondición del clip pide un lector, y el lead
				 * que lo está probando desde su casa no tiene ninguno. Escribir el código y dar Enter
				 * dispara el mismo `change` con el que el motor avanza, así que el camino existe: lo
				 * único que faltaba era decírselo. */
				texto: 'Escaneá el código de barras — o tipealo a mano y dale Enter. Al salir del campo, el sistema chequea solo que no lo tenga otro artículo.',
				avanza: 'clic',
			},
			{
				/* El texto ya no da a entender que el tour avanza solo al escribir: desde el
				 * 1/9/2026 este paso dibuja "Siguiente" como todos (ver `botones_de()` del motor),
				 * así que el lead decide cuándo terminó. Avanza igual con el `change` del campo. */
				ancla: 'listado.campo_nombre',
				texto: 'Poné el nombre del artículo. Cuando termines, salí del campo o seguí con el botón.',
				avanza: 'clic',
				espera_ms: 250,
			},
			{
				/**
				 * 🔴 El proveedor se parte en DOS pasos desde el 1/9/2026, y el que estaba antes
				 * queda explicado acá porque su razón sigue siendo cierta.
				 *
				 * El paso viejo era uno solo y avanzaba con el botón ("Tocá acá, poné parte del
				 * nombre y dale Enter. Cuando lo elijas, seguí"), porque al tocar el buscador se
				 * abre un SEGUNDO modal encima del formulario y el elemento del paso siguiente ya
				 * está en el DOM detrás: con `'aparece'` el tour se adelantaba antes de que el lead
				 * eligiera el proveedor. Eso sigue siendo verdad y por eso el paso siguiente NO
				 * avanza por aparición.
				 *
				 * Lo que cambió es que un solo cartel encadenaba cuatro acciones —abrir, escribir,
				 * buscar, elegir— y el lead se quedaba pensando qué nombre poner. Ahora este paso
				 * pide sólo el clic y el que sigue explica qué escribir, ya adentro del modal.
				 */
				ancla: 'listado.campo_proveedor',
				texto: 'El proveedor no se escribe acá: se busca. Tocá el campo.',
				avanza: 'aparece',
			},
			{
				/**
				 * `avanza: 'desaparece'`: el gesto que termina este paso es elegir de la lista de
				 * resultados, y eso **cierra el modal** (`search/Modal.vue::emitSetSelected`, que
				 * llama `$bvModal.hide`). No sirve `'clic'` —el clic cae en un renglón de resultados,
				 * no en el input que el paso resalta— ni `'aparece'` —lo que viene después es un
				 * campo del formulario que ya estaba en el DOM, tapado por este modal—.
				 *
				 * El "si no aparece, Enter de nuevo" es real y sale del código: el primer Enter
				 * busca, y el segundo, sin resultado seleccionado, crea el modelo al vuelo
				 * (`search/Modal.vue::seleccionar_resultado` → `saveIfNotExist`, que está prendido
				 * porque `article.js` no declara `save_if_not_exist: false` para el proveedor).
				 * Decirlo saca la duda de "qué escribo": cualquier nombre sirve.
				 */
				selector: BUSCADOR_PROVEEDOR,
				texto: 'Escribí el nombre de un proveedor tuyo y dale Enter. Si no aparece en la lista, dale Enter otra vez y se crea en el momento. Después elegilo.',
				avanza: 'desaparece',
				/* `foco: true` porque el foco automático se limita a los pasos que avanzan por carga
				 * y este avanza por desaparición: acá hay que escribir, así que se pide explícito.
				 * El modal ya se enfoca solo a los 100 ms (`search/Index.vue::callSearchModal`); esto
				 * lo vuelve a hacer cuando el cartel aparece, que es varios cientos de ms después. */
				foco: true,
				espera_ms: 200,
			},
			{
				selector: '#form-group-apply_provider_percentage_gain',
				texto: 'Si tu proveedor tiene un margen cargado en su ficha, prendé esto y el artículo lo toma de ahí.',
				avanza: 'clic',
				espera_ms: 400,
			},
			{
				selector: PESTANA_PRECIO,
				texto: 'Ahora andá a la pestaña Precio.',
				avanza: 'clic',
			},
			{
				ancla: 'listado.campo_costo',
				texto: 'Dos campos de costo: el de tu factura y el otro. Cargá el que tengas a mano, que el otro se completa solo.',
				avanza: 'clic',
				espera_ms: 300,
			},
			{
				ancla: 'listado.campo_margen',
				texto: 'Y el margen que le querés ganar.',
				avanza: 'clic',
			},
			{
				ancla: 'listado.campo_precio_manual',
				texto: 'Mirá: el precio manual quedó bloqueado. Mientras haya margen, el precio lo calcula el sistema.',
				avanza: 'siguiente',
			},
			{
				ancla: 'listado.boton_guardar_articulo',
				texto: 'Guardá y cerrá.',
				avanza: 'clic',
			},
			{
				selector: PRIMERA_FILA,
				texto: 'Ahí está, arriba de todo, con el precio ya calculado.',
				avanza: 'siguiente',
				espera_ms: 600,
			},
		],
	},

	/**
	 * CLIP 1.2 — Cómo se forma el precio: costo real, margen, IVA.
	 *
	 * Precondición: cuenta Responsable Inscripto con `usar_condicion_fiscal_en_costeo`, y un
	 * artículo con descuentos Y recargos de proveedor (si `cost == costo_real` no hay nada que
	 * mostrar).
	 *
	 * 🔴 Pedir la explicación del precio RECALCULA Y GUARDA (`FinalPrice.vue` corre `setFinalPrice`
	 * con `guardar_cambios` y encola sincronizaciones a ML y TiendaNube): este tour escribe en la
	 * base del lead. Está previsto, pero no es un tour de solo lectura.
	 */
	'1.2': {
		ruta: RUTA_LISTADO,
		pasos: [
			{
				selector: '#btn_filter_cost',
				ancestro: 'th',
				texto: 'Esta es la columna de costo base. Unas columnas más a la derecha está el precio final: entre una y la otra pasan varias cosas.',
				avanza: 'siguiente',
			},
			{
				selector: PRIMERA_FILA,
				texto: 'Abrí un artículo cualquiera: un clic en la fila.',
				avanza: 'aparece',
			},
			{
				selector: PESTANA_PRECIO,
				texto: 'Entrá a la pestaña Precio.',
				avanza: 'clic',
			},
			{
				ancla: 'listado.campo_costo',
				texto: 'Este es el costo que te pasa tu proveedor. Ojo: no es lo que te costó a vos.',
				avanza: 'siguiente',
				espera_ms: 300,
			},
			{
				selector: '#form-group-costo_real',
				texto: 'A ese costo se le restan los descuentos de tu proveedor y se le suman los gastos. Esto que queda es tu costo real.',
				avanza: 'siguiente',
			},
			{
				ancla: 'listado.campo_margen',
				texto: 'Sobre el costo real va tu margen. Cargalo.',
				avanza: 'clic',
			},
			{
				/* El aviso no es de más: `FinalPrice.vue` corre `setFinalPrice` con `guardar_cambios`
				 * y encola las sincronizaciones a ML y TiendaNube, o sea que pedir la explicación
				 * GUARDA el artículo del lead. El comentario del guion ya lo decía; el lead no se
				 * enteraba por ningún lado. */
				ancla: 'listado.boton_explicacion_precio',
				texto: 'Ahora tocá el signo de pregunta. Ojo: pedir la explicación recalcula el precio de este artículo y lo guarda.',
				avanza: 'clic',
			},
			{
				/* El modal se abre ANTES de tener la respuesta y muestra un spinner en el medio, así
				 * que se ancla el contenedor y nunca un renglón del desglose. */
				selector: MODAL_CALCULO_PRECIO,
				texto: 'Ahí lo tenés renglón por renglón: costo base, cada descuento, cada recargo, el margen, el IVA y el redondeo.',
				avanza: 'siguiente',
				espera_ms: 300,
				techo_ms: 20000,
			},
		],
	},

	/**
	 * CLIP 1.2-mt — El precio siendo monotributista.
	 *
	 * Mismos anclajes que 1.2: NO hay valores con sufijo `_mt`. Cambian solo los textos, y no se
	 * nombra el IVA en ningún paso —es la regla del clip—.
	 *
	 * Precondición: `owner.condicion_iva_precios == 'MT'` (sale del OWNER, no del usuario que mira)
	 * y listas de precio apagadas. En MT `CostInput` dibuja un solo campo de costo; por eso el
	 * anclaje es el contenedor y no un input, y el mismo valor sirve para las dos condiciones.
	 */
	'1.2-mt': {
		ruta: RUTA_LISTADO,
		pasos: [
			{
				selector: PRIMERA_FILA,
				texto: 'Abrí un artículo: un clic en la fila.',
				avanza: 'aparece',
			},
			{
				selector: PESTANA_PRECIO,
				texto: 'Entrá a la pestaña Precio.',
				avanza: 'clic',
			},
			{
				ancla: 'listado.campo_costo',
				texto: 'Un solo campo de costo. Cargás el número que te pasa tu proveedor, tal cual.',
				avanza: 'clic',
				espera_ms: 300,
			},
			{
				selector: '#form-group-costo_real',
				texto: 'A ese número se le restan los descuentos y se le suman los gastos. Lo que queda es tu costo real.',
				avanza: 'siguiente',
			},
			{
				ancla: 'listado.campo_margen',
				texto: 'Le ponés tu margen y el precio sale solo.',
				avanza: 'clic',
			},
			{
				ancla: 'listado.boton_explicacion_precio',
				texto: 'Tocá el signo de pregunta.',
				avanza: 'clic',
			},
			{
				selector: MODAL_CALCULO_PRECIO,
				texto: 'Te abre el cálculo renglón por renglón, con el número de cada paso.',
				avanza: 'siguiente',
				espera_ms: 300,
				techo_ms: 20000,
			},
		],
	},

	/**
	 * CLIP 1.3 — Múltiples listas de precios.
	 *
	 * Arranca en el Listado y salta al ABM de listas de precio.
	 * Precondición: extensión de listas prendida, al menos DOS `price_type`, y un cliente con
	 * `price_type_id` para que la lista signifique algo.
	 */
	'1.3': {
		ruta: RUTA_LISTADO,
		pasos: [
			{
				selector: PRIMERA_FILA,
				texto: 'Abrí un artículo con un clic en la fila: tiene un precio por cada lista.',
				avanza: 'aparece',
			},
			{
				/* Las tarjetas de lista se insertan después de `costo_real`, o sea que viven en la
				 * solapa Precio: sin este paso el resto del clip no tiene dónde dibujarse. */
				selector: PESTANA_PRECIO,
				texto: 'Entrá a la pestaña Precio.',
				avanza: 'clic',
			},
			{
				ancla: 'listado.tarjeta_lista_precio',
				texto: 'Cada lista tiene su propio margen. Tocá el de la mayorista.',
				avanza: 'clic',
				espera_ms: 300,
			},
			{
				ancla: 'listado.opciones_lista_precio',
				texto: 'Acá elegís si cargás el margen y el sistema calcula el precio, o al revés.',
				avanza: 'siguiente',
			},
			{
				ancla: 'listado.boton_guardar_articulo',
				texto: 'Guardá: cambia solo el precio de esa lista, el resto queda como estaba.',
				avanza: 'clic',
			},
			{
				/* Paso puente: el paso siguiente cambia de ruta y el motor navega apenas se dibuja
				 * ESTE cartel. Anunciarlo es lo que hace que el salto se lea como parte del tour. */
				ancla: 'listado.contenedor',
				texto: 'Ahora te llevo a las listas de precio, para que veas de dónde sale ese margen.',
				avanza: 'siguiente',
			},
			{
				selector: '#table-price_type',
				ruta: RUTA_TIPOS_DE_PRECIO,
				texto: 'Abrí la lista mayorista.',
				avanza: 'aparece',
			},
			{
				selector: MODAL_LISTA_PRECIO,
				ruta: RUTA_TIPOS_DE_PRECIO,
				texto: 'Este es el margen por defecto de la lista: el que se le pone a todo artículo nuevo.',
				avanza: 'siguiente',
			},
			{
				selector: '#form-group-update_existing_articles_percentage_mode',
				ruta: RUTA_TIPOS_DE_PRECIO,
				texto: 'Y cuando lo cambiás, te pregunta qué hacer con lo que ya está cargado. La del medio respeta los precios que tocaste a mano.',
				avanza: 'siguiente',
			},
		],
	},

	/**
	 * CLIP 1.4 — Costos en dólares sobre precio único.
	 *
	 * Precondición: extensión `costo_en_dolares`, `cotizar_precios_en_dolares = 1`, y un proveedor
	 * con dólar propio distinto del general (si no, no hay nada que contar en el desglose).
	 *
	 * 🔴 **El tour arranca en la fila, no en la columna de costo, y eso es un cambio del 1/9/2026.**
	 *
	 * Hasta ese día el paso 1 anclaba la columna de costo (`#btn_filter_cost` + `ancestro: 'th'`) y
	 * decía *"estos artículos están cargados en dólares"*. Lucas lo sacó, textual: *"quiero que el
	 * primer paso no me señale la columna de la tabla diciéndome que estos artículos están cargados
	 * en dólares porque no es cierto"*. Y tenía razón por partida doble: la columna muestra el costo
	 * en pesos venga de donde venga, y qué artículo está en dólares depende de cada artículo, no del
	 * listado.
	 *
	 * ⚠️ Del anclaje viejo sobrevive esto, que sigue valiendo para el clip 1.2: las columnas de la
	 * tabla dependen de "Propiedades para mostrar", así que un paso que ancle una columna puede no
	 * encontrarla y el motor lo saltea. Anclar la tabla entera —como estaba hasta el 31/8/2026— es
	 * peor: el recuadro abarca todo y no señala nada.
	 *
	 * 🔴 **La segunda mitad del tour vuelve a abrir el artículo, y no es un rodeo.** El precio en
	 * pesos recién se cotiza al guardar, así que mirar el precio final sin haber guardado muestra el
	 * número viejo. Guardar, cerrar y volver a entrar es lo que hace que el lead vea la cotización
	 * aplicada de verdad.
	 *
	 * ⚠️ El paso que vuelve a abrir el artículo cuenta con que siga en la primera fila. Está apoyado
	 * en el store, no en la suerte: `store/__base.js:141-149` (`add`) hace `splice(index, 1, value)`
	 * cuando el modelo ya existe, o sea que un artículo EDITADO se reemplaza **en su lugar** y no se
	 * va arriba de todo (eso último es sólo para los nuevos, que entran con `unshift`). Igual es lo
	 * primero que hay que mirar si este tour se saltea el paso 6.
	 */
	'1.4': {
		ruta: RUTA_LISTADO,
		pasos: [
			{
				selector: PRIMERA_FILA,
				texto: 'Abrí un artículo: un clic en la fila.',
				avanza: 'aparece',
			},
			{
				/* `lado: 'top'`: la fila de pestañas está arriba de todo el modal y el cartel por
				 * abajo le tapaba las solapas que le siguen a "Precio". */
				selector: PESTANA_PRECIO,
				texto: 'Andá a la pestaña "Precio".',
				avanza: 'clic',
				lado: 'top',
			},
			{
				selector: '#form-group-cost_in_dollars',
				texto: 'Marcalo como costo en dólares.',
				avanza: 'clic',
				espera_ms: 300,
			},
			{
				ancla: 'listado.campo_costo',
				texto: 'Y cargá el número que te pasó el proveedor. Ese, en dólares.',
				avanza: 'clic',
			},
			{
				ancla: 'listado.boton_guardar_articulo',
				texto: 'El precio recién se cotiza cuando guardás: guardá y cerrá.',
				avanza: 'clic',
			},
			{
				/* `espera_ms` largo: el modal se cierra con el fade de 150 ms de Bootstrap y el paso
				 * avanza por la aparición de la pestaña "Precio", que es un elemento DE ESE MISMO
				 * modal. Sin el respiro, el motor lo encuentra todavía visible y le devuelve el botón
				 * al paso (ver `enganchar_avance_por_aparicion` del motor), con lo cual el lead
				 * podría pasar de largo sin reabrir nada. */
				selector: PRIMERA_FILA,
				texto: 'Ahora abrilo de nuevo: mismo clic en la fila.',
				avanza: 'aparece',
				espera_ms: 600,
			},
			{
				selector: PESTANA_PRECIO,
				texto: 'Y otra vez a "Precio".',
				avanza: 'clic',
				lado: 'top',
			},
			{
				ancla: 'listado.campo_precio_final',
				texto: 'Ahí lo tenés: el costo lo cargaste en dólares y el precio final salió en pesos, ya cotizado.',
				avanza: 'siguiente',
				espera_ms: 300,
			},
			{
				ancla: 'listado.boton_explicacion_precio',
				texto: 'Tocá el signo de pregunta: te muestra el cálculo completo.',
				avanza: 'clic',
			},
			{
				/* 🔴 El texto NO puede decir "el dólar de tu proveedor, no el general", que es lo que
				 * decía hasta el 1/9/2026: cuál de los dos se usó depende del artículo —del proveedor
				 * que tenga cargado y de si ese proveedor tiene dólar propio—, así que afirmarlo es
				 * mentir en la mitad de los casos. Lo que sí es cierto siempre, y es lo que el clip
				 * quiere mostrar, es que la cotización aparece en el desglose. */
				selector: MODAL_CALCULO_PRECIO,
				texto: 'Acá está el renglón de la cotización: el dólar que se usó para pasar tu costo a pesos.',
				avanza: 'siguiente',
				espera_ms: 300,
				techo_ms: 20000,
			},
		],
	},

	/**
	 * CLIP 1.5 — Costos en dólares sobre listas, y cambio de cotización.
	 *
	 * Arranca en el Listado y salta a Configuración. Precondición: `costo_en_dolares` Y
	 * `ventas_en_dolares`, listas de precio prendidas, y USUARIO ADMINISTRADOR — el modal de
	 * cotización tiene `v-if` sobre extensión e `is_admin`, así que para un empleado no existe en
	 * el DOM y los últimos pasos se saltean solos.
	 *
	 * 🔴 El aviso automático de variación de cotización NO se puede provocar a demanda (la
	 * referencia se re-sella con el valor vivo en cada adopción, así que la variación recién
	 * adoptada siempre da 0%). El camino que sí se puede recorrer, y el que muestra este tour, es
	 * abrir la cotización del día desde la lupa.
	 */
	'1.5': {
		ruta: RUTA_LISTADO,
		pasos: [
			{
				selector: PRIMERA_FILA,
				texto: 'Abrí un artículo con un clic en la fila: cada lista tiene su precio en las dos monedas.',
				avanza: 'aparece',
			},
			{
				selector: PESTANA_PRECIO,
				texto: 'Entrá a la pestaña Precio.',
				avanza: 'clic',
			},
			{
				ancla: 'listado.tarjeta_lista_precio',
				texto: 'Esta es una lista, con sus dos monedas.',
				avanza: 'siguiente',
				espera_ms: 300,
			},
			{
				ancla: 'listado.toggle_cotizar_desde_otra_moneda',
				texto: 'Prendé esto en la entrada de pesos: el precio en pesos va a pasar a depender del de dólares.',
				avanza: 'clic',
			},
			{
				/* Paso puente antes del salto a Configuración. Ver el comentario del encabezado. */
				ancla: 'listado.contenedor',
				texto: 'Eso queda guardado con el artículo. Ahora te llevo a Configuración, que es de donde sale la cotización.',
				avanza: 'siguiente',
			},
			{
				selector: '[data-testid="nav-item-Configuracion de precios"]',
				ruta: RUTA_CONFIGURACION,
				texto: 'Entrá a la solapa "Configuracion de precios".',
				avanza: 'clic',
			},
			{
				ancla: 'configuracion.boton_cotizacion_dolar',
				ruta: RUTA_CONFIGURACION,
				texto: 'Tocá la lupa que está al lado del valor del dólar.',
				avanza: 'clic',
				espera_ms: 300,
			},
			{
				selector: '#cotizacion-dolar .modal-content',
				ruta: RUTA_CONFIGURACION,
				texto: 'Acá tenés blue, oficial y MEP, compra y venta. Elegí la que usás vos.',
				avanza: 'siguiente',
				techo_ms: 20000,
			},
			{
				/* Adoptar una cotización no es mirar: re-cotiza el catálogo entero del lead. Se lo
				 * avisa acá, que es el único paso del tour donde puede pasar. */
				ancla: 'configuracion.lista_de_cotizaciones',
				ruta: RUTA_CONFIGURACION,
				texto: 'Recorré las tres casas y confirmá la que quieras usar. Ojo: adoptarla recalcula los precios de todo tu catálogo en dólares.',
				avanza: 'clic',
			},
		],
	},

	/**
	 * CLIP 1.6 — Actualización masiva con filtros.
	 *
	 * Precondición: un proveedor y una categoría con artículos en común, el cruce bastante por
	 * debajo de los 3.000 registros (tope duro), y permiso `article.update`.
	 *
	 * 🔴 Los resultados TIENEN que venir de los filtros por columna. Si vienen del buscador
	 * general, la opción "Actualizar" queda deshabilitada y el tour se queda sin camino: por eso
	 * los pasos 2 a 6 fuerzan el recorrido por las lupas y no por el buscador de arriba.
	 *
	 * 🔴 La lupa de cada columna vive en un contenedor con `max-width: 0; opacity: 0;
	 * pointer-events: none` que se abre recién con el hover del encabezado — y con un tour corriendo
	 * ese hover **no se puede disparar**: `driver.css` pone `.driver-active * { pointer-events: none }`
	 * sobre todo lo que no sea el elemento resaltado, y un elemento sin `pointer-events` nunca
	 * matchea `:hover`. O sea que hasta el 31/8/2026 estos pasos le resaltaban al lead un botón
	 * invisible que no había forma de hacer aparecer. Lo reportó Lucas ese día.
	 *
	 * Ahora el motor le prende `force-show` —la clase que el propio componente ya usa cuando el
	 * filtro está en uso— mientras el paso está a la vista, y los pasos anclan el `th` entero con
	 * `ancestro`, que además lo trae a la vista si la tabla estaba corrida a la derecha.
	 *
	 * El paso de lupa avanza por APARICIÓN del modal y no por clic, que es lo que perdona un clic que
	 * no cayó justo.
	 *
	 * 🔴 **La secuencia se enderezó el 1/9/2026 y es la que dictó Lucas:** elegir el proveedor →
	 * "Filtrar" → recién ahí el menú de filtrados → "Actualizar". Se sacó el paso que explicaba que
	 * "Agregar filtro" guarda el criterio y todavía no busca: era un paso que enseñaba la diferencia
	 * entre dos botones en vez de acompañar la acción, y el lead lo leía como un manual.
	 *
	 * ⚠️ **Y por eso el paso de la lupa de "Categoria" dejó de pedir un clic.** Sacado "Agregar
	 * filtro", no queda ninguna forma de cerrar el modal de filtro de una columna sin buscar, y el
	 * modal abierto tapa los encabezados de la tabla: pedirle al lead un segundo filtro lo mandaría
	 * a tocar una lupa que está detrás de un modal. El paso se queda —la lupa está en TODAS las
	 * columnas y eso es parte de lo que el clip muestra—, pero como una viñeta que se lee y se sigue,
	 * no como un gesto imposible. Encadenar dos filtros de verdad pide devolver "Agregar filtro" al
	 * guion; queda anotado por si Lucas lo quiere.
	 *
	 * 🔴 Este clip escribe datos de verdad —aumenta el costo de TODOS los artículos del filtro— y
	 * por eso el tour hace dos cosas que hasta el 31/8/2026 no hacía: se lo AVISA al lead en el
	 * paso que confirma, y termina revirtiendo el aumento desde el historial. Antes lo señalaba y
	 * no lo apretaba, así que el lead se quedaba con el aumento puesto.
	 */
	'1.6': {
		ruta: RUTA_LISTADO,
		pasos: [
			{
				ancla: 'listado.tabla',
				texto: 'Cada columna tiene su propio filtro. Se llega pasando el mouse por el encabezado: ahí aparece una lupa.',
				avanza: 'siguiente',
			},
			{
				/* Ver el ⚠️ del docblock: este paso ya NO pide un clic. La lupa de cualquier otra
				 * columna es inalcanzable mientras el modal de filtro está abierto, y sin "Agregar
				 * filtro" no hay forma de cerrarlo sin buscar. Se muestra para que el lead sepa que
				 * el filtro está en todas las columnas, y el recorrido sigue por Proveedor. */
				selector: '#btn_filter_category_id',
				ancestro: 'th',
				texto: 'La misma lupa está en todas las columnas: en "Categoria", en "Marca", en la que quieras. Nosotros vamos a filtrar por proveedor.',
				avanza: 'siguiente',
			},
			{
				/* Se ancla el `th` entero, no el botón: la lupa mide 24 px y el recuadro alrededor
				 * no le decía al lead de qué columna le estaban hablando. El motor sube del botón
				 * a la columna, la trae a la vista si la tabla estaba corrida, y le prende la clase
				 * `force-show` para que la lupa se VEA — que con el tour corriendo es la única
				 * forma, porque `driver.css` deja el `th` sin `pointer-events` y entonces el hover
				 * que la muestra no puede dispararse nunca. */
				selector: '#btn_filter_provider_id',
				ancestro: 'th',
				texto: 'Tocá la lupa del encabezado "Proveedor".',
				avanza: 'aparece',
			},
			{
				/* Este paso pedía "escribí el nombre del proveedor y elegilo de la lista" y avanzaba
				 * con el botón, pero el campo del filtro no es un input común: es el mismo buscador
				 * de relación que el formulario, y al tocarlo abre OTRO modal encima. El lead
				 * escribía en el modal de arriba mientras el cartel seguía hablando del de abajo. Se
				 * parte en dos: acá el clic, y en el paso que sigue qué escribir. */
				selector: '#filter-modal-article .modal-content',
				texto: 'El proveedor se busca, no se escribe suelto: tocá el campo de búsqueda.',
				avanza: 'aparece',
			},
			{
				/* Mismo patrón que el clip 1.1, con OTRO id: ver el comentario de
				 * `BUSCADOR_PROVEEDOR_EN_FILTRO`, que explica por qué el buscador del filtro no se
				 * llama igual que el del formulario. */
				selector: BUSCADOR_PROVEEDOR_EN_FILTRO,
				texto: 'Escribí parte del nombre del proveedor, dale Enter y elegilo de la lista.',
				avanza: 'desaparece',
				foco: true,
				espera_ms: 200,
			},
			{
				ancla: 'listado.boton_filtrar',
				texto: 'Ahora "Filtrar": sale a buscar todos los artículos de ese proveedor.',
				avanza: 'clic',
			},
			{
				/* `listado.dropdown_filtrados` tiene `v-if` sobre la cantidad de filtrados: no
				 * existe hasta que volvió la búsqueda del paso anterior. De ahí el techo largo. */
				ancla: 'listado.dropdown_filtrados',
				texto: 'Abrí el menú de filtrados.',
				avanza: 'clic',
				techo_ms: TECHO_BUSQUEDA,
			},
			{
				/* El `id` ya existe en `OptionsDropdown.vue`. Se monta en las DOS instancias del
				 * desplegable —seleccionados y filtrados—, pero solo una está abierta a la vez y el
				 * motor descarta lo que no se ve. */
				selector: '#btn_actualizar',
				texto: 'Tocá "Actualizar".',
				avanza: 'clic',
			},
			{
				/* Partido en dos: un solo cartel encadenaba cuatro acciones (grupo, campo, modo y
				 * número) y no hay forma de seguirlo sin releerlo. El mismo modal aguanta los dos
				 * pasos: los dos avanzan con el botón. */
				selector: '#article-update-models .modal-content',
				texto: 'Elegí el grupo Precio y después el campo Costo.',
				avanza: 'siguiente',
			},
			{
				/* Sin porcentaje fijo: el 12 salía del video, y acá el número lo elige el lead
				 * sobre sus propios artículos. */
				selector: '#article-update-models .modal-content',
				texto: 'Ahora el modo "Aumentar %", y el porcentaje que le quieras subir.',
				avanza: 'siguiente',
			},
			{
				selector: '#btn_send_actualizar',
				texto: 'Confirmá. No se actualizan los que ves en pantalla: se actualizan todos los del filtro, con sus precios de verdad. Enseguida lo deshacemos.',
				avanza: 'clic',
			},
			{
				/* La flechita y no el botón entero, por lo mismo que el paso 1 del clip 1.8 (ver
				 * `FLECHITA_CREAR`): `listado.boton_crear_articulo` resalta el `<b-dropdown split>`
				 * completo, y la mitad izquierda de ese botón **crea un artículo**. En un tour que
				 * acaba de hacer una actualización masiva y todavía tiene que revertirla, un
				 * formulario de artículo abierto de más es lo último que hace falta. */
				selector: FLECHITA_CREAR,
				texto: 'Abrí el menú Crear con la flechita y entrá a "Historial de actualizaciones masivas".',
				avanza: 'aparece',
				espera_ms: 800,
			},
			{
				selector: '#masive-update-history .modal-content',
				texto: 'Acá queda anotado qué se hizo, cuándo y quién. Y al lado de cada renglón, el botón para revertirlo.',
				avanza: 'siguiente',
				techo_ms: TECHO_BUSQUEDA,
			},
			{
				/* 🔴 El tour TIENE que terminar deshaciendo el aumento: si no, el lead se queda con
				 * un aumento aplicado de verdad sobre todos los artículos del filtro, que puede ser
				 * el catálogo entero. El video sí revierte.
				 *
				 * El botón "Revertir" no tiene ancla propia y no se le puede poner una desde acá:
				 * vive en `common-vue/components/horizontal-nav/MasiveUpdateHistory.vue:50-57`, que
				 * se despliega a los ~40 clientes reales. Se lo señala por el `variant` de
				 * bootstrap, que es el único `outline-danger` adentro de ese modal (el otro botón
				 * de la fila, "Detalle", es `outline-primary`).
				 *
				 * ⚠️ El orden de los renglones lo decide el servidor (`masive-update/<modelo>`) y no
				 * se puede afirmar desde acá cuál queda arriba, así que el recuadro puede caer en la
				 * fila equivocada si el lead ya tenía actualizaciones masivas hechas. Por eso el
				 * texto le pide EL renglón del aumento que acaba de hacer, en vez de decir "este".
				 * El clic avanza igual, caiga en la fila que caiga. */
				selector: '#masive-update-history .btn-outline-danger',
				texto: 'Ahora deshacelo: buscá el renglón del aumento que acabás de hacer y tocá "Revertir".',
				avanza: 'clic',
			},
			{
				/* Último paso. La confirmación es `common-vue/components/Confirm.vue`, montado por
				 * el historial con su `id` propio. Con esto los precios vuelven al valor anterior y
				 * el lead termina el tour como empezó. */
				selector: '#confirm-revert-masive-update .modal-content',
				texto: 'Confirmá y los precios vuelven al valor que tenían antes del aumento.',
				avanza: 'siguiente',
			},
		],
	},

	/**
	 * CLIP 1.7 — Imágenes inteligentes.
	 *
	 * Precondición: cuota de Google subida (el default de 10 por día no alcanza), clave de la IA
	 * viva con los workers reiniciados, una cola de verdad (con `QUEUE_CONNECTION=sync` el POST se
	 * cuelga), varios artículos sin imagen, y que el lote deje descartes para que el último paso
	 * tenga qué mostrar.
	 *
	 * ✅ Ya NO hace falta cuidar que el lead no deseleccione entre el disparo y el resumen: la
	 * escucha de Pusher, el pedido del resumen y el modal se mudaron a
	 * `components/common/AvisoImagenesAutomaticas.vue`, que se monta en `App.vue` y está siempre
	 * vivo. El disparador quedó reducido a pedir el POST.
	 */
	'1.7': {
		ruta: RUTA_LISTADO,
		pasos: [
			{
				/* 🔴 `scroll_tabla: 'inicio'` y no el centrado de siempre: la columna de imágenes es
				 * la PRIMERA de la tabla, y este paso es el que le pide al lead que mire las filas
				 * sin foto. Centrando —que es lo que hacen `traer_a_la_vista()` y, peor, el
				 * `scrollIntoView({ inline: 'center' })` de driver.js— la tabla se corre al medio y
				 * el lead termina mirando columnas de precios. Lo reportó Lucas el 1/9/2026:
				 * "el scroll de la tabla se corre y vuela al centro, eso no debe de pasar". */
				ancla: 'listado.tabla',
				texto: 'Mirá la primera columna: estas filas no tienen foto.',
				avanza: 'siguiente',
				scroll_tabla: 'inicio',
			},
			{
				/* Mismo `scroll_tabla` aunque el botón viva en el encabezado y no en la tabla:
				 * prender el modo selección agrega la columna de tildes y la tabla vuelve a
				 * moverse. El motor resuelve la tabla por `.cont-table` cuando el elemento del paso
				 * no está adentro de ningún contenedor con scroll. */
				ancla: 'listado.boton_modo_seleccion',
				texto: 'Prendé el modo selección.',
				avanza: 'clic',
				scroll_tabla: 'inicio',
			},
			{
				/* Las dos formas, y la segunda es la que vende el clip: marcar diez filas a mano se
				 * entiende solo, pero que la misma acción sirva para doscientos artículos filtrados
				 * es lo que hace que valga la pena. El paso no lo decía. */
				ancla: 'listado.tabla',
				texto: 'Marcá los artículos sin imagen. Podés tildarlos uno por uno acá, o filtrar la tabla y mandar a asignarle imagen a los 200 de una sola vez.',
				avanza: 'siguiente',
				espera_ms: 300,
				scroll_tabla: 'inicio',
			},
			{
				ancla: 'listado.dropdown_seleccionados',
				texto: 'Abrí el menú de seleccionados.',
				avanza: 'clic',
			},
			{
				/* Avanza por aparición del resumen: el lote tarda entre 10 y 15 segundos y no hay
				 * ningún clic que marque el final. */
				ancla: 'listado.opcion_imagenes_automaticas',
				texto: 'Tocá "Asignar imágenes automáticamente". En 10 o 15 segundos vuelve con el resumen.',
				avanza: 'aparece',
			},
			{
				ancla: 'listado.modal_resumen_imagenes',
				texto: 'Acá está: una IA miró cada foto candidata y decidió cuál iba y cuál no.',
				avanza: 'siguiente',
				antes: 'esperar_proceso_largo',
				techo_ms: TECHO_PUSHER,
			},
			{
				ancla: 'listado.lista_articulos_sin_imagen',
				texto: 'Y estos quedaron sin imagen. Desplegá uno y mirá por qué descartó cada foto.',
				avanza: 'clic',
			},
		],
	},

	/**
	 * CLIP 1.8 — Importar tu Excel con IA.
	 *
	 * Precondición: clave de la IA válida, y un Excel preparado para que se vea el trabajo — varias
	 * hojas, encabezado en una fila que no sea la primera, precios con puntos y comas mezclados, y
	 * códigos repetidos a propósito. El archivo tiene que ser CHICO: con uno grande, a los 20
	 * segundos el modal ofrece "Seguir en segundo plano" y el tour se queda sin pantalla.
	 *
	 * 🔴 El paso del submenú se hace con el MOUSE ENCIMA, no con un clic: `ExcelDropdownSubmenu`
	 * abre con `@mouseenter` y su toggle tiene un `@click.stop.prevent` que lo vuelve a CERRAR. Un
	 * texto que dijera "hacé clic acá" rompería el flujo sin tirar ningún error. Por eso ese paso
	 * avanza por aparición del ítem hijo.
	 *
	 * Este clip crea artículos de verdad.
	 */
	'1.8': {
		ruta: RUTA_LISTADO,
		pasos: [
			{
				/* Ver `FLECHITA_CREAR`: se ancla el toggle del desplegable y no el `<b-dropdown split>`
				 * entero, porque la mitad izquierda de ese botón crea un artículo en vez de abrir el
				 * menú. El texto es acorde: no hay forma de errarle.
				 *
				 * El avance por clic ya no se conforma con un respiro fijo: desde el 1/9/2026 el
				 * motor detecta que el elemento despliega un menú y espera a que el `.dropdown-menu`
				 * esté abierto de verdad (ver `esperar_menu_desplegado()`). Es lo que arregla que el
				 * paso siguiente se salteara porque el submenú todavía no existía. */
				selector: FLECHITA_CREAR,
				texto: 'Tocá la flechita del botón "Crear" — la de la derecha, no el botón. Se abre el menú.',
				avanza: 'clic',
			},
			{
				ancla: 'listado.submenu_importacion',
				texto: 'Pasá el mouse por encima de "Importación". No le hagas clic.',
				avanza: 'aparece',
			},
			{
				/* `open_ai_import` abre el modal en el `$nextTick` siguiente: entre este clic y el
				 * modal del paso que viene hay un tick, así que se avanza por aparición. */
				ancla: 'listado.boton_importar_excel',
				texto: 'Ahora sí: "Importar con IA".',
				avanza: 'aparece',
			},
			{
				selector: '#ai-excel-import-modal .modal-content',
				texto: 'Subí tu Excel acá.',
				avanza: 'siguiente',
			},
			{
				ancla: 'listado.selector_hoja_excel',
				texto: 'Si el archivo tiene varias hojas, te pregunta cuál. Elegí una.',
				avanza: 'clic',
				techo_ms: 20000,
			},
			{
				ancla: 'listado.deteccion_encabezado',
				texto: 'Y te dice en qué fila encontró los encabezados. El número es editable, por si se equivocó.',
				avanza: 'siguiente',
			},
			{
				ancla: 'listado.boton_analizar_con_ia',
				texto: 'Tocá "Analizar con IA".',
				avanza: 'aparece',
			},
			{
				ancla: 'listado.tabla_mapeo_columnas',
				texto: 'La IA mira tus encabezados y los valores de abajo, y te dice qué es cada columna con su nivel de seguridad. Lo dudoso queda en amarillo.',
				avanza: 'siguiente',
				techo_ms: TECHO_IA,
			},
			{
				ancla: 'listado.boton_confirmar_mapeo',
				texto: 'Confirmá el mapeo.',
				avanza: 'aparece',
			},
			{
				ancla: 'listado.tabla_interpretacion_numeros',
				texto: 'Te muestra, con ejemplos de tu propio archivo, cómo lee los precios y qué códigos vienen repetidos.',
				avanza: 'siguiente',
				techo_ms: TECHO_IA,
			},
			{
				/* Sin esta decisión el botón "Continuar" queda `:disabled`, y el paso siguiente
				 * sería un botón muerto sin ninguna explicación. */
				ancla: 'listado.politica_codigos_repetidos',
				texto: 'Decile qué hacer con los códigos que ya existen en el sistema. Hasta que no elijas, "Continuar" queda apagado.',
				avanza: 'clic',
			},
			{
				ancla: 'listado.boton_continuar_importacion',
				texto: 'Continuá.',
				avanza: 'clic',
			},
			{
				/* El aviso va acá y no antes: este es el botón que crea los artículos. */
				ancla: 'listado.boton_confirmar_importacion',
				texto: 'Y ahí sí: importá. Ojo, los artículos se crean de verdad en tu catálogo.',
				avanza: 'clic',
			},
			{
				ancla: 'listado.tabla',
				texto: 'Los artículos entran con su costo, su margen y su precio ya calculado.',
				avanza: 'siguiente',
				techo_ms: TECHO_IA,
			},
		],
	},
}
