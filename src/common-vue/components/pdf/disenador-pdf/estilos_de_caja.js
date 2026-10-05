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
