<script>
import { Bar } from 'vue-chartjs'
import moment from 'moment'
import chart from '@/mixins/chart'
import font_control from '@/mixins/reportes/font_control'
export default {
	extends: Bar,
	mixins: [chart, font_control],
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

			console.log('setChart de clients')

			let labels = []
			let data = []

			let clients = this.get_chart_models_ordenados('client', this.clients, 'saldo')
			
			clients.forEach(client => {
				labels.push(client.name)
				data.push(client.saldo)	
			})

			let datasets = [{
				label: 'Deuda',
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
						align: 'top',
						color: '#000',
						font: {
							weight: 'bold',
							family: 'Roboto',
							size: this.font_size,
						},
						formatter: function(value) {
							let price = Math.round(value)
							
							if (price != 0) {
								return that.price(price)
							}
							return null
						},
						offset: function(context) {
							return 0
						}
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
							// console.log('entorooooo')
							return that.price(Math.round(tooltipItem.yLabel))
						}
					}
				}
			})
		},
		setSelectedProvider(provider) {
			this.$router.push({params: {sub_view: 'rendimiento-por-proveedor'}})
			this.setProviderArticles(provider)
		}
	},
}
</script>