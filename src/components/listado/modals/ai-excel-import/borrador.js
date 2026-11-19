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
