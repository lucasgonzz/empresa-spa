<script>
import { HorizontalBar } from 'vue-chartjs'
import font_control from '@/mixins/reportes/font_control'
import chart_theme from '@/mixins/reportes/chart_theme'

export default {
	extends: HorizontalBar,
	// No usa chart_datalabels (tarea 03): la barra es delgada y las etiquetas encima no entran,
	// los valores van en la leyenda propia del wrapper (Index.vue).
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
			if (this.loading || !this.model || !(this.model.ventas_netas > 0)) {
				return
			}

			/**
			 * Los segmentos son exactamente los 5 componentes de la identidad verificada en
			 * EstadoResultadosHelper (empresa-api):
			 *   ventas_netas = costo_neto_mercaderia + gastos_operativos + comisiones_de_cobro
			 *                  + iibb_determinado + resultado_neto
			 * Por eso no hay "otros": si los cinco suman, la barra cierra exacto contra las
			 * ventas netas, sin residuo.
			 */
			let costo_neto_mercaderia = this.model.costo_mercaderia_vendida - (this.model.costo_mercaderia_devuelta || 0)
			let iibb = this.model.iibb_determinado === null ? 0 : this.model.iibb_determinado
			let resultado_neto = this.model.resultado_neto

			let candidatos = [
				{label: 'Mercadería', valor: costo_neto_mercaderia, color: '#64748B'},
				{label: 'Gastos', valor: this.model.gastos_operativos, color: '#94A3B8'},
				{label: 'Comisiones', valor: this.model.comisiones_de_cobro, color: '#CBD5E1'},
				{label: 'IIBB', valor: iibb, color: '#A5B4FC'},
			]

			let datasets = []

			// Un segmento en 0 o negativo no se agrega: un dataset de ancho cero mete una
			// entrada fantasma en el tooltip.
			candidatos.filter(candidato => candidato.valor > 0).forEach(candidato => {
				datasets.push(this.dataset_segmento(candidato.label, candidato.valor, candidato.color))
			})

			/**
			 * Caso de perdida: si resultado_neto <= 0 este segmento no se dibuja. No hay forma
			 * de representar un tramo negativo apilado junto a los positivos sin que la barra
			 * mienta sobre la proporcion; la perdida se comunica en palabras desde el wrapper
			 * (Index.vue), el grafico no intenta dibujar un tramo negativo.
			 */
			if (resultado_neto > 0) {
				datasets.push(this.dataset_segmento('Resultado', resultado_neto, '#10B981'))
			}

			let that = this
			let ventas_netas = this.model.ventas_netas
			let options = this.get_reportes_bar_chart_options()

			options.legend = {display: false}
			options.scales = {
				xAxes: [{
					stacked: true,
					display: false,
					gridLines: {display: false, drawBorder: false},
				}],
				yAxes: [{
					stacked: true,
					display: false,
					gridLines: {display: false, drawBorder: false},
				}],
			}
			options.tooltips.callbacks = {
				label: function(tooltip_item, data) {
					let dataset = data.datasets[tooltip_item.datasetIndex]
					let valor = dataset.data[0]
					let porcentaje = Math.round(Math.abs(valor) / ventas_netas * 1000) / 10

					return dataset.label + ': ' + that.price(valor, false, false) + ' (' + porcentaje + '%)'
				},
			}

			this.renderChart({
				labels: [''],
				datasets: datasets,
			}, options)
		},
		/* Arma el dataset de un solo dato (una sola categoria, la barra apilada) para un segmento */
		dataset_segmento(label, valor, color) {
			return {
				label: label,
				data: [valor],
				backgroundColor: color,
				barPercentage: 1,
				categoryPercentage: 1,
			}
		},
	},
}
</script>
