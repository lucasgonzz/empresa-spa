/**
 * Reglas puras (sin Vue, sin store, sin `this`) de la sub-solapa Alertas → Catálogo → Medidas
 * (misión medidas-masivas-catalogo, 27/10/2026): la búsqueda masiva de peso, alto, ancho y largo
 * de los artículos de un negocio.
 *
 * Las comparten:
 *   - store/dimension_search.js  -> normaliza lo que manda la API (contrato §2.6 del plan).
 *   - los componentes de .../lista-de-alertas-table/medidas/ -> formatean los valores, arman la
 *     nota de conversión y validan lo que se edita antes de aprobar.
 *   - los tests de tests/medidas-de-catalogo.test.cjs.
 *
 * Unidades de la base (plan §0): `peso` en kg; `alto`, `ancho` y `profundidad` en cm. La API manda
 * SIEMPRE los valores ya convertidos a esas unidades; si la página decía "70 mm", llega 7 con
 * `convertido: true`, `valor_original: 70` y `unidad_original: 'mm'`. La SPA no convierte nada:
 * solo lo muestra.
 *
 * 🔴 Todo lo que entra de la API pasa por acá antes de dibujarse: la API y la SPA se construyen por
 * separado, los decimales de MySQL pueden llegar como texto y un campo que no vino no puede romper
 * el render (en Vue 2 una excepción en el render es una pantalla en blanco). Las funciones toleran
 * cualquier entrada y nunca tiran excepción.
 */

import { separadores_es_desde_dato } from '@/common-vue/helpers/formato_numero'

/**
 * Los cuatro campos que busca la misión, en el orden en que se dibujan los chips. La clave es la
 * del contrato (`profundidad` es el largo del artículo); `maximo` es el tope de cordura del plan
 * §2.2 (peso hasta 2000 kg, cada medida hasta 1000 cm).
 *
 * @type {Array<{clave: String, etiqueta: String, unidad: String, maximo: Number}>}
 */
export const CAMPOS_DE_MEDIDA = Object.freeze([
	Object.freeze({ clave: 'peso', etiqueta: 'Peso', unidad: 'kg', maximo: 2000 }),
	Object.freeze({ clave: 'alto', etiqueta: 'Alto', unidad: 'cm', maximo: 1000 }),
	Object.freeze({ clave: 'ancho', etiqueta: 'Ancho', unidad: 'cm', maximo: 1000 }),
	Object.freeze({ clave: 'profundidad', etiqueta: 'Largo', unidad: 'cm', maximo: 1000 }),
])

/**
 * Las tres solapas del detalle de una corrida, en el orden que pidió Lucas: lo que ya está, lo que
 * hay que mirar y lo que no se encontró.
 *
 * @type {Array<{valor: String, nombre: String}>}
 */
export const SOLAPAS_DE_MEDIDAS = Object.freeze([
	Object.freeze({ valor: 'asignadas', nombre: 'Asignadas' }),
	Object.freeze({ valor: 'a_revisar', nombre: 'A revisar' }),
	Object.freeze({ valor: 'sin_datos', nombre: 'Sin datos' }),
])

/** Valores de solapa que se aceptan por URL y por API (los de `SOLAPAS_DE_MEDIDAS`). */
export const VALORES_DE_SOLAPA = Object.freeze(['asignadas', 'a_revisar', 'sin_datos'])

// --- Conversión segura de tipos ----------------------------------------------------------------

/**
 * @param {*} valor
 * @returns {Number} El número, o 0 si no es un número finito.
 */
export function a_numero(valor) {
	let numero = Number(valor)
	return isFinite(numero) ? numero : 0
}

/**
 * Una medida que viene de la API: un número positivo, o null. Cero, negativos, vacíos y textos que
 * no son números cuentan como "falta": en la base un cero es lo mismo que vacío (decisión D5 del
 * plan: se llena solo lo que está vacío, null o 0).
 *
 * @param {*} valor
 * @returns {Number|null}
 */
export function a_medida_o_null(valor) {
	if (valor === null || typeof valor === 'undefined' || valor === '' || typeof valor === 'boolean') {
		return null
	}
	let numero = Number(valor)
	if (!isFinite(numero) || numero <= 0) {
		return null
	}
	return numero
}

/**
 * @param {*} valor
 * @returns {Array} El mismo arreglo, o uno vacío si no era un arreglo.
 */
export function a_lista(valor) {
	return Array.isArray(valor) ? valor : []
}

/**
 * @param {*} valor
 * @returns {String} El texto sin espacios de más, o '' si no vino.
 */
export function a_texto(valor) {
	if (valor === null || typeof valor === 'undefined') {
		return ''
	}
	return String(valor).trim()
}

/**
 * @param {*} valor
 * @returns {String|null} El texto, o null si no vino (undefined, null o vacío).
 */
export function a_texto_o_null(valor) {
	let texto = a_texto(valor)
	return texto === '' ? null : texto
}

// --- Direcciones web ---------------------------------------------------------------------------

/**
 * Devuelve la URL solo si es un link web (http:// o https://); cualquier otra cosa da null.
 *
 * Las URLs de las fuentes vienen de resultados de búsqueda de terceros: una que llegara como
 * `javascript:...` en un `href` se ejecutaría al tocarla. Con null, Vue no pone el atributo.
 *
 * @param {*} url
 * @returns {String|null}
 */
export function url_segura(url) {
	let texto = a_texto(url)
	if (/^https?:\/\//i.test(texto)) {
		return texto
	}
	return null
}

/**
 * El dominio de una URL, sin "www." ("https://www.ficha.com.ar/a/b" -> "ficha.com.ar"). Sin
 * `new URL` a propósito: un texto raro no tiene que poder tirar una excepción en el render.
 *
 * @param {*} url
 * @returns {String} '' si no es una URL web.
 */
export function dominio_de(url) {
	let segura = url_segura(url)
	if (!segura) {
		return ''
	}
	let coincidencia = /^https?:\/\/([^/?#:]+)/i.exec(segura)
	if (!coincidencia) {
		return ''
	}
	return coincidencia[1].toLowerCase().replace(/^www\./, '')
}

// --- Formato de valores ------------------------------------------------------------------------

/**
 * Un número para mostrar, con coma decimal, punto de miles y hasta 4 decimales sin ceros de relleno
 * (la base guarda `decimal(30,4)`): 7 -> "7", 0.82 -> "0,82", 1.2500 -> "1,25", 70 -> "70".
 *
 * @param {*} valor
 * @returns {String} '' si no es un número.
 */
export function formatear_numero(valor) {
	if (valor === null || typeof valor === 'undefined' || valor === '') {
		return ''
	}
	let numero = Number(valor)
	if (!isFinite(numero)) {
		return ''
	}
	// toFixed(4) siempre trae decimales, así que el regex solo recorta ceros de la parte decimal
	// ("100.0000" -> "100", nunca "1").
	let recortado = numero.toFixed(4).replace(/\.?0+$/, '')
	return separadores_es_desde_dato(recortado)
}

/**
 * Un valor con su unidad: "0,82 kg", "7 cm". Sin unidad, solo el número.
 *
 * @param {*} valor
 * @param {String} [unidad]
 * @returns {String} '' si el valor no es un número.
 */
export function formatear_medida(valor, unidad) {
	let numero = formatear_numero(valor)
	if (numero === '') {
		return ''
	}
	let u = a_texto(unidad)
	return u ? numero + ' ' + u : numero
}

/**
 * La nota chica de una medida que la API tuvo que convertir: "70 mm → 7 cm". Solo si el campo
 * viene `convertido` y trae el valor y la unidad originales; si no, ''.
 *
 * @param {Object} campo Un campo normalizado (`normalizar_item(...).campos`).
 * @returns {String}
 */
export function nota_de_conversion(campo) {
	if (!campo || campo.convertido !== true) {
		return ''
	}
	let original = formatear_medida(campo.valor_original, campo.unidad_original)
	let actual = formatear_medida(campo.valor, campo.unidad)
	if (!original || !actual || !a_texto(campo.unidad_original)) {
		return ''
	}
	return original + ' → ' + actual
}

/**
 * Un entero con separador de miles es-AR ("1.830"). Acepta números o texto.
 *
 * @param {*} valor
 * @returns {String}
 */
export function entero_es(valor) {
	return separadores_es_desde_dato(String(Math.round(a_numero(valor))))
}

/**
 * El valor de un input de edición: coma decimal y sin separador de miles (se escribe y se lee mejor
 * "1250,5" que "1.250,5"). null o vacío dan ''.
 *
 * @param {*} valor
 * @returns {String}
 */
export function texto_para_input(valor) {
	let numero = a_medida_o_null(valor)
	if (numero === null) {
		return ''
	}
	return numero.toFixed(4).replace(/\.?0+$/, '').replace('.', ',')
}

// --- Edición de los cuatro valores antes de aprobar --------------------------------------------

/**
 * Lee un número escrito a mano. Acepta coma o punto decimal ("7,5" y "7.5") y, si hay coma, los
 * puntos son separadores de miles ("1.250,5"). Un punto solo es decimal.
 *
 * @param {*} texto
 * @returns {{vacio: Boolean, valido: Boolean, numero: Number|null}}
 */
export function parsear_numero_es(texto) {
	let limpio = a_texto(texto).replace(/\s+/g, '')
	if (limpio === '') {
		return { vacio: true, valido: true, numero: null }
	}
	if (limpio.indexOf(',') !== -1) {
		limpio = limpio.replace(/\./g, '').replace(',', '.')
	}
	if (!/^\d+(\.\d+)?$/.test(limpio)) {
		return { vacio: false, valido: false, numero: null }
	}
	return { vacio: false, valido: true, numero: Number(limpio) }
}

/**
 * Valida lo que se escribió en los cuatro inputs de "Editar" y arma el cuerpo de `aprobar`.
 *
 * Los campos vacíos no viajan (la propuesta puede ser parcial: se aprueba lo que hay). Cada valor
 * tiene que ser mayor que cero y no pasar el tope de cordura de la API (plan §2.2): la API vuelve a
 * validar y contesta 422, esto solo evita el viaje y dice cuál campo está mal.
 *
 * @param {Object} entradas Texto de cada input, por clave: `{peso: '0,82', alto: '', ...}`.
 * @returns {{valores: Object, errores: Object, hay_errores: Boolean, cantidad: Number}}
 *   `valores` lleva solo los campos con número válido (redondeados a 4 decimales); `errores` el
 *   mensaje de cada campo mal escrito; `cantidad` cuántos valores hay.
 */
export function validar_valores_editados(entradas) {
	let origen = entradas && typeof entradas === 'object' ? entradas : {}
	let valores = {}
	let errores = {}
	let cantidad = 0

	CAMPOS_DE_MEDIDA.forEach(function (campo) {
		let leido = parsear_numero_es(origen[campo.clave])
		if (leido.vacio) {
			return
		}
		if (!leido.valido) {
			errores[campo.clave] = 'Escribí un número, por ejemplo 7,5.'
			return
		}
		if (leido.numero <= 0) {
			errores[campo.clave] = 'Tiene que ser mayor que cero.'
			return
		}
		if (leido.numero > campo.maximo) {
			errores[campo.clave] = 'Es demasiado grande: el máximo es ' + formatear_medida(campo.maximo, campo.unidad) + '.'
			return
		}
		valores[campo.clave] = Math.round(leido.numero * 10000) / 10000
		cantidad++
	})

	return {
		valores: valores,
		errores: errores,
		hay_errores: Object.keys(errores).length > 0,
		cantidad: cantidad,
	}
}

// --- Normalización de lo que manda la API ------------------------------------------------------

/**
 * Los conteos de las tres solapas (y los dos extras del contrato).
 *
 * @param {*} valor `conteos` tal como llegó.
 * @returns {{asignadas: Number, a_revisar: Number, sin_datos: Number, pendientes: Number, errores: Number}}
 */
export function normalizar_conteos(valor) {
	let origen = valor && typeof valor === 'object' ? valor : {}
	return {
		asignadas: a_numero(origen.asignadas),
		a_revisar: a_numero(origen.a_revisar),
		sin_datos: a_numero(origen.sin_datos),
		pendientes: a_numero(origen.pendientes),
		errores: a_numero(origen.errores),
	}
}

/**
 * Resumen liviano del badge (GET dimension-search-runs/resumen): `{a_revisar, sin_ver, badge,
 * en_proceso}`. El `badge` lo calcula la API y es el que manda; si no vino (API de otra forma), se
 * arma como en Imágenes: a revisar + corridas terminadas sin abrir.
 *
 * @param {*} valor
 * @returns {{a_revisar: Number, sin_ver: Number, badge: Number, en_proceso: Number}}
 */
export function normalizar_resumen(valor) {
	if (!valor || typeof valor !== 'object') {
		return resumen_vacio()
	}
	let a_revisar = a_numero(valor.a_revisar)
	let sin_ver = a_numero(valor.sin_ver)
	let badge = typeof valor.badge === 'undefined' || valor.badge === null ? a_revisar + sin_ver : a_numero(valor.badge)
	return {
		a_revisar: a_revisar,
		sin_ver: sin_ver,
		badge: badge,
		en_proceso: a_numero(valor.en_proceso),
	}
}

/**
 * Resumen vacío: lo que vale el badge mientras la API no contestó (o si no tiene la ruta).
 *
 * @returns {{a_revisar: Number, sin_ver: Number, badge: Number, en_proceso: Number}}
 */
export function resumen_vacio() {
	return { a_revisar: 0, sin_ver: 0, badge: 0, en_proceso: 0 }
}

/**
 * Una corrida (RunPayload, plan §2.6) con todos los campos presentes y del tipo esperado.
 *
 * Alias tolerados: `total_articulos` por `total`, `trabada` por `esta_trabada`, `started_at` por
 * `created_at` en la fecha de la tabla. Los datos que el contrato no lista (`created_at`,
 * `lanzada_por`, `motivo_estado`, `proveedor`) se pasan si la API los manda.
 *
 * @param {*} crudo
 * @returns {Object|null} null si no es un objeto con `id`.
 */
export function normalizar_corrida(crudo) {
	if (!crudo || typeof crudo !== 'object' || crudo.id === null || typeof crudo.id === 'undefined') {
		return null
	}
	let total = typeof crudo.total === 'undefined' ? crudo.total_articulos : crudo.total
	let trabada = typeof crudo.esta_trabada === 'undefined' ? crudo.trabada : crudo.esta_trabada
	let estado = a_texto(crudo.status)
	let activa = estado === 'pendiente' || estado === 'en_proceso'
	let por_estado_puede_reanudar = estado === 'detenida' || estado === 'fallida' || trabada === true
	return {
		id: Number(crudo.id),
		origen: a_texto(crudo.origen) || 'catalogo',
		status: estado,
		solo_con_stock: crudo.solo_con_stock === true || crudo.solo_con_stock === 1 || crudo.solo_con_stock === '1',
		total: a_numero(total),
		procesados: a_numero(crudo.procesados),
		conteos: normalizar_conteos(crudo.conteos),
		busquedas: a_numero(crudo.busquedas),
		validaciones_ia: a_numero(crudo.validaciones_ia),
		started_at: a_texto_o_null(crudo.started_at),
		finished_at: a_texto_o_null(crudo.finished_at),
		created_at: a_texto_o_null(crudo.created_at),
		esta_trabada: trabada === true,
		puede_detener: typeof crudo.puede_detener === 'boolean' ? crudo.puede_detener : activa,
		puede_reanudar: typeof crudo.puede_reanudar === 'boolean' ? crudo.puede_reanudar : por_estado_puede_reanudar,
		visto: crudo.visto !== false,
		lanzada_por: a_texto_o_null(crudo.lanzada_por),
		motivo_estado: a_texto_o_null(crudo.motivo_estado),
		proveedor: a_texto_o_null(crudo.proveedor),
	}
}

/**
 * Los cuatro campos de un artículo, siempre en el mismo orden (peso, alto, ancho, largo), con el
 * valor propuesto, la conversión, la cita y la fuente de cada uno. Un campo sin valor queda con
 * `falta: true`.
 *
 * El valor sale de `campos[]` y, si ahí no está, de `propuesta`. La etiqueta es siempre la de
 * `CAMPOS_DE_MEDIDA` (la API manda `profundidad`, el cliente lee "Largo").
 *
 * @param {Object} item ItemPayload tal como llegó.
 * @returns {Array<Object>}
 */
function armar_campos(item) {
	let propuesta = item.propuesta && typeof item.propuesta === 'object' ? item.propuesta : {}
	let crudos = a_lista(item.campos)
	let campos = []

	CAMPOS_DE_MEDIDA.forEach(function (definicion) {
		let crudo = null
		crudos.forEach(function (candidato) {
			if (candidato && typeof candidato === 'object' && candidato.clave === definicion.clave) {
				crudo = candidato
			}
		})
		let datos = crudo || {}
		let valor = a_medida_o_null(datos.valor)
		if (valor === null) {
			valor = a_medida_o_null(propuesta[definicion.clave])
		}
		campos.push({
			clave: definicion.clave,
			etiqueta: definicion.etiqueta,
			valor: valor,
			unidad: a_texto(datos.unidad) || definicion.unidad,
			valor_original: a_medida_o_null(datos.valor_original),
			unidad_original: a_texto_o_null(datos.unidad_original),
			// Una medida sin valor no puede estar "convertida": no hay nada que mostrar.
			convertido: valor !== null && datos.convertido === true,
			cita: a_texto_o_null(datos.cita),
			url: url_segura(datos.url),
			alcance: a_texto_o_null(datos.alcance),
			falta: valor === null,
		})
	})

	return campos
}

/**
 * Las fuentes de un artículo: las de `fuentes[]` y, si la API no mandó ninguna, las URLs de los
 * campos. Sin repetir y solo con links web. Cada una lleva su dominio.
 *
 * @param {Object} item ItemPayload tal como llegó.
 * @param {Array<Object>} campos Los de `armar_campos`.
 * @returns {Array<{url: String, titulo: String, dominio: String}>}
 */
function armar_fuentes(item, campos) {
	let fuentes = []
	let vistas = {}

	function sumar(url, titulo, dominio) {
		let segura = url_segura(url)
		if (!segura || vistas[segura]) {
			return
		}
		vistas[segura] = true
		fuentes.push({
			url: segura,
			titulo: a_texto(titulo),
			dominio: a_texto(dominio) || dominio_de(segura),
		})
	}

	a_lista(item.fuentes).forEach(function (fuente) {
		if (fuente && typeof fuente === 'object') {
			sumar(fuente.url, fuente.titulo, fuente.dominio)
		} else if (typeof fuente === 'string') {
			sumar(fuente, '', '')
		}
	})
	campos.forEach(function (campo) {
		if (campo.url) {
			sumar(campo.url, '', '')
		}
	})
	return fuentes
}

/**
 * El diagnóstico de un artículo sin datos ("Ver qué se probó", plan §2.3): un bloque por plan de
 * búsqueda, con su consulta, cuántas búsquedas y resultados dio, las páginas que se leyeron y por
 * qué se descartó cada una.
 *
 * La forma exacta la define la API; acá se aceptan los nombres razonables (`paginas`, `candidatas`
 * o `resultados` como lista) y lo que no se entiende se ignora.
 *
 * @param {*} crudo `diagnostico` del ItemPayload.
 * @returns {Array<Object>}
 */
export function normalizar_diagnostico(crudo) {
	let planes = []
	a_lista(crudo).forEach(function (plan) {
		if (!plan || typeof plan !== 'object') {
			return
		}
		let lista_de_paginas = a_lista(plan.paginas)
		if (!lista_de_paginas.length) {
			lista_de_paginas = a_lista(plan.candidatas)
		}
		if (!lista_de_paginas.length && Array.isArray(plan.resultados)) {
			lista_de_paginas = plan.resultados
		}
		let paginas = []
		lista_de_paginas.forEach(function (pagina) {
			if (!pagina || typeof pagina !== 'object') {
				return
			}
			let url = url_segura(pagina.url)
			paginas.push({
				url: url,
				titulo: a_texto(pagina.titulo),
				dominio: a_texto(pagina.dominio) || dominio_de(url),
				leida: pagina.leida === true,
				motivo: a_texto(pagina.motivo_descarte || pagina.motivo || pagina.descarte || pagina.resultado),
			})
		})
		let resultados = Array.isArray(plan.resultados) ? plan.resultados.length : a_numero(plan.resultados)
		planes.push({
			criterio: a_texto(plan.criterio || plan.plan),
			consulta: a_texto(plan.consulta),
			usado: plan.usado !== false,
			motivo_no_usado: a_texto(plan.motivo_no_usado),
			busquedas: a_numero(plan.busquedas),
			resultados: resultados,
			resumen: a_texto(plan.resumen),
			error: a_texto(plan.error),
			paginas: paginas,
		})
	})
	return planes
}

/**
 * Un artículo de una corrida (ItemPayload, plan §2.6) con todos los campos presentes y del tipo
 * esperado.
 *
 * @param {*} crudo
 * @returns {Object|null} null si no es un objeto con `id`.
 */
export function normalizar_item(crudo) {
	if (!crudo || typeof crudo !== 'object' || crudo.id === null || typeof crudo.id === 'undefined') {
		return null
	}
	let campos = armar_campos(crudo)
	let propuesta = {}
	let faltan = []
	let con_valor = 0
	campos.forEach(function (campo) {
		propuesta[campo.clave] = campo.valor
		if (campo.falta) {
			faltan.push(campo.clave)
		} else {
			con_valor++
		}
	})
	return {
		id: Number(crudo.id),
		article_id: crudo.article_id === null || typeof crudo.article_id === 'undefined' ? null : Number(crudo.article_id),
		article_name: a_texto(crudo.article_name),
		article_bar_code: a_texto_o_null(crudo.article_bar_code),
		article_provider_code: a_texto_o_null(crudo.article_provider_code),
		status: a_texto(crudo.status),
		motivo: a_texto(crudo.motivo),
		motivo_detalle: a_texto(crudo.motivo_detalle),
		criterio_usado: a_texto(crudo.criterio_usado),
		propuesta: propuesta,
		faltan: faltan,
		cantidad_con_valor: con_valor,
		campos: campos,
		fuentes: armar_fuentes(crudo, campos),
		nota_ia: a_texto(crudo.nota_ia),
		busquedas: a_numero(crudo.busquedas),
		diagnostico: normalizar_diagnostico(crudo.diagnostico),
		revisado_at: a_texto_o_null(crudo.revisado_at),
		revisado_por: a_texto_o_null(crudo.revisado_por),
	}
}

/**
 * Lista de ítems normalizados (descarta lo que no sea un ítem válido).
 *
 * @param {*} lista
 * @returns {Array<Object>}
 */
export function normalizar_items(lista) {
	let items = []
	a_lista(lista).forEach(function (crudo) {
		let item = normalizar_item(crudo)
		if (item) {
			items.push(item)
		}
	})
	return items
}

/**
 * La previa de "todo el catálogo" (GET dimension-search-runs/catalogo/previa). El plan §2.5 dice
 * qué tiene que contar (cuántos entran, cuántos no y por qué, tiempo, búsquedas y costo estimados,
 * y si falta Serper o la IA) pero no los nombres de los campos: se espejan los de la previa de
 * imágenes y se aceptan algunos alias. Un dato que no vino queda en `null` ("no se sabe"), y un
 * `null` en `proveedor_configurado` / `ia_configurada` NO bloquea el lanzamiento: la API igual
 * rechaza con 422 si falta algo.
 *
 * @param {*} crudo
 * @returns {Object}
 */
export function normalizar_previa(crudo) {
	let previa = crudo && typeof crudo === 'object' ? crudo : {}
	let estimacion = previa.estimacion && typeof previa.estimacion === 'object' ? previa.estimacion : {}

	function primero_definido(valores) {
		for (let i = 0; i < valores.length; i++) {
			if (typeof valores[i] !== 'undefined' && valores[i] !== null) {
				return valores[i]
			}
		}
		return null
	}
	function booleano_o_null(valor) {
		return typeof valor === 'boolean' ? valor : null
	}
	function numero_o_null(valor) {
		return valor === null || typeof valor === 'undefined' || valor === '' || !isFinite(Number(valor)) ? null : Number(valor)
	}

	let excluidos = []
	a_lista(previa.excluidos).forEach(function (excluido) {
		if (excluido && typeof excluido === 'object' && a_numero(excluido.cantidad) > 0) {
			excluidos.push({ motivo: a_texto(excluido.motivo), texto: a_texto(excluido.texto), cantidad: a_numero(excluido.cantidad) })
		}
	})

	return {
		a_buscar: a_numero(primero_definido([previa.a_buscar, previa.entran])),
		// Artículos del negocio a los que les falta alguna de las cuatro medidas (el universo).
		sin_medidas: numero_o_null(primero_definido([previa.sin_medidas, previa.candidatos, previa.sin_imagen])),
		excluidos_sin_stock: a_numero(previa.excluidos_sin_stock),
		excluidos_pendientes_de_revision: a_numero(previa.excluidos_pendientes_de_revision),
		excluidos_ya_buscados: a_numero(previa.excluidos_ya_buscados),
		excluidos_en_otra_corrida: a_numero(primero_definido([previa.excluidos_en_otra_corrida, previa.excluidos_en_otra_asignacion])),
		// Lista libre de exclusiones que la API quiera sumar ({motivo, texto, cantidad}).
		excluidos: excluidos,
		quedan_para_otra_corrida: a_numero(previa.quedan_para_otra_corrida),
		tope: a_numero(previa.tope),
		proveedor_configurado: booleano_o_null(primero_definido([previa.proveedor_configurado, previa.serper_configurado])),
		ia_configurada: booleano_o_null(previa.ia_configurada),
		ia_motivo: a_texto(previa.ia_motivo),
		corrida_activa: normalizar_corrida(previa.corrida_activa),
		tope_demo: previa.tope_demo && typeof previa.tope_demo === 'object' ? previa.tope_demo : null,
		estimacion: {
			busquedas: numero_o_null(primero_definido([estimacion.busquedas, previa.busquedas_estimadas])),
			minutos: numero_o_null(primero_definido([estimacion.minutos, previa.minutos_estimados])),
			usd_busquedas: numero_o_null(estimacion.usd_busquedas),
			usd_ia: numero_o_null(estimacion.usd_ia),
			usd_total: numero_o_null(primero_definido([estimacion.usd_total, previa.costo_estimado_usd])),
		},
	}
}

// --- Forma de las respuestas -------------------------------------------------------------------

/**
 * El paginador de una respuesta de lista. El contrato (§2.6) dice `{data:[...], total, ...}` y las
 * rutas de imágenes mandan `{models: paginador, ...}`: se aceptan las dos formas.
 *
 * @param {*} cuerpo `res.data`.
 * @returns {{data: Array, total: Number, last_page: Number, current_page: Number|null}|null} null
 *   si la respuesta no trae ningún paginador.
 */
export function extraer_paginador(cuerpo) {
	if (!cuerpo || typeof cuerpo !== 'object') {
		return null
	}
	let paginador = null
	if (cuerpo.models && Array.isArray(cuerpo.models.data)) {
		paginador = cuerpo.models
	} else if (Array.isArray(cuerpo.data)) {
		paginador = cuerpo
	} else if (Array.isArray(cuerpo.models)) {
		return { data: cuerpo.models, total: cuerpo.models.length, last_page: 1, current_page: 1 }
	}
	if (!paginador) {
		return null
	}
	return {
		data: paginador.data,
		total: a_numero(paginador.total) || paginador.data.length,
		last_page: a_numero(paginador.last_page) || 1,
		current_page: paginador.current_page ? a_numero(paginador.current_page) || 1 : null,
	}
}

/**
 * El modelo único de una respuesta (`{model: ...}` como en imágenes, `{data: ...}` o el objeto
 * suelto).
 *
 * @param {*} cuerpo `res.data`.
 * @returns {Object|null}
 */
export function extraer_modelo(cuerpo) {
	if (!cuerpo || typeof cuerpo !== 'object') {
		return null
	}
	if (cuerpo.model && typeof cuerpo.model === 'object') {
		return cuerpo.model
	}
	if (cuerpo.data && typeof cuerpo.data === 'object' && !Array.isArray(cuerpo.data)) {
		return cuerpo.data
	}
	return cuerpo
}
