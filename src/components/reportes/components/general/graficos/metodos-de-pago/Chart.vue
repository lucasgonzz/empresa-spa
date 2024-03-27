<script>
import { Bar } from 'vue-chartjs'
import moment from 'moment'
export default {
	extends: Bar,
	computed: { 
		metodos_de_pago() {  
			return this.$store.state.reportes.metodos_de_pago
		},
		loading() {  
			return this.$store.state.reportes.loading
		},
	},
	watch: {
		gastos_por_mes() {
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
			
			this.metodos_de_pago.forEach(metodo_de_pago => {
				labels.push(metodo_de_pago.nombre)
				data.push(metodo_de_pago.total)	
			})

			let datasets = [{
				label: 'Importe',
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