<script>
import { Doughnut } from 'vue-chartjs'
// Mismo bootstrap que usan los graficos de reportes: desregistra el plugin datalabels del
// registro GLOBAL de Chart.js. El paquete se auto-registra al importarse, y como los chunks
// de este proyecto cargan bajo demanda, sin este import el orden decide si aparecen etiquetas
// encima de las donas o no. Con el import el resultado es el mismo siempre: no aparecen.
import '@/plugins/chart_datalabels'

/**
 * Dona de una sola proporcion, para los porcentajes del reporte de inventario
 * (mision 31, 11/8/2026).
 *
 * Reemplaza a CircleProgress.vue en ESTE modal --que sigue existiendo intacto porque lo usan
 * import-status/Index.vue y offline-sync-articles/Progress.vue-- con la libreria que el sistema
 * ya tiene: chart.js 2 via vue-chartjs, la misma de los graficos de reportes. No se instalo
 * ningun paquete nuevo.
 *
 * El numero del centro NO se dibuja en el canvas: lo pone el componente que usa esta dona, con
 * HTML posicionado encima. Asi el porcentaje sale con la tipografia y los tokens de color del
 * sistema, se lee con el lector de pantalla, y no hay que mantener un plugin de texto centrado.
 */
export default {
	extends: Doughnut,
	props: {
		/**
		 * Porcion pintada, de 0 a 100.
		 */
		porcentaje: {
			type: Number,
			required: true,
		},
		/**
		 * Token de color del sistema con el que se pinta la porcion (ej: '--color-primary').
		 * Se resuelve en tiempo de ejecucion contra :root, que es lo que hace que la dona
		 * acompane al tema oscuro: un canvas no entiende var(--...), asi que el valor se lee
		 * cuando se dibuja.
		 */
		token_color: {
			type: String,
			default: '--color-primary',
		},
	},
	computed: {
		/**
		 * Preferencia de modo oscuro del usuario, que es la fuente de verdad del tema: llega en
		 * `GET api/user` y App.vue es quien pone o saca la clase `dark-mode` en <html> (ver
		 * utils/dark_mode.js). Se observa para poder REDIBUJAR: el canvas guarda los colores
		 * con los que se pinto, asi que a diferencia del resto del modal --que es CSS con
		 * var() y se actualiza solo-- un grafico se queda con la paleta del tema anterior.
		 *
		 * @returns {Boolean}
		 */
		tema_oscuro() {
			let user = this.$store.state.auth.user
			return !!(user && user.dark_mode)
		},
	},
	watch: {
		porcentaje() {
			this.dibujar()
		},
		/**
		 * 🔴 Sin esto, cambiar de tema con el modal ABIERTO dejaba la dona pintada con los
		 * colores viejos, y no se arreglaba cerrando y volviendo a abrir: el b-modal no lleva
		 * `lazy`, asi que su contenido no se vuelve a montar y `mounted()` no corre de nuevo.
		 *
		 * Va en $nextTick porque el orden entre este watcher y el de App.vue --que es el que
		 * efectivamente pone la clase en <html>-- no esta garantizado: sin esperar al tick se
		 * podrian volver a leer los tokens del tema que se esta abandonando.
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
		 * Lee un token de color de :root. Devuelve el valor tal cual esta declarado, que es lo
		 * que Chart.js necesita (un color CSS valido, no una var()).
		 *
		 * @param {String} token nombre del token, con sus dos guiones
		 * @returns {String}
		 */
		leerToken(token) {
			return getComputedStyle(document.documentElement).getPropertyValue(token).trim()
		},
		/**
		 * Dibuja la dona. Acota el porcentaje a 0-100 antes de repartir: el reporte lo calcula
		 * el backend y no deberia salirse, pero un 101 dejaria un resto negativo y chart.js
		 * dibujaria una dona incompleta sin avisar.
		 *
		 * @returns {void}
		 */
		dibujar() {
			let valor = Number(this.porcentaje)

			if (isNaN(valor)) {
				valor = 0
			}
			if (valor < 0) {
				valor = 0
			}
			if (valor > 100) {
				valor = 100
			}

			this.renderChart({
				labels: ['', ''],
				datasets: [{
					data: [valor, 100 - valor],
					backgroundColor: [
						this.leerToken(this.token_color),
						this.leerToken('--color-border-secondary'),
					],
					borderWidth: 0,
				}],
			}, {
				maintainAspectRatio: false,
				responsive: true,
				// Anillo fino: adentro va el numero, que es lo que se lee de verdad.
				cutoutPercentage: 76,
				legend: { display: false },
				// Sin tooltip: no hay nada que agregar al numero que ya esta en el centro, y un
				// tooltip sobre la mitad gris diria "0%" de algo que no es una categoria.
				tooltips: { enabled: false },
				// Sin animacion de entrada (pedido explicito de la mision): un panel que se anima
				// cada vez que se abre cansa a la segunda vez.
				animation: { duration: 0 },
				hover: { mode: null },
			})
		},
	},
}
</script>
