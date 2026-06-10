<script>
import { Bar } from 'vue-chartjs'
import chart from '@/mixins/chart'
import font_control from '@/mixins/reportes/font_control'
import chart_theme from '@/mixins/reportes/chart_theme'
import chart_datalabels from '@/mixins/reportes/chart_datalabels'

export default {
	extends: Bar,
	mixins: [chart, font_control, chart_theme, chart_datalabels],
	computed: {
		clients() {
			return this.$store.state.client.models
		},
		current_page() {
			return this.$store.state.chart.client.current_page
		},
		order_by() {
			return this.$store.state.chart.client.order_by
		},
	},
	data() {
		return {
			per_page: 10,
		}
	},
	watch: {
		current_page() {
			this.setChart()
		},
		order_by() {
			this.setChart()
		},
	},
	mounted() {
		this.setChart()
	},
	methods: {
		setChart() {
			let labels = []
			let data = []

			let clients = this.get_chart_models_ordenados('client', this.clients, 'saldo')

			clients.forEach(client => {
				labels.push(client.name)
				data.push(client.saldo)
			})

			let bar_style = this.get_reportes_bar_dataset_style(data.length, true)
			let datasets = [{
				label: 'Deuda',
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
