import { TEMA_REVERTIR_IMPORTACION, ancla_revertir_importacion } from './importacion-soporte'
import { pasos_dinamicos, TEMA_GUIA_DINAMICA } from './soporte-dinamico'

const VENDER = { name: 'vender', params: { view: 'remito' } }
const LISTADO = { name: 'article' }
const CAMPO_BUSQUEDA = '#search-article-search-modal-input'
const RESULTADOS = '[data-tour="vender.resultados_buscador_articulos"], [data-tour="vender.busqueda_sin_resultados"]'
const TUTORIALES = '[data-nav-tutoriales]'

const GUIONES = {
	crear_ticket: [
		{ ancla: 'soporte.abrir', avanza: 'aparece', foco: false, texto: 'Tocá Agentes para abrir Soporte.' },
		{ ancla: 'soporte.conversacion', foco: false, texto: 'Acá podés iniciar una consulta o seguir una conversación desde el historial.' },
		{ ancla: 'soporte.escribir', texto: 'Escribí tu consulta y tocá Enviar. Si todavía no hay un ticket abierto, el primer mensaje lo crea.' },
	],
	buscar_articulo_nombre: [
		{ selector: '#search-article', ruta: VENDER, antes: 'abrir_buscador_articulos', avanza: 'aparece', foco: false, texto: 'Abrí el buscador de artículos en Vender.' },
		{ selector: CAMPO_BUSQUEDA, ruta: VENDER, avanza: 'aparece', texto: 'Escribí parte del nombre del artículo y presioná Enter para buscarlo.' },
		{ selector: RESULTADOS, ruta: VENDER, foco: false, texto: 'Revisá los resultados. Si no encontraste el artículo, probá con otro nombre cuando termines la guía.' },
	],
	buscar_articulo_codigo: [
		{ ancla: 'vender.campo_codigo_barras', ruta: VENDER, antes: 'abrir_codigo_de_barras', avanza: 'enter', texto: 'Escaneá el código o escribilo y presioná Enter. Si hay una coincidencia, el artículo se agrega a la venta en curso.' },
	],
	centro_recursos: [
		{ selector: TUTORIALES, foco: false, texto: 'Desde Tutoriales podés acceder a los videos que explican cómo usar el sistema.' },
		{ selector: TUTORIALES, avanza: 'clic', foco: false, texto: 'Tocá Tutoriales para abrir el Centro de Recursos en otra pestaña. Ahí buscá por el nombre de la tarea que querés aprender.' },
	],
	[TEMA_REVERTIR_IMPORTACION]: [
		{ selector: '#dropdown_article .dropdown-toggle-split', ruta: LISTADO, avanza: 'clic', foco: false, texto: 'En Listado, tocá la flechita de Crear para abrir el menú.' },
		{ ancla: 'listado.opcion_historial_importaciones', ruta: LISTADO, antes: 'abrir_menu_importacion', avanza: 'clic', foco: false, texto: 'Tocá Historial de importaciones dentro de Importación.' },
		{ ruta: LISTADO, antes: 'buscar_importacion', avanza: 'clic', foco: false, texto: 'Este es el botón de la importación que consultaste. Si lo tocás, revisá los datos en la ventana de confirmación.' },
	],
}

export function tema_de_soporte_conocido(tema) {
	return tema === TEMA_GUIA_DINAMICA || Object.prototype.hasOwnProperty.call(GUIONES, tema)
}

export function pasos_de_soporte(guia, soporte_abierto) {
	if (!guia || !tema_de_soporte_conocido(guia.tema)) return []
	if (guia.tema === TEMA_GUIA_DINAMICA) return pasos_dinamicos(guia.pasos, soporte_abierto)

	const pasos = GUIONES[guia.tema].map(function (paso, i) {
		const texto = Array.isArray(guia.textos) && guia.textos[i]
		return Object.assign({}, paso, { texto: typeof texto === 'string' && texto.trim() ? texto : paso.texto })
	})
	if (guia.tema === 'crear_ticket' && soporte_abierto) {
		pasos[0] = { ancla: 'soporte.encabezado', foco: false, texto: 'Ya tenés abierto Soporte. Tocá Siguiente para ver cómo iniciar un ticket.' }
	}
	if (guia.tema === TEMA_REVERTIR_IMPORTACION) {
		const id = guia.import_history_id
		if (!Number.isSafeInteger(id) || id < 1) return []
		pasos[2].ancla = ancla_revertir_importacion(id)
		pasos[2].import_history_id = id
	}
	return pasos
}
