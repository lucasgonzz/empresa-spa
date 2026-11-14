// La prueba comparte el chat, no el catálogo, los tours ni el progreso de la demo.
// Contrato estático de la tanda aprobada 20261111 (versión y huella del manifiesto).
// Admin sigue decidiendo qué está disponible. Otra tanda debe actualizar ambas validaciones;
// un despliegue parcial oculta discrepancias en vez de mostrar un recurso ajeno.
const URLS_APROBADAS = {
	'prueba:04': 'https://videos.comerciocity.store/landing-prueba/20261111/04-bienvenida-y-recorrido-claude-v2-d77600fcb3c9f595.mp4',
	'prueba:05': 'https://videos.comerciocity.store/landing-prueba/20261111/05-importa-tu-catalogo-claude-v1-7e315f5c9f377c3c.mp4',
	'prueba:06': 'https://videos.comerciocity.store/landing-prueba/20261111/06-revisa-y-cambia-un-precio-claude-v1-53fdff8d1ebbabba.mp4',
	'prueba:07': 'https://videos.comerciocity.store/landing-prueba/20261111/07-carga-una-compra-con-una-foto-claude-v1-35e86755dfa2c7e2.mp4',
	'prueba:08': 'https://videos.comerciocity.store/landing-prueba/20261111/08-hace-tu-primera-venta-claude-v1-0348d9fe2f116f4a.mp4',
	'prueba:09': 'https://videos.comerciocity.store/landing-prueba/20261111/09-proba-al-agente-con-tu-catalogo-claude-v1-81faa2a7b4e798a7.mp4',
}
const CLAVES = Object.keys(URLS_APROBADAS)

function url_publicada(video) {
	const esperada = URLS_APROBADAS[video.clave]
	return typeof video.url === 'string' && video.url.trim() === esperada ? esperada : null
}

export function catalogo_de_prueba(catalogo) {
	let aprobados = []
	if (!Array.isArray(catalogo)) return aprobados
	catalogo.forEach(function (video) {
		if (!video || video.origen !== 'prueba' || CLAVES.indexOf(video.clave) === -1 || aprobados.some(item => item.clave === video.clave)) return
		let url = url_publicada(video)
		if (!url || typeof video.titulo !== 'string' || !video.titulo.trim()) return
		// No trasladar flags, acciones ni identificadores de otro recorrido.
		aprobados.push({ clave: video.clave, origen: 'prueba', codigo: video.clave.slice(-2), titulo: video.titulo.trim(), url: url, practica: false })
	})
	return aprobados.sort((a, b) => CLAVES.indexOf(a.clave) - CLAVES.indexOf(b.clave))
}

export function adjuntos_de_prueba(mensaje, catalogo) {
	if (!mensaje || !Array.isArray(mensaje.videos)) return []
	let claves = mensaje.videos.filter(video => video && video.origen === 'prueba').map(video => video.clave)
	return catalogo_de_prueba(catalogo).filter(video => claves.indexOf(video.clave) !== -1)
}
