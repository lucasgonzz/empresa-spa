/**
 * Helper PURO (sin Vue, sin store) de la vista previa del menú de categorías de la tienda y del
 * árbol de las tarjetas (misión categorizacion-tres-modelos, 5/10/2026).
 *
 * La tienda online (tienda-spa, `nav/categories`) muestra el menú de categorías de cada negocio
 * ordenado alfabéticamente, con una píldora a la derecha de cada categoría: `N sub` si tiene
 * subcategorías (y entonces se despliegan) o `N prod.` si no las tiene. La vista previa de cada
 * tarjeta dibuja ESE menú con lo que existiría después de elegir ese sistema, para que el dueño
 * vea cómo le quedaría la tienda antes de decidir.
 *
 * Qué existiría después de elegir (plan §4.2 de la misión):
 *
 *  - Propuesta NUEVA: solo se crea una categoría si tiene al menos un artículo SEGURO (los dudosos
 *    quedan sin categoría hasta que alguien los apruebe, y una categoría que solo tiene dudosos
 *    se crea recién al aprobar el primero). Por eso una categoría o subcategoría sin artículos
 *    seguros no aparece, y "N prod." cuenta los seguros. En la API, `articulos` de un nodo son
 *    los seguros MÁS los dudosos que caen ahí, y `dudosos` los dudosos: seguros = articulos - dudosos.
 *  - "Mantener las mías": las categorías ya existen y se muestran todas (la tienda no esconde una
 *    categoría vacía); lo que se le suma son los artículos seguros (`suman`). Las subcategorías sí
 *    se muestran solo si tienen artículos (la tienda no lista las vacías).
 *
 * Nada de acá decide plata ni permisos: es solo cómo se dibuja un menú. Todas las funciones toleran
 * cualquier entrada y nunca tiran.
 */

/**
 * Nombre (normalizado) de la categoría que la tienda esconde: se llama "La de siempre" y es la que
 * el sistema le pone a los artículos sin categoría (tienda-api, HomeController: se excluye por
 * nombre). Si "Mantener las mías" la trae, el menú real no la muestra y la vista previa tampoco.
 */
export const CATEGORIA_ESCONDIDA = 'la de siempre'

/**
 * Normaliza un nombre para compararlo: minúsculas, sin acentos, espacios colapsados y recortado.
 * Es la misma idea que `clave_nombre` de la API, solo que acá sirve para reconocer "La de siempre".
 *
 * @param {*} nombre
 * @returns {String}
 */
export function clave_de_nombre(nombre) {
	let texto = nombre === null || typeof nombre === 'undefined' ? '' : String(nombre)
	// `normalize` separa la letra de su tilde (á -> a + ´) y el replace saca la tilde. Un navegador
	// viejo que no lo tenga compara con los acentos puestos: no es lo ideal, pero no rompe nada.
	if (typeof texto.normalize === 'function') {
		texto = texto.normalize('NFD').replace(/[̀-ͯ]/g, '')
	}
	return texto.replace(/\s+/g, ' ').trim().toLowerCase()
}

/**
 * Los nodos ordenados por nombre como los ordena el menú de la tienda: alfabético, sin distinguir
 * mayúsculas ni acentos y con la ñ después de la n (`localeCompare('es', {sensitivity: 'base'})`).
 * A igual nombre, por id, para que el orden sea estable. No modifica el arreglo que recibe, y deja
 * afuera lo que no sea un nodo (un valor que no es objeto): el árbol que dibuja esto sale
 * normalizado del store, pero un helper que se usa en el render no puede tirar por un dato raro.
 *
 * @param {Array<{id: Number, nombre: String}>} nodos
 * @returns {Array} Una copia ordenada ([] si no era un arreglo).
 */
export function ordenar_por_nombre(nodos) {
	if (!Array.isArray(nodos)) {
		return []
	}
	return nodos.filter(function (nodo) {
		return !!nodo && typeof nodo === 'object'
	}).sort(function (a, b) {
		let nombre_a = typeof a.nombre === 'string' ? a.nombre : ''
		let nombre_b = typeof b.nombre === 'string' ? b.nombre : ''
		let orden = nombre_a.localeCompare(nombre_b, 'es', {sensitivity: 'base'})
		if (orden !== 0) {
			return orden
		}
		return (Number(a.id) || 0) - (Number(b.id) || 0)
	})
}

/**
 * Cuántos artículos tendría un nodo después de elegir el sistema, según el tipo de propuesta.
 *
 *  - nueva:    los seguros (`articulos - dudosos`, nunca menos que cero).
 *  - mantener: los que ya tiene la categoría más los seguros que se le suman (`articulos + suman`).
 *
 * @param {Object} nodo `{articulos, dudosos, suman}`
 * @param {String} tipo `nueva` | `mantener`
 * @returns {Number}
 */
export function articulos_despues_de_elegir(nodo, tipo) {
	let articulos = Number(nodo && nodo.articulos) || 0
	if (tipo === 'mantener') {
		return articulos + (Number(nodo && nodo.suman) || 0)
	}
	let dudosos = Number(nodo && nodo.dudosos) || 0
	return Math.max(0, articulos - dudosos)
}

/**
 * Arma las filas del menú de la tienda tal como quedaría después de elegir un sistema.
 *
 * Cada fila: `{id, nombre, productos, subs}`, donde `subs` son las subcategorías que se mostrarían
 * (`{id, nombre, productos}`). La píldora de la derecha la decide quien dibuja con la misma regla
 * que la tienda: con subcategorías visibles, `N sub` (N = `subs.length`); sin ellas, `N prod.`
 * (N = `productos`).
 *
 * Se esconden (ver la cabecera del archivo): en una propuesta nueva, las categorías y
 * subcategorías sin artículos seguros; en todas, la categoría "La de siempre"; y en "Mantener las
 * mías", las subcategorías sin artículos.
 *
 * @param {Array} arbol `arbol` de una tarjeta: `[{id, nombre, articulos, dudosos, suman, subcategorias}]`
 * @param {String} tipo `nueva` | `mantener`
 * @returns {Array<{id: Number, nombre: String, productos: Number, subs: Array}>} Ordenadas por nombre.
 */
export function armar_menu(arbol, tipo) {
	let es_mantener = tipo === 'mantener'
	let filas = []

	ordenar_por_nombre(arbol).forEach(function (categoria) {
		if (clave_de_nombre(categoria.nombre) === CATEGORIA_ESCONDIDA) {
			return
		}

		let productos = articulos_despues_de_elegir(categoria, tipo)
		// Una categoría NUEVA sin un solo artículo seguro no se crea, así que no está en el menú. Una
		// que ya existía (mantener) sí se lista aunque esté vacía, como hace la tienda.
		if (!es_mantener && productos <= 0) {
			return
		}

		let subs = []
		ordenar_por_nombre(categoria.subcategorias).forEach(function (sub) {
			let productos_de_la_sub = articulos_despues_de_elegir(sub, tipo)
			if (productos_de_la_sub > 0) {
				subs.push({id: sub.id, nombre: sub.nombre, productos: productos_de_la_sub})
			}
		})

		filas.push({id: categoria.id, nombre: categoria.nombre, productos: productos, subs: subs})
	})

	return filas
}
