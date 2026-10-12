/*
	La tabla de artículos del diseñador de PDF en la grilla de medias columnas (misión
	diseno-ticket-comandera, 9/10/2026; decisiones D-L3 y D9 del plan).

	Hasta esta misión la tabla era fija en el diseñador y sus columnas se elegían en el formulario
	("Columnas del PDF"). Ahora se arma adentro del diseñador, con el mismo lenguaje que las cajas:
	una fila de 24 MEDIAS columnas (D-L3: la tabla se mueve de a media columna, más fino que la
	grilla de 12 de las cajas), manijas de ancho, arrastre para reordenar y un panel por columna.

	🔴 El contrato con la API NO cambia (D9): el pivot `pdf_column_option_profile.width` sigue
	guardando milímetros. Este módulo es la única conversión entre las dos unidades:

	- al abrir:   cols     = max(1, round(width_mm × total / util))
	- al guardar: width_mm = round(cols × util / total)   (con el recorte de abajo: la suma nunca
	                                                          pasa del ancho útil)

	donde `util` es el ancho útil de la hoja (ancho − 2 × margen) y `total` el de la grilla (24, o el
	`grilla_de_tabla` del catálogo). En el modo ticket (lo enchufa otro constructor) `util` es el
	ancho del rollo: las funciones reciben `util` y `total` como parámetros y no saben de hojas.

	Funciones puras (no tocan Vue ni la API), igual que estado_del_disenador.js, para poder probarlas
	con Node. Los objetos "columna de trabajo" que arman se mutan en el lugar desde el diseñador (son
	los que vuedraggable mueve por referencia), como las cajas.

	Forma de una columna de trabajo:
	{
		ui_id,            // identidad de interfaz ('columna_<id>'): key del v-for y lo seleccionado
		id,               // id de la pdf_column_option
		nombre,           // `name` de la opción (lo que se lee en el ABM y en la bandeja)
		rotulo,           // `label` de la opción (el encabezado que imprime el PDF)
		value_resolver,   // qué dato imprime (contrato con PdfColumnService)
		default_width,    // ancho por defecto de la opción (mm)
		permite_salto,    // allow_wrap_content de la opción: si se ofrece "Salto de línea"
		cols,             // medias columnas que ocupa (1..total); en una oculta, las que tendría
		salto,            // wrap_content del pivot
		font_size,        // del pivot, se conserva tal cual (solo lo usa el PDF de artículos)
		text_align,       // ídem
		ancho_mm,         // el ancho guardado (o el por defecto): lo que se manda para una oculta
		orden_del_catalogo, // posición en el catálogo de opciones (la bandeja las lista así)
	}
*/

/* Medias columnas de la fila de la tabla cuando el catálogo no dice otra cosa (D-L3) */
export const COLUMNAS_DE_LA_TABLA = 24

/*
	Medias columnas con que entra una columna cuando la tabla ya no tiene lugar: una columna entera
	(dos medias). Lo que falta se le saca, de a media, a la más ancha que tenga más de
	COLS_QUE_SE_RESPETAN (plan §7.2: "agregar sin lugar toma media columna, o las que hagan falta, de
	la más ancha que tenga más de 2").
*/
export const MINIMO_AL_AGREGAR = 2
export const COLS_QUE_SE_RESPETAN = 2

/*
	Respaldo local de `columnas_sugeridas` del catálogo (plan §3.3): las columnas que el diseñador pone
	visibles cuando el perfil no tiene ninguna, si la API todavía no las manda. Son `value_resolver`
	de PdfColumnService::default_options() (venta) y ::document_default_options() (presupuesto y
	pedido online, que tienen resolvers propios `document_item_*`).
*/
export const COLUMNAS_SUGERIDAS_POR_MODELO = {
	sale: ['item_name', 'item_amount', 'item_price', 'item_subtotal'],
	budget: ['document_item_name', 'document_item_amount', 'document_item_price', 'document_item_subtotal'],
	order: ['document_item_name', 'document_item_amount', 'document_item_price', 'document_item_subtotal'],
}

/*
	Medias columnas de las sugeridas en un TICKET de comandera, por `value_resolver`: las mismas de
	los tickets por defecto que crea la API (PdfTicketComanderaSetupHelper::MEDIAS_COLUMNAS, 9/3/6/6).
	Con los anchos por defecto de las opciones (pensados para una A4) un rollo quedaba con "Cant" en
	2 medias (3 caracteres a 80 mm, 1 a 55) y los precios cortados. En una hoja, las sugeridas entran
	con su ancho por defecto; en las dos, lo que sobra de la fila va a la de salto de línea
	(llenar_la_fila).
*/
export const MEDIAS_SUGERIDAS_EN_TICKET = {
	item_name: 9,
	item_amount: 3,
	item_price: 6,
	item_subtotal: 6,
}

/* Tamaños de letra que acepta la API para el pivot (4 a 24 pt; otro valor viaja como null) */
const TAMANO_DE_LETRA_MIN = 4
const TAMANO_DE_LETRA_MAX = 24

/* Alineaciones que acepta la API para el pivot (otra viaja como null: automática) */
const ALINEACIONES_DEL_PIVOT = ['left', 'center', 'right']

/**
 * Un entero positivo o el valor por defecto.
 *
 * @param {*} valor
 * @param {number} por_defecto
 * @returns {number}
 */
function entero_positivo(valor, por_defecto) {
	let numero = parseInt(valor, 10)
	return numero > 0 ? numero : por_defecto
}

/**
 * Las medias columnas de la grilla de la tabla: el `grilla_de_tabla` del catálogo si viene (contrato
 * de esta misión), si no 24. Una API vieja no lo manda y la tabla se arma igual en 24.
 *
 * @param {Object|null} catalogo respuesta de page-layout-catalog
 * @returns {number}
 */
export function total_de_la_grilla(catalogo) {
	return entero_positivo(catalogo ? catalogo.grilla_de_tabla : null, COLUMNAS_DE_LA_TABLA)
}

/**
 * Milímetros → medias columnas (D9): max(1, round(mm × total / util)), y nunca más que la grilla.
 * Sin ancho útil o sin ancho, una media columna.
 *
 * @param {*} ancho_mm
 * @param {number} util_mm ancho útil de la hoja (o del rollo)
 * @param {number} total medias columnas de la grilla
 * @returns {number}
 */
export function mm_a_columnas(ancho_mm, util_mm, total) {
	let grilla = entero_positivo(total, COLUMNAS_DE_LA_TABLA)
	let ancho = Number(ancho_mm)
	let util = Number(util_mm)

	if (!(util > 0) || !(ancho > 0)) {
		return 1
	}

	let cols = Math.round(ancho * grilla / util)
	if (cols < 1) {
		cols = 1
	}
	if (cols > grilla) {
		cols = grilla
	}
	return cols
}

/**
 * Medias columnas → milímetros (D9): round(cols × util / total). Es la cuenta de UNA columna; para
 * toda la tabla se usa mm_de_las_columnas(), que además garantiza que la suma entre en el ancho útil.
 *
 * @param {number} cols
 * @param {number} util_mm
 * @param {number} total
 * @returns {number}
 */
export function columnas_a_mm(cols, util_mm, total) {
	let grilla = entero_positivo(total, COLUMNAS_DE_LA_TABLA)
	let util = Number(util_mm)
	if (!(util > 0)) {
		return 0
	}
	return Math.round(Number(cols) * util / grilla)
}

/**
 * Los milímetros de una fila de columnas, en el mismo orden.
 *
 * Cada una es round(cols × util / total) (D9), pero redondear de a una puede pasarse: tres columnas
 * de 8/24 en 200 mm dan 66,67 → 67 cada una = 201 mm, y la API rechaza con 422 una suma mayor que el
 * ancho útil. Si la suma se pasa, se le saca un milímetro a las que más subieron al redondear (las
 * de fracción más cerca de ,5: así cada una queda a menos de un milímetro de su cuenta exacta y, al
 * volver a abrir, mm_a_columnas() devuelve las mismas medias columnas mientras el ancho útil sea de
 * 48 mm o más).
 *
 * @param {Array<number>} lista_de_cols medias columnas de cada columna
 * @param {number} util_mm
 * @param {number} total
 * @returns {Array<number>}
 */
export function mm_de_las_columnas(lista_de_cols, util_mm, total) {
	let grilla = entero_positivo(total, COLUMNAS_DE_LA_TABLA)
	let util = Number(util_mm)
	let exactos = []
	let redondeados = []
	let suma = 0

	;(lista_de_cols || []).forEach(function (cols) {
		let exacto = util > 0 ? Number(cols) * util / grilla : 0
		let redondeado = Math.round(exacto)
		exactos.push(exacto)
		redondeados.push(redondeado)
		suma += redondeado
	})

	let limite = util > 0 ? Math.floor(util) : 0

	while (suma > limite) {
		/*
			La que más subió al redondear (y que todavía tenga más de 1 mm). En un empate, la más
			ancha (un milímetro se nota menos), y si también empatan, la primera.
		*/
		let elegida = -1
		let mayor_subida = -Infinity
		redondeados.forEach(function (mm, indice) {
			let subida = mm - exactos[indice]
			let empata = Math.abs(subida - mayor_subida) < 1e-9
			if (mm > 1 && (subida > mayor_subida + 1e-9 || (empata && mm > redondeados[elegida]))) {
				mayor_subida = subida
				elegida = indice
			}
		})
		if (elegida === -1) {
			break
		}
		redondeados[elegida] = redondeados[elegida] - 1
		suma--
	}

	return redondeados
}

/**
 * Suma de las medias columnas de una lista de columnas de trabajo.
 *
 * @param {Array} columnas
 * @returns {number}
 */
export function suma_de_columnas(columnas) {
	let suma = 0
	;(columnas || []).forEach(function (columna) {
		suma += Number(columna.cols) || 0
	})
	return suma
}

/**
 * Hasta cuántas medias columnas puede crecer una columna visible: las suyas más las libres de la
 * fila, sin pasar de la grilla. Es el tope de las manijas y del +.
 *
 * @param {Object} columna
 * @param {Array} visibles
 * @param {number} total
 * @returns {number}
 */
export function cols_maximo_de(columna, visibles, total) {
	let grilla = entero_positivo(total, COLUMNAS_DE_LA_TABLA)
	let libre = grilla - suma_de_columnas(visibles)
	let maximo = (Number(columna.cols) || 1) + (libre > 0 ? libre : 0)
	return maximo > grilla ? grilla : maximo
}

/**
 * La columna más ancha de la lista que tenga más de `minimo` medias columnas (en un empate, la
 * primera), salvo `excepto`. Null si no hay ninguna.
 *
 * @param {Array} columnas
 * @param {number} minimo
 * @param {Object|null} excepto
 * @returns {Object|null}
 */
function la_mas_ancha(columnas, minimo, excepto) {
	let elegida = null
	;(columnas || []).forEach(function (columna) {
		if (columna === excepto || columna.cols <= minimo) {
			return
		}
		if (!elegida || columna.cols > elegida.cols) {
			elegida = columna
		}
	})
	return elegida
}

/**
 * Hace lugar en la fila para una columna que acaba de entrar (ya está en `visibles`). Muta los
 * `cols` en el lugar.
 *
 * - Si entra con su ancho, no se toca nada.
 * - Si no: se queda con el lugar libre (hasta su ancho), y si el libre no llega a una columna entera
 *   (MINIMO_AL_AGREGAR), entra con una entera y lo que falta se le saca de a media columna a la más
 *   ancha que tenga más de COLS_QUE_SE_RESPETAN.
 * - Si ninguna puede ceder, la nueva se achica hasta una media columna; si ni así entra, devuelve
 *   false (la tabla no tiene lugar: el que llama la saca y avisa).
 *
 * @param {Array} visibles columnas de la tabla, con la nueva adentro
 * @param {Object} nueva
 * @param {number} total
 * @returns {boolean} si entró
 */
export function hacer_lugar(visibles, nueva, total) {
	let grilla = entero_positivo(total, COLUMNAS_DE_LA_TABLA)
	let otras = (visibles || []).filter(function (columna) {
		return columna !== nueva
	})
	let libre = grilla - suma_de_columnas(otras)
	let natural = entero_positivo(nueva.cols, 1)

	if (natural > grilla) {
		natural = grilla
	}

	if (natural <= libre) {
		nueva.cols = natural
		return true
	}

	let objetivo = Math.min(natural, Math.max(libre, MINIMO_AL_AGREGAR))
	let falta = objetivo - (libre > 0 ? libre : 0)

	while (falta > 0) {
		let donante = la_mas_ancha(otras, COLS_QUE_SE_RESPETAN, null)
		if (donante) {
			donante.cols = donante.cols - 1
			falta--
			continue
		}
		if (objetivo > 1) {
			objetivo--
			falta--
			continue
		}
		return false
	}

	nueva.cols = objetivo
	return true
}

/**
 * Deja la fila en el total de la grilla o menos: le saca de a media columna a la más ancha (con más
 * de una) hasta que entre. Es para un perfil viejo cuyas columnas en milímetros suman más que el
 * ancho útil (el PDF de siempre las cortaba en el borde): en la grilla nunca se pasa (plan §7.2).
 * Muta los `cols` en el lugar.
 *
 * @param {Array} visibles
 * @param {number} total
 * @returns {void}
 */
export function encajar_en_la_grilla(visibles, total) {
	let grilla = entero_positivo(total, COLUMNAS_DE_LA_TABLA)
	let suma = suma_de_columnas(visibles)

	while (suma > grilla) {
		let donante = la_mas_ancha(visibles, 1, null)
		if (!donante) {
			return
		}
		donante.cols = donante.cols - 1
		suma--
	}
}

/**
 * Si un pivot cuenta como visible: el mismo criterio que la API
 * (PdfColumnProfileController::is_request_pivot_visible_for_width_sum): un pivot sin `visible` es
 * visible; sin pivot (opción que el perfil no tiene adjunta), no.
 *
 * @param {Object|null} pivot
 * @returns {boolean}
 */
export function pivot_es_visible(pivot) {
	if (!pivot || typeof pivot != 'object') {
		return false
	}
	if (!Object.prototype.hasOwnProperty.call(pivot, 'visible')) {
		return true
	}
	let visible = pivot.visible
	if (visible === true || visible === 1 || visible === '1') {
		return true
	}
	if (visible === false || visible === 0 || visible === '0' || visible === '' || visible === null) {
		return false
	}
	return !!visible
}

/**
 * Booleano de un pivot o de la API (true/1/'1').
 *
 * @param {*} valor
 * @returns {boolean}
 */
function verdadero(valor) {
	return valor === true || valor === 1 || valor === '1'
}

/**
 * Una columna de trabajo a partir de una opción (del catálogo de columnas o del perfil) y su pivot.
 *
 * @param {Object} opcion pdf_column_option
 * @param {Object|null} pivot el del perfil, o null si no la tiene adjunta
 * @param {number} orden_del_catalogo
 * @param {number} util_mm
 * @param {number} total
 * @returns {Object}
 */
function columna_de_trabajo(opcion, pivot, orden_del_catalogo, util_mm, total) {
	let default_width = parseInt(opcion.default_width, 10) || 0
	let ancho_guardado = pivot ? parseInt(pivot.width, 10) : NaN
	/* Como el editor de siempre: sin ancho en el pivot, el por defecto de la opción */
	let ancho_mm = ancho_guardado > 0 ? ancho_guardado : default_width

	return {
		ui_id: 'columna_' + opcion.id,
		id: opcion.id,
		nombre: String(opcion.name || opcion.label || ''),
		rotulo: String(opcion.label || opcion.name || ''),
		value_resolver: opcion.value_resolver || '',
		default_width: default_width,
		permite_salto: verdadero(opcion.allow_wrap_content),
		cols: mm_a_columnas(ancho_mm, util_mm, total),
		salto: pivot ? verdadero(pivot.wrap_content) : false,
		font_size: pivot && typeof pivot.font_size != 'undefined' ? pivot.font_size : null,
		text_align: pivot && typeof pivot.text_align != 'undefined' ? pivot.text_align : null,
		ancho_mm: ancho_mm,
		orden_del_catalogo: orden_del_catalogo,
	}
}

/**
 * Arma la tabla de trabajo mezclando el catálogo de columnas (GET pdf-column-options?model_name=)
 * con los pivots del perfil (`model.pdf_column_options`), como hacía el editor del formulario:
 *
 * - Están TODAS las opciones del catálogo (las que no tiene el perfil, ocultas). Si el catálogo no
 *   llegó (sin conexión), se arma solo con las del perfil.
 * - Las visibles van en el orden de su pivot; las demás, en el del catálogo.
 * - Cada una con sus medias columnas desde sus milímetros (D9), y la fila encajada en la grilla.
 *
 * @param {Array} catalogo_de_columnas opciones activas del modelo (o [] / null)
 * @param {Array} opciones_del_perfil model.pdf_column_options (cada una con su `pivot`)
 * @param {number} util_mm
 * @param {number} total
 * @returns {{columnas: Array, visibles: Array, suma_mm_visible: number}}
 *          columnas: todas, en el orden del catálogo; visibles: las de la tabla, en su orden;
 *          suma_mm_visible: lo que suman hoy en milímetros las visibles (lo que tiene guardado).
 */
export function armar_tabla(catalogo_de_columnas, opciones_del_perfil, util_mm, total) {
	let del_perfil = {}
	let opciones_del_perfil_validas = []

	;(Array.isArray(opciones_del_perfil) ? opciones_del_perfil : []).forEach(function (opcion) {
		if (opcion && opcion.id !== null && typeof opcion.id != 'undefined' && !del_perfil[opcion.id]) {
			del_perfil[opcion.id] = opcion
			opciones_del_perfil_validas.push(opcion)
		}
	})

	let base = (Array.isArray(catalogo_de_columnas) ? catalogo_de_columnas : []).filter(function (opcion) {
		return opcion && opcion.id !== null && typeof opcion.id != 'undefined'
	})

	/* Ordenadas como las lista el catálogo (`order` de la opción, después el id) */
	base = base.slice().sort(function (a, b) {
		return (Number(a.order) || 0) - (Number(b.order) || 0) || (Number(a.id) || 0) - (Number(b.id) || 0)
	})

	/* Sin catálogo (no llegó): las opciones que tiene el perfil, para no dejar la tabla vacía */
	if (!base.length) {
		base = opciones_del_perfil_validas
	}

	let columnas = []
	let con_orden = []
	let vistos = {}

	base.forEach(function (opcion, indice) {
		if (vistos[opcion.id]) {
			return
		}
		vistos[opcion.id] = true

		let guardada = del_perfil[opcion.id]
		let pivot = guardada && guardada.pivot ? guardada.pivot : null
		/* Las propiedades de la opción salen del catálogo; si no está, de la que trae el perfil */
		let columna = columna_de_trabajo(opcion, pivot, indice, util_mm, total)
		columnas.push(columna)

		if (pivot_es_visible(pivot)) {
			let orden = parseInt(pivot.order, 10)
			con_orden.push({
				columna: columna,
				orden: isNaN(orden) ? indice : orden,
				indice: indice,
			})
		}
	})

	con_orden.sort(function (a, b) {
		return a.orden - b.orden || a.indice - b.indice
	})

	let visibles = []
	let suma_mm_visible = 0
	con_orden.forEach(function (item) {
		visibles.push(item.columna)
		suma_mm_visible += item.columna.ancho_mm
	})

	encajar_en_la_grilla(visibles, total)

	return {
		columnas: columnas,
		visibles: visibles,
		suma_mm_visible: suma_mm_visible,
	}
}

/**
 * Las columnas que no están en la tabla, en el orden del catálogo.
 *
 * @param {Array} columnas todas
 * @param {Array} visibles
 * @returns {Array}
 */
export function columnas_ocultas(columnas, visibles) {
	return (columnas || []).filter(function (columna) {
		return (visibles || []).indexOf(columna) === -1
	})
}

/**
 * Los `value_resolver` sugeridos para un perfil sin columnas: los del catálogo
 * (`columnas_sugeridas`, plan §3.3) si los trae, si no el respaldo local.
 *
 * @param {string} model_name
 * @param {Object|null} catalogo respuesta de page-layout-catalog
 * @returns {Array<string>}
 */
export function columnas_sugeridas(model_name, catalogo) {
	if (catalogo && Array.isArray(catalogo.columnas_sugeridas) && catalogo.columnas_sugeridas.length) {
		return catalogo.columnas_sugeridas.filter(function (resolver) {
			return typeof resolver == 'string' && resolver !== ''
		})
	}
	return (COLUMNAS_SUGERIDAS_POR_MODELO[model_name] || []).slice()
}

/**
 * Lo que sobra de la fila (las medias columnas que no ocupa ninguna) se lo lleva una columna: la
 * primera con salto de línea y, si ninguna lo tiene, la más ancha (la primera, en un empate). Es la
 * misma regla con que el motor del ticket reparte los caracteres que sobran (plan §4), así la tabla
 * de las sugeridas llena el ancho en vez de quedar angosta (en una A4, 9/2/3/3 = 17 de 24 pasa a
 * 16/2/3/3). Muta `cols` en el lugar.
 *
 * @param {Array} visibles columnas de la tabla ({cols, salto})
 * @param {number} total medias columnas de la grilla
 * @returns {Object|null} la columna que se llevó lo que sobraba, o null si no sobraba nada
 */
export function llenar_la_fila(visibles, total) {
	let grilla = entero_positivo(total, COLUMNAS_DE_LA_TABLA)
	let lista = Array.isArray(visibles) ? visibles : []
	let sobra = grilla - suma_de_columnas(lista)

	if (sobra <= 0 || !lista.length) {
		return null
	}

	let destino = null
	lista.forEach(function (columna) {
		if (!destino && columna.salto) {
			destino = columna
		}
	})
	if (!destino) {
		lista.forEach(function (columna) {
			if (!destino || (Number(columna.cols) || 0) > (Number(destino.cols) || 0)) {
				destino = columna
			}
		})
	}

	destino.cols = (Number(destino.cols) || 0) + sobra
	return destino
}

/**
 * Pone en la tabla las columnas sugeridas (en el orden de la lista), cada una con su ancho y
 * haciéndole lugar. Las que permiten salto de línea entran con el salto prendido (el nombre del
 * artículo: así un nombre largo no se corta). Al final, lo que sobra de la fila va a la de salto de
 * línea (llenar_la_fila). Muta `visibles` y las columnas.
 *
 * `medias_fijas` ({value_resolver: medias}, opcional) fija el ancho de las que estén ahí: en un
 * ticket, MEDIAS_SUGERIDAS_EN_TICKET (9/3/6/6). Las demás entran con el ancho que ya traen (el
 * por defecto de la opción, convertido al ancho útil).
 *
 * @param {Array} columnas todas
 * @param {Array} visibles
 * @param {Array<string>} resolvers
 * @param {number} total
 * @param {Object} [medias_fijas]
 * @returns {number} cuántas entraron
 */
export function poner_sugeridas(columnas, visibles, resolvers, total, medias_fijas) {
	let grilla = entero_positivo(total, COLUMNAS_DE_LA_TABLA)
	let fijas = medias_fijas && typeof medias_fijas == 'object' ? medias_fijas : {}
	let entraron = 0

	;(resolvers || []).forEach(function (resolver) {
		let columna = null
		;(columnas || []).forEach(function (candidata) {
			if (!columna && candidata.value_resolver === resolver && visibles.indexOf(candidata) === -1) {
				columna = candidata
			}
		})
		if (!columna) {
			return
		}
		let fija = parseInt(fijas[resolver], 10)
		if (fija > 0) {
			columna.cols = Math.min(fija, grilla)
		}
		visibles.push(columna)
		if (!hacer_lugar(visibles, columna, total)) {
			visibles.splice(visibles.indexOf(columna), 1)
			return
		}
		if (columna.permite_salto) {
			columna.salto = true
		}
		entraron++
	})

	if (entraron) {
		llenar_la_fila(visibles, total)
	}

	return entraron
}

/**
 * Huella de la tabla: qué columnas están, en qué orden, con cuántas medias columnas y salto, y
 * contra qué ancho útil. Si cambia respecto de la base, la tabla se guarda (plan §7.2: "si la tabla
 * o la hoja cambiaron"); con el mismo ancho útil y nada tocado, sus milímetros no cambian (D9).
 *
 * @param {Array} visibles
 * @param {number} util_mm
 * @param {number} total
 * @returns {string}
 */
export function huella_de_la_tabla(visibles, util_mm, total) {
	let columnas = []
	;(visibles || []).forEach(function (columna) {
		columnas.push([columna.id, Number(columna.cols), !!columna.salto])
	})
	return JSON.stringify({
		util: Number(util_mm),
		total: Number(total),
		columnas: columnas,
	})
}

/**
 * Normaliza el tamaño de letra del pivot como lo acepta la API (4 a 24, o null).
 *
 * @param {*} valor
 * @returns {number|null}
 */
function tamano_de_letra(valor) {
	if (valor === null || typeof valor == 'undefined' || valor === '') {
		return null
	}
	let numero = Number(valor)
	return numero >= TAMANO_DE_LETRA_MIN && numero <= TAMANO_DE_LETRA_MAX ? numero : null
}

/**
 * Normaliza la alineación del pivot como la acepta la API ('left' | 'center' | 'right' | null).
 *
 * @param {*} valor
 * @returns {string|null}
 */
function alineacion(valor) {
	return ALINEACIONES_DEL_PIVOT.indexOf(valor) !== -1 ? valor : null
}

/**
 * `pdf_column_options` completo para el PUT (o para el formulario de un perfil nuevo), con la forma
 * que ya arma PdfColumnProfileEditor::sync_rows_to_model(): TODAS las opciones, cada una con
 * {id, name, label, value_resolver, default_width, pivot: {visible, order, width, wrap_content,
 * font_size, text_align}}.
 *
 * - Las visibles primero, en su orden, con sus milímetros desde las medias columnas (D9, la suma
 *   entra en el ancho útil: mm_de_las_columnas).
 * - Después las ocultas, en el orden del catálogo, con el ancho que tenían (no se tocan).
 * - font_size y text_align se conservan.
 *
 * @param {Array} columnas todas
 * @param {Array} visibles
 * @param {number} util_mm
 * @param {number} total
 * @returns {Array}
 */
export function opciones_para_guardar(columnas, visibles, util_mm, total) {
	let opciones = []
	let lista_de_cols = []

	;(visibles || []).forEach(function (columna) {
		lista_de_cols.push(columna.cols)
	})

	let milimetros = mm_de_las_columnas(lista_de_cols, util_mm, total)

	let agregar = function (columna, visible, ancho) {
		opciones.push({
			id: columna.id,
			name: columna.nombre,
			label: columna.rotulo,
			value_resolver: columna.value_resolver,
			default_width: columna.default_width,
			pivot: {
				visible: visible,
				order: opciones.length,
				width: ancho,
				wrap_content: !!columna.salto,
				font_size: tamano_de_letra(columna.font_size),
				text_align: alineacion(columna.text_align),
			},
		})
	}

	;(visibles || []).forEach(function (columna, indice) {
		agregar(columna, true, milimetros[indice])
	})

	columnas_ocultas(columnas, visibles).forEach(function (columna) {
		agregar(columna, false, Number(columna.ancho_mm) || 0)
	})

	return opciones
}

/**
 * 🔌 Para la vista previa del modo ticket: cuántos caracteres le tocan a cada columna en un renglón
 * de N caracteres, con la MISMA regla que el motor ESC/POS de la API (plan §4):
 *
 * - chars = floor(cols × N / total) por columna;
 * - lo que sobra de N (por el redondeo, o porque la fila no llena la grilla) va a la columna con
 *   salto de línea (la primera que lo tenga) y, si ninguna lo tiene, a la más ancha;
 * - entre columnas va un espacio, que sale del ancho de cada una menos la última: `contenido` es lo
 *   que entra de texto.
 *
 * @param {Array} visibles columnas de la tabla, en su orden ({cols, salto})
 * @param {number} caracteres_por_renglon N (`caracteres_por_renglon` del catálogo de ticket)
 * @param {number} total medias columnas de la grilla
 * @returns {Array<{ancho: number, contenido: number}>}
 */
export function caracteres_de_la_tabla(visibles, caracteres_por_renglon, total) {
	let grilla = entero_positivo(total, COLUMNAS_DE_LA_TABLA)
	let renglon = entero_positivo(caracteres_por_renglon, 0)
	let lista = Array.isArray(visibles) ? visibles : []
	let anchos = []
	let suma = 0

	lista.forEach(function (columna) {
		let ancho = Math.floor((Number(columna.cols) || 0) * renglon / grilla)
		anchos.push(ancho)
		suma += ancho
	})

	let sobra = renglon - suma
	if (sobra > 0 && anchos.length) {
		let destino = -1
		lista.forEach(function (columna, indice) {
			if (destino === -1 && columna.salto) {
				destino = indice
			}
		})
		if (destino === -1) {
			lista.forEach(function (columna, indice) {
				if (destino === -1 || Number(columna.cols) > Number(lista[destino].cols)) {
					destino = indice
				}
			})
		}
		anchos[destino] = anchos[destino] + sobra
	}

	let resultado = []
	anchos.forEach(function (ancho, indice) {
		let es_la_ultima = indice === anchos.length - 1
		resultado.push({
			ancho: ancho,
			contenido: es_la_ultima ? ancho : Math.max(0, ancho - 1),
		})
	})
	return resultado
}

/**
 * Suma de los milímetros visibles de un `pdf_column_options` (el criterio de la API para el 422).
 *
 * @param {Array} opciones
 * @returns {number}
 */
export function suma_mm_visible(opciones) {
	let suma = 0
	;(Array.isArray(opciones) ? opciones : []).forEach(function (opcion) {
		if (opcion && pivot_es_visible(opcion.pivot)) {
			suma += parseInt(opcion.pivot.width, 10) || 0
		}
	})
	return suma
}

/**
 * Las columnas visibles de un `pdf_column_options` guardado, en su orden y en medias columnas, para
 * DIBUJAR (la miniatura): cada una con max(1, round(mm × total / util)) y la fila encajada en la
 * grilla. No necesita el catálogo de columnas.
 *
 * @param {Array} opciones model.pdf_column_options
 * @param {number} util_mm
 * @param {number} total
 * @returns {Array<{id: *, rotulo: string, cols: number, salto: boolean, value_resolver: string}>}
 */
export function columnas_para_dibujar(opciones, util_mm, total) {
	let tabla = armar_tabla([], opciones, util_mm, total)
	let resultado = []
	tabla.visibles.forEach(function (columna) {
		resultado.push({
			id: columna.id,
			rotulo: columna.rotulo,
			cols: columna.cols,
			salto: columna.salto,
			value_resolver: columna.value_resolver,
		})
	})
	return resultado
}
