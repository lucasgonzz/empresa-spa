import { separadores_es_desde_dato } from '@/common-vue/helpers/formato_numero'

/**
 * Textos y cuentas chicas de Alertas → Catálogo → Categorías (misión categorizacion-tres-modelos,
 * 5/10/2026).
 *
 * La API manda CÓDIGOS (motivos de bloqueo, advertencias, estados de cada artículo, por qué ya no se
 * puede volver atrás) y este archivo es el único lugar donde se traducen a lo que lee el
 * comerciante. Así las tarjetas, el cartel de confirmar, el resumen de lo elegido y la revisión
 * dicen lo mismo con las mismas palabras, y si mañana la API suma un código nuevo se ve igual
 * —humanizado— sin tocar ningún componente. Es el mismo criterio de imagenes/textos.js.
 *
 * 🔴 Estos textos los lee un cliente: van con acentos, en voseo, sin jerga y sin emojis. Los
 * comentarios pueden ser técnicos; las etiquetas, no.
 *
 * 🔴 Vocabulario fijo (el mismo en toda la pantalla): cada tarjeta es un "sistema de categorías" y
 * "elegir" es lo que hace el dueño con una. La palabra "propuesta" es de la API y de los
 * comentarios: NO se le muestra al usuario. "A revisar" son los artículos que la IA no tiene claros
 * y que quedan sin categoría hasta que alguien los apruebe.
 */

/**
 * Las tres solapas de la revisión, en el orden en que se dibujan. El `valor` es el que entiende la
 * API en `?solapa=`.
 */
export const SOLAPAS = [
	{ valor: 'a_revisar', nombre: 'A revisar' },
	{ valor: 'asignados', nombre: 'Asignados' },
	{ valor: 'sin_categoria', nombre: 'Sin categoría' },
]

/** Cómo se llama cada confianza de la IA sobre la categoría de un artículo. */
export const CONFIANZAS = {
	segura: 'Segura',
	dudosa: 'Dudosa',
	ninguna: 'Sin categoría',
}

/** Estado de un artículo dentro de la revisión. */
export const ESTADOS_DE_ITEM = {
	a_revisar: 'A revisar',
	aplicada: 'Asignado',
	aprobada: 'Aprobado',
	rechazada: 'Rechazado',
	sin_asignar: 'Sin categoría',
}

/**
 * Tono de la etiqueta de cada estado de artículo: `ok` (verde), `aviso` (ámbar), `mal` (rojo) o
 * `neutro` (gris). Son las variantes `cat-etiqueta--*`.
 */
export const TONOS_DE_ITEM = {
	a_revisar: 'aviso',
	aplicada: 'ok',
	aprobada: 'ok',
	rechazada: 'mal',
	sin_asignar: 'neutro',
}

/**
 * Por qué ya no se puede cambiar de sistema (`motivo_no_puede_cambiar` de la corrida), escrito para
 * seguir a "Ya no se puede cambiar de sistema: ". El motivo `no_esta_elegida` no se traduce: no es
 * algo que el dueño pueda entender ni le sirve (la API tampoco lo manda en una corrida elegida).
 */
export const MOTIVOS_NO_PUEDE_CAMBIAR = {
	hay_revisiones: 'ya empezaste a revisar los artículos dudosos',
	articulos_editados: 'algunos artículos cambiaron de categoría después de elegir',
	categorias_editadas: 'se modificaron categorías que creó este sistema',
}

/**
 * Las advertencias que no bloquean pero el dueño tiene que leer antes de confirmar. Cada una dice
 * para qué tipo de tarjeta vale (`nueva`: un sistema nuevo; `mantener`: "Mantener las mías"), porque
 * la API manda en `advertencias` la unión de las de todas las tarjetas: el cambio de links de la
 * tienda no tiene sentido para "Mantener las mías", y el recálculo de precios solo para ella.
 * Un código que la SPA todavía no conoce se muestra humanizado y para todos los tipos.
 */
export const ADVERTENCIAS = {
	vinculacion_de_inventario: {
		aplica_a: ['nueva', 'mantener'],
		texto: 'Tenés cuentas vinculadas por inventario. Ellas no se enteran del cambio de categorías en el momento: se actualizan aparte.',
	},
	urls_de_la_tienda: {
		aplica_a: ['nueva'],
		texto: 'Los links de las categorías de tu tienda online pueden cambiar. La tienda puede tardar unos 10 minutos en mostrar los cambios.',
	},
	precios_a_recalcular: {
		aplica_a: ['mantener'],
		texto: 'Como usás márgenes o listas de precios por categoría, al completar las categorías de los artículos sus precios se recalculan en segundo plano.',
	},
}

/**
 * Por qué un sistema nuevo está bloqueado (`bloqueo.motivos` de `actual`), uno por código. Cada uno
 * es una función de la cantidad de casos que encontró la API. Los R1 a R6 son márgenes o listas de
 * precio que dependen de la categoría; `tienda_nube` es la conexión con Tienda Nube.
 */
export const MOTIVOS_DE_BLOQUEO = {
	R1: function (n) {
		return n === 1 ? '1 categoría tiene un margen de ganancia propio.' : entero_es(n) + ' categorías tienen un margen de ganancia propio.'
	},
	R2: function () {
		return 'Usás las listas de precios por categoría o por rango de cantidad vendida.'
	},
	R3: function (n) {
		return n === 1 ? '1 categoría tiene un porcentaje propio en alguna lista de precios.' : entero_es(n) + ' categorías tienen un porcentaje propio en alguna lista de precios.'
	},
	R4: function (n) {
		return n === 1 ? '1 subcategoría tiene un porcentaje propio en alguna lista de precios.' : entero_es(n) + ' subcategorías tienen un porcentaje propio en alguna lista de precios.'
	},
	R5: function () {
		return 'Hay rangos de cantidad cargados por categoría o subcategoría.'
	},
	R6: function (n) {
		return n === 1 ? '1 categoría tiene un descuento por vinculación de inventario.' : entero_es(n) + ' categorías tienen un descuento por vinculación de inventario.'
	},
	tienda_nube: function () {
		return 'Tu negocio está conectado con Tienda Nube: cada categoría nueva se crea también allá, una por una, y hacerlo todo junto no es seguro.'
	},
}

/**
 * Lo que hay que saber antes de aplicar un sistema de categorías o de volver atrás (B-04 y B-05). Lo leen
 * el modal de "Elegir este" y la confirmación de "Cambiar de sistema", para que digan lo mismo.
 *
 * Por qué: los dos hacen UN pedido que reescribe la categoría de los artículos en una sola transacción. Con
 * miles de artículos tarda varios segundos (medido con 10.000 artículos: 15 a 17 segundos, y hasta casi 55
 * con la máquina cargada) y, mientras dura, las ventas, compras y cargas de artículos del mismo negocio
 * esperan; además lo que otra persona edite en esos segundos puede pisarse. No hay forma de evitarlo desde
 * la pantalla: se avisa para que el dueño elija el momento.
 */
export const AVISO_DE_DEMORA = {
	titulo: 'Conviene hacerlo cuando no se esté vendiendo.',
	texto: 'Puede tardar unos segundos, según la cantidad de artículos que tengas, y mientras tanto el sistema puede ir más lento para vender o cargar. Hasta que termine, que nadie edite artículos.',
}

/**
 * Los textos de cada estado de la pantalla, en un solo lugar (los componentes solo los eligen).
 */
export const TEXTOS = {
	cargando: 'Cargando los sistemas de categorías…',
	no_disponible: {
		titulo: 'Todavía no está disponible',
		pista: 'Esta función llega con la próxima actualización de tu sistema. Mientras tanto, Imágenes sigue funcionando como siempre.',
	},
	error: {
		titulo: 'No pudimos traer los sistemas de categorías',
		pista: 'Revisá la conexión y volvé a intentar.',
	},
	sin_propuestas: {
		titulo: 'Todavía no hay sistemas de categorías para tu catálogo',
		pista: 'Si ComercioCity prepara sistemas de categorías para tu catálogo, los vas a ver acá y vas a poder elegir el que más te guste.',
	},
	preparando: {
		titulo: 'Estamos preparando tus sistemas de categorías…',
		pista: 'Cuando estén listos los vas a ver acá. Hasta entonces no cambia nada en tu catálogo.',
	},
	aplicando: {
		titulo: 'Estamos aplicando el sistema que elegiste…',
		pista: 'Esto puede tardar un momento. Actualizá en unos segundos.',
	},
	otro_estado: {
		titulo: 'Esta corrida no se puede mostrar todavía',
		pista: 'Actualizá en unos segundos. Si sigue igual, avisanos.',
	},
	nota_dudosos: 'Los que la IA no tiene claro quedan sin categoría hasta que los revises.',
	solo_el_dueno: 'Solo el dueño del negocio puede elegir un sistema de categorías.',
	// Un pedido largo (elegir o volver atrás) falló por tiempo de espera o error del servidor: la API pudo
	// haberlo aplicado igual (B-04). Lo que el aviso del interceptor global no dice es qué hacer.
	sin_confirmar: 'No pudimos confirmar cómo terminó. Si tardó mucho, esperá un minuto y tocá Actualizar: puede haberse aplicado igual.',
}

/**
 * "sin_resultados" -> "Sin resultados". Para un código que la SPA todavía no conoce: mejor eso
 * que mostrar el código crudo.
 *
 * @param {String} clave
 * @returns {String}
 */
export function humanizar(clave) {
	let texto = String(clave || '').replace(/_/g, ' ').trim()
	if (!texto) {
		return ''
	}
	return texto.charAt(0).toUpperCase() + texto.slice(1)
}

/**
 * Busca un código en un mapa de textos; si no está, lo humaniza.
 *
 * @param {Object} mapa Uno de los mapas de este archivo.
 * @param {String} clave Código que mandó la API.
 * @returns {String}
 */
export function texto_de(mapa, clave) {
	if (clave === null || typeof clave === 'undefined' || clave === '') {
		return ''
	}
	return Object.prototype.hasOwnProperty.call(mapa, clave) ? mapa[clave] : humanizar(clave)
}

/**
 * Un entero con separador de miles es-AR ("3.900"). Acepta números o texto.
 *
 * @param {*} valor
 * @returns {String}
 */
export function entero_es(valor) {
	let numero = Number(valor) || 0
	return separadores_es_desde_dato(String(Math.round(numero)))
}

/**
 * "1 categoría" / "18 categorías": el número con su separador de miles y la palabra en la forma que
 * corresponde.
 *
 * @param {Number} cantidad
 * @param {String} singular
 * @param {String} plural
 * @returns {String}
 */
export function cantidad_de(cantidad, singular, plural) {
	let numero = Number(cantidad) || 0
	return entero_es(numero) + ' ' + (numero === 1 ? singular : plural)
}

/**
 * La etiqueta chica de arriba de cada tarjeta: "Sistema A", "Sistema B"... o "Tus categorías" para
 * la que mantiene las que el negocio ya tenía.
 *
 * @param {Object} propuesta `{tipo, clave}`
 * @returns {String}
 */
export function etiqueta_de_la_propuesta(propuesta) {
	if (!propuesta) {
		return ''
	}
	if (propuesta.tipo === 'mantener') {
		return 'Tus categorías'
	}
	return propuesta.clave ? 'Sistema ' + propuesta.clave : 'Sistema'
}

/**
 * Traduce un motivo de bloqueo (`{codigo, cantidad}`) a una frase. Un código desconocido se muestra
 * humanizado y con su cantidad.
 *
 * @param {Object} motivo
 * @returns {String} '' si no es un motivo usable.
 */
export function texto_de_motivo_de_bloqueo(motivo) {
	if (!motivo || typeof motivo !== 'object' || !motivo.codigo) {
		return ''
	}
	let cantidad = Number(motivo.cantidad) || 0
	if (Object.prototype.hasOwnProperty.call(MOTIVOS_DE_BLOQUEO, motivo.codigo)) {
		return MOTIVOS_DE_BLOQUEO[motivo.codigo](cantidad)
	}
	return humanizar(motivo.codigo) + (cantidad ? ' (' + entero_es(cantidad) + ')' : '') + '.'
}

/**
 * Las advertencias que corresponden al sistema que se va a elegir, ya traducidas y sin repetir.
 *
 * Junta las de la propia tarjeta (`propuesta.advertencias`, si la API las manda) con las generales
 * de la corrida, y se queda con las que valen para el tipo de esa tarjeta (ver `ADVERTENCIAS`).
 * Esto es SOLO decidir qué cartel mostrar: qué advertencias existen y a quién le tocan lo calcula la
 * API.
 *
 * @param {Object} propuesta `{tipo, advertencias}`
 * @param {Array<String>} del_run `advertencias` de `actual`.
 * @returns {Array<{codigo: String, texto: String}>}
 */
export function advertencias_de_la_propuesta(propuesta, del_run) {
	let tipo = propuesta && propuesta.tipo === 'mantener' ? 'mantener' : 'nueva'
	let codigos = []
	let agregar = function (lista) {
		if (!Array.isArray(lista)) {
			return
		}
		lista.forEach(function (codigo) {
			if (typeof codigo === 'string' && codigo && codigos.indexOf(codigo) === -1) {
				codigos.push(codigo)
			}
		})
	}
	agregar(propuesta ? propuesta.advertencias : null)
	agregar(del_run)

	let avisos = []
	codigos.forEach(function (codigo) {
		let conocida = Object.prototype.hasOwnProperty.call(ADVERTENCIAS, codigo) ? ADVERTENCIAS[codigo] : null
		if (conocida && conocida.aplica_a.indexOf(tipo) === -1) {
			return
		}
		avisos.push({ codigo: codigo, texto: conocida ? conocida.texto : humanizar(codigo) + '.' })
	})
	return avisos
}

/**
 * Por qué ya no se puede cambiar de sistema, en una frase que sigue a "Ya no se puede cambiar de
 * sistema: ". '' si el código no se conoce o no hay nada que decir.
 *
 * @param {String|null} codigo `motivo_no_puede_cambiar`
 * @returns {String}
 */
export function texto_de_motivo_no_puede_cambiar(codigo) {
	if (!codigo || !Object.prototype.hasOwnProperty.call(MOTIVOS_NO_PUEDE_CAMBIAR, codigo)) {
		return ''
	}
	return MOTIVOS_NO_PUEDE_CAMBIAR[codigo]
}

/**
 * Lo que hizo "Elegir este", en frases cortas (`run.resultado`): qué se creó, qué se reutilizó, qué
 * se quitó y cuántos artículos quedaron en su categoría. Sin resultado, no hay frases.
 *
 * El verbo concuerda con lo que se cuenta: "Se creó 1 categoría" pero "Se crearon 1 categoría y 3
 * subcategorías".
 *
 * @param {Object|null} resultado Normalizado por el store.
 * @returns {Array<String>}
 */
export function frases_del_resultado(resultado) {
	if (!resultado) {
		return []
	}
	let frases = []

	let creadas = []
	if (resultado.categorias_creadas > 0) {
		creadas.push(cantidad_de(resultado.categorias_creadas, 'categoría', 'categorías'))
	}
	if (resultado.subcategorias_creadas > 0) {
		creadas.push(cantidad_de(resultado.subcategorias_creadas, 'subcategoría', 'subcategorías'))
	}
	let ubicados = ''
	if (resultado.articulos_asignados > 0) {
		ubicados = resultado.articulos_asignados === 1
			? 'se ubicó 1 artículo en su categoría'
			: 'se ubicaron ' + entero_es(resultado.articulos_asignados) + ' artículos en su categoría'
	}

	if (creadas.length) {
		// Un solo elemento y de a uno: "Se creó 1 categoría". En cualquier otro caso, plural.
		let es_uno_solo = creadas.length === 1 && (resultado.categorias_creadas + resultado.subcategorias_creadas) === 1
		frases.push((es_uno_solo ? 'Se creó ' : 'Se crearon ') + creadas.join(' y ') + (ubicados ? ' y ' + ubicados : '') + '.')
	} else if (ubicados) {
		frases.push(ubicados.charAt(0).toUpperCase() + ubicados.slice(1) + '.')
	}

	if (resultado.categorias_reutilizadas > 0) {
		frases.push(
			(resultado.categorias_reutilizadas === 1 ? 'Se reutilizó 1 categoría que ya tenías' : 'Se reutilizaron ' + entero_es(resultado.categorias_reutilizadas) + ' categorías que ya tenías')
			+ ' con el mismo nombre.'
		)
	}
	if (resultado.categorias_eliminadas > 0) {
		frases.push(
			resultado.categorias_eliminadas === 1
				? 'Se quitó 1 categoría anterior que había quedado vacía.'
				: 'Se quitaron ' + entero_es(resultado.categorias_eliminadas) + ' categorías anteriores que habían quedado vacías.'
		)
	}
	if (resultado.pierden_categoria > 0) {
		frases.push(
			resultado.pierden_categoria === 1
				? '1 artículo que tenía categoría quedó sin ella hasta que lo revises.'
				: entero_es(resultado.pierden_categoria) + ' artículos que tenían categoría quedaron sin ella hasta que los revises.'
		)
	}
	return frases
}

/**
 * Lo que queda por hacer en la revisión, a partir de los conteos vivos: "Quedan 150 artículos para
 * revisar y 35 sin categoría." Sin nada pendiente, lo dice.
 *
 * @param {Object} conteos `{a_revisar, asignados, sin_categoria}`
 * @returns {String}
 */
export function frase_de_lo_que_queda(conteos) {
	let a_revisar = Number(conteos && conteos.a_revisar) || 0
	let sin_categoria = Number(conteos && conteos.sin_categoria) || 0
	if (!a_revisar && !sin_categoria) {
		return 'No queda ningún artículo por revisar ni sin categoría.'
	}
	let partes = []
	if (a_revisar) {
		partes.push(a_revisar === 1 ? '1 artículo para revisar' : entero_es(a_revisar) + ' artículos para revisar')
	}
	if (sin_categoria) {
		partes.push(sin_categoria === 1 ? '1 sin categoría' : entero_es(sin_categoria) + ' sin categoría')
	}
	// "Queda 1 artículo para revisar" / "Quedan 2 artículos para revisar y 1 sin categoría": el verbo
	// va en singular solo si en total queda uno.
	return (a_revisar + sin_categoria === 1 ? 'Queda ' : 'Quedan ') + partes.join(' y ') + '.'
}
