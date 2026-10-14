import { cantidad_de, entero_es } from '@/components/alertas/components/lista-de-alertas-table/catalogo/categorias/textos'

/**
 * Textos de Alertas → Catálogo → Descripciones (misión alertas-descripciones, 14/10/2026).
 *
 * Un solo lugar para lo que lee el comerciante, así la fila, la barra y la sección dicen lo mismo con
 * las mismas palabras. Mismo criterio que categorias/textos.js (de donde se reusan los números en
 * es-AR).
 *
 * 🔴 Estos textos los lee un cliente: van con acentos, en voseo, sin jerga y sin emojis. Vocabulario
 * fijo: lo que se revisa es "la descripción" de un artículo (aunque tenga dos o tres secciones);
 * "propuesta" es palabra de la API y no se le muestra a nadie.
 */

/** Las dos solapas internas, en el orden en que se dibujan. `valor` es el `?solapa=` de la API. */
export const SOLAPAS = [
	{ valor: 'a_revisar', nombre: 'A revisar' },
	{ valor: 'publicadas', nombre: 'Publicadas' },
]

/** Valores válidos de solapa. */
export const SOLAPAS_VALIDAS = ['a_revisar', 'publicadas']

export const TEXTOS = {
	titulo: 'Descripciones que la IA no pudo confirmar',
	intro: 'Las armó a partir del código de barras, pero la información que encontró no alcanzaba para estar segura de que es exactamente tu producto. Leelas: si están bien, aprobalas; si algo no corresponde, corregilo o descartala.',
	nota_a_revisar: 'Estas descripciones todavía no se ven en tu tienda online ni en la ficha del artículo: aparecen recién cuando las aprobás. Si descartás una, el artículo queda sin descripción y podés escribirle una a mano cuando quieras.',
	nota_publicadas: 'Son las descripciones que cargó la IA y ya se ven en tu tienda online y en la ficha del artículo: las que tenía claras y las que aprobaste. Si alguna se coló mal, corregila o quitala.',
	etiqueta_dudosa: 'La IA no está segura',
	de_donde: 'De dónde lo sacó:',
	confirmar_quitar: 'Se borra la descripción de este artículo. ¿Seguro?',
	vacio: {
		a_revisar: {
			icono: 'bi bi-check2-all',
			titulo: 'No hay descripciones para revisar',
			pista: 'Cuando la IA no está segura de la descripción de un artículo, la deja acá para que la apruebes, la corrijas o la descartes.',
		},
		publicadas: {
			icono: 'bi bi-card-text',
			titulo: 'Todavía no hay descripciones automáticas publicadas',
			pista: 'Las descripciones que arma la IA desde el listado de artículos, y las que aprobás acá, aparecen en esta solapa.',
		},
	},
	error: {
		titulo: 'No pudimos traer las descripciones',
		pista: 'Revisá la conexión y volvé a intentar.',
	},
	/** Un refresco que falló con la lista a la vista: lo que se ve puede no ser lo último. */
	error_al_actualizar: 'No pudimos actualizar la lista de descripciones. Revisá la conexión y volvé a intentar.',
	/** API sin la ruta (404): el sistema del cliente todavía no tiene esta pantalla. */
	no_disponible: {
		titulo: 'Esta pantalla todavía no está disponible en tu sistema.',
		pista: 'Se habilita sola cuando tu sistema reciba la próxima actualización.',
	},
}

/**
 * "3 descripciones" / "1 descripción", con el separador de miles es-AR.
 *
 * @param {Number} cantidad
 * @returns {String}
 */
export function cantidad_de_descripciones(cantidad) {
	return cantidad_de(cantidad, 'descripción', 'descripciones')
}

/**
 * Lo que dice el aviso después de aprobar o descartar en lote: "12 descripciones aprobadas".
 *
 * @param {Number} cantidad
 * @param {String} accion aprobar | descartar
 * @returns {String}
 */
export function frase_del_lote(cantidad, accion) {
	let numero = Number(cantidad) || 0
	let participio = accion === 'aprobar'
		? (numero === 1 ? 'aprobada' : 'aprobadas')
		: (numero === 1 ? 'descartada' : 'descartadas')
	return cantidad_de_descripciones(numero) + ' ' + participio
}

/**
 * Lo que dice el aviso cuando algunas de un lote no se pudieron resolver. Tiene que ser cierto para
 * cualquiera de las causas que la API deja afuera de `resueltos`:
 *  - las dos acciones: ya no estaba para revisar (otra persona la resolvió, o el artículo se borró);
 *  - solo al aprobar: el artículo ya tenía una descripción cargada a mano (la API descarta la
 *    sugerencia en vez de publicarla).
 *
 * @param {Number} cantidad
 * @param {String} accion aprobar | descartar
 * @returns {String}
 */
export function frase_de_las_omitidas(cantidad, accion) {
	let numero = Number(cantidad) || 0
	let una = numero === 1
	let inicio = una ? '1 no se pudo ' : entero_es(numero) + ' no se pudieron '
	if (accion === 'aprobar') {
		return inicio + 'aprobar: '
			+ (una
				? 'ya no estaba para revisar o el artículo ya tenía una descripción cargada a mano.'
				: 'ya no estaban para revisar o esos artículos ya tenían una descripción cargada a mano.')
	}
	return inicio + 'descartar porque ' + (una ? 'ya no estaba para revisar.' : 'ya no estaban para revisar.')
}

export { cantidad_de, entero_es }
