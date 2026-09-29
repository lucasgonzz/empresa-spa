/*
	El foco "de vuelta a donde se cargan articulos" de Vender (mision diseno-vender-configurable,
	28/9/2026).

	Despues de agregar o sacar un articulo, Vender le devuelve el foco al codigo de barras para que
	el vendedor siga escaneando sin tocar el mouse (limpiar_codigo() / limpiar_nombre() de
	mixins/vender/limpiar_item_vender.js, y ArticlesTable.vue al sacar un renglon o al terminar de
	personalizar un precio). Eso daba por sentado que el codigo de barras siempre estaba a la vista.

	🔴 Con los diseños de Vender puede no estarlo: el diseño lo saco, o lo puso en una etapa que el
	vendedor plego. Y un campo sacado SIGUE EXISTIENDO, montado y escondido en
	layout/ReservaDeElementos.vue (ahi esta el porque). O sea que document.getElementById lo
	encuentra, el .focus() "anda" sobre un input invisible, y el vendedor se queda sin foco en
	ningun lado: tendria que hacer clic en el buscador despues de cada articulo.

	Por eso el foco va a la PRIMERA ENTRADA A LA VISTA, en el orden de siempre: el codigo de barras
	si se ve (con el codigo de barras a la vista el comportamiento es identico al de antes: el mismo
	input) y, si no, el buscador por nombre (el mismo que ya enfocaban con la extension
	no_usar_codigos_de_barra). Si no se ve ninguno, no se enfoca nada.
*/

/* Las entradas de articulos, en el orden en que se prefieren para el foco. */
const ENTRADAS_EN_ORDEN = ['article-bar-code', 'search-article']

/**
 * Si el elemento existe y esta a la vista. offsetParent es null para cualquier cosa adentro de un
 * display: none (la reserva de campos, o el cuerpo de una etapa plegada con v-show);
 * getClientRects() cubre el caso de un position: fixed, donde offsetParent tambien es null aunque
 * el elemento se vea.
 *
 * @param {Element|null} elemento
 * @returns {boolean}
 */
export function esta_a_la_vista(elemento) {
	return !!elemento && (elemento.offsetParent !== null || elemento.getClientRects().length > 0)
}

/**
 * La primera entrada de articulos a la vista (codigo de barras, si no el buscador por nombre), o null.
 *
 * @returns {HTMLElement|null}
 */
export function primera_entrada_de_articulos_a_la_vista() {
	let encontrada = null
	ENTRADAS_EN_ORDEN.forEach(function (id) {
		if (encontrada) {
			return
		}
		let elemento = document.getElementById(id)
		if (esta_a_la_vista(elemento)) {
			encontrada = elemento
		}
	})
	return encontrada
}

/**
 * Le da el foco a la primera entrada de articulos a la vista. Es el reemplazo de cada
 * document.getElementById('article-bar-code').focus() de Vender.
 *
 * @returns {HTMLElement|null} la entrada que recibio el foco, o null si no habia ninguna a la vista
 */
export function enfocar_primera_entrada_de_articulos() {
	let entrada = primera_entrada_de_articulos_a_la_vista()
	if (entrada) {
		entrada.focus()
	}
	return entrada
}
