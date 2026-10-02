/**
 * Helper PURO (sin Vue, sin store, sin router) de las solapas del módulo de Cheques.
 *
 * Misión cheques-solapa-endosados (2/10/2026). El módulo tiene dos filas de solapas:
 *
 *   Fila 1 (sub_view):       Recibido | Emitido | Endosado
 *   Fila 2 (sub_sub_view):   Pendientes | Disponibles para cobrar | Pronto a vencerse |
 *                            Vencidos | Cobrados | Rechazados     (solo en Recibido y Emitido)
 *
 * `Endosado` es una sola lista y no tiene segunda fila: son los cheques RECIBIDOS que salieron
 * de cartera (endosados a un proveedor o en un gasto). La copia `emitido` que nace al endosar
 * sigue en Emitido, como siempre.
 *
 * Este archivo es la ÚNICA definición de "qué lista corresponde a la ruta". La usan:
 *   - views/Cheques.vue                    -> normaliza la URL (`ruta_normalizada`).
 *   - components/cheques/Index.vue         -> decide si se puede dibujar (`solapa_es_valida`) y
 *                                             saca los ids de la solapa (`cheques_de_la_solapa`).
 *   - components/cheques/NavComponent.vue  -> arma las dos filas y sus contadores.
 *   - components/cheques/list/Index.vue    -> la lista que se muestra y su red de seguridad
 *                                             (`acotar_a_la_solapa`).
 *   - components/cheques/NavFiltrados.vue  -> el Total y el Excel del resultado filtrado, que
 *                                             usan la misma red de seguridad.
 * Si la regla estuviera repetida en cada uno, bastaría que un archivo se olvide de `endosado`
 * para que la tabla muestre una solapa y las pestañas otra.
 *
 * Todas las funciones toleran cualquier entrada (undefined, `[]`, una solapa inventada en la
 * URL) y NUNCA tiran excepción: en el render de Vue una excepción es una pantalla en blanco.
 *
 * Los `models` que lee son los que devuelve GET cheque (store `cheque`, `state.models`):
 *   { recibido: {pendientes, disponibles_para_cobrar, pronto_a_vencerse, vencidos, cobrados,
 *                rechazados, endosados},
 *     emitido:  {pendientes, ..., rechazados} }
 * Antes de cargar, el store nace como `[]` (no como objeto con esas claves).
 */

/** Solapa a la que se cae cuando la ruta no trae una válida (la de siempre). */
export const SOLAPA_POR_DEFECTO = 'recibido'

/** Estado al que se cae cuando la ruta trae la solapa pero no un estado válido. */
export const ESTADO_POR_DEFECTO = 'pendientes'

/**
 * Estados de la segunda fila para Recibido y Emitido.
 *
 * Cada uno lleva tres datos porque la API, la URL y la pestaña lo escriben distinto:
 *   - clave:  la que devuelve GET cheque en `models[solapa]` (con guion bajo).
 *   - ruta:   la que va en `$route.params.sub_sub_view` (con guion medio). Es lo que produce
 *             `routeString(nombre)` (minúsculas, espacios y guiones bajos a guion medio).
 *   - nombre: el texto de la pestaña.
 *
 * Deben reflejar las mismas claves que devuelve `models.recibido` y `models.emitido` en
 * ChequeController@index (el estado `endosados` de Recibido ya NO es una pestaña de la segunda
 * fila: pasó a ser la solapa Endosado de la primera).
 *
 * @type {Array<{clave: String, ruta: String, nombre: String}>}
 */
const ESTADOS_DE_CARTERA = Object.freeze([
	Object.freeze({clave: 'pendientes', ruta: 'pendientes', nombre: 'Pendientes'}),
	Object.freeze({clave: 'disponibles_para_cobrar', ruta: 'disponibles-para-cobrar', nombre: 'Disponibles para cobrar'}),
	Object.freeze({clave: 'pronto_a_vencerse', ruta: 'pronto-a-vencerse', nombre: 'Pronto a vencerse'}),
	Object.freeze({clave: 'vencidos', ruta: 'vencidos', nombre: 'Vencidos'}),
	Object.freeze({clave: 'cobrados', ruta: 'cobrados', nombre: 'Cobrados'}),
	Object.freeze({clave: 'rechazados', ruta: 'rechazados', nombre: 'Rechazados'}),
])

/**
 * Estados de la segunda fila por cada solapa de primer nivel. `endosado` tiene la lista vacía:
 * no se desglosa (no se pidió) y su `sub_sub_view` se ignora.
 *
 * @type {Object<String, Array<{clave: String, ruta: String, nombre: String}>>}
 */
export const ESTADOS_POR_SOLAPA = Object.freeze({
	recibido: ESTADOS_DE_CARTERA,
	emitido: ESTADOS_DE_CARTERA,
	endosado: Object.freeze([]),
})

/**
 * Dice si un valor es una solapa de primer nivel.
 *
 * Usa `hasOwnProperty` y no `solapa in ESTADOS_POR_SOLAPA` ni un acceso directo: una URL como
 * /cheques/constructor o /cheques/toString encontraría propiedades heredadas de Object.
 *
 * @param {*} sub_view Valor de `$route.params.sub_view`.
 * @returns {Boolean}
 */
export function es_solapa_de_primer_nivel(sub_view) {
	return typeof sub_view == 'string'
		&& Object.prototype.hasOwnProperty.call(ESTADOS_POR_SOLAPA, sub_view)
}

/**
 * Busca, dentro de una solapa, el estado que corresponde al segundo nivel de la ruta.
 *
 * La comparación es exacta contra la forma de la URL (`ruta`, con guion medio): una forma con
 * guion bajo (`disponibles_para_cobrar`) NO cuenta como válida y `ruta_normalizada` la manda a
 * Pendientes (no a la forma canónica). Ningún link interno genera esa forma: solo la podría
 * traer un favorito escrito a mano. Lo que importa es que la pestaña activa (que compara contra
 * `routeString(nombre)`) siempre coincida con la URL.
 *
 * @param {*} sub_view Solapa de primer nivel.
 * @param {*} sub_sub_view Valor de `$route.params.sub_sub_view`.
 * @returns {{clave: String, ruta: String, nombre: String}|null} El estado, o null si la solapa
 *   no existe, no tiene segundo nivel (`endosado`) o el estado no es uno de los suyos.
 */
export function buscar_estado(sub_view, sub_sub_view) {
	if (!es_solapa_de_primer_nivel(sub_view) || typeof sub_sub_view != 'string') {
		return null
	}

	/** Estados válidos de esta solapa. */
	let estados = ESTADOS_POR_SOLAPA[sub_view]
	for (let i = 0; i < estados.length; i++) {
		if (estados[i].ruta == sub_sub_view) {
			return estados[i]
		}
	}
	return null
}

/**
 * Dice si la combinación de la ruta se puede dibujar tal cual está.
 *
 * `endosado` es válida SIN sub_sub_view (y se ignora el que traiga). `recibido` y `emitido`
 * necesitan un estado de los suyos. Todo lo demás (incluida la URL vieja
 * /cheques/recibido/endosados) es inválido y la vista lo redirige con `ruta_normalizada`.
 *
 * @param {*} sub_view Valor de `$route.params.sub_view`.
 * @param {*} sub_sub_view Valor de `$route.params.sub_sub_view`.
 * @returns {Boolean}
 */
export function solapa_es_valida(sub_view, sub_sub_view) {
	if (!es_solapa_de_primer_nivel(sub_view)) {
		return false
	}
	if (sub_view == 'endosado') {
		return true
	}
	return buscar_estado(sub_view, sub_sub_view) !== null
}

/**
 * Cheques de la solapa que marca la ruta.
 *
 *   - recibido/<estado> -> models.recibido[estado]
 *   - emitido/<estado>  -> models.emitido[estado]
 *   - endosado          -> models.recibido.endosados (los recibidos que salieron de cartera)
 *
 * Con una ruta inválida, o con `models` sin cargar (el store nace como `[]`), devuelve `[]`.
 *
 * Es la lista que se dibuja y también la que define los ids con los que se acota cualquier
 * filtro u orden de columna (ver components/cheques/Index.vue).
 *
 * @param {*} models `state.cheque.models`.
 * @param {*} sub_view Valor de `$route.params.sub_view`.
 * @param {*} sub_sub_view Valor de `$route.params.sub_sub_view`.
 * @returns {Array<Object>} Los cheques de la solapa (la referencia del store, no una copia).
 */
export function cheques_de_la_solapa(models, sub_view, sub_sub_view) {
	if (!models || typeof models != 'object' || !solapa_es_valida(sub_view, sub_sub_view)) {
		return []
	}

	// Endosado: no tiene bucket propio en la API, son los recibidos del estado `endosados`.
	if (sub_view == 'endosado') {
		return (models.recibido && Array.isArray(models.recibido.endosados)) ? models.recibido.endosados : []
	}

	/** Cheques de la solapa agrupados por estado: models.recibido o models.emitido. */
	let grupo = models[sub_view]
	/** Estado de la segunda fila (ya validado arriba, no es null). */
	let estado = buscar_estado(sub_view, sub_sub_view)
	if (!grupo || typeof grupo != 'object' || !Array.isArray(grupo[estado.clave])) {
		return []
	}
	return grupo[estado.clave]
}

/**
 * Deja de un resultado filtrado solo los cheques que pertenecen a la solapa vigente.
 *
 * Es la red de seguridad de la búsqueda de columnas: la API nueva ya acota el resultado a los
 * ids de la solapa (operador `in` de ExtraFiltersHelper), pero la API que corre en producción
 * hasta el release ignora ese operador en silencio y devuelve cheques de TODAS las solapas. Con
 * este recorte la tabla, el Total y el Excel nunca incluyen un cheque de otra solapa. Con la
 * API nueva no saca nada.
 *
 * @param {Array<Object>} filtrados Resultado de la búsqueda (`state.cheque.filtered`).
 * @param {Array<Object>} cheques_de_esta_solapa Lo que devuelve `cheques_de_la_solapa`.
 * @returns {Array<Object>} Los filtrados que están en la solapa, en el mismo orden. `[]` si
 *   `filtrados` no es un array.
 */
export function acotar_a_la_solapa(filtrados, cheques_de_esta_solapa) {
	if (!Array.isArray(filtrados)) {
		return []
	}

	/** Ids de la solapa vigente, para consultar si un resultado pertenece. */
	let ids_de_la_solapa = new Set()
	if (Array.isArray(cheques_de_esta_solapa)) {
		cheques_de_esta_solapa.forEach(function (cheque) {
			ids_de_la_solapa.add(cheque.id)
		})
	}

	return filtrados.filter(function (cheque) {
		return ids_de_la_solapa.has(cheque.id)
	})
}

/**
 * Lleva cualquier combinación de la ruta a una que se pueda dibujar.
 *
 *   - sin solapa, o con una inventada            -> recibido/pendientes
 *   - recibido/endosados (URL vieja)             -> endosado
 *   - endosado/<lo que sea>                      -> endosado (sin segundo nivel)
 *   - emitido/endosados (o cualquier estado que
 *     la solapa no tenga)                        -> <solapa>/pendientes
 *   - una combinación ya válida                  -> la misma
 *
 * El `sub_sub_view` de `endosado` vuelve en `null`: la ruta no lleva segundo nivel.
 *
 * Existe porque HorizontalNav cambia de solapa con un `$router.push` RELATIVO, que vue-router
 * mezcla con los params actuales: al pasar de Recibido/Pendientes a Endosado la URL queda
 * /cheques/endosado/pendientes, y al pasar de Recibido/Endosados a Emitido quedaba
 * /cheques/emitido/endosados (un estado que Emitido no tiene).
 *
 * @param {*} sub_view Valor de `$route.params.sub_view`.
 * @param {*} sub_sub_view Valor de `$route.params.sub_sub_view`.
 * @returns {{sub_view: String, sub_sub_view: String|null}}
 */
export function ruta_normalizada(sub_view, sub_sub_view) {
	// La URL de antes de esta misión: los endosados eran un estado más de Recibido.
	if (sub_view == 'recibido' && sub_sub_view == 'endosados') {
		return {sub_view: 'endosado', sub_sub_view: null}
	}

	// Endosado es una sola lista: el segundo nivel que traiga la ruta sobra.
	if (sub_view == 'endosado') {
		return {sub_view: 'endosado', sub_sub_view: null}
	}

	// Sin solapa, o con una que no existe: se arranca por el principio (recibido/pendientes).
	if (!es_solapa_de_primer_nivel(sub_view)) {
		return {sub_view: SOLAPA_POR_DEFECTO, sub_sub_view: ESTADO_POR_DEFECTO}
	}

	// Recibido o Emitido con un estado propio: se deja como está. Si no (falta, o es uno que la
	// solapa no tiene, como emitido/endosados), cae en Pendientes.
	if (buscar_estado(sub_view, sub_sub_view) !== null) {
		return {sub_view: sub_view, sub_sub_view: sub_sub_view}
	}
	return {sub_view: sub_view, sub_sub_view: ESTADO_POR_DEFECTO}
}
