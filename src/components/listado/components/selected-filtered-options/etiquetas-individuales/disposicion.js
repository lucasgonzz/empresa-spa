/*
	Disposicion de una etiqueta individual (mision etiquetas-individuales-sin-partir, 4/10/2026).

	Calcula, sin dibujar nada, que lineas lleva cada etiqueta, con que letra y en que `y` (en mm),
	para que la etiqueta NUNCA se parta en dos hojas: si no entra, primero se juntan las lineas,
	despues se achica la letra, despues baja el codigo de barras, despues se corta el texto con
	"..." y, como ultimo recurso, se dejan afuera los bloques de abajo.

	🔴 Es un port 1:1 de DisposicionDeEtiquetaIndividual de empresa-api (la clase que usa el PDF).
	Mismos nombres, mismas operaciones y en el mismo orden, para que los dos lados den los mismos
	numeros (los mismos dobles). Si cambia algo aca, cambia alla, y viceversa: la vista previa del
	modal "Configurar etiquetas" tiene que ser lo que sale en el PDF.

	Las medidas van en mm y los tamaños de letra en puntos (pt). El ancho de los textos se mide con
	las tablas de Helvetica de FPDF (metricas_helvetica.js), no con la fuente del navegador.
*/

import { ANCHOS_HELVETICA, ANCHOS_HELVETICA_NEGRITA } from './metricas_helvetica'

/* Un punto tipografico en mm. Solo lo usa la vista previa; el ancho usa la cuenta de FPDF (tamano_mm). */
export const MM_POR_PT = 25.4 / 72

/* Margen arriba y abajo de la etiqueta, en mm: el alto disponible es `alto - 2` */
export const MARGEN_VERTICAL = 1

/* Margen a cada lado del texto (el cMargin de FPDF), en mm: el ancho del texto es `ancho - 2` */
export const MARGEN_TEXTO = 1

/* Alto de linea compacto, en relacion al tamaño de la letra en mm */
export const FACTOR_LINEA = 1.2

/* Lo mas chica que puede quedar una letra al achicarla, en pt */
export const FUENTE_MINIMA = 5

/* Lo mas bajo que puede quedar el codigo de barras al achicarlo, en mm */
export const CODIGO_MINIMO = 4

/* Lo que se agrega al final de una linea recortada */
export const PUNTOS = '...'

/* Codigo del '?' en Windows-1252: lo que deja utf8_decode de PHP para un caracter que no entra en Latin-1 */
export const CODIGO_SIGNO_DE_PREGUNTA = 63

/* Claves de propiedad que acepta el PDF (EtiquetaMedidaController::PROPIEDADES_ETIQUETA_VALIDAS) */
export const PROPIEDADES_VALIDAS = [
	'nombre',
	'codigo_barras',
	'codigo_proveedor',
	'sku',
	'precio',
	'categoria',
	'marca',
	'fecha_actual',
	'nombre_negocio',
]

/* Interlineado por defecto entre bloques, en mm (ArticleBarCodeEtiquetasPdf::DEFAULT_INTERLINEADO) */
export const INTERLINEADO_POR_DEFECTO = 1

/*
	Caracteres que saca el rtrim de PHP sin segundo argumento: espacio, tabulacion, salto de linea,
	retorno de carro, NUL y tabulacion vertical. Va como string (y no como regex) para no pelear con
	la regla no-control-regex de eslint.
*/
const CARACTERES_DE_RTRIM = ' \t\n\r\0\x0B'

/**
 * Tamaño de la letra en mm, con la misma cuenta que FPDF (`$size / $this->k`, con k = 72 / 25.4).
 *
 * @param {number} pt Tamaño de la letra en puntos.
 * @returns {number} Tamaño en mm.
 */
export function tamano_mm(pt) {
	return pt / (72 / 25.4)
}

/**
 * Ancho de un texto en mm: exactamente el GetStringWidth de FPDF.
 *
 * PHP hace utf8_decode y suma el ancho de cada byte. Aca se recorren los puntos de codigo (no las
 * unidades UTF-16): uno de hasta 255 es el mismo byte de Latin-1; uno mayor es el '?' que deja
 * utf8_decode.
 *
 * @param {string} texto Texto a medir.
 * @param {number} pt Tamaño de la letra en puntos.
 * @param {boolean} negrita Si se mide con la tabla de Helvetica negrita.
 * @returns {number} Ancho en mm.
 */
export function ancho_texto(texto, pt, negrita) {
	// Tabla de anchos (milesimas del cuerpo) de la variante que corresponde
	let anchos = negrita ? ANCHOS_HELVETICA_NEGRITA : ANCHOS_HELVETICA
	// Suma entera de los anchos de cada caracter
	let suma = 0
	Array.from(texto).forEach(caracter => {
		// Punto de codigo del caracter; lo que no entra en Latin-1 se mide como '?'
		let codigo = caracter.codePointAt(0)
		if (codigo > 255) {
			codigo = CODIGO_SIGNO_DE_PREGUNTA
		}
		suma += anchos[codigo]
	})
	return (suma * tamano_mm(pt)) / 1000
}

/**
 * Normaliza el texto de una propiedad: toda secuencia de espacios en blanco (incluidos los saltos
 * de linea) pasa a ser un espacio, y se sacan los de las puntas. Un texto vacio no genera bloque.
 *
 * @param {*} texto Texto crudo (puede venir null o undefined).
 * @returns {string} Texto normalizado.
 */
export function normalizar_texto(texto) {
	if (texto === null || texto === undefined) {
		return ''
	}
	return String(texto).replace(/\s+/g, ' ').trim()
}

/**
 * Port del rtrim de PHP sin segundo argumento: saca del final los caracteres de CARACTERES_DE_RTRIM.
 *
 * @param {string} texto
 * @returns {string}
 */
export function recortar_derecha(texto) {
	// Posicion (exclusiva) hasta donde se conserva el texto
	let fin = texto.length
	while (fin > 0 && CARACTERES_DE_RTRIM.indexOf(texto.charAt(fin - 1)) !== -1) {
		fin--
	}
	return texto.substring(0, fin)
}

/**
 * Corta un texto en lineas por palabras (greedy). Una palabra mas ancha que la linea se corta por
 * caracteres.
 *
 * @param {string} texto Texto ya normalizado (sin espacios repetidos ni en las puntas).
 * @param {number} pt Tamaño de la letra en puntos.
 * @param {boolean} negrita Si la letra es negrita.
 * @param {number} ancho_max Ancho maximo de una linea, en mm.
 * @returns {string[]} Lineas.
 */
export function envolver(texto, pt, negrita, ancho_max) {
	// Lineas ya cerradas
	let lineas = []
	// Linea que se esta armando
	let linea = ''
	texto.split(' ').forEach(palabra => {
		// La linea actual con la palabra agregada
		let candidato = (linea === '') ? palabra : linea + ' ' + palabra
		if (ancho_texto(candidato, pt, negrita) <= ancho_max) {
			linea = candidato
			return
		}
		if (linea !== '') {
			lineas.push(linea)
			linea = ''
		}
		if (ancho_texto(palabra, pt, negrita) <= ancho_max) {
			linea = palabra
			return
		}
		// La palabra sola es mas ancha que la linea: se corta por caracteres (puntos de codigo)
		let trozo = ''
		Array.from(palabra).forEach(caracter => {
			if (trozo !== '' && ancho_texto(trozo + caracter, pt, negrita) > ancho_max) {
				lineas.push(trozo)
				trozo = caracter
			} else {
				trozo = trozo + caracter
			}
		})
		linea = trozo
	})
	if (linea !== '') {
		lineas.push(linea)
	}
	return lineas
}

/**
 * Termina una linea con "...", sacandole caracteres del final hasta que entre en el ancho.
 *
 * @param {string} linea Linea a recortar.
 * @param {number} pt Tamaño de la letra en puntos.
 * @param {boolean} negrita Si la letra es negrita.
 * @param {number} ancho_max Ancho maximo de la linea, en mm.
 * @returns {string} La linea con "..." al final.
 */
export function con_puntos(linea, pt, negrita, ancho_max) {
	// Lo que queda de la linea antes de los puntos
	let base = recortar_derecha(linea)
	while (base !== '' && ancho_texto(base + PUNTOS, pt, negrita) > ancho_max) {
		// Se saca el ultimo caracter (punto de codigo, no unidad UTF-16)
		let caracteres = Array.from(base)
		caracteres.pop()
		base = recortar_derecha(caracteres.join(''))
	}
	return base + PUNTOS
}

/**
 * Ancho de la imagen del codigo de barras, en mm (lo que hacia print_bar_code del PDF).
 *
 * @param {number} ancho Ancho de la etiqueta en mm.
 * @returns {number}
 */
export function calcular_ancho_codigo(ancho) {
	return Math.min(Math.min(ancho - 4, 75), ancho - 6)
}

/**
 * Arma los bloques de la etiqueta para un intento y suma su alto.
 *
 * @param {object} parametros Los de calcular_disposicion (ancho, propiedades, textos, tiene_codigo, interlineado).
 * @param {string} modo 'normal' (letra y alto de linea de siempre) o 'compacto'.
 * @param {number} factor Factor de la letra (solo en modo compacto).
 * @param {number} codigo_alto Alto del codigo de barras, en mm.
 * @param {object} recortes Mapa key => maximo de lineas de ese bloque.
 * @param {string[]} omitidos Keys que se dejan afuera.
 * @returns {{bloques: object[], alto_total: number, modo: string, factor: number, codigo_alto: number, interlineado: number, omitidos: string[]}}
 */
export function armar_intento(parametros, modo, factor, codigo_alto, recortes, omitidos) {
	// Ancho de la etiqueta en mm
	let ancho = parametros.ancho
	// Ancho de la imagen del codigo de barras
	let ancho_codigo = calcular_ancho_codigo(ancho)
	// Bloques del intento, en el orden de las propiedades
	let bloques = []
	// Si algun texto de una sola palabra quedo partido por letras en este intento
	let parte_una_palabra = false
	parametros.propiedades.forEach(propiedad => {
		let key = propiedad.key
		if (omitidos.indexOf(key) !== -1) {
			return
		}
		if (key === 'codigo_barras') {
			if (!parametros.tiene_codigo) {
				return
			}
			bloques.push({
				tipo: 'codigo',
				key: key,
				alto: codigo_alto,
				ancho: ancho_codigo,
			})
			return
		}
		// Texto de la propiedad para este articulo
		let texto = normalizar_texto(parametros.textos[key])
		if (texto === '') {
			return
		}
		// Si la letra es negrita
		let negrita = !!propiedad.negrita
		// Tamaño de la letra del intento, en pt
		let pt = (modo === 'normal') ? propiedad.font_size : Math.max(FUENTE_MINIMA, propiedad.font_size * factor)
		let lineas = envolver(texto, pt, negrita, ancho - 2)
		// Un texto de UNA sola palabra (precio, SKU, codigo, fecha) que no entra en el ancho queda
		// partido por letras ("$15.432,1" / "0"). Mientras la letra se pueda achicar eso no cuenta
		// como que entra (ver entra_sin_partir_palabras).
		if (texto.indexOf(' ') === -1 && lineas.length > 1) {
			parte_una_palabra = true
		}
		let recortado = false
		if (Object.prototype.hasOwnProperty.call(recortes, key) && lineas.length > recortes[key]) {
			lineas = lineas.slice(0, recortes[key])
			lineas[lineas.length - 1] = con_puntos(lineas[lineas.length - 1], pt, negrita, ancho - 2)
			recortado = true
		}
		// Alto de cada linea, en mm: el de siempre del PDF en modo normal, el compacto si no
		let alto_linea = (modo === 'normal') ? Math.max(4, Math.floor(propiedad.font_size * 0.55)) : tamano_mm(pt) * FACTOR_LINEA
		bloques.push({
			tipo: 'texto',
			key: key,
			lineas: lineas,
			tamano: pt,
			negrita: negrita,
			alto_linea: alto_linea,
			alto: lineas.length * alto_linea,
			recortado: recortado,
		})
	})
	// Espacio entre bloques del intento, en mm
	let inter = (modo === 'normal') ? parametros.interlineado : parametros.interlineado * factor
	// Suma de los altos de los bloques
	let suma_altos = 0
	bloques.forEach(bloque => {
		suma_altos += bloque.alto
	})
	return {
		bloques: bloques,
		alto_total: suma_altos + inter * Math.max(0, bloques.length - 1),
		modo: modo,
		factor: factor,
		codigo_alto: codigo_alto,
		interlineado: inter,
		omitidos: omitidos.slice(),
		// Solo para decidir si el intento sirve; no viaja al resultado
		parte_una_palabra: parte_una_palabra,
	}
}

/**
 * Indica si un intento entra en la etiqueta (alto total <= alto - 2).
 *
 * @param {object} intento Lo que devuelve armar_intento.
 * @param {number} alto Alto de la etiqueta en mm.
 * @returns {boolean}
 */
function entra_en_la_etiqueta(intento, alto) {
	return intento.alto_total <= alto - 2
}

/**
 * Indica si todas las letras de un intento ya quedaron en FUENTE_MINIMA.
 *
 * @param {object} intento Lo que devuelve armar_intento.
 * @returns {boolean}
 */
function todas_las_letras_en_minima(intento) {
	let todas = true
	intento.bloques.forEach(bloque => {
		if (bloque.tipo === 'texto' && bloque.tamano !== FUENTE_MINIMA) {
			todas = false
		}
	})
	return todas
}

/**
 * Indica si un intento de los pasos 1 y 2 sirve: entra en el alto y no parte por letras un texto
 * de una sola palabra. Lo segundo se perdona recien con todas las letras en el minimo, porque ahi
 * ya no hay letra mas chica que probar (y un codigo de 13 digitos en una etiqueta angosta tiene que
 * salir igual). Misma regla que DisposicionDeEtiquetaIndividual::entra_sin_partir_palabras.
 *
 * @param {object} intento Lo que devuelve armar_intento.
 * @param {number} alto Alto de la etiqueta en mm.
 * @returns {boolean}
 */
function entra_sin_partir_palabras(intento, alto) {
	if (!entra_en_la_etiqueta(intento, alto)) {
		return false
	}
	return !intento.parte_una_palabra || todas_las_letras_en_minima(intento)
}

/**
 * Pasa un intento al resultado final: posicion `y` de cada bloque, `x` del codigo y banderas.
 *
 * @param {object} parametros Los de calcular_disposicion.
 * @param {object} intento El intento elegido.
 * @param {boolean} ajustado Si no entro en el intento 1.
 * @returns {object} El resultado con las claves del contrato.
 */
function armar_resultado(parametros, intento, ajustado) {
	// Donde arranca el primer bloque para que el contenido quede centrado en vertical
	let y_inicio = (parametros.alto - intento.alto_total) / 2
	// `y` del bloque que sigue
	let y = y_inicio
	// Si algun bloque quedo recortado con "..."
	let recortado = false
	let bloques = []
	intento.bloques.forEach(bloque => {
		if (bloque.tipo === 'codigo') {
			bloques.push({
				tipo: bloque.tipo,
				key: bloque.key,
				y: y,
				alto: bloque.alto,
				ancho: bloque.ancho,
				x: (parametros.ancho - bloque.ancho) / 2,
			})
		} else {
			bloques.push({
				tipo: bloque.tipo,
				key: bloque.key,
				y: y,
				alto: bloque.alto,
				lineas: bloque.lineas,
				tamano: bloque.tamano,
				negrita: bloque.negrita,
				alto_linea: bloque.alto_linea,
				recortado: bloque.recortado,
			})
			if (bloque.recortado) {
				recortado = true
			}
		}
		y = y + (bloque.alto + intento.interlineado)
	})
	return {
		bloques: bloques,
		alto_total: intento.alto_total,
		y_inicio: y_inicio,
		modo: intento.modo,
		factor: intento.factor,
		codigo_alto: intento.codigo_alto,
		interlineado: intento.interlineado,
		ajustado: ajustado,
		recortado: recortado,
		omitidos: intento.omitidos,
	}
}

/**
 * Calcula la disposicion de una etiqueta. Prueba los intentos en orden y se queda con el primero
 * que entra en `alto - 2`:
 *
 * 1. Modo normal (lo de siempre).
 * 2. Modo compacto, con la letra al 100 %, 95 %, 90 %… hasta que todas queden en FUENTE_MINIMA.
 * 3. Con esa letra, el codigo de barras al 95 %, 90 %… hasta CODIGO_MINIMO.
 * 4. Recortes: al bloque de texto con mas lineas se le saca una (la ultima termina en "...").
 * 5. Omitidos: se deja afuera el ultimo bloque, hasta que entre.
 *
 * @param {object} parametros
 * @param {number} parametros.ancho Ancho de la etiqueta en mm.
 * @param {number} parametros.alto Alto de la etiqueta en mm.
 * @param {Array<{key: string, font_size: number, negrita: boolean}>} parametros.propiedades Ya resueltas (resolver_propiedades).
 * @param {number} parametros.codigo_alto Alto pedido del codigo de barras, en mm (resolver_codigo_barras_alto).
 * @param {number} parametros.interlineado Espacio entre bloques, en mm (resolver_interlineado).
 * @param {Object<string, string>} parametros.textos Texto de cada key (textos_de_articulo).
 * @param {boolean} parametros.tiene_codigo Si el articulo tiene codigo de barras.
 * @returns {{bloques: object[], alto_total: number, y_inicio: number, modo: string, factor: number, codigo_alto: number, interlineado: number, ajustado: boolean, recortado: boolean, omitidos: string[]}}
 */
export function calcular_disposicion(parametros) {
	// Alto de la etiqueta en mm
	let alto = parametros.alto
	// Alto del codigo de barras que pidio el usuario
	let codigo_pedido = parametros.codigo_alto

	// 1. Modo normal, letra y codigo como los pidio el usuario
	let intento_normal = armar_intento(parametros, 'normal', 1, codigo_pedido, {}, [])
	if (entra_sin_partir_palabras(intento_normal, alto)) {
		return armar_resultado(parametros, intento_normal, false)
	}

	// Si hay algun bloque de texto y si hay bloque de codigo (no dependen del modo)
	let hay_texto = false
	let hay_codigo = false
	intento_normal.bloques.forEach(bloque => {
		if (bloque.tipo === 'texto') {
			hay_texto = true
		}
		if (bloque.tipo === 'codigo') {
			hay_codigo = true
		}
	})

	// Intento que se esta probando
	let intento = intento_normal

	// 2. Modo compacto achicando la letra de a 5 %
	let factor_final = 1
	if (hay_texto) {
		let k = 0
		for (;;) {
			let factor = (100 - 5 * k) / 100
			intento = armar_intento(parametros, 'compacto', factor, codigo_pedido, {}, [])
			factor_final = factor
			if (entra_sin_partir_palabras(intento, alto)) {
				return armar_resultado(parametros, intento, true)
			}
			if (todas_las_letras_en_minima(intento) || factor <= 0.05) {
				break
			}
			k++
		}
	}

	// 3. Con la letra final, se baja el codigo de barras de a 5 % hasta CODIGO_MINIMO
	let codigo_final = codigo_pedido
	if (hay_codigo && codigo_pedido > CODIGO_MINIMO) {
		let k = 1
		for (;;) {
			let codigo_alto = Math.max(CODIGO_MINIMO, codigo_pedido * (100 - 5 * k) / 100)
			intento = armar_intento(parametros, 'compacto', factor_final, codigo_alto, {}, [])
			codigo_final = codigo_alto
			if (entra_en_la_etiqueta(intento, alto)) {
				return armar_resultado(parametros, intento, true)
			}
			if (codigo_alto === CODIGO_MINIMO) {
				break
			}
			k++
		}
	}

	// 4. Recortes: al bloque de texto con mas lineas se le baja su maximo en una
	let recortes = {}
	for (;;) {
		intento = armar_intento(parametros, 'compacto', factor_final, codigo_final, recortes, [])
		if (entra_en_la_etiqueta(intento, alto)) {
			return armar_resultado(parametros, intento, true)
		}
		// Bloque de texto con mas lineas (mas de una); en el empate, el primero en orden
		let elegido = null
		intento.bloques.forEach(bloque => {
			if (bloque.tipo !== 'texto' || bloque.lineas.length <= 1) {
				return
			}
			if (elegido === null || bloque.lineas.length > elegido.lineas.length) {
				elegido = bloque
			}
		})
		if (elegido === null) {
			break
		}
		recortes[elegido.key] = elegido.lineas.length - 1
	}

	// 5. Omitidos: mientras no entre y queden bloques, se deja afuera el ultimo
	let omitidos = []
	while (!entra_en_la_etiqueta(intento, alto) && intento.bloques.length > 0) {
		omitidos.push(intento.bloques[intento.bloques.length - 1].key)
		intento = armar_intento(parametros, 'compacto', factor_final, codigo_final, recortes, omitidos)
	}
	return armar_resultado(parametros, intento, true)
}

/**
 * Indica si un valor es "falso" para PHP (lo que hace caer un `?:` o un `!empty()`): null,
 * undefined, false, 0, '' y '0'.
 *
 * @param {*} valor
 * @returns {boolean}
 */
export function es_falso_en_php(valor) {
	return valor === null || valor === undefined || valor === false || valor === 0 || valor === '' || valor === '0'
}

/**
 * Texto de un valor como el `(string)` de PHP para lo que puede venir de la base: null queda vacio.
 *
 * @param {*} valor
 * @returns {string}
 */
function texto_o_vacio(valor) {
	if (valor === null || valor === undefined) {
		return ''
	}
	return String(valor)
}

/**
 * Redondea "mitad para arriba" (alejandose del cero) a `decimales`, como el round de PHP: se corre
 * la coma con notacion exponencial para que 1.005 no se redondee como 1.00499999…
 *
 * @param {number} numero Numero no negativo.
 * @param {number} decimales
 * @returns {number}
 */
function redondear_como_php(numero, decimales) {
	// Representacion del numero; si ya viene en notacion exponencial se multiplica a mano
	let texto = String(numero)
	if (texto.indexOf('e') !== -1) {
		let potencia = Math.pow(10, decimales)
		return Math.round(numero * potencia) / potencia
	}
	return Number(Math.round(Number(texto + 'e' + decimales)) + 'e-' + decimales)
}

/**
 * Port del number_format de PHP con separador de miles '.' y decimal ','.
 *
 * @param {number|string} valor
 * @param {number} decimales 0 o 2.
 * @returns {string}
 */
export function formatear_como_number_format(valor, decimales) {
	// Numero a formatear (PHP convierte el string a float)
	let numero = Number(valor)
	if (!isFinite(numero)) {
		numero = 0
	}
	let negativo = numero < 0
	// Valor absoluto ya redondeado
	let redondeado = redondear_como_php(Math.abs(numero), decimales)
	// Parte entera y decimal, con punto
	let partes = redondeado.toFixed(decimales).split('.')
	// Parte entera con el '.' de miles
	let resultado = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.')
	if (decimales > 0) {
		resultado = resultado + ',' + partes[1]
	}
	if (negativo && redondeado !== 0) {
		resultado = '-' + resultado
	}
	return resultado
}

/**
 * Port de Numbers::price de empresa-api: con decimales distintos de cero, 2 decimales
 * ("1.234,50"); si no, sin decimales ("1.234").
 *
 * @param {number|string} valor final_price del articulo.
 * @returns {string}
 */
export function precio_como_php(valor) {
	// El precio como texto, igual que lo ve strpos en PHP
	let texto = String(valor)
	// PHP compara `strpos(...) != false`: un punto en la posicion 0 cuenta como que no hay
	let posicion = texto.indexOf('.')
	if (posicion > 0) {
		let partes = texto.split('.')
		// '50' != '00' en PHP compara como numeros: decimales distintos de cero
		if (Number(partes[1]) !== 0) {
			return formatear_como_number_format(valor, 2)
		}
		return formatear_como_number_format(partes[0], 0)
	}
	return formatear_como_number_format(valor, 0)
}

/**
 * Fecha en formato d/m/Y (dia y mes con dos digitos).
 *
 * @param {Date} fecha
 * @returns {string}
 */
export function fecha_d_m_y(fecha) {
	let dia = String(fecha.getDate())
	let mes = String(fecha.getMonth() + 1)
	if (dia.length < 2) {
		dia = '0' + dia
	}
	if (mes.length < 2) {
		mes = '0' + mes
	}
	return dia + '/' + mes + '/' + fecha.getFullYear()
}

/**
 * Texto de cada propiedad para un articulo (text_for_propiedad del PDF).
 *
 * @param {object} article Articulo (con `category` y `brand` cargados).
 * @param {object|null} owner Dueño de la cuenta (para el nombre del negocio).
 * @param {Date} [hoy] Fecha para `fecha_actual`; por defecto, ahora.
 * @returns {Object<string, string>} Mapa key => texto.
 */
export function textos_de_articulo(article, owner, hoy) {
	// Articulo a leer (vacio si no vino)
	let articulo = article || {}
	// Fecha de la etiqueta
	let fecha = hoy || new Date()
	return {
		nombre: texto_o_vacio(articulo.name),
		codigo_proveedor: es_falso_en_php(articulo.provider_code) ? '' : String(articulo.provider_code),
		sku: es_falso_en_php(articulo.sku) ? '' : String(articulo.sku),
		precio: (articulo.final_price === null || articulo.final_price === undefined) ? '' : '$' + precio_como_php(articulo.final_price),
		categoria: articulo.category ? texto_o_vacio(articulo.category.name) : '',
		marca: articulo.brand ? texto_o_vacio(articulo.brand.name) : '',
		fecha_actual: fecha_d_m_y(fecha),
		nombre_negocio: (owner && !es_falso_en_php(owner.company_name)) ? String(owner.company_name) : '',
	}
}

/**
 * Si el articulo tiene codigo de barras (el `if (!$article->bar_code)` del PDF).
 *
 * @param {object} article
 * @returns {boolean}
 */
export function tiene_codigo_de_barras(article) {
	return !!article && !es_falso_en_php(article.bar_code)
}

/**
 * Tamaño de letra por defecto segun la cantidad de campos (font_size_for_lines del PDF).
 *
 * @param {number} line_count
 * @returns {number}
 */
export function font_size_por_lineas(line_count) {
	if (line_count <= 2) {
		return 11
	}
	if (line_count <= 4) {
		return 9
	}
	if (line_count <= 6) {
		return 8
	}
	return 7
}

/**
 * Tamaño de letra por defecto de una propiedad: el precio, un punto mas.
 *
 * @param {string} key
 * @param {number} line_count Cantidad de campos activos.
 * @returns {number}
 */
export function default_font_size_de_propiedad(key, line_count) {
	let base = font_size_por_lineas(line_count)
	if (key === 'precio') {
		return Math.min(24, base + 1)
	}
	return base
}

/**
 * Resuelve el tamaño de letra de una propiedad como el PDF: vacio, el default por cantidad de
 * campos; si no, el entero acotado entre 6 y 24.
 *
 * El parseInt es el mismo que hace el modal al mandar la config: un input vacio da NaN, que viaja
 * como null y el PDF lo toma como vacio.
 *
 * @param {string} key
 * @param {*} font_size
 * @param {number} line_count Cantidad de campos activos.
 * @returns {number}
 */
export function resolver_font_size(key, font_size, line_count) {
	let valor = parseInt(font_size, 10)
	if (isNaN(valor)) {
		return default_font_size_de_propiedad(key, line_count)
	}
	return Math.min(24, Math.max(6, valor))
}

/**
 * Config por defecto del PDF: nombre + codigo de barras.
 *
 * @returns {Array<{key: string, font_size: number, negrita: boolean}>}
 */
export function propiedades_por_defecto() {
	return [
		{
			key: 'nombre',
			font_size: default_font_size_de_propiedad('nombre', 2),
			negrita: false,
		},
		{
			key: 'codigo_barras',
			font_size: default_font_size_de_propiedad('codigo_barras', 2),
			negrita: false,
		},
	]
}

/**
 * Resuelve las propiedades como normalize_propiedades del PDF: descarta claves invalidas o
 * repetidas, resuelve el tamaño de letra y la negrita, y sin nada valido usa la config por defecto.
 *
 * @param {Array<string|{key: string, font_size: *, negrita: *}>} propiedades
 * @returns {Array<{key: string, font_size: number, negrita: boolean}>}
 */
export function resolver_propiedades(propiedades) {
	if (!Array.isArray(propiedades) || !propiedades.length) {
		return propiedades_por_defecto()
	}
	// Items con clave, como los arma PHP antes de validar
	let items_crudos = []
	propiedades.forEach(item => {
		if (typeof item === 'string') {
			let clave = item.trim()
			if (clave !== '') {
				items_crudos.push({ key: clave })
			}
			return
		}
		if (item && typeof item === 'object' && !es_falso_en_php(item.key)) {
			items_crudos.push(item)
		}
	})
	if (!items_crudos.length) {
		return propiedades_por_defecto()
	}
	// Cantidad de campos para el default de letra (cuenta tambien los que despues se descartan)
	let line_count = items_crudos.length
	let resultado = []
	// Claves ya agregadas, para descartar repetidas
	let claves_usadas = []
	items_crudos.forEach(item => {
		let key = String(item.key).trim()
		if (key === '' || PROPIEDADES_VALIDAS.indexOf(key) === -1 || claves_usadas.indexOf(key) !== -1) {
			return
		}
		claves_usadas.push(key)
		resultado.push({
			key: key,
			font_size: resolver_font_size(key, item.font_size, line_count),
			negrita: !es_falso_en_php(item.negrita),
		})
	})
	if (!resultado.length) {
		return propiedades_por_defecto()
	}
	return resultado
}

/**
 * Alto por defecto del codigo de barras segun el alto de la etiqueta
 * (default_code_height_for_etiqueta_height del PDF).
 *
 * @param {number} alto_etiqueta Alto de la etiqueta en mm.
 * @returns {number}
 */
export function default_codigo_barras_alto(alto_etiqueta) {
	// (int) de PHP sobre el alto
	let alto = parseInt(alto_etiqueta, 10)
	if (isNaN(alto)) {
		alto = 0
	}
	return Math.min(14, Math.max(8, Math.floor(alto * 0.22)))
}

/**
 * Resuelve el alto del codigo de barras como el PDF: vacio, el default de la medida; si no, el
 * entero acotado entre 4 y 50 mm.
 *
 * @param {*} valor Lo que tiene el input.
 * @param {number} alto_etiqueta Alto de la etiqueta en mm.
 * @returns {number}
 */
export function resolver_codigo_barras_alto(valor, alto_etiqueta) {
	if (valor === null || valor === undefined || valor === '') {
		return default_codigo_barras_alto(alto_etiqueta)
	}
	let entero = parseInt(valor, 10)
	if (isNaN(entero)) {
		entero = 0
	}
	return Math.min(50, Math.max(4, entero))
}

/**
 * Resuelve el interlineado como el PDF: vacio, 1 mm; si no, el entero acotado entre 0 y 30 mm.
 *
 * @param {*} valor Lo que tiene el input.
 * @returns {number}
 */
export function resolver_interlineado(valor) {
	if (valor === null || valor === undefined || valor === '') {
		return INTERLINEADO_POR_DEFECTO
	}
	let entero = parseInt(valor, 10)
	if (isNaN(entero)) {
		entero = 0
	}
	return Math.min(30, Math.max(0, entero))
}

/**
 * Alto de codigo en texto para la nota: un decimal si hace falta, con coma.
 *
 * @param {number} mm
 * @returns {string}
 */
function mm_para_la_nota(mm) {
	// Con un decimal, y sin el ",0" si es entero
	let texto = mm.toFixed(1)
	if (texto.slice(-2) === '.0') {
		texto = texto.slice(0, -2)
	}
	return texto.replace('.', ',')
}

/**
 * Frases de la nota que va debajo de la vista previa cuando la disposicion tuvo que ajustar algo,
 * para que el comerciante entienda que hace el PDF. Sin ajuste, ninguna.
 *
 * @param {object} disposicion Lo que devuelve calcular_disposicion.
 * @param {number} codigo_alto_pedido Alto del codigo que pidio el usuario, en mm.
 * @param {function(string): string} label_de_key Nombre legible de una key ("Precio", "Fecha actual").
 * @returns {string[]}
 */
export function frases_de_ajuste(disposicion, codigo_alto_pedido, label_de_key) {
	let frases = []
	if (!disposicion || !disposicion.ajustado) {
		return frases
	}
	if (disposicion.factor < 1) {
		frases.push('Para que entre en la etiqueta, el PDF achica la letra al ' + Math.round(disposicion.factor * 100) + ' %.')
	} else if (disposicion.modo === 'compacto') {
		frases.push('Para que entre en la etiqueta, el PDF junta las líneas.')
	}
	if (disposicion.codigo_alto < codigo_alto_pedido) {
		frases.push('El código de barras baja a ' + mm_para_la_nota(disposicion.codigo_alto) + ' mm.')
	}
	if (disposicion.recortado) {
		frases.push('El texto que no entra se corta con «...».')
	}
	if (disposicion.omitidos.length) {
		// Nombres legibles de lo que quedo afuera
		let labels = []
		disposicion.omitidos.forEach(key => {
			labels.push(label_de_key(key))
		})
		frases.push('No entra: ' + labels.join(', ') + '.')
	}
	return frases
}
