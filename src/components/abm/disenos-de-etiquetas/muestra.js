/*
	Los datos con que se dibuja una etiqueta en el editor y en las miniaturas (mision
	disenos-etiquetas-gondola, 29/9/2026).

	Se usa un articulo real del negocio si hay alguno en memoria (el primero con codigo de barras y
	precio), asi el comerciante ve SU etiqueta. Lo que a ese articulo le falte (no tiene marca, no
	tiene foto...) se completa con un dato de muestra: en el editor el campo tiene que verse para
	poder acomodarlo, aunque en el PDF de ESE articulo salga en blanco.

	texto_del_campo() arma el texto de cada campo con las mismas reglas que el PDF (contrato §3.4):
	precio con el "$" pegado y el formato de Numbers::price de la API ("$1.234,50", "$1.000"), rotulo
	opcional ("Mayorista: $1.500,50", "Precio: $1.000"), fecha d/m/y.
*/
import moment from 'moment'
import { buscar_lista, rotulo_del_precio } from './catalogo'

/* Lo que se muestra cuando no hay un articulo real (o le falta el dato) */
const DE_MUESTRA = {
	nombre: 'Yerba Mate Playadito Suave con Palo 1 kg',
	precio_final: 4250,
	codigo_barras: '7790387000123',
	codigo_proveedor: 'PLY-1000',
	codigo_interno: 'YER-001',
	categoria: 'Almacén',
	sub_categoria: 'Infusiones',
	marca: 'Playadito',
	proveedor: 'Distribuidora del Norte',
	descripcion: 'Yerba mate elaborada con palo, de molienda suave y sabor equilibrado.',
	unidad_medida: 'Unidad',
	stock: '24',
	precio_anterior: 4590,
	precio_promocional: 3990,
	contenido: '1 kg',
	plu: '2045',
	origen: 'Argentina',
	unidades_por_bulto: '10',
	peso: '1',
	modelo: 'Suave con palo',
}

/* Cuantos articulos lleva, como mucho, la hoja de "Imprimir una prueba" */
const TOPE_DE_LA_PRUEBA = 6

/**
 * El nombre de un modelo del store por id, o null.
 *
 * @param {Object} vm
 * @param {string} store nombre del modulo del store
 * @param {number} id
 * @returns {string|null}
 */
function nombre_en_el_store(vm, store, id) {
	if (!id || !vm.$store.state[store] || !Array.isArray(vm.$store.state[store].models)) {
		return null
	}
	let modelo = vm.$store.state[store].models.find(function (candidato) {
		return Number(candidato.id) === Number(id)
	})
	return modelo && modelo.name ? modelo.name : null
}

/**
 * El nombre de una relacion embebida del articulo ({name}) o, si no vino, el del store.
 *
 * @param {Object} vm
 * @param {Object} articulo
 * @param {string} relacion p. ej. 'category'
 * @param {string} store p. ej. 'category'
 * @param {string} clave p. ej. 'category_id'
 * @returns {string|null}
 */
function nombre_de_relacion(vm, articulo, relacion, store, clave) {
	if (articulo[relacion] && articulo[relacion].name) {
		return articulo[relacion].name
	}
	return nombre_en_el_store(vm, store, articulo[clave])
}

/**
 * Saca el HTML de un texto (la descripcion puede venir con formato).
 *
 * @param {string} texto
 * @returns {string}
 */
function texto_plano(texto) {
	if (!texto) {
		return ''
	}
	return String(texto).replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * La descripcion como la imprime el PDF: la columna `descripcion` y, si esta vacia, la primera de
 * sus `descriptions` (ArticleTicketDesignPdf::descripcion).
 *
 * @param {Object} articulo
 * @returns {string}
 */
function descripcion_del_articulo(articulo) {
	let texto = texto_plano(articulo.descripcion)
	if (!texto && Array.isArray(articulo.descriptions) && articulo.descriptions.length && articulo.descriptions[0]) {
		texto = texto_plano(articulo.descriptions[0].content)
	}
	return texto
}

/**
 * Un numero con el formato argentino: miles con punto y decimales con coma.
 *
 * @param {number} numero
 * @param {number} decimales cuantos decimales
 * @returns {string}
 */
function numero_argentino(numero, decimales) {
	let partes = Math.abs(numero).toFixed(decimales).split('.')
	let miles = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.')
	return (numero < 0 ? '-' : '') + miles + (partes.length > 1 ? ',' + partes[1] : '')
}

/**
 * Un valor numerico del articulo, o null si no hay.
 *
 * @param {*} valor
 * @returns {number|null}
 */
function numero_o_nada(valor) {
	if (valor === null || typeof valor == 'undefined' || valor === '') {
		return null
	}
	let numero = Number(valor)
	return isNaN(numero) ? null : numero
}

/**
 * Un stock como lo imprime el PDF (ArticleTicketDesignPdf::stock): entero con miles con punto si es
 * entero ("1.234"), y si no, con dos decimales ("12,50").
 *
 * @param {*} stock
 * @returns {string|null}
 */
export function stock_legible(stock) {
	let numero = numero_o_nada(stock)
	if (numero === null) {
		return null
	}
	return Math.floor(numero) === numero ? numero_argentino(numero, 0) : numero_argentino(numero, 2)
}

/**
 * Un peso sin ceros de mas: "1", "1,5", "1.250,125".
 *
 * @param {*} peso
 * @returns {string|null}
 */
export function peso_legible(peso) {
	let numero = numero_o_nada(peso)
	if (numero === null) {
		return null
	}
	let texto = numero_argentino(numero, 3)
	if (texto.indexOf(',') !== -1) {
		texto = texto.replace(/0+$/, '').replace(/,$/, '')
	}
	return texto
}

/**
 * Unidades por bulto: entero.
 *
 * @param {*} unidades
 * @returns {string|null}
 */
function entero_legible(unidades) {
	let numero = numero_o_nada(unidades)
	return numero === null ? null : String(Math.round(numero))
}

/**
 * Los articulos del store en el orden en que sirven de muestra: primero los que tienen codigo de
 * barras, precio y nombre; despues el resto.
 *
 * @param {Object} vm
 * @returns {Array}
 */
function articulos_ordenados(vm) {
	let modulo = vm.$store.state.article
	if (!modulo || !Array.isArray(modulo.models)) {
		return []
	}
	let completos = []
	let otros = []
	modulo.models.forEach(function (articulo) {
		if (!articulo || !articulo.id) {
			return
		}
		if (articulo.bar_code && Number(articulo.final_price) > 0 && articulo.name) {
			completos.push(articulo)
		} else {
			otros.push(articulo)
		}
	})
	return completos.concat(otros)
}

/**
 * Los ids de los articulos para "Imprimir una prueba": hasta 6 del store, los completos primero.
 *
 * @param {Object} vm
 * @returns {Array}
 */
export function ids_para_la_prueba(vm) {
	let ids = []
	articulos_ordenados(vm).slice(0, TOPE_DE_LA_PRUEBA).forEach(function (articulo) {
		ids.push(articulo.id)
	})
	return ids
}

/**
 * Elige el articulo de muestra: el primero del store con codigo de barras y precio.
 *
 * @param {Object} vm
 * @returns {Object|null}
 */
function articulo_de_muestra(vm) {
	let primero = articulos_ordenados(vm)[0]
	return primero && primero.bar_code && Number(primero.final_price) > 0 && primero.name ? primero : null
}

/**
 * Arma los datos de muestra de la etiqueta.
 *
 * @param {Object} vm cualquier componente (usa su $store)
 * @returns {Object}
 */
export function armar_muestra(vm) {
	let articulo = articulo_de_muestra(vm)
	let muestra = {
		precios_por_lista: {},
		imagen_url: null,
		fecha: moment().format('DD/MM/YY'),
	}

	Object.keys(DE_MUESTRA).forEach(function (clave) {
		muestra[clave] = DE_MUESTRA[clave]
	})

	if (!articulo) {
		return muestra
	}

	muestra.nombre = articulo.name
	muestra.precio_final = Number(articulo.final_price)
	muestra.codigo_barras = articulo.bar_code
	muestra.codigo_proveedor = articulo.provider_code || DE_MUESTRA.codigo_proveedor
	/* El codigo interno es el `sku` del articulo ("Código interno de tu negocio" en la ficha), como en el PDF */
	muestra.codigo_interno = articulo.sku ? String(articulo.sku) : DE_MUESTRA.codigo_interno
	muestra.categoria = nombre_de_relacion(vm, articulo, 'category', 'category', 'category_id') || DE_MUESTRA.categoria
	muestra.sub_categoria = nombre_de_relacion(vm, articulo, 'sub_category', 'sub_category', 'sub_category_id') || DE_MUESTRA.sub_categoria
	muestra.marca = nombre_de_relacion(vm, articulo, 'brand', 'brand', 'brand_id') || DE_MUESTRA.marca
	muestra.proveedor = nombre_de_relacion(vm, articulo, 'provider', 'provider', 'provider_id') || DE_MUESTRA.proveedor
	muestra.descripcion = descripcion_del_articulo(articulo) || DE_MUESTRA.descripcion
	muestra.unidad_medida = nombre_de_relacion(vm, articulo, 'unidad_medida', 'unidad_medida', 'unidad_medida_id') || DE_MUESTRA.unidad_medida
	muestra.stock = stock_legible(articulo.stock) || DE_MUESTRA.stock
	/* Precio anterior y promocional: en el PDF, vacios si no hay (null o 0); aca, el de muestra */
	muestra.precio_anterior = Number(articulo.previus_final_price) > 0 ? Number(articulo.previus_final_price) : DE_MUESTRA.precio_anterior
	muestra.precio_promocional = Number(articulo.precio_promocional) > 0 ? Number(articulo.precio_promocional) : DE_MUESTRA.precio_promocional
	muestra.contenido = articulo.contenido ? String(articulo.contenido) : DE_MUESTRA.contenido
	muestra.plu = articulo.plu ? String(articulo.plu) : DE_MUESTRA.plu
	muestra.origen = articulo.origen ? String(articulo.origen) : DE_MUESTRA.origen
	muestra.unidades_por_bulto = entero_legible(articulo.unidades_por_bulto) || DE_MUESTRA.unidades_por_bulto
	muestra.peso = peso_legible(articulo.peso) || DE_MUESTRA.peso
	muestra.modelo = articulo.modelo ? String(articulo.modelo) : DE_MUESTRA.modelo

	if (Array.isArray(articulo.images) && articulo.images.length && articulo.images[0] && articulo.images[0].hosting_url) {
		muestra.imagen_url = articulo.images[0].hosting_url
	}

	/* Precio final de cada lista (pivot), igual que el PDF */
	if (Array.isArray(articulo.price_types)) {
		articulo.price_types.forEach(function (lista) {
			if (lista && lista.pivot && lista.pivot.final_price !== null && typeof lista.pivot.final_price != 'undefined') {
				muestra.precios_por_lista[lista.id] = Number(lista.pivot.final_price)
			}
		})
	}

	return muestra
}

/**
 * Un precio con el formato de la API (Numbers::price): el "$" pegado, miles con punto, y los
 * centavos con coma solo si no son ",00". Igual que la etiqueta de siempre: "$1.234,50", "$1.000".
 *
 * @param {number} valor
 * @returns {string}
 */
export function formatear_precio(valor) {
	let numero = Math.round(Number(valor || 0) * 100) / 100
	let entero = Math.floor(Math.abs(numero))
	let centavos = Math.round((Math.abs(numero) - entero) * 100)
	let miles = String(entero).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
	let signo = numero < 0 ? '-' : ''

	if (centavos === 0) {
		return '$' + signo + miles
	}
	return '$' + signo + miles + ',' + (centavos < 10 ? '0' + centavos : String(centavos))
}

/**
 * Un precio opcional (anterior, promocional) con su rotulo: vacio si no hay precio (null o 0),
 * como en el PDF.
 *
 * @param {Object} elemento
 * @param {number|null} valor
 * @returns {string}
 */
function precio_con_rotulo(elemento, valor) {
	if (!(Number(valor) > 0)) {
		return ''
	}
	return (elemento.rotulo ? rotulo_del_precio(elemento.tipo) : '') + formatear_precio(valor)
}

/**
 * El texto que imprime un campo con los datos de muestra. Null en los que no son texto (foto y
 * dibujo del codigo de barras) o en un precio de una lista que ya no existe (no imprime nada).
 *
 * @param {Object} elemento
 * @param {Object} muestra salida de armar_muestra()
 * @param {Array} listas listas de precios del store
 * @returns {string|null}
 */
export function texto_del_campo(elemento, muestra, listas) {
	switch (elemento.tipo) {
		case 'nombre':
			return muestra.nombre
		case 'precio_final':
			return (elemento.rotulo ? rotulo_del_precio('precio_final') : '') + formatear_precio(muestra.precio_final)
		case 'precio_anterior':
			return precio_con_rotulo(elemento, muestra.precio_anterior)
		case 'precio_promocional':
			return precio_con_rotulo(elemento, muestra.precio_promocional)
		case 'precio_lista': {
			let lista = buscar_lista(listas, elemento.price_type_id)
			if (!lista) {
				return null
			}
			/* Sin precio para esa lista, cae al precio final (como el PDF) */
			let precio = typeof muestra.precios_por_lista[lista.id] != 'undefined' ? muestra.precios_por_lista[lista.id] : muestra.precio_final
			return (elemento.rotulo ? lista.name + ': ' : '') + formatear_precio(precio)
		}
		case 'codigo_barras_texto':
			return muestra.codigo_barras
		case 'codigo_proveedor':
			return muestra.codigo_proveedor
		case 'codigo_interno':
			return muestra.codigo_interno
		case 'categoria':
			return muestra.categoria
		case 'sub_categoria':
			return muestra.sub_categoria
		case 'marca':
			return muestra.marca
		case 'proveedor':
			return muestra.proveedor
		case 'descripcion':
			return muestra.descripcion
		case 'unidad_medida':
			return muestra.unidad_medida
		case 'stock':
			return muestra.stock
		case 'contenido':
			return muestra.contenido
		case 'plu':
			return muestra.plu
		case 'origen':
			return muestra.origen
		case 'unidades_por_bulto':
			return muestra.unidades_por_bulto
		case 'peso':
			return muestra.peso
		case 'modelo':
			return muestra.modelo
		case 'fecha_impresion':
			return muestra.fecha
		case 'texto_fijo':
			return elemento.texto || ''
		default:
			return null
	}
}
