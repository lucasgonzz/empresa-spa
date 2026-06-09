<script>
import { Bar } from 'vue-chartjs'
import font_control from '@/mixins/reportes/font_control'
import chart_theme from '@/mixins/reportes/chart_theme'

export default {
	extends: Bar,
	mixins: [font_control, chart_theme],
	computed: {
		meses_anteriores() {
			return this.$store.state.reportes.meses_anteriores
		},
		loading() {
			return this.$store.state.reportes.loading
		},
		expense_concepts() {
			return this.$store.state.expense_concept.models
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
			if (typeof this.meses_anteriores == 'undefined') {
				return
			}

			let labels = []
			let total_gastos = []
			let datasets_expense_concepts = []

			this.expense_concepts.forEach(expense_concept => {
				datasets_expense_concepts[expense_concept.id] = {
					expense_concept_name: expense_concept.name,
					meses: [],
				}
			})

			this.meses_anteriores.forEach(meses_anterior => {
				labels.push(meses_anterior.fecha)
				total_gastos.push(meses_anterior.total_gastos)

				meses_anterior.expense_concepts.forEach(expense_concept => {
					datasets_expense_concepts[expense_concept.id].meses.push(expense_concept.pivot.amount)
				})
			})

			let primary_style = this.get_reportes_bar_dataset_style(1, false)
			let datasets = [{
				label: 'Total gastado',
				data: total_gastos,
				...primary_style,
			}]

			let index = 0
			datasets_expense_concepts.forEach(dataset => {
				let series_color = this.get_chart_color(index)

				datasets.push({
					label: dataset.expense_concept_name,
					backgroundColor: series_color,
					hoverBackgroundColor: series_color,
					borderWidth: 0,
					barPercentage: 0.68,
					categoryPercentage: 0.82,
					data: dataset.meses,
				})

				index++
			})

			let that = this

			this.renderChart({
				labels: labels,
				datasets: datasets,
			}, this.get_reportes_bar_chart_options({
				plugins: {
					datalabels: {
						display: false,
					},
				},
				tooltips: {
					callbacks: {
						label: function(tooltip_item, data) {
							let dataset_label = data.datasets[tooltip_item.datasetIndex].label || ''
							let value = tooltip_item.yLabel
							return dataset_label + ': ' + that.price(value)
						},
					},
				},
			}))
		},
	},
}
</script>
