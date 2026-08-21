<script>
import { Doughnut } from 'vue-chartjs'
import font_control from '@/mixins/reportes/font_control'
import chart_theme from '@/mixins/reportes/chart_theme'

// Si hay mas de 8 categorias se agrupan las mas chicas en un gajo "Otros" (tarea 04): un
// anillo de mas de 8 gajos no se lee. El mismo corte se usa en la leyenda de Index.vue.
const MAX_CATEGORIAS = 8

export default {
	extends: Doughnut,
	// Sin chart_datalabels (tarea 04): las etiquetas adentro de un anillo chico quedan
	// ilegibles, los valores van en la leyenda propia del wrapper (Index.vue).
	mixins: [font_control, chart_theme],
	computed: {
		model() {
			return this.$store.state.reportes.estado_resultados
		},
		loading() {
			return this.$store.state.reportes.estado_resultados_loading
		},
	},
	watch: {
		model() {
			this.setChart()
		},
		loading() {
			this.setChart()
		},
	},
	mounted() {
		this.setChart()
	},
	methods: {
		setChart() {
			let categorias = this.categorias_agrupadas()

			if (this.loading || !categorias.length) {
				return
			}

			let labels = []
			let data = []

			categorias.forEach(categoria => {
				labels.push(categoria.concepto)
				data.push(categoria.total)
			})

			let colores = this.get_chart_colors(categorias.length)
			let that = this
			let total_gastos = this.model.gastos_operativos

			this.renderChart({
				labels: labels,
				datasets: [{
					data: data,
					backgroundColor: colores,
					borderWidth: 2,
					borderColor: '#fff',
				}],
			}, {
				maintainAspectRatio: false,
				responsive: true,
				cutoutPercentage: 68,
				legend: {display: false},
				tooltips: {
					backgroundColor: '#1E293B',
					titleFontFamily: this.chart_font_family,
					bodyFontFamily: this.chart_font_family,
					titleFontColor: '#F8FAFC',
					bodyFontColor: '#E2E8F0',
					cornerRadius: 8,
					xPadding: 12,
					yPadding: 10,
					caretSize: 6,
					callbacks: {
						label: function(tooltip_item, data) {
							let nombre = data.labels[tooltip_item.index]
							let valor = data.datasets[tooltip_item.datasetIndex].data[tooltip_item.index]
							// Porcentaje sobre el total de gastos operativos, no sobre ventas netas
							// (a diferencia del porcentaje de la cascada y de la barra de composicion).
							let porcentaje = (Math.round(Math.abs(valor) / total_gastos * 1000) / 10).toFixed(1)

							// Adentro del callback no vale `this`: el porcentaje se formatea con
							// el `that` que ya se captura arriba (mision del 21/8/2026 — separadores).
							return nombre + ': ' + that.price(valor, false, false) + ' (' + that.porcentaje_es(porcentaje) + '%)'
						},
					},
				},
			})
		},
		/**
		 * Categorias con gasto ordenadas de mayor a menor, agrupando desde la posicion 8
		 * en adelante en un gajo "Otros" con la suma. Mismo criterio que la leyenda de
		 * Index.vue (mismo MAX_CATEGORIAS, mismo orden), para que grafico y leyenda listen
		 * exactamente los mismos gajos.
		 *
		 * @returns {Array}
		 */
		categorias_agrupadas() {
			if (!this.model || !this.model.gastos_por_categoria) {
				return []
			}

			let categorias = this.model.gastos_por_categoria.filter(categoria => categoria.total > 0)

			categorias.sort((a, b) => b.total - a.total)

			if (categorias.length <= MAX_CATEGORIAS) {
				return categorias
			}

			let principales = categorias.slice(0, MAX_CATEGORIAS - 1)
			let resto = categorias.slice(MAX_CATEGORIAS - 1)
			let total_otros = 0

			resto.forEach(categoria => {
				total_otros += categoria.total
			})

			principales.push({expense_concept_id: 'otros', concepto: 'Otros', total: total_otros})

			return principales
		},
	},
}
</script>
