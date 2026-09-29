/*
	Catalogo de campos de las etiquetas de gondola (mision disenos-etiquetas-gondola, 29/9/2026).

	Espejo del catalogo de tipos del contrato (plan de la mision, §3.4). La API es la fuente de verdad
	para IMPRIMIR (un tipo que ella no conoce se descarta al guardar); este archivo solo le dice al
	editor como se llama cada campo para un comerciante, que icono lleva, con que tamaño cae al
	agregarlo y que opciones tiene en el panel.

	🔴 Las claves (`tipo`) viajan tal cual en el JSON `diseno`. Renombrar una es romper en silencio los
	diseños guardados. Agregar una nueva se hace en los dos lados (API y aca).

	No hay costos ni margenes a proposito: la etiqueta de gondola la ve el cliente final.
*/

/**
 * Los tipos, en el orden en que aparecen en la bandeja "Campos del artículo".
 *
 * - nombre: como lo lee el comerciante.
 * - icono: clase de bootstrap-icons.
 * - ayuda: una linea que explica que imprime (title del item de la bandeja).
 * - w, h: tamaño con que cae al agregarlo, en mm.
 * - tamano, negrita, saltos_de_linea, alineacion: letra con que cae al agregarlo (en la foto y el
 *   dibujo del codigo de barras no se usan, pero viajan igual: mismos valores que la API).
 * - es_texto: false en los que se dibujan (foto y codigo de barras en dibujo): no tienen letra.
 * - es_precio: los que pueden llevar el rotulo adelante.
 */
export const TIPOS = [
	{
		tipo: 'nombre',
		nombre: 'Nombre del artículo',
		icono: 'bi-fonts',
		ayuda: 'El nombre del artículo, tal como está cargado.',
		w: 60, h: 15, tamano: 12, negrita: true, saltos_de_linea: true, alineacion: 'L',
	},
	{
		tipo: 'precio_final',
		nombre: 'Precio final',
		icono: 'bi-currency-dollar',
		ayuda: 'El precio final del artículo.',
		w: 60, h: 13, tamano: 33, negrita: true, saltos_de_linea: false, alineacion: 'R',
		es_precio: true,
	},
	{
		tipo: 'precio_lista',
		nombre: 'Precio de una lista',
		icono: 'bi-tags',
		ayuda: 'El precio final de una lista de precios.',
		w: 60, h: 10, tamano: 24, negrita: true, saltos_de_linea: false, alineacion: 'R',
		es_precio: true,
	},
	{
		tipo: 'codigo_barras_imagen',
		nombre: 'Código de barras (dibujo)',
		icono: 'bi-upc',
		ayuda: 'Las barras para escanear en la caja. Si el artículo no tiene código, queda en blanco.',
		w: 50, h: 6, tamano: 8, negrita: false, saltos_de_linea: false, alineacion: 'L',
		es_texto: false,
	},
	{
		tipo: 'codigo_barras_texto',
		nombre: 'Código de barras (números)',
		icono: 'bi-123',
		ayuda: 'Los números del código de barras.',
		w: 50, h: 5, tamano: 8, negrita: false, saltos_de_linea: false, alineacion: 'C',
	},
	{
		tipo: 'codigo_proveedor',
		nombre: 'Código de proveedor',
		icono: 'bi-upc-scan',
		ayuda: 'El código con que lo vende el proveedor.',
		w: 40, h: 5, tamano: 9, negrita: false, saltos_de_linea: false, alineacion: 'L',
	},
	{
		tipo: 'codigo_interno',
		nombre: 'Código interno',
		icono: 'bi-hash',
		ayuda: 'El código interno de tu negocio (el de la ficha del artículo).',
		w: 30, h: 5, tamano: 9, negrita: false, saltos_de_linea: false, alineacion: 'L',
	},
	{
		tipo: 'categoria',
		nombre: 'Categoría',
		icono: 'bi-folder',
		ayuda: 'La categoría del artículo.',
		w: 40, h: 5, tamano: 9, negrita: false, saltos_de_linea: false, alineacion: 'L',
	},
	{
		tipo: 'sub_categoria',
		nombre: 'Subcategoría',
		icono: 'bi-folder2',
		ayuda: 'La subcategoría del artículo.',
		w: 40, h: 5, tamano: 9, negrita: false, saltos_de_linea: false, alineacion: 'L',
	},
	{
		tipo: 'marca',
		nombre: 'Marca',
		icono: 'bi-award',
		ayuda: 'La marca del artículo.',
		w: 40, h: 5, tamano: 9, negrita: false, saltos_de_linea: false, alineacion: 'L',
	},
	{
		tipo: 'proveedor',
		nombre: 'Proveedor',
		icono: 'bi-truck',
		ayuda: 'El nombre del proveedor del artículo.',
		w: 40, h: 5, tamano: 9, negrita: false, saltos_de_linea: false, alineacion: 'L',
	},
	{
		tipo: 'descripcion',
		nombre: 'Descripción',
		icono: 'bi-text-paragraph',
		ayuda: 'La descripción del artículo (sin formato).',
		w: 60, h: 10, tamano: 8, negrita: false, saltos_de_linea: true, alineacion: 'L',
	},
	{
		tipo: 'unidad_medida',
		nombre: 'Unidad de medida',
		icono: 'bi-rulers',
		ayuda: 'Kilo, litro, unidad… según cómo se vende.',
		w: 20, h: 5, tamano: 9, negrita: false, saltos_de_linea: false, alineacion: 'L',
	},
	{
		tipo: 'stock',
		nombre: 'Stock',
		icono: 'bi-box-seam',
		ayuda: 'El stock que tiene el artículo al imprimir.',
		w: 20, h: 5, tamano: 9, negrita: false, saltos_de_linea: false, alineacion: 'L',
	},
	{
		tipo: 'imagen',
		nombre: 'Foto del artículo',
		icono: 'bi-image',
		ayuda: 'La primera foto del artículo, entera y sin deformar. Si no tiene, queda en blanco.',
		w: 20, h: 20, tamano: 8, negrita: false, saltos_de_linea: false, alineacion: 'C',
		es_texto: false,
	},
	{
		tipo: 'fecha_impresion',
		nombre: 'Fecha de impresión',
		icono: 'bi-calendar3',
		ayuda: 'El día en que se imprime la etiqueta.',
		w: 15, h: 5, tamano: 8, negrita: false, saltos_de_linea: false, alineacion: 'C',
	},
	{
		tipo: 'texto_fijo',
		nombre: 'Texto libre',
		icono: 'bi-type',
		ayuda: 'Un texto que escribís vos, igual en todas las etiquetas: «OFERTA», «Precio por kg».',
		w: 30, h: 6, tamano: 10, negrita: true, saltos_de_linea: false, alineacion: 'L',
	},
]

/* Largo maximo del texto de un "Texto libre" (contrato: 200 caracteres) */
export const LARGO_MAXIMO_DEL_TEXTO = 200

/* Texto con que cae un "Texto libre" nuevo */
export const TEXTO_LIBRE_SUGERIDO = 'OFERTA'

/**
 * La definicion de un tipo, o null si no esta en el catalogo.
 *
 * @param {string} tipo
 * @returns {Object|null}
 */
export function definicion(tipo) {
	for (let i = 0; i < TIPOS.length; i++) {
		if (TIPOS[i].tipo === tipo) {
			return TIPOS[i]
		}
	}
	return null
}

/**
 * Si el tipo imprime texto (tiene letra, negrita, alineacion...). La foto y el dibujo del codigo de
 * barras no.
 *
 * @param {string} tipo
 * @returns {boolean}
 */
export function es_texto(tipo) {
	let def = definicion(tipo)
	return !!def && def.es_texto !== false
}

/**
 * Si el tipo es un precio (admite el rotulo adelante).
 *
 * @param {string} tipo
 * @returns {boolean}
 */
export function es_precio(tipo) {
	let def = definicion(tipo)
	return !!def && !!def.es_precio
}

/**
 * El nombre de un campo para mostrarle al comerciante. Un precio de lista lleva el nombre de la
 * lista ("Precio · Mayorista").
 *
 * @param {Object} elemento
 * @param {Array} listas las listas de precios del store
 * @returns {string}
 */
export function nombre_del_campo(elemento, listas) {
	if (!elemento) {
		return ''
	}
	if (elemento.tipo === 'precio_lista') {
		let lista = buscar_lista(listas, elemento.price_type_id)
		return lista ? 'Precio · ' + lista.name : 'Precio de una lista que ya no existe'
	}
	let def = definicion(elemento.tipo)
	return def ? def.nombre : elemento.tipo
}

/**
 * Busca una lista de precios por id.
 *
 * @param {Array} listas
 * @param {number} id
 * @returns {Object|null}
 */
export function buscar_lista(listas, id) {
	if (!listas || !id) {
		return null
	}
	for (let i = 0; i < listas.length; i++) {
		if (Number(listas[i].id) === Number(id)) {
			return listas[i]
		}
	}
	return null
}
