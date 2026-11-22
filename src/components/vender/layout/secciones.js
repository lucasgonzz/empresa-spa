/*
	Secciones de Vender (misión vender-secciones-personalizables, 22/11/2026).

	Hasta esta misión Vender tenía tres etapas fijas (Configuración inicial, Artículos y servicios,
	Cierre y opciones). Ahora cada negocio puede configurar sus SECCIONES: sumar o quitar
	(hasta 6), ponerlas en columnas, elegir ancho y alto, título, descripción, color y si se pliegan.
	Este archivo reúne todo lo puro que tiene que ver con eso y que usan las dos puntas de la SPA:
	el runtime de Vender (VenderStages.vue, seccion/Index.vue) y el editor del ABM. No importa
	nada de Vue ni de la API: se prueba en node.

	-------------------------------------------------------------------------------------------------
	Formato versión 2 del diseño (lo que guarda `vender_layouts.layout`)
	-------------------------------------------------------------------------------------------------

		{
			version: 2,
			plantilla: 'agil',                       // opcional: de qué plantilla del sistema viene
			etapas: { etapa_1: [...], etapa_2: [...], seccion_4: [...] },   // campos por sección
			sacados: ['combos'],
			secciones: { etapa_1: {titulo, descripcion, color, alto, alto_fijo, plegado}, ... },
			disposicion: [                           // bandas (de arriba abajo)
				{ columnas: [                        // columnas (de izquierda a derecha)
					{ ancho: 4, secciones: ['etapa_1'] },            // 3..12, suman 12
					{ ancho: 8, secciones: ['etapa_2', 'etapa_3'] }, // apiladas, de arriba abajo
				] },
			],
		}

	🔴 Los ids de sección son `etapa_1`, `etapa_2`, `etapa_3` (las de siempre: NUNCA se renombran,
	están guardadas en la base de cada cliente) y `seccion_4` a `seccion_9` (las que crea el
	usuario). `etapa_2` lleva la tabla de artículos y no se puede quitar. Este contrato lo comparte
	el backend (VenderLayoutHelper.php): los topes, el patrón de ids, la paleta, los plegados y los
	largos tienen que ser los mismos en las dos puntas.
*/
import { ETAPAS, TITULOS_DE_ETAPAS } from './elementos'

/* Patrón de un id de sección (el mismo que valida el backend). */
export const PATRON_DE_SECCION = /^(etapa_[123]|seccion_[4-9])$/

/* La sección que lleva la tabla de artículos: siempre está y no se puede quitar. */
export const SECCION_FIJA = 'etapa_2'

/* Topes del formato. */
export const MAXIMO_DE_SECCIONES = 6
export const MAXIMO_DE_BANDAS = 6
export const MAXIMO_DE_COLUMNAS = 4
export const ANCHO_MINIMO_DE_COLUMNA = 3
export const LARGO_DEL_TITULO = 60
export const LARGO_DE_LA_DESCRIPCION = 160

/* Alto por defecto de una sección, en doceavos del área de Vender. */
export const ALTO_POR_DEFECTO = 4

/* Título de una sección creada por el usuario mientras no lo cambie. */
export const TITULO_DE_SECCION_NUEVA = 'Sección nueva'

/* Plantillas del sistema que el formato conoce: hoy sólo el diseño ágil. */
export const PLANTILLAS = ['agil']

/* Valores de `plegado`: nunca, "arranca abierta salvo venta en curso" y "arranca plegada". */
export const PLEGADOS = ['no', 'si_hay_venta', 'arranca_plegada']

/* Ancho de pantalla (px) desde el que Vender dibuja las columnas; debajo se apila todo. */
export const ANCHO_DE_PANTALLA_PARA_COLUMNAS = 992

/* Área útil mínima (px) con la que se reparten los doceavos de alto: debajo aparece el scroll general. */
export const ALTO_MINIMO_DEL_AREA = 420

/*
	Paleta cerrada de colores de énfasis. `rgb` es el literal "r,g,b" que Vender usa en
	`rgba(var(--acento-rgb), alfa)`: azul, verde y naranja son exactamente los literales que tenían
	las tres etapas antes de esta misión, así que con los colores por defecto no cambia nada.
*/
export const PALETA = {
	azul: { nombre: 'Azul', rgb: '0,123,255' },
	verde: { nombre: 'Verde', rgb: '25,135,84' },
	naranja: { nombre: 'Naranja', rgb: '230,119,0' },
	violeta: { nombre: 'Violeta', rgb: '111,66,193' },
	rojo: { nombre: 'Rojo', rgb: '220,53,69' },
	turquesa: { nombre: 'Turquesa', rgb: '13,148,136' },
	gris: { nombre: 'Gris', rgb: '108,117,125' },
}

/* Las claves de la paleta, en orden (es el orden en que se ofrecen y en que se reparten). */
export const COLORES = ['azul', 'verde', 'naranja', 'violeta', 'rojo', 'turquesa', 'gris']

/* Color de énfasis por defecto de cada sección de siempre. */
const COLORES_POR_DEFECTO = {
	etapa_1: 'azul',
	etapa_2: 'verde',
	etapa_3: 'naranja',
}

/* Cómo arranca de plegada cada sección de siempre (lo que hacían la etapa 1 y la etapa 3). */
const PLEGADOS_POR_DEFECTO = {
	etapa_1: 'si_hay_venta',
	etapa_2: 'no',
	etapa_3: 'arranca_plegada',
}

/**
 * Copia profunda de un dato JSON (disposiciones y metadatos son JSON puro).
 *
 * @param {*} valor
 * @returns {*}
 */
export function copiar_json(valor) {
	return JSON.parse(JSON.stringify(valor))
}

/**
 * Si el id es un id de sección válido (patrón del contrato).
 *
 * @param {*} id
 * @returns {boolean}
 */
export function es_id_de_seccion(id) {
	return typeof id == 'string' && PATRON_DE_SECCION.test(id)
}

/**
 * Título por defecto de una sección: el de siempre para las tres de hoy, "Sección nueva" para el
 * resto.
 *
 * @param {string} id
 * @returns {string}
 */
export function titulo_por_defecto(id) {
	return TITULOS_DE_ETAPAS[id] || TITULO_DE_SECCION_NUEVA
}

/**
 * Color por defecto de una sección: azul, verde y naranja para las tres de hoy, violeta para el
 * resto.
 *
 * @param {string} id
 * @returns {string}
 */
export function color_por_defecto(id) {
	return COLORES_POR_DEFECTO[id] || 'violeta'
}

/**
 * Los metadatos de una sección tal como vienen "de fábrica".
 *
 * @param {string} id
 * @returns {{titulo: string, descripcion: null, color: string, alto: number, alto_fijo: boolean, plegado: string}}
 */
export function meta_por_defecto(id) {
	return {
		titulo: titulo_por_defecto(id),
		descripcion: null,
		color: color_por_defecto(id),
		alto: ALTO_POR_DEFECTO,
		alto_fijo: false,
		plegado: PLEGADOS_POR_DEFECTO[id] || 'no',
	}
}

/**
 * Recorta un texto del usuario a un largo máximo, contando caracteres (no unidades UTF-16) igual
 * que mb_substr del backend.
 *
 * @param {string} texto
 * @param {number} largo
 * @returns {string}
 */
function recortar_texto(texto, largo) {
	let caracteres = Array.from(texto)
	if (caracteres.length <= largo) {
		return texto
	}
	return caracteres.slice(0, largo).join('')
}

/**
 * Si el valor cuenta como "verdadero" para `alto_fijo` (mismo criterio del backend: true, 1, '1'
 * o 'true').
 *
 * @param {*} valor
 * @returns {boolean}
 */
function es_verdadero(valor) {
	return valor === true || valor === 1 || valor === '1' || valor === 'true'
}

/**
 * Normaliza el alto de una sección: entero entre 1 y 12; lo que no es número vale 4.
 *
 * @param {*} valor
 * @returns {number}
 */
export function acotar_alto(valor) {
	let alto = parseInt(valor, 10)
	if (isNaN(alto)) {
		alto = ALTO_POR_DEFECTO
	}
	if (alto < 1) {
		alto = 1
	}
	if (alto > 12) {
		alto = 12
	}
	return alto
}

/**
 * Completa y acota los metadatos de una sección.
 *
 * - Sin metadatos (no es un objeto): los de fábrica del id.
 * - `titulo`: texto recortado a 60; vacío o no texto -> el título por defecto.
 * - `descripcion`: texto recortado a 160; vacío o no texto -> null (la automática).
 * - `color`: uno de la paleta; si no, el del id.
 * - `alto`: 1..12 (lo que no es número, 4). `alto_fijo`: sólo con true/1/'1'/'true'.
 * - `plegado`: uno de PLEGADOS (si no, 'no'); una sección de alto fijo no se pliega.
 *
 * @param {string} id id de la sección
 * @param {*} meta lo que vino en el diseño
 * @returns {{titulo: string, descripcion: (string|null), color: string, alto: number, alto_fijo: boolean, plegado: string}}
 */
export function normalizar_meta_de_seccion(id, meta) {
	if (!meta || typeof meta != 'object' || Array.isArray(meta)) {
		return meta_por_defecto(id)
	}

	let titulo = titulo_por_defecto(id)
	if (typeof meta.titulo == 'string' && meta.titulo.trim() !== '') {
		titulo = recortar_texto(meta.titulo.trim(), LARGO_DEL_TITULO)
	}

	let descripcion = null
	if (typeof meta.descripcion == 'string' && meta.descripcion.trim() !== '') {
		descripcion = recortar_texto(meta.descripcion.trim(), LARGO_DE_LA_DESCRIPCION)
	}

	let color = (typeof meta.color == 'string' && PALETA[meta.color]) ? meta.color : color_por_defecto(id)
	let alto_fijo = es_verdadero(meta.alto_fijo)
	let plegado = PLEGADOS.indexOf(meta.plegado) !== -1 ? meta.plegado : 'no'

	if (alto_fijo || id === SECCION_FIJA) {
		/* Una sección fija dejaría un hueco en su columna si se plegara; y la etapa 2 nunca se pliega */
		plegado = 'no'
	}

	return {
		titulo: titulo,
		descripcion: descripcion,
		color: color,
		alto: acotar_alto(meta.alto),
		alto_fijo: alto_fijo,
		plegado: plegado,
	}
}

/**
 * La disposición de siempre: una banda, una columna de 12 con las tres etapas apiladas.
 *
 * @returns {Array}
 */
export function disposicion_predeterminada() {
	return [{ columnas: [{ ancho: 12, secciones: ETAPAS.slice() }] }]
}

/**
 * Los ids de sección de una disposición en orden de lectura (banda, columna, apilado).
 *
 * @param {Array} disposicion
 * @returns {Array<string>}
 */
export function ids_en_orden(disposicion) {
	let ids = []
	;(Array.isArray(disposicion) ? disposicion : []).forEach(function (banda) {
		;((banda && Array.isArray(banda.columnas)) ? banda.columnas : []).forEach(function (columna) {
			;((columna && Array.isArray(columna.secciones)) ? columna.secciones : []).forEach(function (id) {
				ids.push(id)
			})
		})
	})
	return ids
}

/**
 * Deja los anchos de las columnas de una banda en 3..12 y sumando exactamente 12.
 *
 * - Una sola columna: 12.
 * - Si suman menos de 12, lo que falta se le da a la última ([4,4] -> [4,8]).
 * - Si suman más, se escalan en proporción con piso de 3 ([12,12] -> [6,6], [2,10] -> [3,9]) y el
 *   resto del redondeo se resta de la más ancha.
 *
 * @param {Array<number>} anchos ya con la cantidad definitiva de columnas
 * @returns {Array<number>}
 */
export function ajustar_anchos_de_banda(anchos) {
	let resultado = []

	anchos.forEach(function (ancho) {
		let valor = parseInt(ancho, 10)
		if (isNaN(valor)) {
			valor = 12
		}
		resultado.push(Math.min(12, Math.max(ANCHO_MINIMO_DE_COLUMNA, valor)))
	})

	if (resultado.length === 1) {
		return [12]
	}

	let suma = 0
	resultado.forEach(function (ancho) {
		suma += ancho
	})

	if (suma < 12) {
		resultado[resultado.length - 1] += 12 - suma
		return resultado
	}

	if (suma > 12) {
		let escalados = []
		resultado.forEach(function (ancho) {
			escalados.push(Math.max(ANCHO_MINIMO_DE_COLUMNA, Math.round(ancho * 12 / suma)))
		})
		resultado = escalados
		suma = 0
		resultado.forEach(function (ancho) {
			suma += ancho
		})

		/* El redondeo puede pasarse de 12: se le resta a la más ancha que todavía pueda ceder */
		while (suma > 12) {
			let indice_de_la_mas_ancha = -1
			resultado.forEach(function (ancho, indice) {
				if (ancho > ANCHO_MINIMO_DE_COLUMNA && (indice_de_la_mas_ancha === -1 || ancho > resultado[indice_de_la_mas_ancha])) {
					indice_de_la_mas_ancha = indice
				}
			})
			if (indice_de_la_mas_ancha === -1) {
				break
			}
			resultado[indice_de_la_mas_ancha] -= 1
			suma -= 1
		}

		if (suma < 12) {
			resultado[resultado.length - 1] += 12 - suma
		}
	}

	return resultado
}

/**
 * Normaliza una disposición (misma regla que el backend, VenderLayoutHelper::normalizar_disposicion):
 *
 * - bandas: hasta 6; columnas por banda: hasta 4; secciones en total: hasta 6;
 * - cada id tiene que cumplir el patrón y aparece una sola vez (gana la primera);
 * - las columnas sin secciones y las bandas sin columnas se descartan;
 * - los anchos de cada banda quedan en 3..12 y suman 12 (ver ajustar_anchos_de_banda).
 *
 * No agrega `etapa_2` (eso lo hace asegurar_seccion_fija) y devuelve [] si lo que vino no sirve.
 * No muta lo que recibe.
 *
 * @param {*} disposicion
 * @returns {Array<{columnas: Array<{ancho: number, secciones: Array<string>}>}>}
 */
export function normalizar_disposicion(disposicion) {
	if (!Array.isArray(disposicion)) {
		return []
	}

	let bandas = []
	let vistos = {}
	let total = 0

	disposicion.forEach(function (banda) {
		if (bandas.length >= MAXIMO_DE_BANDAS || !banda || !Array.isArray(banda.columnas)) {
			return
		}

		let columnas = []
		let anchos = []

		banda.columnas.forEach(function (columna) {
			if (columnas.length >= MAXIMO_DE_COLUMNAS || !columna || !Array.isArray(columna.secciones)) {
				return
			}

			let secciones = []
			columna.secciones.forEach(function (id) {
				if (total >= MAXIMO_DE_SECCIONES || !es_id_de_seccion(id) || vistos[id]) {
					return
				}
				vistos[id] = true
				total++
				secciones.push(id)
			})

			if (!secciones.length) {
				return
			}

			columnas.push({ ancho: 12, secciones: secciones })
			anchos.push(columna.ancho)
		})

		if (!columnas.length) {
			return
		}

		let ajustados = ajustar_anchos_de_banda(anchos)
		columnas.forEach(function (columna, indice) {
			columna.ancho = ajustados[indice]
		})

		bandas.push({ columnas: columnas })
	})

	return bandas
}

/**
 * Garantiza que `etapa_2` esté en la disposición: si falta se agrega al final de la última columna
 * de la primera banda (si ya hay 6 secciones se descarta la última en orden de lectura para
 * hacerle lugar; sus campos vuelven por la sección de respaldo). Devuelve una copia.
 *
 * @param {Array} disposicion ya normalizada
 * @returns {Array}
 */
export function asegurar_seccion_fija(disposicion) {
	let copia = copiar_json(disposicion)

	if (!copia.length) {
		return disposicion_predeterminada()
	}

	if (ids_en_orden(copia).indexOf(SECCION_FIJA) !== -1) {
		return copia
	}

	if (ids_en_orden(copia).length >= MAXIMO_DE_SECCIONES) {
		/* Se saca la última sección en orden de lectura */
		for (let b = copia.length - 1; b >= 0; b--) {
			let columnas = copia[b].columnas
			let sacada = false
			for (let c = columnas.length - 1; c >= 0 && !sacada; c--) {
				if (columnas[c].secciones.length) {
					columnas[c].secciones.pop()
					sacada = true
				}
			}
			if (sacada) {
				break
			}
		}
		return asegurar_seccion_fija(normalizar_disposicion(copia))
	}

	let columnas_de_la_primera = copia[0].columnas
	columnas_de_la_primera[columnas_de_la_primera.length - 1].secciones.push(SECCION_FIJA)
	return copia
}

/**
 * El primer id `seccion_N` (N de 4 a 9) que no esté en uso, o null si ya están los seis.
 *
 * Nunca devuelve un `etapa_N`: aunque el usuario quite la etapa 1, la sección nueva siguiente es
 * `seccion_4` (los ids de siempre no se reusan).
 *
 * @param {Array<string>} ids ids en uso
 * @returns {string|null}
 */
export function nuevo_id_de_seccion(ids) {
	for (let numero = 4; numero <= 9; numero++) {
		let id = 'seccion_' + numero
		if (ids.indexOf(id) === -1) {
			return id
		}
	}
	return null
}

/**
 * La sección donde va un campo cuya sección por defecto no está en el diseño (un campo nuevo del
 * catálogo, un obligatorio que venía en `sacados`, el "Agregar" de la bandeja): su sección por
 * defecto si está; si no, la primera sección en orden de lectura que no sea `etapa_2`; si no hay,
 * `etapa_2`.
 *
 * @param {string} etapa_por_defecto sección por defecto del campo (`el.etapa` del catálogo)
 * @param {Array<string>} ids ids del diseño en orden de lectura
 * @returns {string}
 */
export function seccion_de_respaldo(etapa_por_defecto, ids) {
	if (ids.indexOf(etapa_por_defecto) !== -1) {
		return etapa_por_defecto
	}

	let respaldo = null
	ids.forEach(function (id) {
		if (respaldo === null && id !== SECCION_FIJA) {
			respaldo = id
		}
	})

	return respaldo === null ? SECCION_FIJA : respaldo
}

/**
 * Ancho (de 12) de la columna en la que está una sección, o 12 si no está.
 *
 * @param {Array} disposicion
 * @param {string} id
 * @returns {number}
 */
export function ancho_de_columna_de(disposicion, id) {
	let ancho = 12
	;(Array.isArray(disposicion) ? disposicion : []).forEach(function (banda) {
		banda.columnas.forEach(function (columna) {
			if (columna.secciones.indexOf(id) !== -1) {
				ancho = columna.ancho
			}
		})
	})
	return ancho
}

/**
 * Escala el ancho por defecto de un campo al de la columna donde va: un campo de 4 en una columna
 * de 4 queda de 12 (mismo ancho en pantalla). Con columna de 12 no cambia nada.
 *
 * @param {number} cols ancho por defecto (de 12)
 * @param {number} ancho_de_columna ancho de la columna (de 12)
 * @returns {number}
 */
export function escalar_cols_a_columna(cols, ancho_de_columna) {
	if (ancho_de_columna >= 12) {
		return cols
	}
	return Math.min(12, Math.max(1, Math.round(cols * 12 / ancho_de_columna)))
}

/**
 * Alto en píxeles de una sección de alto fijo: `alto` doceavos del área útil de Vender.
 *
 * `alto_util` es lo que mide el área que scrollea menos su padding y el margen de la última
 * sección; se le suma `separacion` (el aire entre secciones apiladas) a todo el reparto y se
 * resta una vez por sección, así dos secciones apiladas que suman 12 llenan el área sin scroll:
 * 8/12 y 4/12 de 550 miden 360,67 y 171,33, y 360,67 + 18 + 171,33 + 18 = 568 = 550 + 18.
 * Con un área menor al piso (420) se usa el piso: en pantallas muy bajas aparece el scroll
 * general en vez de secciones de 20px.
 *
 * @param {number} alto doceavos (1..12)
 * @param {number} alto_util alto útil medido, en px
 * @param {number} separacion aire entre secciones, en px
 * @returns {number}
 */
export function alto_en_px(alto, alto_util, separacion) {
	let util = Math.max(alto_util, ALTO_MINIMO_DEL_AREA)
	return (acotar_alto(alto) / 12) * (util + separacion) - separacion
}

/**
 * Ancho de un campo (de 12) cuando la columna se apila: el equivalente en pantalla del que tiene
 * dentro de su columna. En una columna de 12 no cambia; en una de 4, un campo de 12 pasa a 4
 * (con piso de 3, que es lo que todavía se puede usar).
 *
 * @param {number} cols ancho del campo dentro de su columna
 * @param {number} ancho_de_columna ancho de la columna (de 12)
 * @returns {number}
 */
export function cols_al_apilar(cols, ancho_de_columna) {
	if (ancho_de_columna === 12) {
		return cols
	}
	return Math.max(3, Math.round(cols * ancho_de_columna / 12))
}

/**
 * Si el layout es "sólo plantilla": null (el diseño predeterminado armado en código) o
 * `{version: 2, plantilla: 'agil'}` sin `etapas` (el diseño ágil armado en código). Un layout con
 * `etapas` es un diseño explícito, aunque tenga `plantilla` de origen.
 *
 * @param {*} layout
 * @returns {boolean}
 */
export function es_layout_de_plantilla(layout) {
	if (layout === null || typeof layout == 'undefined') {
		return true
	}

	let base = layout
	if (typeof base == 'string') {
		try {
			base = JSON.parse(base)
		} catch (e) {
			return false
		}
		if (base === null) {
			return true
		}
	}

	return !!base
		&& typeof base == 'object'
		&& !Array.isArray(base)
		&& PLANTILLAS.indexOf(base.plantilla) !== -1
		&& (!base.etapas || typeof base.etapas != 'object' || Array.isArray(base.etapas))
}

/**
 * El layout "sólo plantilla" de una plantilla del sistema.
 *
 * @param {string} plantilla uno de PLANTILLAS
 * @returns {{version: number, plantilla: string}}
 */
export function layout_de_plantilla(plantilla) {
	return { version: 2, plantilla: plantilla }
}

/**
 * Color RGB ("r,g,b") de una clave de la paleta (el del id si la clave no existe).
 *
 * @param {string} color
 * @param {string} id
 * @returns {string}
 */
export function rgb_del_color(color, id) {
	let encontrado = PALETA[color] || PALETA[color_por_defecto(id)]
	return encontrado.rgb
}
