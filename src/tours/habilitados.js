/**
 * Corte de release de los tours guiados de la demo (pedido de Lucas, 1/9/2026).
 *
 * Los 24 tours están escritos y funcionando. Este archivo decide cuáles de ellos le dibujan el
 * botón "Probar" al lead, y hoy son diez: hasta el clip `2.1` inclusive, que son los que Lucas
 * recorrió a mano de punta a punta. El resto sigue vivo en el catálogo —el guion no se borra ni se
 * comenta— pero no hay forma de dispararlo desde el panel.
 *
 * 🔴 Es una lista de los que SÍ, no de los que no, y esa es toda la idea:
 *
 * - Con una lista de apagados, un tour nuevo nace prendido. El que lo escribe tiene que acordarse
 *   de apagarlo, y si se olvida sale a producción sin que nadie lo haya recorrido — que es
 *   exactamente el defecto que este corte existe para evitar.
 * - Con esta lista, un tour nuevo nace apagado. El olvido cuesta que un tour probado no se vea, y
 *   eso se nota enseguida; al revés, cuesta que un tour sin probar se vea, y eso lo descubre el
 *   lead.
 *
 * ## Cómo se agranda la lista
 *
 * Se agrega el id del clip **después** de haber recorrido su tour entero, haciendo los gestos de
 * verdad en el sistema (no "el tour arranca": eso no mide nada, lo dejó escrito el informe del
 * 31/8/2026). Los ids son los del plan, strings, tal como los indexa `tours/catalogo.js`: `1.10` y
 * `1.1` son clips distintos.
 *
 * Esto no toca a los ~40 clientes reales: todo el panel de la demo vive detrás de
 * `demo/panel_visible`, que solo prende el canje del token de ingreso.
 */
const HABILITADOS = [
	'1.1',
	'1.2',
	'1.2-mt',
	'1.3',
	'1.4',
	'1.5',
	'1.6',
	'1.7',
	'1.8',
	'2.1',
]

/**
 * ¿A este clip se le dibuja el botón "Probar"?
 *
 * Defensivo con la forma del clip a propósito: lo llama el panel por cada clip de cada sección del
 * plan, que es data congelada del lado del admin. Un clip sin `id` no puede estar habilitado, y
 * responder `false` es la respuesta segura (el botón no se dibuja) en vez de romper el render de
 * toda la sección.
 *
 * @param {Object} clip Clip entero, tal como viaja en el plan.
 * @returns {Boolean}
 */
export function tour_habilitado(clip) {
	if (!clip || !clip.id) {
		return false
	}

	return HABILITADOS.indexOf(String(clip.id)) !== -1
}
