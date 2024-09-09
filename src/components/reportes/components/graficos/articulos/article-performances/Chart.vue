<script>
import { Bar } from 'vue-chartjs'
import moment from 'moment'
export default {
	extends: Bar,
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
			console.log('wacth chart')
			this.setChart()
		},
		loading() {
			console.log('wacth chart')
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

			console.log('setChart gastos')
			console.log(this.article_performances)

			let labels = []
			let data = []
			
			this.article_performances.forEach(article_performance => {
				labels.push(article_performance.fecha)
				data.push(article_performance.amount)	
			})

			let datasets = [{
				label: 'Unidades vendidas',
				backgroundColor: '#007bff',
				data: data,
			}]

			let that = this
			this.renderChart({
				labels: labels,
				datasets: datasets,
			}, {
				plugins: {
					datalabels: { 
						anchor: 'end',
						align: 'top',
						color: '#000',
						font: {
							weight: 'bold',
							family: 'Roboto',
							size: 11,	
						},
						// formatter: function(value) {
						// 	return that.price(Math.round(value)); // Usa tu método price() para formatear
						// },
					},
				},
				maintainAspectRatio: false,
				onClick: function (event, elements, chart) {
					// let provider = providers[elements[0]._index]
					// that.setSelectedProvider(provider)
				},
				// tooltips: {
				// 	callbacks: {
				// 		label: function(tooltipItem, data) {
				// 			// console.log('entorooooo')
				// 			return that.price(Math.round(tooltipItem.yLabel))
				// 		}
				// 	}
				// }
			})
		},
		setSelectedProvider(provider) {
			this.$router.push({params: {sub_view: 'rendimiento-por-proveedor'}})
			this.setProviderArticles(provider)
		}
	},
}
</script>