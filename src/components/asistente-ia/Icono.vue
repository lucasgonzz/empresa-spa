<script>
/**
 * Íconos de la ventana del agente personal (misión agente-mejoras-uso-real, 29/10/2026): los MISMOS
 * dibujos de ia-spa (ia-spa/src/components/iconos/Icono.vue, trazo de 1,8 px sobre 24×24, estilo
 * de línea como los de ChatGPT), pasados a Vue 2, más los pulgares de la valoración.
 *
 * Los pulgares son el trazo de «thumbs-up» / «thumbs-down» de Lucide (licencia ISC), con el mismo
 * grosor que el resto. Con `relleno` el contorno de la mano se pinta lleno: es como ChatGPT marca
 * la valoración elegida.
 *
 * 🔴 SIN `v-html`, A DIFERENCIA DE ia-spa. Allá el SVG sale de un string; acá se arma nodo por nodo
 * con una función de render a partir de un mapa de elementos. El resultado en pantalla es el mismo,
 * y este módulo sostiene "cero v-html" (D43: la conversación es texto plano, ver menciones.js y
 * formato.js): un `v-html` en el medio, aunque sea con un string fijo, sería la excepción que el
 * próximo copia para otra cosa.
 *
 * Son decorativos por defecto (aria-hidden): el botón que los contiene lleva el aria-label. Con
 * `titulo` pasan a ser una imagen con nombre (role="img").
 */

/**
 * Los atributos de trazo que comparten todos los íconos de línea (los de ia-spa).
 */
const TRAZO = {
	fill: 'none',
	stroke: 'currentColor',
	'stroke-width': '1.8',
	'stroke-linecap': 'round',
	'stroke-linejoin': 'round',
}

/**
 * El mapa de íconos: cada uno es la lista de elementos SVG que lo dibujan, como
 * [etiqueta, atributos]. `trazo: false` es un ícono lleno (sin los atributos de TRAZO en el
 * grupo); `ancho` cambia el grosor del trazo de ese ícono (enviar y el tilde, como en ia-spa).
 * Un elemento con `relleno: true` se pinta lleno cuando el componente recibe la prop `relleno`.
 *
 * El contenido sale de este mapa, nunca de datos del servidor.
 */
const ICONOS = {
	nuevo: {
		elementos: [
			['path', { d: 'M12 4H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-5' }],
			['path', { d: 'M17.6 3.6a2 2 0 0 1 2.8 2.8L13 13.8 9.5 14.5l.7-3.5z' }],
		],
	},
	menu: {
		elementos: [
			['path', { d: 'M4 7h16M4 12h16M4 17h10' }],
		],
	},
	cerrar: {
		elementos: [
			['path', { d: 'M6 6l12 12M18 6 6 18' }],
		],
	},
	engranaje: {
		elementos: [
			['circle', { cx: '12', cy: '12', r: '3' }],
			['path', { d: 'M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z' }],
		],
	},
	enviar: {
		ancho: '2.2',
		elementos: [
			['path', { d: 'M12 19V5M6 11l6-6 6 6' }],
		],
	},
	detener: {
		trazo: false,
		elementos: [
			['rect', { x: '7', y: '7', width: '10', height: '10', rx: '2', fill: 'currentColor' }],
		],
	},
	flecha_abajo: {
		elementos: [
			['path', { d: 'M12 5v14M6 13l6 6 6-6' }],
		],
	},
	copiar: {
		elementos: [
			['rect', { x: '8.5', y: '8.5', width: '11.5', height: '11.5', rx: '2.5' }],
			['path', { d: 'M15.5 8.5V6a2.5 2.5 0 0 0-2.5-2.5H6A2.5 2.5 0 0 0 3.5 6v7A2.5 2.5 0 0 0 6 15.5h2.5' }],
		],
	},
	check: {
		ancho: '2',
		elementos: [
			['path', { d: 'm5 12.5 4.5 4.5L19 7.5' }],
		],
	},
	borrar: {
		elementos: [
			['path', { d: 'M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3' }],
		],
	},
	whatsapp: {
		trazo: false,
		elementos: [
			['path', { fill: 'currentColor', d: 'M12 2.2a9.7 9.7 0 0 0-8.3 14.8L2.4 21.6l4.7-1.2A9.8 9.8 0 1 0 12 2.2zm0 17.8a8 8 0 0 1-4.1-1.1l-.3-.2-2.8.7.8-2.7-.2-.3A8 8 0 1 1 12 20zm4.4-6c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.5.1l-.8.9c-.1.2-.3.2-.5.1a6.6 6.6 0 0 1-3.3-2.9c-.2-.4.3-.4.8-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 0 0-.7.3 2.8 2.8 0 0 0-.9 2.1 5 5 0 0 0 1 2.6 11.2 11.2 0 0 0 4.3 3.8c1.6.7 2.2.7 3 .6a2.6 2.6 0 0 0 1.7-1.2 2.1 2.1 0 0 0 .2-1.2c-.1-.2-.3-.2-.5-.3z' }],
		],
	},
	info: {
		elementos: [
			['circle', { cx: '12', cy: '12', r: '8.5' }],
			['path', { d: 'M12 11v5.5M12 7.8v.2' }],
		],
	},
	alerta: {
		elementos: [
			['circle', { cx: '12', cy: '12', r: '8.5' }],
			['path', { d: 'M12 7.5v5.5M12 16.3v.2' }],
		],
	},
	reloj: {
		elementos: [
			['path', { d: 'M3.5 12a8.5 8.5 0 1 0 2.5-6' }],
			['path', { d: 'M3.5 4.5V8H7M12 7.5V12l3 2' }],
		],
	},
	externo: {
		elementos: [
			['path', { d: 'M14 4h6v6M20 4l-9 9M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4' }],
		],
	},
	estrellas: {
		elementos: [
			['path', { d: 'M10 3.5 11.6 8 16 9.5l-4.4 1.6L10 15.5l-1.6-4.4L4 9.5 8.4 8z' }],
			['path', { d: 'M17.5 13.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z' }],
		],
	},
	grafico: {
		elementos: [
			['path', { d: 'M4 20V4M4 20h16' }],
			['rect', { x: '7.5', y: '12', width: '3', height: '5', rx: '.6' }],
			['rect', { x: '12.5', y: '8', width: '3', height: '9', rx: '.6' }],
			['rect', { x: '17.5', y: '5', width: '2.5', height: '12', rx: '.6' }],
		],
	},
	caja: {
		elementos: [
			['path', { d: 'M3.5 7.5 12 3.5l8.5 4v9L12 20.5l-8.5-4z' }],
			['path', { d: 'M3.5 7.5 12 11.5l8.5-4M12 11.5v9' }],
		],
	},
	billetera: {
		elementos: [
			['path', { d: 'M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3' }],
			['rect', { x: '4', y: '8', width: '16.5', height: '11', rx: '2.5' }],
			['circle', { cx: '16.3', cy: '13.5', r: '1.2', fill: 'currentColor' }],
		],
	},
	carrito: {
		elementos: [
			['path', { d: 'M3 4h2l2.2 10.5a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.1L20.5 8H6.2' }],
			['circle', { cx: '9.5', cy: '19.5', r: '1.3' }],
			['circle', { cx: '17', cy: '19.5', r: '1.3' }],
		],
	},
	// Pulgar arriba y pulgar abajo (Lucide, ISC). El contorno de la mano es el elemento que se
	// rellena con `relleno`; la raya del puño queda como trazo.
	pulgar_arriba: {
		elementos: [
			['path', { d: 'M7 10v12' }],
			['path', { relleno: true, d: 'M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z' }],
		],
	},
	pulgar_abajo: {
		elementos: [
			['path', { d: 'M17 14V2' }],
			['path', { relleno: true, d: 'M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z' }],
		],
	},
}

export default {
	props: {
		/**
		 * La clave del ícono en ICONOS. Uno que no existe cae en `info`, para que un nombre mal
		 * escrito se vea (un círculo con una i) en vez de dejar un hueco mudo.
		 */
		nombre: {
			type: String,
			required: true,
		},
		/**
		 * Lado en px (los íconos son cuadrados).
		 */
		tamano: {
			type: [Number, String],
			default: 20,
		},
		/**
		 * Texto para el lector de pantalla. Vacío = decorativo (aria-hidden).
		 */
		titulo: {
			type: String,
			default: '',
		},
		/**
		 * true pinta lleno el elemento marcado como rellenable (hoy, la mano de los pulgares de la
		 * valoración: es la valoración elegida).
		 */
		relleno: {
			type: Boolean,
			default: false,
		},
	},
	/**
	 * Arma el <svg> nodo por nodo a partir de ICONOS (ver el docblock de arriba: sin v-html).
	 *
	 * @param {Function} h createElement de Vue 2.
	 * @returns {VNode}
	 */
	render(h) {
		let self = this
		let icono = ICONOS[this.nombre] || ICONOS.info
		let hijos = []
		icono.elementos.forEach(function (elemento) {
			let atributos = Object.assign({}, elemento[1])
			let rellenable = Boolean(atributos.relleno)
			delete atributos.relleno
			if (rellenable && self.relleno) {
				atributos.fill = 'currentColor'
			}
			hijos.push(h(elemento[0], { attrs: atributos }))
		})

		let atributos_del_grupo = {}
		if (icono.trazo !== false) {
			atributos_del_grupo = Object.assign({}, TRAZO)
			if (icono.ancho) {
				atributos_del_grupo['stroke-width'] = icono.ancho
			}
		}

		let atributos_del_svg = {
			width: this.tamano,
			height: this.tamano,
			viewBox: '0 0 24 24',
			xmlns: 'http://www.w3.org/2000/svg',
			focusable: 'false',
		}
		if (this.titulo) {
			atributos_del_svg.role = 'img'
			atributos_del_svg['aria-label'] = this.titulo
		} else {
			atributos_del_svg['aria-hidden'] = 'true'
		}

		return h('svg', {
			class: 'asistente-ia-icono',
			attrs: atributos_del_svg,
		}, [
			h('g', { attrs: atributos_del_grupo }, hijos),
		])
	},
}
</script>

<style lang="sass">
// Como en ia-spa: bloque y sin achicarse adentro de un flex, así el botón que lo aloja lo centra
// sin depender del interlineado del texto de al lado.
.asistente-ia-icono
	display: block
	flex: 0 0 auto
</style>
