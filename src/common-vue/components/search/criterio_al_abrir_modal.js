/**
 * Decide con que texto tiene que quedar el input del modal de busqueda en el momento en que el
 * campo de afuera le pasa el foco (search/Index.vue, pasar_foco_al_input_del_modal()).
 *
 * El problema que resuelve (ensayo de la prueba, ronda 3, 12/11/2026): el modal abre con el clic
 * (o con la primera tecla) y su input nace con el criterio que el campo tenia EN ESE MOMENTO
 * (criterio_inicial del buscador general, que se lee una sola vez en su created()). Pero el foco
 * recien pasa al input del modal unos 100 ms despues. Lo que el usuario tipea en esa ventana cae
 * en el campo de afuera, que sigue enfocado, y el modal no se entera: tipeando «Sierra» a ritmo
 * normal, la «S» quedaba afuera y el modal recibia «ierra».
 *
 * La regla: mientras el foco NO llego al input del modal, lo que manda es el campo de afuera,
 * porque es donde el usuario estuvo escribiendo. Si el foco ya esta en el input del modal, el
 * usuario escribe ahi y no se toca nada (pisarlo le borraria lo que tipeo adentro).
 *
 * @param {Object} estado
 * @param {String|null} estado.valor_afuera Lo que tiene el campo de afuera (`query` de Index.vue).
 * @param {String|null} estado.valor_modal Lo que tiene hoy el input del modal.
 * @param {Boolean} estado.foco_en_modal Si el foco ya esta en el input del modal.
 * @returns {String|null} El texto a escribir en el input del modal, o null si no hay que tocarlo.
 */
export function criterio_para_el_modal(estado) {
	if (!estado || estado.foco_en_modal) {
		return null
	}
	let afuera = estado.valor_afuera == null ? '' : '' + estado.valor_afuera
	let modal = estado.valor_modal == null ? '' : '' + estado.valor_modal
	// Campo de afuera vacio: no hay nada tipeado que rescatar, y vaciar el modal no le sirve a nadie.
	if (afuera === '' || afuera === modal) {
		return null
	}
	return afuera
}
