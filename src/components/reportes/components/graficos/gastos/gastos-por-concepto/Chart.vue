<script>
import { Bar } from 'vue-chartjs'
import moment from 'moment'
export default {
	extends: Bar,
	computed: { 
		expense_concepts() {  
			return this.$store.state.reportes.model.expense_concepts
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

			if (typeof this.expense_concepts == 'undefined') {
				return
			}

			console.log('setChart gastos')
			console.log(this.expense_concepts)

			let labels = []
			let data = []
			
			this.expense_concepts.forEach(metodo_de_pago => {
				labels.push(metodo_de_pago.name)
				data.push(metodo_de_pago.pivot.amount)	
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