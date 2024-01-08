<script>
import { Bar } from 'vue-chartjs'
import moment from 'moment'
import article_performance from '@/mixins/article_performance'
export default {
	mixins: [article_performance],
	extends: Bar,
	props: {
	},
	computed: { 
		current_page() {  
			return this.$store.state.panel_control.provider.total_vendido_y_rentabilidad.current_page
		},
		order_by() {  
			return this.$store.state.panel_control.provider.total_vendido_y_rentabilidad.order_by
		},
	},
	watch: {
		current_page() {
			console.log('watch de current_page')
			this.setChart()
		},
		order_by() {
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
			let labels = []
			let rentabilidad = []
			let total_vendido = []

			let providers = this.providers_formated
			providers = providers.filter(Boolean)

			let inicio = this.current_page * this.per_page
			let fin = inicio + this.per_page
			if (fin > providers.length) {
				fin = providers.length
			}

			if (this.order_by == 'mayor-a-menor') {	
				providers = providers.sort((a, b) => b.total_prices - a.total_prices)
			} else {
				providers = providers.sort((a, b) => a.total_prices - b.total_prices)
			}

			providers = providers.slice(inicio, fin)

			providers.forEach(model => {
				labels.push(model.name)
				// rentabilidad.push(2) 
				rentabilidad.push(model.total_prices - model.total_costs) 
				total_vendido.push(model.total_prices) 
			})		

			let that = this
			this.renderChart({
				labels: labels,
				datasets: [
					{
						label: 'Total Vendido',
						backgroundColor: '#333',
						data: total_vendido,
					},
					{
						label: 'Rentabilidad',
						backgroundColor: '#007bff',
						data: rentabilidad,
					},
				],
			}, {
				maintainAspectRatio: false,
				onClick: function (event, elements, chart) {
					let provider = providers[elements[0]._index]
					that.setSelectedProvider(provider)
				},
				tooltips: {
					callbacks: {
						label: function(tooltipItem, data) {
							console.log('entorooooo')
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