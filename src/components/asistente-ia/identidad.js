/**
 * Quién es quién en la ventana del agente personal (misión agente-mejoras-uso-real, 29/10/2026):
 * el logo del negocio que hace de cara del agente y el nombre y las iniciales de la persona.
 *
 * Existe para que el avatar del agente sea EL MISMO en todos lados (el botón flotante, cada
 * respuesta, el indicador de pensando, la barra lateral) sin que cada componente repita la regla.
 * El botón flotante (FloatingButton.vue) tiene su propia copia de `logo_del_negocio` desde antes
 * (D37) y no se tocó en esta misión: si cambia la regla, cambia en los dos lados.
 */

/**
 * Logo del negocio: el de la tienda online si existe, si no la imagen de la cuenta, si no null (el
 * que llama dibuja su respaldo). Las dos ya viajan en GET api/user: cero requests nuevos (D37).
 *
 * @param {Object|null} user El usuario autenticado (`this.user` del mixin global).
 * @returns {String|null}
 */
export function logo_del_negocio(user) {
	if (!user) {
		return null
	}
	if (user.online_configuration && user.online_configuration.logo_url) {
		return user.online_configuration.logo_url
	}
	return user.image_url || null
}

/**
 * El nombre de pila de la persona, para el saludo de la pantalla vacía («¿En qué te ayudo hoy,
 * Pablo?»), como `nombre_corto` de la sesión de ia-spa. Vacío si no hay nombre.
 *
 * @param {Object|null} user
 * @returns {String}
 */
export function nombre_corto(user) {
	let nombre = user && user.name ? String(user.name).trim() : ''
	if (!nombre) {
		return ''
	}
	return nombre.split(/\s+/)[0]
}

/**
 * Las iniciales del círculo de la persona en la barra lateral (dos letras: nombre y apellido),
 * como `iniciales` de la sesión de ia-spa. Un punto medio si no hay nombre.
 *
 * @param {Object|null} user
 * @returns {String}
 */
export function iniciales(user) {
	let nombre = user && user.name ? String(user.name).trim() : ''
	if (!nombre) {
		return '·'
	}
	let partes = nombre.split(/\s+/)
	let letras = (partes[0] || '').charAt(0) + (partes[1] || '').charAt(0)
	return letras.toUpperCase() || '·'
}
