<script>
import { Bar } from 'vue-chartjs'
import 'chartjs-plugin-datalabels'
import chart_theme from '@/mixins/reportes/chart_theme'

export default {
	extends: Bar,
	mixins: [chart_theme],
	computed: {
		article_performances() {
			return this.$store.state.reportes.article_performance.models
		},
		loading() {
			return this.$store.state.reportes.article_performance.loading
		},
	},
	watch: {
		article_performances() {
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
			if (!this.article_performances) {
				return
			}

			let labels = []
			let data = []

			this.article_performances.forEach(article_performance => {
				labels.push(article_performance.fecha)
				data.push(article_performance.amount)
			})

			let bar_style = this.get_reportes_bar_dataset_style(data.length, false)
			let datasets = [{
				label: 'Unidades vendidas',
				data: data,
				...bar_style,
			}]

			this.renderChart({
				labels: labels,
				datasets: datasets,
			}, this.get_reportes_bar_chart_options({
				plugins: {
					datalabels: {
						align: 'end',
						anchor: 'end',
						color: '#1E293B',
						font: {
							weight: '600',
							family: this.chart_font_family,
							size: 11,
						},
						offset: 4,
					},
				},
				tooltips: {
					callbacks: {
						label: function(tooltip_item) {
							return 'Unidades: ' + tooltip_item.yLabel
						},
					},
				},
			}))
		},
	},
}
</script>
