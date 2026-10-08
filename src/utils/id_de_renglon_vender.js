/**
 * Id de un renglon del remito de VENDER para los ids y data-testid del DOM (mision
 * variantes-mismo-articulo-en-vender, 8/10/2026).
 *
 * El defecto que arregla: los inputs del renglon se identificaban solo por el id del articulo
 * (`price-vender-<id>`, `name-vender-<id>`, `venta-item-precio-<id>`, `venta-item-cantidad-<id>`).
 * Con el mismo articulo en dos variantes (dos renglones, ver es_la_misma_linea en
 * store/vender/vender.js) los dos renglones tenian el MISMO id en el DOM: getElementById devolvia
 * siempre el primero, asi que el foco al "Personalizado" de la variante L caia en el de la M, el
 * b-popover se colgaba de uno solo, y los data-testid no distinguian los renglones.
 *
 * 🔴 El sufijo va SOLO cuando el renglon tiene variante. Un articulo sin variante conserva el id de
 * siempre (`<id>` pelado): la suite e2e de Lucas (e2e/helpers/vender.js, circuito-presupuesto,
 * ...) busca `venta-item-cantidad-<id>` y `venta-item-precio-<id>` y no tiene por que enterarse.
 * NO "simplificar" agregando el sufijo siempre.
 *
 * Es la misma identidad que usa el store (id + variante normalizada: 0, null, undefined, '' o NaN
 * son "sin variante"), para que dos renglones distintos nunca compartan id en el DOM.
 *
 * Funcion pura, sin imports: se usa desde templates (via un metodo del componente) y desde mixins.
 *
 * @param {Object} item Renglon del remito (con `id` y, si tiene, `article_variant_id`).
 * @returns {String} `<id>` sin variante, `<id>-v<article_variant_id>` con variante.
 */
export function id_de_renglon_vender(item) {

	let variante = Number(item.article_variant_id || 0)

	if (variante) {
		return item.id + '-v' + variante
	}

	return String(item.id)
}
