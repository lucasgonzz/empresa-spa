/*
 * Borrador del modal de importación con IA: lo que el usuario dejó editado desde el paso 2.
 *
 * El análisis del Excel ya queda guardado en el servidor, pero lo que el usuario cambia después
 * (proveedor, mapeo de columnas, filas, políticas) vive sólo en el componente. Para que cerrar el
 * modal o la sesión no obligue a empezar de nuevo, ese estado se manda a la API
 * (POST ai-excel-import/analysis/{uuid}/borrador) y se vuelve a aplicar al retomar.
 *
 * Son funciones puras sobre "vm" (el componente) para poder probarlas sin montar nada. La lista de
 * campos tiene que coincidir con ExcelAnalysisRun::BORRADOR_CLAVES de la API: lo que la API no
 * conoce, lo descarta.
 */

import { items_de, indice_elegido, hay_algo_para_mostrar } from './relaciones_parecidas'

/*
 * Además de estos campos "simples" y de "paso", el borrador lleva `decisiones_relaciones` (lo que el
 * usuario eligió en el paso 3, clave -> índice de opción) y, sólo al enviarlo, `revision` (ver
 * Index.vue). La API los acepta aparte de BORRADOR_CLAVES.
 */

/* Campos del modal que se guardan, además de "paso". */
export const CAMPOS_DEL_BORRADOR = [
	'column_mapping',
	'selected_provider_id',
	'provider_code_column_index',
	'start_row',
	'finish_row',
	'has_header_row',
	'hoja_seleccionada',
	'precios_incluyen_iva',
	'vaciar_valores_en_blanco',
	'actualizar_articulos_de_otro_proveedor',
	'permitir_provider_code_repetido',
	'permitir_provider_code_repetido_en_multi_providers',
	'actualizar_por_provider_code',
	'actualizar_proveedor',
	'create_and_edit',
	'interpretacion_punto',
	'politica_colision',
	'politica_otro_proveedor',
	'politica_intra_archivo',
	'desempatar_por_nombre',
]

/*
 * Estos campos los reescriben los watchers del modal en el tick siguiente a cambiar el mapeo o el
 * proveedor (interpretacion_punto vuelve a 'auto', las banderas de actualización se apagan sin
 * proveedor). Por eso se reponen una vez más después de $nextTick.
 */
const CAMPOS_QUE_PISAN_LOS_WATCHERS = [
	'interpretacion_punto',
	'permitir_provider_code_repetido_en_multi_providers',
	'actualizar_articulos_de_otro_proveedor',
	'actualizar_proveedor',
]

/**
 * Arma el borrador con el estado actual del modal.
 *
 * Devuelve null cuando no hay nada que guardar: no hay análisis (paso 1), la importación ya se
 * lanzó, o el modal está en un paso previo al 2. Es una copia profunda: el que lo recibe puede
 * mandarlo o compararlo sin que lo afecte una edición posterior (y, dentro de un computed, recorrer
 * el mapeo entero hace que Vue detecte cambios en cada columna).
 *
 * @param {Object} vm  Componente del modal
 * @return {Object|null}
 */
export function armar_borrador(vm) {
	if (!vm || !vm.analysis_uuid || vm.importacion_lanzada) {
		return null
	}

	let paso = Number(vm.step)

	if (!(paso >= 2)) {
		return null
	}

	let borrador = { paso: Math.min(4, paso) }

	CAMPOS_DEL_BORRADOR.forEach(function(campo) {
		if (vm[campo] !== undefined) {
			borrador[campo] = vm[campo]
		}
	})

	/* Decisiones del paso 3: sin ellas, retomar volvería a las opciones sugeridas. */
	if (vm.decisiones_relaciones && typeof vm.decisiones_relaciones === 'object') {
		borrador.decisiones_relaciones = vm.decisiones_relaciones
	}

	return JSON.parse(JSON.stringify(borrador))
}

/**
 * Huella para saber si el borrador cambió desde la última vez que se guardó.
 *
 * @param {Object|null} borrador
 * @return {String|null}
 */
export function huella_del_borrador(borrador) {
	return borrador ? JSON.stringify(borrador) : null
}

/**
 * Aplica un borrador guardado sobre el modal, encima del resultado del análisis.
 *
 * Sólo toca los campos que el borrador trae (un borrador vacío o ausente no cambia nada) y nunca
 * "step": el paso lo decide quien retoma, según lo que haya podido recuperar.
 *
 * @param {Object} vm        Componente del modal
 * @param {Object} borrador  Lo que devolvió GET ai-excel-import/analysis/{uuid} en "borrador"
 * @return {void}
 */
export function aplicar_borrador(vm, borrador) {
	if (!vm || !borrador || typeof borrador !== 'object' || Array.isArray(borrador)) {
		return
	}

	let tiene = function(campo) {
		return Object.prototype.hasOwnProperty.call(borrador, campo)
	}

	CAMPOS_DEL_BORRADOR.forEach(function(campo) {
		if (!tiene(campo)) {
			return
		}

		if (campo === 'column_mapping') {
			if (Array.isArray(borrador.column_mapping) && borrador.column_mapping.length) {
				vm.column_mapping = typeof vm.normalize_column_mapping === 'function'
					? vm.normalize_column_mapping(borrador.column_mapping)
					: borrador.column_mapping
			}
			return
		}

		if (campo === 'hoja_seleccionada') {
			if (borrador.hoja_seleccionada !== null && borrador.hoja_seleccionada !== undefined) {
				vm.hoja_seleccionada = Number(borrador.hoja_seleccionada)
			}
			return
		}

		vm[campo] = borrador[campo]
	})

	aplicar_decisiones(vm, borrador)

	if (typeof vm.$nextTick === 'function') {
		vm.$nextTick(function() {
			CAMPOS_QUE_PISAN_LOS_WATCHERS.forEach(function(campo) {
				if (tiene(campo)) {
					vm[campo] = borrador[campo]
				}
			})
		})
	}
}

/**
 * Elige qué corrida abrir al retomar una importación pendiente. Si el usuario había llegado al
 * paso 3 o 4 y la recomendación sigue en el servidor, se reabre esa (evita pagar otra llamada a
 * la IA); si no, se reabre el análisis, que deja al usuario en el paso 2 con sus ediciones.
 *
 * @param {Object} pendiente  Un ítem de GET ai-excel-import/pendientes
 * @return {Object}  { uuid, tipo }
 */
export function corrida_a_retomar(pendiente) {
	if (pendiente && pendiente.recomendacion_uuid && Number(pendiente.paso) >= 3) {
		return { uuid: pendiente.recomendacion_uuid, tipo: 'recomendacion' }
	}

	return { uuid: pendiente ? pendiente.uuid : null, tipo: 'analisis' }
}

/**
 * Vuelve a poner las decisiones del paso 3 que el usuario había tomado. Hay que llamarla DESPUÉS de
 * aplicar_resultado_recomendacion(), que arma las decisiones iniciales (las sugeridas) y las pisaría.
 * Sólo se aceptan claves que existen en la lista actual y con un índice que apunta a una opción
 * válida: lo demás se queda con lo sugerido.
 *
 * @param {Object} vm        Componente del modal
 * @param {Object} borrador  Borrador guardado
 * @return {void}
 */
export function aplicar_decisiones(vm, borrador) {
	if (!vm || !borrador || !borrador.decisiones_relaciones || typeof borrador.decisiones_relaciones !== 'object') {
		return
	}

	let guardadas = borrador.decisiones_relaciones
	let nuevas = Object.assign({}, vm.decisiones_relaciones)

	items_de(vm.relaciones_parecidas).forEach(function(item) {
		if (!Object.prototype.hasOwnProperty.call(guardadas, item.clave)) {
			return
		}
		let elegido = Number(guardadas[item.clave])
		// indice_elegido() valida que sea una opción existente; si no, devuelve la sugerida.
		let valido = Object.assign({}, nuevas, { [item.clave]: elegido })
		nuevas[item.clave] = indice_elegido(item, valido)
	})

	vm.decisiones_relaciones = nuevas
}

/**
 * Paso en el que hay que dejar al usuario al retomar: el que tenía guardado, si se puede mostrar con
 * lo que se recuperó; si no, el que corresponde por defecto.
 *
 *  - 2: siempre se puede.
 *  - 3: en artículos si hay recomendación cargada; en clientes y proveedores sólo si hay nombres
 *       parecidos para mostrar (si no, se baja al 4, como hace el modal).
 *  - 4: si hay recomendación cargada, o en clientes y proveedores (donde el 4 sin lista es un camino
 *       normal, ver seguir_sin_relaciones_parecidas).
 *  Sin recomendación recuperada no hay paso 3 ni, en artículos, 4: se queda en el 2.
 *
 * @param {Object}  vm                       Componente del modal
 * @param {Object}  borrador                 Borrador guardado (puede faltar)
 * @param {Boolean} con_recomendacion        La corrida abierta es una recomendación ya lista
 * @param {Number}  paso_por_defecto         Lo que haría el modal sin borrador
 * @return {Number}
 */
export function paso_a_retomar(vm, borrador, con_recomendacion, paso_por_defecto) {
	let guardado = borrador ? Number(borrador.paso) : NaN

	if (guardado !== 2 && guardado !== 3 && guardado !== 4) {
		return paso_por_defecto
	}

	let es_articulo = !vm || vm.model === 'article'

	if (guardado === 2) {
		return 2
	}

	if (!con_recomendacion) {
		return (guardado === 4 && !es_articulo) ? 4 : 2
	}

	if (guardado === 3 && !es_articulo && !hay_algo_para_mostrar(vm.relaciones_parecidas)) {
		return 4
	}

	return guardado
}
