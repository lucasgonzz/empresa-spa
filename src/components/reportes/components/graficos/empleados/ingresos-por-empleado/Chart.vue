<script>
import { Bar } from 'vue-chartjs'
import font_control from '@/mixins/reportes/font_control'
import chart_theme from '@/mixins/reportes/chart_theme'
import chart_datalabels from '@/mixins/reportes/chart_datalabels'

export default {
	extends: Bar,
	mixins: [font_control, chart_theme, chart_datalabels],
	props: {
		user_prop: Object,
	},
	computed: {
		payment_methods() {
			return this.$store.state.current_acount_payment_method.models
		},
		loading() {
			return this.$store.state.reportes.loading
		},
	},
	watch: {
		meses_anteriores() {
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
			let labels = []
			let total_ingresado = []
			let total_vendido = []
			let payment_methods_labes = []

			this.payment_methods.forEach(payment_method => {
				payment_methods_labes[payment_method.id] = {
					payment_method: payment_method,
					data: [],
				}
			})

			labels.push(this.user_prop.user.name)
			total_ingresado.push(this.user_prop.total_ingresado)
			total_vendido.push(this.user_prop.total_vendido)

			let amount

			this.user_prop.payment_methods.forEach(payment_method => {
				if (typeof payment_method.total != 'undefined') {
					amount = payment_method.total
				} else {
					amount = payment_method.pivot.amount
				}

				payment_methods_labes[payment_method.id].data.push(amount)
			})

			let datasets = [
				{
					label: 'Total vendido',
					data: total_vendido,
					backgroundColor: '#10B981',
					hoverBackgroundColor: '#059669',
					borderWidth: 0,
					barPercentage: 0.68,
					categoryPercentage: 0.82,
				},
				{
					label: 'Total ingresos',
					data: total_ingresado,
					...this.get_reportes_bar_dataset_style(1, false),
				},
			]

			let index = 0
			payment_methods_labes.forEach(payment_method => {
				let series_color = this.get_chart_color(index)

				datasets.push({
					label: payment_method.payment_method.name,
					backgroundColor: series_color,
					hoverBackgroundColor: series_color,
					borderWidth: 0,
					barPercentage: 0.68,
					categoryPercentage: 0.82,
					data: payment_method.data,
				})

				index++
			})

			let that = this

			this.renderChart({
				labels: labels,
				datasets: datasets,
			}, this.get_reportes_bar_chart_options({
				plugins: {
					datalabels: this.get_reportes_datalabels_options(that, {
						align: 'end',
						anchor: 'end',
						offset: 2,
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
