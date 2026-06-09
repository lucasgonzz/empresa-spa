<script>
import { Bar } from 'vue-chartjs'
import 'chartjs-plugin-datalabels'
import font_control from '@/mixins/reportes/font_control'
import chart_theme from '@/mixins/reportes/chart_theme'

export default {
	extends: Bar,
	mixins: [font_control, chart_theme],
	computed: {
		payment_methods() {
			return this.$store.state.current_acount_payment_method.models
		},
		addresses_payment_methods() {
			return this.$store.state.reportes.model.addresses_payment_methods_formated
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
		get_addresses_payment_methods() {
			if (this.can('reportes.sucursales.index.all')) {
				return this.addresses_payment_methods
			}

			if (this.can('reportes.sucursales.index.only_your')) {
				return this.addresses_payment_methods.filter(address => {
					return address.address.id == this.user.address_id
				})
			}
		},
		setChart() {
			if (typeof this.addresses_payment_methods == 'undefined') {
				return
			}

			let labels = []
			let total_vendido = []
			let payment_methods_labes = []

			this.payment_methods.forEach(payment_method => {
				payment_methods_labes[payment_method.id] = {
					payment_method: payment_method,
					data: [],
				}
			})

			let addresses_payment_methods = this.get_addresses_payment_methods()

			addresses_payment_methods.forEach(address => {
				labels.push(address.address.street)
				total_vendido.push(address.total_vendido)

				let amount

				address.payment_methods.forEach(payment_method => {
					if (typeof payment_method.total != 'undefined') {
						amount = payment_method.total
					} else {
						amount = payment_method.pivot.amount
					}

					payment_methods_labes[payment_method.id].data.push(amount)
				})
			})

			let primary_style = this.get_reportes_bar_dataset_style(1, false)
			let datasets = [
				{
					label: 'Total vendido',
					data: total_vendido,
					...primary_style,
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
