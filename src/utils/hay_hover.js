/**
 * ¿El dispositivo principal tiene un puntero que puede "pasar por encima" de un elemento?
 *
 * Es la pregunta que decide si una explicación se abre al pasar el mouse (escritorio) o al
 * tocar (tablet y teléfono). Se resuelve con la media query `(hover: hover)` y no mirando el
 * ancho de pantalla: una tablet con teclado y mouse SÍ tiene hover, y una ventana angosta de
 * escritorio también. Mirar el ancho le daría toque a quien tiene mouse y hover a quien no.
 *
 * Si el navegador no sabe contestar (`matchMedia` ausente), se asume que hay hover: es el
 * comportamiento de siempre del sistema y el que menos molesta si nos equivocamos.
 *
 * @returns {boolean}
 */
export default function hay_hover() {
	if (typeof window == 'undefined' || typeof window.matchMedia != 'function') {
		return true
	}
	return window.matchMedia('(hover: hover)').matches
}
