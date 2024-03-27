<script>
import { Bar } from 'vue-chartjs'
import moment from 'moment'
export default {
	extends: Bar,
	computed: { 
		ventas_por_mes() {  
			return this.$store.state.reportes.ventas_por_mes
		},
		loading() {  
			return this.$store.state.reportes.loading
		},
	},
	watch: {
		ventas_por_mes() {
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

			console.log('setChart')

			let labels = []
			let data = []
			
			this.ventas_por_mes.forEach(ventas_por_mes => {
				labels.push(ventas_por_mes.mes)
				data.push(ventas_por_mes.total_vendido)	
			})

			let datasets = [{
				label: 'Total vendido',
				backgroundColor: '#007bff',
				data: data,
			}]

			let that = this
			this.renderChart({
				labels: labels,
				datasets: datasets,
			}, {
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