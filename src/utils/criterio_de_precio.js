/**
 * Criterio UNICO para decidir si un articulo se maneja por margen de ganancia o por
 * precio manual (mision 44, 12/8/2026).
 *
 * Es el espejo de `empresa-api/app/Http/Controllers/Helpers/CriterioDePrecioHelper.php`,
 * funcion por funcion y con los mismos casos borde. Si se cambia el criterio de un lado,
 * hay que cambiarlo del otro.
 *
 * Antes de esto la misma decision estaba escrita en varios componentes con tres criterios
 * distintos, y ninguno coincidia con el del back. Las dos diferencias que producian el
 * bloqueo mutuo (los DOS inputs deshabilitados y el articulo sin forma de cambiarle el
 * precio desde la interfaz) eran:
 *
 *   - El cero. `percentage_gain = 0` con `price` cargado: el back no limpiaba el precio
 *     (0 no es > 0) y el front bloqueaba los dos inputs, porque en JS "0.00" != '' es
 *     verdadero. Es el caso que se estaba viendo en clientes reales.
 *   - El costo. Articulo con proveedor con margen y `apply_provider_percentage_gain` pero
 *     con `cost` en null: el front bloqueaba el precio manual y el margen del proveedor no
 *     podia producir ningun precio, porque no hay costo al que aplicarle el porcentaje.
 *
 * La direccion de la alineacion es front -> back: el back ya tenia la regla correcta.
 *
 * 🔴 El criterio es EXCLUYENTE y con prioridad: margen propio > margen del proveedor >
 * precio manual. No son tres preguntas independientes. Un articulo que ya tenga guardados
 * margen 25 Y precio 500 (estado que existe en la base de cualquier cliente de antes de
 * esta mision) se maneja por MARGEN, no por precio manual. Preguntar "tiene precio > 0"
 * por separado para deshabilitar el margen vuelve a dejar los dos campos trabados, que es
 * exactamente el bug que esta mision viene a matar.
 */

/** El articulo se maneja por su propio margen de ganancia. */
export const MARGEN_PROPIO = 'margen_propio'

/** El articulo se maneja por el margen del proveedor (necesita costo, ver resolver). */
export const MARGEN_DEL_PROVEEDOR = 'margen_del_proveedor'

/** El articulo se maneja por un precio cargado a mano. */
export const PRECIO_MANUAL = 'precio_manual'

/** El articulo no tiene ninguno de los dos cargados. */
export const NINGUNO = 'ninguno'

/**
 * True si el valor representa un numero mayor a cero.
 *
 * null, undefined, cadena vacia, texto no numerico y cualquier forma del cero ("0",
 * "0.00", 0) dan false.
 *
 * Se valida la cadena ENTERA con una expresion regular en vez de usar parseFloat suelto,
 * porque parseFloat parsea por prefijo: parseFloat('1,5') da 1.5 y parseFloat('10%') da
 * 10, mientras que el back (is_numeric) los rechaza a los dos. Y los inputs de precio y
 * margen no son type="number", asi que "1,5" con coma decimal es algo que el usuario
 * tipea todo el tiempo. Sin esta validacion, el front creeria que hay margen donde el
 * back no ve ninguno: la misma clase de desalineacion que originó la mision.
 *
 * @param {*} valor Valor crudo, tal como viene del modelo o del input.
 * @returns {Boolean}
 */
export function es_positivo(valor) {
	let numero = a_numero(valor)

	if (numero === null) {
		return false
	}

	return numero > 0
}

/**
 * Convierte a numero solo si TODO el valor es numerico, con el mismo criterio que
 * is_numeric() de PHP. Devuelve null si no lo es.
 *
 * @param {*} valor
 * @returns {Number|null}
 */
function a_numero(valor) {
	if (valor === null || typeof valor == 'undefined' || typeof valor == 'boolean') {
		return null
	}

	if (typeof valor == 'number') {
		return isFinite(valor) ? valor : null
	}

	if (typeof valor != 'string') {
		return null
	}

	let texto = valor.trim()

	if (texto === '') {
		return null
	}

	/* Entero, decimal o notacion cientifica, con signo opcional. Nada mas. */
	if (!/^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/.test(texto)) {
		return null
	}

	return parseFloat(texto)
}

/**
 * True si el valor esta CARGADO (no null, no undefined, no cadena vacia), sin importar si
 * es cero. Es la forma en que el back mide el costo del articulo y el margen del
 * proveedor: `!is_null(...)`, no `> 0`.
 *
 * @param {*} valor
 * @returns {Boolean}
 */
function esta_cargado(valor) {
	if (valor === null || typeof valor == 'undefined') {
		return false
	}

	if (typeof valor == 'string' && valor.trim() === '') {
		return false
	}

	return true
}

/**
 * True si el valor representa un flag prendido.
 *
 * Se mira el valor y no su truthiness porque la cadena "0" es FALSA en PHP y VERDADERA en
 * JS: un apply_provider_percentage_gain que llegue como "0" (segun el driver de base o el
 * payload) haria que el front y el back decidieran distinto.
 *
 * @param {*} valor
 * @returns {Boolean}
 */
function es_flag_prendido(valor) {
	if (valor === null || typeof valor == 'undefined' || valor === false || valor === '') {
		return false
	}

	let numero = a_numero(valor)

	if (numero !== null) {
		return numero != 0
	}

	return valor !== '0'
}

/**
 * Resuelve el modo de precio del articulo. Espejo de CriterioDePrecioHelper::resolver().
 *
 * @param {Object} article  Modelo del articulo.
 * @param {Object} provider Proveedor del articulo, si el llamador ya lo tiene resuelto.
 *                          Si no viene, se usa la relacion embebida `article.provider`.
 * @returns {String} una de las cuatro constantes de este modulo
 */
export function resolver(article, provider) {
	if (!article) {
		return NINGUNO
	}

	if (es_positivo(article.percentage_gain)) {
		return MARGEN_PROPIO
	}

	if (typeof provider == 'undefined' || provider === null) {
		provider = article.provider || null
	}

	/*
	 * El margen del proveedor necesita costo: sin costo no hay nada a que aplicarle el
	 * porcentaje. Y tanto el costo como el margen del proveedor se miden por "cargado" y
	 * no por "> 0", que es lo que hace setFinalPrice(). La tentacion de poner es_positivo()
	 * aca romperia la alineacion justo en el caso borde (costo 0, margen del proveedor 0).
	 */
	if (
		provider
		&& es_flag_prendido(article.apply_provider_percentage_gain)
		&& esta_cargado(provider.percentage_gain)
		&& esta_cargado(article.cost)
	) {
		return MARGEN_DEL_PROVEEDOR
	}

	if (es_positivo(article.price)) {
		return PRECIO_MANUAL
	}

	return NINGUNO
}

/**
 * True si el articulo se maneja por su propio margen de ganancia.
 *
 * @param {Object} article
 * @param {Object} provider
 * @returns {Boolean}
 */
export function usa_margen_del_articulo(article, provider) {
	return resolver(article, provider) === MARGEN_PROPIO
}

/**
 * True si el articulo se maneja por el margen del proveedor.
 *
 * @param {Object} article
 * @param {Object} provider
 * @returns {Boolean}
 */
export function usa_margen_del_proveedor(article, provider) {
	return resolver(article, provider) === MARGEN_DEL_PROVEEDOR
}

/**
 * True si el articulo se maneja por un precio cargado a mano.
 *
 * Ojo: NO es "tiene precio > 0". Un articulo con margen Y precio cargados se maneja por
 * el margen, y su input de margen tiene que quedar HABILITADO para que el usuario pueda
 * sacarlo y recien ahi fijar el precio a mano. Ver el comentario de cabecera.
 *
 * @param {Object} article
 * @param {Object} provider
 * @returns {Boolean}
 */
export function usa_precio_manual(article, provider) {
	return resolver(article, provider) === PRECIO_MANUAL
}

/**
 * True si el articulo se maneja por alguno de los dos margenes.
 *
 * @param {Object} article
 * @param {Object} provider
 * @returns {Boolean}
 */
export function usa_algun_margen(article, provider) {
	let modo = resolver(article, provider)

	return modo === MARGEN_PROPIO || modo === MARGEN_DEL_PROVEEDOR
}
