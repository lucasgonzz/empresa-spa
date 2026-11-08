const VENDER = { name: 'vender', params: { view: 'remito' } }
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
}

export function tema_de_soporte_conocido(tema) {
	return Object.prototype.hasOwnProperty.call(GUIONES, tema)
}

export function pasos_de_soporte(guia, soporte_abierto) {
	if (!guia || !tema_de_soporte_conocido(guia.tema)) return []

	const pasos = GUIONES[guia.tema].map(function (paso, i) {
		const texto = Array.isArray(guia.textos) && guia.textos[i]
		return Object.assign({}, paso, { texto: typeof texto === 'string' && texto.trim() ? texto : paso.texto })
	})
	if (guia.tema === 'crear_ticket' && soporte_abierto) {
		pasos[0] = { ancla: 'soporte.encabezado', foco: false, texto: 'Ya tenés abierto Soporte. Tocá Siguiente para ver cómo iniciar un ticket.' }
	}
	return pasos
}
