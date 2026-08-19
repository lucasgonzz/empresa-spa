<script>
import { HorizontalBar } from 'vue-chartjs'
// Ver la nota del import en GraficoDona.vue: desregistra el plugin datalabels del registro global.
import '@/plugins/chart_datalabels'

/**
 * Barra horizontal apilada con el reparto del inventario entre "sin stock", "en stock minimo" y
 * el resto (mision 31, 11/8/2026).
 *
 * Por que una barra y no una tercera dona: son tres partes de un mismo total y lo que interesa es
 * comparar sus tamanos entre si, no leer un porcentaje. Una barra apilada de ancho completo hace
 * eso mejor que un anillo, y ademas ocupa mucho menos alto, que es la otra cosa que pedia la
 * mision (que el modal entre sin scroll).
 *
 * Los tres colores salen de tokens que YA existen en el sistema y que tienen contraparte oscura:
 * el rojo de "cerrar caja", el ambar del estado de seleccion de la barra y el verde de "caja
 * abierta". No se inventa una paleta nueva ni se escribe un hexadecimal.
 */
export default {
	extends: HorizontalBar,
	props: {
		/**
		 * Articulos sin stock.
		 */
		sin_stock: {
			type: Number,
			default: 0,
		},
		/**
		 * Articulos en stock minimo.
		 */
		stock_minimo: {
			type: Number,
			default: 0,
		},
		/**
		 * Total de articulos del inventario, para poder despejar el resto.
		 */
		total: {
			type: Number,
			default: 0,
		},
	},
	computed: {
		/**
		 * Preferencia de modo oscuro del usuario. Misma razon y mismo mecanismo que en
		 * GraficoDona.vue: el canvas conserva los colores con los que se pinto y hay que
		 * redibujarlo, porque el resto del modal se actualiza solo por CSS y el grafico no.
		 *
		 * @returns {Boolean}
		 */
		tema_oscuro() {
			let user = this.$store.state.auth.user
			return !!(user && user.dark_mode)
		},
	},
	watch: {
		sin_stock() {
			this.dibujar()
		},
		stock_minimo() {
			this.dibujar()
		},
		total() {
			this.dibujar()
		},
		/**
		 * Ver la nota larga del mismo watcher en GraficoDona.vue: el $nextTick es para que la
		 * clase `dark-mode` ya este puesta en <html> cuando se vuelvan a leer los tokens.
		 */
		tema_oscuro() {
			this.$nextTick(() => {
				this.dibujar()
			})
		},
	},
	mounted() {
		this.dibujar()
	},
	methods: {
		/**
		 * Lee un token de color de :root (ver la nota de GraficoDona.vue).
		 *
		 * @param {String} token
		 * @returns {String}
		 */
		leerToken(token) {
			return getComputedStyle(document.documentElement).getPropertyValue(token).trim()
		},
		/**
		 * Dibuja la barra apilada.
		 *
		 * El resto se despeja restando, y se acota a cero: los tres numeros los calcula el
		 * backend por caminos distintos y nada garantiza que sin_stock + stock_minimo no supere
		 * al total. Si eso pasara, un resto negativo dibujaria la barra al reves en silencio.
		 *
		 * @returns {void}
		 */
		dibujar() {
			let sin = Number(this.sin_stock) || 0
			let minimo = Number(this.stock_minimo) || 0
			let resto = (Number(this.total) || 0) - sin - minimo

			if (resto < 0) {
				resto = 0
			}

			let that = this

			this.renderChart({
				labels: [''],
				datasets: [
					{
						label: 'Sin stock',
						data: [sin],
						backgroundColor: this.leerToken('--caja-cerrar-acento'),
						borderWidth: 0,
					},
					{
						label: 'En stock mínimo',
						data: [minimo],
						backgroundColor: this.leerToken('--toolbar-btn-seleccion'),
						borderWidth: 0,
					},
					{
						label: 'Con stock suficiente',
						data: [resto],
						backgroundColor: this.leerToken('--caja-abierta-acento'),
						borderWidth: 0,
					},
				],
			}, {
				maintainAspectRatio: false,
				responsive: true,
				legend: { display: false },
				animation: { duration: 0 },
				scales: {
					xAxes: [{
						stacked: true,
						display: false,
						gridLines: { display: false, drawBorder: false },
					}],
					yAxes: [{
						stacked: true,
						display: false,
						gridLines: { display: false, drawBorder: false },
						barPercentage: 1,
						categoryPercentage: 1,
					}],
				},
				tooltips: {
					// El tooltip tambien sale de tokens, y son estos dos INVERTIDOS a proposito: el
					// fondo toma el color del texto y el texto el de la tarjeta. Asi el par se da
					// vuelta solo al cambiar de tema --en claro queda oscuro con letra blanca, en
					// oscuro claro con letra oscura-- y en los dos casos contrasta. Un tooltip con
					// el fondo oscuro fijo y la letra en blanco fijo es justo el rincon donde el
					// modo oscuro de un grafico se rompe sin que nadie lo mire.
					backgroundColor: this.leerToken('--color-text-primary'),
					titleFontColor: this.leerToken('--bg-card'),
					bodyFontColor: this.leerToken('--bg-card'),
					cornerRadius: 8,
					xPadding: 12,
					yPadding: 10,
					displayColors: true,
					callbacks: {
						title: function() {
							return ''
						},
						label: function(tooltip_item, data) {
							let nombre = data.datasets[tooltip_item.datasetIndex].label
							let valor = data.datasets[tooltip_item.datasetIndex].data[tooltip_item.index]
							return nombre + ': ' + valor + ' ' + that.etiquetaArticulos(valor)
						},
					},
				},
			})
		},
		/**
		 * Singular o plural de "articulo", para que el tooltip no diga "1 articulos".
		 *
		 * @param {Number} cantidad
		 * @returns {String}
		 */
		etiquetaArticulos(cantidad) {
			if (Number(cantidad) === 1) {
				return 'artículo'
			}
			return 'artículos'
		},
	},
}
</script>
