/**
 * Reglas puras del paginado del modal de busqueda (search/Modal.vue y search/Pagination.vue).
 *
 * Viven en un .js aparte, sin imports, para poder probarlas con `node --test` sin levantar la SPA
 * (tests/search-modal-paginado.test.cjs). Ninguna funcion toca el DOM, el store ni la red.
 *
 * El problema que resuelven (mision search-modal-paginado-y-busqueda-lenta): en Vender y en
 * Compras la lista de resultados se conserva entre aperturas del modal (limpiar_resultados_de_
 * busqueda = false), pero onModalShow() ponia total_results, current_page y total_pages en
 * cero/null en CADA apertura. Resultado: al reabrir habia 50 filas y ningun paginador.
 */

/**
 * Estado del paginado con el que tiene que quedar el modal al abrirse.
 *
 * Si el consumidor conserva la lista entre aperturas y esa lista tiene filas, el paginado que
 * la acompana (total, pagina actual, cantidad de paginas) tambien se conserva: es el de la
 * busqueda que la produjo. En cualquier otro caso (precarga de formularios, lista vacia) se
 * resetea, como siempre, para no arrastrar el total de una busqueda anterior sobre una lista
 * que no es la suya.
 *
 * @param {Object} estado
 * @param {Boolean} estado.conserva_resultados Si el consumidor conserva la lista (!limpiar_resultados_de_busqueda).
 * @param {Number} estado.cantidad_resultados Filas que hay hoy en la lista.
 * @param {Number} estado.total_results Total de la ultima busqueda.
 * @param {Number|null} estado.current_page Pagina de la ultima busqueda.
 * @param {Number|null} estado.total_pages Cantidad de paginas de la ultima busqueda.
 * @returns {{total_results: Number, current_page: Number|null, total_pages: Number|null}}
 */
export function estado_de_paginado_al_abrir(estado) {
	if (estado.conserva_resultados && estado.cantidad_resultados > 0) {
		return {
			total_results: estado.total_results,
			current_page: estado.current_page,
			total_pages: estado.total_pages,
		}
	}
	return { total_results: 0, current_page: null, total_pages: null }
}

/**
 * Pagina con la que arranca el paginador visual.
 *
 * El b-modal destruye su contenido al cerrar, asi que Pagination.vue nace de nuevo en cada
 * apertura. Si arrancara siempre en 1, aunque el modal conserve la pagina 3 la pildora marcaria 1.
 *
 * @param {Number|null|undefined} current_page Pagina que baja el modal.
 * @returns {Number} La pagina, o 1 si no hay.
 */
export function pagina_inicial_del_paginador(current_page) {
	return current_page || 1
}

/**
 * Si hay que dibujar el paginador: cuando hay mas resultados que los que entran en una pagina.
 * Con una sola pagina no se dibuja nada.
 *
 * @param {Number|null|undefined} total_results Total de resultados.
 * @param {Number} per_page Resultados por pagina.
 * @returns {Boolean}
 */
export function debe_mostrar_paginador(total_results, per_page) {
	return total_results > per_page
}

/**
 * Corta una pagina de una lista completa en memoria (busqueda sin conexion: el filtrado ya se hizo
 * y la lista entera esta disponible; paginar es solo mostrar un tramo).
 *
 * No modifica la lista recibida.
 *
 * @param {Array|null} lista Lista completa ya filtrada.
 * @param {Number} pagina Pagina que se quiere, desde 1.
 * @param {Number} por_pagina Filas por pagina.
 * @returns {Array} Las filas de esa pagina (vacio si no hay lista o la pagina esta fuera de rango).
 */
export function pagina_de_resultados(lista, pagina, por_pagina) {
	if (!lista || !lista.length) {
		return []
	}
	const desde = (Math.max(1, pagina) - 1) * por_pagina
	return lista.slice(desde, desde + por_pagina)
}

/**
 * Cantidad de paginas necesarias para un total.
 *
 * @param {Number} total Total de filas.
 * @param {Number} por_pagina Filas por pagina.
 * @returns {Number} 0 si no hay filas.
 */
export function total_de_paginas(total, por_pagina) {
	return Math.ceil(total / por_pagina)
}

/**
 * Texto del contador de resultados del encabezado del modal.
 *
 * Con `total_es_minimo` (la API acota el conteo en criterios muy cortos y manda total = tope + 1)
 * el numero real es "al menos total - 1", asi que se muestra «Más de 1.000» y no «1.001». Sin la
 * clave (API anterior) el total es exacto. El separador de miles es el punto, como el resto del
 * sistema (common-vue/mixins/dates.js, numero_es); se arma aca para no depender de imports.
 *
 * @param {Number} total total_results tal como llego de la API.
 * @param {Boolean|undefined} total_es_minimo Bandera de la API; ausente cuenta como false.
 * @returns {String} '1.234' o 'Más de 1.000'.
 */
export function texto_de_cantidad(total, total_es_minimo) {
	if (total_es_minimo) {
		return 'Más de ' + con_separador_de_miles(total - 1)
	}
	return con_separador_de_miles(total)
}

/**
 * Criterio con el que tiene que buscar una llamada a search().
 *
 * Una busqueda nueva (Enter) usa lo que hay escrito. Paginar, en cambio, tiene que traer otra
 * pagina de LA MISMA lista que se ve: despues de reabrir el modal el input puede decir otra cosa
 * (o estar vacio) y la lista en pantalla sigue siendo la de la ultima busqueda. Sin una ultima
 * busqueda (precarga) cae al texto del input.
 *
 * @param {Object} datos
 * @param {Boolean} datos.from_pagination Si la llamada viene del paginador.
 * @param {String} datos.query Lo que hay escrito en el modal.
 * @param {String|null|undefined} datos.query_value_ultima_busqueda query_value de la ultima busqueda hecha.
 * @returns {String}
 */
export function criterio_para_buscar(datos) {
	if (
		datos.from_pagination === true
		&& typeof datos.query_value_ultima_busqueda === 'string'
	) {
		return datos.query_value_ultima_busqueda
	}
	return datos.query
}

/**
 * Formatea un entero con punto como separador de miles.
 *
 * @param {Number} numero
 * @returns {String} '201.317'
 */
function con_separador_de_miles(numero) {
	return ('' + numero).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}
