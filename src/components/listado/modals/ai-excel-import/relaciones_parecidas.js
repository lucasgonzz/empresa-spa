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
 * 🔴 CONTRATO CON empresa-api (plan de la misión, "El contrato SPA ↔ API" y "Tanda 2"):
 *
 *   Lo que llega, en `resultado.relaciones_parecidas` de la corrida de get-recomendacion:
 *     { ia_consultada: Boolean, recortado?: Boolean,
 *       items: [{ clave, tipo, valor, filas, padre, padre_id, padre_ref?, motivo, explicacion,
 *                 opciones: [{ accion: 'usar', id, nombre } | { accion: 'crear' } | { accion: 'unir', con }],
 *                 sugerida }] }
 *
 *   Los ítems hijos (subcategoría, localidad con provincia) vienen UNA VEZ POR CADA RESOLUCIÓN
 *   POSIBLE de su padre, cada uno con su `padre_ref` ("id:X", o "nuevo:<nombre>"), y se muestra el
 *   que coincide con lo que el usuario eligió para el padre (ver item_visible).
 *
 *   Lo que se manda, en `equivalencias` del POST ai-excel-import/import:
 *     [{ tipo, valor, padre?, accion: 'usar', id } | { tipo, valor, padre?, accion: 'crear' }
 *      | { tipo, valor, padre?, accion: 'unir', con }]
 *
 * Una clave ausente o null (API vieja, corrida vieja rehidratada) se lee como "no hay nada que
 * revisar": la sección no aparece y el POST sale sin `equivalencias`, exactamente como antes.
 *
 * ⚠️ Rendimiento: un archivo grande puede traer cientos de ítems y todo esto corre en cada clic.
 * Nada de recorridos lineales por ítem: los padres se buscan en un mapa (indice_de_padres) armado
 * una sola vez.
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
		return opcion.id !== null && opcion.id !== undefined && opcion.id !== '' && !isNaN(Number(opcion.id))
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
 * Una `clave` repetida se queda con el PRIMER ítem y descarta el resto: la clave es la llave del
 * mapa de decisiones, y dos ítems con la misma compartirían una sola elección sin que se vea.
 *
 * @param {Object|null} relaciones `relaciones_parecidas` tal como llega de la API
 * @returns {Array}
 */
export function items_de(relaciones) {
	if (!relaciones || !Array.isArray(relaciones.items)) {
		return []
	}

	let vistas = {}

	return relaciones.items.filter(function(item) {
		let valido = item
			&& typeof item.clave === 'string' && item.clave !== ''
			&& typeof item.tipo === 'string' && item.tipo !== ''
			&& item.valor !== null && item.valor !== undefined
			&& Array.isArray(item.opciones)
			&& item.opciones.some(opcion_es_valida)

		if (!valido || vistas[item.clave]) {
			return false
		}

		vistas[item.clave] = true
		return true
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
 * Llave con la que un hijo encuentra a su padre en el índice: tipo del padre + nombre tal como
 * viene en el Excel (sin espacios en las puntas).
 *
 * @param {String} tipo
 * @param {*} valor
 * @returns {String}
 */
function llave_de_padre(tipo, valor) {
	return tipo + '|' + String(valor).trim()
}

/**
 * Índice { 'categoria|Herramientas': ítem, 'provincia|Córdoba': ítem, … } de los ítems que pueden
 * ser padres de otros (los tipos que aparecen como `padre` en TIPOS). Se arma una vez por lista y
 * es lo que deja resolver la visibilidad de cada hijo sin recorrer la lista entera.
 *
 * @param {Array} items ítems válidos (items_de)
 * @returns {Object}
 */
export function indice_de_padres(items) {
	let tipos_padre = {}
	TIPOS.forEach(function(definicion) {
		if (definicion.padre) {
			tipos_padre[definicion.padre] = true
		}
	})

	let indice = {}
	items.forEach(function(item) {
		if (!tipos_padre[item.tipo]) {
			return
		}
		let llave = llave_de_padre(item.tipo, item.valor)
		if (!indice[llave]) {
			indice[llave] = item
		}
	})
	return indice
}

/**
 * Ítem del padre (la categoría de una subcategoría, la provincia de una localidad) dentro de la
 * misma lista, o null si el padre no se está preguntando (porque coincide exacto con uno cargado,
 * o porque el ítem no tiene padre).
 *
 * @param {Object} item
 * @param {Object} padres índice de indice_de_padres()
 * @returns {Object|null}
 */
export function item_del_padre(item, padres) {
	let tipo_padre = definicion_de_tipo(item.tipo).padre
	if (!tipo_padre || item.padre === null || item.padre === undefined || item.padre === '') {
		return null
	}
	return padres[llave_de_padre(tipo_padre, item.padre)] || null
}

/**
 * `padre_ref` que corresponde a una opción del ítem padre, con la misma forma que usa la API:
 *   usar -> "id:<id>"   crear -> "nuevo:<nombre del padre>"   unir -> "nuevo:<con>"
 *
 * @param {Object} padre ítem del padre
 * @param {Object} opcion opción elegida del padre
 * @returns {String|null}
 */
export function ref_de_opcion(padre, opcion) {
	if (!opcion) {
		return null
	}
	if (opcion.accion === 'usar') {
		return 'id:' + Number(opcion.id)
	}
	if (opcion.accion === 'unir') {
		return 'nuevo:' + String(opcion.con).trim()
	}
	return 'nuevo:' + String(padre.valor).trim()
}

/**
 * Normaliza un `padre_ref` de la API para compararlo con ref_de_opcion(): sin espacios en las
 * puntas del nombre y con el id como número ("id:05" y "id:5" son lo mismo).
 *
 * @param {String} ref
 * @returns {String}
 */
function normalizar_ref(ref) {
	let texto = String(ref).trim()
	if (texto.indexOf('id:') === 0) {
		return 'id:' + Number(texto.slice(3))
	}
	if (texto.indexOf('nuevo:') === 0) {
		return 'nuevo:' + texto.slice(6).trim()
	}
	return texto
}

/**
 * True si el ítem trae `padre_ref` (API desde la tanda 2).
 *
 * @param {Object} item
 * @returns {Boolean}
 */
export function tiene_padre_ref(item) {
	return typeof item.padre_ref === 'string' && item.padre_ref.trim() !== ''
}

/**
 * True si el ítem se muestra (y se manda).
 *
 * Un hijo (subcategoría, localidad con provincia) se comparó contra los existentes de UNA
 * resolución de su padre. Si el padre está en la lista, el usuario puede resolverlo de otra forma,
 * y entonces vale el hijo que se comparó contra ESA resolución:
 *
 *   - Con `padre_ref` (API de la tanda 2): la API manda un hijo por cada resolución posible del
 *     padre; se muestra el que tiene el `padre_ref` de la opción elegida del padre (ref_de_opcion).
 *     Los demás no se "pierden": son la misma pregunta para otra elección del padre.
 *   - Sin `padre_ref` (API anterior): hay un solo hijo, comparado contra `padre_id` (la resolución
 *     preseleccionada, o null si el padre iba a ser nuevo). Si el usuario eligió para el padre algo
 *     que no apunta a `padre_id`, la comparación ya no vale: el hijo se oculta, no viaja, y la
 *     importación lo resuelve por su camino de siempre.
 *
 * Un padre que no está en la lista tiene una sola resolución: sus hijos se muestran siempre.
 *
 * @param {Object} item
 * @param {Object} padres índice de indice_de_padres()
 * @param {Object} decisiones
 * @returns {Boolean}
 */
export function item_visible(item, padres, decisiones) {
	let padre = item_del_padre(item, padres)
	if (!padre) {
		return true
	}

	let opcion_del_padre = padre.opciones[indice_elegido(padre, decisiones)]

	if (tiene_padre_ref(item)) {
		return normalizar_ref(item.padre_ref) === ref_de_opcion(padre, opcion_del_padre)
	}

	let id_elegido = opcion_del_padre && opcion_del_padre.accion === 'usar' ? Number(opcion_del_padre.id) : null
	let id_supuesto = item.padre_id === null || item.padre_id === undefined || item.padre_id === ''
		? null
		: Number(item.padre_id)

	return id_elegido === id_supuesto
}

/**
 * Separa los ítems en los que se ven y los que se ocultaron por la regla vieja (sin `padre_ref`):
 * estos últimos son los únicos de los que hay que avisar "dejamos de mostrar", porque no tienen
 * reemplazo. Un recorrido, con el índice de padres armado una vez.
 *
 * @param {Array} items ítems válidos (items_de)
 * @param {Object} decisiones
 * @param {Object} [padres] índice ya armado, si lo hay
 * @returns {Object} { visibles: Array, ocultos_sin_reemplazo: Array }
 */
export function particionar(items, decisiones, padres) {
	let indice = padres || indice_de_padres(items)
	let visibles = []
	let ocultos_sin_reemplazo = []

	items.forEach(function(item) {
		if (item_visible(item, indice, decisiones)) {
			visibles.push(item)
		} else if (!tiene_padre_ref(item)) {
			ocultos_sin_reemplazo.push(item)
		}
	})

	return { visibles: visibles, ocultos_sin_reemplazo: ocultos_sin_reemplazo }
}

/**
 * True si, con estas decisiones, queda algún ítem visible que NO sea una equivalencia ya
 * confirmada en una importación anterior. En clientes y proveedores decide si hay paso 3: si
 * todo lo que se encontró ya estaba confirmado, se va directo al 4 (y las decisiones viajan igual).
 *
 * @param {Object|null} relaciones
 * @param {Object} decisiones
 * @returns {Boolean}
 */
export function hay_pendientes(relaciones, decisiones) {
	return particionar(items_de(relaciones), decisiones).visibles.some(function(item) {
		return item.motivo !== 'recordado'
	})
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
	let equivalencias = []

	particionar(items_de(relaciones), decisiones).visibles.forEach(function(item) {
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
			/* Número siempre: un id que llegó como texto no puede viajar como texto. */
			equivalencia.id = Number(opcion.id)
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
