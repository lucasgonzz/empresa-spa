/**
 * Textos y cuentas chicas de la sub-solapa Alertas → Catálogo → Medidas (misión
 * medidas-masivas-catalogo, 27/10/2026).
 *
 * La API manda CÓDIGOS (estados, motivos, criterios, alcances) y este archivo es el único lugar donde
 * se traducen a lo que lee el comerciante. Así la tabla, el detalle y el modal dicen lo mismo con las
 * mismas palabras, y si mañana la API suma un código nuevo se ve igual —humanizado— sin tocar ningún
 * componente.
 *
 * 🔴 Estos textos los lee un cliente: van con acentos, sin jerga ("a revisar", "sin datos") y sin
 * emojis. Los comentarios pueden ser técnicos; las etiquetas, no.
 *
 * 🔴 Dos palabras, dos cosas (igual que en Imágenes). La CORRIDA entera —una fila de la tabla, con su
 * detalle— es una "búsqueda de medidas". BÚSQUEDA a secas es cada consulta al buscador de internet
 * (Serper), que es lo que se cuenta y se cobra. Para no mezclar las dos, el encabezado habla de
 * "consultas" al buscador.
 */

import { numero_es as numero_con_decimales } from '@/common-vue/helpers/formato_numero'
import { entero_es, a_numero, CAMPOS_DE_MEDIDA } from '@/utils/medidas_de_catalogo'

export { entero_es }

/** De dónde salió la corrida. */
export const ORIGENES = {
	catalogo: 'Todo el catálogo',
	seleccion: 'Selección del listado',
}

/** Estado de la corrida entera. */
export const ESTADOS = {
	pendiente: 'En espera',
	en_proceso: 'En curso',
	terminada: 'Terminada',
	detenida: 'Detenida',
	fallida: 'Se cortó',
}

/** Por qué criterio se buscó (o se intentó buscar) cada artículo. */
export const CRITERIOS = {
	codigo_de_barras: 'Código de barras',
	codigo_proveedor: 'Código de proveedor',
	nombre: 'Nombre',
}

/**
 * Qué tipo de medidas eran las que encontró la búsqueda (`alcance` de cada campo): decisión D4 del
 * plan, cualquier dato sirve, pero se dice de cuál se trata.
 */
export const ALCANCES = {
	producto: 'Medidas del producto',
	envio: 'Medidas del envío',
	embalaje: 'Medidas del embalaje',
	caja: 'Medidas de la caja',
	paquete: 'Medidas del paquete',
}

/** Motivo principal de un artículo, de las tres solapas. Los códigos no se pisan entre solapas. */
export const MOTIVOS = {
	// A revisar (decisiones D1 y D2 del plan)
	variante_dudosa: 'Variante dudosa',
	medidas_parciales: 'Medidas parciales',
	coincidencia_por_nombre: 'Coincidencia por nombre',
	coincidencia_probable: 'Coincidencia probable',
	// Valores que la página no deja claros (la frase larga viene en `motivo_detalle`).
	valor_ambiguo: 'Valor ambiguo',
	valor_en_rango: 'Rango en la página',
	cita_sin_etiqueta: 'Cita sin etiqueta',
	difiere_de_lo_cargado: 'Difiere de lo cargado',
	// Misión medidas-sin-datos (28/10/2026): la IA propuso valores pero el sistema no pudo comprobarlos en la
	// página (la cita no aparece, dice otro número...). Quedan para revisar a mano, nunca se cargan solos.
	valor_sin_respaldo: 'Sin respaldo en la página',
	// Asignada sola (D1): el código del artículo está en la página y trae las cuatro medidas.
	codigo_exacto: 'Código exacto',
	// Sin datos (D3)
	sin_resultados: 'Sin resultados',
	sin_datos_del_articulo: 'Faltan datos del artículo',
	ia_sin_respuesta: 'La IA no respondió',
	no_coincide: 'No era el producto',
	sin_medidas_en_la_pagina: 'La página no trae medidas',
	// Misión medidas-sin-datos: el producto apareció pero no se pudo leer la página (el sitio la bloquea
	// o es un PDF que no se pudo leer ni con el respaldo). No es lo mismo que «la página no trae medidas».
	paginas_bloqueadas: 'Páginas bloqueadas',
	pdf_no_leido: 'PDF sin leer',
	sin_cupo: 'Sin búsquedas disponibles',
	error_de_busqueda: 'Error al buscar',
	error_interno: 'Error al procesar',
	articulo_borrado: 'Artículo borrado',
	// Resueltos a mano
	rechazada: 'Propuesta rechazada',
	// Alguien completó las medidas a mano mientras la propuesta esperaba revisión (status `rechazada`,
	// solapa Sin datos): no es un aviso ni hay medidas para mostrar.
	completado_a_mano: 'Completado a mano',
	quitada: 'Medidas quitadas',
	// No es una falla: cuando le tocó el turno, el artículo ya tenía todas las medidas.
	ya_tenia_medidas: 'Ya tenía medidas',
	en_otra_corrida: 'Esperando revisión en otra búsqueda',
}

/**
 * Motivos que piden mirar el artículo o que son un problema del sistema o del cupo: van en ámbar.
 * Todo lo que no está acá va en gris (incluye los códigos que la SPA todavía no conoce).
 */
export const MOTIVOS_DE_AVISO = [
	'variante_dudosa',
	'medidas_parciales',
	'coincidencia_por_nombre',
	'coincidencia_probable',
	'valor_ambiguo',
	'valor_en_rango',
	'cita_sin_etiqueta',
	'difiere_de_lo_cargado',
	'valor_sin_respaldo',
	'sin_cupo',
	'error_de_busqueda',
	'ia_sin_respuesta',
	'error_interno',
]

/** Por qué se descartó una página leída (diagnóstico de "Sin datos"). */
export const MOTIVOS_DE_DESCARTE = {
	sin_el_codigo: 'No traía el código del artículo',
	no_tiene_el_codigo: 'No traía el código del artículo',
	otro_producto: 'Era otro producto',
	no_coincide: 'No era el producto',
	sin_medidas: 'No traía medidas',
	sin_medidas_en_la_pagina: 'No traía medidas',
	no_descargable: 'No se pudo abrir',
	no_es_html: 'No era una página web',
	es_pdf: 'Era un PDF (no se leen)',
	valores_invalidos: 'Los valores no coincidían con la cita',
	repetida: 'Repetida',
	no_evaluada: 'No se llegó a leer',
}

/**
 * Por qué el validador del sistema no pudo comprobar un valor que propuso la IA (`motivo_rechazo` de un
 * campo «sin respaldo», y el motivo de cada campo en el diagnóstico). Frases en minúscula, listas para
 * seguir a «Peso: ...». Misión medidas-sin-datos (28/10/2026).
 */
export const MOTIVOS_DE_RECHAZO = {
	cita_no_esta_en_la_pagina: 'la cita no aparece en la página',
	cita_no_coincide_con_el_valor: 'la cita dice otro número',
	fuente_desconocida: 'la página citada no es una de las leídas',
	sin_cita: 'no trajo cita',
	valor_invalido: 'el valor no es un número válido',
	unidad_invalida: 'la unidad no corresponde a esa medida',
	fuera_de_rango: 'el valor está fuera de lo razonable',
	no_informado: 'la IA no informó este valor',
	campo_desconocido: 'medida desconocida',
}

/** Cómo terminó cada plan de búsqueda (`resultado` del diagnóstico). */
export const RESULTADOS_DE_PLAN = {
	sin_resultados: 'El buscador no devolvió resultados.',
	tope_demo: 'No se buscó: se llegó al tope de consultas de la demo.',
	error_de_busqueda: 'El buscador falló.',
	sin_paginas: 'Ninguna de las páginas servía para leer las medidas.',
	ia_sin_respuesta: 'La IA no respondió.',
	otro_producto: 'La IA dijo que las páginas eran de otro producto.',
	sin_medidas: 'Las páginas no traían medidas que se pudieran validar.',
	datos: 'Se encontraron medidas.',
}

/** Qué tan seguro estaba la IA de que la página era el mismo producto (`match`). */
export const COINCIDENCIAS_DE_LA_IA = {
	exacto: 'el mismo producto',
	probable: 'probablemente el mismo producto',
	variante_distinta: 'una variante o presentación distinta',
	otro_producto: 'otro producto',
}

/** Textos de las pantallas (títulos, ayudas, estados vacíos). */
export const TEXTOS = {
	intro: 'Cada búsqueda de medidas queda acá. Abrí una para ver qué peso y medidas se encontraron en internet, qué quedó para revisar y de qué artículos no se pudo sacar nada. Las consultas son las que se le hicieron al buscador.',
	boton_catalogo: 'Buscar peso y medidas de todo el catálogo',
	no_disponible: {
		titulo: 'Todavía no está disponible',
		pista: 'La búsqueda de peso y medidas se habilita con la próxima actualización de tu sistema.',
	},
	sin_corridas: {
		titulo: 'Todavía no hay búsquedas de medidas',
		pista: 'Cuando se busquen el peso y las medidas de tus artículos, cada búsqueda queda acá: qué se encontró, qué conviene revisar y de qué artículos no se pudo sacar nada.',
	},
	error_corridas: {
		titulo: 'No pudimos traer las búsquedas de medidas',
		pista: 'Revisá la conexión y volvé a intentar.',
	},
	nota_a_revisar: 'Estas medidas todavía no están cargadas en los artículos: se cargan recién cuando las aprobás. Solo se completan los campos que el artículo tiene vacíos.',
	nota_asignadas: 'Estas medidas ya se cargaron en el artículo. Si alguna no te convence, podés quitarla.',
	sin_respaldo_titulo: 'No se pudo comprobar en la página',
	sin_respaldo_ayuda: 'La IA encontró estos valores, pero el sistema no los pudo comprobar en el texto de la página. Abrí la fuente y revisalos antes de aprobar; podés corregirlos con «Editar».',
	reintentar_sin_datos: 'Volver a buscar también los que quedaron sin datos',
	reintentar_sin_datos_ayuda: 'Sirve para reintentar los artículos de búsquedas anteriores que terminaron sin datos. No repite los que ya tienen medidas, los que esperan revisión ni los que alguien rechazó.',
	creditos_de_lectura: 'Leer páginas bloqueadas y PDF consume créditos de búsqueda (de 2 a 10 por página).',
	leida_con_respaldo: 'Leída con el respaldo',
	// Etiqueta de «Asignadas» para lo que salió sin respaldo en la página y ya aprobó una persona.
	revisada_a_mano: 'Revisada a mano',
	nota_sin_datos: 'No se encontró nada confiable para estos artículos. Abrí «Ver qué se probó» para ver las consultas y las páginas que se leyeron.',
}

/**
 * "sin_resultados" -> "Sin resultados". Para un código que la SPA todavía no conoce: mejor eso que
 * mostrar el código crudo.
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
 * Busca un código en un mapa de textos (con `hasOwnProperty`, así un código como "constructor" no
 * encuentra propiedades heredadas de Object); si no está, lo humaniza.
 *
 * @param {Object} mapa Uno de los mapas de este archivo.
 * @param {String} clave Código que mandó la API.
 * @returns {String}
 */
export function texto_de(mapa, clave) {
	if (clave === null || typeof clave === 'undefined' || clave === '') {
		return ''
	}
	if (Object.prototype.hasOwnProperty.call(mapa, clave)) {
		return mapa[clave]
	}
	return humanizar(clave)
}

/**
 * True si la corrida todavía corre (o espera su turno en la cola).
 *
 * @param {Object} corrida RunPayload normalizado.
 * @returns {Boolean}
 */
export function esta_activa(corrida) {
	return !!corrida && (corrida.status === 'pendiente' || corrida.status === 'en_proceso')
}

/**
 * Porcentaje entero de artículos procesados, o null si todavía no se sabe el total.
 *
 * @param {Object} corrida RunPayload normalizado.
 * @returns {Number|null}
 */
export function porcentaje_de(corrida) {
	if (!corrida) {
		return null
	}
	let total = a_numero(corrida.total)
	if (!total) {
		return null
	}
	let procesados = a_numero(corrida.procesados)
	return Math.max(0, Math.min(100, Math.round(procesados * 100 / total)))
}

/**
 * Un conteo de la corrida como número, con cero si no vino.
 *
 * @param {Object} conteos `conteos` de un RunPayload o de la respuesta de items.
 * @param {String} clave asignadas | a_revisar | sin_datos | pendientes | errores
 * @returns {Number}
 */
export function conteo(conteos, clave) {
	if (!conteos || typeof conteos !== 'object') {
		return 0
	}
	return a_numero(conteos[clave])
}

/**
 * Qué se buscó en una corrida: "Todo el catálogo" y, si fue solo con stock, "solo con stock".
 *
 * @param {Object} corrida RunPayload normalizado.
 * @returns {String}
 */
export function texto_de_alcance_de_la_corrida(corrida) {
	if (!corrida) {
		return ''
	}
	let origen = texto_de(ORIGENES, corrida.origen)
	return corrida.solo_con_stock ? origen + ' · solo con stock' : origen
}

/**
 * Consultas por artículo con dos decimales es-AR ("2,10"), o '' si no hay artículos procesados.
 *
 * @param {Object} corrida RunPayload normalizado.
 * @returns {String}
 */
export function consultas_por_articulo(corrida) {
	if (!corrida || !a_numero(corrida.procesados)) {
		return ''
	}
	return numero_con_decimales(a_numero(corrida.busquedas) / a_numero(corrida.procesados), 2)
}

/**
 * La línea de consultas de una corrida: "1.830 · 2,10 por artículo". Sin artículos procesados, solo
 * el total.
 *
 * @param {Object} corrida RunPayload normalizado.
 * @returns {String}
 */
export function texto_de_consultas(corrida) {
	if (!corrida) {
		return ''
	}
	let total = entero_es(corrida.busquedas)
	let promedio = consultas_por_articulo(corrida)
	return promedio ? total + ' · ' + promedio + ' por artículo' : total
}

/**
 * "1 consulta" / "3 consultas" (y "Sin consultas" en cero), para la línea de cada artículo.
 *
 * @param {Number} cantidad
 * @returns {String}
 */
export function consultas_del_articulo(cantidad) {
	let numero = a_numero(cantidad)
	if (!numero) {
		return 'Sin consultas'
	}
	return entero_es(numero) + (numero === 1 ? ' consulta' : ' consultas')
}

/**
 * Minutos estimados a texto: "45 min", "11 h", "11 h 7 min".
 *
 * @param {Number} minutos
 * @returns {String}
 */
export function duracion_en_texto(minutos) {
	let total = Math.round(a_numero(minutos))
	if (total < 60) {
		return total + ' min'
	}
	let horas = Math.floor(total / 60)
	let resto = total % 60
	return horas + ' h' + (resto ? ' ' + resto + ' min' : '')
}

/**
 * Dólares con dos decimales es-AR ("7,50").
 *
 * @param {Number} valor
 * @returns {String}
 */
export function dolares_en_texto(valor) {
	return numero_con_decimales(a_numero(valor), 2)
}

/**
 * Nombres de campos en una frase: ['peso', 'alto', 'profundidad'] -> "Peso, Alto y Largo". Las claves
 * que no son un campo de medida se ignoran.
 *
 * @param {Array<String>} claves
 * @returns {String} '' si no hay ninguna.
 */
export function texto_de_campos(claves) {
	let nombres = []
	CAMPOS_DE_MEDIDA.forEach(function (campo) {
		if (Array.isArray(claves) && claves.indexOf(campo.clave) !== -1) {
			nombres.push(campo.etiqueta)
		}
	})
	if (nombres.length <= 1) {
		return nombres.join('')
	}
	return nombres.slice(0, -1).join(', ') + ' y ' + nombres[nombres.length - 1]
}

/**
 * Traduce el motivo por el que el sistema no pudo comprobar un valor ("cita_no_esta_en_la_pagina" ->
 * "la cita no aparece en la página"). Un código que la SPA todavía no conoce se humaniza en minúscula
 * ("valor raro") en vez de mostrarse crudo; sin código, devuelve ''.
 *
 * @param {String} codigo `motivo_rechazo` de un campo, o el motivo de un campo en el diagnóstico.
 * @returns {String}
 */
export function texto_del_rechazo(codigo) {
	if (codigo === null || typeof codigo === 'undefined' || codigo === '') {
		return ''
	}
	if (Object.prototype.hasOwnProperty.call(MOTIVOS_DE_RECHAZO, codigo)) {
		return MOTIVOS_DE_RECHAZO[codigo]
	}
	return humanizar(codigo).toLowerCase()
}

/**
 * El motivo de un campo del diagnóstico de la IA. La API manda un código del validador; si es uno que
 * conocemos sale la frase traducida con la inicial en mayúscula, y si es otra cosa (una frase que ya
 * viene lista) se muestra tal cual.
 *
 * @param {String} motivo
 * @returns {String}
 */
export function motivo_de_campo_de_la_ia(motivo) {
	if (typeof motivo === 'string' && Object.prototype.hasOwnProperty.call(MOTIVOS_DE_RECHAZO, motivo)) {
		return humanizar(MOTIVOS_DE_RECHAZO[motivo])
	}
	return motivo || ''
}

/**
 * La línea de aviso de un campo «sin respaldo»: "La cita no aparece en la página." (sin repetir el
 * nombre del campo: lo pone el componente al lado).
 *
 * @param {Object} campo Un campo normalizado (`motivo_rechazo`).
 * @returns {String} '' si el campo no trae motivo.
 */
export function aviso_de_campo_sin_respaldo(campo) {
	let motivo = campo ? texto_del_rechazo(campo.motivo_rechazo) : ''
	return motivo ? humanizar(motivo) + '.' : ''
}

/**
 * "1 crédito" / "4 créditos".
 *
 * @param {Number} cantidad
 * @returns {String}
 */
export function creditos_en_texto(cantidad) {
	let numero = a_numero(cantidad)
	return numero_con_decimales(numero, Number.isInteger(numero) ? 0 : 1) + (numero === 1 ? ' crédito' : ' créditos')
}

/**
 * Lo que se dice de una página del diagnóstico que se leyó con el respaldo (el scrape de Serper):
 * "Leída con el respaldo · 4 créditos". Una página leída de la forma normal (o sin el dato, de una API
 * vieja) devuelve ''.
 *
 * @param {Object} pagina Página normalizada (`via_scrape`, `creditos`).
 * @returns {String}
 */
export function texto_de_lectura_con_respaldo(pagina) {
	// Solo si se leyó de verdad: una página que se intentó con el respaldo y falló dice su motivo aparte.
	if (!pagina || pagina.via_scrape !== true || pagina.leida !== true) {
		return ''
	}
	let texto = TEXTOS.leida_con_respaldo
	return pagina.creditos > 0 ? texto + ' · ' + creditos_en_texto(pagina.creditos) : texto
}

/**
 * Lo que se dice de una página que se intentó leer con el respaldo, gastó créditos y no se pudo leer:
 * "Respaldo sin resultado · 2 créditos". Si se leyó, o no se usó el respaldo, o no costó nada, ''.
 *
 * @param {Object} pagina Página normalizada (`leida`, `via_scrape`, `creditos`).
 * @returns {String}
 */
export function texto_de_respaldo_sin_resultado(pagina) {
	if (!pagina || pagina.via_scrape !== true || pagina.leida === true || !(pagina.creditos > 0)) {
		return ''
	}
	return 'Respaldo sin resultado · ' + creditos_en_texto(pagina.creditos)
}

/**
 * La línea de la previa que dice cuántos artículos suma la casilla «Volver a buscar también los que
 * quedaron sin datos». Cero (o una API vieja que no lo manda) no dice nada.
 *
 * @param {Number} cantidad `reintento_sin_datos` de la previa.
 * @returns {String}
 */
export function texto_de_reintento(cantidad) {
	let numero = a_numero(cantidad)
	if (numero <= 0) {
		return ''
	}
	return numero === 1
		? 'Esta opción suma 1 artículo que ya se había buscado sin datos.'
		: 'Esta opción suma ' + entero_es(numero) + ' artículos que ya se habían buscado sin datos.'
}

/**
 * El aviso de la confirmación de «Aprobar seleccionadas» cuando el lote incluye propuestas con valores
 * que el sistema no pudo comprobar: esas NO se aprueban en lote, se aprueban de a una.
 *
 * @param {Number} cantidad Cuántas del lote están en ese caso.
 * @returns {String} '' si no hay ninguna.
 */
export function aviso_de_lote_con_sin_respaldo(cantidad) {
	let numero = a_numero(cantidad)
	if (numero <= 0) {
		return ''
	}
	return numero === 1
		? ' Ojo: 1 tiene valores que el sistema no pudo comprobar en la página y no se aprueba en lote: se aprueba de a una.'
		: ' Ojo: ' + entero_es(numero) + ' tienen valores que el sistema no pudo comprobar en la página y no se aprueban en lote: se aprueban de a una.'
}

/**
 * El mensaje del resultado de aprobar en lote cuando la API dejó afuera propuestas sin respaldo
 * (`omitidos_sin_respaldo`): "3 aprobadas; 2 tienen valores sin comprobar y se aprueban de a una,
 * mirando la cita y la fuente."
 *
 * @param {Number} aprobadas Cuántas se aprobaron.
 * @param {Number} omitidos Cuántas quedaron afuera por no tener respaldo.
 * @returns {String} '' si no se omitió ninguna.
 */
export function texto_de_omitidos_sin_respaldo(aprobadas, omitidos) {
	let sin_comprobar = a_numero(omitidos)
	if (sin_comprobar <= 0) {
		return ''
	}
	let hechas = a_numero(aprobadas)
	let inicio = hechas > 0 ? entero_es(hechas) + (hechas === 1 ? ' aprobada; ' : ' aprobadas; ') : ''
	let resto = sin_comprobar === 1
		? '1 tiene valores sin comprobar y se aprueba de a una'
		: entero_es(sin_comprobar) + ' tienen valores sin comprobar y se aprueban de a una'
	return inicio + resto + ', mirando la cita y la fuente.'
}

/**
 * El aviso después de aprobar un artículo, cuando pasó algo que la persona tiene que saber: la API no
 * pisó un campo que el artículo ya tenía (`salteados`) o dejó sin cargar uno que la persona sacó
 * (`excluidos`). Si se cargó todo lo propuesto, no hay aviso: la fila que se va es la confirmación.
 *
 * @param {Object|null} resultado `resultado_de_la_accion` del item (ver normalizar_resultado_de_accion).
 * @returns {{tipo: String, texto: String}|null} `tipo` es 'warning' (hubo campos que no se pisaron) o
 *   'info' (solo lo que la persona sacó).
 */
export function aviso_de_aprobacion(resultado) {
	if (!resultado) {
		return null
	}
	let salteados = texto_de_campos(resultado.salteados)
	let excluidos = texto_de_campos(resultado.excluidos)
	if (!salteados && !excluidos) {
		return null
	}
	let partes = []
	let llenados = texto_de_campos(resultado.llenados)
	if (llenados) {
		partes.push('Se cargó ' + llenados + '.')
	}
	if (salteados) {
		partes.push('No se pisó ' + salteados + ': el artículo ya tenía un valor cargado.')
	}
	if (excluidos) {
		partes.push('No se cargó ' + excluidos + ', como pediste.')
	}
	return { tipo: salteados ? 'warning' : 'info', texto: partes.join(' ') }
}

/**
 * El aviso después de quitar las medidas de un artículo: qué volvió a quedar vacío y qué se conservó
 * porque alguien lo cambió después. Sin campos conservados es el aviso de siempre.
 *
 * @param {Object|null} resultado `resultado_de_la_accion` del item.
 * @returns {{tipo: String, texto: String}}
 */
export function aviso_de_quitar(resultado) {
	let revertidos = resultado ? texto_de_campos(resultado.revertidos) : ''
	let conservados = resultado ? texto_de_campos(resultado.conservados) : ''
	if (!conservados) {
		return { tipo: 'success', texto: 'Listo: le quitamos las medidas al artículo' }
	}
	let texto = revertidos ? 'Se quitó ' + revertidos + '. ' : 'No se quitó nada. '
	return { tipo: 'warning', texto: texto + 'Se conservó ' + conservados + ' porque se modificó después de la búsqueda.' }
}
