/**
 * Estado en memoria (singleton de módulo, no Vuex) de qué colecciones dependencia de las
 * columnas dinámicas de artículo (direcciones/sucursales, listas de precio, descuentos por
 * método de pago) ya terminaron su primera descarga en esta sesión del SPA.
 *
 * Por qué no vive en Vuex: el chequeo que lo usa (bootstrap_module_column_preferences_if_needed
 * y el created() del modal de columnas) es imperativo y corre una sola vez por disparador — no
 * necesita reactividad, solo necesita saber "¿ya se descargó esto alguna vez?" en el momento
 * exacto en que se lo consulta. Un objeto de módulo JS (singleton por el propio sistema de
 * módulos) alcanza y evita agregar un módulo Vuex nuevo solo para esto.
 *
 * Único lugar que marca "listo": downloadModels() en
 * common-vue/components/download-resources/Index.vue, justo después de cada una de las 3
 * colecciones de abajo (recién descargada, o ya estaba descargada de antes).
 */
let status = {
	address: false,
	price_type: false,
	current_acount_payment_method_discount: false,
}

/**
 * Marca una colección dependencia como ya disponible en el store en esta sesión.
 * Llamadas con nombres no registrados en `status` se ignoran (no rompen nada).
 *
 * @param {string} model_name
 * @return {void}
 */
export function mark_dynamic_dependency_ready(model_name) {
	if (typeof status[model_name] != 'undefined') {
		status[model_name] = true
	}
}

/**
 * true cuando las 3 colecciones que alimentan las columnas dinámicas de artículo
 * (direcciones/sucursales, listas de precio, descuentos por método de pago) ya están
 * disponibles en el store en esta sesión.
 *
 * @return {boolean}
 */
export function article_dynamic_dependencies_ready() {
	return !!(status.address && status.price_type && status.current_acount_payment_method_discount)
}
