/**
 * Lógica pura de "nombres parecidos" del modal de importación con IA (misión
 * importacion-relaciones-parecidas, 8/10/2026).
 *
 * Vive acá y no adentro de los componentes porque la usan dos: RelacionesParecidas.vue (la lista
 * que ve el usuario) e Index.vue (que arma `equivalencias` para el POST de importación). Las dos
 * puntas tienen que estar de acuerdo, ítem por ítem, en qué se ve y qué se manda: un ítem que la
 * lista oculta no puede viajar en el POST, y uno que se ve tiene que viajar con lo que el usuario
 * eligió. Con la regla escrita una sola vez no hay forma de que se desfasen.
 *
 * 🔴 CONTRATO CON empresa-api (plan de la misión, "El contrato SPA ↔ API"):
 *
 *   Lo que llega, en `resultado.relaciones_parecidas` de la corrida de get-recomendacion:
 *     { ia_consultada: Boolean,
 *       items: [{ clave, tipo, valor, filas, padre, padre_id, motivo, explicacion,
 *                 opciones: [{ accion: 'usar', id, nombre } | { accion: 'crear' } | { accion: 'unir', con }],
 *                 sugerida }] }
 *
 *   Lo que se manda, en `equivalencias` del POST ai-excel-import/import:
 *     [{ tipo, valor, padre?, accion: 'usar', id } | { tipo, valor, padre?, accion: 'crear' }
 *      | { tipo, valor, padre?, accion: 'unir', con }]
 *
 * Una clave ausente o null (API vieja, corrida vieja rehidratada) se lee como "no hay nada que
 * revisar": la sección no aparece y el POST sale sin `equivalencias`, exactamente como antes.
 */

/*
 * Tipos de relación que puede traer el chequeo, en el orden en que se muestran. Cada uno lleva:
 *   titulo  -> el encabezado del grupo, en lenguaje de comerciante
 *   genero  -> 'f' | 'm', para que los textos de las opciones concuerden ("cargada" / "cargado")
 *   padre   -> el tipo del que depende (subcategoría dentro de categoría, localidad dentro de
 *              provincia), o null
 *   en_el_padre -> cómo se nombra al padre en el renglón "en la categoría «…»"
 */
export const TIPOS = [
	{ tipo: 'proveedor',      titulo: 'Proveedores',      genero: 'm', padre: null,        en_el_padre: '' },
	{ tipo: 'categoria',      titulo: 'Categorías',       genero: 'f', padre: null,        en_el_padre: '' },
	{ tipo: 'sub_categoria',  titulo: 'Subcategorías',    genero: 'f', padre: 'categoria', en_el_padre: 'en la categoría' },
	{ tipo: 'marca',          titulo: 'Marcas',           genero: 'f', padre: null,        en_el_padre: '' },
	{ tipo: 'provincia',      titulo: 'Provincias',       genero: 'f', padre: null,        en_el_padre: '' },
	{ tipo: 'localidad',      titulo: 'Localidades',      genero: 'f', padre: 'provincia', en_el_padre: 'en la provincia' },
	{ tipo: 'vendedor',       titulo: 'Vendedores',       genero: 'm', padre: null,        en_el_padre: '' },
	{ tipo: 'tipo_de_precio', titulo: 'Listas de precios', genero: 'f', padre: null,       en_el_padre: '' },
]

/* Acciones que el SPA sabe mostrar y mandar. Una opción con otra acción no se ofrece. */
const ACCIONES = ['usar', 'crear', 'unir']

/**
 * Definición de un tipo (ver TIPOS). Un tipo que el SPA no conoce se agrupa al final, con un
 * título genérico: es mejor mostrarlo que perder una pregunta que la API decidió hacer.
 *
 * @param {String} tipo
 * @returns {Object}
 */
export function definicion_de_tipo(tipo) {
	for (let i = 0; i < TIPOS.length; i++) {
		if (TIPOS[i].tipo === tipo) {
			return TIPOS[i]
		}
	}
	return { tipo: tipo, titulo: 'Otros datos', genero: 'm', padre: null, en_el_padre: '' }
}

/**
 * True si la opción tiene una forma que el SPA sabe mostrar y mandar.
 *
 * @param {Object} opcion
 * @returns {Boolean}
 */
export function opcion_es_valida(opcion) {
	if (!opcion || ACCIONES.indexOf(opcion.accion) === -1) {
		return false
	}
	if (opcion.accion === 'usar') {
		return opcion.id !== null && opcion.id !== undefined && opcion.id !== ''
	}
	if (opcion.accion === 'unir') {
		return typeof opcion.con === 'string' && opcion.con.trim() !== ''
	}
	return true
}

/**
 * Ítems de `relaciones_parecidas` que se pueden mostrar: con clave, tipo, valor y al menos una
 * opción válida. Tolera null, una clave ausente o una forma inesperada (devuelve []).
 *
 * @param {Object|null} relaciones `relaciones_parecidas` tal como llega de la API
 * @returns {Array}
 */
export function items_de(relaciones) {
	if (!relaciones || !Array.isArray(relaciones.items)) {
		return []
	}

	return relaciones.items.filter(function(item) {
		return item
			&& typeof item.clave === 'string' && item.clave !== ''
			&& typeof item.tipo === 'string' && item.tipo !== ''
			&& item.valor !== null && item.valor !== undefined
			&& Array.isArray(item.opciones)
			&& item.opciones.some(opcion_es_valida)
	})
}

/**
 * Índice de la opción que el ítem trae preseleccionada: `sugerida` si apunta a una opción
 * válida; si no, la primera válida.
 *
 * @param {Object} item
 * @returns {Number}
 */
export function indice_sugerido(item) {
	let sugerida = Number(item.sugerida)
	if (Number.isInteger(sugerida) && sugerida >= 0 && opcion_es_valida(item.opciones[sugerida])) {
		return sugerida
	}
	for (let i = 0; i < item.opciones.length; i++) {
		if (opcion_es_valida(item.opciones[i])) {
			return i
		}
	}
	return 0
}

/**
 * Índice que está elegido para el ítem según el mapa de decisiones; si el mapa no tiene una
 * elección válida para esa clave, el sugerido.
 *
 * @param {Object} item
 * @param {Object} decisiones mapa clave -> índice de opción
 * @returns {Number}
 */
export function indice_elegido(item, decisiones) {
	let elegido = decisiones ? decisiones[item.clave] : undefined
	if (elegido !== undefined && elegido !== null) {
		elegido = Number(elegido)
		if (Number.isInteger(elegido) && elegido >= 0 && opcion_es_valida(item.opciones[elegido])) {
			return elegido
		}
	}
	return indice_sugerido(item)
}

/**
 * Mapa de decisiones con la preselección de cada ítem (`sugerida`). Es con lo que arranca la
 * lista: el usuario no tiene que tocar nada para quedarse con lo que propuso el chequeo.
 *
 * @param {Object|null} relaciones
 * @returns {Object} clave -> índice de opción
 */
export function decisiones_iniciales(relaciones) {
	let decisiones = {}
	items_de(relaciones).forEach(function(item) {
		decisiones[item.clave] = indice_sugerido(item)
	})
	return decisiones
}

/**
 * Id al que "apunta" una opción: el del existente si es `usar`, null si es `crear` o `unir`
 * (las dos dejan un registro nuevo).
 *
 * @param {Object} opcion
 * @returns {Number|null}
 */
function id_de_opcion(opcion) {
	if (opcion && opcion.accion === 'usar') {
		return Number(opcion.id)
	}
	return null
}

/**
 * Ítem del padre (la categoría de una subcategoría, la provincia de una localidad) dentro de la
 * misma lista, o null si el padre no se está preguntando (porque coincide exacto con uno cargado,
 * o porque el ítem no tiene padre).
 *
 * @param {Object} item
 * @param {Array} items todos los ítems válidos
 * @returns {Object|null}
 */
export function item_del_padre(item, items) {
	let tipo_padre = definicion_de_tipo(item.tipo).padre
	if (!tipo_padre || item.padre === null || item.padre === undefined || item.padre === '') {
		return null
	}
	let padre = String(item.padre).trim()
	for (let i = 0; i < items.length; i++) {
		if (items[i].tipo === tipo_padre && String(items[i].valor).trim() === padre) {
			return items[i]
		}
	}
	return null
}

/**
 * True si el ítem se muestra (y se manda).
 *
 * Una subcategoría se comparó contra las subcategorías de la categoría que la API SUPUSO para su
 * fila (`padre_id`: la que resulta de la opción preseleccionada de la categoría, o null si la
 * categoría iba a ser nueva). Si el usuario resolvió esa categoría de otra forma —eligió otro
 * existente, o pasó de "usar" a "crear"—, la comparación ya no vale: los candidatos eran de otra
 * categoría. Esa subcategoría se oculta y no viaja; la importación la resuelve por su camino de
 * siempre. Lo mismo para una localidad dentro de su provincia.
 *
 * @param {Object} item
 * @param {Array} items todos los ítems válidos
 * @param {Object} decisiones
 * @returns {Boolean}
 */
export function item_visible(item, items, decisiones) {
	let padre = item_del_padre(item, items)
	if (!padre) {
		return true
	}

	let opcion_del_padre = padre.opciones[indice_elegido(padre, decisiones)]
	let id_supuesto = item.padre_id === null || item.padre_id === undefined || item.padre_id === ''
		? null
		: Number(item.padre_id)

	return id_de_opcion(opcion_del_padre) === id_supuesto
}

/**
 * Arma `equivalencias` para el POST de importación: una entrada por ítem visible, con la opción
 * elegida. Los ocultos no viajan (ver item_visible). Sin ítems devuelve [].
 *
 * @param {Object|null} relaciones
 * @param {Object} decisiones
 * @returns {Array}
 */
export function armar_equivalencias(relaciones, decisiones) {
	let items = items_de(relaciones)
	let equivalencias = []

	items.forEach(function(item) {
		if (!item_visible(item, items, decisiones)) {
			return
		}

		let opcion = item.opciones[indice_elegido(item, decisiones)]
		if (!opcion_es_valida(opcion)) {
			return
		}

		let equivalencia = {
			tipo:  item.tipo,
			valor: item.valor,
		}

		/* `padre` solo cuando el ítem lo tiene: es lo que identifica a la subcategoría o a la localidad. */
		if (item.padre !== null && item.padre !== undefined && item.padre !== '') {
			equivalencia.padre = item.padre
		}

		equivalencia.accion = opcion.accion

		if (opcion.accion === 'usar') {
			equivalencia.id = opcion.id
		} else if (opcion.accion === 'unir') {
			equivalencia.con = opcion.con
		}

		equivalencias.push(equivalencia)
	})

	return equivalencias
}

/**
 * Índice de la opción que corresponde a una acción masiva sobre un ítem, o null si el ítem no
 * tiene ninguna opción de ese tipo.
 *
 *   'existente' -> "es el mismo": `usar` (o `unir`, en los parecidos entre valores nuevos). Si la
 *                  preseleccionada ya es de ese tipo se respeta (puede haber varios candidatos y
 *                  la API eligió uno); si no, la primera.
 *   'nuevo'     -> `crear`.
 *
 * @param {Object} item
 * @param {String} hacia 'existente' | 'nuevo'
 * @returns {Number|null}
 */
export function indice_para_accion_masiva(item, hacia) {
	let acciones = hacia === 'nuevo' ? ['crear'] : ['usar', 'unir']

	let sugerido = indice_sugerido(item)
	if (acciones.indexOf(item.opciones[sugerido].accion) !== -1) {
		return sugerido
	}

	for (let i = 0; i < item.opciones.length; i++) {
		if (opcion_es_valida(item.opciones[i]) && acciones.indexOf(item.opciones[i].accion) !== -1) {
			return i
		}
	}
	return null
}
