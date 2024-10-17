<script>
import { Bar } from 'vue-chartjs'
import moment from 'moment'
import 'chartjs-plugin-datalabels'
export default {
	extends: Bar,
	computed: { 
		providers() {  
			return this.$store.state.reportes.article_purchase.providers
		},
		loading() {  
			return this.$store.state.reportes.article_purchase.loading
		},
	},
	watch: {
		providers() {
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

			if (typeof this.providers == 'undefined' || !this.providers) {
				return 
			}

			let labels = []
			let unidades_vendidas = []
			let beneficio = []
			
			this.providers.forEach(provider => {
				labels.push(provider.provider_name)
				unidades_vendidas.push(provider.unidades_vendidas)	
				beneficio.push(provider.beneficio)	
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
							let price = Math.round(tooltipItem.yLabel)

							if (price != 0) {
								return that.price(price)
							}
							return null
						}
					}
				}
			})
		},
	},
}
</script>