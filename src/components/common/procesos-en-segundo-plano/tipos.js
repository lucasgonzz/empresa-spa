/**
 * Mapa de los tipos de proceso en segundo plano que emite `empresa-api`
 * (misión procesos-en-segundo-plano, 18/9/2026).
 *
 * Las claves de `tipo` son las del contrato (`_cruzado/misiones/20260918-procesos-en-segundo-plano/contrato.md`).
 * Por cada tipo se define:
 *
 *  - `icono`:    clase de bootstrap-icons (ya cargado en main.js), sin el prefijo `bi`.
 *  - `acento`:   color de acento como TRIPLE RGB ("0, 123, 255") y no como hex, a propósito: así
 *                el componente lo escribe como `rgba(var(--acento), .12)` para el fondo suave del
 *                ícono y `rgb(var(--acento))` para el ícono mismo, y el mismo valor sirve en claro
 *                y en oscuro (el fondo es translúcido sobre la tarjeta, que sí sale del token).
 *  - `etiqueta`: título por defecto, por si el proceso llega sin `titulo`.
 *  - `detalle`:  qué componente de `detalle/` lo muestra en el modal.
 *
 * Lo que no está acá cae en TIPO_POR_DEFECTO: un tipo nuevo del backend se muestra igual, con el
 * engranaje y el detalle genérico, sin que haga falta tocar la SPA.
 */

/** Detalle genérico, para todo tipo que no tenga uno propio. */
export const DETALLE_GENERICO = 'Generico'

export const TIPOS = {
	importacion_articulos: {
		icono: 'bi-file-earmark-spreadsheet',
		acento: '0, 123, 255',
		etiqueta: 'Importación de artículos',
		detalle: 'Importacion',
	},
	importacion_compra: {
		icono: 'bi-cart-check',
		acento: '0, 123, 255',
		etiqueta: 'Importación de artículos de una compra',
		detalle: 'Importacion',
	},
	recalculo_precios: {
		icono: 'bi-tags',
		acento: '111, 66, 193',
		etiqueta: 'Recálculo de precios',
		detalle: 'RecalculoPrecios',
	},
	actualizacion_masiva: {
		icono: 'bi-pencil-square',
		acento: '23, 162, 184',
		etiqueta: 'Actualización masiva',
		detalle: 'ActualizacionMasiva',
	},
	reversion_masiva: {
		icono: 'bi-arrow-counterclockwise',
		acento: '23, 162, 184',
		etiqueta: 'Reversión de una actualización masiva',
		detalle: 'ActualizacionMasiva',
	},
	eliminacion_masiva: {
		icono: 'bi-trash',
		acento: '180, 68, 63',
		etiqueta: 'Eliminación masiva',
		detalle: DETALLE_GENERICO,
	},
	exportacion: {
		icono: 'bi-box-arrow-down',
		acento: '40, 167, 69',
		etiqueta: 'Exportación',
		detalle: DETALLE_GENERICO,
	},
	analisis_excel: {
		icono: 'bi-stars',
		acento: '111, 66, 193',
		etiqueta: 'Análisis del Excel con IA',
		detalle: DETALLE_GENERICO,
	},
	escaneo_factura: {
		icono: 'bi-receipt',
		acento: '111, 66, 193',
		etiqueta: 'Escaneo de factura de compra',
		detalle: DETALLE_GENERICO,
	},
	imagenes_automaticas: {
		icono: 'bi-image',
		acento: '253, 126, 20',
		etiqueta: 'Imágenes automáticas',
		detalle: DETALLE_GENERICO,
	},
	descripciones_ia: {
		icono: 'bi-chat-left-text',
		acento: '111, 66, 193',
		etiqueta: 'Descripciones inteligentes',
		detalle: DETALLE_GENERICO,
	},
	sincronizar_descuentos: {
		icono: 'bi-percent',
		acento: '0, 123, 255',
		etiqueta: 'Sincronización de descuentos',
		detalle: DETALLE_GENERICO,
	},
	reporte_inventario: {
		icono: 'bi-clipboard-data',
		acento: '23, 162, 184',
		etiqueta: 'Reporte de inventario',
		detalle: DETALLE_GENERICO,
	},
	rollback_importacion: {
		icono: 'bi-arrow-counterclockwise',
		acento: '180, 68, 63',
		etiqueta: 'Reversión de una importación',
		detalle: DETALLE_GENERICO,
	},
	sugerencias_stock: {
		icono: 'bi-lightbulb',
		acento: '253, 126, 20',
		etiqueta: 'Sugerencias de stock',
		detalle: DETALLE_GENERICO,
	},
	sugerencias_compra: {
		icono: 'bi-lightbulb',
		acento: '253, 126, 20',
		etiqueta: 'Sugerencias de compra',
		detalle: DETALLE_GENERICO,
	},
	sugerencias_ofertas: {
		icono: 'bi-lightbulb',
		acento: '253, 126, 20',
		etiqueta: 'Sugerencias de ofertas',
		detalle: DETALLE_GENERICO,
	},
	importacion_meli: {
		icono: 'bi-shop',
		acento: '255, 193, 7',
		etiqueta: 'Importación desde Mercado Libre',
		detalle: DETALLE_GENERICO,
	},
}

/** Lo que se muestra para un `tipo` que la SPA todavía no conoce. */
export const TIPO_POR_DEFECTO = {
	icono: 'bi-gear',
	acento: '108, 117, 125',
	etiqueta: 'Proceso en segundo plano',
	detalle: DETALLE_GENERICO,
}

/** Texto del chip de estado, por `status` del contrato. */
export const ESTADOS = {
	pendiente: 'En espera',
	en_proceso: 'En proceso',
	completado: 'Terminado',
	fallo: 'Falló',
}

/**
 * Etiquetas legibles para las claves de `resultado`. Lo que no está acá se muestra con la clave
 * "humanizada" (ver humanizar_clave). Una entrada puede ser un texto o un objeto con `tipo`:
 *  - `{ tipo: 'link', etiqueta }`: se muestra como botón que abre el valor (que es una URL).
 */
export const ETIQUETAS_DE_RESULTADO = {
	filas_procesadas: 'Filas procesadas',
	creados: 'Creados',
	actualizados: 'Actualizados',
	coincidencias: 'Coincidencias',
	repetidos: 'Repetidos',
	origen_texto: 'Origen',
	articulos_actualizados: 'Artículos actualizados',
	proveedores: 'Proveedores',
	afectados: 'Afectados',
	cambios: 'Cambios',
	eliminados: 'Eliminados',
	archivo: 'Archivo',
	link: { tipo: 'link', etiqueta: 'Descargar' },
	exportados: 'Exportados',
	proveedor: 'Proveedor',
	articulos: 'Artículos',
	clientes: 'Clientes',
	procesados: 'Procesados',
	saltados: 'Salteados',
	salteados: 'Salteados',
	a_revisar: 'A revisar',
	sin_procesar_por_cuota: 'Sin procesar por cuota',
	al_dia: 'Al día',
	stock_minimo: 'Con stock mínimo',
	restaurados: 'Restaurados',
	con_error: 'Con error',
}

/**
 * Datos de presentación de un tipo. Nunca devuelve null: lo desconocido cae en el default.
 *
 * @param {String} tipo Clave `tipo` del proceso.
 * @returns {Object} { icono, acento, etiqueta, detalle }
 */
export function tipo_de(tipo) {
	if (tipo && TIPOS[tipo]) {
		return TIPOS[tipo]
	}
	return TIPO_POR_DEFECTO
}

/**
 * Nombre del componente de `detalle/` que muestra un tipo.
 *
 * @param {String} tipo
 * @returns {String} 'Importacion' | 'RecalculoPrecios' | 'ActualizacionMasiva' | 'Generico'
 */
export function componente_de_detalle(tipo) {
	return tipo_de(tipo).detalle
}

/**
 * True si el tipo es una importación de artículos (desde Excel o desde una compra): son los que
 * tienen historial propio (`import-history`) al que mandar cuando fallan.
 *
 * @param {String} tipo
 * @returns {Boolean}
 */
export function es_de_importacion(tipo) {
	return tipo === 'importacion_articulos' || tipo === 'importacion_compra'
}

/**
 * Texto del chip de estado.
 *
 * @param {String} status
 * @returns {String}
 */
export function texto_de_estado(status) {
	return ESTADOS[status] || status || ''
}

/**
 * True si el proceso todavía no terminó.
 *
 * @param {Object} proceso
 * @returns {Boolean}
 */
export function esta_activo(proceso) {
	return !!proceso && (proceso.status === 'pendiente' || proceso.status === 'en_proceso')
}

/**
 * "sin_procesar_por_cuota" -> "Sin procesar por cuota". Para las claves de `resultado` que no
 * tienen etiqueta propia: mejor eso que mostrar la clave cruda.
 *
 * @param {String} clave
 * @returns {String}
 */
export function humanizar_clave(clave) {
	let texto = String(clave || '').replace(/_/g, ' ').trim()
	if (!texto) {
		return ''
	}
	return texto.charAt(0).toUpperCase() + texto.slice(1)
}

/**
 * Etiqueta legible de una clave de `resultado`, siempre como objeto { tipo, etiqueta }.
 *
 * @param {String} clave
 * @returns {Object} { tipo: 'texto' | 'link', etiqueta }
 */
export function etiqueta_de_resultado(clave) {
	let entrada = ETIQUETAS_DE_RESULTADO[clave]
	if (!entrada) {
		return { tipo: 'texto', etiqueta: humanizar_clave(clave) }
	}
	if (typeof entrada === 'string') {
		return { tipo: 'texto', etiqueta: entrada }
	}
	return { tipo: entrada.tipo || 'texto', etiqueta: entrada.etiqueta || humanizar_clave(clave) }
}
