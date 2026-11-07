// La prueba comparte el chat, no el catálogo, los tours ni el progreso de la demo.
// Contrato estático de la tanda aprobada 20261107 (versión y huella del manifiesto).
// Admin sigue decidiendo qué está disponible. Otra tanda debe actualizar ambas validaciones;
// un despliegue parcial oculta discrepancias en vez de mostrar un recurso ajeno.
const URLS_APROBADAS = {
	'prueba:04': 'https://videos.comerciocity.store/landing-prueba/20261107/04-bienvenida-y-recorrido-v8-904bf6fb63ed71ec.mp4',
	'prueba:05': 'https://videos.comerciocity.store/landing-prueba/20261107/05-importa-tu-catalogo-v4-5c3ff8667f590302.mp4',
	'prueba:06': 'https://videos.comerciocity.store/landing-prueba/20261107/06-revisa-y-cambia-un-precio-v4-0f33edc6012184fc.mp4',
	'prueba:07': 'https://videos.comerciocity.store/landing-prueba/20261107/07-carga-una-compra-con-una-foto-v4-b7ab810b35ab2a1d.mp4',
	'prueba:08': 'https://videos.comerciocity.store/landing-prueba/20261107/08-hace-tu-primera-venta-v4-6bf28a33ad57bee8.mp4',
	'prueba:09': 'https://videos.comerciocity.store/landing-prueba/20261107/09-proba-al-agente-con-tu-catalogo-v4-afa99edf54562d4f.mp4',
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
