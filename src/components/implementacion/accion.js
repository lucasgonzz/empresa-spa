export function destino_de_accion(accion) {
	if (!accion) {
		return null
	}
	if (accion.tipo === 'imagenes') {
		return {
			texto: 'Revisar las imágenes',
			ruta: {
				name: 'alertas',
				params: { view: 'catalogo', sub_view: 'imagenes' },
				query: accion.lote_id ? { asignacion: String(accion.lote_id) } : {},
			},
		}
	}
	if (accion.tipo === 'agente') {
		return { texto: 'Probar el agente de WhatsApp', ruta: { name: 'whatsapp', query: { probar_agente: '1' } } }
	}
	return null
}
