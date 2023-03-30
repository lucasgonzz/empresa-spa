<script>
import { Bar } from 'vue-chartjs'
import moment from 'moment'
export default {
	props: ['results', 'article'],
	extends: Bar,
	watch: {
		results() {
			console.log('watchhhh')
			this.setChart()
		},
	},
	mounted() {
		this.setChart()
	},
	methods: {
		setChart() {
			console.log('iniciando')
			let labels = []
			let data = []
			this.results.forEach(result => {
				labels.push(moment(result.date).format('DD/MM/YY'))
				data.push(result.unidades_vendidas)
			})		
			this.renderChart({
				labels: labels,
				datasets: [
					{
						label: 'Unidades vendidad de '+this.article.name,
						backgroundColor: '#f87979',
						data: data,
					}
				],
			}, {
				maintainAspectRatio: false
			})

		},
	},
}
</script>