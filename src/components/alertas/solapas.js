/**
 * Helper PURO (sin Vue, sin store, sin router) de las solapas de Alertas → Catálogo.
 *
 * Misión categorizacion-tres-modelos (5/10/2026). Alertas tenía una solapa de primer nivel
 * "Imágenes" (/alertas/imagenes). Ahora esa solapa se llama "Catálogo" y adentro lleva sub-solapas:
 *
 *   Fila 1 (view):       Cobros | Stock mínimo | Catálogo | Pedidos Proveedor | ...
 *   Fila 2 (sub_view):   Imágenes | Categorías          (solo dentro de Catálogo)
 *
 * La URL canónica es /alertas/catalogo/imagenes y /alertas/catalogo/categorias. Pero la URL vieja
 * /alertas/imagenes (con o sin `?asignacion=7&solapa=a_revisar`) sigue siendo la que usan los links
 * de "Revisar en Alertas", el historial del listado, la píldora de procesos y cualquier favorito:
 * tiene que seguir andando. Este archivo es la ÚNICA definición de "qué sub-solapa corresponde a la
 * ruta", la usan:
 *   - views/Alertas.vue                      -> normaliza la URL (`ruta_normalizada`).
 *   - .../lista-de-alertas-table/catalogo/Index.vue
 *                                            -> arma la fila 2 y decide qué sección se monta.
 *   - procesos-en-segundo-plano/Fila.vue y BatchImagesSummaryModal.vue
 *                                            -> el destino de "Ver en Alertas" (`destino_de_imagenes`)
 *                                               y el `replace` vs `push` (`es_ruta_de_imagenes`).
 * Si la regla estuviera repetida en cada uno, bastaría que uno se olvide del alias viejo para que la
 * pestaña muestre una cosa y la URL otra.
 *
 * Es el mismo patrón que components/cheques/solapas.js: HorizontalNav cambia de pestaña con un
 * `$router.push` RELATIVO, que vue-router mezcla con los params actuales y que además descarta la
 * query. Con eso, tocar "Cobros" estando en /alertas/catalogo/categorias dejaba /alertas/cobros/
 * categorias (un sub_view que Cobros no tiene). `ruta_normalizada` lo lleva a la forma válida.
 *
 * Todas las funciones toleran cualquier entrada (undefined, `[]`, una solapa inventada en la URL) y
 * NUNCA tiran excepción: en el render de Vue una excepción es una pantalla en blanco.
 */

/** `view` de la solapa de primer nivel que agrupa imágenes y categorías. */
export const VISTA_DEL_CATALOGO = 'catalogo'

/**
 * `view` que tenía la solapa Imágenes cuando era de primer nivel. Se sigue aceptando como alias:
 * ver el comentario de la cabecera.
 */
export const VISTA_VIEJA_DE_IMAGENES = 'imagenes'

/**
 * Sub-solapas del Catálogo, en el orden en que se dibujan. La PRIMERA es la que se abre cuando la
 * ruta no trae una válida (o no permitida), así que Imágenes sigue siendo lo que se ve al tocar
 * "Catálogo".
 *
 * Cada una lleva tres datos porque la URL, la pestaña y el testid se escriben distinto:
 *   - valor:  el que va en `$route.params.sub_view` y en `route_value` del ítem del nav. "Imágenes"
 *             y "Categorías" no pueden salir de `routeString(nombre)` (no saca tildes).
 *   - nombre: el texto de la pestaña.
 *   - testid: el que usa HorizontalNav para el `data-testid` (`nav-item-<testid>`).
 *
 * Para sumar Resumen, Marcas y Descripciones (Fase 2) alcanza con agregar un renglón acá y su
 * sección en catalogo/Index.vue.
 *
 * @type {Array<{valor: String, nombre: String, testid: String}>}
 */
export const SUBSOLAPAS_DEL_CATALOGO = Object.freeze([
	Object.freeze({valor: 'imagenes', nombre: 'Imágenes', testid: 'imagenes'}),
	Object.freeze({valor: 'categorias', nombre: 'Categorías', testid: 'categorias'}),
])

/** Sub-solapa a la que se cae cuando la ruta no trae una válida y permitida (la de siempre). */
export const SUBSOLAPA_POR_DEFECTO = SUBSOLAPAS_DEL_CATALOGO[0].valor

/**
 * Dice si un valor es una sub-solapa del Catálogo.
 *
 * Recorre la lista y compara con `===`, y no usa `valor in objeto` ni un acceso directo a una
 * propiedad: una URL como /alertas/catalogo/constructor o /alertas/catalogo/toString encontraría
 * propiedades heredadas de Object.
 *
 * @param {*} sub_view Valor de `$route.params.sub_view`.
 * @returns {Boolean}
 */
export function es_subsolapa_del_catalogo(sub_view) {
	if (typeof sub_view != 'string') {
		return false
	}
	for (let i = 0; i < SUBSOLAPAS_DEL_CATALOGO.length; i++) {
		if (SUBSOLAPAS_DEL_CATALOGO[i].valor === sub_view) {
			return true
		}
	}
	return false
}

/**
 * Qué sub-solapas del Catálogo puede ver una persona.
 *
 * Imágenes es para todos (como lo era la solapa de primer nivel: sin permiso que la condicione).
 * Categorías es solo para el dueño del negocio o para quien entró con el acceso maestro: elegir un
 * sistema de categorías cambia todo el catálogo, y la API contesta 403 a cualquier otro. Un
 * empleado ni la ve (`ruta_normalizada` lo lleva a Imágenes si llega por URL).
 *
 * Esto es SOLO "qué pestaña se dibuja": la autoridad sobre quién puede elegir o revisar es de la API.
 *
 * @param {*} es_dueno true si el usuario no tiene `owner_id` (computed global `is_owner`).
 * @param {*} es_acceso_maestro true si la sesión entró con la clave maestra (`auth.user.es_acceso_maestro`).
 * @returns {Array<String>} Los `valor` permitidos, en el orden de `SUBSOLAPAS_DEL_CATALOGO`.
 */
export function subsolapas_permitidas(es_dueno, es_acceso_maestro) {
	let permitidas = ['imagenes']
	if (es_dueno === true || es_acceso_maestro === true) {
		permitidas.push('categorias')
	}
	return permitidas
}

/**
 * Lleva cualquier combinación de la ruta a una que se pueda dibujar.
 *
 *   - /alertas/imagenes (alias viejo)                 -> catalogo/imagenes
 *   - catalogo con una sub-solapa válida y permitida  -> la misma
 *   - catalogo sin sub-solapa, con una inventada o
 *     que esa persona no puede ver                    -> catalogo/<la primera permitida>
 *   - cualquier otra solapa (cobros, stock-minimo...) -> la misma, sin sub_view
 *   - sin solapa (/alertas a secas)                   -> sin cambios: no se inventa un default
 *
 * El `sub_view` de las solapas que no son el Catálogo vuelve en `null`: la ruta no lleva segundo
 * nivel, y el que arrastra el push relativo de HorizontalNav sobra.
 *
 * `permitidas` es un parámetro y no una constante porque Categorías no es para todos (ver
 * `subsolapas_permitidas`). Si no es un arreglo, se toma como "solo la sub-solapa por defecto": ante
 * una entrada absurda se prefiere lo que ve cualquiera a lo que ve solo el dueño.
 *
 * @param {*} view Valor de `$route.params.view`.
 * @param {*} sub_view Valor de `$route.params.sub_view`.
 * @param {*} permitidas Lo que devuelve `subsolapas_permitidas`.
 * @returns {{view: *, sub_view: String|null}} `view` vuelve tal como llegó, salvo con el alias viejo.
 */
export function ruta_normalizada(view, sub_view, permitidas) {
	// El alias viejo: la solapa de primer nivel "Imágenes" es ahora catalogo/imagenes.
	if (view === VISTA_VIEJA_DE_IMAGENES) {
		return {view: VISTA_DEL_CATALOGO, sub_view: 'imagenes'}
	}

	// Cualquier otra solapa de primer nivel no lleva segundo nivel.
	if (view !== VISTA_DEL_CATALOGO) {
		return {view: view, sub_view: null}
	}

	/** Lo que esta persona puede ver, en el orden de las pestañas. */
	let habilitadas = []
	SUBSOLAPAS_DEL_CATALOGO.forEach(function (subsolapa) {
		if (Array.isArray(permitidas) && permitidas.indexOf(subsolapa.valor) !== -1) {
			habilitadas.push(subsolapa.valor)
		}
	})
	if (!Array.isArray(permitidas)) {
		habilitadas = [SUBSOLAPA_POR_DEFECTO]
	}

	// Una sub-solapa válida y permitida se deja como está.
	if (es_subsolapa_del_catalogo(sub_view) && habilitadas.indexOf(sub_view) !== -1) {
		return {view: VISTA_DEL_CATALOGO, sub_view: sub_view}
	}

	// Falta, es inventada o no es para esta persona: la primera que sí pueda ver. Con una lista de
	// permitidas vacía (entrada absurda) se cae en la de siempre.
	return {
		view: VISTA_DEL_CATALOGO,
		sub_view: habilitadas.length ? habilitadas[0] : SUBSOLAPA_POR_DEFECTO,
	}
}

/**
 * Dice si una ruta es Alertas → Catálogo → Imágenes, ya sea en su forma canónica
 * (/alertas/catalogo/imagenes), en la vieja (/alertas/imagenes) o en una que se normaliza a ella
 * (/alertas/catalogo a secas).
 *
 * La usan "Ver en Alertas" de la píldora de procesos y "Revisar en Alertas" del resumen de imágenes
 * para elegir `replace` o `push`: estando ya ahí, un `push` dejaba dos entradas iguales en el
 * historial (la de antes y la que deja el cierre del detalle) y el botón Atrás parecía no hacer
 * nada. Antes lo decidían con `params.view === 'imagenes'`, que con la URL canónica da falso.
 *
 * Se evalúa contra TODAS las sub-solapas: acá no importa qué puede ver la persona, solo si la URL
 * actual ya es la de destino.
 *
 * @param {*} route Un objeto de ruta de vue-router (`this.$route`): `{name, params}`.
 * @returns {Boolean}
 */
export function es_ruta_de_imagenes(route) {
	if (!route || typeof route != 'object' || route.name !== 'alertas') {
		return false
	}
	let params = route.params && typeof route.params == 'object' ? route.params : {}
	let todas = []
	SUBSOLAPAS_DEL_CATALOGO.forEach(function (subsolapa) {
		todas.push(subsolapa.valor)
	})
	let destino = ruta_normalizada(params.view, params.sub_view, todas)
	return destino.view === VISTA_DEL_CATALOGO && destino.sub_view === 'imagenes'
}

/**
 * La ubicación (para `$router.push` / `$router.replace`) de Alertas → Catálogo → Imágenes, con la
 * query que se le pida (`asignacion`, `solapa`).
 *
 * Va con `name` y `params` EXACTOS en vez de un path armado a mano: con `name`, vue-router no mezcla
 * con los params de la ruta actual.
 *
 * @param {Object} [query] Por ejemplo `{asignacion: '7', solapa: 'a_revisar'}`.
 * @returns {{name: String, params: Object, query: Object}}
 */
export function destino_de_imagenes(query) {
	return {
		name: 'alertas',
		params: {view: VISTA_DEL_CATALOGO, sub_view: 'imagenes'},
		query: query && typeof query == 'object' ? query : {},
	}
}
