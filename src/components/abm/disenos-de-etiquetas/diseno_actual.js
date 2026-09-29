/*
	El diseño de siempre de la etiqueta de gondola, como datos (mision disenos-etiquetas-gondola,
	29/9/2026).

	Espejo de ArticleTicketDesignHelper::diseno_actual() de empresa-api (plan de la mision, §3.7): es
	la etiqueta que imprimia ArticleTicketPdf antes de esta mision, medida sobre su codigo. A4, 3 por
	fila, 40 mm de alto (entran 7 filas), con marco, y cinco campos:

	| Campo                       | x     | y  | w     | h  | Letra               |
	|-----------------------------|-------|----|-------|----|---------------------|
	| Precio                      | 0     | 0  | 66,7  | 13 | 33 pt negrita, der. |
	| Nombre                      | 0     | 13 | 66,7  | 15 | 12 pt negrita, izq., con saltos |
	| Codigo de barras (dibujo)   | 1     | 28 | 51,7  | 6  | —                   |
	| Codigo de barras (numeros)  | 0     | 34 | 51,7  | 5  | 8 pt, centrado      |
	| Fecha de impresion          | 51,7  | 34 | 15    | 5  | 8 pt, centrado      |

	El editor lo usa para "Nuevo diseño" y para "Restablecer el diseño de siempre".
*/
import { VERSION_DEL_DISENO } from './geometria'

/**
 * Arma el diseño de siempre.
 *
 * @param {number|null} price_type_id la lista de precios del precio grande; null = precio final del
 *                                    articulo (quien no trabaja con listas)
 * @returns {Object} diseño completo (version 1), listo para el editor o para guardar
 */
export function diseno_actual(price_type_id) {
	let precio = {
		id: 'e1',
		tipo: 'precio_final',
		x: 0, y: 0, w: 66.7, h: 13,
		tamano: 33,
		negrita: true,
		saltos_de_linea: false,
		alineacion: 'R',
		rotulo: false,
	}

	if (price_type_id) {
		precio.tipo = 'precio_lista'
		precio.price_type_id = Number(price_type_id)
	}

	return {
		version: VERSION_DEL_DISENO,
		columnas: 3,
		filas: 7,
		alto_mm: 40,
		marco: true,
		elementos: [
			precio,
			{
				id: 'e2',
				tipo: 'nombre',
				x: 0, y: 13, w: 66.7, h: 15,
				tamano: 12,
				negrita: true,
				saltos_de_linea: true,
				alineacion: 'L',
			},
			{
				id: 'e3',
				tipo: 'codigo_barras_imagen',
				x: 1, y: 28, w: 51.7, h: 6,
				tamano: 8,
				negrita: false,
				saltos_de_linea: false,
				alineacion: 'L',
			},
			{
				id: 'e4',
				tipo: 'codigo_barras_texto',
				x: 0, y: 34, w: 51.7, h: 5,
				tamano: 8,
				negrita: false,
				saltos_de_linea: false,
				alineacion: 'C',
			},
			{
				id: 'e5',
				tipo: 'fecha_impresion',
				x: 51.7, y: 34, w: 15, h: 5,
				tamano: 8,
				negrita: false,
				saltos_de_linea: false,
				alineacion: 'C',
			},
		],
	}
}
