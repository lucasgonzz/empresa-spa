<script>
import { Bar } from 'vue-chartjs'
import font_control from '@/mixins/reportes/font_control'
import chart_theme from '@/mixins/reportes/chart_theme'
import chart_datalabels from '@/mixins/reportes/chart_datalabels'

export default {
	extends: Bar,
	mixins: [font_control, chart_theme, chart_datalabels],
	computed: {
		metodos_de_pago() {
			return this.$store.state.reportes.model.ingresos_mostrador
		},
		loading() {
			return this.$store.state.reportes.loading
		},
	},
	watch: {
		gastos_por_mes() {
			this.setChart()
		},
		loading() {
			this.setChart()
		},
	},
	data() {
		return {
			per_page: 10,
		}
	},
	mounted() {
		this.setChart()
	},
	methods: {
		setChart() {
			if (typeof this.metodos_de_pago == 'undefined' || !this.metodos_de_pago) {
				return
			}

			let labels = []
			let data = []

			this.metodos_de_pago.forEach(metodo_de_pago => {
				labels.push(metodo_de_pago.name)
				data.push(metodo_de_pago.pivot.amount)
			})

			let bar_style = this.get_reportes_bar_dataset_style(data.length, true)
			let datasets = [{
				label: 'Importe',
				data: data,
				...bar_style,
			}]

			let that = this

			this.renderChart({
				labels: labels,
				datasets: datasets,
			}, this.get_reportes_bar_chart_options({
				plugins: {
					datalabels: this.get_reportes_datalabels_options(that, {
						align: 'end',
						anchor: 'end',
						offset: 4,
					}),
				},
				tooltips: {
					callbacks: this.get_reportes_price_tooltip_callbacks(that),
				},
			}))
		},
	},
}
</script>
