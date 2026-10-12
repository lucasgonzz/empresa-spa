/*
	Vista previa del ticket de comandera en el diseñador de PDF (misión diseno-ticket-comandera,
	9/10/2026; plan §4 y §7.3).

	Un perfil de venta cuyo tipo de hoja es un rollo (`catalogo.es_ticket`) no se imprime como PDF:
	la API arma los bytes ESC/POS con el motor TicketComanderaEscPos (empresa-api,
	app/Http/Controllers/Pdf/Ticket/). La comandera imprime en una grilla de caracteres de ancho fijo
	-- N = caracteres_por_renglon = floor(ancho_mm × 48 / 80) --, así que la vista previa del
	diseñador es un rollo con letra monoespaciada donde entran exactamente N caracteres, y lo que se
	ve en cada caja sale de las MISMAS reglas que el motor. Este archivo es esas reglas, del lado
	del navegador.

	🔴 ESPEJO DE LA API. Cada función de acá replica una de TextoDeTicket.php, PiezasDeTicket.php o
	TicketComanderaEscPos.php (el nombre de la de allá está en el docblock). Si una regla cambia allá,
	cambia acá. Las reglas (plan §4):

	- CAJAS en la grilla de 12: una caja de c columnas mide floor(c × N / 12) caracteres; en una fila,
	  cada caja menos la última deja uno de separación (contenido = ancho − 1). Lado a lado; la más
	  corta se completa con espacios. Una caja sin ningún campo con datos no ocupa renglones (sus
	  columnas quedan en blanco); una fila sin nada, tampoco.
	- CAMPO: "Rótulo: valor" (rótulo del catálogo si la etiqueta es null, ninguno si es ''), partido
	  por palabras al ancho (una palabra más larga se corta). Una lista, un renglón por elemento (el
	  rótulo en el primero). Alineación con espacios dentro de la caja.
	- ESTILOS: negrita; tamaño < 12 normal, 12..17 alto doble (mismo ancho), >= 18 grande (cada
	  carácter ocupa DOS columnas). Cursiva no hay. Un grande que no entra ni con una letra, normal.
	- TÍTULO de caja en negrita, primero. ESTILO `borde` o `gris`: una línea de guiones del ancho de la
	  caja abajo; `ninguno`: nada.
	- LOGO (`negocio_logo`, tipo `imagen`): centrado a lo ancho; si su caja comparte fila, sale antes
	  de los renglones de la fila.
	- TABLA: caracteres de cada columna con caracteres_de_la_tabla() (tabla_del_disenador.js);
	  encabezado en negrita + guiones, un renglón por ítem (las columnas numéricas -- todos sus
	  valores con algo son números -- a la derecha, encabezado y celdas; con salto de
	  línea se parte, sin salto se corta; un NÚMERO que no entra no se corta: sigue abajo), guiones
	  al final.

	DIFERENCIA DECLARADA: la API limpia cada carácter a uno de CP850 (o su transliteración: "€" →
	"EUR"); acá solo se sacan los de control. Con los datos de ejemplo del catálogo (texto en
	castellano) da lo mismo; un emoji en un texto libre se ve acá y en el papel sale como "?".

	FORMA DE UN RENGLÓN: una lista de TROZOS, como PiezasDeTicket:
	{texto, negrita (true | false | null = relleno, "da igual"), tamano ('normal' | 'alto' | 'grande')}.
	El relleno va siempre en normal (un espacio grande ocuparía dos columnas).

	Funciones puras (no tocan Vue ni la API), como estado_del_disenador.js: se prueban con Node.
*/
import { caracteres_de_la_tabla } from './tabla_del_disenador'

/* Caracteres por renglón de una comandera de 80 mm (la cuenta del Ticket 2.0 de siempre) */
export const CARACTERES_EN_80_MM = 48

/* Ancho de rollo cuando no se sabe ninguno (el de siempre del Ticket 2.0) */
export const ANCHO_DE_ROLLO_POR_DEFECTO_MM = 80

/* Desde este tamaño (pt) la letra es alto doble, y desde este otro, grande (decisión D7) */
export const TAMANO_ALTO = 12
export const TAMANO_GRANDE = 18

/* Las tres clases de tamaño de la comandera (TextoDeTicket::NORMAL / ALTO / GRANDE) */
export const NORMAL = 'normal'
export const ALTO = 'alto'
export const GRANDE = 'grande'

/* El logo del negocio en el catálogo de ticket (CatalogoDeCamposPdf::KEY_NEGOCIO_LOGO) y su tipo */
export const KEY_NEGOCIO_LOGO = 'negocio_logo'
export const TIPO_IMAGEN = 'imagen'

/* El estilo de caja que NO lleva la línea de guiones abajo ("Sin línea") */
export const ESTILO_SIN_LINEA = 'ninguno'

/* Renglones que ocupa el logo de muestra en la vista previa (el de verdad depende de la imagen) */
export const RENGLONES_DEL_LOGO = 4

/* Marcas de la vista en texto del endpoint ticket-comandera (TicketComanderaEscPos::MARCA_*) */
export const MARCA_LOGO = '[LOGO]'
export const MARCA_QR = '[QR]'

/*
	Tamaños de letra de la comandera cuando el catálogo no los manda (contrato §3.3: los manda en
	`tamanos_de_ticket`, con el tamaño en puntos que guarda el diseño).
*/
export const TAMANOS_DE_TICKET_POR_DEFECTO = [
	{ tamano: 9, nombre: 'Normal' },
	{ tamano: 12, nombre: 'Alto doble' },
	{ tamano: 18, nombre: 'Grande' },
]

/* Expresión de "es un número" de TicketComanderaEscPos::es_numerico(): "12", "1.234,50", "$1.234", "-10%" */
const PATRON_NUMERICO = /^[-+]?\s*(?:US\$|U\$S|USD|\$)?\s*-?\d[\d.,]*\s*%?$/

/*
	Valores de muestra de las columnas de la tabla de una venta, por `value_resolver` (los de
	PdfColumnService::default_options()). Dos renglones: lo que importa es ver cómo se parte, se corta
	o se alinea cada columna en su ancho. Una columna que no está acá muestra un texto genérico.
*/
const MUESTRAS_DE_COLUMNAS = {
	row_index: ['1', '2'],
	item_id: ['1520', '87'],
	item_bar_code: ['7791234567890', '7790001112223'],
	item_provider_code: ['TP-13', 'MCH-10'],
	item_name: ['Taladro percutor 13mm', 'Mechas para metal x10'],
	item_amount: ['2', '1'],
	item_cost: ['$32.000', '$2.400'],
	item_cost_total: ['$64.000', '$2.400'],
	item_price_without_iva: ['$37.190', '$2.893'],
	item_subtotal_without_iva: ['$74.380', '$2.893'],
	item_iva_amount: ['$15.620', '$607'],
	item_price_with_iva: ['$45.000', '$3.500'],
	item_subtotal_with_iva: ['$90.000', '$3.500'],
	item_price: ['$45.000', '$3.500'],
	item_discount_percentage: ['10%', '0%'],
	item_discount_total: ['$9.000', '$0'],
	item_subtotal: ['$90.000', '$3.500'],
	item_brand_name: ['Bosch', 'Ezeta'],
	item_category_name: ['Herramientas', 'Accesorios'],
	item_sub_category_name: ['Eléctricas', 'Mechas'],
	item_provider_name: ['Distribuidora Sur', 'Ferro S.R.L.'],
}

/* Lo que muestra una columna que no está en MUESTRAS_DE_COLUMNAS */
const MUESTRA_GENERICA = ['Dato del artículo', 'Otro dato']

/*
	Datos de muestra de los tres bloques fijos de la factura de ARCA (BloquesFiscalesDeTicket), en el
	orden en que los imprime la API. Cada renglón es [texto, rótulo (o null), negrita].
*/
const MUESTRA_DEL_EMISOR = [
	['El Tornillo S.R.L.', null, false],
	['Belgrano 450, Rosario', null, false],
	['30-71234567-8', 'CUIT', false],
	['921-123456-7', 'IIBB', false],
	['01/03/2015', 'Inicio de actividades', false],
	['Responsable inscripto', null, false],
	['FACTURA B', null, true],
	['006', 'Código', false],
	['00001-00000027', 'Comprobante N°', false],
	['09/10/2026', 'Fecha', false],
]

const MUESTRA_DEL_RECEPTOR = [
	['Juan Pérez', 'Cliente', false],
	['20-12345678-9', 'CUIT', false],
	['Consumidor final', 'Condición IVA', false],
	['Av. San Martín 1234', 'Domicilio', false],
	['Contado', 'Condición de venta', false],
]

const MUESTRA_DEL_IVA = [
	['Régimen de Transparencia Fiscal al Consumidor (Ley 27.743)', null, false],
	['$15.620,00', 'IVA contenido', false],
]

const MUESTRA_DEL_CAE = [
	['76123456789012', 'CAE', false],
	['19/10/2026', 'Vto. CAE', false],
]

// ── Texto ────────────────────────────────────────────────────────────────────────────────────

/**
 * Caracteres por renglón de un rollo (CatalogoDeCamposPdf::caracteres_por_renglon): 48 cada 80 mm,
 * hacia abajo. 80 → 48, 58 → 34, 55 → 33.
 *
 * @param {*} ancho_mm
 * @returns {number}
 */
export function caracteres_por_renglon(ancho_mm) {
	let ancho = parseInt(ancho_mm, 10)
	if (!(ancho > 0)) {
		return 0
	}
	return Math.floor(ancho * CARACTERES_EN_80_MM / 80)
}

/**
 * Los caracteres por renglón de un catálogo de ticket: los que manda (`caracteres_por_renglon`) o,
 * si no, la cuenta con su `ancho_mm` (o con 80 mm).
 *
 * @param {Object|null} catalogo
 * @returns {number}
 */
export function caracteres_del_catalogo(catalogo) {
	let mandados = catalogo ? parseInt(catalogo.caracteres_por_renglon, 10) : NaN
	if (mandados > 0) {
		return mandados
	}
	let ancho = catalogo ? parseInt(catalogo.ancho_mm, 10) : NaN
	return caracteres_por_renglon(ancho > 0 ? ancho : ANCHO_DE_ROLLO_POR_DEFECTO_MM)
}

/**
 * El ancho del rollo (mm) de un catálogo de ticket: su `ancho_mm`, o 80 si no lo trae.
 *
 * @param {Object|null} catalogo
 * @returns {number}
 */
export function ancho_del_rollo(catalogo) {
	let ancho = catalogo ? parseInt(catalogo.ancho_mm, 10) : NaN
	return ancho > 0 ? ancho : ANCHO_DE_ROLLO_POR_DEFECTO_MM
}

/**
 * La "hoja" de trabajo de un ticket: el ancho del rollo, sin margen y sin alto (es continuo). Es la
 * que el diseñador usa para convertir los milímetros de las columnas de la tabla (D9: en el ticket,
 * el ancho útil es el del rollo). No se guarda: la API fuerza papel, imprimible y margen del rollo.
 *
 * @param {Object|null} catalogo
 * @returns {{ancho: number, alto: number, margen: number}}
 */
export function hoja_del_rollo(catalogo) {
	return {
		ancho: ancho_del_rollo(catalogo),
		alto: 0,
		margen: 0,
	}
}

/**
 * La clase de tamaño de la comandera para un tamaño en puntos del diseño
 * (TextoDeTicket::clase_de_tamano): menos de 12 normal, de 12 a 17 alto doble, 18 o más grande.
 *
 * @param {*} tamano
 * @returns {string} NORMAL | ALTO | GRANDE
 */
export function clase_de_tamano(tamano) {
	let puntos = parseInt(tamano, 10) || 0
	if (puntos >= TAMANO_GRANDE) {
		return GRANDE
	}
	if (puntos >= TAMANO_ALTO) {
		return ALTO
	}
	return NORMAL
}

/**
 * Cuántas columnas ocupa cada carácter en esa clase (TextoDeTicket::factor): 2 en grande, 1 si no.
 *
 * @param {string} clase
 * @returns {number}
 */
export function factor(clase) {
	return clase === GRANDE ? 2 : 1
}

/**
 * Deja un texto listo para medir (TextoDeTicket::limpiar, sin la conversión a CP850: ver el
 * comentario de arriba): CRLF y CR pasan a LF, la forma compuesta (NFC: una "e" + tilde combinable
 * pasa a ser UNA letra, como en la API desde el 9/10), los saltos de línea se conservan solo si se
 * pide (si no, son espacios) y los caracteres de control pasan a ser espacios (un 0x1D en un dato no
 * llega a la impresora como comando).
 *
 * @param {*} texto
 * @param {boolean} [con_saltos]
 * @returns {string}
 */
export function limpiar(texto, con_saltos) {
	if (texto === null || typeof texto == 'undefined' || typeof texto == 'object') {
		return ''
	}
	let resultado = ''
	let normalizado = String(texto).replace(/\r\n?/g, '\n')
	if (typeof normalizado.normalize == 'function') {
		normalizado = normalizado.normalize('NFC')
	}
	Array.from(normalizado).forEach(function (caracter) {
		if (caracter === '\n') {
			resultado += con_saltos ? '\n' : ' '
			return
		}
		let codigo = caracter.codePointAt(0)
		if (codigo < 0x20 || codigo === 0x7F || (codigo >= 0x80 && codigo < 0xA0)) {
			resultado += ' '
			return
		}
		resultado += caracter
	})
	return resultado
}

/**
 * Largo en caracteres (TextoDeTicket::largo, mb_strlen): por carácter, no por unidad UTF-16.
 *
 * @param {*} texto
 * @returns {number}
 */
export function largo(texto) {
	return Array.from(String(texto === null || typeof texto == 'undefined' ? '' : texto)).length
}

/**
 * Las primeras `ancho` letras de un texto (TextoDeTicket::cortar, mb_substr).
 *
 * @param {*} texto
 * @param {number} ancho
 * @returns {string}
 */
export function cortar(texto, ancho) {
	let cuantos = Math.max(0, parseInt(ancho, 10) || 0)
	return Array.from(String(texto === null || typeof texto == 'undefined' ? '' : texto)).slice(0, cuantos).join('')
}

/**
 * Lo que queda de un texto después de las primeras `desde` letras (mb_substr con inicio).
 *
 * @param {string} texto
 * @param {number} desde
 * @returns {string}
 */
function resto(texto, desde) {
	return Array.from(String(texto)).slice(desde).join('')
}

/**
 * Parte un texto ya limpio en renglones de hasta `ancho` caracteres, cortando en los espacios
 * (TextoDeTicket::partir). Una palabra más larga que el renglón se corta en pedazos del ancho.
 * Respeta los saltos de línea (un párrafo vacío es un renglón vacío).
 *
 * @param {string} texto
 * @param {number} ancho caracteres (no columnas: el que llama ya dividió por el factor del tamaño)
 * @returns {Array<string>}
 */
export function partir(texto, ancho) {
	let maximo = Math.max(1, parseInt(ancho, 10) || 0)
	let renglones = []

	String(texto === null || typeof texto == 'undefined' ? '' : texto).split('\n').forEach(function (parrafo) {
		let actual = ''

		parrafo.split(' ').forEach(function (palabra_original) {
			let palabra = palabra_original
			let candidata = actual === '' ? palabra : actual + ' ' + palabra

			if (largo(candidata) <= maximo) {
				actual = candidata
				return
			}

			/* La palabra no entra en lo que queda del renglón: el renglón se cierra */
			if (actual !== '') {
				renglones.push(actual)
				actual = ''
			}

			/* Una palabra más larga que el renglón se corta en pedazos del ancho */
			while (largo(palabra) > maximo) {
				renglones.push(cortar(palabra, maximo))
				palabra = resto(palabra, maximo)
			}

			actual = palabra
		})

		renglones.push(actual)
	})

	return renglones
}

/**
 * Parte un texto por caracteres, sin buscar espacios (TextoDeTicket::partir_por_caracteres): lo usa
 * la tabla para un número que no entra en su columna (sigue abajo, no se corta).
 *
 * @param {string} texto
 * @param {number} ancho
 * @returns {Array<string>}
 */
export function partir_por_caracteres(texto, ancho) {
	let maximo = Math.max(1, parseInt(ancho, 10) || 0)
	let pendiente = String(texto === null || typeof texto == 'undefined' ? '' : texto)
	let renglones = []

	do {
		renglones.push(cortar(pendiente, maximo))
		pendiente = resto(pendiente, maximo)
	} while (largo(pendiente) > 0)

	return renglones
}

/**
 * Si un valor es un número (cantidad, precio, porcentaje): TicketComanderaEscPos::es_numerico().
 *
 * @param {*} valor
 * @returns {boolean}
 */
export function es_numerico(valor) {
	return PATRON_NUMERICO.test(String(valor === null || typeof valor == 'undefined' ? '' : valor).trim())
}

// ── Trozos y renglones (PiezasDeTicket) ──────────────────────────────────────────────────────

/**
 * Un trozo de renglón (PiezasDeTicket::trozo).
 *
 * @param {string} texto ya limpio
 * @param {boolean|null} negrita null = da igual (relleno)
 * @param {string} [tamano] NORMAL | ALTO | GRANDE
 * @returns {{texto: string, negrita: (boolean|null), tamano: string}}
 */
export function trozo(texto, negrita, tamano) {
	return {
		texto: String(texto === null || typeof texto == 'undefined' ? '' : texto),
		negrita: negrita === null || typeof negrita == 'undefined' ? null : !!negrita,
		tamano: tamano === ALTO || tamano === GRANDE ? tamano : NORMAL,
	}
}

/**
 * Espacios de relleno: tamaño normal y negrita indistinta (PiezasDeTicket::espacios).
 *
 * @param {number} cantidad
 * @returns {Object}
 */
export function espacios(cantidad) {
	return trozo(new Array(Math.max(0, parseInt(cantidad, 10) || 0) + 1).join(' '), null)
}

/**
 * Columnas de la grilla que ocupan unos trozos (un carácter grande cuenta doble).
 *
 * @param {Array} trozos
 * @returns {number}
 */
export function columnas_de_trozos(trozos) {
	let total = 0
	;(trozos || []).forEach(function (pedazo) {
		total += largo(pedazo.texto) * factor(pedazo.tamano)
	})
	return total
}

/**
 * Ubica un contenido dentro de un ancho con espacios a los costados (PiezasDeTicket::alinear): a la
 * derecha solo lo necesario para completar el ancho. Si el contenido ya es más ancho, va tal cual.
 *
 * @param {Array} trozos
 * @param {number} ancho columnas disponibles
 * @param {string} alineacion 'izquierda' | 'centro' | 'derecha'
 * @returns {Array}
 */
export function alinear(trozos, ancho, alineacion) {
	let lista = (trozos || []).slice()
	let sobra = Math.max(0, (parseInt(ancho, 10) || 0) - columnas_de_trozos(lista))

	if (sobra === 0) {
		return lista
	}
	if (alineacion === 'derecha') {
		return [espacios(sobra)].concat(lista)
	}
	if (alineacion === 'centro') {
		let izquierda = Math.floor(sobra / 2)
		return [espacios(izquierda)].concat(lista, [espacios(sobra - izquierda)])
	}
	return lista.concat([espacios(sobra)])
}

/**
 * Un texto partido por palabras en renglones del ancho, cada uno ya alineado
 * (PiezasDeTicket::texto_partido). En grande entran la mitad de letras.
 *
 * @param {string} texto ya limpio (puede traer saltos de línea)
 * @param {number} ancho columnas
 * @param {boolean} negrita
 * @param {string} [tamano]
 * @param {string} [alineacion]
 * @returns {Array<Array>} renglones de trozos
 */
export function texto_partido(texto, ancho, negrita, tamano, alineacion) {
	let clase = tamano === ALTO || tamano === GRANDE ? tamano : NORMAL
	let renglones = []
	partir(texto, Math.floor((parseInt(ancho, 10) || 0) / factor(clase))).forEach(function (parte) {
		renglones.push(alinear([trozo(parte, negrita, clase)], ancho, alineacion || 'izquierda'))
	})
	return renglones
}

/**
 * Una línea de guiones del ancho (PiezasDeTicket::guiones).
 *
 * @param {number} ancho
 * @returns {Array}
 */
export function guiones(ancho) {
	return [trozo(new Array(Math.max(0, parseInt(ancho, 10) || 0) + 1).join('-'), null)]
}

/**
 * Saca del final de un renglón el relleno que sobra (PiezasDeTicket::sin_relleno_al_final): los
 * trozos de relleno (negrita null) que son solo espacios. Los espacios del contenido, no.
 *
 * @param {Array} trozos
 * @returns {Array}
 */
export function sin_relleno_al_final(trozos) {
	let lista = (trozos || []).slice()
	while (lista.length) {
		let ultimo = lista[lista.length - 1]
		if (ultimo.negrita !== null || ultimo.texto.trim() !== '') {
			break
		}
		lista.pop()
	}
	return lista
}

/**
 * El texto de un renglón como lo devuelve la vista en texto de la API (lineas(): los trozos juntos
 * y sin los espacios del final). Una letra grande se escribe una vez.
 *
 * @param {Array} trozos
 * @returns {string}
 */
export function texto_de_renglon(trozos) {
	let texto = ''
	;(trozos || []).forEach(function (pedazo) {
		texto += pedazo.texto
	})
	return texto.replace(/ +$/, '')
}

// ── Campos y cajas ───────────────────────────────────────────────────────────────────────────

/**
 * Los renglones de un campo en una caja de `ancho` columnas, ya alineados
 * (TicketComanderaEscPos::renglones_de_campo). [] si no tiene valor.
 *
 * @param {Object} datos
 * @param {*} datos.valor el valor (texto) o la lista (array) que imprime
 * @param {string} datos.rotulo el rótulo efectivo ('' = sin rótulo)
 * @param {*} datos.tamano tamaño en puntos (el efectivo)
 * @param {boolean} datos.negrita
 * @param {string} datos.alineacion 'izquierda' | 'centro' | 'derecha'
 * @param {number} ancho columnas del contenido de la caja
 * @returns {Array<Array>}
 */
export function renglones_de_campo(datos, ancho) {
	let columnas = parseInt(ancho, 10) || 0
	let valor = datos ? datos.valor : null
	let elementos = (Array.isArray(valor) ? valor : [valor]).filter(function (elemento) {
		return elemento !== null && typeof elemento != 'undefined' && limpiar(elemento).trim() !== ''
	})

	if (!elementos.length || columnas < 1) {
		return []
	}

	let clase = clase_de_tamano(datos.tamano)
	/* Grande que no entra ni con una letra en la caja: sale normal */
	if (Math.floor(columnas / factor(clase)) < 1) {
		clase = NORMAL
	}

	let rotulo = limpiar(datos.rotulo).trim()
	let prefijo = rotulo === '' ? '' : rotulo + ': '
	let renglones = []

	elementos.forEach(function (elemento, indice) {
		let texto = limpiar(elemento, true)
		if (indice === 0 && prefijo) {
			texto = prefijo + texto
		}
		texto_partido(texto, columnas, !!datos.negrita, clase, datos.alineacion).forEach(function (renglon) {
			renglones.push(sin_relleno_al_final(renglon))
		})
	})

	return renglones
}

/**
 * El contenido de una caja (TicketComanderaEscPos::contenido_de_caja), separado en partes para que
 * el diseñador las dibuje donde van: el título, los renglones de cada campo y la línea de abajo.
 *
 * `resolver(campo)` dice qué imprime cada campo: {valor, rotulo, tamano, negrita, alineacion,
 * es_imagen}, o null si la key no está en el catálogo (se saltea, como en la API). En la vista
 * previa, el logo (es_imagen) cuenta como cargado: se ve el de muestra.
 *
 * Una caja sin ningún campo con datos (ni logo) está `vacia`: no imprime nada, ni el título ni la
 * línea, y `renglones` queda vacío.
 *
 * @param {Object} caja caja de trabajo ({titulo, estilo, campos})
 * @param {number} ancho columnas del contenido
 * @param {Function} resolver
 * @returns {{logo: boolean, titulo: Array, campos: Array, linea: (Array|null), vacia: boolean, renglones: Array}}
 */
export function contenido_de_caja(caja, ancho, resolver) {
	let columnas = parseInt(ancho, 10) || 0
	let campos = []
	let logo = false
	let con_datos = false

	;((caja && Array.isArray(caja.campos)) ? caja.campos : []).forEach(function (campo) {
		let datos = columnas >= 1 ? resolver(campo) : null
		if (!datos) {
			campos.push({ campo: campo, renglones: [], es_imagen: false })
			return
		}
		if (datos.es_imagen) {
			logo = true
			campos.push({ campo: campo, renglones: [], es_imagen: true })
			return
		}
		let renglones = renglones_de_campo(datos, columnas)
		if (renglones.length) {
			con_datos = true
		}
		campos.push({ campo: campo, renglones: renglones, es_imagen: false })
	})

	let vacia = !con_datos && !logo
	let titulo = []
	let texto_del_titulo = limpiar(caja ? caja.titulo : '').trim()

	if (!vacia && texto_del_titulo !== '') {
		texto_partido(texto_del_titulo, columnas, true).forEach(function (renglon) {
			titulo.push(sin_relleno_al_final(renglon))
		})
	}

	let estilo = caja && caja.estilo ? caja.estilo : 'borde'
	let linea = !vacia && estilo !== ESTILO_SIN_LINEA ? guiones(columnas) : null

	let renglones = []
	if (!vacia) {
		renglones = titulo.slice()
		campos.forEach(function (parte) {
			parte.renglones.forEach(function (renglon) {
				renglones.push(renglon)
			})
		})
		if (linea) {
			renglones.push(linea)
		}
	}

	return {
		logo: logo,
		titulo: titulo,
		campos: campos,
		linea: linea,
		vacia: vacia,
		renglones: renglones,
	}
}

// ── Zonas: filas y disposición en el rollo ───────────────────────────────────────────────────

/**
 * Las columnas (de 12) de una caja, como las lee el motor: max(1, min(12, cols)), 12 si no trae.
 *
 * @param {Object} item
 * @returns {number}
 */
function cols_de_caja(item) {
	let cols = parseInt(item.cols, 10)
	if (isNaN(cols)) {
		return 12
	}
	return Math.max(1, Math.min(12, cols))
}

/**
 * Las filas de una zona en la grilla de 12 (TicketComanderaEscPos::filas): las cajas se acomodan
 * una al lado de la otra mientras entran; un salto de fila corta; un bloque fijo va solo en su
 * fila, a lo ancho.
 *
 * @param {Array} items los de la zona
 * @returns {Array} [{tipo: 'cajas', cajas: [{item, cols, indice}]}, {tipo: 'fijo', item, indice}]
 */
export function filas_de_zona(items) {
	let filas = []
	let cajas = []
	let columna = 0

	let cerrar = function () {
		if (cajas.length) {
			filas.push({ tipo: 'cajas', cajas: cajas })
		}
		cajas = []
		columna = 0
	}

	;(Array.isArray(items) ? items : []).forEach(function (item, indice) {
		if (!item || typeof item != 'object' || typeof item.tipo != 'string') {
			return
		}
		if (item.tipo === 'salto_de_fila') {
			cerrar()
			return
		}
		if (item.tipo === 'fijo') {
			cerrar()
			filas.push({ tipo: 'fijo', item: item, indice: indice })
			return
		}
		if (item.tipo !== 'caja') {
			return
		}
		let cols = cols_de_caja(item)
		if (columna + cols > 12) {
			cerrar()
		}
		cajas.push({ item: item, cols: cols, indice: indice })
		columna += cols
	})

	cerrar()
	return filas
}

/**
 * Cómo se ubica cada ítem de una zona en el rollo de N caracteres (para dibujarlo en el diseñador),
 * en el mismo orden que `items`:
 *
 * - caja: `ancho` = floor(cols × N / 12); `contenido` = ancho − 1 si no es la última de su fila (el
 *   espacio de separación), ancho si lo es; `separacion` 1 o 0; y la última de cada fila lleva
 *   `relleno`: los caracteres que quedan en blanco hasta el final del renglón (así lo que sigue
 *   empieza abajo, como en el papel).
 * - bloque fijo y salto de fila: a lo ancho (N).
 *
 * @param {Array} items
 * @param {number} caracteres N
 * @returns {Array<{tipo: string, ancho: number, contenido: number, separacion: number, relleno: number, ultima: boolean}>}
 */
export function disposicion_de_zona(items, caracteres) {
	let n = parseInt(caracteres, 10) || 0
	let lista = Array.isArray(items) ? items : []
	let resultado = []

	lista.forEach(function (item) {
		resultado.push({
			tipo: item && item.tipo ? item.tipo : '',
			ancho: n,
			contenido: n,
			separacion: 0,
			relleno: 0,
			ultima: true,
		})
	})

	filas_de_zona(lista).forEach(function (fila) {
		if (fila.tipo !== 'cajas') {
			return
		}
		let usados = 0
		fila.cajas.forEach(function (posicion, indice) {
			let ancho = Math.floor(posicion.cols * n / 12)
			let ultima = indice === fila.cajas.length - 1
			usados += ancho
			resultado[posicion.indice] = {
				tipo: 'caja',
				ancho: ancho,
				contenido: ultima ? ancho : Math.max(0, ancho - 1),
				separacion: ultima ? 0 : 1,
				relleno: 0,
				ultima: ultima,
			}
		})
		let ultima_caja = fila.cajas[fila.cajas.length - 1]
		resultado[ultima_caja.indice].relleno = Math.max(0, n - usados)
	})

	return resultado
}

/**
 * Los renglones de una zona entera, como los imprime la comandera (TicketComanderaEscPos::
 * piezas_de_zona): fila por fila, las cajas lado a lado y renglón a renglón, los logos de la fila
 * antes de sus renglones. Es lo que permite comparar la vista previa con la salida de la API.
 *
 * @param {Array} items
 * @param {number} caracteres N
 * @param {Function} resolver ver contenido_de_caja()
 * @param {Function} [fijo] (item) → renglones de un bloque fijo (o [] / null)
 * @returns {Array} renglones de trozos, o MARCA_LOGO / MARCA_QR (strings)
 */
export function renglones_de_zona(items, caracteres, resolver, fijo) {
	let n = parseInt(caracteres, 10) || 0
	let renglones = []

	filas_de_zona(items).forEach(function (fila) {
		if (fila.tipo === 'fijo') {
			let del_fijo = (typeof fijo == 'function' ? fijo(fila.item) : null) || []
			del_fijo.forEach(function (renglon) {
				renglones.push(renglon)
			})
			return
		}

		let cantidad = fila.cajas.length
		let contenidos = []
		let alto = 0

		fila.cajas.forEach(function (posicion, indice) {
			let ancho = Math.floor(posicion.cols * n / 12)
			let ancho_de_contenido = indice < cantidad - 1 ? ancho - 1 : ancho
			let contenido = contenido_de_caja(posicion.item, ancho_de_contenido, resolver)
			contenidos.push({
				ancho: Math.max(0, ancho_de_contenido),
				renglones: contenido.renglones,
			})
			if (contenido.logo) {
				renglones.push(MARCA_LOGO)
			}
			alto = Math.max(alto, contenido.renglones.length)
		})

		for (let k = 0; k < alto; k++) {
			let trozos = []
			contenidos.forEach(function (contenido, indice) {
				let del_renglon = contenido.renglones[k] || []
				alinear(del_renglon, contenido.ancho, 'izquierda').forEach(function (pedazo) {
					trozos.push(pedazo)
				})
				if (indice < cantidad - 1) {
					trozos.push(espacios(1))
				}
			})
			renglones.push(sin_relleno_al_final(trozos))
		}
	})

	return renglones
}

// ── La tabla ─────────────────────────────────────────────────────────────────────────────────

/**
 * Los dos valores de muestra de una columna de la tabla (por su `value_resolver`).
 *
 * @param {string} value_resolver
 * @returns {Array<string>}
 */
export function muestras_de_columna(value_resolver) {
	let muestras = MUESTRAS_DE_COLUMNAS[value_resolver]
	return (muestras || MUESTRA_GENERICA).slice()
}

/**
 * Los renglones de un ítem de la tabla (TicketComanderaEscPos::renglones_de_fila_de_tabla), POR
 * COLUMNA: cada columna partida (con salto de línea), cortada (sin él) o, si es un número que no
 * entra, seguida abajo; el ítem ocupa los renglones de su columna más alta (las demás se completan
 * con renglones en blanco). "Es un número" mira la COLUMNA (numérica) o el valor, como la API.
 *
 * @param {Array} columnas [{contenido, salto}]
 * @param {Array<string>} valores uno por columna
 * @param {Array<boolean>} numericas por columna: todos sus valores con algo son números
 * @returns {Array<Array<string>>} por columna, sus textos (todas con la misma cantidad)
 */
function partes_de_un_item(columnas, valores, numericas) {
	let partes = []
	let alto = 1

	columnas.forEach(function (columna, c) {
		let valor = valores[c]
		let ancho = columna.contenido
		let lista

		if (ancho < 1) {
			lista = ['']
		} else if (columna.salto) {
			lista = partir(valor, ancho)
		} else if (largo(valor) > ancho && (numericas[c] || es_numerico(valor))) {
			lista = partir_por_caracteres(valor, ancho)
		} else {
			lista = [cortar(valor, ancho)]
		}

		partes.push(lista)
		alto = Math.max(alto, lista.length)
	})

	partes.forEach(function (lista) {
		while (lista.length < alto) {
			lista.push('')
		}
	})

	return partes
}

/**
 * La tabla de muestra en el rollo, armada como la imprime la comandera
 * (TicketComanderaEscPos::piezas_de_tabla) pero POR COLUMNA, porque el diseñador dibuja cada columna
 * aparte (se arrastra, se agranda, se selecciona): cada columna trae sus renglones de `ancho`
 * caracteres -- el contenido alineado y, si no es la última, el espacio de separación --, así que
 * puestas una al lado de la otra dan el renglón entero. De arriba abajo: el rótulo en negrita
 * (cortado a su columna; a la derecha si la columna es numérica), la línea de guiones, los ítems de
 * muestra y la línea de guiones del final.
 *
 * @param {Array} visibles columnas de trabajo de la tabla, en su orden ({rotulo, value_resolver, cols, salto})
 * @param {number} caracteres N
 * @param {number} total medias columnas de la grilla de la tabla
 * @param {Array<Array<string>>} [filas] valores por ítem y por columna (por defecto, las muestras)
 * @returns {Array<{ancho: number, contenido: number, numerica: boolean, renglones: Array}>}
 */
export function tabla_en_el_rollo(visibles, caracteres, total, filas) {
	let lista = Array.isArray(visibles) ? visibles : []
	let anchos = caracteres_de_la_tabla(lista, caracteres, total)
	let cantidad = lista.length
	let columnas = []

	lista.forEach(function (columna, c) {
		columnas.push({
			rotulo: columna.rotulo,
			salto: !!columna.salto,
			ancho: anchos[c].ancho,
			contenido: anchos[c].contenido,
		})
	})

	/* Los ítems: las muestras de cada columna, o los valores que se pasan */
	let items = Array.isArray(filas) ? filas : null
	if (!items) {
		items = []
		let muestras = []
		lista.forEach(function (columna) {
			muestras.push(muestras_de_columna(columna.value_resolver))
		})
		for (let i = 0; i < 2; i++) {
			let valores = []
			muestras.forEach(function (de_la_columna) {
				valores.push(de_la_columna[i] || '')
			})
			items.push(valores)
		}
	}
	let limpios = []
	items.forEach(function (valores) {
		let fila = []
		valores.forEach(function (valor) {
			fila.push(limpiar(valor).trim())
		})
		limpios.push(fila)
	})
	items = limpios

	/* Una columna es numérica si todos sus valores con algo lo son (y tiene al menos uno) */
	let numericas = []
	columnas.forEach(function (columna, c) {
		let con_algo = 0
		let numericos = 0
		items.forEach(function (valores) {
			if (valores[c] === '') {
				return
			}
			con_algo++
			if (es_numerico(valores[c])) {
				numericos++
			}
		})
		numericas.push(con_algo > 0 && con_algo === numericos)
	})

	let resultado = []
	columnas.forEach(function (columna, c) {
		resultado.push({
			ancho: columna.ancho,
			contenido: columna.contenido,
			numerica: numericas[c],
			renglones: [],
		})
	})

	/* Agrega un pedazo de renglón a cada columna (con su separación si no es la última) */
	let agregar = function (c, trozos) {
		let renglon = trozos.slice()
		if (c < cantidad - 1) {
			renglon.push(espacios(1))
		}
		resultado[c].renglones.push(renglon)
	}

	/* Encabezado: el rótulo en negrita, cortado a su columna */
	columnas.forEach(function (columna, c) {
		let rotulo = cortar(limpiar(columna.rotulo).trim(), columna.contenido)
		agregar(c, alinear([trozo(rotulo, true)], columna.contenido, numericas[c] ? 'derecha' : 'izquierda'))
	})
	columnas.forEach(function (columna, c) {
		resultado[c].renglones.push(guiones(columna.ancho))
	})

	/*
		Cada celda se alinea según su COLUMNA (numérica → a la derecha), no según su propio valor: un
		artículo que se llama "12" queda a la izquierda en Nombre, como el resto de la columna (la API
		lo cambió así a pedido del revisor: TicketComanderaEscPos::renglones_de_fila_de_tabla).
	*/
	items.forEach(function (valores) {
		let partes = partes_de_un_item(columnas, valores, numericas)
		columnas.forEach(function (columna, c) {
			let alineacion = numericas[c] ? 'derecha' : 'izquierda'
			partes[c].forEach(function (texto) {
				agregar(c, alinear([trozo(texto, false)], Math.max(0, columna.contenido), alineacion))
			})
		})
	})

	columnas.forEach(function (columna, c) {
		resultado[c].renglones.push(guiones(columna.ancho))
	})

	return resultado
}

/**
 * Los renglones enteros de la tabla (las columnas una al lado de la otra), como los devuelve la
 * vista en texto de la API: es lo que permite comparar con TicketComanderaEscPos::lineas().
 *
 * @param {Array} columnas lo que devuelve tabla_en_el_rollo()
 * @returns {Array<string>}
 */
export function lineas_de_la_tabla(columnas) {
	let lista = Array.isArray(columnas) ? columnas : []
	let alto = lista.length ? lista[0].renglones.length : 0
	let lineas = []
	for (let k = 0; k < alto; k++) {
		let trozos = []
		lista.forEach(function (columna) {
			let del_renglon = columna.renglones[k] || []
			del_renglon.forEach(function (pedazo) {
				trozos.push(pedazo)
			})
		})
		lineas.push(texto_de_renglon(trozos))
	}
	return lineas
}

// ── Bloques fijos de ARCA (muestra) ──────────────────────────────────────────────────────────

/**
 * Los renglones de muestra de un bloque fijo de la factura de ARCA en el rollo, con las reglas de
 * BloquesFiscalesDeTicket (cada dato "Rótulo: valor" partido a lo ancho; el emisor y el receptor
 * terminan con una línea de guiones; el pie lleva el IVA solo con el cuadro de importes, y siempre
 * el CAE y el QR). Los datos son de ejemplo: los de verdad salen de la factura.
 *
 * @param {string} key 'afip_emisor' | 'afip_receptor' | 'afip_pie'
 * @param {number} caracteres N
 * @param {boolean} [importes] el `importes` del fijo del pie (true si no viene)
 * @returns {{renglones: Array, qr: boolean}}
 */
export function fijo_de_muestra(key, caracteres, importes) {
	let n = parseInt(caracteres, 10) || 0
	let renglones = []
	let datos = []
	let qr = false

	if (key === 'afip_emisor') {
		datos = MUESTRA_DEL_EMISOR
	} else if (key === 'afip_receptor') {
		datos = MUESTRA_DEL_RECEPTOR
	} else if (key === 'afip_pie') {
		datos = (importes === false ? [] : MUESTRA_DEL_IVA).concat(MUESTRA_DEL_CAE)
		qr = true
	}

	datos.forEach(function (dato) {
		let texto = dato[1] ? dato[1] + ': ' + dato[0] : dato[0]
		texto_partido(texto, n, dato[2]).forEach(function (renglon) {
			renglones.push(sin_relleno_al_final(renglon))
		})
	})

	if (key === 'afip_emisor' || key === 'afip_receptor') {
		renglones.push(guiones(n))
	}

	return {
		renglones: renglones,
		qr: qr,
	}
}

/**
 * Los tamaños de letra que ofrece el panel del campo en un ticket: los del catálogo
 * (`tamanos_de_ticket`) o, si no vienen, los tres de siempre.
 *
 * @param {Object|null} catalogo
 * @returns {Array<{tamano: number, nombre: string}>}
 */
export function tamanos_de_ticket(catalogo) {
	let lista = catalogo && Array.isArray(catalogo.tamanos_de_ticket) ? catalogo.tamanos_de_ticket.filter(function (opcion) {
		return opcion && parseInt(opcion.tamano, 10) > 0 && typeof opcion.nombre == 'string'
	}) : []
	return lista.length ? lista : TAMANOS_DE_TICKET_POR_DEFECTO.slice()
}
