import { ancla_revertir_importacion } from './importacion-soporte'

export const TEMA_GUIA_DINAMICA = 'guia_dinamica'
const LISTADO = { name: 'article' }
const VENDER = { name: 'vender' }
const VENTAS = { name: 'sale', params: { view: 'todas', sub_view: 'todos' } }
const COMPRAS = { name: 'provider', params: { view: 'compras' } }
const REVERTIR_IMPORTACION = 'listado.revertir_importacion'

// Cada clave describe una acción de pantalla que el motor ya sabe realizar. El plan no trae código de interfaz.
const PANTALLAS = {
	'vista.listado': LISTADO,
	'vista.vender': VENDER,
	'vista.ventas': VENTAS,
	'vista.compras': COMPRAS,
	'vista.reportes': { name: 'reportes', params: { view: 'estado-de-resultados' } },
	'vista.tesoreria': { name: 'caja' },
	'vista.gastos': { name: 'expense' },
	'vista.cheques': { name: 'cheque', params: { sub_view: 'recibido', sub_sub_view: 'pendientes' } },
	'vista.agenda': { name: 'pending', params: { view: 'por-realizar' } },
	'vista.comprobantes': { name: 'comprobantes' },
	'vista.abm': { name: 'abm', params: { view: 'articulos', sub_view: 'categorias' } },
	'vista.alertas': { name: 'alertas' },
	'vista.clientes': { name: 'client', params: { view: 'clientes' } },
	'vista.proveedores': { name: 'provider', params: { view: 'proveedores' } },
	'vista.presupuestos': { name: 'budget' },
}

const CONTROLES = {
	'indicacion': { indicacion: true },
	'tutoriales.abrir': { selector: '[data-nav-tutoriales]', avanza: 'clic' },
	'listado.filtro': { ancla: 'listado.boton_filtrar', ruta: LISTADO, avanza: 'clic' },
	'listado.nuevo_articulo': { selector: '#dropdown_article [data-testid="btn-crear-article"]', ruta: LISTADO, avanza: 'clic' },
	'ventas.filtro_fecha': { ancla: 'ventas.control_fecha', ruta: VENTAS },
	'compras.filtro_fecha': { ancla: 'compras.control_fecha', ruta: COMPRAS },
	'compras.nueva': { ancla: 'compras.boton_crear', ruta: COMPRAS, avanza: 'clic' },
	'listado.crear': { selector: '#dropdown_article .dropdown-toggle-split', ruta: LISTADO, avanza: 'clic' },
	'listado.historial_importaciones': { ancla: 'listado.opcion_historial_importaciones', ruta: LISTADO, antes: 'abrir_menu_importacion', avanza: 'clic', esperar_montaje: '[data-tour="listado.opcion_historial_importaciones"]' },
	[REVERTIR_IMPORTACION]: { ruta: LISTADO, antes: 'buscar_importacion', avanza: 'clic', esperar_montaje: '[data-tour="listado.historial_montado"]' },
	'vender.buscar_articulo': { selector: '#search-article', ruta: VENDER, antes: 'abrir_buscador_articulos', avanza: 'clic', esperar_montaje: '#search-article' },
	'vender.campo_busqueda': { selector: '#search-article-search-modal-input', ruta: VENDER, avanza: 'enter', foco: true },
	'vender.resultados_busqueda': { selector: '[data-tour="vender.resultados_buscador_articulos"], [data-tour="vender.busqueda_sin_resultados"]', ruta: VENDER },
	'vender.codigo_barras': { ancla: 'vender.campo_codigo_barras', ruta: VENDER, antes: 'abrir_codigo_de_barras', avanza: 'enter', foco: true, esperar_montaje: '[data-tour="vender.campo_codigo_barras"]' },
	'vender.recargos': { ancla: 'vender.interruptores_recargos', ruta: VENDER, antes: 'abrir_recargos_de_venta', esperar_montaje: '[data-tour="vender.interruptores_recargos"]' },
	'vender.total': { ancla: 'vender.total', ruta: VENDER, antes: 'mostrar_total_de_venta', esperar_montaje: '[data-tour="vender.total"]' },
	'soporte.abrir': { ancla: 'soporte.abrir', avanza: 'aparece' },
	'soporte.conversacion': { ancla: 'soporte.conversacion' },
	'soporte.escribir': { ancla: 'soporte.escribir', foco: true },
}

function compilar_paso(datos, soporte_abierto) {
	if (!datos || typeof datos.clave !== 'string' || typeof datos.texto !== 'string' || !datos.texto.trim() || datos.texto.length > 240) return null
	if (!Object.keys(datos).every(campo => ['clave', 'texto', 'destino'].includes(campo))) return null

	const clave = datos.clave
	const pantalla = Object.prototype.hasOwnProperty.call(PANTALLAS, clave) ? PANTALLAS[clave] : null
	const control = Object.prototype.hasOwnProperty.call(CONTROLES, clave) ? CONTROLES[clave] : null
	if (!pantalla && !control) return null

	const paso = Object.assign({ foco: false, requerido: true, texto: datos.texto }, pantalla ? { ruta: pantalla, indicacion: true } : control)
	if (clave === REVERTIR_IMPORTACION) {
		if (!Number.isSafeInteger(datos.destino) || datos.destino < 1) return null
		paso.import_history_id = datos.destino
		paso.ancla = ancla_revertir_importacion(datos.destino)
	} else if (Object.prototype.hasOwnProperty.call(datos, 'destino')) {
		return null
	}
	if (clave === 'soporte.abrir' && soporte_abierto) {
		paso.ancla = 'soporte.encabezado'
		delete paso.avanza
	}
	return paso
}

export function pasos_dinamicos(pasos, soporte_abierto) {
	if (!Array.isArray(pasos) || !pasos.length || pasos.length > 8) return []
	const compilados = pasos.map(paso => compilar_paso(paso, soporte_abierto))
	return compilados.includes(null) ? [] : compilados
}
