<script>
import { Bar } from 'vue-chartjs'
import moment from 'moment'
import 'chartjs-plugin-datalabels'
export default {
	extends: Bar,
	computed: { 
		categories() {  
			return this.$store.state.reportes.article_purchase.categories
		},
		loading() {  
			return this.$store.state.reportes.article_purchase.loading
		},
	},
	watch: {
		categories() {
			console.log('wacth chart')
			this.setChart()
		},
		loading() {
			console.log('wacth chart')
			this.setChart()
		},
	},
	mounted() {
		this.setChart()
	},
	methods: {
		setChart() {	

			console.log('setChart')

			if (typeof this.categories == 'undefined' || !this.categories) {
				return 
			}

			let labels = []
			let unidades_vendidas = []
			let beneficio = []
			
			this.categories.forEach(categoria => {
				labels.push(categoria.category_name)
				unidades_vendidas.push(categoria.unidades_vendidas)	
				beneficio.push(categoria.beneficio)	
			})

			let datasets = [
				{
					label: 'Unidades vendidas',
					backgroundColor: '#007bff',
					data: unidades_vendidas,
				},
				{
					label: 'Beneficio',
					backgroundColor: '#4CAF50',
					data: beneficio,
				}
			]

			let that = this
			this.renderChart({
				labels: labels,
				datasets: datasets,
			}, {
				plugins: {
					datalabels: { 
						color: '#000',
						font: {
							weight: 'bold',
						},
						formatter: function(value, context) {
							if (context.dataset.label == 'Beneficio') {

								return that.price(Math.round(value))
							}
							return value
						},
					},
				},
				maintainAspectRatio: false,	
				onClick: function (event, elements, chart) {
					// let provider = providers[elements[0]._index]
					// that.setSelectedProvider(provider)
				},
				tooltips: {
					callbacks: {
						label: function(tooltipItem, data) {

							const datasetLabel = data.datasets[tooltipItem.datasetIndex].label || '';
							const value = tooltipItem.yLabel;

							if (datasetLabel == 'Beneficio') {

								let price = Math.round(tooltipItem.yLabel)

								return that.price(price)

							}

							return value 
						}
					}
				}
			})
		},
	},
}
</script>