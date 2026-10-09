/*
	Cómo se presentan en el diseñador de PDF los estilos de caja y las alineaciones (misión
	diseno-pdf-configurable, 1/10/2026).

	Las keys válidas NO salen de acá: las manda el catálogo en `limites.estilos_de_caja` y
	`limites.alineaciones` (constantes de DisenoDePaginaPdf). Este archivo solo dice con qué nombre
	y qué ícono se muestra cada una; una key que el catálogo mande y este archivo no conozca se
	muestra con su propio nombre y un ícono genérico, sin romper nada.
*/

/* Estilos de caja: lo que dibuja el PDF (plan §4.4) */
const ESTILOS = {
	borde: {
		nombre: 'Con borde',
		icono: 'bi-square',
		descripcion: 'Un recuadro de línea fina.',
	},
	gris: {
		nombre: 'Fondo gris',
		icono: 'bi-square-fill',
		descripcion: 'Fondo gris claro con borde suave, como los totales de siempre.',
	},
	ninguno: {
		nombre: 'Sin recuadro',
		icono: 'bi-dash-square-dotted',
		descripcion: 'Sin borde ni fondo: solo los renglones.',
	},
}

/*
	Estilos de caja en un ticket de comandera (misión diseno-ticket-comandera, decisión D7): la
	comandera no dibuja recuadros ni fondos. "Con línea" (`borde`) imprime una línea de guiones abajo
	de la caja; "Sin línea" (`ninguno`), nada. `gris` no se ofrece: si llega (un diseño de hoja que se
	pasó a ticket), el motor lo imprime como `borde` y acá se muestra como "Con línea".
*/
const ESTILOS_EN_TICKET = {
	borde: {
		nombre: 'Con línea',
		icono: 'bi-hr',
		descripcion: 'Una línea de guiones abajo de la caja, del ancho de la caja.',
	},
	ninguno: {
		nombre: 'Sin línea',
		icono: 'bi-dash-square-dotted',
		descripcion: 'Sin línea: solo los renglones.',
	},
}

/* Los estilos que se ofrecen en un ticket, en este orden */
const KEYS_EN_TICKET = ['borde', 'ninguno']

/* Alineaciones de un renglón */
const ALINEACIONES = {
	izquierda: {
		nombre: 'A la izquierda',
		icono: 'bi-text-left',
	},
	centro: {
		nombre: 'Centrado',
		icono: 'bi-text-center',
	},
	derecha: {
		nombre: 'A la derecha',
		icono: 'bi-text-right',
	},
}

/**
 * Nombre de un estilo de caja.
 *
 * @param {string} estilo key del catálogo ('borde' | 'gris' | 'ninguno')
 * @returns {string}
 */
export function nombre_del_estilo(estilo) {
	return ESTILOS[estilo] ? ESTILOS[estilo].nombre : String(estilo)
}

/**
 * Ícono (clase de Bootstrap Icons) de un estilo de caja.
 *
 * @param {string} estilo
 * @returns {string}
 */
export function icono_del_estilo(estilo) {
	return ESTILOS[estilo] ? ESTILOS[estilo].icono : 'bi-square'
}

/**
 * Explicación corta de un estilo de caja (para el panel de propiedades).
 *
 * @param {string} estilo
 * @returns {string}
 */
export function descripcion_del_estilo(estilo) {
	return ESTILOS[estilo] ? ESTILOS[estilo].descripcion : ''
}

/**
 * Los estilos de caja que se ofrecen en un ticket: "Con línea" y "Sin línea", si el catálogo los
 * tiene (`limites.estilos_de_caja`). Si el catálogo no trae ninguno de los dos, los suyos.
 *
 * @param {Array<string>} estilos_del_catalogo
 * @returns {Array<string>}
 */
export function estilos_en_ticket(estilos_del_catalogo) {
	let catalogo = Array.isArray(estilos_del_catalogo) ? estilos_del_catalogo : []
	let ofrecidos = KEYS_EN_TICKET.filter(function (estilo) {
		return catalogo.indexOf(estilo) !== -1
	})
	return ofrecidos.length ? ofrecidos : catalogo.slice()
}

/**
 * El estilo con que se MUESTRA una caja en un ticket: `gris` es "Con línea" (`borde`), como lo
 * imprime el motor. El estilo guardado no se toca hasta que se elige otro.
 *
 * @param {string} estilo
 * @returns {string}
 */
export function estilo_en_ticket(estilo) {
	return estilo === 'gris' ? 'borde' : estilo
}

/**
 * Nombre de un estilo de caja en un ticket ("Con línea" / "Sin línea").
 *
 * @param {string} estilo
 * @returns {string}
 */
export function nombre_del_estilo_en_ticket(estilo) {
	let clave = estilo_en_ticket(estilo)
	return ESTILOS_EN_TICKET[clave] ? ESTILOS_EN_TICKET[clave].nombre : nombre_del_estilo(estilo)
}

/**
 * Ícono de un estilo de caja en un ticket.
 *
 * @param {string} estilo
 * @returns {string}
 */
export function icono_del_estilo_en_ticket(estilo) {
	let clave = estilo_en_ticket(estilo)
	return ESTILOS_EN_TICKET[clave] ? ESTILOS_EN_TICKET[clave].icono : icono_del_estilo(estilo)
}

/**
 * Explicación de un estilo de caja en un ticket.
 *
 * @param {string} estilo
 * @returns {string}
 */
export function descripcion_del_estilo_en_ticket(estilo) {
	let clave = estilo_en_ticket(estilo)
	return ESTILOS_EN_TICKET[clave] ? ESTILOS_EN_TICKET[clave].descripcion : descripcion_del_estilo(estilo)
}

/**
 * Nombre de una alineación.
 *
 * @param {string} alineacion key del catálogo ('izquierda' | 'centro' | 'derecha')
 * @returns {string}
 */
export function nombre_de_la_alineacion(alineacion) {
	return ALINEACIONES[alineacion] ? ALINEACIONES[alineacion].nombre : String(alineacion)
}

/**
 * Ícono de una alineación.
 *
 * @param {string} alineacion
 * @returns {string}
 */
export function icono_de_la_alineacion(alineacion) {
	return ALINEACIONES[alineacion] ? ALINEACIONES[alineacion].icono : 'bi-text-paragraph'
}
