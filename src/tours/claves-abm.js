/*
 * Claves de las solapas del ABM para los recorridos de Robotito.
 *
 * La misma clave se usa en tres lugares y por eso vive sola en este archivo:
 * - como `data-tour` de cada solapa (common-vue/views/Abm.vue), que es lo que el motor resalta;
 * - como `clave` del paso en el catálogo que empresa-api le entrega al Admin (catalogo-soporte.json);
 * - para compilar el paso en soporte-dinamico.js.
 *
 * 🔴 Solo minúsculas, números, punto y guion bajo: el Admin valida la clave con /^[a-z0-9_.]{1,80}$/
 * y empresa-api la corta en 64 caracteres. Un guion medio o un acento la dejan afuera.
 */

/**
 * @param {String} texto Nombre visible del grupo o de la solapa ("tienda online", "Diseños de Vender").
 * @returns {String} "tienda_online", "disenos_de_vender".
 */
export function slug_abm(texto) {
	return String(texto).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
		.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

/**
 * @param {String} view Nombre del grupo del ABM tal como está en mixins/abm.js ("precios").
 * @returns {String}
 */
export function clave_grupo_abm(view) {
	return 'abm.grupo.' + slug_abm(view)
}

/**
 * @param {String} view Nombre del grupo ("precios").
 * @param {String} plural Plural del modelo, que es de donde sale el segmento de la URL ("Impuestos sobre ventas").
 * @returns {String}
 */
export function clave_solapa_abm(view, plural) {
	return 'abm.solapa.' + slug_abm(view) + '.' + slug_abm(plural)
}

/**
 * Segmento de la URL, con la misma cuenta que `routeString()` de common-vue/mixins/generals.js.
 *
 * @param {String} texto
 * @returns {String}
 */
export function segmento_abm(texto) {
	return String(texto).toLowerCase().replace(/ /g, '-').replace(/_/g, '-')
}
